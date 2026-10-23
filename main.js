const {app,BrowserWindow,ipcMain,dialog,Menu,shell}=require('electron');
app.commandLine.appendSwitch('lang','ko-KR');
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
ipcMain.handle('stmtPreview',async(e,html,name)=>{const {w,f}=await renderPDF(html);let buf;try{buf=await w.webContents.printToPDF({pageSize:'A4',printBackground:true,margins:{top:0.3,bottom:0.3,left:0.3,right:0.3}})}finally{w.destroy();fs.rmSync(f,{force:true})}
  const pf=path.join(os.tmpdir(),'ijo_preview_'+Date.now()+'.pdf');fs.writeFileSync(pf,buf);
  const v=new BrowserWindow({width:900,height:1000,parent:win,title:'미리보기 - '+String(name||''),icon:path.join(__dirname,'app','icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  v.setMenu(null);v.webContents.setWindowOpenHandler(()=>({action:'deny'}));v.on('page-title-updated',ev=>ev.preventDefault());v.on('closed',()=>fs.rmSync(pf,{force:true}));await v.loadFile(pf);return true});
ipcMain.handle('stmtPrint',async(e,html)=>{const {w,f}=await renderPDF(html);return new Promise(res=>w.webContents.print({silent:false,printBackground:true,pageSize:'A4'},(ok,err)=>{w.destroy();fs.rmSync(f,{force:true});res(ok?true:(err||false))}))});
ipcMain.handle('stmtXlsx',async(e,s,sup,name)=>{const ExcelJS=require('exceljs');const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('거래명세서',{pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:0.24,right:0.24,top:0.3,bottom:0.3,header:0,footer:0}}});
  const W=[4.4,7.3,5.6,8.4,5.4,8.4,8.4,8.4,5.5,5.4,8.4,8.4,7.3,10.6];ws.columns=W.map(w=>({width:w}));
  const thin={style:'thin'},B={top:thin,left:thin,bottom:thin,right:thin},F={name:'맑은 고딕',size:9};
  const cell=(a,v,o={})=>{const c=ws.getCell(a);c.value=v;c.font={...F,...(o.font||{})};c.alignment={vertical:'middle',horizontal:o.h||'center',wrapText:true};if(o.fmt)c.numFmt=o.fmt;if(o.fill)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:o.fill}};return c};
  const box=(r)=>{const [a,b]=r.split(':');const s1=ws.getCell(a),s2=ws.getCell(b||a);for(let R=s1.row;R<=s2.row;R++)for(let C=s1.col;C<=s2.col;C++)ws.getCell(R,C).border=B};
  const mg=(r,v,o)=>{if(r.includes(':'))ws.mergeCells(r);cell(r.split(':')[0],v,o);box(r)};
  ws.mergeCells('E2:J2');cell('E2','거래명세서(공급자)',{font:{size:16,bold:true,underline:true}});ws.mergeCells('L3:N3');cell('L3',s.date||'',{h:'right'});
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
  const pl=lots.slice(),LL=l=>Math.max(2,Math.ceil((l.rolls||[]).length/10));let tr=pl.reduce((a,l)=>a+LL(l),0);while(tr<24){pl.push(null);tr+=2}
  let r0=16;for(const l of pl){const L=l?LL(l):2,r=r0;
    mg(`A${r}:A${r+L-1}`,l?l.lotNo||'':'');mg(`B${r}:B${r+L-1}`,l?l.color||'':'',{font:{size:(F.size||10)-1}});
    for(let i=0;i<L*10;i++){const v=l?l.rolls[i]:'';mg(ws.getCell(r+Math.floor(i/10),3+i%10).address,v===''||v==null?null:+v,{fmt:'#,##0.##'})}
    if(L>2){mg(`M${r}:M${r+L-2}`,'');mg(`N${r}:N${r+L-2}`,'');mg(`M${r+L-1}`,l&&cnt(l)?cnt(l):'');mg(`N${r+L-1}`,l&&sm(l)?sm(l):'',{fmt:'#,##0.##'})}
    else{mg(`M${r}:M${r+1}`,l&&cnt(l)?cnt(l):'');mg(`N${r}:N${r+1}`,l&&sm(l)?sm(l):'',{fmt:'#,##0.##'})}
    r0+=L}
  let r=r0;ws.mergeCells(`A${r}:N${r}`);ws.getRow(r).height=24;cell(`A${r}`,'납품처: '+(s.dest||''),{h:'left',font:{size:12}});r++;ws.mergeCells(`A${r}:N${r}`);ws.getRow(r).height=24;cell(`A${r}`,'담당자: '+(s.contact||''),{h:'left',font:{size:12}});r++;
  const nl=String(sup&&sup.notice||'').split(/\r?\n/).filter(Boolean);nl.forEach((t,i)=>{cell(`A${r}`,i?'':'주의 :',{h:'left'});ws.mergeCells(`B${r}:N${r}`);cell(`B${r}`,t,{h:'left'});r++});
  const cl=String(sup&&sup.contacts||'').split(/\r?\n/).filter(Boolean);cl.forEach(t=>{ws.mergeCells(`A${r}:K${r}`);cell(`A${r}`,t,{h:'left'});r++});
  ws.mergeCells(`L${r-(cl.length?1:0)}:N${r-(cl.length?1:0)}`);cell(`L${r-(cl.length?1:0)}`,'인수자            (인)',{h:'right'});
  let p=process.env.IJO_XLSX;if(!p){const rr=await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('documents'),name),filters:[{name:'Excel',extensions:['xlsx']}]});if(rr.canceled)return null;p=rr.filePath}
  await wb.xlsx.writeFile(p);return p});
