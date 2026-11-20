// ===== 위젯 배치 (12칸 격자, 끌어서 이동·크기 조절, 놓으면 격자에 맞춰 정렬) — 대시보드·매출 현황 공용 =====
const DL_COLS=12,DL_RH=24,DL_GAP=14,DL_MIN={w:2,h:2};
const dlHit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
// fix: 고정할 위젯 id(드래그 중인 것). 나머지는 위→아래 순서로 가능한 한 위로 올림
function dlCompact(L,fix){const out={},placed=[];if(fix){out[fix]={...L[fix]};placed.push(out[fix])}
 Object.keys(L).filter(k=>k!==fix).sort((a,b)=>L[a].y-L[b].y||L[a].x-L[b].x).forEach(k=>{const it={...L[k],y:0};while(placed.some(p=>dlHit(p,it)))it.y++;out[k]=it;placed.push(it)});return out}
// 좁은 화면: 위젯이 최소 폭(MIN, 작은 카드 170px)보다 좁아지면 보기용 배치를 따로 만듦(저장된 배치는 그대로)
// 작은 카드(높이 3칸 이하)는 한 줄에 들어가는 만큼 고르게 나눠 줄바꿈, 패널은 최소 폭 미만이면 전체 폭으로 내려 쌓음
function dlNarrow(L,cw,MIN){const cu=cw+DL_GAP,px=w=>w*cu-DL_GAP,small=k=>L[k].h<=3,mn=k=>small(k)?170:((MIN&&MIN[k])||440);
 const ks=Object.keys(L).sort((a,b)=>L[a].y-L[b].y||L[a].x-L[b].x);if(ks.every(k=>px(L[k].w)>=mn(k)))return L;
 const out={};let Y=0,i=0;
 while(i<ks.length){if(small(ks[i])){const run=[];while(i<ks.length&&small(ks[i]))run.push(ks[i++]);
   if(run.every(k=>px(L[k].w)>=mn(k))){const y0=Math.min(...run.map(k=>L[k].y));run.forEach(k=>out[k]={...L[k],y:Y+L[k].y-y0});Y+=Math.max(...run.map(k=>L[k].y+L[k].h))-y0;continue}
   let per=run.length;while(per>1&&px(Math.floor(DL_COLS/per))<Math.max(...run.map(mn)))per--;
   const rows=Math.ceil(run.length/per),base=Math.floor(run.length/rows),extra=run.length%rows;let j=0;
   for(let r=0;r<rows;r++){const n=base+(r<extra?1:0),row=run.slice(j,j+n);j+=n;let x=0,h=0;
    row.forEach((k,q)=>{const w=q===n-1?DL_COLS-x:Math.floor(DL_COLS/n);out[k]={x,y:Y,w,h:L[k].h};x+=w;h=Math.max(h,L[k].h)});Y+=h}}
  else{const row=[];let x=0;
   while(i<ks.length&&!small(ks[i])){const k=ks[i],w=px(L[k].w)>=mn(k)?L[k].w:DL_COLS;if(row.length&&(x+w>DL_COLS||L[k].y>=Math.max(...row.map(r=>L[r].y+L[r].h))))break;
    out[k]={x,y:Y,w,h:L[k].h};row.push(k);x+=w;i++}
   const last=row[row.length-1];out[last].w=DL_COLS-out[last].x;Y+=Math.max(...row.map(k=>L[k].h))}}
 return out}
