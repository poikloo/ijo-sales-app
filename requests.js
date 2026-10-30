// ===== 요청함 (Grok Bot 요청 받기) — main 프로세스 =====
// <userData>/requests/inbox 에 놓인 JSON 요청 파일을 읽어 화면(렌더러)에 '대기 중인 요청'으로 넘김.
// 여기서는 데이터를 절대 바꾸지 않음: 적용/거부는 사용자가 카드에서 누르고, 데이터는 앱의 기존 로직(렌더러)으로만 만들어짐.
// 처리된 파일은 done / rejected, 형식이 잘못된 파일은 error 폴더로 옮기고 옆에 <이름>.result.json(결과·사유)을 남김.
const {app,ipcMain,shell}=require('electron');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=()=>path.join(app.getPath('userData'),'requests');
const D={inbox:()=>path.join(ROOT(),'inbox'),done:()=>path.join(ROOT(),'done'),rejected:()=>path.join(ROOT(),'rejected'),error:()=>path.join(ROOT(),'error')};
const TYPES=['production.addOrder','production.updateOrder','production.addShipment','production.setDone','statement.createFromOrder','sales.addRow','price.addRow','production.attachFile','testReport.attachFile','testReport.setResults','quality.addItem','quality.updateItem','quality.attachFile'];
const MAX_SIZE=2*1024*1024,SETTLE_MS=1500,POLL_MS=5000;
function ensure(){for(const k in D)fs.mkdirSync(D[k](),{recursive:true})}
const isReqFile=n=>/\.json$/i.test(n)&&!/\.result\.json$/i.test(n)&&!/^[.~]/.test(n);
// 형식(구조) 검사: 여기서 걸리면 error 폴더로. 필드 내용(오더번호가 있는지 등)은 화면의 카드에서 검사해서 [적용]을 막음.
function structErr(r){
  if(!r||typeof r!=='object'||Array.isArray(r))return '최상위가 JSON 객체가 아닙니다';
  if(r.version!==1)return `version은 1이어야 합니다 (받은 값: ${JSON.stringify(r.version)})`;
  if(typeof r.id!=='string'||!r.id.trim()||r.id.length>100)return 'id(문자열, 100자 이하)가 없습니다';
  if(typeof r.createdAt!=='string'||isNaN(Date.parse(r.createdAt)))return 'createdAt(ISO 날짜·시간 문자열)이 없거나 잘못됐습니다';
  if(r.source!=='grokbot')return "source는 'grokbot'이어야 합니다";
  if(r.note!=null&&typeof r.note!=='string')return 'note는 문자열이어야 합니다';
  if(!Array.isArray(r.actions)||!r.actions.length)return 'actions 배열이 비어 있습니다';
  if(r.actions.length>200)return 'actions는 200개까지입니다';
  for(let i=0;i<r.actions.length;i++){const a=r.actions[i];
    if(!a||typeof a!=='object'||Array.isArray(a))return `actions[${i}]가 객체가 아닙니다`;
    if(!TYPES.includes(a.type))return `actions[${i}].type '${String(a.type)}'은(는) 지원하지 않습니다 (지원: ${TYPES.join(', ')})`}
  return ''}
