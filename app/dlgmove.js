// ===== 모든 창(dialog) 제목줄로 끌어 옮기기 · 더블클릭: 가운데로 =====
// 제목줄(.dh)이 없는 확인 창(.uidlg)은 입력칸·버튼이 아닌 곳을 잡아 옮김. 닫으면 위치 초기화.
(()=>{const NO='input,textarea,select,button,a,label,[contenteditable],[data-attp],.wfpop,option';let D=null;
 const head=(d,t)=>{const h=d.querySelector('.dh');if(h)return h.contains(t)?h:null;return d.classList.contains('uidlg')?d:null};
 const xy=d=>{const m=(d.style.translate||'').match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);return m?[+m[1],+m[2]]:[0,0]};
 document.addEventListener('pointerdown',e=>{if(e.button!==0)return;const d=e.target.closest&&e.target.closest('dialog[open]');if(!d||e.target.closest(NO))return;
  const h=head(d,e.target);if(!h)return;
  const [x,y]=xy(d),hr=(d.querySelector('.dh')||d).getBoundingClientRect();D={d,sx:e.clientX,sy:e.clientY,x,y,hr};
  if(typeof attPop!=='undefined'&&attPop&&typeof attClose==='function')attClose(false);e.preventDefault()},true);
 document.addEventListener('pointermove',e=>{if(!D)return;const {d,hr}=D,M=8;let dx=e.clientX-D.sx,dy=e.clientY-D.sy;
  dx=Math.max(M-hr.right+40,Math.min(innerWidth-M-hr.left-40,dx));dy=Math.max(M-hr.top,Math.min(innerHeight-hr.bottom-M+Math.min(hr.height,30)-30,dy)); // 제목줄은 화면 안
  d.style.translate=`${D.x+dx}px ${D.y+dy}px`});
 const up=()=>{D=null};document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',up,true);
 document.addEventListener('dblclick',e=>{const d=e.target.closest&&e.target.closest('dialog[open]');if(!d||e.target.closest(NO))return;const h=d.querySelector('.dh');if(h&&h.contains(e.target))d.style.translate=''},true);
 document.addEventListener('close',e=>{if(e.target.tagName==='DIALOG')e.target.style.translate=''},true);
 addEventListener('resize',()=>document.querySelectorAll('dialog[open]').forEach(d=>{const r=(d.querySelector('.dh')||d).getBoundingClientRect();if(r.top<0||r.bottom>innerHeight||r.right<40||r.left>innerWidth-40)d.style.translate=''}))})();
