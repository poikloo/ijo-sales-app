// ===== 거래명세서 / 거래처 / 공급자 정보 =====
let stmts=[],custs=[],sups=[],supDef='',stTab='list',stEd=null,stQ='';
const MIN_LOTS=14;
const DEF_NOTICE='본제품 인수 후 재단 또는 다른 가공을 했을 경우에는 반품이나 변제는 할 수 없음.\n반드시 LOT별 구분하여 작업할 것.';
const P_FIELDS=[['reg','등록번호'],['name','상호'],['ceo','성명'],['addr','사업장주소'],['biz','업태'],['type','종목']];
const F_ORDER=['name','reg','ceo','','addr','biz','type'];
const pForm=(pre,x,req)=>F_ORDER.map(k=>{if(!k)return '<label></label>';const l=P_FIELDS.find(f=>f[0]===k)[1];return `<label class="${k==='addr'?'w':''}">${l}${req&&k==='name'?' *':''}<input id="${pre}${k}" value="${esc(x[k])}"></label>`}).join('');
const sid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const party=p=>{const o={};P_FIELDS.forEach(([k])=>o[k]=String(p&&p[k]||''));return o};
const emptyLot=(color='')=>({id:sid(),lotNo:'',color,rolls:Array(20).fill('')});
const lotCnt=l=>l.rolls.filter(v=>v!==''&&v!=null).length,lotSum=l=>l.rolls.reduce((a,v)=>a+(+v||0),0);
const stTot=s=>({c:s.lots.reduce((a,l)=>a+lotCnt(l),0),q:Math.round(s.lots.reduce((a,l)=>a+lotSum(l),0)*100)/100});
const stAmt=s=>{const q=stTot(s).q;return s.price&&q?Math.round(q*s.price):0};
const fnum=v=>v===''||v==null?'':(+v).toLocaleString('ko-KR',{maximumFractionDigits:2});
function normLot(l){const r=Array.isArray(l&&l.rolls)?l.rolls.slice(0,20):[];while(r.length<20)r.push('');return {id:String(l&&l.id||sid()),lotNo:String(l&&l.lotNo||''),color:String(l&&l.color||''),rolls:r.map(v=>v===''||v==null||isNaN(+v)?'':+v)}}
function normStmt(s){return {id:String(s.id||sid()),example:!!s.example,no:+s.no||1,date:s.date||'',orderId:s.orderId||'',orderNo:s.orderNo||'',item:s.item||'',spec:s.spec||'',customerId:s.customerId||'',cust:party(s.cust),
 dest:s.dest||'',contact:s.contact||'',price:s.price===''||s.price==null?'':+s.price||'',note:s.note||'',lots:(Array.isArray(s.lots)?s.lots:[]).map(normLot),linkShip:!!s.linkShip,shipId:s.shipId||'',supplierId:String(s.supplierId||''),sup:s.sup?normSup(s.sup):null,updated:s.updated||''}}
const supHas=x=>x&&(P_FIELDS.some(([k])=>String(x[k]||'').trim())||String(x.contacts||'').trim()||(x.notice!=null&&String(x.notice)!==DEF_NOTICE));
const normSupRec=x=>({id:String(x&&x.id||sid()),...normSup(x)});
const defSup=()=>sups.find(x=>x.id===supDef)||sups[0]||null;
const supSnap=x=>x?normSup(x):null;
function supOf(s){return s.sup||supSnap(sups.find(x=>x.id===s.supplierId))||supSnap(defSup())||normSup({})}
function supMigrate(o){if(Array.isArray(o.suppliers)){sups=o.suppliers.map(normSupRec);supDef=sups.some(x=>x.id===o.supplierDefault)?o.supplierDefault:(sups[0]?sups[0].id:'');return false}
 if(supHas(o.supplier)){const x=normSupRec(o.supplier);sups=[x];supDef=x.id}else{sups=[];supDef=''}return true}
function stAssignSup(){const d=defSup();let ch=false;if(d)stmts.forEach(s=>{if(!s.sup){s.supplierId=d.id;s.sup=supSnap(d);ch=true}});return ch}
function normCust(c){return {id:String(c.id||sid()),example:!!c.example,...party(c),dest:c.dest||'',contact:c.contact||'',memo:c.memo||''}}
function normSup(s){s=s&&typeof s==='object'?s:{};return {...party(s),contacts:String(s.contacts||''),notice:s.notice==null?DEF_NOTICE:String(s.notice)}}
function exStmt(){const c={id:'xc1',example:true,reg:'000-00-00000',name:'예시거래처',ceo:'홍길동',addr:'(예시) 주소',biz:'제조',type:'섬유',dest:'(예시) 납품 창고',contact:'(예시) 담당자',memo:'예시 데이터입니다.'};
 const r1=[55,54,56,55,53,57,55,54,56,55,54,55,56,53,55,54,57,55,56,54],r2=[54,56,55,53,55,57,54,55,56,55,54,53];
 return {c,s:{id:'xs1',example:true,no:1,date:'2025-11-03',orderId:'xo1',orderNo:'2509-0328',item:'지휘소용 다기능천막 외피',spec:'',customerId:'xc1',cust:party(c),dest:c.dest,contact:c.contact,price:'',note:'예시',
  lots:[normLot({lotNo:'A-2510-01',color:'진국방',rolls:r1}),normLot({lotNo:'A-2510-02',color:'진국방',rolls:r2})],linkShip:false,shipId:'',updated:now()}}}