ipcMain.handle('owXlsx',async(e,q,sup,name)=>{const ExcelJS=require('exceljs');const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('작업의뢰서',{pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:1,margins:{left:0.4,right:0.4,top:0.4,bottom:0.4,header:0,footer:0}}});
  ws.columns=[11,15.5,8.8,12.7,4.9,8,15.7,3.3,4.4,4.8,5.3,5.4,5.6,3.8,1.7].map(w=>({width:w}));
  const thin={style:'thin'},B={top:thin,left:thin,bottom:thin,right:thin},F={name:'맑은 고딕',size:10},H={fill:'FFF2F2F2'};
  const cell=(a,v,o={})=>{const c=ws.getCell(a);c.value=v;c.font={...F,...(o.font||{})};c.alignment={vertical:o.v||'middle',horizontal:o.h||'center',wrapText:true};if(o.fmt)c.numFmt=o.fmt;if(o.fill)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:o.fill}}};
  const box=r=>{const [a,b]=r.split(':');const s1=ws.getCell(a),s2=ws.getCell(b||a);for(let R=s1.row;R<=s2.row;R++)for(let C=s1.col;C<=s2.col;C++)ws.getCell(R,C).border=B};
  const mg=(r,v,o={})=>{if(r.includes(':'))ws.mergeCells(r);cell(r.split(':')[0],v,o);if(!o.nb)box(r)};
  mg('A1:O1','작 업 의 뢰 서',{nb:1,font:{size:22,bold:true,color:{argb:'FF0B2A6F'}}});ws.getRow(1).height=40;
  mg('A3:B4',q.vendor||'',{nb:1,font:{size:16},h:'left'});mg('C3:C4','귀하',{nb:1,font:{size:14},h:'left'});
  mg('I3:I4','결재');['담당','과장','부장','상무','사장'].forEach((x,i)=>{const c=String.fromCharCode(74+i);if(i===4){mg('N3:O3',x,{font:{size:9}});mg('N4:O4','')}else{mg(c+'3',x,{font:{size:9}});mg(c+'4','')}});ws.getRow(4).height=30;
  mg('A5:B5',q.date||'',{nb:1,font:{size:12}});
  mg('A7','LI NO.',H);mg('B7',q.liNo||'');mg('C7','원발주처',H);mg('D7',q.client||'');mg('E7:F7','납기일',H);mg('G7',q.due||'');mg('H7:J8','납품처',H);mg('K7:O8',q.dest||'');
  mg('A8','PO NO.',H);mg('B8',q.poNo||'');mg('C8','담당자',H);mg('D8',q.manager||'');mg('E8:F8','참조',H);mg('G8',q.ref||'');
  mg('A10','품명',H);mg('B10:E10',q.item||'',{h:'left'});mg('F10:G10','가공구분',H);mg('H10:O10',q.procName||'');
  [7,8,10].forEach(i=>{const R=ws.getRow(i);R.height=(R.height||15)*2;R.eachCell({includeEmpty:true},c=>{c.alignment={...(c.alignment||{}),vertical:'middle',wrapText:true}})});
  mg('A11:B11','COLOR',H);mg('C11:D11','수량',H);mg('E11:F11','단위',H);mg('G11','비고',H);mg('H11:O11','작업, 주의 사항',H);
  const ls=q.lines||[],n=Math.max(8,ls.length);for(let k=0;k<n;k++){const r=12+k,l=ls[k]||{};mg(`A${r}:B${r}`,l.color||'');mg(`C${r}:D${r}`,l.qty===''||l.qty==null?null:+l.qty,{fmt:'#,##0.##',h:'right'});mg(`E${r}:F${r}`,l.unit||'');mg(`G${r}`,l.note||'')}
  let r=12+n;const tq=ls.reduce((a,l)=>a+(+l.qty||0),0),tu=[...new Set(ls.filter(l=>l.qty!==''&&l.qty!=null).map(l=>l.unit))];
  mg(`A${r}:B${r}`,'TOTAL',H);mg(`C${r}:D${r}`,tq||null,{fmt:'#,##0.##',h:'right',font:{bold:true}});mg(`E${r}:F${r}`,tq&&tu.length===1?tu[0]:'');mg(`G${r}`,'');
  const work=[q.shrink!==''?`가공 축: ${q.shrink}%`:'',q.src?`원단 입고처: ${q.src}`:'',q.work||''].filter(Boolean).join('\n');
  r++;mg(`A${r}:G${r+3}`,q.notes||'',{h:'left',v:'top'});mg(`H12:O${r+3}`,work,{h:'left',v:'top'});r+=5;
  mg(`A${r}:I${r}`,'비 고',H);mg(`J${r}:O${r}`,'SHIPPING MARK',H);r++;mg(`A${r}:I${r+10}`,q.memo||'',{h:'left',v:'top'});mg(`J${r}:O${r+10}`,q.mark||'',{font:{size:12}});r+=11;
  String(q.terms||'').split(/\r?\n/).filter(x=>x.trim()).forEach(t=>{ws.mergeCells(`A${r}:O${r}`);cell(`A${r}`,t,{h:'left',font:{size:8.5}});r++});
  r++;mg(`H${r}:O${r}`,(sup&&sup.name)||'',{nb:1,h:'right',font:{size:12,bold:true}});
  let p=process.env.IJO_XLSX;if(!p){const rr=await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('documents'),name),filters:[{name:'Excel',extensions:['xlsx']}]});if(rr.canceled)return null;p=rr.filePath}
  await wb.xlsx.writeFile(p);return p});
