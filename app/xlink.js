// ===== 연결된 엑셀 파일 (단가 관리 · 매출 관리) — data.xlinks =====
// 경로·마지막 상태(수정 시각·크기·해시)를 기억해 두고, 앱 시작 / 메뉴 열 때 / 창으로 돌아올 때(30초 간격) / 실행 중 1분마다 파일을 확인.
// 바뀌었으면 조용히 다시 불러와 '연결된 엑셀에서 온 행'(단가 src='xl', 매출 source='xl')만 파일 내용으로 맞춤(추가·변경·삭제). 앱에서 직접 넣은 행은 건드리지 않음.
// 같은 키(단가: ITEM+색상+부위, 매출: 오더번호+매출일/연도+거래처+품목+아이템명+색상+가공구분)가 앱에서 직접 넣은 행에 있으면 엑셀 행은 건너뜀(연결할 때 묶을지 물어봄).
let xl={};const xlBusy={},xlLast={},xlRetry={};let XL_POLL=60000,xlPolled=Date.now();
const XL_ST={ok:['정상 · 최신 내용','pos'],loading:['불러오는 중…',''],missing:['파일을 찾을 수 없음','neg'],busy:['파일이 사용 중 — 잠시 후 다시 시도','neg'],timeout:['파일 내려받기가 늦어짐 — 나중에 다시 시도','neg'],parse:['읽기 오류 — 데이터는 그대로','neg'],nosheet:['','neg'],
 relogin:['구글 다시 로그인 필요 — 설정 › 구글 계정 연결','neg'],nologin:['구글 로그인 필요 — 설정 › 구글 계정 연결','neg'],offline:['인터넷 연결 안 됨 — 데이터는 그대로','neg'],denied:['구글 드라이브 파일 접근 권한 없음','neg']};
const XL_WAIT=['missing','busy','timeout','relogin','nologin','offline','denied',''];const xlGP=n=>'구글 드라이브 › '+n;
const xlU=s=>String(s??'').trim().toUpperCase().replace(/\s+/g,' ');
const XL_K={
 price:{t:'단가',unit:'품목',keyDesc:'ITEM+색상+부위',nosheet:'CODE·ITEM 머리글이 있는 단가 시트를 찾지 못함 — 데이터는 그대로',
  arr:()=>prices,set:a=>{prices=a},isL:x=>x.src==='xl',tag:x=>{x.src='xl'},untag:x=>{x.src=''},
  key:x=>[x.item,x.color,x.part].map(piU).join('|'),fields:({id,src,example,...o})=>JSON.stringify(o),
  mk:(x,id)=>({...x,id,src:'xl'})},
 sales:{t:'매출',unit:'매출',keyDesc:'오더번호+매출일+거래처+품목+색상 등',nosheet:'거래처·단가 머리글이 있는 시트를 찾지 못함 — 데이터는 그대로',
  arr:()=>sales,set:a=>{sales=a},isL:x=>x.source==='xl',tag:x=>{x.source='xl'},untag:x=>{x.source='import'},
  key:x=>[x.orderNo,x.date||x.year,x.client,x.item,x.fabric,x.color,x.process].map(xlU).join('|'),fields:({id,source,...o})=>JSON.stringify(o),
  mk:(x,id)=>({...x,id,source:'xl'})}};
function xlLoad(r){const o=r&&!Array.isArray(r)&&r.xlinks&&typeof r.xlinks==='object'?r.xlinks:{};xl={};
 for(const k in XL_K){const v=o[k];if(v&&typeof v==='object'&&typeof v.path==='string'&&v.path)xl[k]={path:v.path,name:String(v.name||''),sheet:String(v.sheet||''),mtime:+v.mtime||0,size:+v.size||0,hash:String(v.hash||''),at:String(v.at||''),status:XL_ST[v.status]?v.status:'',msg:String(v.msg||''),fx:!!v.fx,...(v.src==='g'&&v.gid?{src:'g',gid:String(v.gid),gmime:String(v.gmime||''),sig:String(v.sig||'')}:{}),last:v.last&&typeof v.last==='object'?{a:+v.last.a||0,u:+v.last.u||0,d:+v.last.d||0,s:+v.last.s||0}:null}}}
