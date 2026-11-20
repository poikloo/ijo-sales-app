// ===== 요청함: 청구서 (bill.split · bill.create · bill.moveLines · bill.merge · bill.update · bill.addLine · bill.updateLine · bill.removeLine · bill.remove) =====
// 수동 줄(addLine/updateLine/removeLine)은 자동 계산이 절대 바꾸거나 지우지 않음. 청구완료 청구서는 allowLocked:true일 때만 고치고(카드에 빨간 경고), 잠금은 그대로 유지
// 청구서 찾기: billId(스냅샷 bills[].id) 또는 month+client(+billLabel: 같은 달·거래처에 여러 장일 때 구분명, 없으면 기본 청구서)
// 줄 찾기: lines:[{orderNo?, item?, lineId?}] — 적은 항목이 모두 맞는 줄. 항목마다 적어도 한 줄은 맞아야 함
// 청구완료(잠금) 청구서는 나누기·옮기기·합치기를 하지 않음(오류). 앱에서 잠금을 풀고 다시 요청하세요.
Object.assign(RQ_T,{'bill.addLine':'청구서 줄 추가','bill.updateLine':'청구서 줄 수정','bill.removeLine':'청구서 줄 삭제','bill.remove':'청구서 삭제','bill.split':'청구서 나누기','bill.create':'청구서 추가','bill.moveLines':'청구서 줄 옮기기','bill.merge':'청구서 합치기','bill.update':'청구서 정보 수정'});
const BR_SRC=['billId','month','client','billLabel'],BR_TO=['toBillId','toLabel','toPrimary'];
Object.assign(RQ_KEYS,{'bill.split':[...BR_SRC,'lines','label'],'bill.create':['month','client','label','issueDate','dest','memo','autoLines'],'bill.moveLines':[...BR_SRC,...BR_TO,'lines'],'bill.merge':[...BR_SRC,...BR_TO],'bill.update':[...BR_SRC,'set','convertAuto','allowLocked'],'bill.addLine':[...BR_SRC,'orderNo','item','spec','color','qty','unitPrice','memo','date','allowLocked'],'bill.updateLine':[...BR_SRC,'line','lineId','set','allowLocked'],'bill.removeLine':[...BR_SRC,'lines','allowLocked'],'bill.remove':[...BR_SRC,'force','allowLocked']});
const brName=b=>`${b.ym} ${b.client}${b.label?' · '+b.label:blIsPrim(b)?' (기본)':' · 나눔'}`;
function brFind(a,it,w){w=w||'';const id=rqS(a.billId);
 if(id){if(bills[id])return bills[id];if(/^\d{4}-\d{2}\|./.test(id)&&blMonth(id.slice(0,7)).some(v=>v.key===id))return blGet(id);it.errors.push(`${w}billId '${id}' 청구서를 찾을 수 없습니다`);return null}
 const ym=rqS(a.month),c=rqS(a.client);if(!/^\d{4}-\d{2}$/.test(ym)){it.errors.push(`${w}billId 또는 month(YYYY-MM)+client가 필요합니다`);return null}if(!c){it.errors.push(`${w}client(거래처)가 없습니다`);return null}
 const cs=new Set([...Object.keys(blAuto(ym)),...Object.values(bills).filter(b=>b.ym===ym).map(b=>b.client)]),cl=[...cs].find(x=>x===c)||[...cs].find(x=>blNk(x)===blNk(c));
 if(!cl){it.errors.push(`${ym} '${c}' 청구서를 찾을 수 없습니다`);return null}const G=blGroup(ym,cl);
 if(a.billLabel!=null&&rqS(a.billLabel)!==''){const L=G.filter(b=>b.label===rqS(a.billLabel));if(!L.length){it.errors.push(`${ym} ${cl}에 구분명 '${rqS(a.billLabel)}' 청구서가 없습니다 (있는 것: ${G.map(b=>b.label||'(기본)').join(', ')})`);return null}if(L.length>1){it.errors.push(`구분명 '${rqS(a.billLabel)}' 청구서가 ${L.length}장입니다 — billId로 지정하세요`);return null}return blGet(L[0].id)}
 return blGet(G[0].id)}