ipcMain.handle('importSupplierXlsx',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'Excel',extensions:['xlsx']}],properties:['openFile']});if(r.canceled||!r.filePaths[0])return null;
  const ExcelJS=require('exceljs');const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(r.filePaths[0]);const ws=wb.getWorksheet('양식')||wb.worksheets[0];
  const v=a=>{const c=ws.getCell(a).value;if(c==null)return '';if(typeof c==='object'){if(c.richText)return c.richText.map(t=>t.text).join('');if('result' in c)return String(c.result??'');if(c.text)return c.text}return String(c).trim()};
  return {reg:v('C5'),name:v('C6'),ceo:v('F6'),addr:v('C7'),biz:v('C9'),type:v('F9'),notice:[v('B40'),v('B41')].filter(Boolean).join('\n'),
    contacts:[v('A42'),v('A43')].filter(Boolean).map(t=>t.replace(/\s*인수자\s*\(인\)\s*$/,'').trimEnd()).join('\n')}});
ipcMain.handle('openExternal',(e,u)=>{if(/^(https?:|mailto:)/i.test(String(u)))return shell.openExternal(String(u))});
ipcMain.handle('copyText',(e,t)=>{require('electron').clipboard.writeText(String(t))});
const WF=()=>path.join(DIR(),'workorders');
function wfAbs(rel){const a=path.resolve(WF(),String(rel||''));if(!a.startsWith(path.resolve(WF())+path.sep))throw new Error('잘못된 경로');return a}
ipcMain.handle('wfPick',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'PDF',extensions:['pdf']}],properties:['openFile','multiSelections']});return r.canceled?[]:r.filePaths});
ipcMain.handle('wfAttach',(e,oid,src)=>{oid=String(oid).replace(/[^\w-]/g,'');src=String(src);if(!oid||!/\.pdf$/i.test(src)||!fs.statSync(src).isFile())throw new Error('PDF 파일이 아닙니다');
  const dir=path.join(WF(),oid);fs.mkdirSync(dir,{recursive:true});const ext=path.extname(src),base=path.basename(src,ext).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')||'작업의뢰서';
  let name=base+ext,i=2;while(fs.existsSync(path.join(dir,name)))name=`${base} (${i++})${ext}`;fs.copyFileSync(src,path.join(dir,name));
  return {id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,path:oid+'/'+name}});
