// 검색창 지우기(×): placeholder가 '검색'이거나 class="srch"인 입력칸에 자동으로 붙음(나중에 그려지는 칸 포함)
// 글자가 있을 때만 보이고, 누르면 한 번에 지우고 input 이벤트로 목록을 다시 거름. Esc로도 지움.
(function(){const SEL='input[placeholder="검색"],input.srch';
 function vis(i){const b=i._sxb;if(b)b.style.display=i.value?'':'none'}
 function clear(i){const id=i.id;i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));const t=(id&&document.getElementById(id))||i;if(t.isConnected){t.focus();vis(t)}}
 function wrap(i){if(i._sxb||!i.parentNode)return;const cs=getComputedStyle(i),w=document.createElement('span'),b=document.createElement('span');
  w.className='sxw';if(i.hasAttribute('data-sxfull'))w.classList.add('full');
  const g=parseFloat(cs.flexGrow)||0;if(g)w.style.flex=`${g} ${cs.flexShrink} ${cs.flexBasis}`;
  i.parentNode.insertBefore(w,i);w.appendChild(i);
  const pr=parseFloat(cs.paddingRight)||0,add=22-pr;if(add>0){i.style.paddingRight='22px';if(cs.boxSizing!=='border-box'&&!w.classList.contains('full'))i.style.marginRight=(-add)+'px'}
  b.className='sxb';b.textContent='✕';b.title='지우기';b.style.right=(cs.boxSizing!=='border-box'&&add>0&&!w.classList.contains('full')?6-add:6)+'px';
  b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',e=>{e.stopPropagation();clear(i)});
  i.addEventListener('keydown',e=>{if(e.key==='Escape'&&i.value&&!e.isComposing){e.preventDefault();e.stopPropagation();clear(i)}});
  w.appendChild(b);i._sxb=b;vis(i)}
 function scan(){document.querySelectorAll(SEL).forEach(i=>{wrap(i);vis(i)})}
 ['input','keyup','change'].forEach(t=>document.addEventListener(t,e=>{const i=e.target;if(i&&i._sxb)vis(i)},true));
 document.addEventListener('click',()=>setTimeout(scan,0),true);
 let q=0;new MutationObserver(()=>{if(!q){q=1;requestAnimationFrame(()=>{q=0;scan()})}}).observe(document.documentElement,{childList:true,subtree:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();window.sxScan=scan})();
