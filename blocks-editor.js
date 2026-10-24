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
{type:'keyup',label:'when UP arrow pressed, move',group:'MOVEMENT',color:'motion',icon:'↑'},
{type:'keydown',label:'when DOWN arrow pressed, move',group:'MOVEMENT',color:'motion',icon:'↓'},
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
root.innerHTML='<header class="blocks-topbar"><button id="blocksBack" class="blocks-back">← Back to scene</button><div class="blocks-brand"><span class="blocks-logo">🧩</span><div><b>VISUAL BLOCKS</b><small>SCRATCH-STYLE PROGRAMMING</small></div></div><label class="blocks-character-label">CHARACTER <select id="blocksCharacter"></select></label><div class="blocks-top-actions"><button id="blocksClear">Clear blocks</button><button id="blocksAttach" class="blocks-run">✓ Save & Apply</button></div></header><div class="blocks-main"><aside class="blocks-palette"><div class="blocks-section-title">BLOCK LIBRARY</div><p class="blocks-tip">Click a block to add it to your script.</p><div id="blocksPaletteItems"></div></aside><main class="blocks-stage"><div class="blocks-stage-head"><div><span class="blocks-kicker">MY SCRIPT</span><h2>Build your character&#39;s logic</h2></div><span id="blocksCount">0 blocks</span></div><div id="blocksStack" class="blocks-stack"><div class="blocks-empty"><span>🧩</span><b>Your script starts here</b><p>Add blocks from the library on the left. Put the start block first, then add actions below it.</p></div></div><div class="blocks-stage-foot"><span>Blocks are saved with this character.</span><span id="blocksStatus">Ready</span></div></main><aside class="blocks-help"><div class="blocks-section-title">HOW IT WORKS</div><div class="blocks-help-card"><b>01 · Choose a character</b><p>Select the object you want to program from the menu above.</p></div><div class="blocks-help-card"><b>02 · Assemble blocks</b><p>Click colorful blocks to add them. Reorder them with ↑ and ↓.</p></div><div class="blocks-help-card"><b>03 · Attach &amp; Run</b><p>Your blocks program the selected character directly.</p></div><div class="blocks-help-card blocks-note"><b>Starter blocks</b><p>Movement, arrow-key controls, speed, color, console messages and score.</p></div></aside></div>';
document.body.append(root);
$('#blocksPaletteItems').innerHTML=['EVENTS','MOVEMENT','PROPERTIES','GAME'].map(group=>'<div class="blocks-group"><div class="blocks-group-title">'+group+'</div>'+palette.filter(p=>p.group===group).map(p=>'<button class="visual-block '+p.color+'" data-add="'+p.type+'"><span>'+p.icon+'</span><b>'+p.label+'</b><i>＋</i></button>').join('')+'</div>').join('');
$('#blocksPaletteItems').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addBlock(b.dataset.add));
$('#blocksBack').onclick=close;
$('#blocksClear').onclick=()=>{blocks=[];renderStack();saveBlocks();$('#blocksStatus').textContent='Script cleared'};
$('#blocksAttach').onclick=attach;
$('#blocksCharacter').onchange=()=>{bridge()?.selectObject($('#blocksCharacter').value);loadForSelection()};
}
function show(){if(!project()){alert('Open a project first.');return}ensureUI();active=true;document.querySelector('#dashboard')?.classList.add('hidden');document.querySelector('#editor')?.classList.add('hidden');$('#blocksWorkspace').classList.remove('hidden');fillCharacters();loadForSelection()}
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
function saveBlocks(){const o=selected();if(o){o.visualBlocks=JSON.parse(JSON.stringify(blocks));o.scriptId=null;const p=project();if(p)p.scripts=[];bridge()?.saveProject();if($('#blocksStatus'))$('#blocksStatus').textContent='Blocks saved and applied to '+o.name}}
function compile(){return JSON.stringify(blocks,null,2)}
function attach(){const o=selected(),p=project();if(!o||!p){$('#blocksStatus').textContent='Select a character first';return}o.visualBlocks=JSON.parse(JSON.stringify(blocks));o.scriptId=null;p.scripts=[];bridge()?.saveProject();$('#blocksStatus').textContent='Saved & applied to '+o.name+' ✓';bridge()?.log('Visual blocks saved for '+o.name);const btn=$('#blocksAttach');btn.textContent='✓ Saved & Applied';setTimeout(()=>{if(btn.isConnected)btn.textContent='✓ Save & Apply'},1500)}
document.addEventListener('DOMContentLoaded',()=>{const btn=$('#blocksEditorBtn');if(btn)btn.onclick=show;else setTimeout(()=>{const b=$('#blocksEditorBtn');if(b)b.onclick=show},100)});
window.IlyasVisualBlocks={open:show,compile,addBlock};
})();