const xlPayload=()=>({xlinks:xl});
function xlImport(r){if(r&&!Array.isArray(r)&&r.xlinks)xlLoad(r)}
// ---- 파일 → 행 (기존 가져오기 분석 함수를 그대로 사용) ----
function xlRows(kind,r,sheet){
 if(kind==='price'){const book=(r.sheets||[]).filter(s=>s.rows.length&&piHdr(s.rows)>=0);if(!book.length)return null;
  let i=book.findIndex(s=>s.name===sheet);if(i<0)i=Math.max(0,book.findIndex(s=>/^price/i.test(s.name.trim())));
  const sv=[piBook,piSh];piBook=book;piSh=i;let a;try{a=piAnalyze()}finally{[piBook,piSh]=sv}
  return {sheet:book[i].name,fx:a.fx,L:a.L.map(({rn,key,dup,...o})=>o)}}
 const book=(r.sheets||[]).filter(s=>s.rows.length);let i=book.findIndex(s=>s.name===sheet&&siFindHdr(s.rows)>=0);
 if(i<0)book.forEach((s,j)=>{const h=siFindHdr(s.rows);if(h>=0&&(i<0||s.rows.length-h>book[i].rows.length-siFindHdr(book[i].rows)))i=j});
 if(i<0)return null;const sv=[siBook,siSh,siHdr,siMap];siBook=book;siSh=i;siHdr=siFindHdr(book[i].rows);siMap=siDetect(book[i].rows[siHdr]);let a;try{a=siAnalyze()}finally{[siBook,siSh,siHdr,siMap]=sv}
 return {sheet:book[i].name,L:a.L.map(({rn,ok,...o})=>({...o,source:'xl'}))}}
// ---- 비교 ----
function xlOcc(K,a){const c={};return a.map(x=>{const k=K.key(x);c[k]=(c[k]||0)+1;return k+'#'+c[k]})}
function xlPlan(kind,L){const K=XL_K[kind],arr=K.arr(),linked=arr.filter(K.isL),man=arr.filter(x=>!K.isL(x)),lk=xlOcc(K,linked),mk=xlOcc(K,man),ms=new Set(mk),fk=xlOcc(K,L),lm=new Map(linked.map((x,i)=>[lk[i],x]));
 const add=[],upd=[],skip=[],keep=new Set();
 L.forEach((x,i)=>{const k=fk[i],o=lm.get(k);if(o){keep.add(o);if(K.fields(o)!==K.fields(x))upd.push([o,x])}else if(ms.has(k))skip.push([man[mk.indexOf(k)],x]);else add.push(x)});
 return {add,upd,skip,del:linked.filter(x=>!keep.has(x))}}
async function xlApply(kind,P){const K=XL_K[kind];if((P.del.length||P.upd.length)&&A.preImportBackup)await A.preImportBackup();
 const D=new Set(P.del),U=new Map(P.upd),base=uid();let n=0;
 K.set(K.arr().filter(x=>!D.has(x)).map(x=>U.has(x)?K.mk(U.get(x),x.id):x).concat(P.add.map(x=>K.mk(x,base+'x'+(n++)))));
 return {a:P.add.length,u:P.upd.length,d:P.del.length,s:P.skip.length}}
const xlMsg=(kind,c)=>`${XL_K[kind].t} 엑셀에서 새 내용을 불러왔습니다 (추가 ${c.a} · 변경 ${c.u} · 삭제 ${c.d}${c.s?` · 건너뜀 ${c.s}`:''})`;
// ---- 확인 ----
function xlFail(kind,r,manual){const L=xl[kind];if(!L)return;const c=r.code,st=c==='ENOENT'?'missing':c==='EBUSY'||c==='NET'?'busy':c==='TIMEOUT'?'timeout':c==='NOSHEET'?'nosheet':c==='AUTH'?'relogin':c==='NOLOGIN'?'nologin':c==='OFFLINE'?'offline':c==='DENIED'?'denied':'parse';
 const ch=L.status!==st;L.status=st;L.msg=st==='nosheet'?XL_K[kind].nosheet:st==='parse'?String(r.msg||'').slice(0,160):'';if(ch)save();xlRefresh();
 if(ch||manual)toast(`${XL_K[kind].t} 엑셀: ${st==='nosheet'?L.msg:XL_ST[st][0]}${st==='missing'?(L.src==='g'?' — 구글 드라이브에서 지워졌거나 휴지통에 있는지 확인하세요':' — 구글 드라이브가 켜져 있는지 확인하세요'):''}`);
 if((st==='busy'||st==='timeout')&&!xlRetry[kind])xlRetry[kind]=setTimeout(()=>{xlRetry[kind]=0;xlCheck(kind,'retry')},st==='busy'?20000:120000)}
