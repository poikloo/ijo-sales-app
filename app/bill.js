// ===== 청구서 (월말 결산: 같은 달 · 같은 거래처 = 한 장) =====
// 자동 줄: 생산 관리 최종 공정 출고(그 달) × 단가(매출 관리: 오더번호 행 우선, 없으면 거래처+품목 최근 단가)
let bills={},billInfo={},blYm='',blSel=null,blF={k:'',st:''},blDraft=null;
const BL_INFO=[['name','청구인 (상호)'],['ceo','대표'],['addr','주소'],['bank','은행'],['holder','예금주'],['account','계좌번호']];
const blKey=(ym,c)=>ym+'|'+c;
const f10=n=>{n=+n||0;return n<0?-Math.floor(-n/10)*10:Math.floor(n/10)*10};
const blWon=n=>(Math.round(+n||0)).toLocaleString('ko-KR');
const blNk=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
const blCurYm=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
function blNormLine(l){l=l&&typeof l==='object'?l:{};const n=k=>{const v=+String(l[k]==null?'':l[k]).replace(/,/g,'');return isFinite(v)?v:0};
 return {id:String(l.id||uid()),src:l.src==='auto'?'auto':'manual',ref:String(l.ref||''),edited:!!l.edited,removed:!!l.removed,date:/^\d{4}-\d{2}-\d{2}$/.test(l.date||'')?l.date:'',
  item:String(l.item||''),spec:String(l.spec||''),qty:n('qty'),price:n('price'),vat:l.vat==='inc'?'inc':'ex',total:n('total'),memo:String(l.memo||''),autoQty:n('autoQty'),autoPrice:n('autoPrice')}}
function blNormBill(b){b=b&&typeof b==='object'?b:{};return {ym:/^\d{4}-\d{2}$/.test(b.ym||'')?b.ym:blCurYm(),client:String(b.client||''),manual:!!b.manual,locked:!!b.locked,lockedAt:String(b.lockedAt||''),
 issue:/^\d{4}-\d{2}-\d{2}$/.test(b.issue||'')?b.issue:'',dest:String(b.dest||''),memo:String(b.memo||''),lines:(Array.isArray(b.lines)?b.lines:[]).map(blNormLine),frozen:b.frozen&&typeof b.frozen==='object'?b.frozen:null}}
