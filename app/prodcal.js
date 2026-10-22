// ===== 체크리스트 달력 ← 생산 관리 일정 (납기·출고, 읽기 전용) =====
let pchk={};
const CT_KEY='ijo.calToggles';
let calTg=(()=>{try{return {cl:true,due:true,ship:true,...JSON.parse(localStorage.getItem(CT_KEY)||'{}')}}catch(e){return {cl:true,due:true,ship:true}}})();
function toggleCal(k){calTg[k]=!calTg[k];try{localStorage.setItem(CT_KEY,JSON.stringify(calTg))}catch(e){}render()}
function calToggleHTML(){return [['cl','체크리스트'],['due','납기'],['ship','출고']].map(([k,l])=>`<button class="tgl${calTg[k]?' on':''}" onclick="toggleCal('${k}')">${l}</button>`).join('')}
const pcLoad=r=>{const o=r&&!Array.isArray(r)?r.prodChecks:null;pchk=o&&typeof o==='object'&&!Array.isArray(o)?{...o}:{}};
const pcPayload=()=>({prodChecks:pchk});
function pcImport(raw){if(raw&&!Array.isArray(raw)&&raw.prodChecks&&typeof raw.prodChecks==='object')pchk={...raw.prodChecks}}
const shortItem=s=>String(s||'').trim().split(/\s+/)[0]||'';
// 출고: 같은 날·같은 공정의 출고 행은 하나로 합산
function prodEvents(){const ev=[];orders.forEach(o=>{
 if(o.due){const c=(o.lines[0]||{}).color||'';ev.push({key:`${o.id}|due|${o.due}`,type:'due',date:o.due,orderId:o.id,no:o.no,text:`납기 · ${o.no} ${shortItem(o.item)}${c?' '+c:''}${o.lines.filter(l=>l.color).length>1?' 외':''}`})}
 o.procs.forEach((p,i)=>{const by={};p.ships.forEach(s=>{if(s.date)by[s.date]=(by[s.date]||0)+(+s.qty||0)});
  Object.entries(by).forEach(([d,q])=>ev.push({key:`${o.id}|ship|${d}|${p.id}`,type:'ship',date:d,orderId:o.id,no:o.no,color:pcol(i),text:`출고 · ${p.name||'공정'} ${num(q)}${o.unit}`}))})});
 return ev.sort((a,b)=>(a.type===b.type?0:a.type==='due'?-1:1)||a.no.localeCompare(b.no))}
function prodChip(e){const done=pchk[e.key];return `<span class="chip pchip${done?' dn':''}" style="${e.type==='ship'?`border-color:${e.color};color:${e.color}`:''}" title="${esc(e.no+' · '+e.text)}" onclick="event.stopPropagation();openProd('${e.orderId}')">${e.type==='due'?'<i class="rdot"></i>':''}${esc(e.text)}</span>`}
function prodChipsFor(ds,ev){return ev.filter(e=>e.date===ds&&calTg[e.type]).map(prodChip).join('')}
function openProd(id){go('prod');openDetail(id)}
function togglePchk(k){if(pchk[k])delete pchk[k];else pchk[k]=now();save();render()}
function prodDayHTML(ds){const l=prodEvents().filter(e=>e.date===ds&&calTg[e.type]);if(!l.length)return '';
 return `<li class="sec">생산 일정 (${l.length})</li>`+l.map(e=>`<li class="${pchk[e.key]?'dn':''}"><input type="checkbox" ${pchk[e.key]?'checked':''} onchange="togglePchk('${e.key}')" title="확인"><div class="t" onclick="openProd('${e.orderId}')">${e.type==='due'?'<span class="pr" style="background:#c53030">납기</span>':`<span class="pr" style="background:${e.color}">출고</span>`}<b>${esc(e.type==='due'?e.text.replace(/^납기 · /,''):e.text.replace(/^출고 · /,''))}</b><br><small>오더 ${esc(e.no)}${e.type==='ship'?' · '+esc((orders.find(o=>o.id===e.orderId)||{}).item||''):''} · 눌러서 오더 보기</small></div></li>`).join('')}
function dueOrders(){return orders.filter(o=>!o.delivered).sort((a,b)=>(!a.due)-(!b.due)||(a.due||'').localeCompare(b.due||'')||String(a.no).localeCompare(String(b.no)))}
function dueHTML(){const l=dueOrders();if(!l.length)return '<li>미완료 오더가 없습니다.</li>';
 return l.map(o=>{const n=o.due?dday(o.due):null,g=progress(o),c=o.lines.filter(x=>x.color);return `<li onclick="openProd('${o.id}')">${n==null?'<span class="badge">납기 미정</span>':`<span class="badge ${n===0?'hot':n>0&&n<=3?'warm':''}">${ddLabel(n)}</span>`}<b>${esc(o.no)}</b> ${tag(o)}${esc(o.item)}<br><small>납기 ${esc(o.due||'-')} · ${esc(c.length?c[0].color+(c.length>1?' 외 '+(c.length-1):''):'-')} · 진행 ${g.rate.toFixed(1)}%</small><div class="bar" style="margin-top:4px"><i class="${g.rate>=100?'full':''}" style="width:${Math.min(100,g.rate)}%"></i></div></li>`}).join('')}
