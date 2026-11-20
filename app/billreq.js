// ===== 요청함: 청구서 나누기 (bill.split · bill.create · bill.moveLines · bill.merge · bill.update) =====
// 청구서 찾기: billId(스냅샷 bills[].id) 또는 month+client(+billLabel: 같은 달·거래처에 여러 장일 때 구분명, 없으면 기본 청구서)
// 줄 찾기: lines:[{orderNo?, item?, lineId?}] — 적은 항목이 모두 맞는 줄. 항목마다 적어도 한 줄은 맞아야 함
// 청구완료(잠금) 청구서는 나누기·옮기기·합치기를 하지 않음(오류). 앱에서 잠금을 풀고 다시 요청하세요.
Object.assign(RQ_T,{'bill.split':'청구서 나누기','bill.create':'청구서 추가','bill.moveLines':'청구서 줄 옮기기','bill.merge':'청구서 합치기','bill.update':'청구서 정보 수정'});
const BR_SRC=['billId','month','client','billLabel'],BR_TO=['toBillId','toLabel','toPrimary'];
Object.assign(RQ_KEYS,{'bill.split':[...BR_SRC,'lines','label'],'bill.create':['month','client','label','issueDate','dest','memo'],'bill.moveLines':[...BR_SRC,...BR_TO,'lines'],'bill.merge':[...BR_SRC,...BR_TO],'bill.update':[...BR_SRC,'set']});
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
Object.assign(RQ_H,{
 'bill.split'(a,it){const F=brFind(a,it);it.summary=`${F?brName(F):'청구서'}에서 줄을 골라 새 청구서${rqS(a.label)?` '${rqS(a.label)}'`:''}로 나눕니다`;if(!F||brLock(F,it,'나눌'))return;
  const S=brSel(F.id,a.lines,it);if(!S||it.errors.length)return;const v=blView(F.id);if(S.length===v.lines.length)it.warns.push('모든 줄을 옮겨 원래 청구서는 비게 됩니다');
  if(rqS(a.label)&&blGroup(F.ym,F.client).some(b=>b.label===rqS(a.label)))it.warns.push(`같은 구분명 '${rqS(a.label)}' 청구서가 이미 있습니다`);
  const b=blSplitCore(F.id,S,rqS(a.label));const nv=blView(b.id),ov=blView(F.id);
  it.diff=[['새 청구서','',brName(b)+` (id ${b.id})`],['옮긴 줄','',S.length+'줄'],['원래 청구서 총액',blWon(v.T.tot),blWon(ov.T.tot)],['새 청구서 총액','',blWon(nv.T.tot)]];it.table=brTbl(S)},
 'bill.create'(a,it){const ym=rqS(a.month),c=rqS(a.client);if(!/^\d{4}-\d{2}$/.test(ym))it.errors.push('month(YYYY-MM)가 없습니다');if(!c)it.errors.push('client(거래처)가 없습니다');
  const is=a.issueDate==null||a.issueDate===''?'':rqDate(a.issueDate,'issueDate(세금계산서 발행 일자)',it);it.summary=`${ym} ${c} 청구서를 새로 만듭니다${rqS(a.label)?` (${rqS(a.label)})`:''}`;if(it.errors.length||is===null)return;
  const G=blGroup(ym,c),P=blKey(ym,c);let b;if(!bills[P]&&blView(P).empty&&G.length===1){b=blGet(P);b.manual=true;b.label=rqS(a.label)}else{if(rqS(a.label)&&G.some(x=>x.label===rqS(a.label)))it.warns.push(`같은 구분명 '${rqS(a.label)}' 청구서가 이미 있습니다`);b=blNewSplit(ym,c,rqS(a.label))}
  if(is)b.issue=is;if(rqS(a.dest))b.dest=rqS(a.dest);if(rqS(a.memo))b.memo=rqS(a.memo);
  it.diff=[['청구서','',brName(b)+` (id ${b.id})`],['발행 일자','',b.issue],['도착지','',b.dest],['비고','',b.memo]].filter(r=>r[2]!=='')},
 'bill.moveLines'(a,it){const F=brFind(a,it),T=F&&brTo(a,F,it);it.summary=`${F?brName(F):'청구서'}의 줄을 ${T?brName(T):'다른 청구서'}로 옮깁니다`;if(!F||!T)return;
  if(F.id===T.id){it.errors.push('옮길 곳이 같은 청구서입니다');return}if(brLock(F,it,'줄을 뺄')||brLock(T,it,'줄을 넣을'))return;const S=brSel(F.id,a.lines,it);if(!S||it.errors.length)return;
  const f0=blView(F.id).T.tot,t0=blView(T.id).T.tot;blMoveCore(F.id,T.id,S);it.diff=[['옮긴 줄','',S.length+'줄'],[brName(F)+' 총액',blWon(f0),blWon(blView(F.id).T.tot)],[brName(T)+' 총액',blWon(t0),blWon(blView(T.id).T.tot)]];it.table=brTbl(S)},
 'bill.merge'(a,it){const F=brFind(a,it),T=F&&brTo(a,F,it);it.summary=`${F?brName(F):'청구서'}를 ${T?brName(T):'기본 청구서'}로 합칩니다`;if(!F||!T)return;
  if(blIsPrim(F)){it.errors.push('기본 청구서는 합칠 수 없습니다 — 나눈 청구서(billLabel/billId)를 지정하세요');return}if(F.id===T.id){it.errors.push('합칠 곳이 같은 청구서입니다');return}
  if(brLock(F,it,'합칠')||brLock(T,it,'합칠'))return;const S=blView(F.id).lines,t0=blView(T.id).T.tot;blMergeCore(F.id,T.id);it.diff=[['합친 줄','',S.length+'줄'],[brName(T)+' 총액',blWon(t0),blWon(blView(T.id).T.tot)],['없앤 청구서',brName(F),'']];it.table=brTbl(S)},
 'bill.update'(a,it){const F=brFind(a,it),s=a.set;if(!rqObj(s)||!Object.keys(s).length){it.errors.push('set(바꿀 항목) 객체가 비어 있습니다');return}
  const bad=Object.keys(s).filter(k=>!['label','issueDate','dest','memo'].includes(k));if(bad.length)it.errors.push(`set에서 바꿀 수 없는 항목: ${bad.join(', ')} (가능: label, issueDate, dest, memo)`);
  const is='issueDate' in s&&s.issueDate!==''&&s.issueDate!=null?rqDate(s.issueDate,'set.issueDate',it):'';it.summary=`${F?brName(F):'청구서'} 정보를 바꿉니다`;if(!F||it.errors.length||is===null)return;
  if(F.locked&&Object.keys(s).some(k=>k!=='label')){brLock(F,it,'발행 일자·도착지·비고를 바꿀');return}
  const b0={...F},LB={label:'구분명',issue:'발행 일자',dest:'도착지',memo:'비고'};if('label' in s)F.label=rqS(s.label);if('issueDate' in s)F.issue=is||'';if('dest' in s)F.dest=rqS(s.dest);if('memo' in s)F.memo=rqS(s.memo);
  it.diff=Object.keys(LB).filter(k=>b0[k]!==F[k]).map(k=>[LB[k],b0[k],F[k]]);if(!it.diff.length)it.warns.push('바뀌는 내용이 없습니다')}});
