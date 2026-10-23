// ===== 체크리스트 메모 (자유 메모, data.checkMemo) =====
let checkMemo='',cmT=null;
function cmLoad(r){checkMemo=(r&&typeof r.checkMemo==='string')?r.checkMemo:'';cmShow()}
function cmPayload(){return {checkMemo}}
function cmImport(r){if(r&&typeof r.checkMemo==='string'){checkMemo=r.checkMemo;cmShow()}}
function cmShow(){const t=document.getElementById('cmemo');if(t&&document.activeElement!==t)t.value=checkMemo}
function cmSt(x){const e=document.getElementById('cmst');if(e)e.textContent=x}
function cmInput(){cmSt('');clearTimeout(cmT);cmT=setTimeout(cmFlush,500)}
function cmFlush(){clearTimeout(cmT);cmT=null;const t=document.getElementById('cmemo');if(!t||t.value===checkMemo)return;checkMemo=t.value;save();cmSt('저장됨')}
window.addEventListener('beforeunload',()=>{if(cmT)cmFlush()});
