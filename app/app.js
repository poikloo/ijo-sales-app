const ST=['진행중','개찰완료','낙찰','유찰'],PT={dash:'대시보드',check:'체크리스트',prod:'생산 관리',bids:'공고 일정',work:'작업의뢰서',outwork:'외주작업의뢰서',stmt:'거래명세서',contacts:'거래처 정보',docs:'서류 보관함',settings:'설정'};
const A=window.api||{load:()=>JSON.parse(localStorage.getItem('ijo')||'null'),save:async d=>localStorage.setItem('ijo',JSON.stringify(d)),info:async()=>({file:'(브라우저)',backups:'-'}),openFolder:()=>{},saveFile:async()=>null,openFile:async()=>null};
let orders=[],pv=null,data=[],cl=[],cur=new Date(),dcur=new Date(),ccur=new Date(),csel='',bt='sched',page='dash';
const PR=['높음','보통','낮음'];
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const won=n=>n?Number(n).toLocaleString('ko-KR')+'원':'',fdt=s=>s?String(s).replace('T',' ').slice(0,16):'';
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const now=()=>{const d=new Date();return ymd(d)+'T'+d.toTimeString().slice(0,5)};
function toast(m){const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',2200)}
function examples(){return [{id:'ex1',example:true,name:'(예시) 2026년 군(육군·해병대) 개인전투용천막 제조',no:'R26BK01619258-000',org:'육군군수사령부',pub:'2026-07-07T10:54',open:'2026-11-03T11:00',price:1250000000,rep:'(예시)가나섬유',cos:[{n:'(예시)가나섬유',s:60},{n:'(예시)다라텍스',s:40}],status:'진행중',result:'',memo:'예시 데이터입니다. 가격·개찰일시는 임의 값입니다.',updated:now()},
 {id:'ex2',example:true,name:'(예시) 2026년 해군 방한복 원단 구매',no:'R26BK00000000-000',org:'해군군수사령부',pub:'2026-10-10T09:00',open:'2026-10-23T10:00',price:480000000,rep:'(예시)이조아이엔디',cos:[{n:'(예시)이조아이엔디',s:100}],status:'진행중',result:'',memo:'예시 데이터입니다.',updated:now()}]}
function normalize(d){const arr=Array.isArray(d)?d:(d&&Array.isArray(d.bids)?d.bids:null);if(!arr)return null;
 return arr.filter(x=>x&&typeof x==='object').map(x=>({id:String(x.id||Date.now().toString(36)+Math.random().toString(36).slice(2,6)),example:!!x.example,name:x.name||'',no:x.no||'',org:x.org||'',pub:x.pub||'',open:x.open||'',price:+x.price||0,rep:x.rep||'',cos:Array.isArray(x.cos)?x.cos.map(c=>({n:c.n||'',s:+c.s||0})):[],status:ST.includes(x.status)?x.status:'진행중',result:x.result||'',memo:x.memo||'',updated:x.updated||''}))}
function exCl(){const t=new Date(),d=k=>ymd(new Date(t.getFullYear(),t.getMonth(),t.getDate()+k)),u=now();
 return [{id:'cx1',example:true,title:'(예시) 개찰 전 투찰 서류 최종 확인',due:d(0),pri:'높음',cat:'입찰',memo:'예시 항목입니다.',done:false,updated:u},
 {id:'cx2',example:true,title:'(예시) 외주 가공처 납기 확인 전화',due:d(2),pri:'보통',cat:'외주',memo:'',done:false,updated:u},
 {id:'cx3',example:true,title:'(예시) 거래명세서 발송',due:d(-1),pri:'높음',cat:'출고',memo:'',done:false,updated:u},
 {id:'cx4',example:true,title:'(예시) 원단 샘플 정리',due:'',pri:'낮음',cat:'생산',memo:'',done:false,updated:u}]}
function normalizeCl(arr){return (Array.isArray(arr)?arr:[]).filter(x=>x&&typeof x==='object'&&x.title).map(x=>({id:String(x.id||uid()),example:!!x.example,title:String(x.title),due:/^\d{4}-\d{2}-\d{2}$/.test(x.due||'')?x.due:'',pri:PR.includes(x.pri)?x.pri:'보통',cat:x.cat||'',memo:x.memo||'',done:!!x.done,updated:x.updated||''}))}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function exOrders(){let k=0;const P=(name,vendor,shrink,sh)=>({id:'xp'+(++k),name,vendor,shrink,ships:sh.map(([d,q])=>({id:'xs'+(++k),date:d,qty:q,memo:''}))});
 return [{id:'xo1',example:true,no:'2509-0328',item:'지휘소용 다기능천막 외피',color:'진국방',qty:2650,unit:'YD',client:'(예시)가나상사',date:'2025-09-09',due:'',fabric:'',updated:now(),procs:[
  P('생지','(예시)A직물',null,[['2025-09-29',1200],['2025-10-01',2000],['2025-10-05',1120]]),P('염색','(예시)B염색',13,[['2025-10-06',883],['2025-10-08',1000],['2025-10-10',1000]]),
  P('FR PU','(예시)C가공',3,[['2025-10-20',1889],['2025-10-24',1000]]),P('FR LAMI','(예시)D라미',3,[['2025-10-31',2862]])]}]}
const numOrNull=v=>v===''||v==null||isNaN(+v)?null:+v;
const UNITS=['YD','M','KG','EA'];
function normLines(o){const L=Array.isArray(o.lines)&&o.lines.length?o.lines:[{color:o.color,qty:o.qty,unit:o.unit}];return L.map(l=>({color:String(l&&l.color||'').trim(),qty:+(l&&l.qty)||0,unit:UNITS.includes(l&&l.unit)?l.unit:'YD'}))}
// 주문 단위 색상/발주량/단위는 라인에서 계산: 색상=쉼표로 연결, 단위=첫 라인 단위, 발주량=그 단위 라인들의 합계
function deriveOrder(o){const L=o.lines.length?o.lines:[{color:'',qty:0,unit:'YD'}],u=L[0].unit;o.color=[...new Set(L.map(l=>l.color).filter(Boolean))].join(', ');o.unit=u;o.qty=L.filter(l=>l.unit===u).reduce((s,l)=>s+l.qty,0);o.mixedUnit=L.some(l=>l.unit!==u);return o}
const lineTxt=l=>`${l.color||'-'} ${num(l.qty)} ${l.unit}`;
function normalizeOrders(arr){return (Array.isArray(arr)?arr:[]).filter(o=>o&&typeof o==='object'&&o.no).map(o=>deriveOrder({id:String(o.id||uid()),example:!!o.example,no:String(o.no),item:o.item||'',lines:normLines(o),client:o.client||'',date:o.date||'',due:o.due||'',fabric:o.fabric||'',updated:o.updated||'',
 procs:(Array.isArray(o.procs)?o.procs:[]).map(p=>({id:String(p.id||uid()),name:p.name||'',vendor:p.vendor||'',shrink:numOrNull(p.shrink),ships:(Array.isArray(p.ships)?p.ships:[]).map(s=>({id:String(s.id||uid()),date:s.date||'',qty:+s.qty||0,memo:s.memo||''}))}))}))}
function load(){const r=A.load();stLoad(r);ctLoad(r);data=r?normalize(r):null;
 const ro=r&&!Array.isArray(r)?r.orders:undefined;
 if(!data){data=examples();cl=exCl();orders=normalizeOrders(exOrders());save();return}
 orders=Array.isArray(ro)?normalizeOrders(ro):(data.some(x=>x.example)?normalizeOrders(exOrders()):[]);if(!Array.isArray(ro))setTimeout(save,0);
 if(r&&!Array.isArray(r)&&Array.isArray(r.checklist))cl=normalizeCl(r.checklist);
 else{cl=data.some(x=>x.example)?exCl():[];save()}}
function save(){A.save({app:'ijo-sales',version:1,savedAt:new Date().toISOString(),bids:data,checklist:cl,orders,...stPayload(),...ctPayload()}).catch(e=>alert('저장 실패: '+e))}
function dday(s){const d=new Date(s.slice(0,10)+'T00:00'),t=new Date();t.setHours(0,0,0,0);return Math.round((d-t)/864e5)}
const ddLabel=n=>n===0?'D-day':n>0?'D-'+n:'D+'+(-n),tag=x=>x.example?'<span class="ex">예시</span>':'';
function go(p){if(p!=='prod'||page!=='prod')pv=p==='prod'?pv:null;page=p;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('on',e.id==='p_'+p));document.querySelectorAll('#side a').forEach(a=>a.classList.toggle('on',a.dataset.p===p));$('ptitle').textContent=PT[p];$('bidadd').style.display=p==='bids'?'':'none';render()}
document.querySelectorAll('#side a').forEach(a=>a.onclick=()=>go(a.dataset.p));
function mv(k){cur=new Date(cur.getFullYear(),cur.getMonth()+k,1);render()}
function mvm(k){mcur=new Date(mcur.getFullYear(),mcur.getMonth()+k,1);render()}
function filtered(){const k=$('fk').value.trim().toLowerCase(),o=$('fo').value,s=$('fs').value;
 return data.filter(x=>(!o||x.org===o)&&(!s||x.status===s)&&(!k||[x.name,x.no,x.rep,x.org,...x.cos.map(c=>c.n)].join(' ').toLowerCase().includes(k))).sort((a,b)=>(a.open||'').localeCompare(b.open||''))}