const dlPx=(it,cw)=>({left:it.x*(cw+DL_GAP),top:it.y*(DL_RH+DL_GAP),width:it.w*cw+(it.w-1)*DL_GAP,height:it.h*DL_RH+(it.h-1)*DL_GAP});
// opt: {grid, page, edit, DEF, onResize(), onSave()}  — 격자 하나당 하나
function dlMake(opt){const G={L:{},on:false,ready:false,act:null};const DEF=opt.DEF;
 G.norm=o=>{const r={};Object.keys(DEF).forEach(k=>{const v=o&&o[k],d=DEF[k];if(v&&typeof v==='object'){const w=Math.min(DL_COLS,Math.max(DL_MIN.w,Math.round(+v.w)||d.w)),h=Math.max(DL_MIN.h,Math.round(+v.h)||d.h);r[k]={w,h,x:Math.min(DL_COLS-w,Math.max(0,Math.round(+v.x)||0)),y:Math.max(0,Math.round(+v.y)||0)}}else r[k]={...d}});return dlCompact(r)};
 G.load=o=>{G.L=G.norm(o)};
 G.cmin={}; // 패널 안 표가 넘칠 때 잰 내용 최소 폭(한 번 재면 유지 → 깜빡임 없음)
 G.meas=()=>{const g=grid();if(!g)return;g.querySelectorAll('.dw').forEach(e=>{const b=e.querySelector('.dwb');if(b&&b.clientWidth&&b.scrollWidth>b.clientWidth+24){const k=e.dataset.w,v=Math.ceil(b.scrollWidth+(e.offsetWidth-b.clientWidth));if(v>(G.cmin[k]||0))G.cmin[k]=v}})};
 const grid=()=>$(opt.grid),cwF=()=>{const g=grid();return (((g&&g.clientWidth)||1000)-(DL_COLS-1)*DL_GAP)/DL_COLS};
 let rT=null,lw={};
 G.resized=()=>{clearTimeout(rT);rT=setTimeout(()=>{if(opt.onResize)opt.onResize()},60)};
 G.apply=(L,skip)=>{L=L||G.L;const g=grid();if(!g||!g.clientWidth)return;const cw=cwF();let mb=0;if(!G.on&&!G.act){G.meas();L=dlNarrow(L,cw,{...opt.MIN,...G.cmin});G.narrow=L!==G.L}
  g.querySelectorAll('.dw').forEach(e=>{const it=L[e.dataset.w];if(!it)return;mb=Math.max(mb,it.y+it.h);if(e.dataset.w===skip)return;const p=dlPx(it,cw);Object.assign(e.style,{left:p.left+'px',top:p.top+'px',width:p.width+'px',height:p.height+'px'})});
  g.style.height=(mb*(DL_RH+DL_GAP))+'px';G.resized()};
 G.init=()=>{if(G.ready)return;const g=grid();if(!g)return;G.ready=true;
  g.querySelectorAll('.dw').forEach(e=>{['r','b','c'].forEach(k=>{const h=document.createElement('div');h.className='dwh '+k;h.dataset.h=k;e.appendChild(h)})});
  const ph=document.createElement('div');ph.className='dlph';g.appendChild(ph);G.ph=ph;
  new ResizeObserver(()=>requestAnimationFrame(()=>G.apply())).observe(g);g.addEventListener('mousedown',down);G.apply()};
 G.toggle=()=>{G.on=!G.on;$(opt.page).classList.toggle('dled',G.on);const b=$(opt.edit);b.textContent=G.on?'완료':'위치 변경';b.classList.toggle('p',G.on);G.apply()};
 const anim=()=>grid().querySelectorAll('.dw').forEach(e=>{e.classList.add('anim');setTimeout(()=>e.classList.remove('anim'),200)});
 G.reset=()=>{G.L=G.norm(null);anim();G.apply();opt.onSave()};
 function down(ev){if(!G.on||ev.button!==0)return;const e=ev.target.closest('.dw');if(!e)return;ev.preventDefault();
  const id=e.dataset.w,cw=cwF(),st=dlPx(G.L[id],cw);G.act={id,e,mode:ev.target.dataset.h||'move',sx:ev.clientX,sy:ev.clientY,st,cw,L:G.L};e.classList.add('drag');
  Object.assign(G.ph.style,{display:'block',left:st.left+'px',top:st.top+'px',width:st.width+'px',height:st.height+'px'});
  document.addEventListener('mousemove',move);document.addEventListener('mouseup',up)}
 function move(ev){const a=G.act;if(!a)return;const dx=ev.clientX-a.sx,dy=ev.clientY-a.sy,cw=a.cw,cu=cw+DL_GAP,ru=DL_RH+DL_GAP,o=G.L[a.id],it={...o};let px={...a.st};
  if(a.mode==='move'){px.left=a.st.left+dx;px.top=Math.max(0,a.st.top+dy);it.x=Math.min(DL_COLS-o.w,Math.max(0,Math.round(px.left/cu)));it.y=Math.max(0,Math.round(px.top/ru))}
  else{if(a.mode!=='b'){px.width=Math.max(DL_MIN.w*cw,a.st.width+dx);it.w=Math.min(DL_COLS-o.x,Math.max(DL_MIN.w,Math.round((px.width+DL_GAP)/cu)))}
   if(a.mode!=='r'){px.height=Math.max(DL_MIN.h*DL_RH,a.st.height+dy);it.h=Math.max(DL_MIN.h,Math.round((px.height+DL_GAP)/ru))}}
  Object.assign(a.e.style,{left:px.left+'px',top:px.top+'px',width:px.width+'px',height:px.height+'px'});
  const L=dlCompact({...a.L,[a.id]:it},a.id);a.L=L;const tp=dlPx(L[a.id],cw);Object.assign(G.ph.style,{left:tp.left+'px',top:tp.top+'px',width:tp.width+'px',height:tp.height+'px'});
  grid().querySelectorAll('.dw').forEach(x=>{if(x!==a.e)x.classList.add('anim')});G.apply(L,a.id)}
 function up(){const a=G.act;G.act=null;document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);if(!a)return;
  a.e.classList.remove('drag');G.ph.style.display='none';G.L=dlCompact(a.L);anim();G.apply();
  setTimeout(()=>grid().querySelectorAll('.dw').forEach(x=>x.classList.remove('anim')),200);opt.onSave()}
 return G}
