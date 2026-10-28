// ===== 요청함 (Grok Bot 요청 받기) — main 프로세스 =====
// <userData>/requests/inbox 에 놓인 JSON 요청 파일을 읽어 화면(렌더러)에 '대기 중인 요청'으로 넘김.
// 여기서는 데이터를 절대 바꾸지 않음: 적용/거부는 사용자가 카드에서 누르고, 데이터는 앱의 기존 로직(렌더러)으로만 만들어짐.
// 처리된 파일은 done / rejected, 형식이 잘못된 파일은 error 폴더로 옮기고 옆에 <이름>.result.json(결과·사유)을 남김.
const {app,ipcMain,shell}=require('electron');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=()=>path.join(app.getPath('userData'),'requests');
const D={inbox:()=>path.join(ROOT(),'inbox'),done:()=>path.join(ROOT(),'done'),rejected:()=>path.join(ROOT(),'rejected'),error:()=>path.join(ROOT(),'error')};
const TYPES=['production.addOrder','production.updateOrder','production.addShipment','production.setDone','statement.createFromOrder','sales.addRow','price.addRow'];
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
function uniq(dir,name){let n=name,i=2;const ext=path.extname(name),b=path.basename(name,ext);while(fs.existsSync(path.join(dir,n)))n=`${b} (${i++})${ext}`;return n}
function moveTo(kind,name,result){const src=path.join(D.inbox(),name),dir=D[kind]();fs.mkdirSync(dir,{recursive:true});const n=uniq(dir,name);
  fs.renameSync(src,path.join(dir,n));
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
    if(reason){try{moveTo('error',name,{reason,id:req&&typeof req.id==='string'?req.id:''});errors.push({file:name,reason})}catch(e){}continue}
    pending.push({file:name,hash,mtime:st.mtimeMs,req})}
  return {pending,errors,waiting}}
function setup({getWin}){
  let sig='',deb=null,watcher=null;
  const notify=()=>{const w=getWin();if(w&&!w.isDestroyed())w.webContents.send('req-changed')};
  const sigNow=()=>{try{return fs.readdirSync(D.inbox()).filter(isReqFile).map(n=>{try{const s=fs.statSync(path.join(D.inbox(),n));return n+':'+s.mtimeMs+':'+s.size}catch(e){return n}}).sort().join('|')}catch(e){return ''}};
  const kick=()=>{clearTimeout(deb);deb=setTimeout(()=>{sig=sigNow();notify()},SETTLE_MS+200)};
  function watch(){try{ensure();if(watcher)watcher.close();watcher=fs.watch(D.inbox(),()=>kick());watcher.on('error',()=>{try{watcher.close()}catch(e){}watcher=null})}catch(e){watcher=null}}
  app.whenReady().then(()=>{watch();sig=sigNow();
    // fs.watch 가 놓치는 경우(네트워크 드라이브·일부 백신 등)를 위해 5초마다 목록이 바뀌었는지 확인
    setInterval(()=>{if(!watcher)watch();const s=sigNow();if(s!==sig){sig=s;notify()}},POLL_MS)});
  ipcMain.handle('reqInfo',()=>{ensure();return {root:ROOT(),inbox:D.inbox(),done:D.done(),rejected:D.rejected(),error:D.error()}});
  ipcMain.handle('reqList',()=>scan());
  ipcMain.handle('reqOpenFolder',(e,k)=>{ensure();return shell.openPath(D[k]?D[k]():D.inbox())});
  // 적용 직전: 카드에 보인 내용과 파일이 같은지 확인 (그사이 바뀌었으면 다시 보여 줌)
  ipcMain.handle('reqCheck',(e,name,hash)=>{try{const buf=fs.readFileSync(inboxPath(name));return {ok:crypto.createHash('sha1').update(buf).digest('hex')===hash,exists:true}}catch(err){return {ok:false,exists:false}}});
  // 처리 결과에 따라 파일 이동: kind = 'done' | 'rejected' | 'error'
  ipcMain.handle('reqResolve',(e,name,kind,result)=>{if(!['done','rejected','error'].includes(kind))throw new Error('잘못된 처리 종류');inboxPath(name);
    const to=moveTo(kind,path.basename(name),result&&typeof result==='object'?result:{});sig=sigNow();return to});
}
module.exports={setup,TYPES};