function upList(){return data.filter(x=>x.open&&dday(x.open)>=0&&x.status==='진행중').sort((a,b)=>a.open.localeCompare(b.open))}
function upHTML(list){return list.length?list.map(x=>{const n=dday(x.open);return `<li onclick="view('${x.id}')"><span class="badge ${n===0?'hot':n<=3?'warm':''}">${ddLabel(n)}</span>${tag(x)}<b>${esc(x.name)}</b><br><small>${fdt(x.open)} · ${esc(x.org)}${x.price?' · '+won(x.price):''}</small></li>`}).join(''):'<li>예정된 개찰이 없습니다.</li>'}
function clChip(c){const od=!c.done&&c.due<ymd(new Date());return `<span class="chip clc${od?' od':''}${c.done?' dn':''}" title="${esc(c.title)}" onclick="event.stopPropagation();openCl('${c.id}')">☐ ${esc(c.title)}</span>`}
function calHTML(y,m,mini,mode){let h='일월화수목금토'.split('').map(d=>`<div class="dn">${d}</div>`).join('');
 const st=new Date(y,m,1-new Date(y,m,1).getDay()),today=new Date().toDateString(),sp=!mini&&$('spub').checked;
 for(let i=0;i<42;i++){const d=new Date(st.getFullYear(),st.getMonth(),st.getDate()+i),ds=ymd(d),cls=`c${d.getMonth()!==m?' o':''}${d.toDateString()===today?' t':''}`;
  const hits=data.filter(x=>x.open&&x.open.startsWith(ds));
  if(mini){h+=`<div class="${cls}${hits.length?' has':''}" ${hits.length?`onclick="view('${hits[0].id}')" title="${esc(hits.map(x=>x.name).join('\n'))}"`:''}>${d.getDate()}${hits.length?'<span class="dot"></span>':''}</div>`;continue}
  if(mode==='cl'){const its=cl.filter(c=>c.due===ds);h+=`<div class="${cls}${csel===ds?' sel':''}" onclick="pickDay('${ds}')"><div>${d.getDate()}</div>${its.map(clChip).join('')}</div>`;continue}
  let c=hits.map(x=>`<span class="chip s${ST.indexOf(x.status)}" title="${esc(x.name)}" onclick="view('${x.id}')">${x.open.slice(11,16)} ${esc(x.name)}</span>`).join('');
  if(sp)data.forEach(x=>{if(x.pub&&x.pub.startsWith(ds))c+=`<span class="chip pub" onclick="view('${x.id}')">게시 ${esc(x.name)}</span>`});
  if(mode==='dash')c+=cl.filter(x=>x.due===ds).map(clChip).join('');
  h+=`<div class="${cls}"><div>${d.getDate()}</div>${c}</div>`}return h}