function brTo(a,F,it){const n=BR_TO.filter(k=>a[k]!=null&&a[k]!=='').length;if(n>1){it.errors.push('toBillId · toLabel · toPrimary 중 하나만 적으세요');return null}const G=blGroup(F.ym,F.client);
 if(rqS(a.toBillId)){const b=G.find(x=>x.id===rqS(a.toBillId));if(!b){it.errors.push(`toBillId '${rqS(a.toBillId)}'은(는) 같은 달 · 같은 거래처 청구서가 아닙니다`);return null}return blGet(b.id)}
 if(rqS(a.toLabel)){const L=G.filter(b=>b.label===rqS(a.toLabel));if(L.length!==1){it.errors.push(L.length?`구분명 '${rqS(a.toLabel)}' 청구서가 ${L.length}장입니다 — toBillId로 지정하세요`:`옮길 곳: 구분명 '${rqS(a.toLabel)}' 청구서가 없습니다`);return null}return blGet(L[0].id)}
 if(a.toPrimary!=null&&a.toPrimary!==true){it.errors.push('toPrimary는 true만 쓸 수 있습니다');return null}return blGet(G[0].id)}
function brSel(key,L,it){const v=blView(key);if(!Array.isArray(L)||!L.length){it.errors.push('lines(옮길 줄)가 비어 있습니다 — [{orderNo} 또는 {item} 또는 {lineId}]');return null}const out=new Set();let ok=true;
 L.forEach((q,i)=>{if(!rqObj(q)){it.errors.push(`lines[${i}]이(가) 객체가 아닙니다`);ok=false;return}rqExtra(q,['orderNo','item','lineId'],`lines[${i}]`,it);const o=rqS(q.orderNo),t=rqS(q.item),id=rqS(q.lineId);
  if(!o&&!t&&!id){it.errors.push(`lines[${i}]에 orderNo · item · lineId 중 하나가 필요합니다`);ok=false;return}
  const m=v.lines.filter(l=>(!o||blNk(l.orderNo)===blNk(o))&&(!t||blNk(l.item)===blNk(t))&&(!id||l.id===id));if(!m.length){it.errors.push(`lines[${i}] (${[o,t,id].filter(Boolean).join(' · ')})에 맞는 줄이 '${brName(v.b)}' 청구서에 없습니다`);ok=false;return}m.forEach(l=>out.add(l))});
 return ok?[...out]:null}
const brTbl=S=>({head:['품명','오더','수량','총액'],rows:S.map(l=>[l.item,l.orderNo||'-',num(+l.qty||0),blWon(l.c.tot)])});
const brLock=(b,it,what)=>{if(b&&b.locked){it.errors.push(`'${brName(b)}' 청구서는 청구완료(잠금) 상태라 ${what} 수 없습니다 — 앱에서 잠금을 푼 뒤 다시 요청하세요`);return true}return false};
// 잠긴 청구서: allowLocked:true면 허용하고 카드에 빨간 경고, 아니면 오류
function brLockOk(b,a,it,what){if(!b||!b.locked)return true;if(a.allowLocked!=null&&typeof a.allowLocked!=='boolean'){it.errors.push('allowLocked는 true/false여야 합니다');return false}
 if(a.allowLocked===true){it.alerts.push(`청구완료 청구서 수정: '${brName(b)}' — ${what} (적용 후에도 청구완료 잠금 유지)`);return true}
 it.errors.push(`'${brName(b)}' 청구서는 청구완료(잠금) 상태입니다 — ${what}하려면 allowLocked: true (사용자 확인 필요)`);return false}