async function xlCheck(kind,why,manual){const L=xl[kind];if(!L||xlBusy[kind])return;xlBusy[kind]=1;xlLast[kind]=Date.now();
 const G=L.src==='g';
 try{if(!manual){const st=G?await A.gStat(L.gid):await A.xlStat(L.path);if(xl[kind]!==L)return;if(!st.ok)return xlFail(kind,st);
   if((G?st.sig===L.sig:st.mtime===L.mtime&&st.size===L.size)&&L.hash){if(XL_WAIT.includes(L.status)){L.status='ok';save();xlRefresh()}return}}
  if(manual){L.status='loading';xlRefresh()}
  const r=G?await A.gRead(kind,L.gid,manual?'':L.hash):await A.xlRead(kind,L.path,manual?'':L.hash);if(xl[kind]!==L)return;if(!r.ok)return xlFail(kind,r,manual);
  const gx=G?{sig:r.sig,name:r.name,path:xlGP(r.name),gmime:r.mime}:{};
  if(r.same){Object.assign(L,{mtime:r.mtime,size:r.size,status:'ok',msg:'',...gx});save();xlRefresh();return}
  const R=xlRows(kind,r,L.sheet);if(!R)return xlFail(kind,{code:'NOSHEET'},manual);
  const c=await xlApply(kind,xlPlan(kind,R.L));let fx='';if(kind==='price'&&L.fx&&R.fx&&R.fx!==prSet.fx){prSet.fx=R.fx;fx=` · 환율 ₩${prW(R.fx)}`}
  Object.assign(L,{name:r.name,sheet:R.sheet,mtime:r.mtime,size:r.size,hash:r.hash,at:new Date().toISOString(),status:'ok',msg:'',last:c,...gx});save();render();
  if(c.a||c.u||c.d||fx)toast(xlMsg(kind,c)+fx);else if(manual)toast(`${XL_K[kind].t} 엑셀: 바뀐 내용이 없어요`)}
 catch(e){xlFail(kind,{code:'PARSE',msg:String(e&&e.message||e)},manual)}
 finally{xlBusy[kind]=0;xlRefresh()}}
function xlCheckAll(why,gap=0){for(const k in xl)if(!gap||Date.now()-(xlLast[k]||0)>=gap)xlCheck(k,why)}
function xlOnGo(p){if(p==='settings'&&typeof gRender==='function')gRender();if(xl[p]&&Date.now()-(xlLast[p]||0)>=3000)xlCheck(p,'open')}
function xlInit(){setTimeout(()=>xlCheckAll('start'),1500);window.addEventListener('focus',()=>xlCheckAll('focus',30000));
 setInterval(()=>{if(Date.now()-xlPolled>=XL_POLL){xlPolled=Date.now();xlCheckAll('poll')}},Math.min(5000,XL_POLL))}
// ---- 연결 / 해제 ----
// g=true: 구글 드라이브에서 선택 (gdrive.js의 gPick), 아니면 이 PC의 파일 경로
async function xlLink(kind,g){if(!A.xlPick)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');const K=XL_K[kind];let p='',f=null;
 if(g){f=await gPick(kind);if(!f)return}else{p=await A.xlPick(kind);if(!p)return}
 toast('파일을 읽는 중…');const r=g?await A.gRead(kind,f.id,''):await A.xlRead(kind,p,'');
 if(!r.ok&&g)return uiAlert(gErrMsg(r));
 if(!r.ok)return uiAlert(r.code==='ENOENT'?'파일을 찾을 수 없어요.':r.code==='EBUSY'?'파일이 다른 프로그램에서 잠겨 있어요. 잠시 후 다시 시도하세요.':r.code==='TIMEOUT'?'파일을 내려받는 데 너무 오래 걸려요. 구글 드라이브에서 파일을 [오프라인 사용 가능]으로 바꾼 뒤 다시 시도하세요.':'파일을 읽지 못했어요: '+(r.msg||''));
 const R=xlRows(kind,r,'');if(!R)return uiAlert(K.nosheet.replace(' — 데이터는 그대로','')+'어요.');
 let P=xlPlan(kind,R.L);
 if(P.skip.length&&await uiConfirm(`앱에 이미 있는 ${K.unit} ${P.skip.length}건이 엑셀의 행과 같아요 (${K.keyDesc} 기준).\n\n[확인] 이 ${P.skip.length}건도 엑셀과 연결해서 앞으로 엑셀 내용으로 맞춰요\n[취소] 앱에 있는 행은 그대로 두고, 엑셀의 같은 행은 건너뛰어요`)){P.skip.forEach(([m])=>K.tag(m));P=xlPlan(kind,R.L)}
 if(P.del.length&&!await uiConfirm(`이전에 연결한 파일에서 온 ${P.del.length}건이 새 파일에는 없어서 지워져요. 계속할까요?\n(지우기 전에 자동 백업해요)`))return;
 let fx=false;if(kind==='price'&&R.fx&&R.fx!==prSet.fx)fx=await uiConfirm(`환율도 엑셀 값 ₩${prW(R.fx)}로 맞출까요? (현재 ₩${prW(prSet.fx)})\n[확인]을 누르면 앞으로도 엑셀의 환율을 따라요.`);
 const c=await xlApply(kind,P);if(fx)prSet.fx=R.fx;
 xl[kind]={path:g?xlGP(r.name):p,...(g?{src:'g',gid:f.id,gmime:r.mime,sig:r.sig}:{}),name:r.name,sheet:R.sheet,mtime:r.mtime,size:r.size,hash:r.hash,at:new Date().toISOString(),status:'ok',msg:'',fx,last:c};xlLast[kind]=Date.now();save();render();toast(xlMsg(kind,c).replace('새 내용을 불러왔습니다','연결하고 불러왔습니다'))}