function blLoad(r){const o=r&&!Array.isArray(r)&&r.bills&&typeof r.bills==='object'?r.bills:{};bills={};Object.values(o).forEach(x=>{const b=blNormBill(x);if(b.client)bills[blKey(b.ym,b.client)]=b});
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
function blAuto(ym){const R={};orders.forEach(o=>{if(!o.client)return;const last=o.procs[o.procs.length-1],sh=last?last.ships.filter(s=>blDate(s.date).slice(0,7)===ym&&+s.qty):[];
  if(!sh.length){if((o.date||'').slice(0,7)===ym)(R[o.client]=R[o.client]||[]);return}
  const p=blPrice(o);(R[o.client]=R[o.client]||[]).push({ref:o.id,orderNo:o.no,item:o.item||o.no,spec:blSpec(o),unit:o.unit||'YD',qty:sh.reduce((a,s)=>a+(+s.qty||0),0),price:p.price,priceSrc:p.src,
   ships:sh.map(s=>({id:s.id,date:s.date,qty:+s.qty||0,item:o.item||o.no,orderNo:o.no,memo:s.memo||''})).sort((a,b)=>a.date.localeCompare(b.date))})});return R}
function blCalc(l){if(l.vat==='inc')return {sup:0,vat:0,tot:f10(l.total)};const s=f10((+l.qty||0)*(+l.price||0)),v=f10(s/10);return {sup:s,vat:v,tot:s+v}}
// 화면용 청구서 (잠금 시 고정본)
function blView(key,A0){const [ym,client]=[key.slice(0,7),key.slice(8)],b=bills[key]||blNormBill({ym,client}),Am=A0||blAuto(ym),auto=Am[client]||[],warn=[];let lines=[],ships=[];
 if(b.locked&&b.frozen){lines=b.frozen.lines||[];ships=b.frozen.ships||[];const ids=new Set(ships.map(s=>s.id)),extra=auto.flatMap(a=>a.ships).filter(s=>!ids.has(s.id));
  if(extra.length)warn.push({t:`청구완료 후 출고 ${extra.length}건 (${extra.reduce((x,s)=>x+s.qty,0).toLocaleString('ko-KR')}) 미포함`,c:'wn'})}
 else{auto.forEach(a=>{const s=b.lines.find(l=>l.src==='auto'&&l.ref===a.ref);
   if(s&&s.removed){warn.push({t:`청구서 미포함 출고: ${a.item} ${a.qty.toLocaleString('ko-KR')}`,c:'wn'});return}
   let L;if(s&&s.edited){L={...s,badge:'m',auto:a};if(s.autoQty!==a.qty||s.autoPrice!==a.price)L.changed=true}else L={id:'a_'+a.ref,src:'auto',ref:a.ref,item:a.item,spec:a.spec,qty:a.qty,price:a.price,vat:'ex',total:0,memo:'',badge:'a',auto:a,priceSrc:a.priceSrc};
   L.orderNo=a.orderNo;lines.push(L);ships.push(...a.ships)});
  b.lines.filter(l=>l.src==='auto'&&!l.removed&&!auto.some(a=>a.ref===l.ref)).forEach(l=>lines.push({...l,badge:'m',gone:true}));
  b.lines.filter(l=>l.src==='manual').forEach(l=>{lines.push({...l,badge:'u'});if(l.date&&l.qty)ships.push({id:'m_'+l.id,date:l.date,qty:l.qty,item:l.item,orderNo:'',memo:''})});
  lines.forEach(l=>{l.c=blCalc(l);if(l.vat==='ex'&&l.qty&&!l.price)warn.push({t:`단가 없음: ${l.item}`,c:'wn'});if(l.changed)warn.push({t:`자동 값 바뀜 (수정한 줄): ${l.item}`,c:'wn2'})});
  ships.sort((a,b)=>a.date.localeCompare(b.date))}
 lines.forEach(l=>{if(!l.c)l.c=blCalc(l)});
 const T=lines.reduce((a,l)=>({qty:a.qty+(+l.qty||0),sup:a.sup+l.c.sup,vat:a.vat+l.c.vat,tot:a.tot+l.c.tot}),{qty:0,sup:0,vat:0,tot:0});
 return {key,ym,client,b,lines,ships,warn,T,status:b.locked?'done':'todo',empty:!lines.length}}
function blMonth(ym){const A0=blAuto(ym),ks=new Set([...Object.keys(A0).map(c=>blKey(ym,c)),...Object.keys(bills).filter(k=>k.startsWith(ym+'|'))]);return [...ks].map(k=>blView(k,A0)).sort((a,b)=>a.client.localeCompare(b.client,'ko'))}
function blAllMonths(){const s=new Set(Object.values(bills).map(b=>b.ym));orders.forEach(o=>{if(o.date)s.add(o.date.slice(0,7));o.procs.forEach(p=>p.ships.forEach(x=>blDate(x.date)&&s.add(x.date.slice(0,7))))});return [...s].filter(x=>/^\d{4}-\d{2}$/.test(x)).sort()}
function blPending(){const cur=blCurYm();return blAllMonths().filter(m=>m<cur).flatMap(m=>blMonth(m)).filter(v=>v.status==='todo'&&v.T.tot>0)}
const blYmTxt=ym=>ym?`${ym.slice(0,4)}년 ${+ym.slice(5)}월`:'';
function blShift(d){const [y,m]=blYm.split('-').map(Number),t=new Date(y,m-1+d,1);blYm=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');blSel=null;render()}
const BL_BD={a:'<span class="blbd a">자동</span>',m:'<span class="blbd m">수정됨</span>',u:'<span class="blbd u">수동</span>'};
function renderBill(){if(!blYm)blYm=blCurYm();const el=$('blv');if(!el)return;if(blSel&&!(bills[blSel]||blMonth(blSel.slice(0,7)).some(v=>v.key===blSel)))blSel=null;
 el.innerHTML=blSel?blDetailHTML(blView(blSel)):blListHTML();if(typeof crInit==='function')crInit()}
function blListHTML(){const L=blMonth(blYm),k=blNk(blF.k),l=L.filter(v=>(!blF.st||v.status===blF.st)&&(!k||blNk([v.client,...v.lines.map(x=>x.item+' '+(x.orderNo||''))].join(' ')).includes(k))),
  T=L.reduce((a,v)=>a+v.T.tot,0),todo=L.filter(v=>v.status==='todo'&&!v.empty).length,done=L.filter(v=>v.status==='done').length,wn=L.filter(v=>v.warn.some(w=>w.c==='wn')).length,pend=blPending();
 return `<div class="blsum"><div><small>${blYmTxt(blYm)} 청구 합계</small><b>₩${blWon(T)}</b></div><div><small>미청구</small><b>${todo}건</b></div><div><small>청구완료</small><b>${done}건</b></div><div><small>누락 경고</small><b${wn?' class="neg"':''}>${wn}건</b></div></div>
 ${pend.length?`<div class="blalert">⚠ 이전 달 미청구 ${pend.length}건: ${pend.slice(0,4).map(v=>`<a href="#" onclick="blYm='${v.ym}';blSel=null;render();return false">${blYmTxt(v.ym)} ${esc(v.client)}</a>`).join(', ')}${pend.length>4?' …':''}</div>`:''}
 <div class="card"><div class="filters"><button onclick="blShift(-1)" title="이전 달">‹</button><b class="blym">${blYmTxt(blYm)}</b><button onclick="blShift(1)" title="다음 달">›</button>
 <input id="blk" placeholder="검색" value="${esc(blF.k)}" oninput="blF.k=this.value;render()" style="width:220px"><select id="blst" onchange="blF.st=this.value;render()"><option value="">전체 상태</option><option value="todo"${blF.st==='todo'?' selected':''}>미청구</option><option value="done"${blF.st==='done'?' selected':''}>청구완료</option></select>
 <span style="flex:1"></span><button onclick="xlsxList('bltb','${blYmTxt(blYm)} 청구서','청구서목록_${blYm}.xlsx')">엑셀 저장</button><button onclick="pdfList('bltb','${blYmTxt(blYm)} 청구서','청구서목록_${blYm}.pdf')">PDF 저장</button><button class="p" onclick="blNew()">+ 추가</button></div>
 <div class="tw"><table class="blt" data-rz="bill_list"><colgroup><col style="width:200px"><col style="width:70px"><col style="width:110px"><col style="width:130px"><col style="width:110px"><col style="width:140px"><col style="width:96px"><col></colgroup><thead><tr><th>거래처</th><th class="c">품목</th><th class="r">수량</th><th class="r">공급가액</th><th class="r">부가세</th><th class="r">총액</th><th class="c">상태</th><th>누락 경고</th></tr></thead>
 <tbody id="bltb">${l.length?l.map(v=>`<tr class="r" data-id="${esc(v.key)}" onclick="blOpen(this.dataset.id)"><td><b>${esc(v.client)}</b></td><td class="c">${v.lines.length}</td><td class="r">${v.T.qty.toLocaleString('ko-KR')}</td><td class="r">${blWon(v.T.sup)}</td><td class="r">${blWon(v.T.vat)}</td><td class="r"><b>₩${blWon(v.T.tot)}</b></td><td class="c">${v.status==='done'?'<span class="blst d">청구완료</span>':v.empty?'<span class="blst e">출고 없음</span>':'<span class="blst n">미청구</span>'}</td><td>${v.warn.map(w=>`<span class="${w.c}">⚠ ${esc(w.t)}</span>`).join('<br>')}</td></tr>`).join(''):`<tr><td colspan="8" class="muted">${blYmTxt(blYm)} 청구서가 없습니다.</td></tr>`}</tbody></table></div></div>`}
function blOpen(key){blYm=key.slice(0,7);blSel=key;if(page!=='bill')go('bill');else render()}
function blDetailHTML(v){const lk=v.b.locked,P=blParty(),dest=v.b.dest||v.client;
 return `<div class="blhd"><button onclick="blSel=null;render()">‹ 목록</button><h2>${+v.ym.slice(5)}월 청구내역서 · ${esc(v.client)}</h2>${lk?'<span class="blst d">청구완료</span>':'<span class="blst n">미청구</span>'}<span style="flex:1"></span>
 ${lk?`<button onclick="blUnlock('${esc(v.key)}')">잠금 해제</button>`:`<button onclick="blLine('${esc(v.key)}','')">+ 줄 추가</button><button onclick="blInfo('${esc(v.key)}')">수정</button>`}<button onclick="blXlsx('${esc(v.key)}')">엑셀 저장</button><button onclick="blPDF('${esc(v.key)}')">PDF 저장</button>${lk?'':`<button class="p" onclick="blLock('${esc(v.key)}')">청구완료</button>`}</div>
 ${v.warn.length?`<div class="blalert">${v.warn.map(w=>`<span class="${w.c}">⚠ ${esc(w.t)}</span>`).join('')}</div>`:''}
 <div class="card"><div class="blmeta"><span>세금계산서 발행 일자 <b>${esc(blIssue(v))}</b></span><span>도착지 <b>${esc(dest)}</b></span>${v.b.memo?`<span>비고 <b>${esc(v.b.memo)}</b></span>`:''}</div>
 <h3>1. 청구 내역</h3><div class="tw"><table class="blt" data-rz="bill_lines"><colgroup><col style="width:240px"><col style="width:130px"><col style="width:90px"><col style="width:90px"><col style="width:120px"><col style="width:110px"><col style="width:130px"><col style="width:120px"><col></colgroup><thead><tr><th>품명</th><th>오더 · 규격</th><th class="r">수량</th><th class="r">단가</th><th class="r">공급가액</th><th class="r">부가세</th><th class="r">총액</th><th>비고</th><th>구분</th></tr></thead><tbody>
 ${v.lines.map(l=>`<tr class="r" ${lk?'':`onclick="blLine('${esc(v.key)}','${esc(l.id)}')"`}><td><b>${esc(l.item)}</b></td><td class="muted">${esc([l.orderNo,l.spec].filter(Boolean).join(' · '))}</td><td class="r">${(+l.qty||0).toLocaleString('ko-KR')}</td><td class="r">${l.vat==='inc'?'<small class="muted">VAT 포함</small>':l.price?'₩'+blWon(l.price):'<span class="wn">없음</span>'}</td><td class="r">${blWon(l.c.sup)}</td><td class="r">${blWon(l.c.vat)}</td><td class="r"><b>${blWon(l.c.tot)}</b></td><td>${esc(l.memo)}</td><td>${BL_BD[l.badge]||''}${l.priceSrc==='오더 단가'?' <small class="muted">오더 단가</small>':''}${!lk?` <button class="blrb" onclick="event.stopPropagation();blLine('${esc(v.key)}','${esc(l.id)}')">수정</button>`:''}</td></tr>`).join('')||'<tr><td colspan="9" class="muted">청구 줄이 없습니다.</td></tr>'}
 <tr class="bltot"><td>합 계</td><td></td><td class="r">${v.T.qty.toLocaleString('ko-KR')}</td><td></td><td class="r">${blWon(v.T.sup)}</td><td class="r">${blWon(v.T.vat)}</td><td class="r">₩${blWon(v.T.tot)}</td><td></td><td></td></tr></tbody></table></div></div>
 <div class="card"><h3>2. 출고 내역</h3><div class="tw"><table class="blt" data-rz="bill_ships"><colgroup><col style="width:240px"><col style="width:110px"><col style="width:110px"><col style="width:100px"><col style="width:180px"><col style="width:180px"><col></colgroup><thead><tr><th>품명</th><th>일자</th><th>오더</th><th class="r">수량</th><th>출고처</th><th>도착지</th><th>비고</th></tr></thead><tbody>
 ${v.ships.map(s=>`<tr><td>${esc(s.item)}</td><td>${esc(s.date)}</td><td>${esc(s.orderNo)}</td><td class="r">${(+s.qty||0).toLocaleString('ko-KR')}</td><td>${esc(P.name)}</td><td>${esc(dest)}</td><td>${esc(s.memo)}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">출고 내역이 없습니다.</td></tr>'}
 <tr class="bltot"><td>합 계</td><td></td><td></td><td class="r">${v.ships.reduce((a,s)=>a+(+s.qty||0),0).toLocaleString('ko-KR')}</td><td></td><td></td><td></td></tr></tbody></table></div></div>`}
function blIssue(v){if(v.b.issue)return v.b.issue;const [y,m]=v.ym.split('-').map(Number);return ymd(new Date(y,m,0))}
function blGet(key){if(!bills[key])bills[key]=blNormBill({ym:key.slice(0,7),client:key.slice(8)});return bills[key]}
// 새 청구서
function blNew(){const cs=[...new Set([...orders.map(o=>o.client),...(typeof contacts!=='undefined'?contacts.map(c=>c.company):[]),...sales.map(s=>s.client)].filter(Boolean))].sort();
 $('dt').textContent='청구서 추가';$('dbody').innerHTML=`<div class="blform"><label>월<input id="bln_ym" type="month" value="${blYm}"></label><label>거래처<input id="bln_c" list="bln_dl"></label><datalist id="bln_dl">${cs.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>`;
 $('dfoot').innerHTML='<button class="p" onclick="blNewOk()">확인</button><button onclick="dlg.close()">취소</button>';if(!dlg.open)dlg.showModal();setTimeout(()=>$('bln_c').focus(),0)}
function blNewOk(){const ym=$('bln_ym').value,c=$('bln_c').value.trim();if(!/^\d{4}-\d{2}$/.test(ym))return uiAlert('월을 선택하세요.');if(!c)return uiAlert('거래처를 입력하세요.');
 const k=blKey(ym,c);const b=blGet(k);b.manual=true;save();dlg.close();blOpen(k)}
// 청구서 정보 (발행일 · 도착지 · 비고)
function blInfo(key){const v=blView(key),b=v.b;$('dt').textContent='청구서 수정';
 $('dbody').innerHTML=`<div class="blform"><label>세금계산서 발행 일자<input id="bli_is" type="date" value="${esc(blIssue(v))}"></label><label>도착지<input id="bli_de" value="${esc(b.dest)}" placeholder="${esc(v.client)}"></label><label class="w">비고<input id="bli_me" value="${esc(b.memo)}"></label></div>`;
 const canDel=bills[key]&&!v.lines.some(l=>l.src==='auto');
 $('dfoot').innerHTML=`${canDel?`<button class="d" onclick="blDel('${esc(key)}')">청구서 삭제</button>`:''}<button class="p" onclick="blInfoOk('${esc(key)}')">확인</button><button onclick="dlg.close()">취소</button>`;if(!dlg.open)dlg.showModal()}
function blInfoOk(key){const b=blGet(key),v=blView(key);const is=$('bli_is').value;b.issue=is&&is!==blIssue({...v,b:{...b,issue:''}})?is:'';b.dest=$('bli_de').value.trim();b.memo=$('bli_me').value.trim();save();dlg.close();render()}
async function blDel(key){if(!await uiConfirm('이 청구서를 삭제할까요?'))return;delete bills[key];blSel=null;save();dlg.close();render()}
// 줄 추가 / 수정
function blLine(key,id){const v=blView(key);if(v.b.locked)return;const l=id?v.lines.find(x=>x.id===id):null;if(id&&!l)return;
 const x=l?{...l}:blNormLine({src:'manual'});blDraft={key,id,src:x.src,ref:x.ref,auto:l&&l.auto};const man=x.src==='manual';
 $('dt').innerHTML=(l?'청구 줄 수정 ':'청구 줄 추가 ')+(l?BL_BD[l.badge]:BL_BD.u);
 $('dbody').innerHTML=`<div class="blform">${man?`<label>일자<input id="bll_date" type="date" value="${esc(x.date)}"></label>`:''}<label class="${man?'':'w'}">품명<input id="bll_item" value="${esc(x.item)}"></label>
 <label>규격<input id="bll_spec" value="${esc(x.spec)}"></label><label>부가세<select id="bll_vat" onchange="blCalcUi()"><option value="ex"${x.vat==='ex'?' selected':''}>별도 (10%)</option><option value="inc"${x.vat==='inc'?' selected':''}>포함 금액</option></select></label>
 <label>수량<input id="bll_qty" inputmode="decimal" value="${x.qty||''}" oninput="blCalcUi()"></label><label class="blex">단가<input id="bll_price" inputmode="decimal" value="${x.price||''}" oninput="blCalcUi()"></label><label class="blinc">총액 (VAT 포함)<input id="bll_total" inputmode="decimal" value="${x.total||''}" oninput="blCalcUi()"></label>
 <label class="w">비고<input id="bll_memo" value="${esc(x.memo)}"></label></div><div class="blcalc" id="bll_calc"></div>${l&&l.auto?`<div class="muted" style="font-size:12px;margin-top:6px">자동 값: 수량 ${l.auto.qty.toLocaleString('ko-KR')} · 단가 ${l.auto.price?blWon(l.auto.price):'없음'}${l.auto.priceSrc?' ('+l.auto.priceSrc+')':''}</div>`:''}`;
 const extra=!l?'':man?`<button class="d" onclick="blLineDel()">삭제</button>`:l.badge==='m'?`<button onclick="blLineReset()">자동 값으로 되돌리기</button>`:`<button onclick="blLineRemove()">청구서에서 빼기</button>`;
 $('dfoot').innerHTML=`${extra}<button class="p" onclick="blLineOk()">확인</button><button onclick="dlg.close()">취소</button>`;blCalcUi();if(!dlg.open)dlg.showModal()}
const blNum=id=>{const v=+String($(id).value).replace(/[,\s원₩]/g,'');return isFinite(v)?v:NaN};
function blCalcUi(){const inc=$('bll_vat').value==='inc';document.querySelectorAll('.blform .blex').forEach(e=>e.style.display=inc?'none':'');document.querySelectorAll('.blform .blinc').forEach(e=>e.style.display=inc?'':'none');
 const c=blCalc({vat:inc?'inc':'ex',qty:blNum('bll_qty')||0,price:blNum('bll_price')||0,total:blNum('bll_total')||0});$('bll_calc').innerHTML=`<span>공급가액 ${blWon(c.sup)}</span><span>부가세 ${blWon(c.vat)}</span><b>총액 ₩${blWon(c.tot)}</b>`}
function blLineOk(){const d=blDraft,b=blGet(d.key),q=blNum('bll_qty'),p=blNum('bll_price'),t=blNum('bll_total'),vat=$('bll_vat').value;
 if([q,p,t].some(isNaN))return uiAlert('숫자를 확인하세요.');const item=$('bll_item').value.trim();if(!item)return uiAlert('품명을 입력하세요.');if(vat==='inc'&&!t)return uiAlert('총액을 입력하세요.');
 const o={item,spec:$('bll_spec').value.trim(),qty:q,price:vat==='inc'?0:p,vat,total:vat==='inc'?t:0,memo:$('bll_memo').value.trim()};
 if(d.src==='manual'){o.date=$('bll_date').value;const i=b.lines.findIndex(l=>l.id===d.id);if(i>=0)b.lines[i]=blNormLine({...b.lines[i],...o});else b.lines.push(blNormLine({...o,src:'manual'}))}
 else{b.lines=b.lines.filter(l=>!(l.src==='auto'&&l.ref===d.ref));b.lines.push(blNormLine({...o,src:'auto',ref:d.ref,edited:true,autoQty:d.auto?d.auto.qty:0,autoPrice:d.auto?d.auto.price:0}))}
 save();dlg.close();render()}
function blLineReset(){const d=blDraft,b=blGet(d.key);b.lines=b.lines.filter(l=>!(l.src==='auto'&&l.ref===d.ref));save();dlg.close();render()}
async function blLineRemove(){const d=blDraft;if(!await uiConfirm('이 줄을 청구서에서 뺄까요? (누락 경고로 계속 표시됩니다)'))return;const b=blGet(d.key);b.lines=b.lines.filter(l=>!(l.src==='auto'&&l.ref===d.ref));b.lines.push(blNormLine({src:'auto',ref:d.ref,removed:true}));save();dlg.close();render()}
async function blLineDel(){const d=blDraft;if(!await uiConfirm('이 줄을 삭제할까요?'))return;const b=blGet(d.key);b.lines=b.lines.filter(l=>l.id!==d.id);save();dlg.close();render()}
// 청구완료(잠금) / 해제
async function blLock(key){const v=blView(key);if(v.warn.some(w=>w.c==='wn')&&!await uiConfirm('누락 경고가 있습니다. 그래도 청구완료로 잠글까요?'))return;
 const b=blGet(key);b.locked=true;b.lockedAt=new Date().toISOString();b.frozen={lines:v.lines.map(l=>({id:l.id,src:l.src,ref:l.ref,orderNo:l.orderNo||'',item:l.item,spec:l.spec,qty:l.qty,price:l.price,vat:l.vat,total:l.total,memo:l.memo,badge:l.badge,c:l.c})),ships:v.ships};
 if(!b.issue)b.issue=blIssue(v);save();render();toast('청구완료로 잠갔어요')}
async function blUnlock(key){if(!await uiConfirm('잠금을 해제할까요? 생산 관리의 현재 출고로 다시 계산됩니다.'))return;const b=blGet(key);b.locked=false;b.frozen=null;b.lockedAt='';save();render()}
// 엑셀
async function blXlsx(key){const v=blView(key),P=blParty(),dest=v.b.dest||v.client;if(!A.billXlsx)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');
 const d={title:`${+v.ym.slice(5)}월 청구내역서`,client:v.client,issue:blIssue(v),lines:v.lines.map(l=>({item:l.item,spec:l.spec,qty:+l.qty||0,price:l.vat==='inc'?null:+l.price||0,sup:l.c.sup,vat:l.c.vat,tot:l.c.tot,memo:l.vat==='inc'?[l.memo,'VAT 포함'].filter(Boolean).join(' · '):l.memo})),T:v.T,
  ships:v.ships.map(s=>({item:s.item,date:s.date,qty:+s.qty||0,from:P.name,dest,memo:s.memo})),party:P};
 try{const p=await A.billXlsx(d,`청구내역서_${v.ym}_${v.client.replace(/[\\/:*?"<>|]/g,'_')}.xlsx`);if(p)toast('엑셀 저장: '+p)}catch(e){uiAlert('내보내기 실패: '+(e.message||e))}}
function blData(key){const v=blView(key),P=blParty(),dest=v.b.dest||v.client;return {v,d:{title:`${+v.ym.slice(5)}월 청구내역서`,client:v.client,issue:blIssue(v),lines:v.lines.map(l=>({item:l.item,spec:l.spec,qty:+l.qty||0,price:l.vat==='inc'?null:+l.price||0,sup:l.c.sup,vat:l.c.vat,tot:l.c.tot,memo:l.vat==='inc'?[l.memo,'VAT 포함'].filter(Boolean).join(' · '):l.memo})),T:v.T,
  ships:v.ships.map(s=>({item:s.item,date:s.date,qty:+s.qty||0,from:P.name,dest,memo:s.memo})),party:P}}}
async function blPDF(key){const {v,d}=blData(key),n=x=>x||x===0?(+x).toLocaleString('ko-KR'):'',P=d.party;
 const body=`<h1>${pE(d.title)}</h1><div class="meta"><b>${pE(d.client)} 귀하</b><span>세금계산서 발행 일자: ${pE(d.issue)}</span></div>
 <h3>1. 청구 내역</h3><table><colgroup><col style="width:26%"><col style="width:11%"><col style="width:10%"><col style="width:13%"><col style="width:11%"><col style="width:13%"><col></colgroup><thead><tr><th>품명</th><th>수량(YD)</th><th>단가</th><th>공급가액</th><th>부가세</th><th>총액</th><th>비고</th></tr></thead><tbody>
 ${d.lines.map(l=>`<tr><td>${pE(l.item+(l.spec?' ('+l.spec+')':''))}</td><td class="r">${l.qty?n(l.qty):''}</td><td class="r">${l.price?n(l.price):''}</td><td class="r">${n(l.sup)}</td><td class="r">${n(l.vat)}</td><td class="r">${n(l.tot)}</td><td>${pE(l.memo)}</td></tr>`).join('')}
 <tr class="t"><td class="c">합 계</td><td class="r">${d.T.qty?n(d.T.qty):''}</td><td></td><td class="r">${n(d.T.sup)}</td><td class="r">${n(d.T.vat)}</td><td class="r">${n(d.T.tot)}</td><td></td></tr></tbody></table>
 <h3>2. 출고 내역</h3><table><colgroup><col style="width:26%"><col style="width:11%"><col style="width:10%"><col style="width:24%"><col style="width:13%"><col></colgroup><thead><tr><th>품명</th><th>일자</th><th>수량(YD)</th><th>출고처</th><th>도착지</th><th>비고</th></tr></thead><tbody>
 ${d.ships.map(s=>`<tr><td>${pE(s.item)}</td><td class="c">${pE(s.date)}</td><td class="r">${n(s.qty)}</td><td class="c">${pE(s.from)}</td><td>${pE(s.dest)}</td><td>${pE(s.memo)}</td></tr>`).join('')}
 <tr class="t"><td class="c">합 계</td><td></td><td class="r">${n(d.ships.reduce((a,s)=>a+s.qty,0))}</td><td></td><td></td><td></td></tr></tbody></table>
 <table class="ft"><tr><td>은 행:</td><td>${pE(P.bank)}</td></tr><tr><td>예 금 주:</td><td>${pE(P.holder)}</td></tr><tr><td>계좌번호:</td><td>${pE(P.account)}</td></tr><tr><td>&nbsp;</td><td></td></tr><tr><td>주 소:</td><td>${pE(P.addr)}</td></tr><tr><td>청 구 인:</td><td>${pE(P.name)}</td></tr><tr><td>대 표:</td><td>${pE(P.ceo)}  (인)</td></tr></table>`;
 await pdfSave(pdfDoc(body,false),`청구내역서_${v.ym}_${v.client.replace(/[\\/:*?"<>|]/g,'_')}.pdf`)}
// 설정
function blSettings(){const el=$('bl_card');if(!el)return;const s=typeof defSup==='function'&&defSup()||{},ph={name:s.name,ceo:s.ceo,addr:s.addr};
 el.innerHTML=`<h2>청구서 정보</h2><div class="blform blset">${BL_INFO.map(([k,t])=>`<label class="${k==='addr'?'w':''}">${t}<input id="bls_${k}" value="${esc(billInfo[k]||'')}" placeholder="${esc(ph[k]||'')}" onchange="billInfo['${k}']=this.value.trim();save()"></label>`).join('')}</div>`}
// 조회용 스냅샷
function blSnap(){return blAllMonths().flatMap(m=>blMonth(m)).filter(v=>!v.empty||bills[v.key]).map(v=>({id:v.key,month:v.ym,client:v.client,status:v.status==='done'?'청구완료':'미청구',locked:!!v.b.locked,issueDate:blIssue(v),
 qty:v.T.qty,supply:v.T.sup,vat:v.T.vat,total:v.T.tot,warnings:v.warn.map(w=>w.t),
 lines:v.lines.map(l=>({item:l.item,spec:l.spec,orderNo:l.orderNo||'',qty:+l.qty||0,unitPrice:l.vat==='inc'?null:+l.price||0,vatIncluded:l.vat==='inc',supply:l.c.sup,vat:l.c.vat,total:l.c.tot,memo:l.memo,source:{a:'auto',m:'edited',u:'manual'}[l.badge]||''})),
 shipments:v.ships.map(s=>({date:s.date,item:s.item,orderNo:s.orderNo,qty:s.qty})),search:snapS([v.client,v.ym,...v.lines.flatMap(l=>[l.item,l.orderNo,l.spec,l.memo])])}))}
(()=>{const s=document.createElement('style');s.textContent=`
.blsum{display:flex;gap:10px;margin-bottom:10px}.blsum>div{flex:1;background:#fff;border-radius:8px;padding:10px 14px;box-shadow:0 1px 3px #0001}.blsum small{color:#777}.blsum b{display:block;font-size:18px;margin-top:2px}
.blalert{background:#fff6f5;border:1px solid #f3c7c3;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:12.5px;display:flex;flex-wrap:wrap;gap:6px 16px;color:#a32020}.blalert a{color:#a32020}
.blym{font-size:15px;align-self:center;padding:0 6px;min-width:110px;text-align:center}
table.blt{min-width:0;width:100%;table-layout:fixed}table.blt td,table.blt th{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}table.blt .r{text-align:right}table.blt .c{text-align:center}table.blt tr.bltot td{background:#f5f7fa;font-weight:700}
.blst{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;white-space:nowrap}.blst.n{background:#fff1dc;color:#b56a00}.blst.d{background:#e2f5e8;color:#16803c}.blst.e{background:#eef0f3;color:#777}
.wn{color:#c62828;font-size:12px}.wn2{color:#b56a00;font-size:12px}
.blbd{font-size:10.5px;padding:1px 6px;border-radius:8px;font-weight:600}.blbd.a{background:#e3edfb;color:#1f6fd1}.blbd.m{background:#fff1dc;color:#b56a00}.blbd.u{background:#efe6fb;color:#6b3fb3}
.blrb{font-size:11px;padding:1px 8px;margin-left:4px}
.blhd{display:flex;align-items:center;gap:8px;margin-bottom:10px}.blhd h2{font-size:16px;margin:0 6px}
.blmeta{display:flex;gap:20px;color:#555;margin-bottom:10px}.blmeta b{color:#222}#p_bill h3{font-size:14px;margin:4px 0 8px}#p_bill .card{margin-bottom:10px}
.blform{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;min-width:480px}.blform label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:#555}.blform .w{grid-column:span 2}.blform input,.blform select{font-size:13px}
.blset{max-width:720px}.blcalc{background:#f5f7fa;border-radius:6px;padding:8px 10px;margin-top:10px;display:flex;justify-content:space-between;color:#555}`;document.head.appendChild(s)})();