function render(){
 const ex=data.filter(x=>x.example).length+cl.filter(x=>x.example).length+orders.filter(x=>x.example).length+stExCount()+ctExCount();$('exbtn').style.display=ex?'':'none';
 if(page==='dash'){const td=ymd(new Date()),wk=ymd(new Date(Date.now()+7*864e5)),open=cl.filter(c=>!c.done);
  const od=open.filter(c=>c.due&&c.due<td),tdy=open.filter(c=>c.due===td),up=open.filter(c=>c.due>td&&c.due<=wk).sort((a,b)=>a.due.localeCompare(b.due)),nd=open.filter(c=>!c.due);
  const sec=(t,l)=>l.length?`<li class="sec">${t} (${l.length})</li>`+l.map(clItem).join(''):'';
  $('dcl').innerHTML=(sec('지난 할 일',od)+sec('오늘',tdy)+sec('7일 이내',up)+sec('마감일 없음',nd))||'<li>남은 할 일이 없습니다. </li>';
  $('dup').innerHTML=upHTML(upList().slice(0,10));$('dym').textContent=`${dcur.getFullYear()}년 ${dcur.getMonth()+1}월`;$('dcal').innerHTML=calHTML(dcur.getFullYear(),dcur.getMonth(),false,'dash')}
 if(page==='prod')renderProd();
 if(page==='stmt')renderStmt();
 if(page==='contacts')renderContacts();
 if(page==='settings')renderSupplier();
 if(page==='check'){$('cym').textContent=`${ccur.getFullYear()}년 ${ccur.getMonth()+1}월`;$('ccal').innerHTML=calHTML(ccur.getFullYear(),ccur.getMonth(),false,'cl');
  const cats=[...new Set(['영업','생산','외주','출고','입찰','기타',...cl.map(c=>c.cat).filter(Boolean)])],cc=$('cc'),cv=cc.value;cc.innerHTML='<option value="">전체 분류</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join('');cc.value=cv;
  const f=$('cf').value,l=cl.filter(c=>(!f||(f==='done')===c.done)&&(!cv||c.cat===cv)&&(!csel||c.due===csel)).sort((a,b)=>a.done-b.done||(a.due||'9').localeCompare(b.due||'9')||PR.indexOf(a.pri)-PR.indexOf(b.pri));
  $('cday').innerHTML=csel?`<span class="badge">${csel}</span><button onclick="pickDay('${csel}')">날짜 선택 해제</button>`:'';
  $('clist').innerHTML=l.length?l.map(clItem).join(''):'<li>항목이 없습니다.</li>'}
 if(page==='bids'){$('ym').textContent=`${cur.getFullYear()}년 ${cur.getMonth()+1}월`;$('cal').innerHTML=calHTML(cur.getFullYear(),cur.getMonth(),false);$('up').innerHTML=upHTML(upList());
  const orgs=[...new Set(data.map(x=>x.org).filter(Boolean))],fo=$('fo'),ov=fo.value;fo.innerHTML='<option value="">전체 수요기관</option>'+orgs.map(o=>`<option>${esc(o)}</option>`).join('');fo.value=ov;
  const f=filtered();$('tb').innerHTML=f.length?f.map(x=>`<tr class="r" onclick="view('${x.id}')"><td>${fdt(x.open)}</td><td>${tag(x)}${esc(x.name)}</td><td>${esc(x.no)}</td><td>${esc(x.org)}</td><td>${won(x.price)}</td><td>${esc(x.rep)}</td><td><span class="chip s${ST.indexOf(x.status)}" style="display:inline-block">${esc(x.status)}</span></td></tr>`).join(''):'<tr><td colspan="7">데이터가 없습니다.</td></tr>'}
 if(page==='bids'){document.querySelectorAll('.btab').forEach(e=>e.style.display=e.id==='bt_'+bt?'':'none');document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('on',e.dataset.t===bt))}
 if(page==='bids'){const s=$('rs').value,r=data.filter(x=>x.status!=='진행중'&&(!s||x.status===s)).sort((a,b)=>(b.open||'').localeCompare(a.open||''));
  const c=k=>data.filter(x=>x.status===k).length;$('rsum').textContent=`개찰완료 ${c('개찰완료')} · 낙찰 ${c('낙찰')} · 유찰 ${c('유찰')}`;
  $('rtb').innerHTML=r.length?r.map(x=>`<tr class="r" onclick="view('${x.id}')"><td>${fdt(x.open)}</td><td>${tag(x)}${esc(x.name)}</td><td>${esc(x.org)}</td><td>${won(x.price)}</td><td>${esc(x.rep)}</td><td><span class="chip s${ST.indexOf(x.status)}" style="display:inline-block">${x.status}</span></td><td>${esc(x.result)}</td></tr>`).join(''):'<tr><td colspan="7">개찰 결과가 없습니다.</td></tr>'}
}
function view(id){const x=data.find(e=>e.id===id);if(!x)return;$('dt').textContent=(x.example?'[예시] ':'')+x.name;const tot=x.cos.reduce((a,c)=>a+(+c.s||0),0);
 $('dbody').innerHTML=`<dl class="dv"><dt>입찰공고번호</dt><dd>${esc(x.no)}</dd><dt>수요기관</dt><dd>${esc(x.org)}</dd><dt>게시일시</dt><dd>${fdt(x.pub)}</dd><dt>개찰일시</dt><dd>${fdt(x.open)} ${x.open?'('+ddLabel(dday(x.open))+')':''}</dd><dt>가격</dt><dd>${won(x.price)}</dd><dt>계약대표업체</dt><dd>${esc(x.rep)}</dd><dt>계약업체<br><small>(합계 ${tot}%)</small></dt><dd>${x.cos.map(c=>esc(c.n)+' — '+c.s+'%').join('\n')}</dd><dt>상태</dt><dd>${esc(x.status)}</dd><dt>개찰결과 메모</dt><dd>${esc(x.result)}</dd><dt>비고</dt><dd>${esc(x.memo)}</dd></dl>`;
 $('dfoot').innerHTML=`<button class="d" onclick="del('${id}')">삭제</button><button onclick="openForm('${id}')">수정</button><button onclick="dlg.close()">닫기</button>`;if(!dlg.open)dlg.showModal()}
