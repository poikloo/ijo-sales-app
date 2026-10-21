const {app,BrowserWindow,ipcMain,dialog,Menu,shell}=require('electron');
const {autoUpdater}=require('electron-updater');
const fs=require('fs'),path=require('path');
const DIR=()=>app.getPath('userData'),FILE=()=>path.join(DIR(),'data.json'),BK=()=>path.join(DIR(),'backups');
function readData(){for(const f of [FILE(),FILE()+'.tmp']){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){}}return null}
function writeData(d){
  fs.mkdirSync(BK(),{recursive:true});
  const s=JSON.stringify(d,null,2);
  fs.writeFileSync(FILE()+'.tmp',s);fs.renameSync(FILE()+'.tmp',FILE());
  const ts=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().replace(/[:T]/g,'-').slice(0,19);
  fs.writeFileSync(path.join(BK(),`data_${ts}.json`),s);
  const list=fs.readdirSync(BK()).filter(f=>f.startsWith('data_')).sort();
  while(list.length>50)fs.unlinkSync(path.join(BK(),list.shift()));
  return true}
let manualCheck=false,promptShown=false;
function setupUpdater(){
  autoUpdater.autoDownload=true;autoUpdater.autoInstallOnAppQuit=true;
  const send=(s,extra)=>{if(win&&!win.isDestroyed())win.webContents.send('upd',{s,...extra})};
  autoUpdater.on('checking-for-update',()=>send('checking'));
  autoUpdater.on('update-not-available',()=>{send('none');if(manualCheck)dialog.showMessageBox(win,{type:'info',title:'업데이트 확인',message:`최신 버전(v${app.getVersion()})을 사용 중이에요.`,buttons:['확인']});manualCheck=false});
  autoUpdater.on('update-available',i=>send('available',{v:i.version}));
  autoUpdater.on('download-progress',p=>send('progress',{pct:Math.round(p.percent)}));
  autoUpdater.on('error',e=>{send('error',{msg:String(e&&e.message||e)});if(manualCheck)dialog.showMessageBox(win,{type:'warning',title:'업데이트 확인',message:'업데이트를 확인하지 못했어요. 인터넷 연결을 확인해 주세요.',detail:String(e&&e.message||e),buttons:['확인']});manualCheck=false});
  autoUpdater.on('update-downloaded',async i=>{send('ready',{v:i.version});manualCheck=false;if(promptShown)return;promptShown=true;
    const r=await dialog.showMessageBox(win,{type:'question',title:'업데이트',message:'새 버전이 준비됐어요. 지금 재시작해서 업데이트할까요?',detail:`새 버전: v${i.version} (현재 v${app.getVersion()})`,buttons:['지금 재시작','나중에'],defaultId:0,cancelId:1});
    promptShown=false;if(r.response===0)setImmediate(()=>autoUpdater.quitAndInstall(false,true))});
  if(app.isPackaged)setTimeout(()=>autoUpdater.checkForUpdates().catch(()=>{}),3000);
}
ipcMain.handle('checkUpdate',async()=>{if(!app.isPackaged)return {dev:true};manualCheck=true;try{await autoUpdater.checkForUpdates()}catch(e){}return {ok:true}});
ipcMain.on('load',e=>{e.returnValue=readData()});
ipcMain.handle('save',(e,d)=>writeData(d));
ipcMain.handle('info',()=>({file:FILE(),backups:BK(),version:app.getVersion()}));
ipcMain.handle('openFolder',()=>shell.openPath(DIR()));
ipcMain.handle('saveFile',async(e,name,content)=>{const r=await dialog.showSaveDialog({defaultPath:path.join(app.getPath('documents'),name)});
  if(r.canceled)return null;fs.writeFileSync(r.filePath,content,'utf8');return r.filePath});
ipcMain.handle('openFile',async()=>{const r=await dialog.showOpenDialog({filters:[{name:'JSON 백업',extensions:['json']}],properties:['openFile']});
  if(r.canceled||!r.filePaths[0])return null;return fs.readFileSync(r.filePaths[0],'utf8')});
if(!app.requestSingleInstanceLock())app.quit();
let win;
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});
app.whenReady().then(()=>{
  Menu.setApplicationMenu(null);
  win=new BrowserWindow({width:1400,height:900,minWidth:1000,minHeight:650,title:'이조 영업관리',icon:path.join(__dirname,'app','icon.png'),
    backgroundColor:'#f3f5f9',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  setupUpdater();
  win.loadFile(path.join(__dirname,'app','index.html'));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  if(process.env.IJO_SHOT){win.webContents.on('console-message',(e,l,m)=>console.log('[renderer]',m));
    win.webContents.on('did-finish-load',()=>setTimeout(async()=>{
      const errs=await win.webContents.executeJavaScript('window.__errs||[]');console.log('ERRORS:',JSON.stringify(errs));
      for(const p of (process.env.IJO_PAGES||'dash').split(',')){await win.webContents.executeJavaScript(`go('${p}')`);await new Promise(r=>setTimeout(r,400));
        const img=await win.webContents.capturePage();fs.writeFileSync(process.env.IJO_SHOT.replace('.png',p==='dash'?'.png':`_${p}.png`),img.toPNG())}
      console.log('ERRORS2:',JSON.stringify(await win.webContents.executeJavaScript('window.__errs||[]')));app.quit()},1200))}
});
app.on('window-all-closed',()=>app.quit());
