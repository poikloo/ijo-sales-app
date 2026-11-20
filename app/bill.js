// ===== 청구서 (월말 결산: 같은 달 · 같은 거래처 = 기본 한 장, 필요하면 여러 장으로 나누기) =====
// 청구서 id: 기본 = '월|거래처', 나눈 청구서 = '월|거래처#고유값'. 나눈 청구서는 own[]에 자기 자동 줄(ref)을 기억 → 자동 줄을 다시 계산해도 다시 합쳐지지 않음 (새 자동 줄은 기본 청구서로)
// 자동 줄 끄기(auto:false): 그 청구서에는 자동 줄이 들어오지 않음(수동 줄만). 기본 청구서가 자동 줄을 끄면 그 달 자동 줄은 '월|거래처#auto' 청구서로(자동 줄이 있을 때만 생김)
// 자동 줄: 매출 관리 행(오더번호) 수량·단가 그대로. 매출 행 없는 오더는 최종 납품(없으면 최종 공정 출고, 그 달) × 최근 단가
let bills={},billInfo={},blYm='',blSel=null,blF={k:'',st:''},blDraft=null;
const BL_INFO=[['name','청구인 (상호)'],['ceo','대표'],['addr','주소'],['bank','은행'],['holder','예금주'],['account','계좌번호']];
const blKey=(ym,c)=>ym+'|'+c;
const f10=n=>{n=+n||0;return n<0?-Math.floor(-n/10)*10:Math.floor(n/10)*10};
const blWon=n=>(Math.round(+n||0)).toLocaleString('ko-KR');
const blNk=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
const blCurYm=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
function blNormLine(l){l=l&&typeof l==='object'?l:{};const n=k=>{const v=+String(l[k]==null?'':l[k]).replace(/,/g,'');return isFinite(v)?v:0};
 return {id:String(l.id||uid()),src:l.src==='auto'?'auto':'manual',ref:String(l.ref||''),edited:!!l.edited,removed:!!l.removed,date:/^\d{4}-\d{2}-\d{2}$/.test(l.date||'')?l.date:'',
  item:String(l.item||''),spec:String(l.spec||''),orderNo:String(l.orderNo||''),qty:n('qty'),price:n('price'),vat:l.vat==='inc'?'inc':'ex',total:n('total'),memo:String(l.memo||''),autoQty:n('autoQty'),autoPrice:n('autoPrice')}}
function blNormBill(b){b=b&&typeof b==='object'?b:{};const ym=/^\d{4}-\d{2}$/.test(b.ym||'')?b.ym:blCurYm(),client=String(b.client||'');return {id:String(b.id||blKey(ym,client)),label:String(b.label||'').trim(),own:(Array.isArray(b.own)?b.own:[]).map(String).filter(Boolean),created:String(b.created||''),ym,client,auto:b.auto!==false,manual:!!b.manual,locked:!!b.locked,lockedAt:String(b.lockedAt||''),
 issue:/^\d{4}-\d{2}-\d{2}$/.test(b.issue||'')?b.issue:'',dest:String(b.dest||''),memo:String(b.memo||''),lines:(Array.isArray(b.lines)?b.lines:[]).map(blNormLine),frozen:b.frozen&&typeof b.frozen==='object'?b.frozen:null}}
function blLoad(r){const o=r&&!Array.isArray(r)&&r.bills&&typeof r.bills==='object'?r.bills:{};bills={};
 // 예전 데이터(키 '월|거래처', id 없음) → id = 키 그대로(기본 청구서). id가 그 달·거래처와 안 맞거나 겹치면 안전하게 다시 매김
 Object.entries(o).forEach(([k,x])=>{if(!x||typeof x!=='object')return;const b=blNormBill({...x,id:x.id||k});if(!b.client)return;const P=blKey(b.ym,b.client);
  if(b.id!==P&&!b.id.startsWith(P+'#'))b.id=bills[P]?P+'#'+uid():P;if(bills[b.id])b.id=P+'#'+uid();if(b.id===P)b.own=[];bills[b.id]=b});
 const i=r&&!Array.isArray(r)&&r.billInfo&&typeof r.billInfo==='object'?r.billInfo:{};billInfo={};BL_INFO.forEach(([k])=>billInfo[k]=String(i[k]||''))}
const blPayload=()=>({bills,billInfo});
function blImport(raw){if(raw&&!Array.isArray(raw)&&(raw.bills||raw.billInfo))blLoad(raw)}
// 청구인 정보: 설정 값 → 없으면 기본 공급자(거래명세서) 값
function blParty(){const s=typeof defSup==='function'&&defSup()||{};return {name:billInfo.name||s.name||'',ceo:billInfo.ceo||s.ceo||'',addr:billInfo.addr||s.addr||'',bank:billInfo.bank||'',holder:billInfo.holder||'',account:billInfo.account||''}}
function blDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'')?s:''}
// 매출 관리 단가
function blPrice(o){const pick=l=>l.filter(x=>+x.unitPrice>0).sort((a,b)=>(b.date||String(b.year||'')).localeCompare(a.date||String(a.year||'')))[0];
 const a=pick(sales.filter(x=>x.orderNo&&blNk(x.orderNo)===blNk(o.no)));if(a)return {price:+a.unitPrice,src:'오더 단가'};
 const b=pick(sales.filter(x=>blNk(x.client)===blNk(o.client)&&blNk(x.item)===blNk(o.item)));if(b)return {price:+b.unitPrice,src:'최근 단가'};return {price:0,src:''}}
function blSpec(o){return [...new Set((o.lines||[]).map(l=>l.color).filter(Boolean))].join(', ')}
// 그 달 자동 줄 (거래처별)
// 매출 관리 행이 있는 오더: 그 행의 수량·단가 그대로 (매출일 달, 없으면 최근 출고 달 — 한 달에만). 없으면 출고 합계 × 단가
function blSlYm(x,o){if(blDate(x.date))return x.date.slice(0,7);const d=o?finalShips(o).map(s=>blDate(s.date)).filter(Boolean).sort().pop():'';return d?d.slice(0,7):''}
function blAuto(ym){const R={},add=(c,e)=>(R[c]=R[c]||[]).push(e),ON=new Set();
 orders.forEach(o=>{if(!o.client)return;const sh=finalShips(o).filter(s=>blDate(s.date).slice(0,7)===ym&&+s.qty),k=blNk(o.no);if(k)ON.add(k);
  const SH=sh.map(s=>({id:s.id,date:s.date,qty:+s.qty||0,item:o.item||o.no,orderNo:o.no,memo:s.memo||''})).sort((a,b)=>a.date.localeCompare(b.date));
  const S=k?sales.filter(x=>blNk(x.orderNo)===k):[];
  if(S.length){const M=S.filter(x=>blSlYm(x,o)===ym);M.forEach((x,i)=>add(o.client,{ref:S.length===1?o.id:o.id+'|'+x.id,orderNo:o.no,item:x.item||o.item||o.no,spec:x.color||blSpec(o),unit:o.unit||'YD',qty:+x.qty||0,price:x.sample?0:+x.unitPrice||0,sample:!!x.sample,priceSrc:x.sample?'샘플':'매출 관리',sl:1,ships:i?[]:SH}));
   if(!M.length&&SH.length)add(o.client,{ref:o.id,shipOnly:1,ships:SH});return}
  if(!sh.length){if((o.date||'').slice(0,7)===ym)(R[o.client]=R[o.client]||[]);return}
  const p=blPrice(o);add(o.client,{ref:o.id,orderNo:o.no,item:o.item||o.no,spec:blSpec(o),unit:o.unit||'YD',qty:SH.reduce((a,s)=>a+s.qty,0),price:p.price,priceSrc:p.src,ships:SH})});
 sales.forEach(x=>{if(!x.client||(x.orderNo&&ON.has(blNk(x.orderNo)))||blSlYm(x)!==ym)return;
  add(x.client,{ref:'s:'+x.id,orderNo:x.orderNo,item:x.item||x.fabric||'-',spec:x.color,unit:'YD',qty:+x.qty||0,price:x.sample?0:+x.unitPrice||0,sample:!!x.sample,priceSrc:x.sample?'샘플':'매출 관리',sl:1,ships:[]})});return R}