function del(id){if(confirm('삭제하시겠습니까?')){data=data.filter(e=>e.id!==id);save();dlg.close();render();toast('삭제했습니다')}}
function delExamples(){const n=data.filter(e=>e.example).length+cl.filter(e=>e.example).length+orders.filter(e=>e.example).length+stExCount()+ctExCount();if(!n)return toast('예시 데이터가 없습니다');if(confirm(`예시 데이터 ${n}건(공고·체크리스트·생산·명세서·명함)을 모두 삭제할까요?`)){data=data.filter(e=>!e.example);stDelExamples();ctDelExamples();cl=cl.filter(e=>!e.example);if(orders.some(o=>o.example&&o.id===pv))pv=null;orders=orders.filter(e=>!e.example);save();render();toast('예시를 삭제했습니다')}}
function coRow(n='',s=''){return `<div class="cr"><input placeholder="업체명" value="${esc(n)}" class="cn"><input class="sh cs" type="number" step="0.01" placeholder="지분 %" value="${esc(s)}" oninput="chk()"><button type="button" onclick="this.parentNode.remove();chk()">✕</button></div>`}
function chk(){const v=[...document.querySelectorAll('.cs')].map(i=>+i.value||0),t=Math.round(v.reduce((a,b)=>a+b,0)*100)/100,w=$('sw');if(w){w.className=t===100?'ok':'warn';w.textContent=`지분율 합계: ${t}%`+(t===100?' ✓':' — 100%가 아닙니다!')}}
function openForm(id){const x=id?data.find(e=>e.id===id):{status:'진행중',cos:[]};$('dt').textContent=id?'공고 수정':'새 공고';
 $('dbody').innerHTML=`<div class="g"><label class="w">공고명 *<input id="f_name" value="${esc(x.name)}"></label><label>입찰공고번호<input id="f_no" value="${esc(x.no)}" placeholder="R26BK01619258-000"></label><label>수요기관<input id="f_org" list="orgs" value="${esc(x.org)}"></label>
 <label>게시일시<input id="f_pub" type="datetime-local" value="${esc(x.pub)}"></label><label>개찰일시 *<input id="f_open" type="datetime-local" value="${esc(x.open)}"></label>
 <label>가격 (원)<input id="f_price" inputmode="numeric" value="${x.price?Number(x.price).toLocaleString('ko-KR'):''}" oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\\B(?=(\\d{3})+(?!\\d))/g,',')"></label><label>계약대표업체<input id="f_rep" value="${esc(x.rep)}"></label>
 <div class="w"><div style="font-size:12px;color:#555">계약업체 / 지분율</div><div id="cos">${(x.cos.length?x.cos:[{n:'',s:''}]).map(c=>coRow(c.n,c.s)).join('')}</div><button type="button" onclick="$('cos').insertAdjacentHTML('beforeend',coRow());chk()">+ 업체 추가</button> <span id="sw"></span></div>
 <label>상태<select id="f_status">${ST.map(s=>`<option${s===x.status?' selected':''}>${s}</option>`).join('')}</select></label><label></label>
 <label class="w">개찰결과 메모<textarea id="f_result" rows="2">${esc(x.result)}</textarea></label><label class="w">비고<textarea id="f_memo" rows="2">${esc(x.memo)}</textarea></label></div>`;
 $('dfoot').innerHTML=`<button onclick="dlg.close()">취소</button><button class="p" onclick="saveForm('${id||''}')">저장</button>`;chk();if(!dlg.open)dlg.showModal();$('f_name').focus()}
function saveForm(id){const g=k=>$('f_'+k).value.trim(),o={name:g('name'),no:g('no'),org:g('org'),pub:g('pub'),open:g('open'),price:+g('price').replace(/,/g,'')||0,rep:g('rep'),
 cos:[...document.querySelectorAll('#cos .cr')].map(r=>({n:r.querySelector('.cn').value.trim(),s:+r.querySelector('.cs').value||0})).filter(c=>c.n),status:g('status'),result:g('result'),memo:g('memo'),updated:now()};
 if(!o.name)return alert('공고명을 입력하세요.');if(!o.open)return alert('개찰일시를 입력하세요.');
 const t=o.cos.reduce((a,c)=>a+c.s,0);if(o.cos.length&&Math.round(t*100)!==10000&&!confirm(`지분율 합계가 ${t}%입니다. 그래도 저장할까요?`))return;
 if(id){const i=data.findIndex(e=>e.id===id);data[i]={...data[i],...o}}else data.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),example:false,...o});
 save();render();toast('저장했습니다');id?view(id):dlg.close()}
