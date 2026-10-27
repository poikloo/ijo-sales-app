// 목록 칸 넓이 조절 (엑셀처럼 머리글 오른쪽 경계를 끌어서 조절, 더블클릭=기본값)
let colWidths={};
function crLoad(r){colWidths=(r&&r.colWidths&&typeof r.colWidths==='object')?r.colWidths:{}}
function crPayload(){return {colWidths}}
function crImport(r){crLoad(r);if(r&&r.listSort)lsLoad(r);document.querySelectorAll('table[data-rz]').forEach(crApply)}
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
 t.tHead.addEventListener('contextmenu',async e=>{if(!colWidths[t.dataset.rz])return;e.preventDefault();if(await uiConfirm('이 목록의 칸 넓이를 모두 기본값으로 되돌릴까요?'))crResetAll(t)})})}
// ===== 목록 정렬 (기본: 오더번호 오름차순, 목록별로 저장) =====
let listSort={};
const LS_KEYS=[['no','오더번호'],['client','거래처'],['date','발주일']];
function lsLoad(r){listSort=(r&&r.listSort&&typeof r.listSort==='object')?r.listSort:{}}
function lsPayload(){return {listSort}}
function lsGet(id){const s=listSort[id];return s&&LS_KEYS.some(k=>k[0]===s.k)?{k:s.k,d:s.d===-1?-1:1}:{k:'no',d:1}}
function lsSet(id,k,d){listSort[id]={k,d};save();render()}
const lsCmp=(a,b)=>String(a).localeCompare(String(b),'ko',{numeric:true,sensitivity:'base'});
// get: {no,client,date} 값을 돌려주는 함수
function lsSort(id,arr,get){const s=lsGet(id),ord=[s.k,...['no','client','date'].filter(k=>k!==s.k)];
 return arr.slice().sort((x,y)=>{const a=get(x),b=get(y);for(let i=0;i<ord.length;i++){const k=ord[i],d=i===0?s.d:1,va=a[k]||'',vb=b[k]||'';
  if(!va&&!vb)continue;if(!va)return 1;if(!vb)return -1;const c=lsCmp(va,vb)*d;if(c)return c}return 0})}
function lsBar(id,dateLbl){const el=document.getElementById('srt_'+id);if(!el)return;const s=lsGet(id),v=s.k+':'+s.d;
 const h=LS_KEYS.flatMap(([k,l])=>[1,-1].map(d=>`<option value="${k}:${d}">정렬: ${k==='date'&&dateLbl?dateLbl:l} ${d===1?'↑':'↓'}</option>`)).join('');
 if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}el.value=v}
function lsPick(id,v){const [k,d]=v.split(':');lsSet(id,k,+d)}