function stLoad(r){const o=r&&!Array.isArray(r)?r:{};
 const mig=supMigrate(o);custs=Array.isArray(o.customers)?o.customers.map(normCust):[];stmts=Array.isArray(o.statements)?o.statements.map(normStmt):[];
 if(!Array.isArray(o.statements)){if(!r||(Array.isArray(r.bids)&&r.bids.some(x=>x.example))||(Array.isArray(r.orders)&&r.orders.some(x=>x.example))){const e=exStmt();custs.push(normCust(e.c));stmts.push(normStmt(e.s))}setTimeout(save,0)}
 if(stAssignSup()||mig)setTimeout(save,0)}
const stPayload=()=>({statements:stmts,customers:custs,suppliers:sups,supplierDefault:supDef,supplier:normSup(defSup()||{})});
function stImport(raw){if(!raw||Array.isArray(raw))return;if(Array.isArray(raw.statements))stmts=raw.statements.map(normStmt);if(Array.isArray(raw.customers))custs=raw.customers.map(normCust);if(Array.isArray(raw.suppliers)||raw.supplier)supMigrate(raw);stAssignSup();stEd=null}
const stExCount=()=>stmts.filter(x=>x.example).length+custs.filter(x=>x.example).length;
function stDelExamples(){stmts.filter(x=>x.example).forEach(unlinkShip);stmts=stmts.filter(x=>!x.example);custs=custs.filter(x=>!x.example);if(stEd&&stEd.example)stEd=null}
// ---- 생산 관리 출고 연동 ----
function findShip(id){for(const o of orders)for(const p of o.procs){const i=p.ships.findIndex(x=>x.id===id);if(i>=0)return {o,p,i}}return null}
function unlinkShip(s){if(!s.shipId)return;const f=findShip(s.shipId);if(f){f.p.ships.splice(f.i,1);f.o.updated=now()}}
function linkShip(s){unlinkShip(s);if(!s.linkShip||!s.orderId){s.shipId='';return}const o=orders.find(x=>x.id===s.orderId);if(!o||!o.procs.length){s.shipId='';return}
 const p=o.procs[o.procs.length-1];s.shipId=s.shipId||sid();p.ships.push({id:s.shipId,date:s.date,qty:stTot(s).q,memo:`명세서 NO.${s.no}`,stmtId:s.id});p.ships.sort((a,b)=>(a.date||'').localeCompare(b.date||''));o.updated=now()}
function stmtsForOrder(o){const l=stmts.filter(s=>s.orderId===o.id).sort((a,b)=>b.no-a.no);
 return `<div class="card"><h2>발행한 거래명세서 <button style="float:right" onclick="newStmt('${o.id}')">+ 이 오더로 명세서 작성</button></h2>${l.length?`<table><thead><tr><th>NO.</th><th>날짜</th><th>공급받는자</th><th style="text-align:right">절</th><th style="text-align:right">수량(YD)</th><th>출고 반영</th></tr></thead><tbody>${l.map(s=>{const t=stTot(s);return `<tr class="r" onclick="go('stmt');editStmt('${s.id}')"><td>${s.no}</td><td>${esc(s.date)}</td><td>${tag(s)}${esc(s.cust.name)}</td><td style="text-align:right">${t.c}</td><td style="text-align:right">${fnum(t.q)}</td><td>${s.linkShip&&s.shipId?'✓':'-'}</td></tr>`}).join('')}</tbody></table>`:'<p class="muted">아직 발행한 거래명세서가 없습니다.</p>'}</div>`}
