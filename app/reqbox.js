// ===== 요청함 (Grok Bot 요청 받기) — data.requestLog =====
// <userData>/requests/inbox 의 JSON 요청을 카드로 보여 주고, 사용자가 [적용]을 눌렀을 때만 앱의 기존 로직(normalizeOrders·deriveOrder·stPickOrder·stClean·linkShip·slNorm·prNorm)으로 데이터를 만듦.
// 미리보기는 '작업용 사본'에 실제로 실행해 본 뒤 되돌리는 방식(dry-run)이라, 화면에 보이는 내용과 적용 결과가 같음.
// 적용: 자동 백업(preImportBackup) → 사본에서 전부 실행 → 하나라도 실패하면 원래 데이터로 되돌림(전부 아니면 전무) → 저장 → 파일을 done 으로.
let rqDoneIds=[],rqEdits={},rqEditOn={},rqPend=[],rqLog=[],rqErrs=[],rqOpenAfter={},rqBusy=false,rqInfo=null,rqTimer=null;const rqSeen=new Set();
function rqLoad(r){{const a=r&&!Array.isArray(r)&&Array.isArray(r.requestDoneIds)?r.requestDoneIds.map(String):[];rqDoneIds=a}rqLog=(r&&!Array.isArray(r)&&Array.isArray(r.requestLog)?r.requestLog:[]).filter(x=>x&&typeof x==='object'&&x.id).map(x=>({id:String(x.id),file:String(x.file||''),status:x.status==='rejected'?'rejected':'done',at:String(x.at||''),summary:String(x.summary||''),...(x.edited?{edited:true,edits:(Array.isArray(x.edits)?x.edits:[]).slice(0,100).map(String)}:{})}));rqSeedIds()}
const rqPayload=()=>({requestLog:rqLog.slice(-500),requestDoneIds:rqDoneIds.slice(-5000)});
// 같은 요청 두 번 적용 막기: 목록(requestLog)을 지워도 남는 '적용한 id' 목록 (예전 데이터는 목록의 적용 기록에서 채움)
function rqSeedIds(){const st=new Set(rqDoneIds);rqLog.forEach(x=>{if(x.status==='done'&&!st.has(x.id)){st.add(x.id);rqDoneIds.push(x.id)}})}
function rqImport(r){if(r&&!Array.isArray(r)&&Array.isArray(r.requestLog))rqLoad(r)}
const RQ_T={'production.addOrder':'생산 오더 추가','production.updateOrder':'생산 오더 수정','production.addShipment':'출고 내역 추가','production.setDone':'오더 완료 표시','statement.createFromOrder':'거래명세서 작성','sales.addRow':'매출 행 추가','price.addRow':'단가 행 추가','production.attachFile':'파일 첨부','testReport.attachFile':'시험성적서 첨부'};
const RQ_KEYS={'production.addOrder':['order'],'production.updateOrder':['orderNo','set'],'production.addShipment':['orderNo','process','processNo','addProcess','vendor','shrink','ships'],'production.setDone':['orderNo','done'],
 'statement.createFromOrder':['orderNo','date','lots','customer','item','spec','price','note','dest','contact','linkShip','open'],'sales.addRow':['row'],'price.addRow':['row'],'production.attachFile':['orderNo','kind','file','process','processNo','shipDate','shipQty','replace'],'testReport.attachFile':['reportNo','file']};
const RQ_ATT_K={statement:'거래명세서',workOrder:'작업의뢰서',purchaseOrder:'발주서'};
const rqSize=n=>n>=1048576?(n/1048576).toFixed(1)+'MB':Math.max(1,Math.round(n/1024))+'KB';
const RQ_ORDER_KEYS=['no','item','fabric','client','date','due','lines','procs','delivered'],RQ_SET_KEYS=['item','fabric','client','date','due','lines'];
const RQ_SALES_KEYS=['date','year','client','orderNo','item','fabric','process','color','unitPrice','qty','supply','total','memo'];
const RQ_PRICE_KEYS=['cat','part','code','item','color','width','gV','gCur','g','dV','dS','d','p1V','p1D','p1S','p1','p2V','p2D','p2S','p2','eD','e','t','m','memo'];
const rqS=v=>v==null?'':String(v).trim();
const rqDateOk=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&ymd(new Date(v+'T00:00'))===v;
const rqN=v=>typeof v==='number'?(isFinite(v)?v:NaN):typeof v==='string'&&v.trim()!==''?+v.replace(/[,\s]/g,''):NaN;
const rqObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
function rqExtra(o,allowed,where,it){if(!rqObj(o))return;const x=Object.keys(o).filter(k=>!allowed.includes(k));if(x.length)it.warns.push(`${where}에 모르는 항목 ${x.map(k=>`'${k}'`).join(', ')} — 무시합니다`)}
function rqFindOrder(no,it){no=rqS(no);if(!no){it.errors.push('orderNo(오더번호)가 없습니다');return null}const l=orders.filter(o=>o.no===no);
 if(!l.length){it.errors.push(`오더번호 '${no}'을(를) 생산 관리에서 찾을 수 없습니다`);return null}if(l.length>1){it.errors.push(`오더번호 '${no}'인 오더가 ${l.length}개라 어느 것인지 알 수 없습니다`);return null}return l[0]}
function rqDate(v,label,it,req){if(v==null||v===''){if(req)it.errors.push(`${label}이(가) 없습니다`);return ''}if(!rqDateOk(v)){it.errors.push(`${label} '${v}'은(는) 올바른 날짜가 아닙니다 (YYYY-MM-DD)`);return null}return v}
function rqLines(L,it,where){if(L==null)return [];if(!Array.isArray(L)){it.errors.push(`${where}은(는) 배열이어야 합니다`);return null}let ok=true;
 const out=L.map((l,i)=>{if(!rqObj(l)){it.errors.push(`${where}[${i}]이(가) 객체가 아닙니다`);ok=false;return null}rqExtra(l,['color','qty','unit'],`${where}[${i}]`,it);
  const q=l.qty==null||l.qty===''?0:rqN(l.qty);if(isNaN(q)||q<0){it.errors.push(`${where}[${i}].qty(발주량) '${l.qty}'이(가) 숫자가 아닙니다`);ok=false}
  const u=l.unit==null||l.unit===''?'YD':String(l.unit).toUpperCase();if(!UNITS.includes(u)){it.errors.push(`${where}[${i}].unit '${l.unit}'은(는) ${UNITS.join('·')} 중 하나여야 합니다`);ok=false}
  return {color:rqS(l.color),qty:q,unit:u}});return ok?out:null}
function rqShips(S,it,where,need){if(S==null||(Array.isArray(S)&&!S.length)){if(need)it.errors.push(`${where}(출고 행)이 비어 있습니다`);return []}if(!Array.isArray(S)){it.errors.push(`${where}은(는) 배열이어야 합니다`);return null}let ok=true;
 const out=S.map((s,i)=>{if(!rqObj(s)){it.errors.push(`${where}[${i}]이(가) 객체가 아닙니다`);ok=false;return null}rqExtra(s,['date','qty','memo'],`${where}[${i}]`,it);
  const d=rqDate(s.date,`${where}[${i}].date(출고일)`,it,true);if(!d)ok=false;const q=rqN(s.qty);if(s.qty==null||isNaN(q)){it.errors.push(`${where}[${i}].qty(출고량) '${s.qty??''}'이(가) 숫자가 아닙니다`);ok=false}
  return {date:d,qty:q,memo:rqS(s.memo)}});return ok?out:null}