// ---- 첨부 파일 (production.attachFile): 요청 파일 옆(inbox 안 하위 폴더, 예: inbox\files\x.pdf)에 둔 파일만 허용 ----
const ATT_EXT=/\.(pdf|jpe?g|png|webp|gif)$/i,ATT_EXT_QS=/\.(pdf|jpe?g|png|webp|gif|hwpx?)$/i,MAX_ATT=20*1024*1024;
function attInfo(rel,qs){
  if(typeof rel!=='string'||!rel.trim())return {error:'file(첨부할 파일 경로)이 없습니다'};
  if(rel.length>260)return {error:'file 경로가 너무 깁니다'};
  if(path.isAbsolute(rel)||path.win32.isAbsolute(rel)||/^[a-zA-Z]:/.test(rel)||/^[\\/]/.test(rel))return {error:`file '${rel}': 절대 경로는 쓸 수 없습니다 — 요청함 inbox 폴더 기준 상대 경로(예: files/명세서.pdf)만 됩니다`};
  if(rel.split(/[\\/]+/).some(x=>x==='..'||x==='.'||x===''))return {error:`file '${rel}': '..' 등으로 요청함 폴더 밖을 가리킬 수 없습니다`};
  if(/[\x00-\x1f:*?"<>|]/.test(rel))return {error:`file '${rel}': 경로에 쓸 수 없는 문자가 있습니다`};
  const root=path.resolve(D.inbox()),abs=path.resolve(root,rel);
  if(!abs.startsWith(root+path.sep))return {error:`file '${rel}': 요청함 폴더 밖의 파일은 쓸 수 없습니다`};
  if(!(qs?ATT_EXT_QS:ATT_EXT).test(abs))return {error:`file '${rel}': ${qs?'HWP·HWPX·':''}PDF·이미지(JPG·PNG·WEBP·GIF)만 첨부할 수 있습니다`};
  let st;try{st=fs.lstatSync(abs)}catch(e){return {error:`file '${rel}': 파일이 없습니다 (요청 파일보다 먼저 넣어 주세요)`}}
  if(st.isSymbolicLink()||!st.isFile())return {error:`file '${rel}': 일반 파일이 아닙니다`};
  try{const real=fs.realpathSync(abs),rr=fs.realpathSync(root);if(!real.startsWith(rr+path.sep))return {error:`file '${rel}': 요청함 폴더 밖의 파일은 쓸 수 없습니다`}}catch(e){return {error:`file '${rel}': 파일을 확인하지 못했습니다`}}
  if(!st.size)return {error:`file '${rel}': 빈 파일입니다`};
  if(st.size>MAX_ATT)return {error:`file '${rel}': 파일이 너무 큽니다 (${(st.size/1048576).toFixed(1)}MB, 20MB까지)`};
  return {rel,abs,name:path.basename(abs),size:st.size,mtime:st.mtimeMs}}
const attRels=req=>req&&Array.isArray(req.actions)?[...new Set(req.actions.filter(a=>a&&(a.type==='production.attachFile'||a.type==='testReport.attachFile'||a.type==='quality.attachFile')&&typeof a.file==='string').map(a=>a.file))]:[];
function attMap(req){const m={},qs=new Set(req.actions.filter(a=>a&&a.type==='quality.attachFile').map(a=>a.file));for(const r of attRels(req))m[r]=attInfo(r,qs.has(r));return m}
// 요청 파일을 옮길 때 첨부 원본도 같이: <폴더>\<요청이름>.files\<상대경로>
function moveAtt(req,dir,n){const m=attMap(req),base=path.join(dir,n.replace(/\.json$/i,'')+'.files');
  for(const k in m){const f=m[k];if(f.error)continue;try{const to=path.join(base,f.rel);fs.mkdirSync(path.dirname(to),{recursive:true});fs.renameSync(f.abs,to)}catch(e){}}}
function uniq(dir,name){let n=name,i=2;const ext=path.extname(name),b=path.basename(name,ext);while(fs.existsSync(path.join(dir,n)))n=`${b} (${i++})${ext}`;return n}
function moveTo(kind,name,result,req){const src=path.join(D.inbox(),name),dir=D[kind]();fs.mkdirSync(dir,{recursive:true});const n=uniq(dir,name);
  if(req===undefined){try{req=JSON.parse(fs.readFileSync(src,'utf8').replace(/^\uFEFF/,''))}catch(e){req=null}}
  fs.renameSync(src,path.join(dir,n));if(req)moveAtt(req,dir,n);
  try{fs.writeFileSync(path.join(dir,n.replace(/\.json$/i,'')+'.result.json'),JSON.stringify({file:name,status:kind,at:new Date().toISOString(),...result},null,2))}catch(e){}
  return path.join(dir,n)}
const inboxPath=n=>{const b=path.basename(String(n||''));if(!b||b!==String(n)||!isReqFile(b))throw new Error('잘못된 파일 이름');return path.join(D.inbox(),b)};
// 받은편지함 읽기: {pending:[{file,hash,mtime,req}], errors:[{file,reason}] (이번에 error 로 옮긴 것)}
function scan(){ensure();const pending=[],errors=[];let waiting=0;let names=[];try{names=fs.readdirSync(D.inbox())}catch(e){}
  for(const name of names.filter(isReqFile).sort()){const f=path.join(D.inbox(),name);let st;try{st=fs.statSync(f)}catch(e){continue}
    if(!st.isFile())continue;
    if(Date.now()-st.mtimeMs<SETTLE_MS){waiting++;continue}// 아직 쓰는 중일 수 있음 → 다음 확인 때
    let reason='',req=null,hash='';
    if(st.size>MAX_SIZE)reason='파일이 너무 큽니다 (2MB 초과)';
    else{let buf;try{buf=fs.readFileSync(f)}catch(e){waiting++;continue}// 잠겨 있으면 다음에
      hash=crypto.createHash('sha1').update(buf).digest('hex');
      try{req=JSON.parse(buf.toString('utf8').replace(/^\uFEFF/,''))}catch(e){reason='JSON 형식 오류: '+String(e.message||e).slice(0,200)}
      if(!reason)reason=structErr(req)}
    if(reason){try{moveTo('error',name,{reason,id:req&&typeof req.id==='string'?req.id:''},req&&typeof req==='object'?req:null);errors.push({file:name,reason})}catch(e){}continue}
    pending.push({file:name,hash,mtime:st.mtimeMs,req,files:attMap(req)})}
  return {pending,errors,waiting}}
const SNAP_README=`이조 영업관리 — 조회용 스냅샷 (읽기 전용)
=========================================
snapshot.json 은 앱이 시작할 때와 저장할 때마다(약 2초 뒤) 자동으로 다시 만드는 '조회용' 파일입니다.
Grok Bot(업무 요청)이 단가·매출·생산·거래명세서·TEST REPORT·거래처 정보를 찾아볼 때 읽습니다.

- 이 파일을 고쳐도 앱 데이터는 바뀌지 않습니다. 변경은 requests\\inbox 에 요청 파일을 넣고 앱의 [요청함]에서 적용하세요.
- 형식(스키마)은 docs/REQUESTS.md 의 'Lookup snapshot' 절을 보세요. 최상위 schema 값이 형식 버전입니다.
- 비밀번호·토큰·로그인 정보·앱 설정은 들어 있지 않습니다.
- 설정 > '조회용 파일 만들기 (Grok Bot 조회)' 를 끄면 이 폴더의 파일이 삭제되고 더 이상 만들지 않습니다.
`;
function setup({getWin}){
  let sig='',deb=null,watcher=null;
  const notify=()=>{const w=getWin();if(w&&!w.isDestroyed())w.webContents.send('req-changed')};
  const sigNow=()=>{try{return fs.readdirSync(D.inbox()).filter(isReqFile).map(n=>{try{const s=fs.statSync(path.join(D.inbox(),n));return n+':'+s.mtimeMs+':'+s.size}catch(e){return n}}).sort().join('|')}catch(e){return ''}};
  const kick=()=>{clearTimeout(deb);deb=setTimeout(()=>{sig=sigNow();notify()},SETTLE_MS+200)};
  function watch(){try{ensure();if(watcher)watcher.close();watcher=fs.watch(D.inbox(),()=>kick());watcher.on('error',()=>{try{watcher.close()}catch(e){}watcher=null})}catch(e){watcher=null}}
  app.whenReady().then(()=>{watch();sig=sigNow();
    // fs.watch 가 놓치는 경우(네트워크 드라이브·일부 백신 등)를 위해 5초마다 목록이 바뀌었는지 확인
    setInterval(()=>{if(!watcher)watch();const s=sigNow();if(s!==sig){sig=s;notify()}},POLL_MS)});
  // ---- 조회용 스냅샷 (Grok Bot 이 읽기만 하는 파일) : requests/snapshot/snapshot.json ----
  const SNAP=()=>path.join(ROOT(),'snapshot'),SNAPF=()=>path.join(SNAP(),'snapshot.json');
  ipcMain.handle('snapWrite',(e,json)=>{if(typeof json!=='string'||json.length>200*1024*1024)throw new Error('bad snapshot');JSON.parse(json);
    fs.mkdirSync(SNAP(),{recursive:true});const tmp=SNAPF()+'.tmp';fs.writeFileSync(tmp,json,'utf8');fs.renameSync(tmp,SNAPF());
    const rd=path.join(SNAP(),'README.txt');if(!fs.existsSync(rd)||fs.readFileSync(rd,'utf8')!==SNAP_README){fs.writeFileSync(rd+'.tmp',SNAP_README,'utf8');fs.renameSync(rd+'.tmp',rd)}
    return {path:SNAPF(),mtime:fs.statSync(SNAPF()).mtime.toISOString()}});
  ipcMain.handle('snapDelete',()=>{for(const f of ['snapshot.json','snapshot.json.tmp','README.txt'])fs.rmSync(path.join(SNAP(),f),{force:true});try{fs.rmdirSync(SNAP())}catch(e){}return true});
  ipcMain.handle('snapInfo',()=>{try{return {path:SNAPF(),mtime:fs.statSync(SNAPF()).mtime.toISOString()}}catch(e){return {path:SNAPF(),mtime:''}}});
  ipcMain.handle('snapOpenFolder',()=>{fs.mkdirSync(SNAP(),{recursive:true});return shell.openPath(SNAP())});
  ipcMain.handle('reqInfo',()=>{ensure();return {root:ROOT(),inbox:D.inbox(),done:D.done(),rejected:D.rejected(),error:D.error()}});
  ipcMain.handle('reqList',()=>scan());
  ipcMain.handle('reqOpenFolder',(e,k)=>{ensure();return shell.openPath(D[k]?D[k]():D.inbox())});
  // 적용 직전: 카드에 보인 내용과 파일이 같은지 확인 (그사이 바뀌었으면 다시 보여 줌)
  ipcMain.handle('reqCheck',(e,name,hash)=>{try{const buf=fs.readFileSync(inboxPath(name));return {ok:crypto.createHash('sha1').update(buf).digest('hex')===hash,exists:true}}catch(err){return {ok:false,exists:false}}});
  // 카드의 [파일 열기]: 첨부할 원본을 기본 프로그램으로 열기 (같은 검사 통과한 것만)
  ipcMain.handle('reqFileOpen',(e,rel)=>{const f=attInfo(rel);if(f.error)return f.error;return shell.openPath(f.abs)});
  // 처리 결과에 따라 파일 이동: kind = 'done' | 'rejected' | 'error'
  ipcMain.handle('reqResolve',(e,name,kind,result)=>{if(!['done','rejected','error'].includes(kind))throw new Error('잘못된 처리 종류');inboxPath(name);
    const r0=result&&typeof result==='object'?{...result}:{},edReq=r0.editedReq;delete r0.editedReq;
    const to=moveTo(kind,path.basename(name),r0);
    // 카드에서 고쳐 적용한 경우: 실제로 적용한 요청을 <이름>.edited.json 으로 옆에 남김 (원래 파일은 그대로)
    if(edReq&&typeof edReq==='object')try{fs.writeFileSync(to.replace(/\.json$/i,'')+'.edited.json',JSON.stringify(edReq,null,2))}catch(err){}sig=sigNow();return to});
}
module.exports={setup,TYPES};
