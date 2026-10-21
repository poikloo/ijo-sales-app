const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('api',{
  load:()=>ipcRenderer.sendSync('load'),
  save:d=>ipcRenderer.invoke('save',d),
  info:()=>ipcRenderer.invoke('info'),
  openFolder:()=>ipcRenderer.invoke('openFolder'),
  saveFile:(n,c)=>ipcRenderer.invoke('saveFile',n,c),
  openFile:()=>ipcRenderer.invoke('openFile'),
  checkUpdate:()=>ipcRenderer.invoke('checkUpdate'),
  onUpdate:cb=>ipcRenderer.on('upd',(e,d)=>cb(d))
});