const rqShk=(v,it,where)=>{if(v==null||v==='')return null;const n=rqN(v);if(isNaN(n)){it.errors.push(`${where} '${v}'이(가) 숫자가 아닙니다`);return undefined}return n};
const rqLinesTxt=L=>L.map(lineTxt).join(' / ')||'-';
// ---- 동작별 처리: 먼저 검사하고, 오류가 없을 때만 (작업용 사본의) 데이터를 바꿈 ----
const RQ_H={
 'production.addOrder'(a,it){const o=a.order;if(!rqObj(o)){it.errors.push('order(오더 정보) 객체가 없습니다');return}rqExtra(o,RQ_ORDER_KEYS,'order',it);
  const no=rqS(o.no);if(!no)it.errors.push('order.no(오더번호)가 없습니다');else if(orders.some(x=>x.no===no))it.errors.push(`오더번호 '${no}'은(는) 이미 생산 관리에 있습니다 (수정은 production.updateOrder)`);
  const date=o.date==null||o.date===''?ymd(new Date()):rqDate(o.date,'order.date(발주일)',it),due=rqDate(o.due,'order.due(납기일)',it),lines=rqLines(o.lines,it,'order.lines');
  if(o.delivered!=null&&typeof o.delivered!=='boolean')it.errors.push('order.delivered는 true/false여야 합니다');
  let procs=[];if(o.procs!=null&&!Array.isArray(o.procs))it.errors.push('order.procs는 배열이어야 합니다');else procs=(o.procs||[]).map((p,i)=>{if(!rqObj(p)){it.errors.push(`order.procs[${i}]이(가) 객체가 아닙니다`);return null}rqExtra(p,['name','vendor','shrink','ships'],`order.procs[${i}]`,it);
   if(!rqS(p.name))it.errors.push(`order.procs[${i}].name(공정명)이 없습니다`);const sh=rqShk(p.shrink,it,`order.procs[${i}].shrink(가공 축 %)`),ships=rqShips(p.ships,it,`order.procs[${i}].ships`,false);return {name:rqS(p.name),vendor:rqS(p.vendor),shrink:sh,ships}});
  it.summary=`생산 관리에 새 오더 ${no||'(번호 없음)'}을(를) 만듭니다`;if(it.errors.length)return;
  const n=normalizeOrders([{no,item:rqS(o.item),fabric:rqS(o.fabric),client:rqS(o.client),date,due:due||'',lines,delivered:!!o.delivered,procs:procs.map(p=>({name:p.name,vendor:p.vendor,shrink:isRaw(p)?null:p.shrink,ships:p.ships}))}])[0];n.example=false;n.updated=now();orders.push(n);
  it.diff=[['오더번호','',n.no],['거래처','',n.client],['품목','',n.item],['아이템명','',n.fabric],['색상 / 발주량','',rqLinesTxt(n.lines)+(n.lines.length>1&&!n.mixedUnit?` (합계 ${num(n.qty)} ${n.unit})`:'')],['발주일','',n.date],['납기일','',n.due],['오더 완료','',n.delivered?'예':'']].filter(r=>r[2]!=='');
  if(n.procs.length)it.table={head:['#','공정','가공 업체','가공 축','출고'],rows:n.procs.map((p,i)=>[i+1,p.name,p.vendor||'-',p.shrink!=null?p.shrink+'%':'-',p.ships.length?`${p.ships.length}건 · ${num(sum(p))} ${n.unit}`:'-'])}},
 'production.updateOrder'(a,it){const o=rqFindOrder(a.orderNo,it),s=a.set;if(!rqObj(s)||!Object.keys(s).length){it.errors.push('set(바꿀 항목) 객체가 비어 있습니다');return}
  const bad=Object.keys(s).filter(k=>!RQ_SET_KEYS.includes(k));if(bad.length)it.errors.push(`set에서 바꿀 수 없는 항목: ${bad.join(', ')} (가능: ${RQ_SET_KEYS.join(', ')})`);
  const v={};for(const k of ['item','fabric','client'])if(k in s)v[k]=rqS(s[k]);
  if('date' in s){const d=rqDate(s.date,'set.date(발주일)',it);if(d!==null)v.date=d}if('due' in s){const d=rqDate(s.due,'set.due(납기일)',it);if(d!==null)v.due=d}
  if('lines' in s){const L=rqLines(s.lines,it,'set.lines');if(L){if(!L.length)it.errors.push('set.lines가 비어 있습니다');else v.lines=L}}
  it.summary=`오더 ${rqS(a.orderNo)}의 기본 정보를 바꿉니다`;if(it.errors.length||!o)return;
  const before={...o,lines:o.lines.map(l=>({...l}))},LB={item:'품목',fabric:'아이템명',client:'거래처',date:'발주일',due:'납기일'};
  Object.assign(o,v);if(v.lines)o.lines=normLines({lines:v.lines});deriveOrder(o);o.updated=now();
  it.diff=Object.keys(LB).filter(k=>k in v&&before[k]!==o[k]).map(k=>[LB[k],before[k],o[k]]);if(v.lines&&rqLinesTxt(before.lines)!==rqLinesTxt(o.lines))it.diff.push(['색상 / 발주량',rqLinesTxt(before.lines),rqLinesTxt(o.lines)]);
  if(!it.diff.length)it.warns.push('바뀌는 내용이 없습니다')},
 'production.addShipment'(a,it,ctx){let vch=null;const o=rqFindOrder(a.orderNo,it);const ships=rqShips(a.ships,it,'ships',!a.addProcess);let p=null,isNew=false;
  if(a.addProcess!=null&&typeof a.addProcess!=='boolean')it.errors.push('addProcess는 true/false여야 합니다');
  const sh=rqShk(a.shrink,it,'shrink(가공 축 %)');
  if(o){if(a.processNo!=null){const k=rqN(a.processNo);if(!Number.isInteger(k)||k<1||k>o.procs.length)it.errors.push(`processNo ${a.processNo}: 이 오더의 공정은 1~${o.procs.length}번입니다`);else{p=o.procs[k-1];if(a.process!=null&&rqS(a.process)!==p.name)it.errors.push(`processNo ${k}번 공정은 '${p.name}'인데 process는 '${rqS(a.process)}'입니다`)}}
   else if(rqS(a.process)){const l=o.procs.filter(x=>x.name===rqS(a.process));if(l.length>1)it.errors.push(`'${rqS(a.process)}' 공정이 ${l.length}개입니다 — processNo(1부터)로 지정하세요`);else if(l.length)p=l[0];
    else if(a.addProcess===true)isNew=true;else it.errors.push(`오더 ${o.no}에 '${rqS(a.process)}' 공정이 없습니다 (있는 공정: ${o.procs.map(x=>x.name).join(', ')||'없음'}) — 새 공정이면 addProcess: true`)}
   else it.errors.push('process(공정명) 또는 processNo(공정 순서)가 필요합니다')}
  it.summary=`오더 ${rqS(a.orderNo)}${isNew?`에 새 공정 '${rqS(a.process)}'을(를) 추가하고`:p?`의 '${p.name}' 공정에`:''} 출고 ${ships?ships.length:0}건을 추가합니다`;
  if(it.errors.length||!o||!ships)return;
  if(isNew){p={id:uid(),name:rqS(a.process),vendor:rqS(a.vendor),shrink:null,ships:[]};p.shrink=isRaw(p)?null:sh;o.procs.push(p)}
  else{if(a.shrink!=null)it.warns.push('shrink는 새 공정(addProcess)일 때만 씁니다 — 기존 공정의 가공 축은 그대로');if(a.vendor!=null&&rqS(a.vendor)!==p.vendor){vch=[p.vendor,rqS(a.vendor)];p.vendor=rqS(a.vendor)}}
  const s0=sum(p);ships.forEach(s=>p.ships.push({id:uid(),date:s.date,qty:s.qty,memo:s.memo}));o.updated=now();if(ships.length&&ctx)ctx.lastShip[o.id]={pid:p.id,sid:p.ships[p.ships.length-1].id};
  it.diff=[['공정',isNew?'':p.name,isNew?`${p.name} (새 공정, ${o.procs.length}번째${p.vendor?' · '+p.vendor:''})`:p.name],['출고 소계',`${num(s0)} ${o.unit}`,`${num(sum(p))} ${o.unit}`]];if(vch)it.diff.splice(1,0,['가공 업체',vch[0]||'-',vch[1]||'(비움)']);
  if(ships.length)it.table={head:['출고일','출고량 ('+o.unit+')','메모'],rows:ships.map(s=>[s.date,num(s.qty),s.memo])}},
 'production.setDone'(a,it){const o=rqFindOrder(a.orderNo,it);if(a.done!=null&&typeof a.done!=='boolean')it.errors.push('done은 true/false여야 합니다');const v=a.done!==false;
  it.summary=`오더 ${rqS(a.orderNo)}을(를) 오더 완료${v?'로 표시':' 표시 해제'}합니다`;if(it.errors.length||!o)return;
  const b=o.delivered;o.delivered=v;o.updated=now();it.diff=[['오더 완료',b?'예':'아니오',v?'예':'아니오']];if(b===v)it.warns.push('이미 그 상태입니다')},
 'statement.createFromOrder'(a,it,ctx,req){const o=rqFindOrder(a.orderNo,it),date=a.date==null||a.date===''?ymd(new Date()):rqDate(a.date,'date(명세서 날짜)',it);
  let lots=null;if(!Array.isArray(a.lots)||!a.lots.length)it.errors.push('lots(LOT별 수량)가 비어 있습니다');
  else{lots=a.lots.map((l,i)=>{if(!rqObj(l)){it.errors.push(`lots[${i}]이(가) 객체가 아닙니다`);return null}rqExtra(l,['lotNo','color','rolls'],`lots[${i}]`,it);
    if(!Array.isArray(l.rolls)||!l.rolls.length){it.errors.push(`lots[${i}].rolls(절별 수량)가 비어 있습니다`);return null}if(l.rolls.length>500){it.errors.push(`lots[${i}].rolls가 너무 깁니다 (500개까지)`);return null}
    const r=l.rolls.map(v=>v===''||v==null?'':rqN(v));if(r.some(v=>v!==''&&(isNaN(v)||v<0))){it.errors.push(`lots[${i}].rolls에 숫자가 아닌 값이 있습니다`);return null}
    return {lotNo:rqS(l.lotNo),color:rqS(l.color),rolls:r}})}
  if(a.price!=null&&a.price!==''&&isNaN(rqN(a.price)))it.errors.push(`price(단가) '${a.price}'이(가) 숫자가 아닙니다`);
  for(const k of ['linkShip','open'])if(a[k]!=null&&typeof a[k]!=='boolean')it.errors.push(`${k}는 true/false여야 합니다`);
  it.summary=`오더 ${rqS(a.orderNo)}로 거래명세서를 작성해 저장합니다 ('+ 거래명세서 작성'과 같은 방식)`;if(it.errors.length||!o)return;
  const prev=stEd;try{
   stEd=normStmt({no:nextNo(),date,lots:lots.map(l=>({lotNo:l.lotNo,color:l.color,rolls:l.rolls}))});stEd._new=true;stEd.id=sid();{const d=defSup();if(d){stEd.supplierId=d.id;stEd.sup=supSnap(d)}}
   stPickOrder(o.id);
   if(rqS(a.customer)){const c=custs.find(x=>x.name===rqS(a.customer));if(c)stPick(c.id);else{stEd.customerId='';stEd.cust=party({name:rqS(a.customer)});it.warns.push(`'${rqS(a.customer)}'은(는) 거래처 정보에 없어서 상호만 넣습니다`)}}
   else if(!custs.some(x=>x.name===stEd.cust.name)&&stEd.cust.name)it.warns.push(`'${stEd.cust.name}'은(는) 거래처 정보에 없어서 상호만 들어갑니다 (등록번호·주소 비어 있음)`);
   for(const k of ['item','spec','note','dest','contact'])if(a[k]!=null)stEd[k]=rqS(a[k]);if(a.price!=null&&a.price!=='')stEd.price=rqN(a.price);
   stEd.linkShip=a.linkShip!==false;stEd.reqId=req.id;
   const s=stClean(stEd);linkShip(s);stmts.push(s);ctx.stmtIds.push(s.id);{const lp0=o.procs[o.procs.length-1];if(s.shipId&&lp0)ctx.lastShip[o.id]={pid:lp0.id,sid:s.shipId}}
   if(!supOf(s).name)it.warns.push('공급자 정보가 비어 있습니다 (설정 › 공급자 정보)');
   const t=stTot(s),lp=o.procs[o.procs.length-1];
   it.diff=[['명세서 날짜','',s.date],['오더번호','',s.orderNo],['공급자','',supOf(s).name||'-'],['공급받는자','',s.cust.name||'-'],['품명 / 규격','',[s.item,s.spec].filter(Boolean).join(' / ')],['단가','',s.price?fnum(s.price)+'원':''],['금액','',stAmt(s)?stAmt(s).toLocaleString('ko-KR')+'원':''],['비고','',s.note],['납품처','',s.dest],['담당자','',s.contact],
    ['생산 관리 출고 반영','',s.linkShip?(s.shipId&&lp?`'${lp.name}' 공정에 ${s.date} · ${fnum(t.q)} YD 출고 1줄 추가`:'반영 안 됨 (공정 없음)'):'아니오']].filter(r=>r[2]!=='');
   it.table={head:['LOT NO.','COLOR','절','수량(YD)'],rows:s.lots.map(l=>[l.lotNo,l.color,lotCnt(l),fnum(lotSum(l))]).concat([['합계','',t.c,fnum(t.q)]])};
   it.stmt=true;it.open=a.open}
  finally{stEd=prev}},
 'sales.addRow'(a,it){const r=a.row;if(!rqObj(r)){it.errors.push('row 객체가 없습니다');return}rqExtra(r,RQ_SALES_KEYS,'row',it);
  if(!rqS(r.client)&&!rqS(r.orderNo))it.errors.push('row.client(거래처) 또는 row.orderNo(오더번호)가 필요합니다');
  if(r.date!=null&&r.date!=='')rqDate(r.date,'row.date(매출일)',it);else if(!Number.isInteger(rqN(r.year))||rqN(r.year)<2000||rqN(r.year)>2100)it.errors.push('row.date(매출일) 또는 row.year(연도)가 필요합니다');
  for(const k of ['unitPrice','qty','supply','total'])if(r[k]!=null&&r[k]!==''&&isNaN(rqN(r[k])))it.errors.push(`row.${k} '${r[k]}'이(가) 숫자가 아닙니다`);
  it.summary=`매출 관리에 ${rqS(r.client)||rqS(r.orderNo)} 매출 1건을 추가합니다`;if(it.errors.length)return;
  const x={};RQ_SALES_KEYS.forEach(k=>{if(r[k]!=null)x[k]=['unitPrice','qty','supply','total','year'].includes(k)?rqN(r[k]):rqS(r[k])});const n=slNorm({...x,id:uid(),source:''});sales.push(n);
  it.diff=[['매출일 / 연도','',n.date||String(n.year)],['거래처','',n.client],['오더번호','',n.orderNo],['품목','',n.item],['아이템명','',n.fabric],['가공구분','',n.process],['색상','',n.color],['단가','',n.unitPrice?slWon(n.unitPrice):''],['수량','',n.qty?num(n.qty):''],['공급가액','',n.supply?slWon(n.supply):''],['총액(VAT)','',n.total?slWon(n.total):''],['메모','',n.memo]].filter(r=>r[2]!=='')},
 'production.attachFile'(a,it,ctx,req,P){const kind=a.kind==null||a.kind===''?'statement':String(a.kind),K=RQ_ATT_K[kind];
  if(!K)it.errors.push(`kind '${kind}'은(는) statement(거래명세서)·workOrder(작업의뢰서)·purchaseOrder(발주서) 중 하나여야 합니다`);
  const o=rqFindOrder(a.orderNo,it);let fi=null;
  if(typeof a.file!=='string'||!a.file.trim())it.errors.push('file(첨부할 파일 경로)이 없습니다');else{fi=(P&&P.files||{})[a.file];if(!fi)it.errors.push(`file '${a.file}' 정보를 읽지 못했습니다 — [지금 확인]을 눌러 주세요`);else if(fi.error){it.errors.push(fi.error);fi=null}}
  if(a.replace!=null&&typeof a.replace!=='boolean')it.errors.push('replace는 true/false여야 합니다');
  let p=null,s=null,old=null;
  if(o&&K==='거래명세서'){const hasT=a.process!=null||a.processNo!=null||a.shipDate!=null||a.shipQty!=null;
   if(!hasT){const L=ctx.lastShip[o.id];if(L){p=o.procs.find(x=>x.id===L.pid);s=p&&p.ships.find(x=>x.id===L.sid)}
    if(!s)it.errors.push('어느 출고 줄에 붙일지 알 수 없습니다 — 같은 요청 앞쪽에서 출고를 추가(production.addShipment·statement.createFromOrder)하거나 process/processNo와 shipDate를 지정하세요')}
   else{let ok=true;if(a.processNo!=null){const k=rqN(a.processNo);if(!Number.isInteger(k)||k<1||k>o.procs.length){it.errors.push(`processNo ${a.processNo}: 이 오더의 공정은 1~${o.procs.length}번입니다`);ok=false}else p=o.procs[k-1]}
    else if(rqS(a.process)){const l=o.procs.filter(x=>x.name===rqS(a.process));if(!l.length){it.errors.push(`오더 ${o.no}에 '${rqS(a.process)}' 공정이 없습니다`);ok=false}else if(l.length>1){it.errors.push(`'${rqS(a.process)}' 공정이 ${l.length}개입니다 — processNo로 지정하세요`);ok=false}else p=l[0]}
    const d=a.shipDate==null||a.shipDate===''?'':rqDate(a.shipDate,'shipDate(출고일)',it);if(d===null)ok=false;
    const q=a.shipQty==null||a.shipQty===''?null:rqN(a.shipQty);if(q!=null&&isNaN(q)){it.errors.push(`shipQty '${a.shipQty}'이(가) 숫자가 아닙니다`);ok=false}
    if(ok){let c=(p?[p]:o.procs).flatMap(pp=>pp.ships.map(x=>({p:pp,x})));if(d)c=c.filter(z=>z.x.date===d);if(q!=null)c=c.filter(z=>Math.abs(z.x.qty-q)<1e-9);
     if(!d&&!p)it.errors.push('shipDate(출고일) 또는 process/processNo가 필요합니다');
     else if(!c.length)it.errors.push(`조건에 맞는 출고 줄이 없습니다${p?` ('${p.name}' 공정`:' (전체 공정'}${d?' · '+d:''}${q!=null?' · '+num(q):''})`);
     else if(c.length>1&&d)it.errors.push(`조건에 맞는 출고 줄이 ${c.length}개입니다 — shipQty나 processNo로 좁혀 주세요`);
     else{const z=c[c.length-1];p=z.p;s=z.x;if(c.length>1)it.warns.push(`shipDate가 없어 '${p.name}' 공정의 마지막 출고 줄(${s.date})에 붙입니다`)}}}
   if(s){if(ctx.ssTaken.has(s.id))it.errors.push('같은 요청에서 이 출고 줄에 거래명세서를 두 번 붙입니다');ctx.ssTaken.add(s.id);
    old=shipFiles.find(x=>x.shipId===s.id)||null;if(old){if(a.replace===true)it.warns.push(`이미 붙어 있는 '${old.name}'을(를) 새 파일로 바꿉니다`);else it.errors.push(`이 출고 줄에는 이미 거래명세서 '${old.name}'이(가) 붙어 있습니다 — 바꾸려면 replace: true`)}}}
  it.summary=`오더 ${rqS(a.orderNo)}에 ${K||'파일'}${fi?` '${fi.name}'`:''}을(를) 첨부합니다`;if(it.errors.length||!o||!fi||!K)return;
  ctx.attach.push({kind,oid:o.id,pid:p?p.id:'',sid:s?s.id:'',abs:fi.abs,name:fi.name,old:old?old.id:''});
  it.diff=[['파일','',`${fi.name} (${rqSize(fi.size)})`],['붙일 곳','',K==='거래명세서'?`생산 관리 › 오더 ${o.no} › '${p.name}' 공정 · ${s.date||'-'} 출고 ${num(s.qty)} ${o.unit} › 거래명세서 칸`:`작업의뢰서 메뉴 › 오더 ${o.no} › ${K} 칸`]];
  if(old)it.diff.push(['기존 파일',old.name,fi.name]);it.file=fi.rel},
 'testReport.attachFile'(a,it,ctx,req,P){const no=rqS(a.reportNo),k=trNoKey(no);let t=null,fi=null;
  if(!no)it.errors.push('reportNo(접수번호)가 없습니다');else{const l=trs.filter(x=>trNoKey(x.no)===k);if(!l.length)it.errors.push('일치하는 성적서 없음');else if(l.length>1)it.errors.push(`접수번호 '${no}'인 성적서가 ${l.length}건입니다`);else t=l[0]}
  if(typeof a.file!=='string'||!a.file.trim())it.errors.push('file(첨부할 파일 경로)이 없습니다');else{fi=(P&&P.files||{})[a.file];if(!fi)it.errors.push(`file '${a.file}' 정보를 읽지 못했습니다 — [지금 확인]을 눌러 주세요`);else if(fi.error){it.errors.push(fi.error);fi=null}}
  it.summary=`TEST REPORT ${t?t.no:(no||'?')}에 시험성적서${fi?` '${fi.name}'`:''}을(를) 첨부합니다`;if(it.errors.length||!t||!fi)return;
  const ex=wfFiles.filter(f=>f.kind==='tr'&&f.orderId===t.id),nk=fi.name.toLowerCase(),dk=t.id+'|'+nk;
  it.diff=[['접수번호','',t.no],['성적서','',`${t.name}${t.lab?' · '+t.lab:''}`],['접수일 / 완료일','',`${t.recv||'-'} / ${t.done||'-'}`],['결과','',t.result||'-'],['파일','',`${fi.name} (${rqSize(fi.size)})`]];
  if(ex.length)it.diff.push(['기존 첨부','',ex.map(f=>f.name).join(', ')]);
  if(ex.some(f=>f.name.toLowerCase()===nk)||ctx.trTaken.has(dk)){it.warns.push(`같은 이름의 파일 '${fi.name}'이(가) 이미 붙어 있어 건너뜁니다`);it.file=fi.rel;return}
  ctx.trTaken.add(dk);ctx.attach.push({kind:'testReport',tid:t.id,abs:fi.abs,name:fi.name});it.file=fi.rel},
 'price.addRow'(a,it){const r=a.row;if(!rqObj(r)){it.errors.push('row 객체가 없습니다');return}rqExtra(r,RQ_PRICE_KEYS,'row',it);
  if(!rqS(r.item)&&!rqS(r.code))it.errors.push('row.item(ITEM) 또는 row.code(CODE)가 필요합니다');
  for(const k of ['g','d','p1','p2','e','t','dS','p1S','p2S','m'])if(r[k]!=null&&r[k]!==''&&isNaN(rqN(r[k])))it.errors.push(`row.${k} '${r[k]}'이(가) 숫자가 아닙니다`);
  if(r.gCur!=null&&!['KRW','USD'].includes(r.gCur))it.errors.push("row.gCur는 'KRW' 또는 'USD'여야 합니다");
  for(const k of ['dS','p1S','p2S','m'])if(r[k]!=null&&r[k]!==''&&Math.abs(rqN(r[k]))>1)it.warns.push(`row.${k}=${r[k]}: 비율은 소수로 적습니다 (13% → 0.13). 100% 넘는 값이 맞는지 확인하세요`);
  it.summary=`단가 관리에 ${[rqS(r.item)||rqS(r.code),rqS(r.color)].filter(Boolean).join(' ')} 단가 1건을 추가합니다`;if(it.errors.length)return;
  const x={};RQ_PRICE_KEYS.forEach(k=>{if(r[k]!=null)x[k]=r[k]});const n=prNorm({...x,id:uid()});n.example=false;n.src='';prices.push(n);const c=typeof prCalc==='function'?prCalc(n):null;
  it.diff=[['품목 / 부위','',[n.cat,n.part].filter(Boolean).join(' / ')],['CODE','',n.code],['ITEM','',n.item],['색상','',n.color],['폭','',n.width],['생지','',n.g?`${n.gV||'-'} ${n.gCur==='USD'?'$'+n.g:prW(n.g)+'원'}`:''],['염색','',n.d||n.dV?`${n.dV||'-'} ${prW(n.d)}원${n.dS!=null?' · 축 '+prPct(n.dS):''}`:''],['가공1','',n.p1||n.p1V?`${n.p1V||'-'} ${n.p1D} ${prW(n.p1)}원`:''],['가공2','',n.p2||n.p2V?`${n.p2V||'-'} ${n.p2D} ${prW(n.p2)}원`:''],['계산 결과','',c?`NET ${prW(c.net)}원/YD · OFFER ${prW(c.off)}원/YD`:'']].filter(r=>r[2]!=='')}};
// 작업용 사본에서 실행 (미리보기·적용 공용). 호출하는 쪽에서 rqWork/rqRestore 로 감쌈
function rqRun(P){const req=P.req,ctx={stmtIds:[],attach:[],lastShip:{},ssTaken:new Set(),trTaken:new Set(),qsTaken:new Set()},top=[];
 const done=rqLog.find(x=>x.id===req.id&&x.status==='done')||(rqDoneIds.includes(req.id)?{at:''}:null);if(done)top.push(`이 요청 id(${req.id})는 이미 ${done.at?new Date(done.at).toLocaleString('ko-KR')+' ':''}적용했습니다 — 같은 요청을 두 번 적용하지 않도록 막았어요`);
 const twin=rqPend.find(x=>x.file!==P.file&&x.req.id===req.id&&x.file<P.file);if(twin)top.push(`같은 id(${req.id})의 요청 파일 '${twin.file}'이(가) 먼저 와 있습니다`);
 const items=req.actions.map(a=>{const it={type:a.type,title:RQ_T[a.type]||a.type,summary:'',comment:rqS(a.comment),errors:[],warns:[],diff:[],table:null};
  rqExtra(a,['type','comment',...(RQ_KEYS[a.type]||[])],'동작',it);try{RQ_H[a.type](a,it,ctx,req,P)}catch(e){it.errors.push('처리 중 오류: '+(e&&e.message||e))}return it});
 return {top,items,ctx,nerr:top.length+items.reduce((s,x)=>s+x.errors.length,0)}}
const rqClone=v=>JSON.parse(JSON.stringify(v));
function rqSnap(){return {orders,stmts,sales,prices,qualities,trs,stEd}}
function rqWork(){orders=rqClone(orders);stmts=rqClone(stmts);sales=rqClone(sales);prices=rqClone(prices);qualities=rqClone(qualities);trs=rqClone(trs)}
function rqRestore(s){orders=s.orders;stmts=s.stmts;sales=s.sales;prices=s.prices;qualities=s.qualities;trs=s.trs;stEd=s.stEd}
function rqPreview(P){const s=rqSnap();try{rqWork();return rqRun(P)}finally{rqRestore(s)}}
const rqSummary=(P,R)=>R.items.map(it=>`· ${it.title}: ${it.summary}`).join('\n');
// ---- 카드에서 고치기: 원래 요청은 그대로 두고, 고친 actions 사본(rqEdits[file])으로 미리보기·적용 ----
const rqEff=P=>rqEdits[P.file]?{...P,req:{...P.req,actions:rqEdits[P.file]}}:P;
const rqIsEdited=P=>!!rqEdits[P.file]&&JSON.stringify(rqEdits[P.file])!==JSON.stringify(P.req.actions);
function rqLeaves(v,pre,out){if(v&&typeof v==='object'){for(const k of Object.keys(v))rqLeaves(v[k],pre?pre+'.'+k:k,out)}else out[pre]=v;return out}
function rqEditDiff(P){const a=rqLeaves(P.req.actions,'',{}),b=rqLeaves(rqEdits[P.file]||P.req.actions,'',{});
 return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>`actions.${k}: ${a[k]===undefined?'(없음)':JSON.stringify(a[k])} → ${b[k]===undefined?'(없음)':JSON.stringify(b[k])}`)}