const stamp=()=>ymd(new Date());
async function exportJSON(){const p=await A.saveFile(`이조영업관리_백업_${stamp()}.json`,JSON.stringify({app:'ijo-sales',version:1,savedAt:new Date().toISOString(),bids:data,checklist:cl,orders,...stPayload(),...ctPayload()},null,2));if(p)toast('백업 저장: '+p)}
async function importJSON(){const t=await A.openFile();if(t==null)return;let d;try{d=normalize(JSON.parse(t.replace(/^\uFEFF/,'')))}catch(e){d=null}
 if(!d)return alert('올바른 백업 파일이 아닙니다.');let raw;try{raw=JSON.parse(t.replace(/^\uFEFF/,''))}catch(e){}const hasCl=raw&&!Array.isArray(raw)&&Array.isArray(raw.checklist),nc=hasCl?normalizeCl(raw.checklist):cl,hasO=raw&&!Array.isArray(raw)&&Array.isArray(raw.orders),no=hasO?normalizeOrders(raw.orders):orders;
 if(confirm(`공고 ${d.length}건${hasCl?`, 체크리스트 ${nc.length}건`:''}${hasO?`, 생산 오더 ${no.length}건`:''}을 불러옵니다. 현재 데이터(공고 ${data.length}건${hasCl?`, 체크리스트 ${cl.length}건`:''})를 대체할까요?${hasCl?'':'\n(체크리스트가 없는 예전 백업이라 현재 체크리스트는 그대로 둡니다)'}\n(현재 데이터는 자동 백업 폴더에 남아 있습니다)`)){data=d;cl=nc;orders=no;pv=null;stImport(raw);ctImport(raw);save();render();toast('복원 완료')}}
async function exportCSV(){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',h=['공고명','입찰공고번호','수요기관','게시일시','개찰일시','가격','계약대표업체','계약업체(지분율)','지분율합계','상태','개찰결과','비고','예시'];
 const rows=[...data].sort((a,b)=>(a.open||'').localeCompare(b.open||'')).map(x=>[x.name,x.no,x.org,fdt(x.pub),fdt(x.open),x.price||'',x.rep,x.cos.map(c=>`${c.n} ${c.s}%`).join(' / '),x.cos.reduce((a,c)=>a+(+c.s||0),0),x.status,x.result,x.memo,x.example?'예시':''].map(q).join(','));
 const p=await A.saveFile(`공고일정_${stamp()}.csv`,'\uFEFF'+[h.map(q).join(','),...rows].join('\r\n'));if(p)toast('내보내기 완료: '+p)}
const dlg=$('dlg');load();A.info().then(i=>{$('dfile').textContent=i.file;$('dbk').textContent=i.backups;if(i.version){$('ver').textContent='v'+i.version;$('curver').textContent='v'+i.version}});go('dash');

const UPD={checking:'새 버전 확인 중…',none:'최신 버전입니다',available:'새 버전 내려받는 중…',error:'업데이트 확인 실패(오프라인?)'};
if(A.onUpdate)A.onUpdate(d=>{$('updst').textContent=d.s==='progress'?`새 버전 내려받는 중… ${d.pct}%`:d.s==='ready'?`v${d.v} 준비 완료 — 재시작하면 적용돼요`:d.s==='available'?`v${d.v} 내려받는 중…`:(UPD[d.s]||'')});
async function checkUpd(){if(!A.checkUpdate)return toast('업데이트 기능을 사용할 수 없습니다');const r=await A.checkUpdate();if(r&&r.dev)toast('개발 모드에서는 업데이트를 확인하지 않습니다')}

function btab(t){bt=t;render()}
function mvd(k){dcur=new Date(dcur.getFullYear(),dcur.getMonth()+k,1);render()}
function mvc(k){ccur=new Date(ccur.getFullYear(),ccur.getMonth()+k,1);render()}
function pickDay(ds){csel=csel===ds?'':ds;$('cqd').value=csel;if(csel)$('cf').value='';render()}
function clItem(c){const td=ymd(new Date()),od=!c.done&&c.due&&c.due<td;
 return `<li class="${od?'od':''}${c.done?' dn':''}"><input type="checkbox" ${c.done?'checked':''} onchange="toggleCl('${c.id}')" title="완료"><div class="t" onclick="openCl('${c.id}')"><span class="pr pr${PR.indexOf(c.pri)}">${c.pri}</span>${c.cat?`<span class="cat">${esc(c.cat)}</span>`:''}${tag(c)}<b>${esc(c.title)}</b><br><small class="due">${c.due?(c.due===td?'오늘 마감':'마감 '+c.due+(od?' (지남)':'')):'마감일 없음'}${c.memo?' · '+esc(c.memo):''}</small></div></li>`}
function toggleCl(id){const c=cl.find(x=>x.id===id);if(!c)return;c.done=!c.done;c.updated=now();save();render();if(c.done)toast('완료했습니다 ✓')}
function quickAdd(i,d){const t=$(i).value.trim();if(!t){$(i).focus();return}cl.push({id:uid(),example:false,title:t,due:$(d).value||'',pri:'보통',cat:'',memo:'',done:false,updated:now()});save();$(i).value='';render();toast('추가했습니다')}
function openCl(id){const x=id?cl.find(e=>e.id===id):{title:'',due:csel||'',pri:'보통',cat:'',memo:'',done:false};if(!x)return;$('dt').textContent=id?'할 일 수정':'새 할 일';
 $('dbody').innerHTML=`<div class="g"><label class="w">할 일 *<input id="c_title" value="${esc(x.title)}"></label><label>마감일<input id="c_due" type="date" value="${esc(x.due)}"></label>
 <label>우선순위<select id="c_pri">${PR.map(p=>`<option${p===x.pri?' selected':''}>${p}</option>`).join('')}</select></label><label>분류<input id="c_cat" list="cats" value="${esc(x.cat)}"></label>
 <label style="flex-direction:row;align-items:center;gap:6px;font-size:14px"><input id="c_done" type="checkbox" ${x.done?'checked':''}> 완료</label><label class="w">메모<textarea id="c_memo" rows="3">${esc(x.memo)}</textarea></label></div>`;
 $('dfoot').innerHTML=(id?`<button class="d" onclick="delCl('${id}')">삭제</button>`:'')+`<button onclick="dlg.close()">취소</button><button class="p" onclick="saveCl('${id||''}')">저장</button>`;if(!dlg.open)dlg.showModal();$('c_title').focus()}