// 수동 줄 칸 읽기 (spec 대신 color도 됨). need=true면 item·qty·unitPrice 필수
function brLineIn(o,it,w,need){const L={};const has=k=>o[k]!=null&&o[k]!=='';
 if(has('item'))L.item=rqS(o.item);else if(need)it.errors.push(`${w}item(품명)이 없습니다`);
 if(has('spec')||has('color'))L.spec=rqS(has('spec')?o.spec:o.color);if('orderNo' in o)L.orderNo=rqS(o.orderNo);if('memo' in o)L.memo=rqS(o.memo);
 if(has('qty')){const n=rqN(o.qty);if(isNaN(n))it.errors.push(`${w}qty '${o.qty}'이(가) 숫자가 아닙니다`);else L.qty=n}else if(need)it.errors.push(`${w}qty(수량, 빼는 줄은 음수)가 없습니다`);
 if(has('unitPrice')){const n=rqN(o.unitPrice);if(isNaN(n))it.errors.push(`${w}unitPrice '${o.unitPrice}'이(가) 숫자가 아닙니다`);else{L.price=n;if(n<0)it.warns.push(`${w}unitPrice가 음수입니다 — 빼는 줄은 보통 qty를 음수로 적어요`)}}else if(need)it.errors.push(`${w}unitPrice(단가)가 없습니다`);
 if(has('date')){const d=rqDate(o.date,`${w}date`,it);if(d)L.date=d}else if('date' in o)L.date='';
 if(need&&L.qty===0)it.warns.push(`${w}qty가 0입니다`);return L}
// 수동 줄만 찾기 (자동 줄이 맞으면 오류로 안내)
function brManual(key,Q,it,w){if(!Array.isArray(Q)||!Q.length){it.errors.push(`${w}가 비어 있습니다 — [{lineId} 또는 {orderNo} 또는 {item}]`);return null}const v=blView(key),out=new Set();let ok=true;
 Q.forEach((q,i)=>{if(!rqObj(q)){it.errors.push(`${w}[${i}]이(가) 객체가 아닙니다`);ok=false;return}const o=rqS(q.orderNo),t=rqS(q.item),id=rqS(q.lineId);if(!o&&!t&&!id){it.errors.push(`${w}[${i}]에 lineId · orderNo · item 중 하나가 필요합니다`);ok=false;return}
  const f=l=>(!o||blNk(l.orderNo)===blNk(o))&&(!t||blNk(l.item)===blNk(t))&&(!id||l.id===id),m=v.lines.filter(l=>l.src==='manual'&&f(l));
  if(!m.length){it.errors.push(v.lines.some(f)?`${w}[${i}] (${[o,t,id].filter(Boolean).join(' · ')})는 자동 줄입니다 — 자동 줄은 고치거나 지울 수 없어요 (bill.update set{autoLines:false} + convertAuto:true 로 수동 줄로 바꾼 뒤)`:`${w}[${i}] (${[o,t,id].filter(Boolean).join(' · ')})에 맞는 수동 줄이 '${brName(v.b)}' 청구서에 없습니다`);ok=false;return}m.forEach(l=>out.add(l))});
 return ok?[...out]:null}
