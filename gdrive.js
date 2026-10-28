// ===== 구글 로그인 + 구글 드라이브 파일 읽기 (연결된 엑셀 파일용) =====
// - OAuth 클라이언트(ID·Secret)는 사용자가 직접 만들어 설정에 붙여 넣음. 저장소에는 어떤 ID·Secret·토큰도 넣지 않음.
// - Client Secret과 refresh token은 Electron safeStorage로 암호화해 userData의 별도 파일에 저장 (data.json·백업·JSON 내보내기에 포함되지 않음).
// - 로그인: 설치형 앱 루프백 방식 + PKCE (시스템 브라우저 → 127.0.0.1 임의 포트로 돌아옴), 5분 제한.
const {ipcMain,app,shell,safeStorage}=require('electron');
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const SCOPES='openid email https://www.googleapis.com/auth/drive.readonly';
const MIME={folder:'application/vnd.google-apps.folder',sheet:'application/vnd.google-apps.spreadsheet',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
// 테스트에서만: IJO_GOOGLE_TEST_BASE로 가짜 서버 주소를 넣음 (패키지된 실제 앱에서는 무시)
function EP(){const b=!app.isPackaged&&process.env.IJO_GOOGLE_TEST_BASE;return b?{auth:b+'/auth',token:b+'/token',revoke:b+'/revoke',drive:b+'/drive/v3'}:
 {auth:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',revoke:'https://oauth2.googleapis.com/revoke',drive:'https://www.googleapis.com/drive/v3'}}
const F=n=>path.join(app.getPath('userData'),n),CF='google-client.dat',TF='google-token.dat';
const encOk=()=>{try{return safeStorage.isEncryptionAvailable()}catch(e){return false}};
function rd(n){try{const b=fs.readFileSync(F(n));return JSON.parse(safeStorage.decryptString(b))}catch(e){return null}}
function wr(n,o){if(!encOk())throw Object.assign(new Error('이 PC에서 암호화 저장을 쓸 수 없어요'),{code:'NOENC'});const f=F(n);fs.writeFileSync(f+'.tmp',safeStorage.encryptString(JSON.stringify(o)));fs.renameSync(f+'.tmp',f)}
const rm=n=>{try{fs.rmSync(F(n),{force:true})}catch(e){}};
let acc=null,loginJob=null,refreshing=null;
const err=(code,msg)=>Object.assign(new Error(msg||code),{code});
const b64u=b=>b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const jwtEmail=t=>{try{return JSON.parse(Buffer.from(String(t).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8')).email||''}catch(e){return ''}};
async function hfetch(url,opt={},ms=30000){try{return await fetch(url,{...opt,signal:AbortSignal.timeout(ms)})}
 catch(e){const n=e&&(e.name||'');if(n==='TimeoutError'||n==='AbortError')throw err('TIMEOUT','시간 초과');throw err('OFFLINE',String(e&&e.cause&&e.cause.code||e&&e.message||e))}}
async function tokenPost(form){const r=await hfetch(EP().token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form).toString()});
 let j={};try{j=await r.json()}catch(e){}return {status:r.status,j}}
// 액세스 토큰 (만료 1분 전이면 refresh token으로 새로 받음). invalid_grant → '다시 로그인 필요'
async function token(force){const c=rd(CF),t=rd(TF);if(!c||!t||!t.refreshToken)throw err('NOLOGIN');if(t.relogin)throw err('AUTH');
 if(!force&&acc&&acc.exp-60000>Date.now())return acc.tok;
 if(refreshing)return refreshing;
 refreshing=(async()=>{const {status,j}=await tokenPost({client_id:c.clientId,client_secret:c.clientSecret,refresh_token:t.refreshToken,grant_type:'refresh_token'});
  if(status===200&&j.access_token){acc={tok:j.access_token,exp:Date.now()+(+j.expires_in||3600)*1000};return acc.tok}
  if(j.error==='invalid_grant'||j.error==='invalid_client'||j.error==='unauthorized_client'){acc=null;try{wr(TF,{...t,relogin:true})}catch(e){}throw err('AUTH',j.error)}
  throw err(status>=500?'NET':'AUTHERR',j.error_description||j.error||('HTTP '+status))})();
 try{return await refreshing}finally{refreshing=null}}
async function api(u,ms=30000,raw){let tok=await token(),r=await hfetch(u,{headers:{Authorization:'Bearer '+tok}},ms);
 if(r.status===401){acc=null;tok=await token(true);r=await hfetch(u,{headers:{Authorization:'Bearer '+tok}},ms)}
 if(r.ok)return raw?Buffer.from(await r.arrayBuffer()):r.json();
 let j={};try{j=await r.json()}catch(e){}const m=j.error&&(j.error.message||j.error.status)||('HTTP '+r.status),reason=j.error&&j.error.errors&&j.error.errors[0]&&j.error.errors[0].reason||'';
 if(r.status===404)throw err('ENOENT',m);if(r.status===401)throw err('AUTH',m);
 if(r.status===403&&!/rate|quota|userRateLimit/i.test(reason))throw err(reason==='exportSizeLimitExceeded'?'PARSE':'DENIED',reason==='exportSizeLimitExceeded'?'구글 시트가 너무 커서 엑셀로 내보낼 수 없어요 (10MB 제한)':m);
 throw err('NET',m)}
const ret=e=>({code:e&&e.code||'PARSE',msg:String(e&&e.message||e)});
const sigOf=m=>m.md5Checksum?'md5:'+m.md5Checksum:'v:'+(m.version||'')+'|'+(m.modifiedTime||'');
const META='id,name,mimeType,modifiedTime,md5Checksum,version,size,trashed';
async function meta(id){const m=await api(`${EP().drive}/files/${encodeURIComponent(id)}?fields=${META}&supportsAllDrives=true`);if(m.trashed)throw err('ENOENT','휴지통에 있음');
 if(m.mimeType!==MIME.sheet&&m.mimeType!==MIME.xlsx)throw err('PARSE','엑셀(.xlsx)이나 구글 시트가 아니에요');return m}
const qs=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
function setup({getWin,books,XL_TIMEOUT}){
 ipcMain.handle('gStatus',()=>{const c=rd(CF),t=rd(TF);return {enc:encOk(),hasClient:!!c,clientId:c?c.clientId:'',email:t&&t.clientId===(c&&c.clientId)?t.email||'':'',state:!c||!t||t.clientId!==c.clientId?'none':t.relogin?'relogin':'ok',busy:!!loginJob}});
 ipcMain.handle('gSetClient',(e,id,secret)=>{id=String(id||'').trim();secret=String(secret||'').trim();
  if(!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(id))return {code:'BADID',msg:'Client ID는 ….apps.googleusercontent.com 으로 끝나야 해요'};if(!secret)return {code:'BADSECRET',msg:'Client Secret을 입력하세요'};
  try{const o=rd(CF);wr(CF,{clientId:id,clientSecret:secret});if(!o||o.clientId!==id){rm(TF);acc=null}return {ok:true}}catch(x){return ret(x)}});
 ipcMain.handle('gClearClient',async()=>{await logout();rm(CF);return {ok:true}});
 ipcMain.handle('gLogin',async()=>{try{return await login(getWin)}catch(x){return ret(x)}});
 ipcMain.handle('gLoginCancel',()=>{if(loginJob)loginJob.cancel();return true});
 ipcMain.handle('gLogout',async()=>{await logout();return {ok:true}});
 // 파일 목록: mode recent | folder | shared | search
 ipcMain.handle('gList',async(e,o={})=>{try{const D=EP().drive,types=`(mimeType='${MIME.sheet}' or mimeType='${MIME.xlsx}')`,withF=`(mimeType='${MIME.folder}' or mimeType='${MIME.sheet}' or mimeType='${MIME.xlsx}')`;let q,orderBy;
   if(o.mode==='folder'){q=`'${qs(o.folderId||'root')}' in parents and trashed=false and ${withF}`;orderBy='folder,name'}
   else if(o.mode==='shared'){q=`sharedWithMe and trashed=false and ${withF}`;orderBy='folder,modifiedTime desc'}
   else if(o.mode==='search'){q=`name contains '${qs(o.q||'')}' and trashed=false and ${types}`;orderBy='modifiedTime desc'}
   else{q=`trashed=false and ${types}`;orderBy='modifiedTime desc'}
   const p=new URLSearchParams({q,orderBy,pageSize:'50',fields:'nextPageToken,files(id,name,mimeType,modifiedTime,size,owners(displayName))',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});if(o.pageToken)p.set('pageToken',o.pageToken);
   const j=await api(`${D}/files?${p}`);return {ok:true,files:(j.files||[]).map(f=>({id:f.id,name:f.name,mime:f.mimeType,kind:f.mimeType===MIME.folder?'folder':f.mimeType===MIME.sheet?'sheet':'xlsx',modifiedTime:f.modifiedTime||'',size:+f.size||0,owner:f.owners&&f.owners[0]&&f.owners[0].displayName||''})),next:j.nextPageToken||''}}catch(x){return ret(x)}});
 ipcMain.handle('gStat',async(e,id)=>{try{const m=await meta(String(id));return {ok:true,name:m.name,mime:m.mimeType,sig:sigOf(m),mtime:Date.parse(m.modifiedTime)||0,size:+m.size||0}}catch(x){return ret(x)}});
 // 내려받기: xlsx → files.get alt=media, 구글 시트 → files.export (xlsx). 임시 파일에 써서 기존 분석 함수로 읽음
 ipcMain.handle('gRead',async(e,kind,id,lastHash)=>{const book=books[kind];if(!book)return {code:'PARSE',msg:'unknown'};id=String(id);
  const tmp=path.join(app.getPath('temp'),`ijo-gd-${kind}-${process.pid}-${Date.now()}.xlsx`);
  try{const m=await meta(id),D=EP().drive,eid=encodeURIComponent(id);
   const buf=m.mimeType===MIME.sheet?await api(`${D}/files/${eid}/export?mimeType=${encodeURIComponent(MIME.xlsx)}`,XL_TIMEOUT,true):await api(`${D}/files/${eid}?alt=media&supportsAllDrives=true`,XL_TIMEOUT,true);
   const hash=crypto.createHash('sha1').update(buf).digest('hex'),base={ok:true,name:m.name,mime:m.mimeType,sig:sigOf(m),mtime:Date.parse(m.modifiedTime)||0,size:buf.length,hash};
   if(lastHash&&hash===lastHash)return {...base,same:true};
   await fs.promises.writeFile(tmp,buf);try{return {...base,...await book(tmp)}}catch(x){return {code:'PARSE',msg:String(x&&x.message||x)}}}
  catch(x){return ret(x)}finally{fs.promises.rm(tmp,{force:true}).catch(()=>{})}});
}
async function logout(){const t=rd(TF);acc=null;rm(TF);
 if(t&&t.refreshToken)try{await hfetch(EP().revoke,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:t.refreshToken}).toString()},10000)}catch(e){}}
const PAGE=(t,m)=>`<!doctype html><meta charset="utf-8"><title>${t}</title><body style="font-family:'Malgun Gothic',sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;margin:0;background:#f0f0f1"><div style="background:#fff;padding:36px 48px;border-radius:12px;box-shadow:0 2px 12px #0002;text-align:center"><h2 style="margin:0 0 10px">${t}</h2><p style="color:#50575e;margin:0">${m}</p></div>`;
async function login(getWin){const c=rd(CF);if(!c)throw err('NOCLIENT','먼저 Client ID와 Client Secret을 저장하세요');
 if(loginJob)loginJob.cancel();
 const ver=b64u(crypto.randomBytes(48)),chal=b64u(crypto.createHash('sha256').update(ver).digest()),state=b64u(crypto.randomBytes(16));
 const srv=http.createServer();await new Promise((res,rej)=>{srv.once('error',rej);srv.listen(0,'127.0.0.1',res)});
 const redirect=`http://127.0.0.1:${srv.address().port}`;let done,fail,timer;
 const got=new Promise((a,b)=>{done=a;fail=b});const job=loginJob={cancel:()=>fail(err('CANCEL','로그인을 취소했어요'))};
 timer=setTimeout(()=>fail(err('TIMEOUT','5분 안에 로그인을 마치지 않았어요')),5*60000);
 srv.on('request',(req,res)=>{const u=new URL(req.url,redirect);if(u.pathname!=='/'){res.writeHead(404);return res.end()}
  const send=(t,m)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Connection':'close'});res.end(PAGE(t,m))};
  if(u.searchParams.get('state')!==state){send('로그인 실패','요청이 맞지 않아요. 앱에서 다시 로그인하세요.');return}
  const e=u.searchParams.get('error');if(e){send('로그인 취소','앱으로 돌아가 다시 시도하세요.');return fail(err('DENIED',e))}
  const code=u.searchParams.get('code');if(!code){send('로그인 실패','앱에서 다시 로그인하세요.');return}
  send('로그인 완료','로그인 완료, 창을 닫아도 됩니다. 이조 영업관리로 돌아가세요.');done(code)});
 try{const url=EP().auth+'?'+new URLSearchParams({client_id:c.clientId,redirect_uri:redirect,response_type:'code',scope:SCOPES,code_challenge:chal,code_challenge_method:'S256',state,access_type:'offline',prompt:'consent'});
  await shell.openExternal(url);const code=await got;
  const {status,j}=await tokenPost({code,client_id:c.clientId,client_secret:c.clientSecret,redirect_uri:redirect,grant_type:'authorization_code',code_verifier:ver});
  if(status!==200||!j.access_token)throw err(j.error==='invalid_client'?'BADCLIENT':'AUTHERR',j.error_description||j.error||('HTTP '+status));
  if(!j.refresh_token)throw err('AUTHERR','refresh token을 받지 못했어요. 다시 로그인하세요.');
  const email=jwtEmail(j.id_token);wr(TF,{clientId:c.clientId,refreshToken:j.refresh_token,email,at:new Date().toISOString()});acc={tok:j.access_token,exp:Date.now()+(+j.expires_in||3600)*1000};
  const w=getWin();if(w&&!w.isDestroyed()){if(w.isMinimized())w.restore();w.focus()}
  return {ok:true,email}}
 finally{clearTimeout(timer);srv.close();if(srv.closeAllConnections)srv.closeAllConnections();if(loginJob===job)loginJob=null}}
module.exports={setup};
