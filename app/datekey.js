// 날짜 입력 보조: 모든 <input type=date>에서 숫자 8자리(YYYYMMDD) 또는 6자리(YYMMDD)+Enter로 입력
(function(){
  const bufs=new WeakMap();let tip=null,tipFor=null,hideT=null;
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
    if(e.key==='Tab'){e.preventDefault();e.stopPropagation();bufs.delete(el);hide();advance(el,e.shiftKey?-1:1,false);return;}
    if(/^[0-9]$/.test(e.key)){e.preventDefault();e.stopPropagation();b+=e.key;
      if(b.length>=8){commit(el,b.slice(0,8));return;}bufs.set(el,b);show(el,fmt(b));return;}
    if(!b)return;
    if(e.key==='Backspace'){e.preventDefault();e.stopPropagation();b=b.slice(0,-1);if(b){bufs.set(el,b);show(el,fmt(b));}else{bufs.delete(el);hide();}return;}
    if(e.key==='Escape'){e.preventDefault();bufs.delete(el);hide();return;}
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(b.length===6)commit(el,'20'+b);else{bufs.delete(el);flashErr(el,'8자리(YYYYMMDD)로 입력');}return;}
    bufs.delete(el);hide();// 다른 키(화살표, Tab 등)는 원래대로
  },true);
  document.addEventListener('blur',e=>{const el=e.target;if(isDate(el)&&bufs.has(el)){bufs.delete(el);if(tipFor===el)hide();}},true);
  document.addEventListener('paste',e=>{const el=e.target;if(!isDate(el))return;
    const d=parseText(e.clipboardData&&e.clipboardData.getData('text'));e.preventDefault();
    if(d)commit(el,d);else flashErr(el,'붙여넣기 형식 오류');},true);
  window.addEventListener('scroll',()=>{if(tipFor)hide();},true);
  window.__datekey={parseText};
})();
