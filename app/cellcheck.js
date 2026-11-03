// 표의 체크박스 칸: 칸 아무 곳이나 눌러도 체크 (행 열기 안 함, 열 너비 손잡이는 제외)
(()=>{const st=document.createElement('style');st.textContent='td:has(input[type=checkbox]),th:has(input[type=checkbox]){cursor:pointer}';document.head.appendChild(st);
 let rz=0;document.addEventListener('mousedown',e=>{rz=e.target instanceof Element&&!!e.target.closest('.rzh')},true);
 document.addEventListener('click',e=>{const t=e.target;if(rz){rz=0;return}if(!(t instanceof Element)||t.closest('.rzh,input,label,button,select,textarea,a'))return;const c=t.closest('td,th');if(!c||!c.closest('table'))return;
  const cb=c.querySelectorAll('input[type=checkbox]');if(cb.length!==1||c.querySelector('input:not([type=checkbox]),select,textarea,button')||cb[0].disabled)return;
  e.stopPropagation();e.preventDefault();cb[0].click()},true)})();
