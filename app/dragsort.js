// 끌어서 순서 바꾸기 (▲▼ 대신): 줄 왼쪽 손잡이(⋮⋮)를 누른 채 끌면 놓을 자리에 파란 선, 목록 끝 가까이 가면 자동 스크롤.
// 손잡이:  <span class="dsh" data-dsk="키" data-dsi="번호" data-dsfn="함수이름" data-dsa='["인자",...]'>⋮⋮</span>
// 줄:      같은 data-dsk · data-dsi 를 줄 요소에(여러 줄이 한 항목이면 모두에) 붙임.  놓으면 window[함수](...인자, from, to) — to = 옮긴 뒤 위치
// 손잡이에서만 시작하므로 입력칸 글자 선택·클릭은 그대로. 저장은 받는 함수가 한 번 → Ctrl+Z 한 번
(function(){
 const st=document.createElement('style');st.textContent='.dsh{cursor:grab;user-select:none;-webkit-user-select:none;color:#9aa3ad;font-size:12px;letter-spacing:-3px;padding:2px 6px 2px 2px;line-height:1;display:inline-block;touch-action:none}.dsh:hover{color:#2271b1}'+
  '.dsh.dsn{visibility:hidden}.dsline{position:fixed;height:3px;background:#2271b1;border-radius:2px;z-index:100000;pointer-events:none;box-shadow:0 0 0 1px #fff}.dsline:before{content:"";position:absolute;left:-4px;top:-3px;width:9px;height:9px;border-radius:50%;background:#2271b1}'+
  '.dsdrag{opacity:.45}body.dsing,body.dsing *{cursor:grabbing!important;user-select:none!important}';document.head.appendChild(st);
 let S=null;
 const rows=(k,root)=>{const m=new Map();root.querySelectorAll('[data-dsk]').forEach(e=>{if(e.dataset.dsk!==k||e.classList.contains('dsh'))return;const i=+e.dataset.dsi;if(!m.has(i))m.set(i,[]);m.get(i).push(e)});return [...m.entries()].sort((a,b)=>a[0]-b[0]).map(([i,els])=>({i,els}))};
 const box=els=>{let t=1e9,b=-1e9,l=1e9,r=-1e9;els.forEach(e=>{const x=e.getBoundingClientRect();t=Math.min(t,x.top);b=Math.max(b,x.bottom);l=Math.min(l,x.left);r=Math.max(r,x.right)});return {top:t,bottom:b,left:l,right:r}};
 const scroller=el=>{for(let e=el.parentElement;e&&e!==document.body;e=e.parentElement){const cs=getComputedStyle(e);if(/(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+2)return e}return document.scrollingElement};
 function place(y){const R=rows(S.k,S.root);if(!R.length)return;let t=R.length;for(let j=0;j<R.length;j++){const b=box(R[j].els);if(y<(b.top+b.bottom)/2){t=j;break}}S.t=t;
  const ref=t<R.length?box(R[t].els):box(R[R.length-1].els),y0=t<R.length?ref.top:ref.bottom,all=box(R.flatMap(x=>x.els));
  Object.assign(S.line.style,{left:all.left+'px',width:(all.right-all.left)+'px',top:(y0-1.5)+'px',display:(t===S.from||t===S.from+1)?'none':'block'})}
 function tick(){if(!S)return;const sc=S.sc,r=sc===document.scrollingElement?{top:0,bottom:innerHeight}:sc.getBoundingClientRect(),E=48;let d=0;
  if(S.y<r.top+E)d=-Math.ceil((r.top+E-S.y)/4);else if(S.y>r.bottom-E)d=Math.ceil((S.y-(r.bottom-E))/4);if(d){sc.scrollTop+=Math.max(-24,Math.min(24,d));place(S.y)}S.raf=requestAnimationFrame(tick)}
 function end(ok){if(!S)return;cancelAnimationFrame(S.raf);S.line.remove();S.mark.forEach(e=>e.classList.remove('dsdrag'));document.body.classList.remove('dsing');
  const s=S;S=null;removeEventListener('pointermove',mv,true);removeEventListener('pointerup',up,true);removeEventListener('keydown',kd,true);
  if(!ok||s.t==null)return;let to=s.t>s.from?s.t-1:s.t;if(to===s.from)return;const f=window[s.fn];if(typeof f==='function')f(...s.args,s.from,to)}
 const mv=e=>{if(!S)return;S.y=e.clientY;if(!S.on){if(Math.abs(e.clientY-S.y0)<4)return;S.on=true;document.body.classList.add('dsing');S.mark.forEach(x=>x.classList.add('dsdrag'));S.raf=requestAnimationFrame(tick)}place(e.clientY);e.preventDefault()};
 const up=e=>{const on=S&&S.on;end(on);if(on){e.preventDefault();e.stopPropagation()}},kd=e=>{if(e.key==='Escape'&&S){e.preventDefault();e.stopPropagation();end(false)}};
 document.addEventListener('pointerdown',e=>{const h=e.target instanceof Element&&e.target.closest('.dsh');if(!h||e.button!==0||h.classList.contains('dsn'))return;e.preventDefault();e.stopPropagation();
  const k=h.dataset.dsk,root=h.closest('table,dialog,.card,#dbody,body')||document.body,R=rows(k,root),from=+h.dataset.dsi,me=R.find(x=>x.i===from);if(!me||R.length<2)return;
  let args=[];try{args=JSON.parse(h.dataset.dsa||'[]')}catch(_){}
  const line=document.createElement('div');line.className='dsline';line.style.display='none';document.body.appendChild(line);
  S={k,root,from,fn:h.dataset.dsfn,args,line,mark:me.els,y0:e.clientY,y:e.clientY,on:false,t:null,sc:scroller(h)};
  addEventListener('pointermove',mv,true);addEventListener('pointerup',up,true);addEventListener('keydown',kd,true)},true);
 document.addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('.dsh')){e.preventDefault();e.stopPropagation()}},true);
 window.dsH=(k,i,fn,args,n)=>`<span class="dsh${n<2?' dsn':''}" data-dsk="${esc(k)}" data-dsi="${i}" data-dsfn="${fn}" data-dsa="${esc(JSON.stringify(args||[]))}" title="끌어서 순서 바꾸기" aria-label="끌어서 순서 바꾸기">⋮⋮</span>`;
 window.dsRow=(k,i)=>`data-dsk="${esc(k)}" data-dsi="${i}"`;
 window.arrMove=(a,from,to)=>{if(from<0||from>=a.length||to<0||to>=a.length||from===to)return false;const [x]=a.splice(from,1);a.splice(to,0,x);return true};
})();
