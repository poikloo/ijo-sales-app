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
// ===== 거래명세서 출력 =====
const os=require('os');
async function renderPDF(html){const w=new BrowserWindow({show:false,webPreferences:{offscreen:false}});const f=path.join(os.tmpdir(),'ijo_stmt_'+Date.now()+'.html');fs.writeFileSync(f,html,'utf8');
  await w.loadFile(f);return {w,f}}
ipcMain.handle('stmtPDF',async(e,html,name)=>{const {w,f}=await renderPDF(html);try{
  const buf=await w.webContents.printToPDF({pageSize:'A4',printBackground:true,margins:{top:0.3,bottom:0.3,left:0.3,right:0.3}});
  let p=process.env.IJO_PDF;if(!p){const r=await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('documents'),name),filters:[{name:'PDF',extensions:['pdf']}]});if(r.canceled)return null;p=r.filePath}
  fs.writeFileSync(p,buf);if(!process.env.IJO_PDF)shell.openPath(p);return p}finally{w.destroy();fs.rmSync(f,{force:true})}});
ipcMain.handle('stmtPrint',async(e,html)=>{const {w,f}=await renderPDF(html);return new Promise(res=>w.webContents.print({silent:false,printBackground:true,pageSize:'A4'},(ok,err)=>{w.destroy();fs.rmSync(f,{force:true});res(ok?true:(err||false))}))});
ipcMain.handle('stmtXlsx',async(e,s,sup,name)=>{const ExcelJS=require('exceljs');const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('거래명세서',{pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:0.24,right:0.24,top:0.3,bottom:0.3,header:0,footer:0}}});
  const W=[4.4,7.3,5.6,8.4,5.4,8.4,8.4,8.4,5.5,5.4,8.4,8.4,7.3,10.6];ws.columns=W.map(w=>({width:w}));
  const thin={style:'thin'},B={top:thin,left:thin,bottom:thin,right:thin},F={name:'맑은 고딕',size:9};
  const cell=(a,v,o={})=>{const c=ws.getCell(a);c.value=v;c.font={...F,...(o.font||{})};c.alignment={vertical:'middle',horizontal:o.h||'center',wrapText:true};if(o.fmt)c.numFmt=o.fmt;if(o.fill)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:o.fill}};return c};
  const box=(r)=>{const [a,b]=r.split(':');const s1=ws.getCell(a),s2=ws.getCell(b||a);for(let R=s1.row;R<=s2.row;R++)for(let C=s1.col;C<=s2.col;C++)ws.getCell(R,C).border=B};
  const mg=(r,v,o)=>{if(r.includes(':'))ws.mergeCells(r);cell(r.split(':')[0],v,o);box(r)};
  cell('A1','NO.');cell('B1',s.no,{h:'left'});ws.mergeCells('E2:J2');cell('E2','거래명세서(공급자)',{font:{size:16,bold:true,underline:true}});ws.mergeCells('L3:N3');cell('L3',s.date||'',{h:'right'});
  const party=(c0,lab,p,isSup)=>{const C=n=>String.fromCharCode(c0.charCodeAt(0)+n);
    mg(`${C(0)}5:${C(0)}9`,lab,{fill:'FFF2F2F2',font:{bold:true}});mg(`${C(1)}5`,'등록\n번호');mg(`${C(2)}5:${C(6)}5`,p.reg||'',{font:{size:11,bold:true}});
    mg(`${C(1)}6`,'상호');mg(`${C(2)}6:${C(3)}6`,p.name||'');mg(`${C(4)}6`,'성명');mg(`${C(5)}6:${C(6)}6`,p.ceo||'');
    mg(`${C(1)}7:${C(1)}8`,'사업장\n주소');mg(`${C(2)}7:${C(6)}8`,p.addr||'',{h:'left'});
    mg(`${C(1)}9`,'업태');mg(`${C(2)}9:${C(3)}9`,p.biz||'');mg(`${C(4)}9`,'종목');mg(`${C(5)}9:${C(6)}9`,p.type||'')};
  party('A','공급자',sup||{},true);
  // 공급받는자 block is columns H..N (7 cols: H label, I field label, J..N values)
  mg('H5:H9','공급받는자',{fill:'FFF2F2F2',font:{bold:true}});const cu=s.cust||{};
  mg('I5','등록\n번호');mg('J5:N5',cu.reg||'',{font:{size:11,bold:true}});mg('I6','상호');mg('J6:K6',cu.name||'');mg('L6','성명');mg('M6:N6',cu.ceo||'');
  mg('I7:I8','사업장\n주소');mg('J7:N8',cu.addr||'',{h:'left'});mg('I9','업태');mg('J9:K9',cu.biz||'');mg('L9','종목');mg('M9:N9',cu.type||'');
  const H={fill:'FFF2F2F2',font:{bold:true}};
  mg('A11:B11','오 더 번 호',H);mg('C11:G11','품 명  및  규 격',H);mg('H11','절',H);mg('I11','수량\n(YD)',H);mg('J11','단 가',H);mg('K11:L11','금 액',H);mg('M11:N11','비 고',H);
  const lots=s.lots||[],cnt=l=>l.rolls.filter(v=>v!==''&&v!=null).length,sm=l=>l.rolls.reduce((a,v)=>a+(+v||0),0),tc=lots.reduce((a,l)=>a+cnt(l),0),tq=lots.reduce((a,l)=>a+sm(l),0);
  mg('A12:B13',s.orderNo||'');mg('C12:G12',s.item||'');mg('C13:G13',s.spec||'');mg('H12:H13',tc||'');mg('I12:I13',tq||'',{fmt:'#,##0.##'});mg('J12:J13',s.price||'',{fmt:'#,##0.##'});
  mg('K12:L13',s.price&&tq?Math.round(tq*s.price):'',{fmt:'#,##0'});mg('M12:N13',s.note||'');
  mg('A14:A15','LOT NO.',H);mg('B14:B15','COLOR',H);mg('C14:L14','수량(YD)',H);for(let i=0;i<10;i++)mg(ws.getCell(15,3+i).address,i+1,H);mg('M14:M15','절',H);mg('N14:N15','수량(YD)',H);
  const n=Math.max(12,lots.length);for(let k=0;k<n;k++){const r=16+k*2,l=lots[k];
    mg(`A${r}:A${r+1}`,l?l.lotNo||'':'');mg(`B${r}:B${r+1}`,l?l.color||'':'',{font:{size:(F.size||10)-1}});
    for(let i=0;i<20;i++){const v=l?l.rolls[i]:'';mg(ws.getCell(r+(i>=10?1:0),3+i%10).address,v===''||v==null?null:+v,{fmt:'#,##0.##'})}
    mg(`M${r}:M${r+1}`,l&&cnt(l)?cnt(l):'');mg(`N${r}:N${r+1}`,l&&sm(l)?sm(l):'',{fmt:'#,##0.##'})}
  let r=16+n*2;ws.mergeCells(`A${r}:N${r}`);ws.getRow(r).height=24;cell(`A${r}`,'납품처: '+(s.dest||''),{h:'left',font:{size:12}});r++;ws.mergeCells(`A${r}:N${r}`);ws.getRow(r).height=24;cell(`A${r}`,'담당자: '+(s.contact||''),{h:'left',font:{size:12}});r++;
  const nl=String(sup&&sup.notice||'').split(/\r?\n/).filter(Boolean);nl.forEach((t,i)=>{cell(`A${r}`,i?'':'주의 :',{h:'left'});ws.mergeCells(`B${r}:N${r}`);cell(`B${r}`,t,{h:'left'});r++});
  const cl=String(sup&&sup.contacts||'').split(/\r?\n/).filter(Boolean);cl.forEach(t=>{ws.mergeCells(`A${r}:K${r}`);cell(`A${r}`,t,{h:'left'});r++});
  ws.mergeCells(`L${r-(cl.length?1:0)}:N${r-(cl.length?1:0)}`);cell(`L${r-(cl.length?1:0)}`,'인수자            (인)',{h:'right'});
  let p=process.env.IJO_XLSX;if(!p){const rr=await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('documents'),name),filters:[{name:'Excel',extensions:['xlsx']}]});if(rr.canceled)return null;p=rr.filePath}
  await wb.xlsx.writeFile(p);return p});
