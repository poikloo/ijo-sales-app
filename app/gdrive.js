// ===== 설정 › 구글 계정 연결 + 구글 드라이브 파일 선택 창 =====
// Client Secret·로그인 정보는 메인 프로세스(gdrive.js)가 암호화해 따로 보관하고, 화면에는 이메일·상태만 보여 줌.
const G_GUIDE='https://github.com/poikloo/ijo-sales-app/blob/main/docs/GOOGLE_LOGIN.md';
let gSt=null,gEdit=false,gLogging=false;
function gErrMsg(r){const c=r&&r.code;return c==='NOLOGIN'||c==='NOCLIENT'?'먼저 설정 › 구글 계정 연결에서 로그인하세요.':c==='AUTH'?'구글 로그인이 만료됐어요. 설정 › 구글 계정 연결에서 다시 로그인하세요.':c==='OFFLINE'?'인터넷에 연결되어 있지 않아요. 연결을 확인한 뒤 다시 시도하세요.':
 c==='TIMEOUT'?'구글 드라이브 응답이 너무 늦어요. 잠시 후 다시 시도하세요.':c==='ENOENT'?'구글 드라이브에서 파일을 찾을 수 없어요.':c==='DENIED'?'이 파일을 읽을 권한이 없어요.':c==='BADCLIENT'?'Client ID 또는 Client Secret이 맞지 않아요. 구글 클라우드 콘솔에서 다시 확인하세요.':
 c==='CANCEL'?'로그인을 취소했어요.':c==='DENIED_LOGIN'?'구글 로그인 화면에서 허용하지 않았어요.':'구글 드라이브 오류: '+(r&&r.msg||c||'')}
const gShortId=id=>id.length>34?id.slice(0,14)+'…'+id.slice(-26):id;
async function gRender(){const el=$('g_card');if(!el||!A.gStatus)return;const s=gSt=await A.gStatus();
 let h=`<h2>구글 계정 연결 <span class="muted" style="font-weight:normal">— 구글 드라이브의 엑셀·구글 시트를 단가·매출 관리에 바로 연결 (구글 드라이브 데스크톱 앱 없이)</span></h2>`;
 if(!s.enc)h+=`<p class="neg">이 PC에서는 암호화 저장을 쓸 수 없어서 구글 로그인을 사용할 수 없어요. (구글 드라이브 폴더의 파일 연결은 그대로 쓸 수 있어요)</p>`;
 else if(!s.hasClient||gEdit)h+=`<p class="muted" style="margin:0 0 10px">구글 클라우드 콘솔에서 직접 만든 OAuth 클라이언트(유형: 데스크톱 앱)의 Client ID와 Client Secret을 붙여 넣으세요. <a href="#" onclick="api.openExternal(G_GUIDE);return false">만드는 방법 보기</a></p>
  <div class="pcf" style="max-width:760px"><label>Client ID<input id="g_id" placeholder="숫자-영문….apps.googleusercontent.com" autocomplete="off" spellcheck="false"></label><label>Client Secret<input id="g_sec" type="password" autocomplete="off" spellcheck="false"></label></div>
  <div style="margin-top:10px"><button class="p" onclick="gSaveClient()">저장</button>${gEdit?'<button onclick="gEdit=false;gRender()">취소</button>':''}</div>`;
 else{const st=gLogging?`<b>브라우저에서 구글 로그인을 마쳐 주세요… (5분 안에)</b>`:s.state==='ok'?`<span class="pos">●</span> 로그인됨 <b data-gemail>${esc(s.email||'(이메일 확인 안 됨)')}</b>`:s.state==='relogin'?`<b class="neg">다시 로그인 필요</b> <span class="muted">(로그인 기간이 끝났거나 권한이 취소됐어요)</span>`:`<span class="muted">로그인 안 됨</span>`;
  const btn=gLogging?`<button onclick="A.gLoginCancel()">취소</button>`:s.state==='ok'?`<button onclick="gLogoutGo()">로그아웃</button>`:`<button class="p" onclick="gLoginGo()">${s.state==='relogin'?'다시 로그인':'로그인'}</button>`;
  h+=`<div class="xlrow" style="margin-bottom:10px"><span>상태</span><span data-gst="${gLogging?'busy':s.state}">${st}</span><span style="flex:1"></span>${btn}</div>
  <div class="xli" style="margin-top:0"><span>Client ID <code>${esc(gShortId(s.clientId))}</code></span><span>Client Secret <span class="muted">암호화해서 저장됨</span></span><span style="flex:1"></span><button onclick="gEdit=true;gRender()">클라이언트 변경</button><button onclick="gClearGo()">클라이언트 지우기</button></div>`}
 h+=`<p class="muted" style="font-size:12px;margin:10px 0 0">Client Secret과 로그인 정보는 이 PC에만 암호화해서 따로 저장하고, 백업 파일(JSON)에는 넣지 않아요. 다른 PC에서는 그 PC에서 한 번 더 로그인하세요. 읽기 전용 권한만 받아서 구글 드라이브 파일을 바꾸지 않아요.</p>`;
 el.innerHTML=h}