// ---- 목록 / 탭 ----
function stSetTab(t){stTab=t;stEd=null;render()}
function renderStmt(){document.querySelectorAll('#p_stmt .tab').forEach(e=>e.classList.toggle('on',e.dataset.t===stTab));
 $('st_tabs').style.display=stEd?'none':'';$('st_list').style.display=!stEd&&stTab==='list'?'':'none';$('st_cust').style.display=!stEd&&stTab==='cust'?'':'none';$('st_edit').style.display=stEd?'':'none';
 $('ptitle').textContent=stEd?`거래명세서 › ${stEd._new?'새 명세서':'NO.'+stEd.no}`:'거래명세서';
 if(stEd)return;
 if(stTab==='list'){const k=$('sk').value.trim().toLowerCase(),cv=$('scu').value,cs=[...new Set(stmts.map(s=>s.cust.name).filter(Boolean))];
  $('scu').innerHTML='<option value="">전체 공급받는자</option>'+cs.map(c=>`<option>${esc(c)}</option>`).join('');$('scu').value=cs.includes(cv)?cv:'';
  const sv=$('ssu').value,sn=[...new Set(stmts.map(x=>supOf(x).name).filter(Boolean))];$('ssu').innerHTML='<option value="">전체 공급자</option>'+sn.map(c=>`<option>${esc(c)}</option>`).join('');$('ssu').value=sn.includes(sv)?sv:'';$('ssu').style.display=sn.length>1?'':'none';
  const l=stmts.filter(s=>(!$('ssu').value||supOf(s).name===$('ssu').value)&&(!$('scu').value||s.cust.name===$('scu').value)&&(!k||[s.no,s.orderNo,s.item,s.spec,s.cust.name,s.dest,s.note,...s.lots.map(x=>x.lotNo)].join(' ').toLowerCase().includes(k))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.no-a.no);
  $('stb').innerHTML=l.length?l.map(s=>{const t=stTot(s),a=stAmt(s);return `<tr class="r" onclick="editStmt('${s.id}')"><td><b>${s.no}</b></td><td>${esc(s.date)}</td><td>${esc(supOf(s).name)}</td><td>${tag(s)}${esc(s.cust.name)}</td><td>${esc(s.orderNo)}</td><td>${esc(s.item)}${s.spec?' '+esc(s.spec):''}</td><td style="text-align:right">${t.c}</td><td style="text-align:right">${fnum(t.q)}</td><td style="text-align:right">${a?a.toLocaleString('ko-KR'):''}</td>
   <td style="white-space:nowrap" onclick="event.stopPropagation()"><button onclick="dupStmt('${s.id}')">복제</button> <button class="d" onclick="delStmt('${s.id}')">삭제</button></td></tr>`}).join(''):'<tr><td colspan="10">거래명세서가 없습니다. [+ 새 명세서]로 작성하세요.</td></tr>'}
 if(stTab==='cust'){const k=$('ck').value.trim().toLowerCase(),l=custs.filter(c=>!k||[c.name,c.reg,c.ceo,c.addr,c.dest,c.contact,c.memo].join(' ').toLowerCase().includes(k)).sort((a,b)=>a.name.localeCompare(b.name));
  const miss=[...new Set(orders.map(o=>o.client).filter(n=>n&&!custs.some(c=>c.name===n)))];
  $('cmiss').innerHTML=miss.length?`생산 관리에 있지만 거래처로 등록되지 않은 이름: ${miss.map(n=>`<button onclick="openCust('',${esc(JSON.stringify(n))})">+ ${esc(n)}</button>`).join(' ')}`:'';
  $('ctb').innerHTML=l.length?l.map(c=>`<tr class="r" onclick="openCust('${c.id}')"><td>${tag(c)}<b>${esc(c.name)}</b></td><td>${esc(c.reg)}</td><td>${esc(c.ceo)}</td><td>${esc(c.addr)}</td><td>${esc(c.biz)} / ${esc(c.type)}</td><td>${esc(c.dest)}</td><td>${esc(c.contact)}</td></tr>`).join(''):'<tr><td colspan="7">등록된 거래처가 없습니다.</td></tr>'}}
// ---- 거래처 ----
function openCust(id,name){const c=id?custs.find(x=>x.id===id):normCust({name:name||''});if(!c)return;$('dt').textContent=id?'거래처 수정':'거래처 등록';
 $('dbody').innerHTML=`<div class="g">${pForm('cu_',c,true)}
 <label>기본 납품처<input id="cu_dest" value="${esc(c.dest)}"></label><label>기본 담당자<input id="cu_contact" value="${esc(c.contact)}"></label><label class="w">메모<textarea id="cu_memo" rows="2">${esc(c.memo)}</textarea></label></div>`;
 $('dfoot').innerHTML=(id?`<button class="d" onclick="delCust('${id}')">삭제</button>`:'')+`<button onclick="dlg.close()">취소</button><button class="p" onclick="saveCust('${id||''}')">저장</button>`;if(!dlg.open)dlg.showModal()}
function saveCust(id){const o={};[...P_FIELDS.map(x=>x[0]),'dest','contact','memo'].forEach(k=>o[k]=$('cu_'+k).value.trim());if(!o.name)return alert('상호를 입력하세요.');
 if(custs.some(c=>c.name===o.name&&c.id!==id)&&!confirm(`'${o.name}' 거래처가 이미 있습니다. 그래도 저장할까요?`))return;
 let c;if(id){c=custs.find(x=>x.id===id);Object.assign(c,o)}else{c=normCust({...o});custs.push(c)}save();dlg.close();
 if(stEd&&(!stEd.cust.name||stEd.cust.name===c.name)){stPick(c.id);renderEditor()}render();toast('거래처를 저장했습니다')}
