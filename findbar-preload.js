// 찾기 막대(별도 WebContentsView) 전용 preload — 본 화면과 분리돼 있어 찾기 입력란 자체는 검색 결과에 잡히지 않음
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('fb',{
  find:(q,fwd,next)=>ipcRenderer.send('fb-find',String(q||''),!!fwd,!!next),
  close:()=>ipcRenderer.send('fb-close'),
  onFocus:cb=>ipcRenderer.on('fb-focus',()=>cb()),
  onRerun:cb=>ipcRenderer.on('fb-rerun',()=>cb()),
  onResult:cb=>ipcRenderer.on('fb-res',(e,r)=>cb(r))
});
