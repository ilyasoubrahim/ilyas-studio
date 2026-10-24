(()=>{'use strict';
const $=s=>document.querySelector(s);
const palette=[
{type:'start',label:'when game starts',group:'EVENTS',color:'event',icon:'⚑'},
{type:'right',label:'move right continuously',group:'MOVEMENT',color:'motion',icon:'↦'},
{type:'left',label:'move left continuously',group:'MOVEMENT',color:'motion',icon:'↤'},
{type:'up',label:'move up continuously',group:'MOVEMENT',color:'motion',icon:'↥'},
{type:'down',label:'move down continuously',group:'MOVEMENT',color:'motion',icon:'↧'},
{type:'keyright',label:'when RIGHT arrow pressed, move',group:'MOVEMENT',color:'motion',icon:'→'},
{type:'keyleft',label:'when LEFT arrow pressed, move',group:'MOVEMENT',color:'motion',icon:'←'},
{type:'speed',label:'set movement speed',group:'PROPERTIES',color:'looks',icon:'⚙',value:180},
{type:'color',label:'change character color',group:'PROPERTIES',color:'looks',icon:'●',value:'#ff4657'},
{type:'say',label:'show a text message',group:'EVENTS',color:'event',icon:'💬',value:'Hello, game!'},
{type:'wait',label:'wait for seconds',group:'EVENTS',color:'event',icon:'⌛',value:1},
{type:'if_touch',label:'if this character touches… add points',group:'GAME',color:'game',icon:'✦',value:1,target:''},
{type:'score',label:'add points when game starts',group:'GAME',color:'game',icon:'★',value:10}];
let blocks=[],nextId=1,active=false;
function bridge(){return window.IlyasStudioBridge}
function selected(){return bridge()?.getSelected()}
function project(){return bridge()?.getProject()}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function ensureUI(){
if($('#blocksWorkspace'))return;
const root=document.createElement('section');root.id='blocksWorkspace';root.className='blocks-workspace hidden';
root.innerHTML='<header class="blocks-topbar"><button id="blocksBack" class="blocks-back">← Back to scene</button><div class="blocks-brand"><span class="blocks-logo">🧩</span><div><b>VISUAL BLOCKS</b><small>SCRATCH-STYLE PROGRAMMING</small></div></div><label class="blocks-character-label">CHARACTER <select id="blocksCharacter"></select></label><div class="blocks-top-actions"><button id="blocksClear">Clear blocks</button><button id="blocksAttach" class="blocks-run">▶ Attach Script</button></div></header><div class="blocks-main"><aside class="blocks-palette"><div class="blocks-section-title">BLOCK LIBRARY</div><p class="blocks-tip">Click a block to add it to your script.</p><div id="blocksPaletteItems"></div></aside><main class="blocks-stage"><div class="blocks-stage-head"><div><span class="blocks-kicker">MY SCRIPT</span><h2>Build your character&#39;s logic</h2></div><span id="blocksCount">0 blocks</span></div><div id="blocksStack" class="blocks-stack"><div class="blocks-empty"><span>🧩</span><b>Your script starts here</b><p>Add blocks from the library on the left. Put the start block first, then add actions below it.</p></div></div><div class="blocks-stage-foot"><span>Blocks are saved with this character.</span><span id="blocksStatus">Ready</span></div></main><aside class="blocks-help"><div class="blocks-section-title">HOW IT WORKS</div><div class="blocks-help-card"><b>01 · Choose a character</b><p>Select the object you want to program from the menu above.</p></div><div class="blocks-help-card"><b>02 · Assemble blocks</b><p>Click colorful blocks to add them. Reorder them with ↑ and ↓.</p></div><div class="blocks-help-card"><b>03 · Attach &amp; Run</b><p>Your blocks are converted into an executable character script and attached automatically.</p></div><div class="blocks-help-card blocks-note"><b>Starter blocks</b><p>Movement, arrow-key controls, speed, color, console messages and score.</p></div></aside></div>';
document.body.append(root);
$('#blocksPaletteItems').innerHTML=['EVENTS','MOVEMENT','PROPERTIES','GAME'].map(group=>'<div class="blocks-group"><div class="blocks-group-title">'+group+'</div>'+palette.filter(p=>p.group===group).map(p=>'<button class="visual-block '+p.color+'" data-add="'+p.type+'"><span>'+p.icon+'</span><b>'+p.label+'</b><i>＋</i></button>').join('')+'</div>').join('');
$('#blocksPaletteItems').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addBlock(b.dataset.add));
$('#blocksBack').onclick=close;
$('#blocksClear').onclick=()=>{blocks=[];renderStack();saveBlocks();$('#blocksStatus').textContent='Script cleared'};
$('#blocksAttach').onclick=attach;
$('#blocksCharacter').onchange=()=>{bridge()?.selectObject($('#blocksCharacter').value);loadForSelection()};
}
function show(){if(!project()){alert('Open a project first.');return}ensureUI();active=true;document.querySelector('#dashboard')?.classList.add('hidden');document.querySelector('#editor')?.classList.add('hidden');$('#pythonWorkspace')?.classList.add('hidden');$('#blocksWorkspace').classList.remove('hidden');fillCharacters();loadForSelection()}
function close(){active=false;$('#blocksWorkspace')?.classList.add('hidden');document.querySelector('#editor')?.classList.remove('hidden')}
function fillCharacters(){const objs=project()?.objects||[],sel=selected();$('#blocksCharacter').innerHTML=objs.map(o=>'<option value="'+safe(o.id)+'" '+(o.id===sel?.id?'selected':'')+'>'+safe(o.name)+' ('+safe(o.type)+')</option>').join('');if(!objs.length)$('#blocksCharacter').innerHTML='<option value="">No characters in scene</option>'}
function loadForSelection(){const o=selected();blocks=Array.isArray(o?.visualBlocks)?JSON.parse(JSON.stringify(o.visualBlocks)):[];nextId=Math.max(1,...blocks.map(b=>(b.uid||0)+1));renderStack();$('#blocksStatus').textContent=o?'Editing '+o.name:'Choose a character'}
function addBlock(type){const def=palette.find(p=>p.type===type);if(!def)return;let b={uid:nextId++,type};if(def.value!==undefined)b.value=def.value;blocks.push(b);renderStack();saveBlocks()}
function renderStack(){const root=$('#blocksStack');$('#blocksCount').textContent=blocks.length+' block'+(blocks.length===1?'':'s');if(!blocks.length){root.innerHTML='<div class="blocks-empty"><span>🧩</span><b>Your script starts here</b><p>Add blocks from the library on the left. Put the start block first, then add actions below it.</p></div>';return}
root.innerHTML=blocks.map((b,i)=>{const d=palette.find(p=>p.type===b.type)||palette[0];let field='';if(['speed','score','wait','if_touch'].includes(b.type))field='<input type="number" data-value="'+b.uid+'" value="'+safe(b.value)+'" min="1" max="1000" aria-label="Value">';if(b.type==='color')field='<input type="color" data-value="'+b.uid+'" value="'+safe(b.value)+'" aria-label="Character color">';if(b.type==='say')field='<input type="text" data-value="'+b.uid+'" value="'+safe(b.value)+'" maxlength="100" aria-label="Text message" placeholder="Type your message">';if(b.type==='if_touch'){const targets=(project()?.objects||[]).filter(o=>o.id!==selected()?.id);field='<select data-target="'+b.uid+'" aria-label="Object to touch"><option value="">Choose object…</option>'+targets.map(o=>'<option value="'+safe(o.name)+'" '+(o.name===b.target?'selected':'')+'>'+safe(o.name)+'</option>').join('')+'</select>'+field.replace('aria-label="Value"','aria-label="Points"')}return '<div class="stack-block '+d.color+'" data-uid="'+b.uid+'"><span class="stack-icon">'+d.icon+'</span><b>'+d.label+'</b>'+field+'<div class="stack-actions"><button data-up="'+b.uid+'" title="Move up" '+(i===0?'disabled':'')+'>↑</button><button data-down="'+b.uid+'" title="Move down" '+(i===blocks.length-1?'disabled':'')+'>↓</button><button data-remove="'+b.uid+'" title="Remove block">×</button></div></div>'}).join('');
root.querySelectorAll('[data-value]').forEach(el=>el.onchange=()=>{let b=blocks.find(x=>x.uid===+el.dataset.value);if(b)b.value=el.type==='number'?Math.max(1,Math.min(1000,+el.value||1)):el.value;saveBlocks()});
root.querySelectorAll('[data-target]').forEach(el=>el.onchange=()=>{let b=blocks.find(x=>x.uid===+el.dataset.target);if(b){b.target=el.value;saveBlocks()}});root.querySelectorAll('[data-up]').forEach(el=>el.onclick=()=>moveBlock(+el.dataset.up,-1));root.querySelectorAll('[data-down]').forEach(el=>el.onclick=()=>moveBlock(+el.dataset.down,1));root.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{blocks=blocks.filter(b=>b.uid!==+el.dataset.remove);renderStack();saveBlocks()});
}
function moveBlock(uid,dir){let i=blocks.findIndex(b=>b.uid===uid),j=i+dir;if(i<0||j<0||j>=blocks.length)return;[blocks[i],blocks[j]]=[blocks[j],blocks[i]];renderStack();saveBlocks()}
function saveBlocks(){const o=selected();if(o){o.visualBlocks=JSON.parse(JSON.stringify(blocks));const p=project();p.scripts=Array.isArray(p.scripts)?p.scripts:[];const attached=p.scripts.find(s=>s.id===o.scriptId&&s.generatedBy==='visual-blocks');if(attached){attached.code=compile();attached.modified=Date.now();attached.version=(attached.version||0)+1}bridge()?.saveProject();if($('#blocksStatus'))$('#blocksStatus').textContent=attached?'Blocks and script synced ✓':'Blocks saved to '+o.name}}
function compile(){
const lines=['class VisualBlocksController:','    def ready(self):','        self.speed = 180','        obj = ilyas.get_self()','        if obj is not None:','            obj.color = "'+(selected()?.color||'#ff4657')+'"'];
const updates=[],collision=[];
let waitIndex=0;
for(const b of blocks){
if(b.type==='start')lines.push('        ilyas.log("Visual blocks started")');
if(b.type==='say')lines.push('        ilyas.log("'+String(b.value||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,' ')+'")');
if(b.type==='color')lines.push('        if obj is not None: obj.color = "'+String(b.value||'#ff4657')+'"');
if(b.type==='speed')lines.push('        self.speed = '+Math.max(1,Math.min(1000,Number(b.value)||180)));
if(b.type==='score')lines.push('        ilyas.add_score('+Math.max(1,Math.min(100000,Number(b.value)||10))+')');
if(b.type==='if_touch'&&b.target){collision.push('        if other is not None and other.name == "'+String(b.target).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'":','            ilyas.add_score('+Math.max(1,Math.min(100000,Number(b.value)||1))+')')}
if(b.type==='right')updates.push('        obj.x = min(width - obj.width/2, obj.x + self.speed * delta)');
if(b.type==='left')updates.push('        obj.x = max(obj.width/2, obj.x - self.speed * delta)');
if(b.type==='up')updates.push('        obj.y = max(obj.height/2, obj.y - self.speed * delta)');
if(b.type==='down')updates.push('        obj.y = min(height - obj.height/2, obj.y + self.speed * delta)');
if(b.type==='keyright')updates.push('        if ilyas.get_input("right"): obj.x = min(width - obj.width/2, obj.x + self.speed * delta)');
if(b.type==='keyleft')updates.push('        if ilyas.get_input("left"): obj.x = max(obj.width/2, obj.x - self.speed * delta)');
if(b.type==='wait'){const n=waitIndex++;lines.push('        self._blocks_wait_'+n+' = '+Math.max(0.1,Math.min(3600,Number(b.value)||1)));updates.push('        if self._blocks_wait_'+n+' > 0:','            self._blocks_wait_'+n+' = max(0, self._blocks_wait_'+n+' - delta)','            return')}
}
lines.push('    def update(self, delta):','        obj = ilyas.get_self()','        if obj is None: return','        width, height = ilyas.get_viewport_size()');
if(updates.length)lines.push(...updates);else lines.push('        pass');
if(collision.length)lines.push('    def on_collision(self, other):',...collision);else lines.push('    def on_collision(self, other):','        pass');
return lines.join('\n')+'\n';
}
function attach(){const o=selected(),p=project();if(!o||!p){$('#blocksStatus').textContent='Select a character first';return}const code=compile();p.scripts=Array.isArray(p.scripts)?p.scripts:[];let script=p.scripts.find(s=>s.id===o.scriptId&&s.generatedBy==='visual-blocks');if(!script){script={id:'blocks-'+Math.random().toString(36).slice(2,10),name:'Blocks_'+String(o.name||'Character').replace(/[^a-z0-9]/gi,''),exports:{},modified:Date.now(),version:1,generatedBy:'visual-blocks'};p.scripts.push(script)}script.code=code;script.modified=Date.now();script.version=(script.version||0)+1;script.name='Blocks_'+String(o.name||'Character').replace(/[^a-z0-9]/gi,'');script.generatedBy='visual-blocks';o.scriptId=script.id;o.visualBlocks=JSON.parse(JSON.stringify(blocks));bridge().saveProject();$('#blocksStatus').textContent='Attached to '+o.name+' ✓';bridge().log('Visual blocks compiled and attached to '+o.name);const btn=$('#blocksAttach');btn.textContent='✓ Attached';setTimeout(()=>{if(btn.isConnected)btn.textContent='▶ Attach Script'},1500)}
document.addEventListener('DOMContentLoaded',()=>{const btn=$('#blocksEditorBtn');if(btn)btn.onclick=show;else setTimeout(()=>{const b=$('#blocksEditorBtn');if(b)b.onclick=show},100)});
window.IlyasVisualBlocks={open:show,compile,addBlock};
})();