function rqEditToggle(f){const P=rqPend.find(x=>x.file===f);if(!P)return;rqEditOn[f]=!rqEditOn[f];if(rqEditOn[f]&&!rqEdits[f])rqEdits[f]=rqClone(P.req.actions);render()}
async function rqEditReset(f){if(!await uiConfirm('고친 내용을 버리고 원래 요청대로 되돌릴까요?'))return;delete rqEdits[f];rqEditOn[f]=false;render()}
const rqGet=(o,path)=>path.split('.').reduce((x,k)=>x==null?undefined:x[k],o);
function rqPut(o,path,v){const ks=path.split('.');let x=o;for(let i=0;i<ks.length-1;i++){if(x[ks[i]]==null)x[ks[i]]=/^\d+$/.test(ks[i+1])?[]:{};x=x[ks[i]]}const l=ks[ks.length-1];if(v===undefined)delete x[l];else x[l]=v}
// 입력값 → JSON 값 (t: n 숫자, b 체크, r 절별 수량 목록, 그 밖 문자열; 빈칸이면 항목 삭제)
function rqSet(el){const f=el.dataset.f,i=+el.dataset.i,path=el.dataset.k,t=el.dataset.t||'';const A0=rqEdits[f];if(!A0)return;const a=A0[i];let v;
 if(t==='b')v=el.checked;else{const s=el.value.trim();if(s==='')v=undefined;else if(t==='n'){const n=rqN(s);v=isNaN(n)?s:n}else if(t==='r')v=s.split(/[,\s]+/).filter(Boolean).map(x=>{const n=rqN(x);return isNaN(n)?x:n});else v=s}
 rqPut(a,path,v);
 // 공정 이름을 바꾸면: 그 오더에 같은 이름 공정이 있으면 그 공정에 넣고(addProcess 끔), 없으면 새 공정으로
 if(a.type==='production.addShipment'&&path==='process'){const o=orders.find(x=>x.no===rqS(a.orderNo));delete a.processNo;
  if(o&&o.procs.some(p=>p.name===rqS(a.process))){delete a.addProcess;delete a.shrink}else a.addProcess=true}
 render()}
