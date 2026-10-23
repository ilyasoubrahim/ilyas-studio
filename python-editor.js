(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],bridge=()=>window.IlyasStudioBridge;
const state={open:false,active:null,tabs:[],worker:null,workerUrl:null,runtime:'idle',runId:0,timeout:null,autosave:null,history:[],future:[],lastError:'',filter:'all',busy:false,instances:{},lastTick:0,queue:[]};
const samplePlayer=`# PlayerController — attach this script to a Player object
# @export speed: float = 220
# @export jump_strength: float = 420

class PlayerController:
    def ready(self):
        self.speed = ilyas.export("speed", 220)
        self.jump_strength = ilyas.export("jump_strength", 420)
        ilyas.log("Player controller ready")

    def update(self, delta):
        player = ilyas.get_node("Player")
        if player is None:
            return
        direction = 0
        if ilyas.get_input("right"):
            direction += 1
        if ilyas.get_input("left"):
            direction -= 1
        player.velocity_x = direction * self.speed
        if ilyas.get_input("jump_pressed") and player.is_on_floor():
            player.velocity_y = -self.jump_strength
`;
const samples=[
{id:'player',name:'Player Controller',category:'Player movement',desc:'Side-scrolling movement with jump and exported speed settings.',required:'Player + solid platforms',code:samplePlayer},
{id:'topdown',name:'Top-down WASD',category:'Player movement',desc:'Move in four directions with normalized diagonal speed.',required:'Player object',code:`# @export speed: float = 180
class TopDownController:
    def ready(self):
        self.speed = ilyas.export("speed", 180)
    def update(self, delta):
        player = ilyas.get_node("Player")
        if player is None: return
        dx = int(ilyas.get_input("right")) - int(ilyas.get_input("left"))
        dy = int(ilyas.get_input("down")) - int(ilyas.get_input("up"))
        length = (dx*dx + dy*dy) ** 0.5
        if length:
            player.x += dx / length * self.speed * delta
            player.y += dy / length * self.speed * delta
`},
{id:'patrol',name:'Enemy Patrol',category:'Enemy AI',desc:'Patrol around the starting position with an editable speed and range.',required:'Enemy object',code:`# @export speed: float = 80
# @export patrol_range: float = 100
class EnemyPatrol:
    def ready(self):
        self.speed = ilyas.export("speed", 80)
        self.patrol_range = ilyas.export("patrol_range", 100)
        self.origin_x = None
    def update(self, delta):
        enemy = ilyas.get_node("Enemy")
        if enemy is None: return
        if self.origin_x is None: self.origin_x = enemy.x
        import math
        enemy.x = self.origin_x + math.sin(ilyas.get_time() * self.speed / 80) * self.patrol_range
`},
{id:'chase',name:'Enemy Chase',category:'Enemy AI',desc:'Chase the player when inside a detection radius.',required:'Enemy + Player',code:`# @export speed: float = 100
# @export detection_range: float = 250
class EnemyChase:
    def ready(self):
        self.speed = ilyas.export("speed", 100)
        self.detection_range = ilyas.export("detection_range", 250)
    def update(self, delta):
        enemy = ilyas.get_node("Enemy")
        player = ilyas.get_player()
        if enemy is None or player is None: return
        distance = enemy.distance_to(player)
        if distance <= self.detection_range:
            enemy.move_toward(player, self.speed * delta)
`},
{id:'flee',name:'Enemy Flee',category:'Enemy AI',desc:'Move away from the player when they get too close.',required:'Enemy + Player',code:`# @export speed: float = 120
# @export detection_range: float = 180
class EnemyFlee:
    def ready(self):
        self.speed = ilyas.export("speed", 120)
        self.detection_range = ilyas.export("detection_range", 180)
    def update(self, delta):
        enemy, player = ilyas.get_node("Enemy"), ilyas.get_player()
        if enemy is None or player is None: return
        dx, dy = enemy.x-player.x, enemy.y-player.y
        dist = max((dx*dx+dy*dy)**0.5, 0.001)
        if dist < self.detection_range:
            enemy.x += dx/dist*self.speed*delta
            enemy.y += dy/dist*self.speed*delta
`},
{id:'health',name:'Health System',category:'Combat',desc:'A tiny health controller with a configurable maximum health.',required:'Any object with a health field',code:`# @export max_health: int = 100
class HealthSystem:
    def ready(self):
        self.max_health = ilyas.export("max_health", 100)
        self.health = self.max_health
        ilyas.log("Health initialized: " + str(self.health))
    def take_damage(self, amount):
        self.health = max(0, self.health - amount)
        ilyas.log("Health: " + str(self.health))
`},
{id:'coin',name:'Coin Collector',category:'Collectibles',desc:'Collect nearby coins and update the score.',required:'Player + Coin objects',code:`# @export points: int = 1
class CoinCollector:
    def ready(self):
        self.points = ilyas.export("points", 1)
    def update(self, delta):
        player = ilyas.get_player()
        if player is None: return
        for coin in ilyas.get_nodes_by_type("Coin"):
            if player.is_colliding_with(coin):
                ilyas.add_score(self.points)
                ilyas.destroy(coin)
                ilyas.log("Coin collected!")
`},
{id:'dash',name:'Dash',category:'Player movement',desc:'Press the dash action to move quickly in the facing direction.',required:'Player object; map a dash key to action "dash"',code:`# @export dash_distance: float = 120
class Dash:
    def ready(self):
        self.dash_distance = ilyas.export("dash_distance", 120)
    def update(self, delta):
        player = ilyas.get_player()
        if player is None: return
        if ilyas.get_input("dash_pressed"):
            direction = 1 if ilyas.get_input("right") else -1
            player.x += direction * self.dash_distance
`},
{id:'timer',name:'Timer Event',category:'Gameplay',desc:'Trigger a simple event after a delay.',required:'Any object',code:`# @export delay: float = 3
class TimedEvent:
    def ready(self):
        self.delay = ilyas.export("delay", 3)
        self.elapsed = 0
        self.fired = False
    def update(self, delta):
        if self.fired: return
        self.elapsed += delta
        if self.elapsed >= self.delay:
            self.fired = True
            ilyas.log("Timer finished!")
`},
{id:'boss',name:'Boss Sine Pattern',category:'Enemy AI',desc:'A simple boss that moves in a wave pattern.',required:'Boss object',code:`# @export speed: float = 90
# @export amplitude: float = 160
class BossPattern:
    def ready(self):
        self.speed = ilyas.export("speed", 90)
        self.amplitude = ilyas.export("amplitude", 160)
        self.origin_x = None
    def update(self, delta):
        boss = ilyas.get_node("Boss")
        if boss is None: boss = ilyas.get_node("Enemy")
        if boss is None: return
        if self.origin_x is None: self.origin_x = boss.x
        import math
        boss.x = self.origin_x + math.sin(ilyas.get_time()*self.speed/100)*self.amplitude
`},
{id:'spawner',name:'Object Spawner',category:'Gameplay',desc:'Spawn a collectible at a chosen position.',required:'No required object type',code:`class CollectibleSpawner:
    def ready(self):
        self.spawned = False
    def update(self, delta):
        if not self.spawned:
            ilyas.spawn("Coin", 400, 220)
            self.spawned = True
            ilyas.log("Spawned a coin")
`},
{id:'state',name:'Simple State Machine',category:'Enemy AI',desc:'Switch between idle, chase and retreat states.',required:'Enemy + Player',code:`# @export detection_range: float = 220
class EnemyStateMachine:
    def ready(self):
        self.detection_range = ilyas.export("detection_range", 220)
        self.state = "idle"
    def update(self, delta):
        enemy, player = ilyas.get_node("Enemy"), ilyas.get_player()
        if enemy is None or player is None: return
        distance = enemy.distance_to(player)
        self.state = "chase" if distance < self.detection_range else "idle"
        if self.state == "chase":
            enemy.move_toward(player, 70 * delta)
`},
{id:'score',name:'Score Display Helper',category:'Collectibles',desc:'Log the current score when the script starts.',required:'Any object',code:`class ScoreReporter:
    def ready(self):
        ilyas.log("Current score: " + str(ilyas.get_score()))
    def update(self, delta):
        pass
`}
];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function pid(){return Math.random().toString(36).slice(2,10)}
function project(){return bridge()?.getProject()}
function scripts(){const p=project();if(!p)return[];if(!Array.isArray(p.scripts))p.scripts=[];p.scriptingVersion=1;return p.scripts}
function activeScript(){return scripts().find(s=>s.id===state.active)||null}
function defaultScript(name='NewScript'){return{id:pid(),name,code:'# A script attached to a game object\n# @export speed: float = 180\n\nclass NewScript:\n    def ready(self):\n        self.speed = ilyas.export("speed", 180)\n        ilyas.log("Script ready!")\n\n    def update(self, delta):\n        pass\n',exports:{speed:180},modified:Date.now(),version:1}}
function addConsole(message,type='info',detail=''){const root=$('#pyConsole');if(!root)return;root.querySelector('.py-console-empty')?.remove();const line=document.createElement('div');line.className='py-console-line '+type;line.dataset.type=type;line.dataset.detail=detail||String(message);const stamp=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});line.textContent='['+stamp+'] '+String(message);root.append(line);root.scrollTop=root.scrollHeight;state.lastError=type==='error'?(detail||String(message)):state.lastError;filterConsole();$('#pyConsoleCount').textContent=root.querySelectorAll('.py-console-line').length+' messages'}
function filterConsole(){const root=$('#pyConsole');if(!root)return;root.querySelectorAll('.py-console-line').forEach(el=>el.classList.toggle('hidden',state.filter!=='all'&&el.dataset.type!==state.filter))}
function highlight(code){let s=esc(code);s=s.replace(/(^|\n)(\s*#.*?)(?=\n|$)/g,'$1<span class="com">$2</span>').replace(/(&quot;.*?&quot;|&#39;.*?&#39;|&quot;.*?&quot;)/g,'<span class="str">$1</span>').replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,'<span class="str">$1</span>').replace(/\b(class|def|return|if|else|elif|for|while|in|is|not|and|or|import|from|as|pass|True|False|None|try|except|finally|raise|with|lambda|yield|break|continue)\b/g,'<span class="kw">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="num">$1</span>').replace(/\b(ilyas|print|range|len|str|int|float|super|enumerate|min|max|abs|round|sum|sorted)\b(?=\s*\()/g,'<span class="fn">$1</span>').replace(/^\s*(@export.*)$/gm,'<span class="decor">$1</span>');return s+'\n'}
function syncEditor(){const s=activeScript();if(!s)return;$('#pyCode').value=s.code||'';paintEditor();renderTabs();renderProperties();$('#pyDirty').textContent='All changes saved';$('#pyStatusLeft').textContent='Ready · '+s.name;state.history=[];state.future=[];updateUndoButtons()}
function paintEditor(){const code=$('#pyCode').value;$('#pyHighlight').innerHTML=highlight(code);$('#pyLineNumbers').textContent=Array.from({length:Math.max(1,code.split('\n').length)},(_,i)=>i+1).join('\n');updateCursor()}
function updateCursor(){const el=$('#pyCode');if(!el)return;const before=el.value.slice(0,el.selectionStart),ln=before.split('\n').length,col=before.length-(before.lastIndexOf('\n')+1)+1;$('#pyCursor').textContent='Ln '+ln+', Col '+col}
function markDirty(){const s=activeScript();if(!s)return;s.code=$('#pyCode').value;s.modified=Date.now();$('#pyDirty').textContent='Unsaved changes';$('#pyStatusLeft').textContent='Editing · '+s.name;paintEditor();renderTabs();clearTimeout(state.autosave);state.autosave=setTimeout(()=>{persistScripts();$('#pyDirty').textContent='Autosaved';},650)}
function persistScripts(){const p=project();if(!p)return;p.scripts=scripts();p.scriptingVersion=1;p.modified=Date.now();bridge()?.saveProject();renderScriptList();renderAttached()}
function saveCode(){const s=activeScript();if(s){s.code=$('#pyCode').value;s.modified=Date.now();persistScripts();$('#pyDirty').textContent='All changes saved';addConsole('Saved '+s.name,'success')}}
function renderAssetFolders(){const p=project(),assets=(p?.objects||[]).filter(o=>o.assetData||o.assetName);$('#pyAssetCount').textContent=assets.length;$('#pyAssetsList').innerHTML=assets.length?assets.map(o=>'<div class="py-attached-item">▧ '+esc(o.assetName||o.name)+'</div>').join(''):'No imported assets yet.'}function renderScriptList(){const root=$('#pyScriptList'),q=$('#pySearch').value.toLowerCase();const arr=scripts().filter(s=>s.name.toLowerCase().includes(q));$('#pyScriptCount').textContent=scripts().length;root.innerHTML='';if(!arr.length){root.innerHTML='<div class="py-muted">No matching scripts. Create a script or browse templates.</div>';return}arr.forEach(s=>{const row=document.createElement('div');row.className='py-script-item'+(s.id===state.active?' active':'');row.innerHTML='<span class="py-file-icon">Py</span><span class="py-script-name" title="'+esc(s.name)+'">'+esc(s.name)+'</span><span class="py-script-actions"><button data-action="rename" title="Rename">✎</button><button data-action="duplicate" title="Duplicate">▣</button><button data-action="delete" title="Delete">×</button></span>';row.onclick=e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action){e.stopPropagation();manageScript(s,action);return}openScript(s.id)};root.append(row)})}
function renderTabs(){const root=$('#pyTabs');root.innerHTML='';state.tabs.filter(id=>scripts().some(s=>s.id===id)).forEach(id=>{const s=scripts().find(x=>x.id===id),tab=document.createElement('div');tab.className='py-tab'+(id===state.active?' active':'');tab.innerHTML='<span class="py-file-icon">Py</span><span class="py-script-name">'+esc(s.name)+'</span><span class="py-tab-dirty">'+(s.id===state.active&&$('#pyDirty').textContent==='Unsaved changes'?'●':'')+'</span><button title="Close tab">×</button>';tab.onclick=e=>{if(e.target.tagName==='BUTTON'){state.tabs=state.tabs.filter(t=>t!==id);if(state.active===id)state.active=state.tabs[state.tabs.length-1]||null;if(!state.active)createScript();else syncEditor();renderTabs();return}openScript(id)};root.append(tab)})}
function openScript(id){const s=scripts().find(x=>x.id===id);if(!s)return;clearTimeout(state.autosave);state.active=id;if(!state.tabs.includes(id))state.tabs.push(id);syncEditor();renderScriptList();renderAttached();renderTemplateProps()}
function createScript(template=null){const s=template?{...defaultScript(template.name.replace(/\s+/g,'')),name:template.name,code:template.code,exports:extractExports(template.code),templateId:template.id}:defaultScript('NewScript');s.id=pid();let base=s.name,n=1;while(scripts().some(x=>x.name===s.name))s.name=base+(++n);scripts().unshift(s);persistScripts();state.active=s.id;if(!state.tabs.includes(s.id))state.tabs.push(s.id);syncEditor();renderScriptList();renderAttached();addConsole('Created '+s.name,'success');$('#pyCode').focus()}
function manageScript(s,action){if(action==='rename'){const name=prompt('Rename script:',s.name);if(!name||!name.trim())return;s.name=name.trim().endsWith('.py')?name.trim().slice(0,-3):name.trim();persistScripts();renderScriptList();renderTabs();renderAttached();if(s.id===state.active)$('#pyStatusLeft').textContent='Editing · '+s.name;return}if(action==='duplicate'){const cp=JSON.parse(JSON.stringify(s));cp.id=pid();cp.name=s.name+' Copy';cp.modified=Date.now();scripts().unshift(cp);persistScripts();openScript(cp.id);addConsole('Duplicated '+s.name,'success');return}if(action==='delete'){if(!confirm('Delete "'+s.name+'"? This cannot be undone. Attached objects will be detached.'))return;const p=project();(p.objects||[]).forEach(o=>{if(o.scriptId===s.id)o.scriptId=null});const attached=scripts().filter(x=>x.id!==s.id);p.scripts=attached;state.tabs=state.tabs.filter(id=>id!==s.id);if(state.active===s.id)state.active=state.tabs[state.tabs.length-1]||null;persistScripts();if(!state.active&&scripts().length)state.active=scripts()[0].id;if(state.active){if(!state.tabs.includes(state.active))state.tabs.push(state.active);syncEditor()}else{$('#pyCode').value='';paintEditor();renderTabs();renderProperties()}renderScriptList();renderAttached();addConsole('Deleted '+s.name,'warning')}}
function renderAttached(){const root=$('#pyAttachedList'),p=project();if(!p){root.textContent='Open a project first.';return}const attached=(p.objects||[]).filter(o=>o.scriptId);if(!attached.length){root.innerHTML='<div class="py-muted">No scripts attached yet. Select an object in the scene, then use “Attach to selected”.</div>';return}root.innerHTML=attached.map(o=>'<div class="py-attached-item">◈ '+esc(o.name)+' <span style="color:#ff8b95">→ '+esc(scripts().find(s=>s.id===o.scriptId)?.name||'Missing script')+'</span></div>').join('')}
function extractExports(code){const out={};for(const m of code.matchAll(/^\s*#\s*@export\s+(\w+)\s*:\s*(int|float|bool|str)\s*=\s*(.+?)\s*$/gm)){let v=m[3];if(m[2]==='int'||m[2]==='float')v=Number(v);else if(m[2]==='bool')v=v==='True'||v==='true';else v=v.replace(/^['"]|['"]$/g,'');out[m[1]]=v}return out}
function renderProperties(){const root=$('#pyProperties'),s=activeScript();if(!s){root.innerHTML='<p class="py-property-note">Open or create a script to edit its properties.</p>';return}const obj=(project()?.objects||[]).find(o=>o.scriptId===s.id);s.exports=s.exports||extractExports(s.code);root.innerHTML='<label class="py-prop-label">Script name</label><input id="pyPropName" class="py-prop-input" value="'+esc(s.name)+'"><label class="py-prop-label">Attached object</label><div class="py-property-note">'+(obj?esc(obj.name)+' · '+esc(obj.type):'Not attached to an object')+'</div><div style="height:12px"></div><label class="py-prop-label">Runtime status</label><div id="pyScriptStatus" class="py-property-note">'+(state.runtime==='ready'?'Python runtime ready':state.runtime==='loading'?'Loading Python…':'Not initialized')+'</div><div style="height:12px"></div><div class="py-section-title" style="margin:0 -12px 10px">EXPORTED VARIABLES</div><div id="pyExportFields"></div><div class="py-property-note">Add a comment like <code># @export speed: float = 220</code> above your script. Values are saved with the project.</div><div style="height:12px"></div><button id="pyAttachThis" style="width:100%;font-size:10px">Attach to selected object</button>';$('#pyPropName').onchange=e=>{let n=e.target.value.trim();if(n){s.name=n;persistScripts();renderScriptList();renderTabs();$('#pyStatusLeft').textContent='Editing · '+s.name}};$('#pyAttachThis').onclick=attachToSelected;renderExportFields();renderApiDocs()}
function renderExportFields(){const root=$('#pyExportFields'),s=activeScript();if(!root||!s)return;const exp=extractExports(s.code);s.exports={...exp,...s.exports};root.innerHTML='';const entries=Object.entries(exp);if(!entries.length){root.innerHTML='<div class="py-property-note">No exported values found in this script.</div>';return}entries.forEach(([name,def])=>{let value=s.exports[name]??def,wrap=document.createElement('div');wrap.innerHTML='<label class="py-prop-label">'+esc(name)+' <small style="color:#666">('+typeof def+')</small></label>';let input;if(typeof def==='boolean'){input=document.createElement('input');input.type='checkbox';input.checked=!!value;input.style.accentColor='#ff4657'}else{input=document.createElement('input');input.className='py-prop-input';input.type=typeof def==='number'?'number':'text';input.value=value}input.setAttribute('aria-label',name);input.onchange=()=>{s.exports[name]=typeof def==='boolean'?input.checked:typeof def==='number'?Number(input.value):input.value;persistScripts();addConsole('Updated exported variable '+name,'info')};wrap.append(input);root.append(wrap)})}
const apiDocs=[
['ilyas.get_node(name)','Find an object by exact name in the current scene. Returns None if missing.'],
['ilyas.get_nodes_by_type(type_name)','Return all scene objects of a given type.'],
['ilyas.get_player()','Return the first object whose type is Player.'],
['ilyas.get_input(action)','Read left, right, up, down, jump / jump_pressed and dash_pressed input states.'],
['ilyas.get_delta_time()','Seconds since the previous script update.'],
['ilyas.log(message)','Write a message to the scripting console.'],
['ilyas.spawn(type_name, x, y)','Spawn a supported object in the active scene/playtest.'],
['ilyas.destroy(node)','Remove an object (or mark it removed during play).'],
['ilyas.get_scene()','Get a snapshot list of scene nodes.'],
['ilyas.pause_game() / resume_game()','Pause or resume the current playtest.'],
['ilyas.get_score() / add_score(n)','Read and increase the playtest score.'],
['ilyas.random_range(min, max)','Generate a random floating-point value in range.'],
['node.position / x / y','Read or set position in canvas pixels. Origin is top-left; positive Y goes down.'],
['node.velocity_x / velocity_y','Read or set horizontal / vertical velocity for the Player during play.'],
['node.move_toward(target, speed)','Move toward a target by at most speed pixels this update.'],
['node.distance_to(target)','Return Euclidean distance in canvas pixels.'],
['node.is_colliding_with(other)','Axis-aligned bounding-box overlap test.'],
['node.is_on_floor()','True when the node touches the scene floor or a supported solid platform.'],
['node.look_at(target) / queue_free()','Rotate toward a target / remove this node.']
];
function renderApiDocs(){const root=$('#pyApiDocs');if(!root)return;root.innerHTML=apiDocs.map(([name,desc])=>'<div class="py-api-item"><code>'+esc(name)+'</code><p>'+esc(desc)+'</p></div>').join('')+'<div class="py-api-item"><code>Lifecycle and coordinates</code><p>ready() runs once when an attached script starts. update(delta) is dispatched asynchronously while playing (roughly every 70 ms; not a fixed frame rate). on_input(action) receives supported key actions. on_collision(other) fires once per overlapping object pair per play session.</p><p>Coordinates use canvas pixels. (0, 0) is the top-left; +X points right and +Y points down. x/y describe each object center. delta is elapsed seconds. The worker may lag behind rendering.</p><p>Not available yet: audio playback, scene switching, breakpoints, step-through debugging, and a full offline Python export runtime.</p></div>'}
function showWorkspace(){if(!project()){addConsole('Open a project before using Python scripts.','warning');return}state.open=true;$('#pythonWorkspace').classList.remove('hidden');if(!state.active){if(scripts().length)openScript(scripts()[0].id);else createScript()}renderScriptList();renderAttached();renderAssetFolders();renderProperties();renderTemplateProps();if(state.runtime==='idle')initRuntime();$('#pyCode').focus()}
function hideWorkspace(){state.open=false;$('#pythonWorkspace').classList.add('hidden');if(project())bridge()?.saveProject()}
function attachToSelected(){const p=project(),o=bridge()?.getSelected();if(!p||!o){addConsole('Select an object in the scene first, then attach a script.','warning');return}let arr=scripts();if(!arr.length){const t=confirm('No scripts yet. Create a Player Controller example? Choose Cancel to create an empty script.');createScript(t?samples[0]:null);arr=scripts()}const options=arr.map((s,i)=>(i+1)+'. '+s.name).join('\n');const chosen=prompt('Attach which script to '+o.name+'? Enter a number:\n'+options,'1');if(chosen===null)return;const s=arr[Number(chosen)-1];if(!s){addConsole('No script selected.','warning');return}o.scriptId=s.id;persistScripts();bridge()?.selectObject(o.id);renderAttached();renderProperties();addConsole('Attached '+s.name+' to '+o.name,'success');}
function renderTemplateProps(){renderProperties();renderApiDocs()}
function showTemplates(){const modal=$('#pyTemplateModal');modal.classList.remove('hidden');renderTemplates();$('#pyTemplateSearch').focus()}
function renderTemplates(){const q=$('#pyTemplateSearch').value.toLowerCase(),root=$('#pyTemplateCards');root.innerHTML='';samples.filter(s=>(s.name+' '+s.category+' '+s.desc).toLowerCase().includes(q)).forEach(s=>{const el=document.createElement('article');el.className='py-template-card';el.innerHTML='<div class="py-template-meta">'+esc(s.category)+' · Requires: '+esc(s.required)+'</div><b>'+esc(s.name)+'</b><p>'+esc(s.desc)+'</p><button data-use="'+s.id+'">＋ Insert as new script</button>';el.querySelector('button').onclick=()=>{createScript(s);modal.classList.add('hidden');addConsole('Inserted template: '+s.name,'success')};root.append(el)});if(!root.children.length)root.innerHTML='<div class="py-muted">No templates match your search.</div>'}
function initRuntime(){if(state.runtime==='loading'||state.runtime==='ready')return;state.runtime='loading';$('#pyRuntimeDot').classList.remove('ready');$('#pyStatusLeft').textContent='Initializing Python runtime…';$('#pyLanguage').textContent='Loading Pyodide…';renderProperties();addConsole('Loading Python 3 runtime (Pyodide) from the official CDN…','info');addConsole('Safety note: scripts run in a separate worker with import restrictions and a timeout. This is a beginner sandbox, not a hardened security boundary; only run code you trust.','warning');const workerSource=`
let pyodide=null;const contexts=new Map();let stopped=false;
const PRELUDE = \`import json, math, random, time
__state = json.loads(__state_json)
__inputs = json.loads(__inputs_json)
__commands = []
__exports = json.loads(__exports_json)
__dt = float(__dt_value or 0.016)
__clock = float(__clock_value or 0)
class _Node:
    def __init__(self, data):
        self._d = data
    @property
    def id(self): return self._d.get("id")
    @property
    def name(self): return self._d.get("name", "")
    @name.setter
    def name(self,v): self._set("name",str(v))
    @property
    def type(self): return self._d.get("type","")
    @property
    def x(self): return float(self._d.get("x",0))
    @x.setter
    def x(self,v): self._set("x",float(v))
    @property
    def y(self): return float(self._d.get("y",0))
    @y.setter
    def y(self,v): self._set("y",float(v))
    @property
    def width(self): return float(self._d.get("w",0))
    @width.setter
    def width(self,v): self._set("w",float(v))
    @property
    def height(self): return float(self._d.get("h",0))
    @height.setter
    def height(self,v): self._set("h",float(v))
    @property
    def rotation(self): return float(self._d.get("rotation",0))
    @rotation.setter
    def rotation(self,v): self._set("rotation",float(v))
    @property
    def visible(self): return bool(self._d.get("visible",True))
    @visible.setter
    def visible(self,v): self._set("visible",bool(v))
    @property
    def speed(self): return float(self._d.get("speed",180))
    @speed.setter
    def speed(self,v): self._set("speed",float(v))
    @property
    def velocity_x(self): return float(self._d.get("vx",self._d.get("velocity_x",0)))
    @velocity_x.setter
    def velocity_x(self,v): self._set("velocity_x",float(v))
    @property
    def velocity_y(self): return float(self._d.get("vy",self._d.get("velocity_y",0)))
    @velocity_y.setter
    def velocity_y(self,v): self._set("velocity_y",float(v))
    @property
    def color(self): return self._d.get("color","#ff4657")
    @color.setter
    def color(self,v): self._set("color",str(v))
    @property
    def health(self): return self._d.get("health",100)
    @health.setter
    def health(self,v): self._set("health",float(v))
    @property
    def position(self): return (self.x,self.y)
    @position.setter
    def position(self,v):
        self.x,self.y = v[0],v[1]
    def _set(self,k,v): self._d[k]=v; __commands.append({"op":"set","id":self.id,"key":k,"value":v})
    def distance_to(self,other): return math.hypot(self.x-other.x,self.y-other.y)
    def move_toward(self,target,speed):
        d=self.distance_to(target)
        if d>0:
            self.x += (target.x-self.x)/d*min(float(speed),d)
            self.y += (target.y-self.y)/d*min(float(speed),d)
    def look_at(self,target): self.rotation=math.degrees(math.atan2(target.y-self.y,target.x-self.x))
    def is_colliding_with(self,other): return abs(self.x-other.x)<(self.width+other.width)/2 and abs(self.y-other.y)<(self.height+other.height)/2
    def is_on_floor(self):
        if self.y+self.height/2 >= __state.get("height",540)-1: return True
        for o in __state.get("objects",[]):
            if o.get("id")!=self.id and o.get("collision") and o.get("type") in ("Ground","Platform","Moving platform"):
                if abs(self.x-o.get("x",0))<(self.width+o.get("w",0))/2 and abs(self.y+self.height/2-(o.get("y",0)-o.get("h",0)/2))<5: return True
        return False
    def queue_free(self): __commands.append({"op":"destroy","id":self.id})
class _Ilyas:
    def get_node(self,name):
        for d in __state.get("objects",[]):
            if d.get("name")==name: return _Node(d)
        return None
    def get_nodes_by_type(self,type_name): return [_Node(d) for d in __state.get("objects",[]) if d.get("type")==type_name]
    def get_player(self):\n        for d in __state.get("objects",[]):\n            if d.get("type")=="Player": return _Node(d)\n        return None
    def get_input(self,action): return bool(__inputs.get(action,False))
    def get_delta_time(self): return __dt
    def log(self,message): print(str(message))
    def spawn(self,type_name,x,y): __commands.append({"op":"spawn","type":str(type_name),"x":float(x),"y":float(y)})
    def destroy(self,node):
        if node is not None: __commands.append({"op":"destroy","id":node.id})
    def get_scene(self): return [_Node(d) for d in __state.get("objects",[])]
    def pause_game(self): __commands.append({"op":"pause"})
    def resume_game(self): __commands.append({"op":"resume"})
    def get_score(self): return int(__state.get("score",0))
    def add_score(self,amount): __commands.append({"op":"score","amount":int(amount)})
    def random_range(self,a,b): return random.uniform(float(a),float(b))
    def export(self,name,default=None): return __exports.get(name,default)
    def get_time(self): return __clock
if not globals().get("__ilyas_import_guarded", False):
    import builtins as __builtin_module
    def __make_guard(original_import):
        def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name.split(".")[0] in ("js", "pyodide", "socket", "urllib", "requests", "http", "ssl", "subprocess", "pathlib", "os", "importlib", "builtins", "sys", "ctypes", "multiprocessing", "webbrowser"):
                raise ImportError("Module '" + name + "' is not available in the Ilyas sandbox")
            return original_import(name, globals, locals, fromlist, level)
        return guarded_import
    __safe_builtins = dict(__builtin_module.__dict__)
    __safe_builtins["__import__"] = __make_guard(__builtin_module.__import__)
    globals()["__builtins__"] = __safe_builtins
    del __builtin_module
    del __safe_builtins
    del __make_guard
    __ilyas_import_guarded = True
ilyas = _Ilyas()
\`;
self.onmessage=async ev=>{
 const m=ev.data||{};
 if(m.type==="stop"){stopped=true;return}
 if(m.type==="init"){
  try{importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");pyodide=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.27.7/full/"});postMessage({type:"ready",version:pyodide.version})}
  catch(e){postMessage({type:"init-error",error:String(e)})}return;
 }
 if(m.type!=="run"||!pyodide||stopped)return;
 const start=performance.now();
 try{
  let c=contexts.get(m.scriptId);
  const setInputs=(g)=>{g.set("__state_json",JSON.stringify(m.state||{}));g.set("__inputs_json",JSON.stringify(m.inputs||{}));g.set("__exports_json",JSON.stringify(m.exports||{}));g.set("__dt_value",Number(m.dt)||0.016);g.set("__clock_value",Number(m.time)||0);g.set("__name__","__main__");};
  if(!c||c.source!==m.code){if(c&&c.globals)c.globals.destroy();const g=pyodide.globals.get("dict")();c={globals:g,source:m.code,instanceName:null,ready:false};contexts.set(m.scriptId,c);g.set("__user_code",m.code);g.set("__executed",false);setInputs(g);await pyodide.runPythonAsync(PRELUDE,{globals:g});}
  const g=c.globals;setInputs(g);
  await pyodide.runPythonAsync(PRELUDE,{globals:g});
  g.set("__class_name",(m.code.match(/class\\s+([A-Za-z_]\\w*)/)||[])[1]||"");
  g.set("__phase",m.phase||"run");g.set("__object_name",m.objectName||"");g.set("__instance_key",m.scriptId+"::"+(m.objectId||"preview"));
  const driver=\`
if "__instances" not in globals(): __instances = {}
if not __executed:
    exec(__user_code, globals())
    __executed = True
__key = __instance_key
__cls = globals().get(__class_name)
if not isinstance(__cls, type) or __class_name in ("_Node","_Ilyas"): __cls = None
__inst = __instances.get(__key)
if __phase == "run":
    if __inst is None and __cls is not None:
        __inst = __cls()
        __instances[__key] = __inst
    if __inst is not None and hasattr(__inst,"ready") and not getattr(__inst,"__ilyas_ready",False):
        __inst.ready()
        __inst.__ilyas_ready = True
    elif __inst is None:
        pass
elif __phase == "ready":
    if __inst is None and __cls is not None:
        __inst = __cls()
        __instances[__key] = __inst
    if __inst is not None and hasattr(__inst,"ready") and not getattr(__inst,"__ilyas_ready",False):
        __inst.ready()
        __inst.__ilyas_ready = True
elif __phase == "update":
    if __inst is None and __cls is not None:
        __inst = __cls()
        __instances[__key] = __inst
        if hasattr(__inst,"ready"): __inst.ready()
        __inst.__ilyas_ready = True
    if __inst is not None and hasattr(__inst,"update"):
        __inst.update(__dt)
elif __phase == "collision":
    if __inst is not None and hasattr(__inst,"on_collision"): __inst.on_collision(ilyas.get_node(__other_name))
elif __phase == "input":
    if __inst is not None and hasattr(__inst,"on_input"): __inst.on_input(__input_action)
__out = __commands
__commands = []
\`;
  g.set("__other_name",m.otherName||"");g.set("__input_action",m.action||"");
  g.set("__io",pyodide.runPython("__import__('io').StringIO()",{globals:g}));g.set("__contextlib",pyodide.runPython("__import__('contextlib')",{globals:g}));
  await pyodide.runPythonAsync("__io.seek(0); __io.truncate(0)\\nwith __contextlib.redirect_stdout(__io):\\n"+driver.split("\\n").map(x=>"    "+x).join("\\n"),{globals:g});
  const output=g.get("__io").getvalue();const commands=g.get("__out").toJs({dict_converter:Object.fromEntries});postMessage({type:"result",runId:m.runId,scriptId:m.scriptId,objectId:m.objectId,phase:m.phase,output,commands:Array.from(commands||[]),duration:performance.now()-start});
 }catch(e){postMessage({type:"run-error",runId:m.runId,scriptId:m.scriptId,objectId:m.objectId,phase:m.phase,error:String(e),stack:e?.stack||""})}
};`;
 state.workerUrl=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));try{state.worker=new Worker(state.workerUrl)}catch(e){state.runtime='error';runtimeError('Could not start the isolated Python worker: '+e.message);return}state.worker.onmessage=onWorkerMessage;state.worker.onerror=e=>{state.runtime='error';runtimeError('Python worker error: '+(e.message||'Unknown error'))};state.worker.postMessage({type:'init'})
}
function runtimeError(message){$('#pyRuntimeDot').classList.remove('ready');$('#pyLanguage').textContent='Python runtime unavailable';$('#pyStatusLeft').textContent='Runtime error';addConsole(message,'error',message);renderProperties();toast(message)}
function onWorkerMessage(e){const m=e.data||{};if(m.type==='ready'){state.runtime='ready';$('#pyRuntimeDot').classList.add('ready');$('#pyLanguage').textContent='Python 3.12 · Pyodide '+m.version;$('#pyStatusLeft').textContent='Python runtime ready';addConsole('Python runtime initialized successfully.','success');renderProperties();return}if(m.type==='init-error'){state.runtime='error';runtimeError('Could not load Python runtime. Check your internet connection and allow cdn.jsdelivr.net. '+m.error);return}if(m.type==='run-error'){state.busy=false;clearTimeout(state.timeout);if(m.phase==='run'){$('#pyStop').disabled=true;$('#pyRun').disabled=false;$('#pyStatusLeft').textContent='Execution error';renderProperties()}const details=m.error+(m.stack?'\n'+m.stack:'');addConsole(details,'error',details);drainQueue();return}if(m.type==='result'){state.busy=false;clearTimeout(state.timeout);if(m.phase==='run'){$('#pyStop').disabled=true;$('#pyRun').disabled=false;$('#pyStatusLeft').textContent='Finished in '+Math.round(m.duration)+' ms';renderProperties()}if(m.output)addConsole(m.output.trimEnd(),'info');if(m.commands?.length)bridge()?.applyScriptCommands(m.commands);drainQueue()}}
function safeState(){const raw=bridge()?.getGameState()||{},p=project();return{width:p?.width||960,height:p?.height||540,score:raw.score||0,running:!!raw.running,paused:!!raw.paused,objects:(raw.objects||[]).map(o=>({id:o.id,name:o.name,type:o.type,x:o.x,y:o.y,w:o.w,h:o.h,width:o.w,height:o.h,rotation:o.rotation||0,visible:o.visible!==false,speed:o.speed||180,color:o.color||'#ff4657',collision:!!o.collision,health:o.health??100,velocity_x:o.vx||o.velocity_x||0,velocity_y:o.vy||o.velocity_y||0}))}}
function inputs(){const b=bridge();return{left:b?.input('left')||false,right:b?.input('right')||false,up:b?.input('up')||false,down:b?.input('down')||false,jump:b?.input('jump')||false,jump_pressed:b?.input('jump_pressed')||false,dash_pressed:b?.input('dash_pressed')||false}}
function runMessage(s,phase='run',object=null,dt=.016,extra={}){if(state.runtime!=='ready'){if(phase==='run')addConsole('Python runtime is not ready yet.','warning');if(state.runtime==='idle'||state.runtime==='error')initRuntime();return}if(state.busy){if(phase==='run')addConsole('A script is already running. Stop it before starting another.','warning');return}if(phase==='run')saveCode();state.busy=true;if(phase==='run'){$('#pyRun').disabled=true;$('#pyStop').disabled=false;$('#pyStatusLeft').textContent='Running '+s.name+'…'}const runId=++state.runId;state.worker.postMessage({type:'run',runId,scriptId:s.id,objectId:object?.id||null,objectName:object?.name||'',otherName:extra.otherName||'',action:extra.action||'',phase,code:s.code,exports:s.exports||extractExports(s.code),state:safeState(),inputs:inputs(),dt,time:performance.now()/1000});clearTimeout(state.timeout);state.timeout=setTimeout(()=>{if(state.busy&&runId===state.runId){stopScript('Execution timed out. Worker terminated to keep the editor responsive.');addConsole('Script exceeded the 2-second execution limit and was stopped.','error','Execution timeout')}},2200)}
function stopScript(message='Script stopped by user.'){clearTimeout(state.timeout);state.busy=false;state.runId++;try{state.worker?.terminate()}catch{}state.worker=null;if(state.workerUrl)URL.revokeObjectURL(state.workerUrl);state.workerUrl=null;state.runtime='idle';$('#pyRun').disabled=false;$('#pyStop').disabled=true;$('#pyRuntimeDot').classList.remove('ready');$('#pyLanguage').textContent='Python runtime stopped';$('#pyStatusLeft').textContent='Stopped';addConsole(message,'warning');initRuntime()}
function runActive(){const s=activeScript();if(!s){addConsole('Create or open a script first.','warning');return}runMessage(s,'run',null,.016)}
function tickScripts(){if(!bridge()?.getRunning())return;const p=project(),attached=(p?.objects||[]).filter(o=>o.scriptId);if(!attached.length)return;if(state.runtime!=='ready'){if(state.runtime==='idle'||state.runtime==='error')initRuntime();return}if(state.busy)return;const now=performance.now();if(now-state.lastTick<70)return;state.lastTick=now;for(const obj of attached){const s=scripts().find(x=>x.id===obj.scriptId);if(s)runMessage(s,'update',obj,Math.min(.07,(now-(state.instances[obj.id]||now))/1000||.016));state.instances[obj.id]=now;if(state.busy)break}}
function undoCode(){const s=activeScript();if(!s||!state.history.length)return;state.future.push($('#pyCode').value);$('#pyCode').value=state.history.pop();s.code=$('#pyCode').value;paintEditor();persistScripts();updateUndoButtons()}
function redoCode(){const s=activeScript();if(!s||!state.future.length)return;state.history.push($('#pyCode').value);$('#pyCode').value=state.future.pop();s.code=$('#pyCode').value;paintEditor();persistScripts();updateUndoButtons()}
function updateUndoButtons(){$('#pyUndo').disabled=!state.history.length;$('#pyRedo').disabled=!state.future.length}
function formatCode(){const el=$('#pyCode');let code=el.value.split('\n').map(line=>line.replace(/[ \t]+$/,'').replace(/^\t+/g,t=>'    '.repeat(t.length))).join('\n');el.value=code;markDirty();addConsole('Removed trailing whitespace and normalized tabs to four spaces.','success')}
function findNext(){const el=$('#pyCode'),q=$('#pyFindInput').value;if(!q)return;let idx=el.value.indexOf(q,el.selectionEnd);if(idx<0)idx=el.value.indexOf(q);if(idx<0){addConsole('No match found for: '+q,'warning');return}el.focus();el.setSelectionRange(idx,idx+q.length);updateCursor()}
function replaceOne(){const el=$('#pyCode'),q=$('#pyFindInput').value,r=$('#pyReplaceInput').value;if(!q)return;if(el.value.slice(el.selectionStart,el.selectionEnd)===q){el.setRangeText(r,el.selectionStart,el.selectionEnd,'end');markDirty()}else findNext()}
function bind(){const btn=$('#pythonEditorBtn');btn.onclick=showWorkspace;$('#pyBack').onclick=hideWorkspace;$('#pyScenesFolder').onclick=()=>{$('#pyScenesList').classList.toggle('hidden');$('#pyScenesFolder').firstChild.textContent=$('#pyScenesList').classList.contains('hidden')?'▸':'▾'};$('#pyAssetsFolder').onclick=()=>{$('#pyAssetsList').classList.toggle('hidden');$('#pyAssetsFolder').firstChild.textContent=$('#pyAssetsList').classList.contains('hidden')?'▸':'▾'};$('#pyNew').onclick=()=>createScript();$('#pyNewSmall').onclick=()=>createScript();$('#pyCreateScript').onclick=()=>createScript();$('#pyExamples').onclick=showTemplates;$('#pyTemplates').onclick=showTemplates;$('#pyTemplateSearch').oninput=renderTemplates;$('#pyModalClose').onclick=()=>$('#pyTemplateModal').classList.add('hidden');$('#pyAttach').onclick=attachToSelected;$('#pyPlayGame').onclick=()=>bridge()?.startPlay();$('#pyStopGame').onclick=()=>bridge()?.stopPlay();$('#pyRestartGame').onclick=()=>bridge()?.restartPlay();$('#pyPauseGame').onclick=()=>bridge()?.pausePlay();$('#pyResumeGame').onclick=()=>bridge()?.resumePlay();$('#pyPauseGameOverlay').onclick=()=>bridge()?.pausePlay();$('#pyResumeGameOverlay').onclick=()=>bridge()?.resumePlay();$('#pyRun').onclick=runActive;$('#pyStop').onclick=()=>stopScript();$('#pySearch').oninput=renderScriptList;$('#pyCode').addEventListener('input',()=>{const s=activeScript();if(s){state.history.push(s.code||'');if(state.history.length>150)state.history.shift();state.future=[];updateUndoButtons()}markDirty();renderExportFields()});$('#pyCode').addEventListener('scroll',()=>{$('#pyHighlight').scrollTop=$('#pyCode').scrollTop;$('#pyHighlight').scrollLeft=$('#pyCode').scrollLeft;$('#pyLineNumbers').scrollTop=$('#pyCode').scrollTop});$('#pyCode').addEventListener('click',updateCursor);$('#pyCode').addEventListener('keyup',updateCursor);$('#pyCode').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const el=e.target,start=el.selectionStart,end=el.selectionEnd;el.setRangeText('    ',start,end,'end');markDirty()}if(e.key==='Enter'){const el=e.target,at=el.selectionStart,line=el.value.slice(0,at).split('\n').pop(),indent=(line.match(/^\s*/)||[''])[0]+(/:\s*$/.test(line)?'    ':'');e.preventDefault();el.setRangeText('\n'+indent,at,el.selectionEnd,'end');markDirty()}if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();runActive()}if(e.ctrlKey&&e.key.toLowerCase()==='s'){e.preventDefault();saveCode()}if(e.ctrlKey&&e.key.toLowerCase()==='f'){e.preventDefault();$('#pyFindBar').classList.remove('hidden');$('#pyFindInput').focus()}if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();undoCode()}if(e.ctrlKey&&e.key.toLowerCase()==='y'){e.preventDefault();redoCode()}});$('#pyUndo').onclick=undoCode;$('#pyRedo').onclick=redoCode;$('#pyFormat').onclick=formatCode;$('#pyFindBtn').onclick=()=>$('#pyFindBar').classList.toggle('hidden');$('#pyFindNext').onclick=findNext;$('#pyReplace').onclick=replaceOne;$('#pyFindClose').onclick=()=>$('#pyFindBar').classList.add('hidden');$$('[data-pyconsole]').forEach(b=>b.onclick=()=>{$$('[data-pyconsole]').forEach(x=>x.classList.toggle('active',x===b));state.filter=b.dataset.pyconsole;filterConsole()});$('#pyClearConsole').onclick=()=>{$('#pyConsole').innerHTML='<div class="py-console-empty">Console cleared.</div>';$('#pyConsoleCount').textContent='0 messages';state.lastError=''};$('#pyCopyError').onclick=()=>{if(!state.lastError){addConsole('There is no error to copy.','warning');return}navigator.clipboard?.writeText(state.lastError).then(()=>toast('Error details copied')).catch(()=>{const t=document.createElement('textarea');t.value=state.lastError;document.body.append(t);t.select();document.execCommand('copy');t.remove();toast('Error details copied')})};document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();state.open?hideWorkspace():showWorkspace()}if(state.open&&e.key==='Escape'&&$('#pyTemplateModal').classList.contains('hidden'))hideWorkspace()});window.addEventListener('beforeunload',()=>{if(state.open)saveCode()});document.addEventListener('keydown',e=>{if(!bridge()?.getRunning())return;const map={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'jump_pressed',e:'dash_pressed'};const action=map[e.key]||null;if(action)emitInput(action)});setInterval(tickScripts,70)}
function drainQueue(){if(state.busy||!state.queue.length||state.runtime!=='ready')return;const e=state.queue.shift();runMessage(e.s,e.phase,e.obj,.016,e.extra||{})}function emitCollision(objectId,otherName){if(!bridge()?.getRunning())return;const obj=(bridge()?.getGameState().objects||[]).find(o=>o.id===objectId);if(!obj?.scriptId)return;const s=scripts().find(x=>x.id===obj.scriptId);if(s){const e={s,phase:'collision',obj,extra:{otherName}};if(state.busy)state.queue.push(e);else runMessage(s,e.phase,obj,.016,e.extra)}}function emitInput(action){if(!bridge()?.getRunning()||state.runtime!=='ready')return;for(const obj of (project()?.objects||[]).filter(o=>o.scriptId)){const s=scripts().find(x=>x.id===obj.scriptId);if(s){const e={s,phase:'input',obj,extra:{action}};if(state.busy)state.queue.push(e);else runMessage(s,e.phase,obj,.016,e.extra)}}}window.IlyasPythonEditor={open:showWorkspace,openScript,attachToSelected,run:runActive,emitCollision,emitInput};
bind();
})();