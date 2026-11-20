// 좁은 화면에서도 표가 깨지지 않게: 칸이 글자보다 좁아지지 않도록 표 최소 폭을 자동 계산(넘치면 표 안에서 가로 스크롤)
// - 넓이 지정 칸 + 자동·비율 칸(70px, 글자가 한 자씩 세로로 쌓이지 않을 만큼)의 합을 min-width로. 사용자가 넓이를 바꾼 표(.rzd)는 그대로
// - 모든 칸이 자동인 표는 브라우저 자동 배치(table-layout:auto)로 숫자 칸이 겹치지 않게
// - 잘린 칸에 마우스를 올리면 전체 글자를 툴팁으로
(function(){
 function fit(t){if(!t.offsetParent||t.classList.contains('rzd')){if(t.dataset.tfm){t.style.minWidth='';delete t.dataset.tfm}return}
  const cols=[...t.querySelectorAll(':scope>colgroup>col')],head=t.tHead&&t.tHead.rows[0];if(!head)return;const n=head.cells.length;
  const fixed=cols.map(c=>{const w=c.style.width||'';return /px$/.test(w)?parseFloat(w):/%$/.test(w)?-parseFloat(w)/100:0});
  if(!cols.length||fixed.every(v=>v===0)){t.classList.add('tfa');return}
  t.classList.remove('tfa');const need=new Array(n).fill(0),rows=[...[...t.tBodies].flatMap(b=>[...b.rows].slice(0,200)),...(t.tFoot?[...t.tFoot.rows]:[])];
  rows.forEach(r=>{let i=0;[...r.cells].forEach(c=>{const sp=c.colSpan||1;if(sp===1&&i<n)need[i]=Math.max(need[i],c.scrollWidth);i+=sp})});
  let sum=0;for(let i=0;i<n;i++){let f=fixed[i]||0;if(f>0&&cols[i]&&need[i]>f+1){f=need[i];cols[i].style.width=f+'px'}sum+=f>0?f:f<0?0:70}const pct=Math.min(.8,fixed.reduce((a,f)=>a+(f<0?-f:0),0));sum=Math.max(sum/(1-pct),sum+70*fixed.filter(f=>f<0).length); // 비율 칸은 표 폭의 비율이므로 나머지가 남도록 역산 // 숫자가 넓이 지정 칸보다 길면 그 칸을 넓힘
  if(t.dataset.tfc==null)t.dataset.tfc=t.dataset.tfm?0:(parseFloat(getComputedStyle(t).minWidth)||0);const v=Math.ceil(Math.max(+t.dataset.tfc,sum));
  if(v>(t.parentElement?t.parentElement.clientWidth:0)||t.dataset.tfm){t.style.minWidth=v+'px';t.dataset.tfm=1}}
 function all(){document.querySelectorAll('table.ul,table.blt,table.trt').forEach(t=>{try{fit(t)}catch(e){}});if(window.dlRefit)requestAnimationFrame(()=>window.dlRefit())}
 let q=0;const sch=()=>{if(!q){q=1;requestAnimationFrame(()=>{q=0;all()})}};
 new MutationObserver(m=>{if(m.some(x=>x.target.closest&&!x.target.closest('.rzh')))sch()}).observe(document.documentElement,{childList:true,subtree:true});
 window.addEventListener('resize',sch);document.addEventListener('click',()=>setTimeout(sch,0),true);
 document.addEventListener('mouseover',e=>{const c=e.target.closest&&e.target.closest('table.ul td,table.ul th,table.blt td,table.trt td');if(!c||c.title)return;if(c.scrollWidth>c.clientWidth+1){const s=c.innerText.trim();if(s)c.title=s}},true);
 window.tfFit=all})();