function rqVendors(){return [...new Set([...orders.flatMap(o=>o.procs.map(p=>p.vendor)),...(typeof custs!=='undefined'?custs.map(c=>c.name):[]),...(typeof contacts!=='undefined'?contacts.map(c=>c.company):[])].filter(Boolean))]}
function rqForm(P,i,a){const f=P.file,id=k=>`rqe_${rqPend.indexOf(P)}_${i}_${k.replace(/\W/g,'_')}`;
 const inp=(k,label,o={})=>{const v=rqGet(a,k);const val=Array.isArray(v)?v.join(', '):v==null?'':String(v);
  const at=`id="${id(k)}" data-f="${esc(f)}" data-i="${i}" data-k="${esc(k)}" data-t="${o.t||''}" onchange="rqSet(this)"`;
  if(o.t==='b')return `<label class="rqel rqeb"><input type="checkbox" ${at} ${v?'checked':''}> ${esc(label)}</label>`;
  if(o.opts)return `<label class="rqel">${esc(label)}<select ${at}>${o.opts.map(([x,l])=>`<option value="${esc(x)}"${String(val)===x?' selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  return `<label class="rqel${o.w?' w':''}">${esc(label)}<input ${at} value="${esc(val)}"${o.list?` list="${o.list}"`:''}${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.t==='d'?' placeholder="YYYY-MM-DD"':''}></label>`};
 const ships=(base)=>(rqGet(a,base)||[]).map((_,j)=>`<div class="rqer"><span class="muted">${j+1}</span>${inp(`${base}.${j}.date`,'출고일',{t:'d'})}${inp(`${base}.${j}.qty`,'출고량',{t:'n'})}${inp(`${base}.${j}.memo`,'메모',{w:1})}</div>`).join('');
 const T=a.type;let h='';
 if(T==='production.addShipment'){const o=orders.find(x=>x.no===rqS(a.orderNo));const pn=[...new Set([...(o?o.procs.map(p=>p.name):[]),...[...document.querySelectorAll('#procs option')].map(x=>x.value)])];
  h=`<div class="rqer">${inp('orderNo','오더번호')}${inp('process','공정',{list:'rqe_pl_'+id('x'),ph:'기존 공정을 고르면 그 공정에 넣어요'})}<datalist id="rqe_pl_${id('x')}">${pn.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>${inp('vendor',a.addProcess?'가공 업체 (새 공정)':'가공 업체 (기존 공정 업체 바꿈)',{list:'rqe_vl',ph:'비우면 그대로'})}${a.addProcess?inp('shrink','가공 축 %',{t:'n'}):''}</div>${ships('ships')}`}
 else if(T==='production.addOrder')h=`<div class="rqer">${['no:오더번호','client:거래처','item:품목','fabric:아이템명'].map(x=>{const[k,l]=x.split(':');return inp('order.'+k,l,k==='client'?{list:'rqe_vl'}:{})}).join('')}${inp('order.date','발주일',{t:'d'})}${inp('order.due','납기일',{t:'d'})}</div>`+(a.order&&a.order.lines||[]).map((_,j)=>`<div class="rqer"><span class="muted">${j+1}</span>${inp(`order.lines.${j}.color`,'색상')}${inp(`order.lines.${j}.qty`,'발주량',{t:'n'})}${inp(`order.lines.${j}.unit`,'단위')}</div>`).join('')+(a.order&&a.order.procs||[]).map((p,j)=>`<div class="rqer"><span class="muted">공정${j+1}</span>${inp(`order.procs.${j}.name`,'공정',{list:'procs'})}${inp(`order.procs.${j}.vendor`,'가공 업체',{list:'rqe_vl'})}${inp(`order.procs.${j}.shrink`,'축 %',{t:'n'})}</div>${ships(`order.procs.${j}.ships`)}`).join('')
 else if(T==='production.updateOrder')h=`<div class="rqer">${inp('orderNo','오더번호')}${Object.keys(a.set||{}).filter(k=>k!=='lines').map(k=>inp('set.'+k,{item:'품목',fabric:'아이템명',client:'거래처',date:'발주일',due:'납기일'}[k]||k,k==='date'||k==='due'?{t:'d'}:{})).join('')}</div>`+(a.set&&Array.isArray(a.set.lines)?a.set.lines.map((_,j)=>`<div class="rqer"><span class="muted">${j+1}</span>${inp(`set.lines.${j}.color`,'색상')}${inp(`set.lines.${j}.qty`,'발주량',{t:'n'})}${inp(`set.lines.${j}.unit`,'단위')}</div>`).join(''):'')
 else if(T==='production.setDone')h=`<div class="rqer">${inp('orderNo','오더번호')}${inp('done','오더 완료',{t:'b'})}</div>`
 else if(T==='statement.createFromOrder')h=`<div class="rqer">${inp('orderNo','오더번호')}${inp('date','날짜',{t:'d'})}${inp('customer','공급받는자',{list:'rqe_vl'})}${inp('price','단가',{t:'n'})}</div><div class="rqer">${inp('item','품명')}${inp('spec','규격')}${inp('note','비고')}${inp('dest','납품처')}${inp('contact','담당자')}</div>`+(a.lots||[]).map((_,j)=>`<div class="rqer"><span class="muted">${j+1}</span>${inp(`lots.${j}.lotNo`,'LOT NO.')}${inp(`lots.${j}.color`,'COLOR')}${inp(`lots.${j}.rolls`,'절별 수량 (쉼표로)',{t:'r',w:1})}</div>`).join('')
 else if(T==='sales.addRow'||T==='price.addRow'){const K=T==='sales.addRow'?RQ_SALES_KEYS:RQ_PRICE_KEYS,NUM=['qty','unitPrice','supply','total','year','g','d','dS','p1','p1S','p2','p2S','e','t','m'];
  const ks=K.filter(k=>a.row&&a.row[k]!=null||T==='sales.addRow');h=`<div class="rqer">${ks.map(k=>inp('row.'+k,k,k==='date'?{t:'d'}:NUM.includes(k)?{t:'n'}:k==='client'?{list:'rqe_vl'}:{})).join('')}</div>`}
 else if(T==='testReport.attachFile')h=`<div class="rqer">${inp('reportNo','접수번호')}</div>`
 else if(T==='production.attachFile')h=`<div class="rqer">${inp('orderNo','오더번호')}${inp('kind','종류',{opts:[['statement','거래명세서'],['workOrder','작업의뢰서'],['purchaseOrder','발주서']]})}${inp('process','공정 (비우면 앞 출고 줄)',{list:'procs'})}${inp('shipDate','출고일',{t:'d'})}${inp('shipQty','출고량',{t:'n'})}${inp('replace','기존 파일 바꾸기',{t:'b'})}</div><div class="muted" style="font-size:11px">공정·출고일을 비워 두면 같은 요청에서 앞에 추가한 출고 줄(고친 내용 그대로)에 붙어요.</div>`;
 return h?`<div class="rqedit">${h}</div>`:''}
// ---- 받은편지함 확인 ----
async function rqRefresh(why){if(!A.reqList)return;let r;try{r=await A.reqList()}catch(e){return}
 rqPend=r.pending||[];const nw=rqPend.filter(x=>!rqSeen.has(x.file+'#'+x.hash));nw.forEach(x=>rqSeen.add(x.file+'#'+x.hash));
 Object.keys(rqOpenAfter).forEach(f=>{if(!rqPend.some(x=>x.file===f))delete rqOpenAfter[f]});
 if(r.errors&&r.errors.length){r.errors.forEach(e=>rqErrs.unshift({...e,at:new Date().toISOString()}));rqErrs=rqErrs.slice(0,20);toast(`요청 파일을 읽지 못해 error 폴더로 옮겼어요: ${r.errors[0].file} — ${r.errors[0].reason}`)}
 else if(nw.length)toast(why==='start'?`요청함에 확인할 요청이 ${rqPend.length}건 있어요`:`새 요청 ${nw.length}건이 요청함에 도착했어요`);
 if(r.waiting){clearTimeout(rqTimer);rqTimer=setTimeout(()=>rqRefresh('wait'),2000)}
 rqBadge();if(page==='reqs'||page==='settings')render()}
function rqBadge(){const b=$('rqn');if(!b)return;const n=rqPend.length;b.textContent=n||'';b.style.display=n?'':'none';b.title=n?`확인할 요청 ${n}건`:''}
function rqInit(){if(!A.reqList)return;A.reqInfo().then(i=>{rqInfo=i;if(page==='reqs'||page==='settings')render()}).catch(()=>{});
 if(A.onReqChanged)A.onReqChanged(()=>rqRefresh('watch'));window.addEventListener('focus',()=>rqRefresh('focus'));setTimeout(()=>rqRefresh('start'),800)}
// ---- 적용 / 거부 ----
async function rqApply(file){const P0=rqPend.find(x=>x.file===file);if(!P0||rqBusy)return;const P=rqEff(P0),ed=rqIsEdited(P0),edits=ed?rqEditDiff(P0):[];
 const chk=await A.reqCheck(file,P.hash);if(!chk.ok){toast(chk.exists?'요청 파일 내용이 바뀌어 다시 불러왔어요. 카드를 다시 확인해 주세요':'요청 파일이 없어졌어요');return rqRefresh('check')}
 const pv=rqPreview(P);if(pv.nerr){render();return toast('오류가 있어 적용할 수 없어요')}
 if(!await uiConfirm(`이 요청을 적용할까요?${ed?' (카드에서 고친 내용으로)':''}\n\n${rqSummary(P,pv)}\n\n(적용하기 전에 자동 백업해요)`))return;
 rqBusy=true;render();
 try{let bk=null;try{bk=A.preImportBackup?await A.preImportBackup():'-'}catch(e){bk=null}
  if(!bk&&!await uiConfirm('자동 백업을 만들지 못했어요. 그래도 적용할까요?'))return;
  const snap=rqSnap();let R;
  try{rqWork();R=rqRun(P);if(R.nerr)throw new Error((R.top[0]||R.items.flatMap(x=>x.errors)[0])||'검사 오류')}
  catch(e){rqRestore(snap);await uiAlert('적용하지 못했어요. 데이터는 바뀌지 않았습니다.\n'+(e&&e.message||e));return}
  // 첨부 파일 복사 (앱의 원래 첨부 저장소로). 하나라도 실패하면 복사한 파일을 지우고 데이터도 되돌림
  const added=[];
  try{for(const x of R.ctx.attach){const r=x.kind==='statement'?await A.ssAttach(x.oid,x.abs):x.kind==='testReport'?await A.wfAttach('tr-'+x.tid,x.abs):x.kind==='quality'?await A.wfAttach('qs-'+x.qid,x.abs):await A.wfAttach(x.oid,x.abs);if(!r)throw new Error(`'${x.name}' 파일을 복사하지 못했어요`);added.push({x,r})}}
  catch(e){for(const {x,r} of added){try{x.kind==='statement'?await A.ssDelete(r.path):await A.wfDelete(r.path)}catch(_){}}rqRestore(snap);await uiAlert('적용하지 못했어요. 데이터는 바뀌지 않았습니다.\n첨부 실패: '+(e&&e.message||e));return}
  const oldF=[];for(const {x,r} of added){if(x.kind==='statement'){const o=shipFiles.find(f=>f.shipId===x.sid);if(o){oldF.push(o);shipFiles=shipFiles.filter(f=>f.id!==o.id)}shipFiles.push(normSs({...r,orderId:x.oid,processId:x.pid,shipId:x.sid,addedAt:now()}))}
   else if(x.kind==='quality')wfFiles.push(normWf({...r,orderId:x.qid,addedAt:now(),kind:'qs'}))
   else if(x.kind==='testReport')wfFiles.push(normWf({...r,orderId:x.tid,addedAt:now(),kind:'tr'}))
   else wfFiles.push(normWf({...r,orderId:x.oid,addedAt:now(),kind:x.kind==='purchaseOrder'?'po':'wo'}))}
  stEd=snap.stEd;
  const sm=rqSummary(P,R);if(!rqDoneIds.includes(P.req.id))rqDoneIds.push(P.req.id);rqLog.push({id:P.req.id,file,status:'done',at:new Date().toISOString(),summary:sm.slice(0,1000),...(ed?{edited:true,edits:edits.slice(0,100)}:{})});save();
  try{await A.reqResolve(file,'done',{id:P.req.id,backup:bk||'',applied:R.items.map(it=>({type:it.type,summary:it.summary,warnings:it.warns})),statementIds:R.ctx.stmtIds,...(ed?{edited:true,edits,originalActions:P0.req.actions,editedActions:P.req.actions,editedReq:P.req}:{}),attached:added.map(({x,r})=>({kind:x.kind,name:r.name,path:r.path}))})}catch(e){toast('적용했지만 요청 파일을 done 폴더로 옮기지 못했어요')}
  for(const f of oldF){try{await A.ssDelete(f.path)}catch(e){}}
  delete rqEdits[file];delete rqEditOn[file];rqPend=rqPend.filter(x=>x.file!==file);rqBadge();
  const open=R.ctx.stmtIds.length&&rqOpenAfter[file]!==false&&(rqOpenAfter[file]===true||R.items.some(it=>it.stmt&&it.open!==false));delete rqOpenAfter[file];
  if(open){go('stmt');editStmt(R.ctx.stmtIds[R.ctx.stmtIds.length-1])}else render();
  toast('요청을 적용했어요'+(ed?' (고친 내용으로)':'')+(R.ctx.stmtIds.length?` · 거래명세서 ${R.ctx.stmtIds.length}건 저장`:'')+(added.length?` · 파일 ${added.length}개 첨부`:''))}
 finally{rqBusy=false;rqBadge();if(page==='reqs')render()}}
async function rqReject(file){const P=rqPend.find(x=>x.file===file);if(!P||rqBusy)return;
 if(!await uiConfirm('이 요청을 거부할까요?\n데이터는 바뀌지 않고, 요청 파일은 rejected 폴더로 옮겨져요.'))return;
 try{await A.reqResolve(file,'rejected',{id:P.req.id,reason:'사용자가 거부함'})}catch(e){return uiAlert('요청 파일을 옮기지 못했어요: '+(e&&e.message||e))}
 rqLog.push({id:P.req.id,file,status:'rejected',at:new Date().toISOString(),summary:String(P.req.note||'').slice(0,300)});save();
 delete rqEdits[file];delete rqEditOn[file];rqPend=rqPend.filter(x=>x.file!==file);rqBadge();render();toast('요청을 거부했어요')}
// ---- 최근 처리 목록 지우기 (목록만 지움: done/rejected 폴더의 파일과 '적용한 id' 기록은 그대로) ----
function rqChoose(){const nd=rqLog.filter(x=>x.status==='done').length,nr=rqLog.filter(x=>x.status==='rejected').length;
 return new Promise(res=>{const d=document.createElement('dialog');d.className='uidlg';
  d.innerHTML=`<div class="db">최근 처리한 요청 목록에서 무엇을 지울까요?\n(적용 ${nd}건 · 거부 ${nr}건 — 목록만 지우고, 요청 파일과 데이터는 그대로예요)</div><div class="df"><button data-v="done"${nd?'':' disabled'}>적용만 삭제</button><button data-v="rejected"${nr?'':' disabled'}>거부만 삭제</button><button class="d" data-v="all"${nd+nr?'':' disabled'}>모두 삭제</button><span style="flex:1"></span><button data-v="">취소</button></div>`;
  const fin=v=>{try{d.close()}catch(e){}d.remove();res(v)};d.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)fin(b.dataset.v)});d.addEventListener('cancel',e=>{e.preventDefault();fin('')});
  document.body.appendChild(d);d.showModal();d.querySelector('button[data-v=""]').focus()})}