async function gSaveClient(){const r=await A.gSetClient($('g_id').value,$('g_sec').value);if(!r.ok)return uiAlert(r.msg||'저장하지 못했어요.');gEdit=false;toast('구글 클라이언트 정보를 저장했어요. 이제 [로그인]을 누르세요.');gRender()}
async function gLoginGo(){if(gLogging)return;gLogging=true;gRender();const r=await A.gLogin();gLogging=false;
 if(r.ok){toast('구글 로그인 완료: '+(r.email||''));gRender();for(const k in xl)if(xl[k].src==='g')xlCheck(k,'login')}
 else{gRender();if(r.code!=='CANCEL')uiAlert(gErrMsg(r.code==='DENIED'?{code:'DENIED_LOGIN'}:r))}}
async function gLogoutGo(){if(!await uiConfirm('구글 계정에서 로그아웃할까요?\n구글 드라이브에서 연결한 파일은 다시 로그인할 때까지 자동으로 다시 불러오지 않아요. (불러온 데이터는 그대로)'))return;
 await A.gLogout();toast('로그아웃했어요');gRender();for(const k in xl)if(xl[k].src==='g')xlCheck(k,'logout')}
async function gClearGo(){if(!await uiConfirm('저장된 Client ID·Client Secret과 로그인 정보를 이 PC에서 지울까요?'))return;await A.gClearClient();gEdit=false;toast('지웠어요');gRender()}
// ---- 구글 드라이브 파일 선택 창 ----
let gp=null;
function gPick(kind){return new Promise(async res=>{const s=await A.gStatus();
 if(s.state!=='ok'){await uiAlert(s.state==='relogin'?gErrMsg({code:'AUTH'}):!s.hasClient?'먼저 설정 › 구글 계정 연결에서 Client ID·Secret을 넣고 로그인하세요.':gErrMsg({code:'NOLOGIN'}));go('settings');return res(null)}
 const d=document.createElement('dialog');d.id='gpk';
 d.innerHTML=`<div class="dh">구글 드라이브에서 ${XL_K[kind].t} 파일 선택 <span class="muted" style="font-weight:normal;font-size:12px">엑셀(.xlsx)과 구글 시트만 보여요 · ${esc(s.email)}</span></div>
 <div class="db"><div class="gpt"><button data-m="recent">최근 파일</button><button data-m="folder">내 드라이브</button><button data-m="shared">공유 문서함</button><span style="flex:1"></span><input id="gpq" placeholder="파일 이름 검색" style="width:220px"><button id="gpgo">검색</button></div>
 <div class="gpbc" id="gpbc"></div><div class="gpl" id="gpl"></div></div>
 <div class="df"><span class="muted" id="gpsel" style="flex:1;text-align:left"></span><button data-x="0">취소</button><button class="p" data-x="1" disabled>선택</button></div>`;
 gp={d,mode:'recent',stack:[],q:'',files:[],next:'',sel:null,busy:0,err:'',res,kind};
 const fin=v=>{if(!gp||gp.d!==d)return;gp=null;try{d.close()}catch(e){}d.remove();res(v)};d._fin=fin;
 d.addEventListener('cancel',e=>{e.preventDefault();fin(null)});
 d.addEventListener('click',e=>{const t=e.target.closest('button,tr[data-i],span[data-bc]');if(!t)return;
  if(t.dataset.m){gp.mode=t.dataset.m;gp.stack=t.dataset.m==='folder'?[{id:'root',name:'내 드라이브'}]:t.dataset.m==='shared'?[{id:'',name:'공유 문서함',shared:1}]:[];gpLoad()}
  else if(t.id==='gpgo')gpSearch();else if(t.id==='gpmore')gpLoad(true);
  else if(t.dataset.bc!==undefined){gp.stack=gp.stack.slice(0,+t.dataset.bc+1);gp.mode=gp.stack.length===1&&gp.stack[0].shared?'shared':'folder';gpLoad()}
  else if(t.dataset.i!==undefined){const f=gp.files[+t.dataset.i];if(f.kind==='folder'){gp.stack.push({id:f.id,name:f.name});gp.mode='folder';gpLoad()}else{gp.sel=f;gpDraw()}}
  else if(t.dataset.x!==undefined)fin(t.dataset.x==='1'&&gp.sel?{id:gp.sel.id,name:gp.sel.name,mime:gp.sel.mime}:null)});
 d.addEventListener('dblclick',e=>{const t=e.target.closest('tr[data-i]');if(!t)return;const f=gp.files[+t.dataset.i];if(f&&f.kind!=='folder')fin({id:f.id,name:f.name,mime:f.mime})});
 d.querySelector('#gpq').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();gpSearch()}});
 document.body.appendChild(d);d.showModal();d.querySelector('#gpq').focus();gpLoad()})}