ipcMain.handle('wfPreview',(e,rel,name)=>{const a=wfAbs(rel);if(!fs.existsSync(a))return false;
  const w=new BrowserWindow({width:900,height:1000,parent:win,title:'미리보기 - '+String(name||''),icon:path.join(__dirname,'app','icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  w.setMenu(null);w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.loadFile(a);w.on('page-title-updated',ev=>ev.preventDefault());return true});
ipcMain.handle('wfSaveAs',async(e,rel,name)=>{const a=wfAbs(rel);if(!fs.existsSync(a))return false;const r=process.env.IJO_SHOT&&process.env.IJO_SAVEAS?{filePath:process.env.IJO_SAVEAS}:await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('documents'),path.basename(String(name||path.basename(a)))),filters:[{name:'PDF',extensions:['pdf']}]});
  if(r.canceled||!r.filePath)return null;fs.copyFileSync(a,r.filePath);return r.filePath});
ipcMain.handle('wfDelete',(e,rel)=>{const a=wfAbs(rel);fs.rmSync(a,{force:true});try{fs.rmdirSync(path.dirname(a))}catch(e){}return true});
// ===== 출고별 거래명세서 PDF =====
const SS=()=>path.join(DIR(),'statements');
function ssAbs(rel){const a=path.resolve(SS(),String(rel||''));if(!a.startsWith(path.resolve(SS())+path.sep))throw new Error('잘못된 경로');return a}
ipcMain.handle('ssPick',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'PDF',extensions:['pdf']}],properties:['openFile']});return r.canceled?null:r.filePaths[0]||null});
ipcMain.handle('ssAttach',(e,oid,src)=>{oid=String(oid).replace(/[^\w-]/g,'');src=String(src);if(!oid||!/\.pdf$/i.test(src)||!fs.statSync(src).isFile())throw new Error('PDF 파일이 아닙니다');
  const dir=path.join(SS(),oid);fs.mkdirSync(dir,{recursive:true});const ext=path.extname(src),base=path.basename(src,ext).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')||'거래명세서';
  let name=base+ext,i=2;while(fs.existsSync(path.join(dir,name)))name=`${base} (${i++})${ext}`;fs.copyFileSync(src,path.join(dir,name));
  return {id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,path:oid+'/'+name}});