async function rqClearLog(){if(!rqLog.length)return;const v=await rqChoose();if(!v)return;const n0=rqLog.length;
 rqLog=v==='all'?[]:rqLog.filter(x=>x.status!==v);const n=n0-rqLog.length;if(!n)return;save();render();toast(`목록에서 ${n}건을 지웠어요`)}
// ---- 화면 ----
const rqPath=()=>rqInfo?rqInfo.inbox:'';
function rqFolderBar(){return `<div class="rqbar"><span class="muted">요청 파일 폴더</span><code class="rqp" title="${esc(rqPath())}">${esc(rqPath()||'-')}</code><button onclick="A.reqOpenFolder('inbox')">폴더 열기</button><button onclick="A.copyText(rqPath());toast('경로를 복사했어요')">경로 복사</button><button onclick="rqRefresh('manual');toast('요청함을 확인했어요')">지금 확인</button></div>`}
function rqCard(P){const E=rqEff(P),R=rqPreview(E),q=P.req,ed=rqIsEdited(P),on=!!rqEditOn[P.file],hasSt=R.items.some(it=>it.stmt),def=R.items.some(it=>it.stmt&&it.open!==false),chk=rqOpenAfter[P.file]==null?def:rqOpenAfter[P.file];
 const ct=q.createdAt&&!isNaN(Date.parse(q.createdAt))?new Date(q.createdAt).toLocaleString('ko-KR'):'';
 const act=R.items.map((it,i)=>`<div class="rqa${it.errors.length?' bad':''}"><div class="rqat"><span class="rqn2">${i+1}</span><span class="rqty">${esc(it.title)}</span><span>${esc(it.summary)}</span></div>${it.comment?`<div class="muted rqcm">${esc(it.comment)}</div>`:''}
  ${it.diff.length?`<table class="rqd"><tbody>${it.diff.map(([k,b,a])=>`<tr><th>${esc(k)}</th>${b!==''&&b===a?'<td class="rqb rqsame" colspan="2">그대로</td>':b!==''&&b!=null||it.type==='production.updateOrder'||it.type==='production.setDone'||k==='출고 소계'?`<td class="rqb">${esc(b)||'-'}</td><td class="rqar">→</td>`:'<td class="rqb rqnew" colspan="2">새로</td>'}<td class="rqv">${esc(a)}</td></tr>`).join('')}</tbody></table>`:''}
  ${on?rqForm(P,i,E.req.actions[i]):''}${it.table?`<table class="rqt"><thead><tr>${it.table.head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${it.table.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:''}
  ${it.file?`<div class="rqfl"><button data-r="${esc(it.file)}" onclick="A.reqFileOpen(this.dataset.r).then(r=>{if(r)uiAlert('파일을 열지 못했어요: '+r)})">📎 파일 열어 보기</button></div>`:''}${it.errors.map(e=>`<div class="rqe">⛔ ${esc(e)}</div>`).join('')}${it.warns.map(e=>`<div class="rqw">⚠ ${esc(e)}</div>`).join('')}</div>`).join('');
 return `<div class="card rqc${R.nerr?' bad':''}"><div class="rqch"><span class="rqsrc">Grok Bot 요청</span><b>${esc(q.note||'(메모 없음)')}</b>${ed?'<span class="rqmod">수정됨</span>':''}<span style="flex:1"></span>${ed?`<button data-f="${esc(P.file)}" onclick="rqEditReset(this.dataset.f)">원래대로</button>`:''}<button data-f="${esc(P.file)}" onclick="rqEditToggle(this.dataset.f)"${rqBusy?' disabled':''}>${on?'수정 닫기':'✎ 수정'}</button><span class="muted">${esc(ct)}</span></div>${on?'<datalist id="rqe_vl">'+rqVendors().map(x=>`<option value="${esc(x)}">`).join('')+'</datalist><div class="rqw">✎ 수정 중 — 칸을 고치고 다른 곳을 누르면 아래 미리보기와 검사가 바로 다시 계산돼요. 원래 요청 파일은 그대로 두고, 적용할 때 고친 내용과 원래 내용을 함께 기록해요.</div>':''}
 <div class="muted rqmeta">id ${esc(q.id)} · 파일 ${esc(P.file)} · 동작 ${R.items.length}개</div>${R.top.map(e=>`<div class="rqe">⛔ ${esc(e)}</div>`).join('')}${act}
 <div class="rqf">${hasSt?`<label class="rqo"><input type="checkbox" ${chk?'checked':''} data-f="${esc(P.file)}" onchange="rqOpenAfter[this.dataset.f]=this.checked"> 적용한 뒤 거래명세서 열기</label>`:''}<span style="flex:1"></span>${R.nerr?`<span class="neg">오류 ${R.nerr}건 — 적용할 수 없어요 (고친 요청을 다시 받거나 거부하세요)</span>`:''}
 <button class="d" data-f="${esc(P.file)}" onclick="rqReject(this.dataset.f)"${rqBusy?' disabled':''}>거부</button><button class="p" data-f="${esc(P.file)}" onclick="rqApply(this.dataset.f)"${R.nerr||rqBusy?' disabled':''}>적용</button></div></div>`}
function renderReqs(){const el=$('rq_wrap');if(!el)return;
 const log=rqLog.slice(-8).reverse();
 el.innerHTML=`<div class="card"><h2>요청함 <span class="muted" style="font-weight:normal">— Grok Bot이 보낸 작업 요청. 카드를 확인하고 [적용]을 눌러야 반영돼요 (적용 전에 자동 백업)</span></h2>${rqFolderBar()}</div>
 ${rqPend.length?rqPend.map(rqCard).join(''):'<div class="card"><p class="muted" style="margin:0">대기 중인 요청이 없습니다.</p></div>'}
 ${rqErrs.length?`<div class="card"><h2>읽지 못한 요청 파일 <span class="muted" style="font-weight:normal">(error 폴더로 옮김)</span><button style="float:right" onclick="A.reqOpenFolder('error')">error 폴더 열기</button></h2><ul class="rql">${rqErrs.map(e=>`<li><b>${esc(e.file)}</b> — ${esc(e.reason)}</li>`).join('')}</ul></div>`:''}
 ${log.length?`<div class="card"><h2>최근 처리한 요청 <span class="muted" style="font-weight:normal;font-size:12px">(최근 8건 표시 · ${rqLog.length}건 보관, 500건까지)</span><button style="float:right" onclick="rqClearLog()">목록 지우기</button></h2><ul class="rql">${log.map(x=>`<li><span class="badge ${x.status==='done'?'rqok':''}">${x.status==='done'?'적용':'거부'}</span>${esc(x.at?new Date(x.at).toLocaleString('ko-KR'):'')} · ${esc(x.id)}${x.edited?' <span class="rqmod">수정됨</span>':''}<br><small class="muted" style="white-space:pre-line">${esc(x.summary)}</small></li>`).join('')}</ul></div>`:''}`}
function rqSettings(){const el=$('rq_card');if(!el)return;el.innerHTML=`<h2>요청함 (Grok Bot 요청 받기)</h2><p class="muted" style="margin:0 0 8px">이 폴더에 들어온 요청 파일(JSON)은 [요청함] 메뉴에 카드로 나타나요. 직접 [적용]을 누르기 전에는 아무것도 바뀌지 않아요.</p>${rqFolderBar()}<div class="muted" style="margin-top:6px;font-size:12px">처리된 파일: requests\\done · 거부: requests\\rejected · 형식 오류: requests\\error</div>`}
