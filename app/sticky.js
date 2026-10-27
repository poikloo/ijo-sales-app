// 목록 화면: 검색·필터 줄(.filters)은 CSS sticky로 위에 고정, 표 머리글(thead)은 그 바로 아래에 붙도록 transform으로 따라 내려옴
// (.tw 가 가로 스크롤 영역이라 thead 에 CSS sticky 가 먹지 않아서 JS 로 처리)
(function(){
 const C=()=>document.getElementById('content');
 const barOf=t=>{const card=t.closest('.card');const f=card&&card.querySelector(':scope>.filters');return f&&getComputedStyle(f).position==='sticky'?f:null};
 // 스크롤 영역 맨 위에서부터 고정 막대(필터 줄 + 머리글)가 차지하는 높이 — listreturn.js 에서 행을 그 아래로 맞출 때 사용
 window.stickyOffset=function(el){const t=el&&el.closest('table');if(!t)return 0;const f=barOf(t),h=t.tHead;return (f?f.offsetHeight:0)+(h?h.offsetHeight:0)};
 let q=0;
 function upd(){q=0;const c=C();if(!c)return;const top=c.getBoundingClientRect().top;
  document.querySelectorAll('.page.on .card>.tw>table>thead').forEach(h=>{const t=h.parentElement,f=barOf(t);
   if(!f||h.offsetParent===null){if(h._sy){h.style.transform='';h._sy=0;h.classList.remove('stk')}return}
   const cur=h._sy||0,nat=h.getBoundingClientRect().top-cur,bar=Math.max(top,f.getBoundingClientRect().bottom);
   const max=t.getBoundingClientRect().bottom-nat-h.offsetHeight;let y=Math.round(Math.min(Math.max(0,bar-nat),Math.max(0,max)));
   if(y!==cur){h._sy=y;h.style.transform=y?`translateY(${y}px)`:'';h.classList.toggle('stk',y>0)}})}
 const sch=()=>{if(!q)q=requestAnimationFrame(upd)};window.stickyUpdate=upd;
 window.addEventListener('load',()=>{const c=C();c.addEventListener('scroll',sch,{passive:true});window.addEventListener('resize',sch);
  new MutationObserver(sch).observe(c,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});sch()});
})();
