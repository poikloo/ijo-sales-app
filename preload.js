const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('api',{
  load:()=>ipcRenderer.sendSync('load'),
  save:d=>ipcRenderer.invoke('save',d),
  info:()=>ipcRenderer.invoke('info'),
  openFolder:()=>ipcRenderer.invoke('openFolder'),
  saveFile:(n,c)=>ipcRenderer.invoke('saveFile',n,c),
  openFile:()=>ipcRenderer.invoke('openFile'),
  stmtPDF:(h,n)=>ipcRenderer.invoke('stmtPDF',h,n),
  stmtPrint:h=>ipcRenderer.invoke('stmtPrint',h),
  stmtXlsx:(s,sup,n)=>ipcRenderer.invoke('stmtXlsx',s,sup,n),
  owXlsx:(r,sup,n)=>ipcRenderer.invoke('owXlsx',r,sup,n),
  importSupplierXlsx:()=>ipcRenderer.invoke('importSupplierXlsx'),
  openExternal:u=>ipcRenderer.invoke('openExternal',u),
  copyText:t=>ipcRenderer.invoke('copyText',t),
  checkUpdate:()=>ipcRenderer.invoke('checkUpdate'),
  onUpdate:cb=>ipcRenderer.on('upd',(e,d)=>cb(d))
});