function saveCl(id){const o={title:$('c_title').value.trim(),due:$('c_due').value,pri:$('c_pri').value,cat:$('c_cat').value.trim(),memo:$('c_memo').value.trim(),done:$('c_done').checked,updated:now()};
 if(!o.title)return alert('할 일을 입력하세요.');if(id){const i=cl.findIndex(e=>e.id===id);cl[i]={...cl[i],...o}}else cl.push({id:uid(),example:false,...o});save();render();dlg.close();toast('저장했습니다')}
function delCl(id){if(confirm('이 할 일을 삭제할까요?')){cl=cl.filter(e=>e.id!==id);save();dlg.close();render();toast('삭제했습니다')}}

// ===== 생산 관리 =====
const PCOL=['#1f6feb','#1a7f37','#d4620a','#8250df','#0f8a8a','#c2255c'],pcol=i=>PCOL[i%PCOL.length];
const num=n=>(+n||0).toLocaleString('ko-KR'),sum=p=>p.ships.reduce((a,s)=>a+(+s.qty||0),0);
const pct=v=>(v>0?'+':'')+v.toFixed(1)+'%';
function progress(o){const last=o.procs[o.procs.length-1],cur=[...o.procs].reverse().find(p=>p.ships.length);
 const fin=last?sum(last):0;return {cur,fin,rate:o.qty?fin/o.qty*100:0,last}}
function renderProd(){const v=pv&&orders.find(o=>o.id===pv);$('pl_wrap').style.display=v?'none':'';$('pd_wrap').style.display=v?'':'none';
 $('ptitle').textContent=v?'생산 관리 › '+v.no:'생산 관리';if(v)return renderOrder(v);
 const cs=[...new Set(orders.map(o=>o.client).filter(Boolean))],pc=$('pc'),cv=pc.value;pc.innerHTML='<option value="">전체 거래처</option>'+cs.map(c=>`<option>${esc(c)}</option>`).join('');pc.value=cv;
 const k=$('pk').value.trim().toLowerCase(),st=$('pst').value;
 const l=orders.filter(o=>{const g=progress(o);return (!cv||o.client===cv)&&(!st||(st==='done')===(g.rate>=100))&&(!k||[o.no,o.item,o.fabric,o.color,o.client,...o.procs.flatMap(p=>[p.name,p.vendor])].join(' ').toLowerCase().includes(k))}).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 $('ptb').innerHTML=l.length?l.map(o=>{const g=progress(o);return `<tr class="r" onclick="openDetail('${o.id}')"><td><b>${esc(o.no)}</b></td><td>${tag(o)}${esc(o.item)}${o.fabric?`<br><small class="muted">${esc(o.fabric)}</small>`:''}</td><td>${o.lines.map(l=>`<div class="ln">${esc(l.color)||'-'}</div>`).join('')}</td><td style="text-align:right">${o.lines.map(l=>`<div class="ln">${num(l.qty)} ${esc(l.unit)}</div>`).join('')}${o.lines.length>1&&!o.mixedUnit?`<div class="ln tot">계 ${num(o.qty)} ${esc(o.unit)}</div>`:''}</td><td>${esc(o.client)}</td><td>${esc(o.date)}</td><td>${esc(o.due)}</td>
  <td>${g.cur?`<span class="badge" style="background:${pcol(o.procs.indexOf(g.cur))};color:#fff">${esc(g.cur.name)}</span><small>${num(sum(g.cur))} ${esc(o.unit)}</small>`:'<small class="muted">출고 없음</small>'}</td>
  <td><div class="bar"><i class="${g.rate>=100?'full':''}" style="width:${Math.min(100,g.rate)}%"></i></div><small>${g.last?esc(g.last.name)+' ':''}${num(g.fin)} / ${num(o.qty)} (${g.rate.toFixed(1)}%)</small></td></tr>`}).join(''):'<tr><td colspan="9">생산 오더가 없습니다. [+ 추가]로 등록하세요.</td></tr>'}