ipcMain.handle('ssPreview',(e,rel,name)=>{const a=ssAbs(rel);if(!fs.existsSync(a))return false;
  const w=new BrowserWindow({width:900,height:1000,parent:win,title:'미리보기 - '+String(name||''),icon:path.join(__dirname,'app','icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  w.setMenu(null);w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.loadFile(a);w.on('page-title-updated',ev=>ev.preventDefault());return true});
ipcMain.handle('ssSaveAs',async(e,rel,name)=>{const a=ssAbs(rel);if(!fs.existsSync(a))return false;const r=await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('documents'),path.basename(String(name||path.basename(a)))),filters:[{name:'PDF',extensions:['pdf']}]});
  if(r.canceled||!r.filePath)return null;fs.copyFileSync(a,r.filePath);return r.filePath});
ipcMain.handle('ssDelete',(e,rel)=>{const a=ssAbs(rel);fs.rmSync(a,{force:true});try{fs.rmdirSync(path.dirname(a))}catch(e){}return true});
// ===== 수량 가져오기: 오프라인 OCR (tesseract.js 워커 + 번들된 eng 데이터, 네트워크 사용 안 함) =====
const unp=p=>p.replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
let ocrW=null;
function ocrWorker(){if(ocrW)return ocrW;const T=require('tesseract.js'),{pathToFileURL}=require('url');
  ocrW=T.createWorker('eng',1,{workerPath:unp(path.join(__dirname,'ocr-worker.js')),langPath:pathToFileURL(unp(path.join(__dirname,'app','vendor','tessdata'))).href,cacheMethod:'none',gzip:false}).catch(e=>{ocrW=null;throw e});return ocrW}
function ocrToks(d){const o=[];for(const b of d.blocks||[])for(const p of b.paragraphs||[])for(const l of p.lines||[])for(const x of l.words||[])o.push({t:x.text,x0:x.bbox.x0,y0:x.bbox.y0,x1:x.bbox.x1,y1:x.bbox.y1,c:x.confidence});return o}
ipcMain.handle('lotOcr',async(e,bytes)=>{const buf=Buffer.from(bytes),w=await ocrWorker();
  await w.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:'',preserve_interword_spaces:'1'});const words=ocrToks((await w.recognize(buf,{},{blocks:true})).data);
  await w.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:'0123456789,.-'});const digits=ocrToks((await w.recognize(buf,{},{blocks:true})).data).filter(k=>/\d/.test(k.t));
  await w.setParameters({tessedit_pageseg_mode:'6'});const d6=ocrToks((await w.recognize(buf,{},{blocks:true})).data).filter(k=>/^[\d,.]+$/.test(k.t));
  return {words,digits,digits6:d6}});
app.on('will-quit',()=>{if(ocrW)ocrW.then(w=>w.terminate()).catch(()=>{})});
// ===== 백업용 첨부 파일 (base64) =====
const attAbs=(k,rel)=>k==='ss'?ssAbs(rel):wfAbs(rel);
ipcMain.handle('attRead',(e,k,rel)=>{try{const a=attAbs(k,rel);return fs.existsSync(a)?fs.readFileSync(a).toString('base64'):null}catch(err){return null}});
ipcMain.handle('attWrite',(e,k,rel,b64)=>{const a=attAbs(k,rel);if(!/\.pdf$/i.test(a))throw new Error('PDF만 복원');fs.mkdirSync(path.dirname(a),{recursive:true});fs.writeFileSync(a,Buffer.from(String(b64||''),'base64'));return true});
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
// 생산 관리 엑셀 가져오기: 파일 선택 → 행 배열(문자열)로 반환. 엑셀 날짜 셀은 YYYY-MM-DD 로 변환
function csvRows(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}else if(c==='"')q=true;else if(c===','){r.push(f);f=''}else if(c==='\n'){r.push(f.replace(/\r$/,''));R.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);R.push(r)}return R}
ipcMain.handle('ordImportPick',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'Excel / CSV',extensions:['xlsx','csv']}],properties:['openFile']});if(r.canceled||!r.filePaths[0])return null;
  const f=r.filePaths[0],name=path.basename(f);
  if(/\.csv$/i.test(f)){let t=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');return {name,rows:csvRows(t)}}
  const ExcelJS=require('exceljs');const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(f);const ws=wb.worksheets[0];if(!ws)return {name,rows:[]};
  const p2=n=>String(n).padStart(2,'0'),cv=v=>{if(v==null)return '';if(v instanceof Date)return `${v.getUTCFullYear()}-${p2(v.getUTCMonth()+1)}-${p2(v.getUTCDate())}`;if(typeof v==='object'){if('result' in v)return cv(v.result);if(v.richText)return v.richText.map(x=>x.text).join('');if('text' in v)return String(v.text);return ''}return String(v)};
  const rows=[];ws.eachRow({includeEmpty:false},row=>{const a=[];for(let i=1;i<=ws.columnCount;i++)a.push(cv(row.getCell(i).value).trim());rows.push(a)});return {name,rows}});
ipcMain.handle('preImportBackup',()=>{try{const d=readData();if(!d)return null;fs.mkdirSync(BK(),{recursive:true});const ts=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().replace(/[:T]/g,'-').slice(0,19);const p=path.join(BK(),`preimport_${ts}.json`);fs.writeFileSync(p,JSON.stringify(d,null,2));return p}catch(e){return null}});
