const DATA = window.COURSE;
const CH = DATA.chapters;
const stmt = id => { const c=id.split('.').slice(0,2).join('.'); return CH[c].statements.find(s=>s.id===id); };
const esc = s => s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const VIEWS = ['sl','ahl','book'];
let view='sl', query='';
try{ const v=localStorage.getItem('cm-view'); if(VIEWS.includes(v)) view=v; }catch(e){}

const shortName = n => n.replace('AHL: ','');
const ahlRows = u => [...u.core,...u.assorted.groups];
const sum = (a,k) => a.reduce((t,u)=>t+u[k],0);
const pageRange = p => p[0]===p[1] ? 'p. '+p[0] : 'pp. '+p[0]+'–'+p[1];

// chapter code -> every place it is taught
const placed={};
const addP=(code,label,href)=>{(placed[code]=placed[code]||[]).push({label,href})};
DATA.sl.forEach(u=>u.subtopics.forEach(s=>addP(s.code,'SL · '+u.name+(s.lens?' · '+s.lens:''),s.href)));
DATA.ahl.forEach(u=>ahlRows(u).forEach(s=>addP(s.code,'AHL · '+shortName(u.name),s.href)));

function stats(){
  const sw=sum(DATA.sl,'weeks'), sh=sum(DATA.sl,'hours'), aw=sum(DATA.ahl,'weeks'), ah=sum(DATA.ahl,'hours');
  const items=[[DATA.sl.length,'SL units'],[sw+' wk','SL · '+sh+' hours'],[DATA.ahl.length,'AHL units'],[aw+' wk','AHL · '+ah+' hours'],[Object.keys(CH).length,'textbook chapters'],[(sh+ah)+' h','HL total · SL + AHL']];
  document.getElementById('stats').innerHTML=items.map(([b,s])=>`<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
}
function strip(){
  const SW=sum(DATA.sl,'weeks'), AW=sum(DATA.ahl,'weeks');
  const row=(units,ahl,first,n,prefix)=>{
    const segs=units.map((u,i)=>{
      const num=prefix+(i+1), name=shortName(u.name);
      return `<button class="seg${ahl?' ahl':''}" style="--w:${u.weeks}" data-go="${ahl?'ahl':'sl'}-${i}" title="${esc(u.name)}: ${u.weeks} weeks, ${u.hours} hours" aria-label="${esc(u.name)}, ${u.weeks} weeks">${u.weeks>=3?esc(name):''}<small>${num}</small></button>`;
    }).join('');
    return `<div class="strip-row" style="width:${(n/SW*100).toFixed(3)}%"><div class="strip-label">${ahl?'AHL':'SL'}</div><div class="strip">${segs}</div><div class="ruler" style="--n:${n}"></div><div class="ruler-labels"><span>Week ${first}</span><span>Week ${first+n-1}</span></div></div>`;
  };
  document.getElementById('strip').innerHTML=row(DATA.sl,false,1,SW,'')+row(DATA.ahl,true,SW+1,AW,'H');
}
function hi(t){ if(!query) return esc(t); const re=new RegExp('('+esc(query).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'); return esc(t).replace(re,'<mark>$1</mark>'); }
const hit = id => stmt(id).text.toLowerCase().includes(query.toLowerCase())||id.toLowerCase().startsWith(query.toLowerCase());
const match = ids => !query || ids.some(hit);
function hits(ids){
  if(!query) return '';
  return `<div class="hits"><ul class="stmts">${ids.filter(hit).map(i=>{const s=stmt(i);return `<li class="${s.hl?'hl':''}"><span class="id">${i}</span><span>${hi(s.text)}</span><span class="pg">p. ${s.page}</span></li>`}).join('')}</ul></div>`;
}
function subRow({code,ids,hours,lens,label,pages,href}){
  const c=CH[code];
  const badges=[lens?`<span class="pill">${lens}</span>`:'', c.hlOnly?`<span class="pill hl">HL only</span>`:'', label?`<span class="pill hl">${label}</span>`:''].join('');
  const right=[hours+' h',pageRange(pages),ids.length+' statements'].join(' · ');
  return `<li><a class="row" href="${href}"><span class="code t-${code[0]}">${code}</span><span class="title">${esc(c.title)}<span class="badges">${badges}</span></span><span class="right">${right}</span></a>${hits(ids)}</li>`;
}
function unitHead(u,n,id,prefix){
  return `<section class="unit" id="${id}"><div class="unit-num">${prefix}${n}</div><div class="unit-body"><div class="unit-head"><h2>${esc(u.name)}</h2><span class="unit-meta">${u.weeks} weeks · ${u.hours} hours</span></div>${u.note?`<p class="note">${esc(u.note)}</p>`:''}`;
}
function renderSL(){
  return DATA.sl.map((u,i)=>{
    const subs=u.subtopics.filter(s=>match(s.ids));
    if(query&&!subs.length) return '';
    return unitHead(u,i+1,'sl-'+i,'')+`<ul class="rows">${subs.map(s=>subRow(s)).join('')}</ul></div></section>`;
  }).join('')||'<p class="empty">No statements match.</p>';
}
function renderAHL(){
  return DATA.ahl.map((u,i)=>{
    const core=u.core.filter(c=>match(c.ids)), grp=u.assorted.groups.filter(g=>match(g.ids));
    if(query&&!core.length&&!grp.length) return '';
    let h=unitHead(u,i+1,'ahl-'+i,'H');
    if(core.length) h+=`<div class="group-label">New HL-only chapter</div><ul class="rows">${core.map(c=>subRow(c)).join('')}</ul>`;
    if(grp.length) h+=`<div class="group-label">Assorted content · ${u.assorted.hours} hours · HL statements from SL chapters</div><ul class="rows">${grp.map(g=>subRow({...g,label:'HL extension'})).join('')}</ul>`;
    return h+'</div></section>';
  }).join('')||'<p class="empty">No statements match.</p>';
}
function renderBook(){
  return Object.entries(DATA.themes).map(([L,name])=>{
    const chs=Object.values(CH).filter(c=>c.code[0]===L).filter(c=>match(c.statements.map(s=>s.id)));
    if(query&&!chs.length) return '';
    return `<section class="unit t-${L}"><div class="unit-num theme-letter">${L}</div><div class="unit-body"><div class="unit-head"><h2>${esc(name)}</h2><span class="unit-meta">${chs.length} chapters</span></div><ul class="rows">${chs.map(c=>{
      const ids=c.statements.map(s=>s.id);
      const badge=c.hlOnly?`<span class="badges"><span class="pill hl">HL only</span></span>`:'';
      return `<li><div class="row"><span class="code t-${L}">${c.code}</span><span class="title">${esc(c.title)}${badge}</span><span class="right">${pageRange([c.page,c.end])} · ${ids.length} statements</span></div><div class="where" aria-label="Taught in">${placed[c.code].map(p=>`<a href="${p.href}">${esc(p.label)}</a>`).join('')}</div>${hits(ids)}</li>`;
    }).join('')}</ul></div></section>`;
  }).join('')||'<p class="empty">No statements match.</p>';
}
function render(){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.v===view));
  document.getElementById('view').innerHTML=view==='sl'?renderSL():view==='ahl'?renderAHL():renderBook();
}
function go(id){
  const v=id.startsWith('ahl')?'ahl':'sl';
  if(view!==v){view=v;render();}
  requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start'}));
}
function fromHash(){
  const h=location.hash.slice(1);
  if(VIEWS.includes(h)){view=h;render();}
  else if(/^(sl|ahl)-\d+$/.test(h)) go(h);
}
document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;view=b.dataset.v;try{localStorage.setItem('cm-view',view)}catch(_){}render();});
document.getElementById('q').addEventListener('input',e=>{query=e.target.value.trim();render();});
document.getElementById('strip').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)go(b.dataset.go);});
window.addEventListener('hashchange',fromHash);
stats();strip();render();fromHash();