ipcMain.handle('importSupplierXlsx',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'Excel',extensions:['xlsx']}],properties:['openFile']});if(r.canceled||!r.filePaths[0])return null;
  const ExcelJS=require('exceljs');const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(r.filePaths[0]);const ws=wb.getWorksheet('양식')||wb.worksheets[0];
  const v=a=>{const c=ws.getCell(a).value;if(c==null)return '';if(typeof c==='object'){if(c.richText)return c.richText.map(t=>t.text).join('');if('result' in c)return String(c.result??'');if(c.text)return c.text}return String(c).trim()};
  return {reg:v('C5'),name:v('C6'),ceo:v('F6'),addr:v('C7'),biz:v('C9'),type:v('F9'),notice:[v('B40'),v('B41')].filter(Boolean).join('\n'),
    contacts:[v('A42'),v('A43')].filter(Boolean).map(t=>t.replace(/\s*인수자\s*\(인\)\s*$/,'').trimEnd()).join('\n')}});
ipcMain.handle('openExternal',(e,u)=>{if(/^(https?:|mailto:)/i.test(String(u)))return shell.openExternal(String(u))});
ipcMain.handle('copyText',(e,t)=>{require('electron').clipboard.writeText(String(t))});
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
      for(const ent of (process.env.IJO_PAGES||'dashboard=go("dash")').split(process.env.IJO_SEP||';')){const [fn,js]=ent.split(/=(.*)/s);await win.webContents.executeJavaScript(js);await new Promise(r=>setTimeout(r,400));
        const img=await win.webContents.capturePage();fs.mkdirSync(process.env.IJO_SHOT,{recursive:true});fs.writeFileSync(path.join(process.env.IJO_SHOT,fn+'.png'),img.toPNG())}
      console.log('ERRORS2:',JSON.stringify(await win.webContents.executeJavaScript('window.__errs||[]')));app.quit()},1200))}
});
app.on('window-all-closed',()=>app.quit());
