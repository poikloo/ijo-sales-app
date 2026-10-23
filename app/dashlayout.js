// ===== 위젯 배치 (12칸 격자, 끌어서 이동·크기 조절, 놓으면 격자에 맞춰 정렬) — 대시보드·매출 현황 공용 =====
const DL_COLS=12,DL_RH=24,DL_GAP=14,DL_MIN={w:2,h:2};
const dlHit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
// fix: 고정할 위젯 id(드래그 중인 것). 나머지는 위→아래 순서로 가능한 한 위로 올림
function dlCompact(L,fix){const out={},placed=[];if(fix){out[fix]={...L[fix]};placed.push(out[fix])}
 Object.keys(L).filter(k=>k!==fix).sort((a,b)=>L[a].y-L[b].y||L[a].x-L[b].x).forEach(k=>{const it={...L[k],y:0};while(placed.some(p=>dlHit(p,it)))it.y++;out[k]=it;placed.push(it)});return out}
const dlPx=(it,cw)=>({left:it.x*(cw+DL_GAP),top:it.y*(DL_RH+DL_GAP),width:it.w*cw+(it.w-1)*DL_GAP,height:it.h*DL_RH+(it.h-1)*DL_GAP});
// opt: {grid, page, edit, DEF, onResize(), onSave()}  — 격자 하나당 하나
function dlMake(opt){const G={L:{},on:false,ready:false,act:null};const DEF=opt.DEF;
 G.norm=o=>{const r={};Object.keys(DEF).forEach(k=>{const v=o&&o[k],d=DEF[k];if(v&&typeof v==='object'){const w=Math.min(DL_COLS,Math.max(DL_MIN.w,Math.round(+v.w)||d.w)),h=Math.max(DL_MIN.h,Math.round(+v.h)||d.h);r[k]={w,h,x:Math.min(DL_COLS-w,Math.max(0,Math.round(+v.x)||0)),y:Math.max(0,Math.round(+v.y)||0)}}else r[k]={...d}});return dlCompact(r)};
 G.load=o=>{G.L=G.norm(o)};
 const grid=()=>$(opt.grid),cwF=()=>{const g=grid();return (((g&&g.clientWidth)||1000)-(DL_COLS-1)*DL_GAP)/DL_COLS};
 let rT=null,lw={};
 G.resized=()=>{clearTimeout(rT);rT=setTimeout(()=>{if(opt.onResize)opt.onResize()},60)};
 G.apply=(L,skip)=>{L=L||G.L;const g=grid();if(!g||!g.clientWidth)return;const cw=cwF();let mb=0;
  g.querySelectorAll('.dw').forEach(e=>{const it=L[e.dataset.w];if(!it)return;mb=Math.max(mb,it.y+it.h);if(e.dataset.w===skip)return;const p=dlPx(it,cw);Object.assign(e.style,{left:p.left+'px',top:p.top+'px',width:p.width+'px',height:p.height+'px'})});
  g.style.height=(mb*(DL_RH+DL_GAP))+'px';G.resized()};
 G.init=()=>{if(G.ready)return;const g=grid();if(!g)return;G.ready=true;
  g.querySelectorAll('.dw').forEach(e=>{['r','b','c'].forEach(k=>{const h=document.createElement('div');h.className='dwh '+k;h.dataset.h=k;e.appendChild(h)})});
  const ph=document.createElement('div');ph.className='dlph';g.appendChild(ph);G.ph=ph;
  new ResizeObserver(()=>requestAnimationFrame(()=>G.apply())).observe(g);g.addEventListener('mousedown',down);G.apply()};
 G.toggle=()=>{G.on=!G.on;$(opt.page).classList.toggle('dled',G.on);const b=$(opt.edit);b.textContent=G.on?'완료':'위치 변경';b.classList.toggle('p',G.on)};
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
const DLD=dlMake({grid:'dlgrid',page:'p_dash',edit:'dledit',DEF:DL_DEF,onSave:()=>save(),onResize:()=>{const t=$('dbtr');if(t&&(t.clientWidth!==dlLastTrW||t.clientHeight!==dlLastTrH)){dlLastTrW=t.clientWidth;dlLastTrH=t.clientHeight;if(typeof dbTrend==='function')dbTrend()}}});
function dlLoad(r){DLD.load(r&&!Array.isArray(r)?r.dashLayout:null)}
const dlPayload=()=>({dashLayout:DLD.L});
function dlImport(r){if(r&&!Array.isArray(r)&&r.dashLayout){dlLoad(r);DLD.apply()}}
const dlInit=()=>DLD.init(),dlToggle=()=>DLD.toggle(),dlReset=()=>DLD.reset(),dlApply=(L,s)=>DLD.apply(L,s);
// ---- 매출 현황 ----
const SL_DEF={k1:{x:0,y:0,w:3,h:3},k2:{x:3,y:0,w:2,h:3},k3:{x:5,y:0,w:2,h:3},k4:{x:7,y:0,w:2,h:3},k5:{x:9,y:0,w:3,h:3},year:{x:0,y:3,w:12,h:9},mon:{x:0,y:12,w:12,h:12},client:{x:0,y:24,w:12,h:12}};
const SLD=dlMake({grid:'slgrid',page:'p_sales',edit:'sledit',DEF:SL_DEF,onSave:()=>save()});
function sllLoad(r){SLD.load(r&&!Array.isArray(r)?r.salesLayout:null)}
const sllPayload=()=>({salesLayout:SLD.L});
function sllImport(r){if(r&&!Array.isArray(r)&&r.salesLayout){sllLoad(r);SLD.apply()}}