function gpSearch(){const q=$('gpq').value.trim();if(!q){gp.mode='recent';gp.stack=[]}else{gp.mode='search';gp.q=q;gp.stack=[]}gpLoad()}
async function gpLoad(more){if(!gp)return;const me=gp,tok=more?gp.next:'';if(!more){gp.files=[];gp.sel=null}gp.busy=1;gp.err='';gpDraw();
 const top=gp.stack[gp.stack.length-1];const r=await A.gList({mode:gp.mode,folderId:top&&top.id,q:gp.q,pageToken:tok});if(gp!==me)return;gp.busy=0;
 if(!r.ok){gp.err=gErrMsg(r);gpDraw();return}gp.files=gp.files.concat(r.files);gp.next=r.next;gpDraw()}
const GP_K={folder:['폴더','gpf'],sheet:['구글 시트','gps'],xlsx:['엑셀','gpx']};
function gpDraw(){if(!gp)return;const d=gp.d;d.querySelectorAll('.gpt button[data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===gp.mode));
 d.querySelector('#gpbc').innerHTML=gp.mode==='recent'?'<span class="muted">최근에 수정한 엑셀·구글 시트</span>':gp.mode==='search'?`<span class="muted">검색: <b>${esc(gp.q)}</b></span>`:gp.stack.map((s,i)=>`<span data-bc="${i}">${esc(s.name)}</span>`).join(' › ');
 const rows=gp.files.map((f,i)=>{const k=GP_K[f.kind];return `<tr data-i="${i}" class="${gp.sel&&gp.sel.id===f.id?'sel':''}"><td><span class="gpk ${k[1]}">${k[0]}</span></td><td class="gpn">${esc(f.name)}</td><td class="muted">${f.modifiedTime?new Date(f.modifiedTime).toLocaleString('ko-KR'):''}</td><td class="muted num">${f.kind==='xlsx'&&f.size?(f.size/1024).toFixed(f.size<10240?1:0)+' KB':''}</td></tr>`}).join('');
 d.querySelector('#gpl').innerHTML=gp.err?`<p class="neg" style="padding:16px">${esc(gp.err)}</p>`:`<table><thead><tr><th style="width:80px">종류</th><th>이름</th><th style="width:190px">수정한 시각</th><th style="width:80px">크기</th></tr></thead><tbody>${rows}</tbody></table>${gp.busy?'<p class="muted" style="padding:12px">불러오는 중…</p>':!gp.files.length?'<p class="muted" style="padding:16px">표시할 파일이 없어요.</p>':''}${gp.next&&!gp.busy?'<div style="text-align:center;padding:8px"><button id="gpmore">더 보기</button></div>':''}`;
 d.querySelector('#gpsel').textContent=gp.sel?'선택: '+gp.sel.name:'파일을 클릭해 선택하세요 (폴더는 클릭하면 열려요)';d.querySelector('button[data-x="1"]').disabled=!gp.sel}