async function xlUnlink(kind){const K=XL_K[kind],n=K.arr().filter(K.isL).length;
 if(!await uiConfirm(`엑셀 파일 연결을 해제할까요?\n이미 불러온 ${K.unit} ${n}건은 그대로 남고, 앞으로 자동으로 바뀌지 않아요.`))return;
 K.arr().filter(K.isL).forEach(K.untag);delete xl[kind];save();render();toast('연결을 해제했어요')}
// ---- 화면 ----
function xlCard(kind,compact){const L=xl[kind],K=XL_K[kind],b=xlBusy[kind];
 const help=`<div class="muted xlh">엑셀에서 온 행을 앱에서 고쳐도, 다음에 엑셀 파일이 바뀌면 엑셀 내용으로 덮어써요. 앱에서 직접 추가한 행은 건드리지 않아요.</div>`;
 if(!L)return `<div class="xlrow"><b>연결된 엑셀 파일</b><span class="muted">${K.t} 엑셀(구글 드라이브 폴더 등)을 연결하면 파일이 바뀔 때마다 자동으로 다시 불러와요.</span><span style="flex:1"></span><button onclick="xlLink('${kind}')">파일 연결</button><button onclick="xlLink('${kind}',true)">구글 드라이브에서 선택</button></div>${compact?'':help}`;
 const st=b?XL_ST.loading:XL_ST[L.status]||['확인 전',''],stx=L.status==='nosheet'&&!b?L.msg:st[0]+(L.status==='parse'&&L.msg&&!b?` (${esc(L.msg)})`:''),at=L.at?new Date(L.at).toLocaleString('ko-KR'):'-',c=L.last;
 return `<div class="xlrow"><b>연결된 엑셀 파일</b>${L.src==='g'?'<span class="xlg" title="구글 계정으로 직접 연결 (구글 드라이브 데스크톱 앱 필요 없음)">구글 드라이브</span>':''}<span class="xlp" title="${esc(L.path)}">${esc(L.src==='g'?L.name:L.path)}</span><span style="flex:1"></span><button onclick="xlCheck('${kind}','manual',true)"${b?' disabled':''}>지금 다시 불러오기</button><button onclick="xlLink('${kind}')" title="이 PC(또는 구글 드라이브 폴더)의 파일로 변경">다른 파일로 변경</button><button onclick="xlLink('${kind}',true)">구글 드라이브에서 선택</button><button onclick="xlUnlink('${kind}')">연결 해제</button></div>
 <div class="xli"><span>마지막 불러온 시각 <b>${at}</b></span>${L.src==='g'&&L.gmime==='application/vnd.google-apps.spreadsheet'?'<span class="muted">구글 시트</span>':''}<span>상태 <b class="${b?'':st[1]}" data-xlst="${b?'loading':L.status}">${stx}</b></span>${c?`<span class="muted">지난번: 추가 ${c.a} · 변경 ${c.u} · 삭제 ${c.d}${c.s?` · 건너뜀 ${c.s}`:''}</span>`:''}<span class="muted">연결된 ${K.unit} ${K.arr().filter(K.isL).length}건</span></div>${help}`}
function xlRefresh(){const a=$('pr_xl'),b=$('sl_xl');if(a&&a.offsetParent!==null)a.innerHTML=xlCard('price');if(b&&b.offsetParent!==null)b.innerHTML=xlCard('sales',true)}
