// ===== 생산 관리 오더 상세: 가공료 (공정별 소계 수량 × 단가, VAT 별도) =====
// 단가는 '단가 관리'에서 자동으로 찾음:
//  ① 단가 항목의 '오더번호'(여러 개는 쉼표로)에 이 오더번호가 있는 행 — 여러 행이면 오더 색상·아이템명이 맞는 행
//  ② 없으면 ITEM = 오더 아이템명(또는 품목)인 행으로 추정 ('추정' 표시 — 단가 관리에 오더번호를 넣으면 정확)
// 공정 → 단가 칸: '생지' 공정은 생지 칸(USD면 환율로 원화). 나머지 공정은 ⓐ 가공 업체 이름이 같은 칸(생지·염색·가공1·가공2)
//  ⓑ 공정명이 가공내역과 같거나 '염색'이 들어가면 염색 칸 ⓒ 둘 다 아니면 공정 순서대로 다음 칸(염색 → 가공1 → 가공2, 업체·가격이 있는 칸만)
// 직접 넣은 단가는 오더에 저장(o.fee[공정 id])되어 자동 단가보다 우선 ('수동' 표시). 비우거나 자동과 같게 하면 자동으로 돌아감. Ctrl+Z로 되돌릴 수 있음
const pfN=s=>String(s||'').replace(/\(주\)|㈜|주식회사|\s/g,'').toLowerCase();
const pfOno=s=>String(s||'').toUpperCase().replace(/\s/g,'');
const prOnos=p=>String(p&&p.ono||'').split(/[,;/·\n]+/).map(pfOno).filter(Boolean);
// 오더번호 → 단가 행 목록 (단가 데이터가 바뀌면 다시 만듦)
let pfIdx=null,pfIdxV=-1;
function pfIndex(){if(pfIdx&&pfIdxV===dataVer)return pfIdx;const m=new Map();prices.forEach(p=>prOnos(p).forEach(k=>{const a=m.get(k);if(a)a.push(p);else m.set(k,[p])}));pfIdx=m;pfIdxV=dataVer;return m}
function pfMatch(o){const cols=new Set(o.lines.map(l=>pfN(l.color)).filter(Boolean)),it=[pfN(o.fabric),pfN(o.item)].filter(Boolean);
 const score=p=>(cols.has(pfN(p.color))?2:0)+(it.includes(pfN(p.item))?1:0);
 const best=L=>L.map((p,i)=>[p,score(p),i]).sort((a,b)=>b[1]-a[1]||a[2]-b[2])[0][0];
 const A=pfIndex().get(pfOno(o.no));if(A&&A.length)return {p:best(A),how:'ono',n:A.length};
 if(!it.length)return null;const B=prices.filter(p=>p.item&&it.includes(pfN(p.item)));if(B.length)return {p:best(B),how:'item',n:B.length};return null}
const PF_SL=[['g','생지','gV',''],['d','염색','dV',''],['p1','가공1','p1V','p1D'],['p2','가공2','p2V','p2D']];
function pfSlots(p){return PF_SL.map(([k,l,vk,dk])=>({k,l,v:p[vk]||'',desc:dk?p[dk]||'':'',price:k==='g'?(p.gCur==='USD'?p.g*(prSet.fx||0):p.g):p[k]}))}
function pfRows(o){const M=pfMatch(o),S=M?pfSlots(M.p):[],used=new Set();let last=0;
 const take=(s,how)=>{used.add(s.k);last=Math.max(last,PF_SL.findIndex(x=>x[0]===s.k));return {slot:s,how}};
 const auto=p=>{if(!S.length)return null;const free=S.filter(s=>!used.has(s.k)),vn=pfN(p.vendor),pn=pfN(p.name);
  if(isRaw(p)){const g=free.find(s=>s.k==='g');return g?take(g,'공정명'):null}
  if(vn){const s=free.find(s=>{const x=pfN(s.v);return x&&(x===vn||(x.length>=2&&vn.length>=2&&(x.includes(vn)||vn.includes(x))))});if(s)return take(s,'업체')}
  if(pn){const s=free.find(s=>s.k!=='g'&&((s.desc&&(pfN(s.desc)===pn||pfN(s.desc).includes(pn)||pn.includes(pfN(s.desc))))||(s.k==='d'&&/염색|dye/i.test(p.name))));if(s)return take(s,'공정명')}
  const s=free.find(s=>s.k!=='g'&&PF_SL.findIndex(x=>x[0]===s.k)>last&&(s.v||+s.price));return s?take(s,'순서'):null};
 const R=o.procs.map(p=>{const a=auto(p),ap=a&&+a.slot.price?+a.slot.price:null,mv=o.fee&&o.fee[p.id],man=mv!=null&&isFinite(+mv)?+mv:null,price=man!=null?man:ap,qty=sum(p);
  return {p,qty,a,ap,man,price,amt:price!=null?Math.round(qty*price):null}});
 return {M,R,tot:R.reduce((s,r)=>s+(r.amt||0),0),any:R.some(r=>r.amt!=null)}}