function delCust(id){if(confirm('이 거래처를 삭제할까요? (이미 발행한 명세서 내용은 그대로 남습니다)')){custs=custs.filter(x=>x.id!==id);save();dlg.close();render()}}
// ---- 편집기 ----
const nextNo=()=>stmts.reduce((a,s)=>Math.max(a,+s.no||0),0)+1;
function newStmt(orderId){stEd=normStmt({no:nextNo(),date:ymd(new Date()),lots:[emptyLot()]});stEd._new=true;stEd.id=sid();{const d=defSup();if(d){stEd.supplierId=d.id;stEd.sup=supSnap(d)}}if(page!=='stmt'){page='';go('stmt')}if(orderId)stPickOrder(orderId);renderEditor();render()}
function editStmt(id){const s=stmts.find(x=>x.id===id);if(!s)return;stEd=JSON.parse(JSON.stringify(s));if(!stEd.lots.length)stEd.lots.push(emptyLot());renderEditor();render();$('content').scrollTop=0}
function dupStmt(id){const s=stmts.find(x=>x.id===id);if(!s)return;stEd=normStmt({...JSON.parse(JSON.stringify(s)),id:sid(),no:nextNo(),date:ymd(new Date()),shipId:'',example:false});stEd._new=true;renderEditor();render();toast('복제본을 편집 중입니다 (저장해야 반영돼요)')}
function delStmt(id){const s=stmts.find(x=>x.id===id);if(!s)return;if(!confirm(`거래명세서 NO.${s.no}을(를) 삭제할까요?${s.shipId?'\n생산 관리에 반영된 출고 내역도 함께 삭제됩니다.':''}`))return;unlinkShip(s);stmts=stmts.filter(x=>x.id!==id);if(stEd&&stEd.id===id)stEd=null;save();render();toast('삭제했습니다')}
function orderLabel(o){return `${o.no} · ${o.item}${o.client?' · '+o.client:''}`}
function stPickOrder(id){const o=orders.find(x=>x.id===id);if(!o)return;const e=stEd;e.orderId=o.id;e.orderNo=o.no;e.item=o.item;e.spec=o.fabric||'';e.linkShip=true;
 e.lots.forEach(l=>{if(!l.color)l.color=(o.lines[0]||{}).color||''});const c=custs.find(x=>x.name===o.client);if(c)stPick(c.id);else if(o.client&&!e.cust.name)e.cust.name=o.client}
