// 날짜 입력 보조: 모든 <input type=date>에서 숫자 8자리(YYYYMMDD) 또는 6자리(YYMMDD)+Enter로 입력
// '월'·'일' 칸을 클릭하고 숫자를 치면 그 칸만 고침(브라우저 기본 동작). 칸 위치를 알 수 있도록 칸·구분자 폭을 CSS로 고정
(function(){
  const bufs=new WeakMap(),segs=new WeakMap(),sess=new WeakMap();let tip=null,tipFor=null,hideT=null,emitting=false,downSeg=null;
  // 칸 너비 고정: 년 4ch, 월·일 2ch, 구분자 .5em (Windows '2026-04-16' / 다른 로캘 '2026. 04. 16.' 모두 같은 위치 계산)
  const st=document.createElement('style');st.id='datekey-css';
  st.textContent='input[type=date]::-webkit-datetime-edit,input[type=date]::-webkit-datetime-edit-fields-wrapper{padding-left:0;padding-right:0}'+
   'input[type=date]::-webkit-datetime-edit-year-field,input[type=date]::-webkit-datetime-edit-month-field,input[type=date]::-webkit-datetime-edit-day-field{display:inline-block;padding:0 1px;margin:0;text-align:center}'+
   'input[type=date]::-webkit-datetime-edit-year-field{min-width:4ch}input[type=date]::-webkit-datetime-edit-month-field,input[type=date]::-webkit-datetime-edit-day-field{min-width:2ch}'+
   'input[type=date]::-webkit-datetime-edit-text{display:inline-block;width:.5em;padding:0;margin:0;overflow:hidden;white-space:pre;text-align:center}';
  (document.head||document.documentElement).appendChild(st);
  let cv=null;
  // 클릭한 x 위치 → 0:년 1:월 2:일 (값이 비어 있거나 칸 밖이면 null)
  function segAt(el,x){if(!el.value)return null;const cs=getComputedStyle(el),r=el.getBoundingClientRect();
    cv=cv||document.createElement('canvas').getContext('2d');cv.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const fs=parseFloat(cs.fontSize)||13,ch=cv.measureText('0').width,w=t=>Math.max(cv.measureText(t).width,t.length*ch)+2,[Y,M,D]=el.value.split('-'),sp=.5*fs;
    let p=x-(r.left+parseFloat(cs.borderLeftWidth)+parseFloat(cs.paddingLeft)-el.scrollLeft)+1;const wy=w(Y),wm=w(M),wd=w(D);
    // 칸 사이 구분자·칸 밖을 누르면 브라우저는 '년'을 선택하므로 0
    if(p<wy)return 0;p-=wy+sp;if(p>=0&&p<wm)return 1;p-=wm+sp;if(p>=0&&p<wd)return 2;return p>=wd+fs*1.2?null:0;}
  // 월·일 칸 편집 중에는 화면이 다시 그려지지 않도록 브라우저의 input/change를 잠시 막고, 다 끝나면 한 번만 보냄
  const isY=s=>/^\d{4}-\d{2}-\d{2}$/.test(s);
  function emit(el){emitting=true;try{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}finally{emitting=false}}
  function endSess(el,how){const S=sess.get(el);if(!S)return null;sess.delete(el);
    if(how==='cancel'||!isY(el.value)){const bad=!isY(el.value)&&how!=='cancel';if(el.value!==S.prev)el.value=S.prev;if(bad)flashErr(el,'잘못된 날짜 — 원래 값 유지');return false}
    if(el.value===S.prev)return true;
    if(el.min&&el.value<el.min||el.max&&el.value>el.max){el.value=S.prev;flashErr(el,'범위 밖 날짜');return false}
    return 'changed';}
  ['input','change'].forEach(t=>document.addEventListener(t,e=>{if(!emitting&&sess.has(e.target))e.stopImmediatePropagation()},true));
  document.addEventListener('mousedown',e=>{const el=e.target;if(!isDate(el)||e.button!==0)return;const r=endSess(el,'flush');if(r==='changed')emit(el);
    const s=segAt(el,e.clientX);downSeg=s;setTimeout(()=>{downSeg=null},0);if(s!==null)segs.set(el,s);if(bufs.has(el)){bufs.delete(el);hide()}},true);
  document.addEventListener('focus',e=>{const el=e.target;if(!isDate(el))return;segs.set(el,downSeg!==null?downSeg:0);downSeg=null},true);
  const isDate=el=>el&&el.tagName==='INPUT'&&el.type==='date'&&!el.disabled&&!el.readOnly;
  function ensureTip(){if(tip)return tip;tip=document.createElement('div');tip.id='datekey-tip';
    tip.style.cssText='position:fixed;z-index:99999;padding:3px 8px;border-radius:5px;font:600 13px Consolas,monospace;background:#1f2937;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;display:none;letter-spacing:1px';
    document.body.appendChild(tip);return tip;}
  function fmt(b){const s=(b+'________').slice(0,8);return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);}
  function show(el,text,err){const t=ensureTip();const r=el.getBoundingClientRect();
    t.textContent=text;t.style.background=err?'#dc2626':'#1f2937';t.style.display='block';
    t.style.left=Math.max(2,r.left)+'px';t.style.top=(r.bottom+3+24>innerHeight?r.top-26:r.bottom+3)+'px';tipFor=el;clearTimeout(hideT);}
  function hide(){if(tip)tip.style.display='none';tipFor=null;}
  function flashErr(el,msg){show(el,msg||'잘못된 날짜',true);hideT=setTimeout(hide,1300);}
  function valid(y,m,d){const dt=new Date(y,m-1,d);return y>=1900&&y<=2999&&dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;}
  const FSEL='input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';
  function focusables(){return [...document.querySelectorAll(FSEL)].filter(x=>x.tabIndex>=0&&x.offsetParent!==null&&!x.closest('[inert]')&&(!x.closest('dialog')||x.closest('dialog').open));}
  // 다음/이전 칸으로 이동 (날짜 칸 옆의 달력·버튼은 건너뛰고 입력칸 우선). change로 화면이 다시 그려져도 같은 위치 칸을 찾아 이동
  function move(el,dir,inputsOnly){let L=focusables();const scope=el.closest('dialog[open]');if(scope)L=L.filter(x=>scope.contains(x));const i=L.indexOf(el);
    const ok=x=>!inputsOnly||(x.matches('input,select,textarea')&&x!==el);
    let t=null;for(let j=i+dir;j>=0&&j<L.length;j+=dir)if(ok(L[j])){t=L[j];break}return {t,i,n:inputsOnly?L.slice(i+1).findIndex(ok)+1:dir};}
  function go(t){if(!t)return;t.focus();if(t.select&&t.tagName==='INPUT'&&t.type!=='date')try{t.select()}catch(e){}}
  function advance(el,dir,inputsOnly,fire){const m=move(el,dir,inputsOnly),i=m.i;if(fire)fire();
    if(m.t&&m.t.isConnected&&el.isConnected){go(m.t);return}
    setTimeout(()=>{let t=m.t&&m.t.isConnected?m.t:null;if(!t&&i>=0){let L=focusables();t=L[i+m.n]||null}go(t)},0);}
  function commit(el,digits){
    const y=+digits.slice(0,4),m=+digits.slice(4,6),d=+digits.slice(6,8);bufs.delete(el);
    if(!valid(y,m,d)){flashErr(el,fmt(digits)+' ✕');return false;}
    const v=digits.slice(0,4)+'-'+digits.slice(4,6)+'-'+digits.slice(6,8);
    if(el.min&&v<el.min||el.max&&v>el.max){flashErr(el,'범위 밖 날짜');return false;}
    el.value=v;show(el,v+' ✓');hideT=setTimeout(hide,700);
    advance(el,1,true,()=>{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});return true;}
  function parseText(s){s=String(s||'').trim();let m=s.match(/^(\d{4})\D?(\d{1,2})\D?(\d{1,2})\.?$/);
    if(m&&(s.length===8||/\D/.test(s)))return m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0');
    m=s.match(/^(\d{2})\D?(\d{2})\D?(\d{2})$/);if(m)return '20'+m[1]+m[2]+m[3];return null;}
  document.addEventListener('keydown',e=>{const el=e.target;if(!isDate(el)||e.ctrlKey||e.altKey||e.metaKey)return;
    let b=bufs.get(el)||'';
    if(e.key==='Tab'){e.preventDefault();e.stopPropagation();bufs.delete(el);hide();const r=endSess(el,'flush');advance(el,e.shiftKey?-1:1,false,r==='changed'?()=>emit(el):null);return;}
    const seg=segs.get(el)||0;
    if(!b&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){segs.set(el,Math.max(0,Math.min(2,seg+(e.key==='ArrowLeft'?-1:1))));const S=sess.get(el);if(S)S.n=0;return;}
    if(!b&&/^[0-9]$/.test(e.key)&&(el.value||sess.has(el))&&seg>0){// 월·일 칸만 고치기: 숫자는 브라우저가 처리, 끝났는지만 따라감
      let S=sess.get(el);if(!S){S={prev:el.value,n:0,f:0};sess.set(el,S)}hide();
      S.n++;if(S.n===1)S.f=+e.key;const done=S.n>=2||S.f>(seg===1?1:3);
      if(done&&seg===1){segs.set(el,2);S.n=0;return}
      if(done)setTimeout(()=>{const r=endSess(el,'flush');if(r===false)return;if(r==='changed'){show(el,el.value+' ✓');hideT=setTimeout(hide,700)}advance(el,1,true,r==='changed'?()=>emit(el):null)},0);
      return;}
    if(!b&&(e.key==='ArrowUp'||e.key==='ArrowDown')&&isY(el.value)&&!sess.has(el)){// ↑↓: 그 칸만 ±1 (월말은 맞춰 줄임: 09-30 ↑ → 09-01, 01-31 월↑ → 02-28)
      e.preventDefault();e.stopPropagation();const k=e.key==='ArrowUp'?1:-1;let [y,m,d]=el.value.split('-').map(Number);const dim=(y,m)=>new Date(y,m,0).getDate();
      if(seg===0)y=Math.min(2999,Math.max(1900,y+k));else if(seg===1)m=(m+k+11)%12+1;else d=(d-1+k+dim(y,m))%dim(y,m)+1;d=Math.min(d,dim(y,m));
      const v=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');if(el.min&&v<el.min||el.max&&v>el.max)return;el.value=v;emit(el);return;}
    if(sess.has(el)){if(e.key==='Escape'){e.preventDefault();endSess(el,'cancel');return}const r=endSess(el,'flush');if(r==='changed')emit(el);}
    if(/^[0-9]$/.test(e.key)){e.preventDefault();e.stopPropagation();b+=e.key;
      if(b.length>=8){commit(el,b.slice(0,8));return;}bufs.set(el,b);show(el,fmt(b));return;}
    if(!b)return;
    if(e.key==='Backspace'){e.preventDefault();e.stopPropagation();b=b.slice(0,-1);if(b){bufs.set(el,b);show(el,fmt(b));}else{bufs.delete(el);hide();}return;}
    if(e.key==='Escape'){e.preventDefault();bufs.delete(el);hide();return;}
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(b.length===6)commit(el,'20'+b);else{bufs.delete(el);flashErr(el,'8자리(YYYYMMDD)로 입력');}return;}
    bufs.delete(el);hide();// 다른 키(화살표, Tab 등)는 원래대로
  },true);
  document.addEventListener('blur',e=>{const el=e.target;if(!isDate(el))return;if(bufs.has(el)){bufs.delete(el);if(tipFor===el)hide();}const r=endSess(el,'flush');if(r==='changed')emit(el);},true);
  document.addEventListener('paste',e=>{const el=e.target;if(!isDate(el))return;
    const d=parseText(e.clipboardData&&e.clipboardData.getData('text'));e.preventDefault();
    if(d)commit(el,d);else flashErr(el,'붙여넣기 형식 오류');},true);
  window.addEventListener('scroll',()=>{if(tipFor)hide();},true);
  window.__datekey={parseText,segAt};
})();
