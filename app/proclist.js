// ===== 가공 공정 목록 (공정 입력칸 자동 목록) =====
// 저장 데이터(procList)에 보관 → 백업·동기화·실행 취소에 함께 포함. 처음 보는 공정은 저장 후 목록에 추가할지 물어봄.
// 거절한 이름(procDeclined)은 다시 묻지 않음 — 설정 › 공정 목록에서 되살리기.
const PL_DEF=['생지','염색','FR PU','FR LAMI','코팅','라미네이팅','봉제'];
let procList=PL_DEF.slice(),procDeclined=[];
const plKey=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
const plClean=a=>{const seen=new Set(),out=[];(Array.isArray(a)?a:[]).forEach(x=>{const v=String(x==null?'':x).trim().replace(/\s+/g,' ');const k=plKey(v);if(v&&!seen.has(k)){seen.add(k);out.push(v)}});return out};
function plLoad(r){const o=r&&!Array.isArray(r)?r:{};procList=Array.isArray(o.procList)?plClean(o.procList):PL_DEF.slice();procDeclined=plClean(o.procDeclined);plDatalist()}
function plPayload(){return {procList:procList.slice(),procDeclined:procDeclined.slice()}}
function plDatalist(){const d=document.getElementById('procs');if(d)d.innerHTML=procList.map(n=>`<option value="${esc(n)}"></option>`).join('')}
const plHas=(l,n)=>l.some(x=>plKey(x)===plKey(n));
// 목록에도, 거절 목록에도 없는 이름만
function plNew(names){const seen=new Set();return (names||[]).map(n=>String(n||'').trim().replace(/\s+/g,' ')).filter(n=>{const k=plKey(n);if(!n||seen.has(k)||plHas(procList,n)||plHas(procDeclined,n))return false;seen.add(k);return true})}
let plQ=Promise.resolve();
function plAsk(names){const l=plNew(names);if(!l.length)return Promise.resolve([]);
 const run=()=>new Promise(res=>{const L=plNew(l);if(!L.length)return res([]);const prev=document.activeElement;
  const d=document.createElement('dialog');d.className='uidlg pldlg';
  d.innerHTML=`<div class="db">${L.length===1?`새 공정 '<b>${esc(L[0])}</b>'을(를) 공정 목록에 추가할까요?`:`새 공정 ${L.length}개를 공정 목록에 추가할까요?<div class="plck">${L.map((n,i)=>`<label><input type="checkbox" data-i="${i}" checked> ${esc(n)}</label>`).join('')}</div>`}</div><div class="df"><button class="p" data-v="1">추가</button><button data-v="0">취소</button></div>`;
  let done=false;const fin=ok=>{if(done)return;done=true;const pick=ok?(L.length===1?L.slice():L.filter((_,i)=>d.querySelector(`input[data-i="${i}"]`).checked)):[];
   try{d.close()}catch(e){}d.remove();if(prev&&prev.isConnected&&prev!==document.body)try{prev.focus({preventScroll:true})}catch(e){}
   const no=L.filter(n=>!pick.includes(n));pick.forEach(n=>{if(!plHas(procList,n))procList.push(n)});no.forEach(n=>{if(!plHas(procDeclined,n))procDeclined.push(n)});
   if(pick.length||no.length){plDatalist();save();if(page==='settings')plSettings()}
   if(pick.length)toast(`공정 목록에 추가했어요: ${pick.join(', ')}`);res(pick)};
  d.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)fin(b.dataset.v==='1')});
  d.addEventListener('cancel',e=>{e.preventDefault();fin(false)});
  d.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&!(e.target.type==='checkbox')){e.preventDefault();e.stopPropagation();const b=e.target.closest&&e.target.closest('button[data-v]');fin(b?b.dataset.v==='1':true)}});
  document.body.appendChild(d);d.showModal();setTimeout(()=>{const b=d.querySelector('button.p');if(b)b.focus()},0)});
 const p=plQ.then(run,run);plQ=p.catch(()=>{});return p}
// ---- 설정 › 공정 목록 ----
function plSettings(){const el=$('pl_card');if(!el)return;
 el.innerHTML=`<h2>공정 목록</h2><div class="pllist">${procList.map((n,i)=>`<div class="plrow"><span class="n">${i+1}</span><span class="nm">${esc(n)}</span><button onclick="plMv(${i},-1)" ${i?'':'disabled'}>▲</button><button onclick="plMv(${i},1)" ${i<procList.length-1?'':'disabled'}>▼</button><button onclick="plDel(${i})">✕</button></div>`).join('')||'<p class="muted">공정이 없습니다.</p>'}</div>
 <div class="rqbar" style="margin-top:8px"><input id="pl_in" placeholder="공정" style="width:200px" onkeydown="if(event.key==='Enter'&&!event.isComposing)plAdd()"><button class="p" onclick="plAdd()">추가</button><span style="flex:1"></span><button onclick="plReset()">기본값으로</button></div>
 ${procDeclined.length?`<h3 style="margin:14px 0 6px;font-size:13px">추가 안 함</h3><div class="pldec">${procDeclined.map((n,i)=>`<span class="pldc">${esc(n)} <button title="목록에 추가" onclick="plRestore(${i},true)">추가</button><button title="다시 묻기" onclick="plRestore(${i},false)">✕</button></span>`).join('')}</div><div class="rqbar" style="margin-top:6px"><button onclick="plClearDec()">모두 다시 묻기</button></div>`:''}`}
function plSave(){plDatalist();save();plSettings()}
function plAdd(){const i=$('pl_in'),v=String(i.value||'').trim().replace(/\s+/g,' ');if(!v)return;if(plHas(procList,v)){toast('이미 있는 공정이에요');return}
 procList.push(v);procDeclined=procDeclined.filter(x=>plKey(x)!==plKey(v));plSave();const n=$('pl_in');if(n)n.focus()}
function plMv(i,k){const j=i+k;if(j<0||j>=procList.length)return;[procList[i],procList[j]]=[procList[j],procList[i]];plSave()}
function plDel(i){procList.splice(i,1);plSave()}
function plRestore(i,add){const n=procDeclined[i];if(n==null)return;procDeclined.splice(i,1);if(add&&!plHas(procList,n))procList.push(n);plSave()}
async function plClearDec(){if(!await uiConfirm('추가 안 함으로 둔 공정을 모두 지울까요?\n다음에 입력하면 다시 물어봐요.'))return;procDeclined=[];plSave()}
async function plReset(){if(!await uiConfirm('공정 목록을 기본값으로 되돌릴까요?'))return;procList=PL_DEF.slice();plSave()}
