// 앱 안 알림·확인 창 (브라우저 기본 alert/confirm 대신)
// Windows에서 기본 alert/confirm 창이 닫힌 뒤 입력란이 클릭해도 글자 입력이 안 되는 문제(Electron) 때문에 직접 만든 창을 씀
(function(){
 let q=Promise.resolve();
 function open(msg,isConfirm){
  const run=()=>new Promise(res=>{
   const prev=document.activeElement;
   const d=document.createElement('dialog');d.className='uidlg';
   d.innerHTML=`<div class="db"></div><div class="df">${isConfirm?'<button data-v="0">취소</button>':''}<button class="p" data-v="1">확인</button></div>`;
   d.querySelector('.db').textContent=String(msg==null?'':msg);
   let done=false;const fin=v=>{if(done)return;done=true;try{d.close()}catch(e){}d.remove();
    if(prev&&prev.isConnected&&prev!==document.body&&typeof prev.focus==='function')try{prev.focus({preventScroll:true})}catch(e){}
    res(v)};
   d.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)fin(b.dataset.v==='1')});
   d.addEventListener('cancel',e=>{e.preventDefault();fin(!isConfirm)});
   d.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.stopPropagation();const b=e.target.closest&&e.target.closest('button[data-v]');fin(b?b.dataset.v==='1':true)}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fin(!isConfirm)}});
   document.body.appendChild(d);d.showModal();d.querySelector('button.p').focus()});
  const p=q.then(run);q=p.catch(()=>{});return p}
 window.uiAlert=m=>open(m,false).then(()=>undefined);
 window.uiConfirm=m=>open(m,true);
 // 혹시 남아 있는 기본 alert도 앱 창으로 (confirm은 결과가 바로 필요해서 uiConfirm을 직접 씀)
 window.alert=m=>{window.uiAlert(m)};
})();