// ---- 대시보드 ----
const DL_DEF={kpi1:{x:0,y:0,w:3,h:3},kpi2:{x:3,y:0,w:3,h:3},kpi3:{x:6,y:0,w:3,h:3},clock:{x:9,y:0,w:3,h:3},month:{x:0,y:3,w:12,h:7},orders:{x:0,y:10,w:7,h:9},vendor:{x:7,y:10,w:5,h:7},sales:{x:7,y:17,w:5,h:4},trend:{x:0,y:19,w:12,h:8}};
let dlLastTrW=0,dlLastTrH=0;
const DLD=dlMake({grid:'dlgrid',page:'p_dash',edit:'dledit',DEF:DL_DEF,MIN:{month:600,orders:520,vendor:380,sales:320,trend:520},onSave:()=>save(),onResize:()=>{const t=$('dbtr');if(t&&(t.clientWidth!==dlLastTrW||t.clientHeight!==dlLastTrH)){dlLastTrW=t.clientWidth;dlLastTrH=t.clientHeight;if(typeof dbTrend==='function')dbTrend()}}});
function dlLoad(r){DLD.load(r&&!Array.isArray(r)?r.dashLayout:null)}
const dlPayload=()=>({dashLayout:DLD.L});
function dlImport(r){if(r&&!Array.isArray(r)&&r.dashLayout){dlLoad(r);DLD.apply()}}
const dlInit=()=>DLD.init(),dlToggle=()=>DLD.toggle(),dlReset=()=>DLD.reset(),dlApply=(L,s)=>DLD.apply(L,s);
// ---- 매출 현황 ----
const SL_DEF={k1:{x:0,y:0,w:3,h:3},k2:{x:3,y:0,w:2,h:3},k3:{x:5,y:0,w:2,h:3},k4:{x:7,y:0,w:2,h:3},k5:{x:9,y:0,w:3,h:3},year:{x:0,y:3,w:12,h:9},mon:{x:0,y:12,w:12,h:12},client:{x:0,y:24,w:12,h:12}};
const SLD=dlMake({grid:'slgrid',page:'p_sales',edit:'sledit',DEF:SL_DEF,MIN:{year:520,mon:440,client:560},onSave:()=>save()});
function sllLoad(r){SLD.load(r&&!Array.isArray(r)?r.salesLayout:null)}
const sllPayload=()=>({salesLayout:SLD.L});
function sllImport(r){if(r&&!Array.isArray(r)&&r.salesLayout){sllLoad(r);SLD.apply()}}
window.dlRefit=()=>[DLD,SLD].forEach(G=>{if(G.ready&&!G.on&&!G.act)G.apply()});
