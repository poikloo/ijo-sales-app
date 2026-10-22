// 목록 칸 넓이 조절 (엑셀처럼 머리글 오른쪽 경계를 끌어서 조절, 더블클릭=기본값)
let colWidths={};
function crLoad(r){colWidths=(r&&r.colWidths&&typeof r.colWidths==='object')?r.colWidths:{}}
function crPayload(){return {colWidths}}
function crImport(r){crLoad(r);document.querySelectorAll('table[data-rz]').forEach(crApply)}
function crCols(t){return [...t.querySelectorAll('colgroup col')]}
function crApply(t){const id=t.dataset.rz,cols=crCols(t),w=colWidths[id];
 if(!t._def)t._def=cols.map(c=>c.getAttribute('style')||'');
 if(!Array.isArray(w)||w.length!==cols.length){cols.forEach((c,i)=>c.setAttribute('style',t._def[i]));t.classList.remove('rzd');t.style.width='';return}
 cols.forEach((c,i)=>c.style.width=w[i]+'px');t.classList.add('rzd');t.style.width=w.reduce((a,b)=>a+b,0)+'px'}
function crMeasure(t){return [...t.tHead.rows[0].cells].map(th=>Math.round(th.getBoundingClientRect().width))}
function crReset(t,i){const id=t.dataset.rz,w=colWidths[id];if(!w)return;
 // 그 칸만 기본값으로: 기본 상태에서 해당 칸 폭을 잰다
 const cur=w.slice();delete colWidths[id];crApply(t);const def=crMeasure(t);cur[i]=Math.max(50,def[i]);
 if(cur.every((v,k)=>Math.abs(v-def[k])<2)){save();return}
 colWidths[id]=cur;crApply(t);save()}
function crResetAll(t){delete colWidths[t.dataset.rz];crApply(t);save()}
function crInit(){document.querySelectorAll('table[data-rz]').forEach(t=>{
 crApply(t);
 [...t.tHead.rows[0].cells].forEach((th,i)=>{if(th.querySelector('.rzh'))return;const h=document.createElement('span');h.className='rzh';h.title='끌어서 칸 넓이 조절 · 더블클릭: 기본값';th.appendChild(h);
  h.addEventListener('click',e=>e.stopPropagation());
  h.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();crReset(t,i)});
  h.addEventListener('mousedown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();
   const w=colWidths[t.dataset.rz]&&colWidths[t.dataset.rz].length===t.tHead.rows[0].cells.length?colWidths[t.dataset.rz].slice():crMeasure(t);
   const x0=e.clientX,w0=w[i];h.classList.add('on');document.body.classList.add('rzing');
   const mv=ev=>{w[i]=Math.max(50,Math.round(w0+ev.clientX-x0));colWidths[t.dataset.rz]=w;crApply(t)};
   const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);h.classList.remove('on');document.body.classList.remove('rzing');if(colWidths[t.dataset.rz])save()};
   document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)})});
 t.tHead.addEventListener('contextmenu',e=>{if(!colWidths[t.dataset.rz])return;e.preventDefault();if(confirm('이 목록의 칸 넓이를 모두 기본값으로 되돌릴까요?'))crResetAll(t)})})}