const pfP=v=>{if(v==null)return '';const r=Math.round(v*100)/100;return r.toLocaleString('ko-KR',{maximumFractionDigits:2})};
function feeCard(o){const F=pfRows(o),M=F.M,u=esc(o.unit||'YD');
  const src=M?(M.how==='ono'?`단가 관리 · 오더번호 일치${M.n>1?` (${M.n}건 중 색상·아이템명이 맞는 행)`:''}: ${prLabel(M.p)}`:`추정: 단가 관리에 이 오더번호가 없어 ITEM이 같은 행으로 찾음 (${prLabel(M.p)}) — 단가 관리 항목에 오더번호를 넣으면 정확해요`)
  :`단가 관리에서 오더번호 ${o.no}를 찾지 못했어요 — 단가를 직접 넣거나 단가 관리 항목에 오더번호를 넣으세요`;
 const btn=M?`<button style="float:right" onclick="prOpen('${M.p.id}')" title="${esc(src)}">단가 열기</button>`:`<button style="float:right" onclick="pfNewPrice('${o.id}')" title="${esc(src)} · 이 오더번호로 단가 관리에 새 단가 추가">+ 단가 연결</button>`;
 const row=r=>{const p=r.p,ttl=r.man!=null?`직접 넣은 단가${r.ap!=null?` (자동 ${pfP(r.ap)}원)`:''} — 비우면 자동`:r.a&&r.ap!=null?`단가 관리 ${r.a.slot.l} 칸${r.a.slot.v?' · '+r.a.slot.v:''} (${r.a.how} 기준)`:'단가 없음 — 직접 입력';
  const est=r.man==null&&r.ap!=null&&M&&M.how==='item';
  return `<tr><td${p.vendor?` title="${esc(p.vendor)}"`:''}>${esc(p.name)||'(공정명 없음)'}</td><td class="n">${num(r.qty)}</td>
  <td class="n pfc" title="${esc(ttl)}">${r.man!=null?'<small class="pfm">수동</small>':est?`<small class="pfm" title="${esc(src)}">추정</small>`:''}<input class="pfi${r.man!=null?' man':''}" data-pf="${p.id}" inputmode="decimal" value="${r.price!=null?pfP(r.price):''}" placeholder="-" onchange="pfSet('${o.id}','${p.id}',this.value)" onkeydown="if(event.key==='Enter'&&!event.isComposing)this.blur()"></td>
  <td class="n">${r.amt!=null?prW(r.amt):'<span class="muted">-</span>'}</td></tr>`};
 return `<div class="card pfcard"><h2>가공료 <small class="muted" style="font-weight:normal;font-size:12px">VAT 별도</small>${btn}</h2>${o.procs.length?`<table class="pft"><colgroup><col><col style="width:110px"><col style="width:130px"><col style="width:120px"></colgroup><thead><tr><th>공정</th><th class="n">수량(${u})</th><th class="n">단가</th><th class="n">금액</th></tr></thead><tbody>${F.R.map(row).join('')}</tbody>
 <tfoot><tr><td><b>합계</b></td><td></td><td></td><td class="n"><b>${F.any?prW(F.tot):'-'}</b></td></tr></tfoot></table>`:'<p class="muted">가공 공정이 없습니다.</p>'}</div>`}
function pfSet(oid,pid,v){const o=orders.find(x=>x.id===oid);if(!o)return;const n=prNum(v),F=pfRows(o),r=F.R.find(x=>x.p.id===pid);if(!r)return;
 if(String(v).trim()&&n==null){toast('숫자를 넣으세요');render();return}
 const fee={...(o.fee||{})};if(n==null||(r.ap!=null&&Math.abs(n-r.ap)<1e-9))delete fee[pid];else fee[pid]=n;
 if(JSON.stringify(fee)===JSON.stringify(o.fee||{})){render();return}if(Object.keys(fee).length)o.fee=fee;else delete o.fee;touch(o)}
function pfNewPrice(oid){const o=orders.find(x=>x.id===oid);if(!o)return;const P=o.procs,raw=P.find(isRaw),rest=P.filter(p=>!isRaw(p));
 prOpen(null,{ono:o.no,cat:o.item,item:o.fabric||o.item,color:(o.lines[0]||{}).color||'',gV:raw?raw.vendor:'',dV:rest[0]?rest[0].vendor:'',p1V:rest[1]?rest[1].vendor:'',p1D:rest[1]?rest[1].name:'',p2V:rest[2]?rest[2].vendor:'',p2D:rest[2]?rest[2].name:''})}
// 조회용 파일(스냅샷)에 넣을 가공료
function pfSnap(o){if(!o.procs.length)return null;const F=pfRows(o);return {source:F.M?(F.M.how==='ono'?'orderNo':'itemGuess'):null,priceItem:F.M?prLabel(F.M.p):'',
 rows:F.R.map(r=>({process:r.p.name,vendor:r.p.vendor,qty:r.qty,unitPrice:r.price,manual:r.man!=null,amount:r.amt})),total:F.any?F.tot:null}}
(function(){const st=document.createElement('style');st.textContent=`.ofg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}.ofg table{min-width:0}
.pft td.n,.pft th.n{text-align:right;white-space:nowrap}.pft td.pfc{padding-top:3px;padding-bottom:3px}.pft tfoot td{border-bottom:none}
input.pfi{width:96px;height:23px;box-sizing:border-box;padding:1px 6px;text-align:right;font-size:inherit;border:1px solid #dcdcde;border-radius:4px;background:#fff}input.pfi.man{border-color:#e0a800;background:#fffbea}
.pfm{display:inline-block;font-size:10px;color:#b45309;background:#fff3cd;border-radius:6px;padding:0 4px;margin-right:4px;vertical-align:middle}
.pfnote{font-size:11px;margin-top:6px;color:#646970}.pfest{color:#b45309}
@media (max-width:1100px){.ofg{grid-template-columns:minmax(0,1fr)}}`;document.head.appendChild(st)})();