Object.assign(RQ_H,{
 'bill.split'(a,it){const F=brFind(a,it);it.summary=`${F?brName(F):'청구서'}에서 줄을 골라 새 청구서${rqS(a.label)?` '${rqS(a.label)}'`:''}로 나눕니다`;if(!F||brLock(F,it,'나눌'))return;
  const S=brSel(F.id,a.lines,it);if(!S||it.errors.length)return;const v=blView(F.id);if(S.length===v.lines.length)it.warns.push('모든 줄을 옮겨 원래 청구서는 비게 됩니다');
  if(rqS(a.label)&&blGroup(F.ym,F.client).some(b=>b.label===rqS(a.label)))it.warns.push(`같은 구분명 '${rqS(a.label)}' 청구서가 이미 있습니다`);
  const b=blSplitCore(F.id,S,rqS(a.label));const nv=blView(b.id),ov=blView(F.id);
  it.diff=[['새 청구서','',brName(b)+` (id ${b.id})`],['옮긴 줄','',S.length+'줄'],['원래 청구서 총액',blWon(v.T.tot),blWon(ov.T.tot)],['새 청구서 총액','',blWon(nv.T.tot)]];it.table=brTbl(S)},
 'bill.create'(a,it){const ym=rqS(a.month),c=rqS(a.client);if(!/^\d{4}-\d{2}$/.test(ym))it.errors.push('month(YYYY-MM)가 없습니다');if(!c)it.errors.push('client(거래처)가 없습니다');
  const is=a.issueDate==null||a.issueDate===''?'':rqDate(a.issueDate,'issueDate(세금계산서 발행 일자)',it);it.summary=`${ym} ${c} 청구서를 새로 만듭니다${rqS(a.label)?` (${rqS(a.label)})`:''}`;if(it.errors.length||is===null)return;
  if(a.autoLines!=null&&typeof a.autoLines!=='boolean'){it.errors.push('autoLines는 true/false여야 합니다');return}const man=a.autoLines===false;
  const G=blGroup(ym,c),P=blKey(ym,c);let b;if(man){b=blNewSplit(ym,c,rqS(a.label));b.auto=false;b.manual=true}else if(!bills[P]&&blView(P).empty&&G.length===1){b=blGet(P);b.manual=true;b.label=rqS(a.label)}else{if(rqS(a.label)&&G.some(x=>x.label===rqS(a.label)))it.warns.push(`같은 구분명 '${rqS(a.label)}' 청구서가 이미 있습니다`);b=blNewSplit(ym,c,rqS(a.label))}
  if(is)b.issue=is;if(rqS(a.dest))b.dest=rqS(a.dest);if(rqS(a.memo))b.memo=rqS(a.memo);
  it.diff=[['청구서','',brName(b)+` (id ${b.id})`],['자동 줄','',b.auto?'켜짐':'꺼짐 (수동 청구서)'],['발행 일자','',b.issue],['도착지','',b.dest],['비고','',b.memo]].filter(r=>r[2]!=='')},
 'bill.moveLines'(a,it){const F=brFind(a,it),T=F&&brTo(a,F,it);it.summary=`${F?brName(F):'청구서'}의 줄을 ${T?brName(T):'다른 청구서'}로 옮깁니다`;if(!F||!T)return;
  if(F.id===T.id){it.errors.push('옮길 곳이 같은 청구서입니다');return}if(brLock(F,it,'줄을 뺄')||brLock(T,it,'줄을 넣을'))return;const S=brSel(F.id,a.lines,it);if(!S||it.errors.length)return;
  const f0=blView(F.id).T.tot,t0=blView(T.id).T.tot;blMoveCore(F.id,T.id,S);it.diff=[['옮긴 줄','',S.length+'줄'],[brName(F)+' 총액',blWon(f0),blWon(blView(F.id).T.tot)],[brName(T)+' 총액',blWon(t0),blWon(blView(T.id).T.tot)]];it.table=brTbl(S)},
 'bill.merge'(a,it){const F=brFind(a,it),T=F&&brTo(a,F,it);it.summary=`${F?brName(F):'청구서'}를 ${T?brName(T):'기본 청구서'}로 합칩니다`;if(!F||!T)return;
  if(blIsPrim(F)){it.errors.push('기본 청구서는 합칠 수 없습니다 — 나눈 청구서(billLabel/billId)를 지정하세요');return}if(F.id===T.id){it.errors.push('합칠 곳이 같은 청구서입니다');return}
  if(brLock(F,it,'합칠')||brLock(T,it,'합칠'))return;const S=blView(F.id).lines,t0=blView(T.id).T.tot;blMergeCore(F.id,T.id);it.diff=[['합친 줄','',S.length+'줄'],[brName(T)+' 총액',blWon(t0),blWon(blView(T.id).T.tot)],['없앤 청구서',brName(F),'']];it.table=brTbl(S)},
 'bill.update'(a,it){const F=brFind(a,it),s=a.set;if(!rqObj(s)||!Object.keys(s).length){it.errors.push('set(바꿀 항목) 객체가 비어 있습니다');return}
  const OK=['label','issueDate','dest','memo','month','autoLines'],bad=Object.keys(s).filter(k=>!OK.includes(k));if(bad.length)it.errors.push(`set에서 바꿀 수 없는 항목: ${bad.join(', ')} (가능: ${OK.join(', ')})`);
  const is='issueDate' in s&&s.issueDate!==''&&s.issueDate!=null?rqDate(s.issueDate,'set.issueDate',it):'';
  if('month' in s&&!/^\d{4}-\d{2}$/.test(rqS(s.month)))it.errors.push(`set.month '${rqS(s.month)}'은(는) YYYY-MM이어야 합니다`);
  if('autoLines' in s&&typeof s.autoLines!=='boolean')it.errors.push('set.autoLines는 true/false여야 합니다');if(a.convertAuto!=null&&typeof a.convertAuto!=='boolean')it.errors.push('convertAuto는 true/false여야 합니다');
  it.summary=`${F?brName(F):'청구서'} 정보를 바꿉니다`;if(!F||it.errors.length||is===null)return;
  if(F.locked&&Object.keys(s).some(k=>k!=='label')&&!brLockOk(F,a,it,'발행 일자·도착지·비고·월·자동 줄 변경'))return;
  const b0={...F,ym:F.ym,auto:F.auto},v0=blView(F.id),LB={label:'구분명',issue:'발행 일자',dest:'도착지',memo:'비고'};
  if('label' in s)F.label=rqS(s.label);if('issueDate' in s)F.issue=is||'';if('dest' in s)F.dest=rqS(s.dest);if('memo' in s)F.memo=rqS(s.memo);
  const nA=blAutoLines(F.id).length,conv=a.convertAuto===true,off=s.autoLines===false&&F.auto,mv='month' in s&&rqS(s.month)!==F.ym;
  if((off||mv)&&nA)it.warns.push(conv?`자동 줄 ${nA}줄을 지금 값 그대로 수동 줄로 바꿉니다`:`자동 줄 ${nA}줄은 이 청구서에서 빠집니다 (${mv?'원래 달':'자동 줄을 받는 다른'} 청구서로) — 남기려면 convertAuto: true`);
  let k=F.id;if(off)blSetAuto(k,false,conv);if(mv)k=blSetMonth(k,rqS(s.month),conv);if(s.autoLines===true&&!bills[k].auto)blSetAuto(k,true);if(F.locked)blRefreeze(F);
  it.diff=Object.keys(LB).filter(x=>b0[x]!==F[x]).map(x=>[LB[x],b0[x],F[x]]);if(mv)it.diff.push(['청구 월',b0.ym,F.ym],['청구서 id',b0.id,F.id]);if(b0.auto!==F.auto)it.diff.push(['자동 줄',b0.auto?'켜짐':'꺼짐',F.auto?'켜짐':'꺼짐']);
  const v1=blView(F.id);if(v1.T.tot!==v0.T.tot)it.diff.push(['총액',blWon(v0.T.tot),blWon(v1.T.tot)]);if(!it.diff.length)it.warns.push('바뀌는 내용이 없습니다')},
 'bill.addLine'(a,it){const F=brFind(a,it),L=brLineIn(a,it,'',true);it.summary=`${F?brName(F):'청구서'}에 수동 줄${L&&L.item?` '${L.item}'`:''}을(를) 추가합니다`;if(!F||!L||it.errors.length||!brLockOk(F,a,it,'수동 줄 추가'))return;
  const t0=blView(F.id).T.tot,l=blNormLine({src:'manual',...L});F.lines.push(l);blRefreeze(F);const c=blCalc(l);
  if(F.auto&&L.orderNo&&blView(F.id).lines.some(x=>x.src==='auto'&&blNk(x.orderNo)===blNk(L.orderNo)))it.warns.push(`같은 오더 ${L.orderNo}의 자동 줄이 이 청구서에 있습니다 — 겹쳐 청구되지 않는지 확인하세요`);
  it.diff=[['품명','',l.item],['오더번호','',l.orderNo],['규격/색상','',l.spec],['수량','',num(l.qty)],['단가','',blWon(l.price)],['공급가액','',blWon(c.sup)],['부가세','',blWon(c.vat)],['총액','',blWon(c.tot)],['비고','',l.memo],['일자','',l.date],['청구서 총액',blWon(t0),blWon(blView(F.id).T.tot)]].filter(r=>r[2]!==''||r[0]==='수량')},
 'bill.updateLine'(a,it){const F=brFind(a,it),q=rqObj(a.line)?a.line:(a.lineId!=null?{lineId:a.lineId}:null),s=a.set;if(!q)it.errors.push('line({lineId} 또는 {orderNo, item})이 없습니다');if(!rqObj(s)||!Object.keys(s).length)it.errors.push('set(바꿀 항목) 객체가 비어 있습니다');
  const L=rqObj(s)?brLineIn(s,it,'set.',false):null;it.summary=`${F?brName(F):'청구서'}의 수동 줄을 고칩니다`;if(!F||!q||!L||it.errors.length||!brLockOk(F,a,it,'수동 줄 수정'))return;
  const m=brManual(F.id,[q],it,'line');if(!m)return;if(m.length>1){it.errors.push(`line에 맞는 수동 줄이 ${m.length}개입니다 — lineId로 지정하세요`);return}
  const l=F.lines.find(x=>x.id===m[0].id),b0={...l},t0=blView(F.id).T.tot;Object.assign(l,blNormLine({...l,...L}));blRefreeze(F);
  const LB={item:'품명',orderNo:'오더번호',spec:'규격/색상',qty:'수량',price:'단가',memo:'비고',date:'일자'};it.diff=Object.keys(LB).filter(k=>b0[k]!==l[k]).map(k=>[LB[k],String(b0[k]),String(l[k])]);it.diff.push(['청구서 총액',blWon(t0),blWon(blView(F.id).T.tot)]);if(it.diff.length<2)it.warns.push('바뀌는 내용이 없습니다')},
 'bill.removeLine'(a,it){const F=brFind(a,it);it.summary=`${F?brName(F):'청구서'}에서 수동 줄을 지웁니다`;if(!F||!brLockOk(F,a,it,'수동 줄 삭제'))return;const m=brManual(F.id,a.lines,it,'lines');if(!m)return;
  const t0=blView(F.id).T.tot,ids=new Set(m.map(l=>l.id));F.lines=F.lines.filter(l=>!ids.has(l.id));blRefreeze(F);it.diff=[['지운 줄','',m.length+'줄'],['청구서 총액',blWon(t0),blWon(blView(F.id).T.tot)]];it.table=brTbl(m)},
 'bill.remove'(a,it){const F=brFind(a,it);if(a.force!=null&&typeof a.force!=='boolean')it.errors.push('force는 true/false여야 합니다');it.summary=`${F?brName(F):'청구서'}를 삭제합니다`;if(!F||it.errors.length)return;
  if(!bills[F.id]){it.errors.push(`'${brName(F)}'는 자동 줄로만 보이는 청구서라 지울 수 없습니다 (자동 줄은 다시 생김) — 수동 청구서로 쓰려면 bill.update set{autoLines:false}`);return}
  const v=blView(F.id);if(v.lines.length&&a.force!==true){it.errors.push(`이 청구서에 줄이 ${v.lines.length}개 있습니다 — 지우려면 force: true`);return}if(!brLockOk(F,a,it,'청구서 삭제'))return;
  const nA=F.auto?v.lines.filter(l=>l.src==='auto').length:0;blRemoveCore(F.id);if(nA)it.warns.push(`자동 줄 ${nA}줄은 자동 줄을 받는 다른 청구서로 돌아갑니다`);
  it.diff=[['지운 청구서',brName(F)+` (id ${F.id})`,''],['줄',v.lines.length+'줄',''],['총액',blWon(v.T.tot),'']];if(v.lines.length)it.table=brTbl(v.lines)}});