function openDetail(id){pv=id;render();$('content').scrollTop=0}
function renderOrder(o){const g=progress(o);let prev=null;
 const head=`<div class="card"><div style="display:flex;gap:8px;margin-bottom:12px"><button onclick="pv=null;render()">◀ 목록</button><span style="flex:1"></span><button class="d" onclick="delOrder('${o.id}')">삭제</button><button class="p" onclick="openOrder('${o.id}')">수정</button></div>
 <div class="oh">${[['오더번호',esc(o.no)],['품목',tag(o)+esc(o.item)],['아이템명',esc(o.fabric)],['색상 / 발주량',o.lines.map(l=>`<span class="cln">${esc(lineTxt(l))}</span>`).join('')+(o.lines.length>1&&!o.mixedUnit?`<small>합계 ${num(o.qty)} ${esc(o.unit)}</small>`:'')],['거래처',esc(o.client)],['발주일',esc(o.date)],['납기일',o.due?`<span class="${o.due<ymd(new Date())&&g.rate<100?'neg':''}">${esc(o.due)}</span>`:'']].map(([k,v])=>`<div><div class="k">${k}</div><div class="v">${v||'-'}</div></div>`).join('')}
 <div class="pg" style="flex:1;min-width:220px"><div class="k">최종 공정 출고 (${g.last?esc(g.last.name):'-'})</div><div class="bar"><i class="${g.rate>=100?'full':''}" style="width:${Math.min(100,g.rate)}%"></i></div><small>${num(g.fin)} / ${num(o.qty)} ${esc(o.unit)} (${g.rate.toFixed(1)}%)</small></div></div></div>`;
 const body=o.procs.map((p,i)=>{const s=sum(p),base=prev==null?o.qty:prev,chg=prev?((s-prev)/prev*100):null,exp=p.shrink!=null&&!isRaw(p)&&base?base*(1-p.shrink/100):null;prev=s;
  const pc=pcol(i);return `<div class="pc" style="border-left:4px solid ${pc}"><div class="pch"><span class="no" style="background:${pc}">${i+1}</span><b style="color:${pc}">${esc(p.name)||'(공정명 없음)'}</b><span class="kv"><span class="k">가공 업체</span><b style="color:${pc}">${esc(p.vendor)||'-'}</b></span><span class="kv"><span class="k">가공 축</span><b style="color:${pc}">${p.shrink!=null&&!isRaw(p)?p.shrink+'%':'-'}</b></span><span class="sp"></span><button class="p" onclick="addShip('${o.id}','${p.id}')" title="출고 추가">+ 출고</button></div>
  <table class="st" style="min-width:0"><thead><tr><th style="width:170px;text-align:center">출고일</th><th style="width:160px;text-align:center">출고량 (${esc(o.unit)})</th><th>메모</th><th style="width:44px"></th></tr></thead><tbody>
  ${p.ships.map(x=>`<tr><td><input type="date" value="${esc(x.date)}" onchange="editShip('${o.id}','${p.id}','${x.id}','date',this.value)"></td><td><input class="num" inputmode="numeric" value="${x.qty?num(x.qty):''}" onchange="editShip('${o.id}','${p.id}','${x.id}','qty',this.value)"></td><td><input value="${esc(x.memo)}" onchange="editShip('${o.id}','${p.id}','${x.id}','memo',this.value)"></td><td><button onclick="delShip('${o.id}','${p.id}','${x.id}')" title="삭제">✕</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted">출고 내역이 없습니다. [+ 출고]로 추가하세요.</td></tr>'}
  </tbody><tfoot><tr><td style="text-align:center">소계</td><td style="text-align:center">${num(s)}</td><td colspan="2"></td></tr></tfoot></table></div>`}).join('')||'<p class="muted">가공 공정이 없습니다. [수정]에서 공정을 추가하세요.</p>';
 $('pd_wrap').innerHTML=head+stmtsForOrder(o)+`<div class="card"><h2>가공 공정 / 출고 내역</h2>${body}</div>`}
const findP=(oid,pid)=>{const o=orders.find(x=>x.id===oid);return [o,o&&o.procs.find(p=>p.id===pid)]};
function touch(o){o.updated=now();save();render()}
function addShip(oid,pid){const [o,p]=findP(oid,pid);if(!p)return;p.ships.push({id:uid(),date:ymd(new Date()),qty:0,memo:''});touch(o);setTimeout(()=>{const ins=[...document.querySelectorAll('#pd_wrap .pc')][o.procs.indexOf(p)]?.querySelectorAll('tbody tr:last-child input');if(ins&&ins[1])ins[1].focus()},0)}
function editShip(oid,pid,sid,k,v){const [o,p]=findP(oid,pid),s=p&&p.ships.find(x=>x.id===sid);if(!s)return;s[k]=k==='qty'?(+String(v).replace(/[^0-9.\-]/g,'')||0):v;touch(o)}
function delShip(oid,pid,sid){const [o,p]=findP(oid,pid);if(!p||!confirm('이 출고 내역을 삭제할까요?'))return;p.ships=p.ships.filter(x=>x.id!==sid);touch(o)}
function delOrder(id){const o=orders.find(x=>x.id===id);if(o&&confirm(`오더 ${o.no}을(를) 출고 내역과 함께 삭제할까요?`)){orders=orders.filter(x=>x.id!==id);pv=null;save();render();toast('삭제했습니다')}}
let fprocs=[];
const isRaw=p=>String(p.name||'').trim()==='생지';
function rawSync(i,el){const p=fprocs[i],s=el.parentNode.querySelector('.shk');if(isRaw(p)){p.shrink=null;s.value='';s.disabled=true}else s.disabled=false}
function procRows(){fprocs.forEach(p=>{if(isRaw(p))p.shrink=null});$('fprocs').innerHTML=fprocs.map((p,i)=>`<div class="prow"><span class="n">${i+1}</span><input placeholder="공정" list="procs" value="${esc(p.name)}" oninput="fprocs[${i}].name=this.value;rawSync(${i},this)"><input placeholder="가공 업체" value="${esc(p.vendor)}" oninput="fprocs[${i}].vendor=this.value"><input type="number" step="0.1" class="shk" ${isRaw(p)?'disabled':''} value="${isRaw(p)?'':(p.shrink??'')}" oninput="fprocs[${i}].shrink=this.value"><span class="pbtn"><button type="button" onclick="mvProc(${i},-1)" ${i?'':'disabled'}>▲</button><button type="button" onclick="mvProc(${i},1)" ${i<fprocs.length-1?'':'disabled'}>▼</button><button type="button" onclick="rmProc(${i})">✕</button></span></div>`).join('')||'<p class="muted">공정이 없습니다.</p>'}
function mvProc(i,k){const j=i+k;[fprocs[i],fprocs[j]]=[fprocs[j],fprocs[i]];procRows()}
function rmProc(i){const p=fprocs[i];if(p.ships&&p.ships.length&&!confirm(`'${p.name||'이 공정'}'에 출고 내역 ${p.ships.length}건이 있습니다. 공정과 출고 내역을 함께 삭제할까요?\n(저장을 눌러야 실제로 반영됩니다)`))return;fprocs.splice(i,1);procRows()}
let flines=[];
const fmtN=v=>String(v).replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,',');
function lineRows(){$('flines').innerHTML=flines.map((l,i)=>`<div class="lrow"><input placeholder="색상" value="${esc(l.color)}" oninput="flines[${i}].color=this.value"><input inputmode="numeric" placeholder="발주량" value="${l.qty?num(l.qty):''}" oninput="this.value=fmtN(this.value);flines[${i}].qty=+this.value.replace(/,/g,'')||0"><select onchange="flines[${i}].unit=this.value">${UNITS.map(u=>`<option${u===l.unit?' selected':''}>${u}</option>`).join('')}</select><button type="button" title="삭제" onclick="flines.splice(${i},1);if(!flines.length)flines.push({color:'',qty:0,unit:'YD'});lineRows()">✕</button></div>`).join('')}
function openOrder(id){const o=id?orders.find(x=>x.id===id):{no:'',item:'',lines:[{color:'',qty:0,unit:'YD'}],client:'',date:ymd(new Date()),procs:[]};if(!o)return;flines=o.lines.map(l=>({...l}));if(!flines.length)flines=[{color:'',qty:0,unit:'YD'}];
 fprocs=o.procs.map(p=>({...p}));if(!id)fprocs=[{id:uid(),name:'',vendor:'',shrink:null,ships:[]}];
 $('dt').textContent=id?'생산 오더 수정':'생산 오더 추가';
 $('dbody').innerHTML=`<div class="fsec">기본 정보</div><div class="g"><label>오더번호 *<input id="o_no" value="${esc(o.no)}" placeholder="예: 2509-0328"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>발주일<input id="o_date" type="date" value="${esc(o.date)}"></label><label>납기일<input id="o_due" type="date" value="${esc(o.due||'')}"></label></div>
 <div class="w" style="display:grid;grid-template-columns:1fr 2fr;gap:8px"><label>거래처<input id="o_client" value="${esc(o.client)}"></label><label>품목<input id="o_item" value="${esc(o.item)}" placeholder="예: 야전배낭 몸체"></label></div><label class="w">아이템명<input id="o_fabric" value="${esc(o.fabric||'')}" placeholder="원단 아이템명"></label>
 <div class="w"><div class="lrow lhead"><span>색상</span><span>발주량</span><span>단위</span><span></span></div><div id="flines"></div><button type="button" onclick="flines.push({color:'',qty:0,unit:(flines[flines.length-1]||{}).unit||'YD'});lineRows();const i=$('flines').querySelectorAll('input');i[i.length-2].focus()">+ 추가</button></div></div>
 <div class="fsec" style="margin-top:16px">가공 공정</div><div class="prow phead"><span></span><span>공정</span><span>가공 업체</span><span>가공 축(%)</span><span></span></div><div id="fprocs"></div><button type="button" onclick="fprocs.push({id:uid(),name:'',vendor:'',shrink:null,ships:[]});procRows()">+ 공정 추가</button>`;
 $('dfoot').innerHTML=`<button onclick="dlg.close()">취소</button><button class="p" onclick="saveOrder('${id||''}')">저장</button>`;lineRows();procRows();if(!dlg.open)dlg.showModal();$('o_no').focus()}
function saveOrder(id){const g=k=>$('o_'+k).value.trim(),o={no:g('no'),item:g('item'),lines:normLines({lines:flines.filter(l=>String(l.color).trim()||l.qty)}),client:g('client'),date:g('date'),due:g('due'),fabric:g('fabric'),updated:now(),
 procs:fprocs.filter(p=>p.name.trim()||p.vendor.trim()||(p.ships&&p.ships.length)).map(p=>({id:p.id,name:p.name.trim(),vendor:p.vendor.trim(),shrink:isRaw(p)?null:numOrNull(p.shrink),ships:p.ships||[]}))};
 if(!o.no)return alert('오더번호를 입력하세요.');if(orders.some(x=>x.no===o.no&&x.id!==id)&&!confirm(`오더번호 ${o.no}이(가) 이미 있습니다. 그래도 저장할까요?`))return;
 deriveOrder(o);if(id){const i=orders.findIndex(x=>x.id===id);orders[i]={...orders[i],...o}}else{const n={id:uid(),example:false,...o};orders.push(n);pv=n.id}
 save();dlg.close();render();toast('저장했습니다')}
async function exportOrdersCSV(){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',h=['오더번호','품목','아이템명','색상','발주량','단위','거래처','발주일','납기일','색상별 발주량','공정순서','공정','가공업체','가공축(%)','출고일','출고량','메모','공정소계'],rows=[];
 orders.forEach(o=>{if(!o.procs.length)rows.push([o.no,o.item,o.fabric,o.color,o.qty,o.unit,o.client,o.date,o.due,o.lines.map(lineTxt).join(' / ')]);o.procs.forEach((p,i)=>{const s=sum(p);(p.ships.length?p.ships:[{}]).forEach(x=>rows.push([o.no,o.item,o.fabric,o.color,o.qty,o.unit,o.client,o.date,o.due,o.lines.map(lineTxt).join(' / '),i+1,p.name,p.vendor,p.shrink??'',x.date||'',x.qty??'',x.memo||'',s]))})});
 const p=await A.saveFile(`생산관리_${stamp()}.csv`,'\uFEFF'+[h.map(q).join(','),...rows.map(r=>r.map(q).join(','))].join('\r\n'));if(p)toast('내보내기 완료: '+p)}
