// 앱 안 알림·확인 창 (브라우저 기본 alert/confirm 대신)
// Windows에서 기본 alert/confirm 창이 닫힌 뒤 입력란이 클릭해도 글자 입력이 안 되는 문제(Electron) 때문에 직접 만든 창을 씀
(function(){
 let q=Promise.resolve();
 function open(msg,isConfirm,okLabel){
  const run=()=>new Promise(res=>{
   const prev=document.activeElement;
   const d=document.createElement('dialog');d.className='uidlg';
   d.innerHTML=`<div class="db"></div><div class="df"><button class="p" data-v="1"></button>${isConfirm?'<button data-v="0">취소</button>':''}</div>`;
   d.querySelector('.db').textContent=String(msg==null?'':msg);d.querySelector('button.p').textContent=okLabel||'확인';
   let done=false;const fin=v=>{if(done)return;done=true;try{d.close()}catch(e){}d.remove();
    if(prev&&prev.isConnected&&prev!==document.body&&typeof prev.focus==='function')try{prev.focus({preventScroll:true})}catch(e){}
    res(v)};
   d.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)fin(b.dataset.v==='1')});
   d.addEventListener('cancel',e=>{e.preventDefault();fin(!isConfirm)});
   d.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.stopPropagation();const b=e.target.closest&&e.target.closest('button[data-v]');fin(b?b.dataset.v==='1':true)}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fin(!isConfirm)}});
   document.body.appendChild(d);d.showModal();d.querySelector('button.p').focus()});
  const p=q.then(run);q=p.catch(()=>{});return p}
 window.uiAlert=m=>open(m,false).then(()=>undefined);
 window.uiConfirm=(m,ok)=>open(m,true,ok);
 // 버튼 여러 개: uiChoice(메시지, [{t:'개별 삭제'},{t:'일괄 삭제',c:'d'}]) → 누른 버튼 번호(0부터), 취소·Esc는 -1. 맨 오른쪽은 항상 [취소]
 window.uiChoice=(msg,btns)=>{const run=()=>new Promise(res=>{const prev=document.activeElement,d=document.createElement('dialog');d.className='uidlg';
  d.innerHTML=`<div class="db"></div><div class="df">${btns.map((b,i)=>`<button data-i="${i}" class="${b.c||''}"></button>`).join('')}<button data-i="-1">취소</button></div>`;
  d.querySelector('.db').textContent=String(msg==null?'':msg);btns.forEach((b,i)=>d.querySelector(`button[data-i="${i}"]`).textContent=b.t);
  let done=false;const fin=v=>{if(done)return;done=true;try{d.close()}catch(e){}d.remove();if(prev&&prev.isConnected&&prev!==document.body&&typeof prev.focus==='function')try{prev.focus({preventScroll:true})}catch(e){}res(v)};
  d.addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)fin(+b.dataset.i)});
  d.addEventListener('cancel',e=>{e.preventDefault();fin(-1)});
  d.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.stopPropagation();const b=e.target.closest&&e.target.closest('button[data-i]');fin(b?+b.dataset.i:-1)}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fin(-1)}});
  document.body.appendChild(d);d.showModal();d.querySelector('button[data-i="0"]').focus()});const p=q.then(run);q=p.catch(()=>{});return p};
 // 혹시 남아 있는 기본 alert도 앱 창으로 (confirm은 결과가 바로 필요해서 uiConfirm을 직접 씀)
 window.alert=m=>{window.uiAlert(m)};
})();