function stPick(cid){const c=custs.find(x=>x.id===cid);if(!c)return;stEd.customerId=c.id;stEd.cust=party(c);if(c.dest)stEd.dest=c.dest;if(c.contact)stEd.contact=c.contact}
function stOrderInput(v){const o=orders.find(x=>orderLabel(x)===v||x.no===v);if(o){stPickOrder(o.id);renderEditor()}}
function stCustInput(v){const c=custs.find(x=>x.name===v);if(c){stPick(c.id);renderEditor()}else stEd.cust.name=v}
function stClearOrder(){Object.assign(stEd,{orderId:'',linkShip:false});renderEditor()}
function stF(k,v){stEd[k]=v;if(k==='price')stRecalc()}
function renderEditor(){const e=stEd,o=e.orderId&&orders.find(x=>x.id===e.orderId),missing=e.cust.name&&!custs.some(c=>c.name===e.cust.name);
 const inp=(k,l,attr='')=>`<label>${l}<input value="${esc(e[k])}" oninput="stF('${k}',this.value)" ${attr}></label>`;
 $('st_edit').innerHTML=`<div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button onclick="stCancel()">◀ 목록</button><span style="flex:1"></span>
  <button onclick="stOut('print')">인쇄</button><button onclick="stOut('pdf')">PDF 저장</button><button onclick="stOut('xlsx')">엑셀로 내보내기</button>${e._new?'':`<button onclick="dupStmt('${e.id}')">복제</button><button class="d" onclick="delStmt('${e.id}')">삭제</button>`}<button class="p" onclick="stSave()">저장</button></div></div>
 <div class="dgrid"><div class="card"><h2>기본 정보</h2><div class="g">
  <label>NO.<input type="number" min="1" value="${e.no}" oninput="stF('no',+this.value||1)"></label><label>날짜<input type="date" value="${esc(e.date)}" oninput="stF('date',this.value)"></label>
  <label class="w">공급자<span style="display:flex;gap:6px;align-items:center"><select style="flex:1" onchange="stSupPick(this.value)">${sups.length?'':'<option value="">(설정에서 공급자를 먼저 등록하세요)</option>'}${sups.map(x=>`<option value="${x.id}"${x.id===e.supplierId?' selected':''}>${esc(x.name||'(상호 없음)')}${x.id===supDef?' (기본)':''}</option>`).join('')}${e.supplierId&&!sups.some(x=>x.id===e.supplierId)?`<option value="${esc(e.supplierId)}" selected>${esc(e.sup&&e.sup.name||'')} (삭제된 공급자)</option>`:''}</select>${stSupStale(e)?'<button onclick="stSupRefresh()" title="설정의 최신 공급자 정보로 바꿉니다">최신 정보로 갱신</button>':''}</span>${stSupStale(e)?'<span class="muted">이 명세서는 저장 당시의 공급자 정보로 인쇄됩니다.</span>':''}</label>
  <label class="w">생산 오더에서 불러오기<span style="display:flex;gap:6px"><input list="st_orders" style="flex:1" placeholder="오더번호·품목·거래처 검색 후 선택" value="${o?esc(orderLabel(o)):''}" onchange="stOrderInput(this.value)">${e.orderId?'<button onclick="stClearOrder()">연결 해제</button>':''}</span></label>
  ${inp('orderNo','오더번호')}${inp('price','단가 (원, 비워도 됨)','inputmode="decimal"')}
  <label class="w">품명 및 규격<input value="${esc(e.item)}" oninput="stF('item',this.value)" placeholder="품목"></label><label class="w"><input value="${esc(e.spec)}" oninput="stF('spec',this.value)" placeholder="아이템명 / 규격 (둘째 줄)"></label>
  ${inp('note','비고')}<label></label>${inp('dest','납품처')}${inp('contact','담당자')}
  ${e.orderId?`<label class="w" style="flex-direction:row;align-items:center;gap:6px;font-size:14px;color:#222"><input type="checkbox" ${e.linkShip?'checked':''} onchange="stEd.linkShip=this.checked"> 생산 관리 출고에 반영 <span class="muted">(${o&&o.procs.length?`'${esc(o.procs[o.procs.length-1].name)}' 공정에 출고일·수량 기록`:'공정이 없어 반영할 수 없음'})</span></label>`:''}
 </div></div>
 <div class="card"><h2>공급받는자</h2><div class="g"><label class="w">거래처 선택<input list="st_custs" value="${esc(e.cust.name)}" onchange="stCustInput(this.value)" placeholder="상호 검색"></label>
  ${P_FIELDS.map(([k,l])=>`<label class="${k==='addr'?'w':''}">${l}<input value="${esc(e.cust[k])}" oninput="stEd.cust['${k}']=this.value"></label>`).join('')}</div>
  ${missing?`<p class="warn">'${esc(e.cust.name)}'은(는) 거래처에 등록되어 있지 않습니다. <button onclick="stRegCust()">거래처로 등록</button></p>`:''}</div></div>
 <div class="card"><h2>LOT별 수량 <span class="muted" style="font-weight:normal">— 칸에서 Enter: 다음 칸 · 엑셀에서 여러 칸 복사 후 붙여넣기 가능</span></h2>
  <div class="tw"><table class="lot"><thead><tr><th style="width:120px">LOT NO.</th><th style="width:90px">COLOR</th>${Array.from({length:10},(_,i)=>`<th>${i+1}</th>`).join('')}<th style="width:46px">절</th><th style="width:80px">수량(YD)</th><th style="width:34px"></th></tr></thead>
  <tbody>${e.lots.map((l,k)=>`<tr><td rowspan="2"><input value="${esc(l.lotNo)}" oninput="stEd.lots[${k}].lotNo=this.value"></td><td rowspan="2"><input value="${esc(l.color)}" oninput="stEd.lots[${k}].color=this.value"></td>${[0,1,2,3,4,5,6,7,8,9].map(i=>rc(k,i,l)).join('')}<td rowspan="2" class="num" id="lc${k}"></td><td rowspan="2" class="num" id="lq${k}"></td><td rowspan="2"><button onclick="stDelLot(${k})" title="LOT 삭제">✕</button></td></tr>
   <tr>${[10,11,12,13,14,15,16,17,18,19].map(i=>rc(k,i,l)).join('')}</tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="12" style="text-align:right">합계</td><td class="num" id="tc"></td><td class="num" id="tq"></td><td></td></tr></tfoot></table></div>
  <div style="display:flex;gap:16px;align-items:center;margin-top:8px"><button onclick="stAddLot()">+ LOT 추가</button><span style="flex:1"></span><span>총 절 <b id="tc2"></b></span><span>총 수량 <b id="tq2"></b> YD</span><span>금액 <b id="ta"></b></span></div></div>
 <datalist id="st_orders">${orders.map(x=>`<option value="${esc(orderLabel(x))}">`).join('')}</datalist><datalist id="st_custs">${custs.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>`;stRecalc()}
const rc=(k,i,l)=>`<td class="rcw"><input class="rc" data-k="${k}" data-i="${i}" inputmode="decimal" value="${l.rolls[i]===''?'':l.rolls[i]}" oninput="stCell(this)" onkeydown="stKey(event,this)" onpaste="stPaste(event,this)"></td>`;
function stCell(el){const k=+el.dataset.k,i=+el.dataset.i,v=el.value.replace(/,/g,'').trim();stEd.lots[k].rolls[i]=v===''||isNaN(+v)?'':+v;el.classList.toggle('bad',v!==''&&isNaN(+v));stRecalc()}
function stRecalc(){const e=stEd;if(!e)return;e.lots.forEach((l,k)=>{const c=$('lc'+k),q=$('lq'+k);if(c){c.textContent=lotCnt(l)||'';q.textContent=fnum(lotSum(l)||'')}});
 const t=stTot(e),a=stAmt(e);['tc','tc2'].forEach(x=>$(x)&&($(x).textContent=t.c));['tq','tq2'].forEach(x=>$(x)&&($(x).textContent=fnum(t.q)));if($('ta'))$('ta').textContent=a?a.toLocaleString('ko-KR')+'원':'-'}
function cellAt(k,i){return document.querySelector(`.rc[data-k="${k}"][data-i="${i}"]`)}
function stKey(ev,el){if(ev.key!=='Enter')return;ev.preventDefault();let k=+el.dataset.k,i=+el.dataset.i+(ev.shiftKey?-1:1);if(i>19){k++;i=0}if(i<0){k--;i=19}const n=cellAt(k,i);if(n){n.focus();n.select()}}
function stPaste(ev,el){const t=(ev.clipboardData||window.clipboardData).getData('text');const parts=t.split(/[\s,\t]+/).filter(x=>x!=='');if(parts.length<2)return;ev.preventDefault();
 const k=+el.dataset.k;let i=+el.dataset.i,n=0;for(const p of parts){if(i>19)break;const v=+p;stEd.lots[k].rolls[i]=isNaN(v)?'':v;const c=cellAt(k,i);if(c)c.value=isNaN(v)?'':v;i++;n++}
 stRecalc();if(n<parts.length)toast(`한 LOT는 최대 20절입니다. ${parts.length-n}개 값은 붙여넣지 않았어요.`);else toast(`${n}개 값을 붙여넣었어요`)}
function stAddLot(){const last=stEd.lots[stEd.lots.length-1];const o=stEd.orderId&&orders.find(x=>x.id===stEd.orderId);stEd.lots.push(emptyLot(last&&last.color||o&&(o.lines[0]||{}).color||''));renderEditor();const c=document.querySelectorAll('.lot tbody tr');c[c.length-2].querySelector('input').focus()}
function stDelLot(k){const l=stEd.lots[k];if(lotCnt(l)&&!confirm('이 LOT에 입력된 수량이 있습니다. 삭제할까요?'))return;stEd.lots.splice(k,1);if(!stEd.lots.length)stEd.lots.push(emptyLot());renderEditor()}
function stRegCust(){openCust('',stEd.cust.name);P_FIELDS.forEach(([k])=>{const i=$('cu_'+k);if(i&&!i.value)i.value=stEd.cust[k]});$('cu_dest').value=stEd.dest;$('cu_contact').value=stEd.contact}
function stCancel(){if(confirm('저장하지 않은 변경 내용은 사라집니다. 목록으로 돌아갈까요?')){stEd=null;render()}}
function stClean(e){const s=normStmt(e);s.lots=s.lots.filter(l=>l.lotNo||lotCnt(l));s.updated=now();return s}
function stSave(silent){if(stEd._new){const d=sups.find(x=>x.id===stEd.supplierId);if(d)stEd.sup=supSnap(d)}const s=stClean(stEd);if(stmts.some(x=>x.no===s.no&&x.id!==s.id)&&!confirm(`NO.${s.no} 명세서가 이미 있습니다. 그래도 저장할까요?`))return false;
 const old=stmts.find(x=>x.id===s.id);if(old)s.shipId=old.shipId;linkShip(s);
 const i=stmts.findIndex(x=>x.id===s.id);if(i>=0)stmts[i]=s;else stmts.push(s);save();stEd=JSON.parse(JSON.stringify(s));if(!stEd.lots.length)stEd.lots.push(emptyLot());if(!silent){renderEditor();render();toast('저장했습니다'+(s.shipId?' · 생산 관리 출고에 반영됨':''))}return true}
// ---- 출력 ----
function stmtHTML(s){const S=supOf(s),c=s.cust,t=stTot(s),a=stAmt(s),n=Math.max(window.MINLOTS_TEST||MIN_LOTS,s.lots.length),E=v=>esc(v),N=v=>v===''||v==null?'':fnum(v);
 const pty=(lab,p)=>`<td rowspan="5" class="hd vt">${lab}</td><td class="hd">등록<br>번호</td><td colspan="5" class="b big">${E(p.reg)}</td>`;
 let lots='';for(let k=0;k<n;k++){const l=s.lots[k]||{lotNo:'',color:'',rolls:Array(20).fill('')};
  lots+=`<tr><td rowspan="2">${E(l.lotNo)}</td><td rowspan="2">${E(l.color)}</td>${l.rolls.slice(0,10).map(v=>`<td class="r">${N(v)}</td>`).join('')}<td rowspan="2" class="r">${lotCnt(l)||''}</td><td rowspan="2" class="r">${N(lotSum(l)||'')}</td></tr><tr>${l.rolls.slice(10,20).map(v=>`<td class="r">${N(v)}</td>`).join('')}</tr>`}
 const notice=String(S.notice||'').split(/\r?\n/).filter(Boolean),cts=String(S.contacts||'').split(/\r?\n/).filter(Boolean);
 return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>거래명세서 NO.${s.no}</title><style>
@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","맑은 고딕","Noto Sans CJK KR",sans-serif;font-size:9.5pt;color:#000}
table{border-collapse:collapse;width:99.5%;table-layout:fixed}td{border:1px solid #000;padding:1px 3px;height:18px;text-align:center;vertical-align:middle;overflow:hidden;white-space:nowrap}.wr{white-space:normal;word-break:keep-all}
.nb td{border:none}.hd{background:#f2f2f2;font-weight:bold}.vt{writing-mode:vertical-rl;letter-spacing:6px}.b{font-weight:bold}.big{font-size:11pt}.r{text-align:right}.l{text-align:left}
h1{font-size:20pt;text-decoration:underline;letter-spacing:4px;margin:0}.lt td{height:19px}.ft td{border:none;text-align:left;height:22px}.gap td{border:none;height:6px}.ft td.big2{font-size:13pt;font-weight:normal;height:26px}
</style></head><body><table>
<colgroup>${[8,8,6.6,6.6,6.6,6.6,6.6,6.6,6.6,6.6,6.6,6.6,6,9].map(w=>`<col style="width:${(w/97*100).toFixed(2)}%">`).join('')}</colgroup>
<tr class="nb"><td class="b">NO.</td><td class="l">${s.no}</td><td colspan="12"></td></tr>
<tr class="nb"><td colspan="4"></td><td colspan="6"><h1>거래명세서(공급자)</h1></td><td colspan="4"></td></tr>
<tr class="nb"><td colspan="11"></td><td colspan="3" class="r">${E(s.date)}</td></tr><tr class="gap"><td colspan="14"></td></tr>
<tr>${pty('공급자',S)}<td rowspan="5" class="hd vt">공급받는자</td><td class="hd">등록<br>번호</td><td colspan="5" class="b big">${E(c.reg)}</td></tr>
<tr><td class="hd">상호</td><td colspan="2">${E(S.name)}</td><td class="hd">성명</td><td colspan="2">${E(S.ceo)}</td><td class="hd">상호</td><td colspan="2">${E(c.name)}</td><td class="hd">성명</td><td colspan="2">${E(c.ceo)}</td></tr>
<tr><td rowspan="2" class="hd">사업장<br>주소</td><td rowspan="2" colspan="5" class="l wr">${E(S.addr)}</td><td rowspan="2" class="hd">사업장<br>주소</td><td rowspan="2" colspan="5" class="l wr">${E(c.addr)}</td></tr><tr></tr>
<tr><td class="hd">업태</td><td colspan="2">${E(S.biz)}</td><td class="hd">종목</td><td colspan="2">${E(S.type)}</td><td class="hd">업태</td><td colspan="2">${E(c.biz)}</td><td class="hd">종목</td><td colspan="2">${E(c.type)}</td></tr>
<tr class="gap"><td colspan="14"></td></tr>
<tr class="hd"><td colspan="2" class="hd">오 더 번 호</td><td colspan="5" class="hd">품 명 &nbsp;및&nbsp; 규 격</td><td class="hd">절</td><td class="hd">수량<br>(YD)</td><td class="hd">단 가</td><td colspan="2" class="hd">금 액</td><td colspan="2" class="hd">비 고</td></tr>
<tr><td rowspan="2" colspan="2" class="b">${E(s.orderNo)}</td><td colspan="5" style="height:24px;border-bottom:1px dotted #000">${E(s.item)}</td><td rowspan="2" class="r b">${t.c||''}</td><td rowspan="2" class="r b">${N(t.q||'')}</td><td rowspan="2" class="r">${N(s.price)}</td><td rowspan="2" colspan="2" class="r b">${a?a.toLocaleString('ko-KR'):''}</td><td rowspan="2" colspan="2">${E(s.note)}</td></tr>
<tr><td colspan="5" style="height:24px;border-top:1px dotted #000">${E(s.spec)}</td></tr><tr class="gap"><td colspan="14"></td></tr>
<tr><td rowspan="2" class="hd">LOT NO.</td><td rowspan="2" class="hd">COLOR</td><td colspan="10" class="hd">수량(YD)</td><td rowspan="2" class="hd">절</td><td rowspan="2" class="hd">수량(YD)</td></tr>
<tr>${Array.from({length:10},(_,i)=>`<td class="hd">${i+1}</td>`).join('')}</tr>
<tbody class="lt">${lots}</tbody>
<tbody class="ft"><tr><td colspan="14" class="big2">납품처: ${E(s.dest)}</td></tr><tr><td colspan="14" class="big2">담당자: ${E(s.contact)}</td></tr>
${notice.map((x,i)=>`<tr><td class="b">${i?'':'주의 :'}</td><td colspan="13">${E(x)}</td></tr>`).join('')}
${cts.map((x,i)=>`<tr><td colspan="${i===cts.length-1?10:14}" style="white-space:pre">${E(x)}</td>${i===cts.length-1?'<td colspan="4" style="text-align:right">인수자 &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; (인)</td>':''}</tr>`).join('')}
${cts.length?'':'<tr><td colspan="10"></td><td colspan="4" style="text-align:right">인수자 &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; (인)</td></tr>'}</tbody></table></body></html>`}
async function stOut(mode){if(!stEd)return;const s=stClean(stEd),fsafe=v=>String(v||'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'').replace(/\s+/g,' ').trim().replace(/[. ]+$/,''),nm=[(s.date||ymd(new Date())).replace(/-/g,''),'거래명세서',fsafe(s.cust.name)].filter(Boolean).join('_');
 if(!supOf(s).name&&!confirm('공급자 정보가 비어 있습니다. (설정 > 공급자 정보에서 등록) 그래도 출력할까요?'))return;
 try{if(mode==='pdf'){const p=await A.stmtPDF(stmtHTML(s),nm+'.pdf');if(p)toast('PDF 저장: '+p)}
  else if(mode==='print')await A.stmtPrint(stmtHTML(s));
  else{const p=await A.stmtXlsx(s,supOf(s),nm+'.xlsx');if(p)toast('엑셀 저장: '+p)}}catch(e){alert('출력 실패: '+(e.message||e))}}
// ---- 설정: 공급자 정보 ----
function renderSupplier(){renderSuppliers()}
async function importSupplier(){try{const r=await A.importSupplierXlsx();if(!r)return;P_FIELDS.forEach(([k])=>{if(r[k])$('sp_'+k).value=r[k]});if(r.contacts)$('sp_contacts').value=r.contacts;if(r.notice)$('sp_notice').value=r.notice;toast('엑셀에서 불러왔어요. 확인 후 [저장]을 누르세요')}catch(e){alert('엑셀을 읽지 못했습니다: '+(e.message||e))}}

function stSupStale(e){const x=sups.find(y=>y.id===e.supplierId);return !!(x&&e.sup&&JSON.stringify(supSnap(x))!==JSON.stringify(normSup(e.sup)))}
function stSupPick(id){const x=sups.find(y=>y.id===id);stEd.supplierId=id;stEd.sup=supSnap(x);renderEditor()}
function stSupRefresh(){stSupPick(stEd.supplierId);toast('최신 공급자 정보로 갱신했어요 (저장해야 반영돼요)')}
// ---- 설정: 공급자 목록 ----
function renderSuppliers(){const el=$('suplist');if(!el)return;
 el.innerHTML=sups.length?`<table><thead><tr><th style="width:70px"></th><th>상호</th><th>등록번호</th><th>성명</th><th style="width:250px"></th></tr></thead><tbody>${sups.map(x=>`<tr><td>${x.id===supDef?'<span class="badge" style="background:#2271b1;color:#fff">기본값</span>':''}</td><td><b>${esc(x.name)||'(상호 없음)'}</b></td><td>${esc(x.reg)}</td><td>${esc(x.ceo)}</td>
 <td style="text-align:right;white-space:nowrap">${x.id===supDef?'':`<button onclick="setSupDef('${x.id}')">기본값으로</button> `}<button onclick="openSup('${x.id}')">수정</button> <button class="d" onclick="delSup('${x.id}')">삭제</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">등록된 공급자가 없습니다. [+ 공급자 추가]로 등록하세요.</p>'}
function setSupDef(id){supDef=id;save();renderSuppliers();toast('기본 공급자를 바꿨습니다')}
function openSup(id){const x=id?sups.find(y=>y.id===id):normSupRec({});if(!x)return;$('dt').textContent=id?'공급자 수정':'공급자 추가';
 $('dbody').innerHTML=`<div class="g">${pForm('sp_',x)}
 <label class="w">연락처 문구 (한 줄씩, 예: 본사☎ … FAX …)<textarea id="sp_contacts" rows="3">${esc(x.contacts)}</textarea></label><label class="w">주의사항 문구 (한 줄씩)<textarea id="sp_notice" rows="3">${esc(x.notice)}</textarea></label></div>`;
 $('dfoot').innerHTML=`<button onclick="importSupplier()" style="margin-right:auto">엑셀 양식에서 가져오기</button><button onclick="dlg.close()">취소</button><button class="p" onclick="saveSup('${id||''}')">저장</button>`;if(!dlg.open)dlg.showModal();$('sp_name').focus()}
function saveSup(id){const o={};P_FIELDS.forEach(([k])=>o[k]=$('sp_'+k).value.trim());o.contacts=$('sp_contacts').value.replace(/\s+$/,'');o.notice=$('sp_notice').value.replace(/\s+$/,'');
 if(!supHas({...o,notice:null}))return toast('상호나 등록번호 등 한 가지 이상 입력해 주세요.');
 if(id)Object.assign(sups.find(y=>y.id===id),o);else{const x=normSupRec(o);sups.push(x);if(!supDef||!sups.some(y=>y.id===supDef))supDef=x.id}
 if(stAssignSup()){}save();dlg.close();renderSuppliers();toast('공급자 정보를 저장했습니다')}
function delSup(id){const x=sups.find(y=>y.id===id);if(!x)return;const n=stmts.filter(s=>s.supplierId===id).length;
 if(!confirm(`공급자 '${x.name||'(상호 없음)'}'을(를) 삭제할까요?${n?`\n이 공급자로 작성한 명세서 ${n}건은 저장된 정보로 그대로 인쇄됩니다.`:''}`))return;
 sups=sups.filter(y=>y.id!==id);if(supDef===id)supDef=sups[0]?sups[0].id:'';save();renderSuppliers();toast('삭제했습니다')}