function blCalc(l){if(l.vat==='inc')return {sup:0,vat:0,tot:f10(l.total)};const s=f10((+l.qty||0)*(+l.price||0)),v=f10(s/10);return {sup:s,vat:v,tot:s+v}}
// ---- 여러 장 청구서 ----
const blIsPrim=b=>b.id===blKey(b.ym,b.client);
const blBase=r=>String(r||'').split('|')[0];
function blBill(key){if(bills[key])return bills[key];const ym=key.slice(0,7),c=key.slice(8).replace(/#auto$/,'');return blNormBill({id:key,ym,client:c})}
// 그 달 · 거래처의 자동 줄을 받는 청구서: 기본 청구서(자동 줄 켜짐), 기본 청구서가 자동 줄을 껐으면 '월|거래처#auto'
function blHome(ym,c){const P=blKey(ym,c);return !bills[P]||bills[P].auto?P:P+'#auto'}
function blGroup(ym,c){const H=blHome(ym,c),L=Object.values(bills).filter(b=>b.ym===ym&&b.client===c);if(!L.some(b=>b.id===H))L.push(blBill(H));
 return L.sort((a,b)=>(blIsPrim(b)-blIsPrim(a))||a.created.localeCompare(b.created)||a.id.localeCompare(b.id))}
// 자동 줄(ref)이 어느 청구서에 속하는지: 나눈 청구서의 own[]에 있으면 그 청구서 (매출 행이 늘거나 줄어 ref가 '오더' ↔ '오더|매출행'으로 바뀌어도 같은 오더면 따라감), 없으면 기본 청구서
function blOwner(ym,c,ref){const H=blHome(ym,c),L=Object.values(bills).filter(b=>b.ym===ym&&b.client===c&&b.id!==H&&!blIsPrim(b)&&b.auto&&b.own.length);
 const x=L.find(b=>b.own.includes(ref))||L.find(b=>b.own.some(r=>blBase(r)===blBase(ref)));return x?x.id:H}
const blLabel=b=>b.label||(blIsPrim(b)?'':/#auto$/.test(b.id)?'자동':'나눔');
// 화면용 청구서 (잠금 시 고정본)
function blView(key,A0){const b=blBill(key),ym=b.ym,client=b.client,Am=A0||blAuto(ym),auto=b.auto?(Am[client]||[]).filter(a=>blOwner(ym,client,a.ref)===key):[],warn=[];let lines=[],ships=[];
 if(b.locked&&b.frozen){lines=b.frozen.lines||[];ships=b.frozen.ships||[];const ids=new Set(ships.map(s=>s.id)),extra=auto.flatMap(a=>a.ships).filter(s=>!ids.has(s.id));
  if(extra.length)warn.push({t:`청구완료 후 출고 ${extra.length}건 (${extra.reduce((x,s)=>x+s.qty,0).toLocaleString('ko-KR')}) 미포함`,c:'wn'})}
 else{auto.forEach(a=>{if(a.shipOnly){ships.push(...a.ships);return}const s=b.lines.find(l=>l.src==='auto'&&l.ref===a.ref);
   if(s&&s.removed){warn.push({t:`청구서 미포함 출고: ${a.item} ${a.qty.toLocaleString('ko-KR')}`,c:'wn'});return}
   let L;if(s&&s.edited){L={...s,badge:'m',auto:a};if(s.autoQty!==a.qty||s.autoPrice!==a.price)L.changed=true}else L={id:'a_'+a.ref,src:'auto',ref:a.ref,item:a.item,spec:a.spec,qty:a.qty,price:a.price,vat:'ex',total:0,memo:'',badge:a.sl?'s':'a',auto:a,priceSrc:a.priceSrc,sample:a.sample};
   L.orderNo=a.orderNo;lines.push(L);ships.push(...a.ships)});
  b.lines.filter(l=>b.auto&&l.src==='auto'&&!l.removed&&!auto.some(a=>!a.shipOnly&&a.ref===l.ref)).forEach(l=>lines.push({...l,badge:'m',gone:true}));
  b.lines.filter(l=>l.src==='manual').forEach(l=>{lines.push({...l,badge:'u'});if(l.date&&l.qty)ships.push({id:'m_'+l.id,date:l.date,qty:l.qty,item:l.item,orderNo:l.orderNo||'',memo:''})});
  lines.forEach(l=>{l.c=blCalc(l);if(l.vat==='ex'&&l.qty&&!l.price&&!l.sample)warn.push({t:`단가 없음: ${l.item}`,c:'wn'});if(l.changed)warn.push({t:`자동 값 바뀜 (수정한 줄): ${l.item}`,c:'wn2'})});
  ships.sort((a,b)=>a.date.localeCompare(b.date))}
 lines.forEach(l=>{if(!l.c)l.c=blCalc(l)});
 const T=lines.reduce((a,l)=>({qty:a.qty+(+l.qty||0),sup:a.sup+l.c.sup,vat:a.vat+l.c.vat,tot:a.tot+l.c.tot}),{qty:0,sup:0,vat:0,tot:0});
 return {key,ym,client,b,label:blLabel(b),prim:blIsPrim(b),lines,ships,warn,T,status:b.locked?'done':'todo',empty:!lines.length}}
function blMonth(ym){const A0=blAuto(ym),ks=new Set([...Object.keys(A0).map(c=>blHome(ym,c)),...Object.values(bills).filter(b=>b.ym===ym).map(b=>b.id)]);
 return [...ks].map(k=>blView(k,A0)).map(v=>(v.n=blGroup(ym,v.client).length,v)).filter(v=>!(v.empty&&v.n>1&&!bills[v.key])).sort((a,b)=>a.client.localeCompare(b.client,'ko')||(b.prim-a.prim)||a.b.created.localeCompare(b.b.created))}
function blAllMonths(){const s=new Set(Object.values(bills).map(b=>b.ym));orders.forEach(o=>{if(o.date)s.add(o.date.slice(0,7));o.procs.forEach(p=>p.ships.forEach(x=>blDate(x.date)&&s.add(x.date.slice(0,7))));(o.dlv||[]).forEach(x=>blDate(x.date)&&s.add(x.date.slice(0,7)))});sales.forEach(x=>blDate(x.date)&&s.add(x.date.slice(0,7)));return [...s].filter(x=>/^\d{4}-\d{2}$/.test(x)).sort()}
function blPending(){const cur=blCurYm();return blAllMonths().filter(m=>m<cur).flatMap(m=>blMonth(m)).filter(v=>v.status==='todo'&&v.T.tot>0)}
const blYmTxt=ym=>ym?`${ym.slice(0,4)}년 ${+ym.slice(5)}월`:'';
function blShift(d){const [y,m]=blYm.split('-').map(Number),t=new Date(y,m-1+d,1);blYm=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');blSel=null;render()}
const BL_BD={a:'<span class="blbd a">자동</span>',s:'<span class="blbd s">매출 연동</span>',m:'<span class="blbd m">수정됨</span>',u:'<span class="blbd u">수동</span>'};
function renderBill(){if(!blYm)blYm=blCurYm();const el=$('blv');if(!el)return;if(blSel&&!(bills[blSel]||blMonth(blSel.slice(0,7)).some(v=>v.key===blSel)))blSel=null;
 if(blSel)blChkSync(blSel);el.innerHTML=blSel?blDetailHTML(blView(blSel)):blListHTML();if(blSel)blSelBar(blSel);if(typeof crInit==='function')crInit()}
// 같은 달 · 같은 거래처 청구서가 여러 장이면 위에 탭처럼 보여 줌
function blGroupBar(v){const G=blGroup(v.ym,v.client);if(G.length<2)return '';return `<div class="blgrp"><span class="muted">${+v.ym.slice(5)}월 ${esc(v.client)} 청구서 ${G.length}장</span>${G.map(b=>{const x=blView(b.id);return `<button class="${b.id===v.key?'on':''}" onclick="blOpen('${esc(b.id)}')">${esc(b.label||(blIsPrim(b)?'기본':'나눔'))} · ₩${blWon(x.T.tot)}${b.locked?' ✓':''}</button>`}).join('')}</div>`}
function blListHTML(){const L=blMonth(blYm),k=blNk(blF.k),l=L.filter(v=>(!blF.st||v.status===blF.st)&&(!k||blNk([v.client,...v.lines.map(x=>x.item+' '+(x.orderNo||''))].join(' ')).includes(k))),
  T=L.reduce((a,v)=>a+v.T.tot,0),todo=L.filter(v=>v.status==='todo'&&!v.empty).length,done=L.filter(v=>v.status==='done').length,wn=L.filter(v=>v.warn.some(w=>w.c==='wn')).length,pend=blPending();
 return `<div class="blsum"><div><small>${blYmTxt(blYm)} 청구 합계</small><b>₩${blWon(T)}</b></div><div><small>미청구</small><b>${todo}건</b></div><div><small>청구완료</small><b>${done}건</b></div><div><small>누락 경고</small><b${wn?' class="neg"':''}>${wn}건</b></div></div>
 ${pend.length?`<div class="blalert">⚠ 이전 달 미청구 ${pend.length}건: ${pend.slice(0,4).map(v=>`<a href="#" onclick="blYm='${v.ym}';blSel=null;render();return false">${blYmTxt(v.ym)} ${esc(v.client)}</a>`).join(', ')}${pend.length>4?' …':''}</div>`:''}
 <div class="card"><div class="filters"><button onclick="blShift(-1)" title="이전 달">‹</button><b class="blym">${blYmTxt(blYm)}</b><button onclick="blShift(1)" title="다음 달">›</button>
 <input id="blk" placeholder="검색" value="${esc(blF.k)}" oninput="blF.k=this.value;render()" style="width:220px"><select id="blst" onchange="blF.st=this.value;render()"><option value="">전체 상태</option><option value="todo"${blF.st==='todo'?' selected':''}>미청구</option><option value="done"${blF.st==='done'?' selected':''}>청구완료</option></select>
 <span style="flex:1"></span><button onclick="xlsxList('bltb','${blYmTxt(blYm)} 청구서','청구서목록_${blYm}.xlsx')">엑셀 저장</button><button onclick="pdfList('bltb','${blYmTxt(blYm)} 청구서','청구서목록_${blYm}.pdf')">PDF 저장</button><button class="p" onclick="blNew()">+ 추가</button></div>
 <div class="tw"><table class="blt" data-rz="bill_list"><colgroup><col style="width:200px"><col style="width:70px"><col style="width:110px"><col style="width:130px"><col style="width:110px"><col style="width:140px"><col style="width:96px"><col></colgroup><thead><tr><th>거래처</th><th class="c">품목</th><th class="r">수량</th><th class="r">공급가액</th><th class="r">부가세</th><th class="r">총액</th><th class="c">상태</th><th>누락 경고</th></tr></thead>
 <tbody id="bltb">${l.length?l.map(v=>`<tr class="r" data-id="${esc(v.key)}" onclick="blOpen(this.dataset.id)"><td><b>${esc(v.client)}</b>${v.n>1||v.label?` <span class="bllb${v.prim?' p':''}" title="같은 달 ${esc(v.client)} 청구서 ${v.n}장">${esc(v.label||'기본')}</span>`:''}</td><td class="c">${v.lines.length}</td><td class="r">${v.T.qty.toLocaleString('ko-KR')}</td><td class="r">${blWon(v.T.sup)}</td><td class="r">${blWon(v.T.vat)}</td><td class="r"><b>₩${blWon(v.T.tot)}</b></td><td class="c">${v.status==='done'?'<span class="blst d">청구완료</span>':v.empty?'<span class="blst e">출고 없음</span>':'<span class="blst n">미청구</span>'}</td><td>${v.warn.map(w=>`<span class="${w.c}">⚠ ${esc(w.t)}</span>`).join('<br>')}</td></tr>`).join(''):`<tr><td colspan="8" class="muted">${blYmTxt(blYm)} 청구서가 없습니다.</td></tr>`}</tbody></table></div></div>`}
function blOpen(key){blYm=key.slice(0,7);blSel=key;if(page!=='bill')go('bill');else render()}
function blDetailHTML(v){const lk=v.b.locked,P=blParty(),dest=v.b.dest||v.client;
 return `<div class="blhd"><button data-back onclick="blSel=null;render()">‹ 목록</button><h2>${+v.ym.slice(5)}월 청구내역서 · ${esc(v.client)}</h2>${v.label||blGroup(v.ym,v.client).length>1?`<span class="bllb${v.prim?' p':''}">${esc(v.label||'기본')}</span>`:''}${lk?'<span class="blst d">청구완료</span>':'<span class="blst n">미청구</span>'}${v.b.auto?'':'<span class="blst e" title="이 청구서에는 자동 줄이 들어오지 않아요 (수동 줄만)">수동 청구서</span>'}<span style="flex:1"></span>
 ${lk?`<button onclick="blUnlock('${esc(v.key)}')">잠금 해제</button>`:`<button onclick="blLine('${esc(v.key)}','')">+ 줄 추가</button><button onclick="blInfo('${esc(v.key)}')">수정</button>`}${v.prim?'':`<button onclick="blMergeUi('${esc(v.key)}')" title="이 청구서의 줄을 모두 다른 청구서로 합치고 이 청구서는 없앱니다">합치기</button>`}<button onclick="blPreview('${esc(v.key)}')">미리보기</button><button onclick="blXlsx('${esc(v.key)}')">엑셀 저장</button><button onclick="blPDF('${esc(v.key)}')">PDF 저장</button>${lk?'':`<button class="p" onclick="blLock('${esc(v.key)}')">청구완료</button>`}</div>
 ${v.warn.length?`<div class="blalert">${v.warn.map(w=>`<span class="${w.c}">⚠ ${esc(w.t)}</span>`).join('')}</div>`:''}
 ${blGroupBar(v)}<div class="card"><div class="blmeta"><span>세금계산서 발행 일자 <b>${esc(blIssue(v))}</b></span><span>도착지 <b>${esc(dest)}</b></span>${v.b.memo?`<span>비고 <b>${esc(v.b.memo)}</b></span>`:''}</div>
 <h3 class="blh3">1. 청구 내역<span id="blselbar" class="blselbar"></span></h3><div class="tw"><table class="blt" data-rz="bill_lines3"><colgroup><col style="width:34px"><col style="width:200px"><col style="width:120px"><col style="width:80px"><col style="width:90px"><col style="width:110px"><col style="width:100px"><col style="width:120px"><col style="width:150px"><col style="width:130px"></colgroup><thead><tr><th class="c"><input type="checkbox" title="모두 선택" onclick="event.stopPropagation();blTickAll('${esc(v.key)}',this.checked)"${v.lines.length&&v.lines.every(l=>blChk.has(l.id))?' checked':''}></th><th>품명</th><th>오더 · 규격</th><th class="r">수량</th><th class="r">단가</th><th class="r">공급가액</th><th class="r">부가세</th><th class="r">총액</th><th>비고</th><th>구분</th></tr></thead><tbody>
 ${v.lines.map(l=>`<tr class="r" ${lk?'':`onclick="blLine('${esc(v.key)}','${esc(l.id)}')"`}><td class="c" onclick="event.stopPropagation()"><input type="checkbox" data-id="${esc(l.id)}" onchange="blTick('${esc(v.key)}',this.dataset.id,this.checked)"${blChk.has(l.id)?' checked':''}></td><td><b>${esc(l.item)}</b></td><td class="muted">${esc([l.orderNo,l.spec].filter(Boolean).join(' · '))}</td><td class="r${+l.qty<0?' neg':''}">${(+l.qty||0).toLocaleString('ko-KR')}</td><td class="r">${l.vat==='inc'?'<small class="muted">VAT 포함</small>':l.price?'₩'+blWon(l.price):l.sample?'<small class="muted">샘플</small>':'<span class="wn">없음</span>'}</td><td class="r">${blWon(l.c.sup)}</td><td class="r">${blWon(l.c.vat)}</td><td class="r"><b>${blWon(l.c.tot)}</b></td><td>${esc(l.memo)}</td><td>${BL_BD[l.badge]||''}${l.priceSrc==='오더 단가'?' <small class="muted">오더 단가</small>':''}${!lk?` <button class="blrb" onclick="event.stopPropagation();blLine('${esc(v.key)}','${esc(l.id)}')">수정</button>`:''}</td></tr>`).join('')||'<tr><td colspan="10" class="muted">청구 줄이 없습니다.</td></tr>'}
 <tr class="bltot"><td></td><td>합 계</td><td></td><td class="r">${v.T.qty.toLocaleString('ko-KR')}</td><td></td><td class="r">${blWon(v.T.sup)}</td><td class="r">${blWon(v.T.vat)}</td><td class="r">₩${blWon(v.T.tot)}</td><td></td><td></td></tr></tbody></table></div></div>
 <div class="card"><h3>2. 출고 내역</h3><div class="tw"><table class="blt" data-rz="bill_ships"><colgroup><col style="width:240px"><col style="width:110px"><col style="width:110px"><col style="width:100px"><col style="width:180px"><col style="width:180px"><col></colgroup><thead><tr><th>품명</th><th>일자</th><th>오더</th><th class="r">수량</th><th>출고처</th><th>도착지</th><th>비고</th></tr></thead><tbody>
 ${v.ships.map(s=>`<tr><td>${esc(s.item)}</td><td>${esc(s.date)}</td><td>${esc(s.orderNo)}</td><td class="r">${(+s.qty||0).toLocaleString('ko-KR')}</td><td>${esc(P.name)}</td><td>${esc(dest)}</td><td>${esc(s.memo)}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">출고 내역이 없습니다.</td></tr>'}
 <tr class="bltot"><td>합 계</td><td></td><td></td><td class="r">${v.ships.reduce((a,s)=>a+(+s.qty||0),0).toLocaleString('ko-KR')}</td><td></td><td></td><td></td></tr></tbody></table></div></div>`}
function blIssue(v){if(v.b.issue)return v.b.issue;const [y,m]=v.ym.split('-').map(Number);return ymd(new Date(y,m,0))}
function blGet(key){if(!bills[key])bills[key]=blBill(key);return bills[key]}
// 새 청구서
function blNew(){const cs=[...new Set([...orders.map(o=>o.client),...(typeof contacts!=='undefined'?contacts.map(c=>c.company):[]),...sales.map(s=>s.client)].filter(Boolean))].sort();
 $('dt').textContent='청구서 추가';$('dbody').innerHTML=`<div class="blform"><label>월<input id="bln_ym" type="month" value="${blYm}"></label><label>거래처<input id="bln_c" list="bln_dl"></label><label class="w blck"><input id="bln_man" type="checkbox"> 수동 청구서 (자동 줄 없이 직접 적은 줄만 · 선청구 등)</label><label class="w">구분명 (선택)<input id="bln_lb"></label><datalist id="bln_dl">${cs.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>`;
 $('dfoot').innerHTML='<button class="p" onclick="blNewOk()">확인</button><button onclick="dlg.close()">취소</button>';if(!dlg.open)dlg.showModal();setTimeout(()=>$('bln_c').focus(),0)}
function blNewOk(){const ym=$('bln_ym').value,c=$('bln_c').value.trim();if(!/^\d{4}-\d{2}$/.test(ym))return uiAlert('월을 선택하세요.');if(!c)return uiAlert('거래처를 입력하세요.');
 const man=$('bln_man').checked,lb=$('bln_lb').value.trim();let b;if(man){b=blNewSplit(ym,c,lb);b.auto=false}else{b=blGet(blHome(ym,c));if(lb&&!b.label)b.label=lb}b.manual=true;save();dlg.close();blOpen(b.id)}
// 청구서 정보 (발행일 · 도착지 · 비고)
function blInfo(key){const v=blView(key),b=v.b;$('dt').textContent='청구서 수정';
 $('dbody').innerHTML=`<div class="blform"><label class="w">구분명 (선택 · 같은 달 같은 거래처 청구서가 여러 장일 때 구분)<input id="bli_lb" value="${esc(b.label)}" placeholder="${v.prim?'기본':'예: 2차분'}"></label><label>청구 월<input id="bli_ym" type="month" value="${esc(v.ym)}"></label><label class="blck"><input id="bli_au" type="checkbox"${b.auto?' checked':''}> 자동 줄 (매출 관리 · 최종 납품에서 자동으로 채움)</label><label>세금계산서 발행 일자<input id="bli_is" type="date" value="${esc(blIssue(v))}"></label><label>도착지<input id="bli_de" value="${esc(b.dest)}" placeholder="${esc(v.client)}"></label><label class="w">비고<input id="bli_me" value="${esc(b.memo)}"></label></div>`;
 const canDel=bills[key]&&!v.lines.some(l=>l.src==='auto'),nm=v.lines.length;
 $('dfoot').innerHTML=`${canDel?`<button class="d" onclick="blDel('${esc(key)}',${nm})">청구서 삭제</button>`:''}<button class="p" onclick="blInfoOk('${esc(key)}')">확인</button><button onclick="dlg.close()">취소</button>`;if(!dlg.open)dlg.showModal()}
async function blInfoOk(key){const v=blView(key),ym=$('bli_ym').value,au=$('bli_au').checked,is=$('bli_is').value,de=$('bli_de').value.trim(),me=$('bli_me').value.trim(),lb=$('bli_lb')?$('bli_lb').value.trim():v.b.label;
 if(!/^\d{4}-\d{2}$/.test(ym))return uiAlert('청구 월을 고르세요.');const nA=blAutoLines(key).length;let conv=false;
 if((ym!==v.ym||(!au&&v.b.auto))&&nA){const c=await uiChoice(`이 청구서의 자동 줄 ${nA}줄을 어떻게 할까요?
· 수동 줄로 바꾸기: 지금 값 그대로 수동 줄로 남김 (이후 자동으로 바뀌지 않음)
· 빼기: ${ym!==v.ym?'원래 달':'자동 줄을 받는 다른'} 청구서로 돌아감`,[{t:'수동 줄로 바꾸기',c:'p'},{t:'빼기'}]);if(c<0)return;conv=c===0}
 dlg.close();const b=blGet(key);b.issue=is&&is!==blIssue({...v,b:{...b,issue:''}})?is:'';b.dest=de;b.memo=me;b.label=lb;
 if(!au&&b.auto)blSetAuto(key,false,conv);let k=key;if(ym!==v.ym)k=blSetMonth(key,ym,conv);if(au&&!bills[k].auto)blSetAuto(k,true);
 save();blSel=k;if(ym!==v.ym)blYm=ym;render();if(ym!==v.ym)toast(`${blYmTxt(ym)}로 옮겼어요`)}
async function blDel(key,n){const b=bills[key];if(b&&b.auto&&!blIsPrim(b)&&blView(key).lines.some(l=>l.src==='auto')){dlg.close();return blMergeUi(key)}if(!await uiConfirm(n?`이 청구서를 줄 ${n}개와 함께 삭제할까요?`:'이 청구서를 삭제할까요?'))return;delete bills[key];blSel=null;save();dlg.close();render()}
// 줄 추가 / 수정
function blLine(key,id){const v=blView(key);if(v.b.locked)return;const l=id?v.lines.find(x=>x.id===id):null;if(id&&!l)return;
 const x=l?{...l}:blNormLine({src:'manual'});blDraft={key,id,src:x.src,ref:x.ref,auto:l&&l.auto};const man=x.src==='manual';
 $('dt').innerHTML=(l?'청구 줄 수정 ':'청구 줄 추가 ')+(l?BL_BD[l.badge]:BL_BD.u);
 $('dbody').innerHTML=`<div class="blform">${man?`<label>일자 (선택 · 넣으면 출고 내역에도 표시)<input id="bll_date" type="date" value="${esc(x.date)}"></label><label>오더번호 (선택)<input id="bll_ono" value="${esc(x.orderNo||'')}"></label>`:''}<label class="${man?'':'w'}">품명<input id="bll_item" value="${esc(x.item)}"></label>
 <label>규격<input id="bll_spec" value="${esc(x.spec)}"></label><label>부가세<select id="bll_vat" onchange="blCalcUi()"><option value="ex"${x.vat==='ex'?' selected':''}>별도 (10%)</option><option value="inc"${x.vat==='inc'?' selected':''}>포함 금액</option></select></label>
 <label>수량${man?' (빼는 줄은 −)':''}<input id="bll_qty" inputmode="decimal" value="${x.qty||''}" oninput="blCalcUi()"></label><label class="blex">단가<input id="bll_price" inputmode="decimal" value="${x.price||''}" oninput="blCalcUi()"></label><label class="blinc">총액 (VAT 포함)<input id="bll_total" inputmode="decimal" value="${x.total||''}" oninput="blCalcUi()"></label>
 <label class="w">비고<input id="bll_memo" value="${esc(x.memo)}"></label></div><div class="blcalc" id="bll_calc"></div>${l&&l.auto?`<div class="muted" style="font-size:12px;margin-top:6px">자동 값: 수량 ${l.auto.qty.toLocaleString('ko-KR')} · 단가 ${l.auto.price?blWon(l.auto.price):'없음'}${l.auto.priceSrc?' ('+l.auto.priceSrc+')':''}</div>`:''}`;
 const extra=!l?'':man?`<button class="d" onclick="blLineDel()">삭제</button>`:l.badge==='m'?`<button onclick="blLineReset()">자동 값으로 되돌리기</button>`:`<button onclick="blLineRemove()">청구서에서 빼기</button>`;
 $('dfoot').innerHTML=`${extra}<button class="p" onclick="blLineOk()">확인</button><button onclick="dlg.close()">취소</button>`;blCalcUi();if(!dlg.open)dlg.showModal()}
const blNum=id=>{const v=+String($(id).value).replace(/[,\s원₩]/g,'');return isFinite(v)?v:NaN};
function blCalcUi(){const inc=$('bll_vat').value==='inc';document.querySelectorAll('.blform .blex').forEach(e=>e.style.display=inc?'none':'');document.querySelectorAll('.blform .blinc').forEach(e=>e.style.display=inc?'':'none');
 const c=blCalc({vat:inc?'inc':'ex',qty:blNum('bll_qty')||0,price:blNum('bll_price')||0,total:blNum('bll_total')||0});$('bll_calc').innerHTML=`<span>공급가액 ${blWon(c.sup)}</span><span>부가세 ${blWon(c.vat)}</span><b>총액 ₩${blWon(c.tot)}</b>`}
function blLineOk(){const d=blDraft,b=blGet(d.key),q=blNum('bll_qty'),p=blNum('bll_price'),t=blNum('bll_total'),vat=$('bll_vat').value;
 if([q,p,t].some(isNaN))return uiAlert('숫자를 확인하세요.');const item=$('bll_item').value.trim();if(!item)return uiAlert('품명을 입력하세요.');if(vat==='inc'&&!t)return uiAlert('총액을 입력하세요.');
 const o={item,spec:$('bll_spec').value.trim(),qty:q,price:vat==='inc'?0:p,vat,total:vat==='inc'?t:0,memo:$('bll_memo').value.trim()};
 if(d.src==='manual'){o.date=$('bll_date').value;o.orderNo=$('bll_ono').value.trim();const i=b.lines.findIndex(l=>l.id===d.id);if(i>=0)b.lines[i]=blNormLine({...b.lines[i],...o});else b.lines.push(blNormLine({...o,src:'manual'}))}
 else{b.lines=b.lines.filter(l=>!(l.src==='auto'&&l.ref===d.ref));b.lines.push(blNormLine({...o,src:'auto',ref:d.ref,edited:true,autoQty:d.auto?d.auto.qty:0,autoPrice:d.auto?d.auto.price:0}))}
 save();dlg.close();render()}
function blLineReset(){const d=blDraft,b=blGet(d.key);b.lines=b.lines.filter(l=>!(l.src==='auto'&&l.ref===d.ref));save();dlg.close();render()}
async function blLineRemove(){const d=blDraft;if(!await uiConfirm('이 줄을 청구서에서 뺄까요? (누락 경고로 계속 표시됩니다)'))return;const b=blGet(d.key);b.lines=b.lines.filter(l=>!(l.src==='auto'&&l.ref===d.ref));b.lines.push(blNormLine({src:'auto',ref:d.ref,removed:true}));save();dlg.close();render()}
async function blLineDel(){const d=blDraft;if(!await uiConfirm('이 줄을 삭제할까요?'))return;const b=blGet(d.key);b.lines=b.lines.filter(l=>l.id!==d.id);save();dlg.close();render()}
// ---- 나누기 · 옮기기 · 합치기 (공용 핵심: 저장은 부르는 쪽에서 한 번 → Ctrl+Z 한 번으로 되돌림) ----
// 자동 줄은 ref 소속(own[])만 옮기고, 그 줄의 수정/뺀 기록(b.lines의 auto 줄)도 함께 옮김. 수동 줄은 줄 자체를 옮김
function blOwnNow(key){const b=bills[key],v=blView(key);if(!b||blIsPrim(b))return [];const A=(blAuto(v.ym)[v.client]||[]).filter(a=>blOwner(v.ym,v.client,a.ref)===key).map(a=>a.ref);
 return [...new Set([...A,...b.lines.filter(l=>l.src==='auto').map(l=>l.ref)])]}
function blMoveCore(fromKey,toKey,sel){if(fromKey===toKey||!sel.length)return 0;const F=blGet(fromKey),T=blGet(toKey);if(F.ym!==T.ym||F.client!==T.client)throw new Error('같은 달 · 같은 거래처 청구서끼리만 옮길 수 있습니다');
 if(!T.auto&&sel.some(l=>l.src==='auto'))throw new Error('자동 줄이 꺼진 청구서로는 자동 줄을 옮길 수 없습니다 (수동 줄만)');if(!blIsPrim(F))F.own=blOwnNow(fromKey);if(!blIsPrim(T))T.own=blOwnNow(toKey);let n=0;
 sel.forEach(l=>{if(l.src==='auto'&&l.ref){const refs=new Set([l.ref]);F.own=F.own.filter(r=>!refs.has(r));if(!blIsPrim(T)&&!T.own.includes(l.ref))T.own.push(l.ref);
   Object.values(bills).forEach(b=>{if(b!==T&&b.ym===F.ym&&b.client===F.client&&!blIsPrim(b)&&b.own.includes(l.ref))b.own=b.own.filter(r=>r!==l.ref)});
   const mv=F.lines.filter(x=>x.src==='auto'&&x.ref===l.ref);F.lines=F.lines.filter(x=>!mv.includes(x));T.lines=T.lines.filter(x=>!(x.src==='auto'&&x.ref===l.ref)).concat(mv);n++}
  else{const i=F.lines.findIndex(x=>x.id===l.id);if(i>=0){T.lines.push(F.lines.splice(i,1)[0]);n++}}});return n}
function blNewSplit(ym,c,label,from){const P=blKey(ym,c),b=blNormBill({id:P+'#'+uid(),ym,client:c,label,created:new Date().toISOString()});if(from){b.dest=from.dest;b.issue=from.issue}bills[b.id]=b;return b}
function blSplitCore(fromKey,sel,label){const F=blGet(fromKey),b=blNewSplit(F.ym,F.client,label,F);blMoveCore(fromKey,b.id,sel);return b}
function blMergeCore(key,intoKey){const b=bills[key];if(!b||blIsPrim(b))throw new Error('기본 청구서는 합칠 수 없습니다 (나눈 청구서를 기본 청구서로 합치세요)');const into=intoKey||blKey(b.ym,b.client);
 const v=blView(key);blMoveCore(key,into,v.lines);const T=blGet(into),rest=b.lines.filter(l=>l.src==='auto'&&!T.lines.some(x=>x.src==='auto'&&x.ref===l.ref));T.lines.push(...rest);if(!blIsPrim(T))rest.forEach(l=>{if(!T.own.includes(l.ref))T.own.push(l.ref)});delete bills[key];return into}
// ---- 수동 줄 · 자동 줄 끄기 · 청구 월 옮기기 · 삭제 (공용 핵심, 저장은 부르는 쪽에서) ----
// 잠긴(청구완료) 청구서: 고정본(frozen)의 자동 줄은 그대로 두고 수동 줄만 b.lines 기준으로 다시 맞춤 → 잠금은 유지
const blFz=l=>({id:l.id,src:l.src,ref:l.ref||'',orderNo:l.orderNo||'',item:l.item,spec:l.spec,qty:l.qty,price:l.price,vat:l.vat,total:l.total,memo:l.memo,date:l.date||'',badge:l.badge||(l.src==='manual'?'u':'a'),c:blCalc(l)});
function blRefreeze(b){if(!b.locked||!b.frozen)return;const man=b.lines.filter(l=>l.src==='manual'),F=b.frozen;
 const ka=b.auto?(F.lines||[]).filter(l=>l.src!=='manual'):[],ks=b.auto?(F.ships||[]).filter(x=>!String(x.id).startsWith('m_')):[];
 b.frozen={...F,lines:[...ka,...man.map(l=>blFz({...l,badge:'u'}))],ships:[...ks,...man.filter(l=>l.date&&l.qty).map(l=>({id:'m_'+l.id,date:l.date,qty:l.qty,item:l.item,orderNo:l.orderNo||'',memo:''}))].sort((a,c)=>String(a.date).localeCompare(String(c.date)))}}
// 지금 이 청구서에 보이는 자동 줄 (잠긴 청구서는 고정본)
const blAutoLines=key=>{const b=blBill(key);return b.locked&&b.frozen?(b.frozen.lines||[]).filter(l=>l.src!=='manual'):blView(key).lines.filter(l=>l.src==='auto')};
// 자동 줄 정리: convert=true → 같은 값의 수동 줄로 바꿔 남김, false → 뺌(그 줄은 자동 줄을 받는 청구서로 감)
function blDropAuto(b,convert){const A=blAutoLines(b.id);if(convert)A.forEach(l=>b.lines.push(blNormLine({src:'manual',item:l.item,spec:l.spec,orderNo:l.orderNo||'',qty:l.qty,price:l.price,vat:l.vat,total:l.total,memo:l.memo})));
 b.lines=b.lines.filter(l=>l.src==='manual');b.own=[];if(b.locked&&b.frozen)b.frozen={...b.frozen,lines:(b.frozen.lines||[]).filter(l=>l.src==='manual'),ships:(b.frozen.ships||[]).filter(x=>String(x.id).startsWith('m_'))};return A.length}
function blSetAuto(key,on,convert){const b=blGet(key);if(b.auto===!!on)return 0;let n=0;
 if(!on){n=blDropAuto(b,!!convert);b.auto=false}
 else{b.auto=true;const H=b.id+'#auto',x=bills[H];if(blIsPrim(b)&&x&&!x.locked&&!x.lines.some(l=>l.src==='manual')){delete bills[H]}} // 기본 청구서가 다시 켜면 빈 '#auto' 청구서는 정리
 blRefreeze(b);return n}
// 청구 월 옮기기: 자동 줄은 원래 달에 남김(convert=true면 수동 줄로 바꿔 함께 옮김). 새 달에 기본 청구서가 없고 자동 줄이 켜져 있으면 그 달 기본 청구서가 됨, 아니면 그 달의 나눈 청구서
function blSetMonth(key,ym,convert){const b=blGet(key);if(!/^\d{4}-\d{2}$/.test(ym))throw new Error('월(YYYY-MM)이 올바르지 않습니다');if(b.ym===ym)return key;
 blDropAuto(b,!!convert);blRefreeze(b);const P=blKey(ym,b.client);delete bills[key];b.ym=ym;b.id=b.auto&&!bills[P]?P:P+'#'+uid();if(!b.created)b.created=new Date().toISOString();bills[b.id]=b;return b.id}
function blRemoveCore(key){if(!bills[key])return false;delete bills[key];return true}
// 화면: 줄 고르기 → 나누기 / 옮기기 / 합치기
let blChk=new Set(),blChkKey='';
function blChkSync(key){if(blChkKey!==key){blChk=new Set();blChkKey=key}}
function blTick(key,id,on){blChkSync(key);on?blChk.add(id):blChk.delete(id);blSelBar(key)}
function blTickAll(key,on){blChkSync(key);const v=blView(key);blChk=new Set(on?v.lines.map(l=>l.id):[]);render()}
function blSelBar(key){const el=$('blselbar');if(!el)return;const v=blView(key),n=v.lines.filter(l=>blChk.has(l.id)).length,g=blGroup(v.ym,v.client).length;
 el.innerHTML=n?`<b>${n}줄 선택</b><button onclick="blSplitUi('${esc(key)}')">나누기 (${n})</button>${g>1?`<button onclick="blMoveUi('${esc(key)}')">옮기기 (${n})</button>`:''}<button onclick="blTickAll('${esc(key)}',false)">선택 해제</button>`:'<span class="muted">줄을 골라 다른 청구서로 나누거나 옮길 수 있어요</span>'}
const blSelLines=key=>blView(key).lines.filter(l=>blChk.has(l.id)).map(l=>({id:l.id,src:l.src,ref:l.ref,item:l.item,orderNo:l.orderNo||'',qty:l.qty,tot:l.c.tot}));
// 잠긴 청구서를 건드릴 때: 확인 후 잠금 해제
async function blUnlockFor(keys,what){const L=[...new Set(keys)].map(k=>bills[k]).filter(b=>b&&b.locked);if(!L.length)return true;
 if(!await uiConfirm(`청구완료로 잠긴 청구서가 있습니다.\n${L.map(b=>'· '+b.client+(b.label?' · '+b.label:'')).join('\n')}\n잠금을 풀고 ${what}할까요? (다시 '청구완료'를 눌러 잠그세요)`))return false;
 L.forEach(b=>{b.locked=false;b.frozen=null;b.lockedAt=''});return true}
// 잠금 풀린 뒤 화면 줄 다시 찾기 (고정본 id ↔ 현재 id: 자동 줄은 ref, 수동 줄은 id)
const blReSel=(key,S)=>blView(key).lines.filter(l=>S.some(x=>x.src==='auto'&&l.src==='auto'?x.ref===l.ref:x.id===l.id));
function blSplitUi(key){const S=blSelLines(key),v=blView(key);if(!S.length)return;$('dt').textContent='청구서 나누기';
 $('dbody').innerHTML=`<div class="blform" style="min-width:520px"><div class="w muted" style="font-size:12.5px">고른 ${S.length}줄을 ${esc(v.client)} ${+v.ym.slice(5)}월의 새 청구서로 옮깁니다. 나눈 줄은 자동 계산을 다시 해도 원래 청구서로 돌아가지 않아요.</div>
 <div class="w"><table class="blt blsp"><thead><tr><th>품명</th><th>오더</th><th class="r">수량</th><th class="r">총액</th></tr></thead><tbody>${S.map(l=>`<tr><td>${esc(l.item)}</td><td>${esc(l.orderNo)}</td><td class="r">${(+l.qty||0).toLocaleString('ko-KR')}</td><td class="r">${blWon(l.tot)}</td></tr>`).join('')}</tbody></table></div>
 <label class="w">새 청구서 구분명 (선택)<input id="bls_lb" placeholder="예: 2차분, 샘플, 별도 청구"></label>${v.b.locked?'<div class="w wn">이 청구서는 청구완료로 잠겨 있어 나누면 잠금이 풀립니다.</div>':''}</div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="blSplitOk('${esc(key)}')">나누기</button><button onclick="dlg.close()">취소</button>`;if(!dlg.open)dlg.showModal();setTimeout(()=>$('bls_lb')&&$('bls_lb').focus(),0)}
async function blSplitOk(key){const S=blSelLines(key),lb=($('bls_lb')||{}).value||'';dlg.close();if(!await blUnlockFor([key],'나누기'))return;const b=blSplitCore(key,blReSel(key,S),lb.trim());blChk=new Set();save();blSel=b.id;render();toast('새 청구서로 나눴어요'+(lb.trim()?` (${lb.trim()})`:''))}
function blMoveUi(key){const S=blSelLines(key),v=blView(key),G=blGroup(v.ym,v.client).filter(b=>b.id!==key);if(!S.length||!G.length)return;$('dt').textContent='다른 청구서로 옮기기';
 $('dbody').innerHTML=`<div class="blform" style="min-width:420px"><div class="w muted" style="font-size:12.5px">고른 ${S.length}줄을 옮길 청구서를 고르세요.</div><label class="w">옮길 곳<select id="blm_to">${G.map(b=>`<option value="${esc(b.id)}">${esc(b.label||(blIsPrim(b)?'기본 청구서':'나눔'))}${blIsPrim(b)?' (기본)':''}${b.locked?' · 청구완료':''}</option>`).join('')}</select></label></div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="blMoveOk('${esc(key)}')">옮기기</button><button onclick="dlg.close()">취소</button>`;if(!dlg.open)dlg.showModal()}
async function blMoveOk(key){const S=blSelLines(key),to=$('blm_to').value;dlg.close();if(!await blUnlockFor([key,to],'옮기기'))return;let n;try{n=blMoveCore(key,to,blReSel(key,S))}catch(e){return uiAlert(e.message||String(e))}blChk=new Set();save();render();toast(`${n}줄을 옮겼어요`)}
async function blMergeUi(key){const b=bills[key];if(!b)return;const P=blKey(b.ym,b.client),G=blGroup(b.ym,b.client).filter(x=>x.id!==key);let into=P;
 if(G.length>1){const c=await uiChoice('어느 청구서로 합칠까요?',G.map(x=>({t:x.label||(blIsPrim(x)?'기본 청구서':'나눔')})));if(c<0)return;into=G[c].id}
 else if(!await uiConfirm(`'${b.label||'나눔'}' 청구서의 줄을 모두 기본 청구서로 합치고 이 청구서는 없앨까요?`))return;
 if(!await blUnlockFor([key,into],'합치기'))return;blMergeCore(key,into);save();blSel=into;render();toast('청구서를 합쳤어요')}
// 청구완료(잠금) / 해제
async function blLock(key){const v=blView(key);if(v.warn.some(w=>w.c==='wn')&&!await uiConfirm('누락 경고가 있습니다. 그래도 청구완료로 잠글까요?'))return;
 const b=blGet(key);b.locked=true;b.lockedAt=new Date().toISOString();b.frozen={lines:v.lines.map(l=>({id:l.id,src:l.src,ref:l.ref,orderNo:l.orderNo||'',item:l.item,spec:l.spec,qty:l.qty,price:l.price,vat:l.vat,total:l.total,memo:l.memo,badge:l.badge,c:l.c})),ships:v.ships};
 if(!b.issue)b.issue=blIssue(v);save();render();toast('청구완료로 잠갔어요')}
async function blUnlock(key){if(!await uiConfirm('잠금을 해제할까요? 생산 관리의 현재 출고로 다시 계산됩니다.'))return;const b=blGet(key);b.locked=false;b.frozen=null;b.lockedAt='';save();render()}
// 엑셀
async function blXlsx(key){const v=blView(key),P=blParty(),dest=v.b.dest||v.client;if(!A.billXlsx)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');
 const d={title:`${+v.ym.slice(5)}월 청구내역서`,client:v.client,issue:blIssue(v),lines:v.lines.map(l=>({item:l.item,spec:l.spec,qty:+l.qty||0,price:l.vat==='inc'?null:+l.price||0,sup:l.c.sup,vat:l.c.vat,tot:l.c.tot,memo:l.vat==='inc'?[l.memo,'VAT 포함'].filter(Boolean).join(' · '):l.memo})),T:v.T,
  ships:v.ships.map(s=>({item:s.item,date:s.date,qty:+s.qty||0,from:P.name,dest,memo:s.memo})),party:P};
 try{const p=await A.billXlsx(d,`청구내역서_${v.ym}_${(v.client+(v.b.label?'_'+v.b.label:'')).replace(/[\\/:*?"<>|]/g,'_')}.xlsx`);if(p)toast('엑셀 저장: '+p)}catch(e){uiAlert('내보내기 실패: '+(e.message||e))}}
function blData(key){const v=blView(key),P=blParty(),dest=v.b.dest||v.client;return {v,d:{title:`${+v.ym.slice(5)}월 청구내역서`,client:v.client,issue:blIssue(v),lines:v.lines.map(l=>({item:l.item,spec:l.spec,qty:+l.qty||0,price:l.vat==='inc'?null:+l.price||0,sup:l.c.sup,vat:l.c.vat,tot:l.c.tot,memo:l.vat==='inc'?[l.memo,'VAT 포함'].filter(Boolean).join(' · '):l.memo})),T:v.T,
  ships:v.ships.map(s=>({item:s.item,date:s.date,qty:+s.qty||0,from:P.name,dest,memo:s.memo})),party:P}}}
// 청구내역서 문서(HTML) — PDF 저장과 미리보기가 같은 것을 씀
function blDoc(key){const {v,d}=blData(key),n=x=>x||x===0?(+x).toLocaleString('ko-KR'):'',P=d.party;
 const body=`<h1>${pE(d.title)}</h1><div class="meta"><b>${pE(d.client)} 귀하</b><span>세금계산서 발행 일자: ${pE(d.issue)}</span></div>
 <h3>1. 청구 내역</h3><table><colgroup><col style="width:26%"><col style="width:11%"><col style="width:10%"><col style="width:13%"><col style="width:11%"><col style="width:13%"><col></colgroup><thead><tr><th>품명</th><th>수량(YD)</th><th>단가</th><th>공급가액</th><th>부가세</th><th>총액</th><th>비고</th></tr></thead><tbody>
 ${d.lines.map(l=>`<tr><td>${pE(l.item+(l.spec?' ('+l.spec+')':''))}</td><td class="r">${l.qty?n(l.qty):''}</td><td class="r">${l.price?n(l.price):''}</td><td class="r">${n(l.sup)}</td><td class="r">${n(l.vat)}</td><td class="r">${n(l.tot)}</td><td>${pE(l.memo)}</td></tr>`).join('')}
 <tr class="t"><td class="c">합 계</td><td class="r">${d.T.qty?n(d.T.qty):''}</td><td></td><td class="r">${n(d.T.sup)}</td><td class="r">${n(d.T.vat)}</td><td class="r">${n(d.T.tot)}</td><td></td></tr></tbody></table>
 <h3>2. 출고 내역</h3><table><colgroup><col style="width:26%"><col style="width:11%"><col style="width:10%"><col style="width:24%"><col style="width:13%"><col></colgroup><thead><tr><th>품명</th><th>일자</th><th>수량(YD)</th><th>출고처</th><th>도착지</th><th>비고</th></tr></thead><tbody>
 ${d.ships.map(s=>`<tr><td>${pE(s.item)}</td><td class="c">${pE(s.date)}</td><td class="r">${n(s.qty)}</td><td class="c">${pE(s.from)}</td><td>${pE(s.dest)}</td><td>${pE(s.memo)}</td></tr>`).join('')}
 <tr class="t"><td class="c">합 계</td><td></td><td class="r">${n(d.ships.reduce((a,s)=>a+s.qty,0))}</td><td></td><td></td><td></td></tr></tbody></table>
 <table class="ft"><tr><td>은 행:</td><td>${pE(P.bank)}</td></tr><tr><td>예 금 주:</td><td>${pE(P.holder)}</td></tr><tr><td>계좌번호:</td><td>${pE(P.account)}</td></tr><tr><td>&nbsp;</td><td></td></tr><tr><td>주 소:</td><td>${pE(P.addr)}</td></tr><tr><td>청 구 인:</td><td>${pE(P.name)}</td></tr><tr><td>대 표:</td><td>${pE(P.ceo)}  (인)</td></tr></table>`;
 return {html:pdfDoc(body,false),name:`청구내역서_${v.ym}_${(v.client+(v.b.label?'_'+v.b.label:'')).replace(/[\\/:*?"<>|]/g,'_')}`}}
async function blPDF(key){const r=blDoc(key);await pdfSave(r.html,r.name+'.pdf')}
async function blPreview(key){const r=blDoc(key);await pdfPreview(r.html,r.name)}
// 설정
function blSettings(){const el=$('bl_card');if(!el)return;const s=typeof defSup==='function'&&defSup()||{},ph={name:s.name,ceo:s.ceo,addr:s.addr};
 el.innerHTML=`<h2>청구서 정보</h2><div class="blform blset">${BL_INFO.map(([k,t])=>`<label class="${k==='addr'?'w':''}">${t}<input id="bls_${k}" value="${esc(billInfo[k]||'')}" placeholder="${esc(ph[k]||'')}" onchange="billInfo['${k}']=this.value.trim();save()"></label>`).join('')}</div>`}
// 조회용 스냅샷
function blSnap(){return blAllMonths().flatMap(m=>blMonth(m)).filter(v=>!v.empty||bills[v.key]).map(v=>({id:v.key,label:v.b.label,primary:v.prim,autoLines:v.b.auto,billsForClientMonth:blGroup(v.ym,v.client).length,month:v.ym,client:v.client,status:v.status==='done'?'청구완료':'미청구',locked:!!v.b.locked,issueDate:blIssue(v),
 qty:v.T.qty,supply:v.T.sup,vat:v.T.vat,total:v.T.tot,warnings:v.warn.map(w=>w.t),
 lines:v.lines.map(l=>({lineId:l.id,manual:l.src==='manual',item:l.item,spec:l.spec,orderNo:l.orderNo||'',qty:+l.qty||0,unitPrice:l.vat==='inc'?null:+l.price||0,vatIncluded:l.vat==='inc',supply:l.c.sup,vat:l.c.vat,total:l.c.tot,memo:l.memo,source:{a:'auto',s:'sales',m:'edited',u:'manual'}[l.badge]||''})),
 shipments:v.ships.map(s=>({date:s.date,item:s.item,orderNo:s.orderNo,qty:s.qty})),search:snapS([v.client,v.ym,v.b.label,...v.lines.flatMap(l=>[l.item,l.orderNo,l.spec,l.memo])])}))}
(()=>{const s=document.createElement('style');s.textContent=`
.blsum{display:flex;gap:10px;margin-bottom:10px}.blsum>div{flex:1;background:#fff;border-radius:8px;padding:10px 14px;box-shadow:0 1px 3px #0001}.blsum small{color:#777}.blsum b{display:block;font-size:18px;margin-top:2px}
.blalert{background:#fff6f5;border:1px solid #f3c7c3;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:12.5px;display:flex;flex-wrap:wrap;gap:6px 16px;color:#a32020}.blalert a{color:#a32020}
.blym{font-size:15px;align-self:center;padding:0 6px;min-width:110px;text-align:center}
table.blt{min-width:0;width:100%;table-layout:fixed}table.blt td,table.blt th{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}table.blt .r{text-align:right}table.blt .c{text-align:center}table.blt tr.bltot td{background:#f5f7fa;font-weight:700}
.blst{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;white-space:nowrap}.blst.n{background:#fff1dc;color:#b56a00}.blst.d{background:#e2f5e8;color:#16803c}.blst.e{background:#eef0f3;color:#777}
.wn{color:#c62828;font-size:12px}.wn2{color:#b56a00;font-size:12px}
.blbd{font-size:10.5px;padding:1px 6px;border-radius:8px;font-weight:600}.blbd.a{background:#e3edfb;color:#1f6fd1}.blbd.m{background:#fff1dc;color:#b56a00}.blbd.s{background:#e3f4ea;color:#1e7b45}.blbd.u{background:#efe6fb;color:#6b3fb3}
.blrb{font-size:11px;padding:1px 8px;margin-left:4px}.blform label.blck{flex-direction:row;align-items:center;gap:6px;color:#333;font-size:12.5px}
.bllb{display:inline-block;font-size:11px;font-weight:600;padding:0 7px;border-radius:9px;background:#fdebd9;color:#b0560f;line-height:18px;margin-left:6px;vertical-align:1px}.bllb.p{background:#eef0f3;color:#555}
.blgrp{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px}.blgrp button{font-size:12px;padding:3px 10px}.blgrp button.on{background:#2271b1;color:#fff;border-color:#2271b1}
.blh3{display:flex;align-items:center;gap:10px}.blselbar{display:inline-flex;gap:6px;align-items:center;font-size:12px;font-weight:normal}.blselbar button{font-size:12px;padding:2px 9px}table.blt td input[type=checkbox],table.blt th input[type=checkbox]{margin:0;vertical-align:middle}
.blhd{display:flex;align-items:center;gap:8px;margin-bottom:10px}.blhd h2{font-size:16px;margin:0 6px}
.blmeta{display:flex;gap:20px;color:#555;margin-bottom:10px}.blmeta b{color:#222}#p_bill h3{font-size:14px;margin:4px 0 8px}#p_bill .card{margin-bottom:10px}
.blform{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;min-width:480px}.blform label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:#555}.blform .w{grid-column:span 2}.blform input,.blform select{font-size:13px}
.blset{max-width:720px}.blcalc{background:#f5f7fa;border-radius:6px;padding:8px 10px;margin-top:10px;display:flex;justify-content:space-between;color:#555}`;document.head.appendChild(s)})();
