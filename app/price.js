// ===== 단가 관리 (data.prices / data.priceSettings) — 단가 계산 / 단가 목록 / 설정 / 엑셀 가져오기 =====
// 계산 (YD당, 원): 생지(USD면 ×환율) → 염색누계=생지×(1+염색축)+염색단가 → 가공1누계 → 가공2누계 → NET=가공2누계+기타+TRANS
// NET/M=NET/0.9144, 마진액=NET×마진율, OFFER=NET+마진액, OFFER+VAT=OFFER×(1+VAT). 축이 비어 있고 그 공정 단가>0이면 설정의 기본 축.
let prices=[],prSet={},prTab='calc',prSel='';
const PR_DEF={fx:1400,yd2m:0.9144,vat:0.1,dye:0,g1:0,g2:0,margin:0.2};
const prNum=v=>{if(v==null)return null;const s=String(v).replace(/[,\s₩$원]/g,'');if(s==='')return null;const n=+s;return isFinite(n)?n:null};
const prW=n=>Math.round(+n||0).toLocaleString('ko-KR'),prPct=v=>v==null?'':+(v*100).toFixed(4)+'%';
function prNorm(x){const n=k=>{const v=prNum(x[k]);return v==null?0:v},nn=k=>prNum(x[k]),s=k=>String(x[k]??'').trim();
 return {id:String(x.id||uid()),cat:s('cat'),part:s('part'),code:s('code'),item:s('item'),color:s('color'),width:s('width'),
  gV:s('gV'),gCur:x.gCur==='USD'?'USD':'KRW',g:n('g'),dV:s('dV'),dS:nn('dS'),d:n('d'),p1V:s('p1V'),p1D:s('p1D'),p1S:nn('p1S'),p1:n('p1'),
  p2V:s('p2V'),p2D:s('p2D'),p2S:nn('p2S'),p2:n('p2'),eD:s('eD'),e:n('e'),t:n('t'),m:nn('m'),memo:s('memo'),example:!!x.example,src:x.src==='xl'?'xl':''}}
function prLoad(r){const o=r&&!Array.isArray(r)?r:{};prices=(Array.isArray(o.prices)?o.prices:[]).filter(x=>x&&typeof x==='object').map(prNorm);
 const s=o.priceSettings&&typeof o.priceSettings==='object'?o.priceSettings:{};prSet={};for(const k in PR_DEF){const v=prNum(s[k]);prSet[k]=v==null?PR_DEF[k]:v}if(!(prSet.yd2m>0))prSet.yd2m=PR_DEF.yd2m}
const prPayload=()=>({prices,priceSettings:prSet});
function prImport(r){if(r&&!Array.isArray(r)&&(Array.isArray(r.prices)||r.priceSettings))prLoad(r)}
function prCalc(p,S=prSet){const ax=(v,pr,def)=>v!=null?v:(pr>0?def:0),g=p.gCur==='USD'?p.g*S.fx:p.g;
 const dS=ax(p.dS,p.d,S.dye),s1=ax(p.p1S,p.p1,S.g1),s2=ax(p.p2S,p.p2,S.g2),m=p.m!=null?p.m:S.margin,y=S.yd2m||PR_DEF.yd2m;
 const c1=g*(1+dS)+p.d,c2=c1*(1+s1)+p.p1,c3=c2*(1+s2)+p.p2,net=c3+p.e+p.t,mg=net*m,off=net+mg;
 return {g,c1,c2,c3,dS,s1,s2,m,net,netM:net/y,mg,mgM:mg/y,off,offM:off/y,offV:off*(1+S.vat),offVM:off/y*(1+S.vat)}}
const prLabel=p=>[p.item||p.code||'(이름 없음)',p.color,p.part].filter(Boolean).join(' · ');
function prRoute(p){const a=[];if(p.gV||p.g)a.push('생지 '+(p.gV||'-'));if(p.dV||p.d)a.push('염색 '+(p.dV||'-'));
 if(p.p1V||p.p1||p.p1D)a.push('가공1 '+(p.p1V||'-')+(p.p1D?` (${p.p1D})`:''));if(p.p2V||p.p2||p.p2D)a.push('가공2 '+(p.p2V||'-')+(p.p2D?` (${p.p2D})`:''));
 if(p.e||p.eD)a.push('기타 '+(p.eD||prW(p.e)));if(p.t)a.push('운임 '+prW(p.t));return a.join(' → ')}
function prSetTab(t){prTab=t;render()}
function renderPrice(){document.querySelectorAll('#p_price .tab').forEach(e=>e.classList.toggle('on',e.dataset.t===prTab));['calc','list','set'].forEach(t=>$('pr_'+t).style.display=prTab===t?'':'none');
 if(prTab==='calc')prCalcView();else if(prTab==='list')prList();else prSetView()}
// ---- 단가 계산 ----
const PC_F=[['g','생지 단가 (/YD)'],['d','염색 단가'],['dS','염색 축 (%)','dye'],['p1','가공1 단가'],['p1S','가공1 축 (%)','g1'],['p2','가공2 단가'],['p2S','가공2 축 (%)','g2'],['e','기타부대비용'],['t','TRANS (운임)'],['m','마진율 (%)','margin']];
const prIsPct=k=>/S$|^m$/.test(k);
function prCalcView(){const box=$('pr_calc');if(!box.dataset.b){box.dataset.b=1;
 box.innerHTML=`<div class="card prtop"><b>품목 선택</b><input id="pc_pick" list="pc_dl" placeholder="품목·ITEM·CODE 검색 — 비워 두면 계산기로 사용" oninput="prPick(this.value)" autocomplete="off"><datalist id="pc_dl"></datalist><button onclick="prReset()">초기화</button><button class="p" id="pc_save" onclick="prCalcSave()">목록에 저장</button></div>
 <div class="prg"><div class="card"><h2>입력 <span class="muted" id="pc_mode" style="font-weight:normal;font-size:12px"></span></h2><div class="pcf">
 <label>생지 통화<select id="pc_gCur" onchange="prRecalc()"><option>KRW</option><option>USD</option></select></label>
 ${PC_F.map(([k,l,d])=>`<label>${l}<input id="pc_${k}" class="num" inputmode="decimal" oninput="prRecalc()" ${d?`data-def="${d}"`:''}></label>`).join('')}</div>
 <p class="muted" style="font-size:12px;margin:8px 0 0">축·마진율을 비워 두면 [설정]의 기본값을 써요 (축은 그 공정 단가가 있을 때만). 숫자를 바꾸면 그 자리에서 다시 계산돼요.</p></div>
 <div><div class="prres" id="pc_res"></div><div class="card" style="margin-top:12px"><div style="font-size:13px"><b>공정 경로</b> <span id="pc_route" class="muted"></span></div><div class="muted" id="pc_info" style="font-size:12px;margin-top:6px"></div></div></div></div>`}
 const h=prices.map(p=>`<option value="${esc(prLabel(p))}">${esc([p.cat,p.code].filter(Boolean).join(' · '))}</option>`).join('');const dl=$('pc_dl');if(dl.dataset.h!==h){dl.innerHTML=h;dl.dataset.h=h}
 PC_F.forEach(([k,,d])=>{if(d)$('pc_'+k).placeholder='기본 '+prPct(prSet[d])});prRecalc()}
function prFill(p){$('pc_gCur').value=p.gCur||'KRW';PC_F.forEach(([k])=>{const v=p[k];$('pc_'+k).value=v==null?'':prIsPct(k)?+(v*100).toFixed(4):v?String(+(+v).toFixed(4)):''})}
function prInputs(){const o={gCur:$('pc_gCur').value};PC_F.forEach(([k])=>{const v=prNum($('pc_'+k).value);o[k]=prIsPct(k)?(v==null?null:v/100):(v||0)});return o}
function prPick(v){const p=prices.find(x=>prLabel(x)===v);if(!p){if(!v&&prSel){prSel='';prRecalc()}return}prSel=p.id;prFill(p);prRecalc()}
function prReset(){prSel='';$('pc_pick').value='';prFill({gCur:'KRW'});prRecalc()}
function prRecalc(){const sel=prices.find(x=>x.id===prSel),inp=prInputs(),p={...(sel||{}),...inp},r=prCalc(p);
 const dirty=sel&&['gCur',...PC_F.map(f=>f[0])].some(k=>(sel[k]??null)!==(inp[k]??null));
 $('pc_mode').textContent=sel?(dirty?'· 선택 품목에서 바꾼 값으로 계산 중 (저장 전에는 목록에 반영 안 됨)':'· 선택 품목 값'):'· 계산기 (품목 미선택)';
 $('pc_save').textContent=sel?(dirty?'목록에 저장 ●':'목록에 저장'):'새 품목으로 저장';
 const c=(t,v,s,cls='')=>`<div class="card dbk ${cls}"><div class="muted">${t}</div><b>${prW(v)}<small style="font-size:13px"> 원</small></b><small class="muted">${s}</small></div>`;
 $('pc_res').innerHTML=c('NET /YD',r.net,'원가 합계','pro')+c('NET /M',r.netM,'원가 합계 ÷ '+prSet.yd2m)+c('마진액 /YD',r.mg,'마진율 '+prPct(r.m))+c('마진액 /M',r.mgM,'마진율 '+prPct(r.m))+c('OFFER /YD',r.off,'마진 포함','pro')+c('OFFER /M',r.offM,'마진 포함')+c('OFFER+VAT /YD',r.offV,'VAT '+prPct(prSet.vat))+c('OFFER+VAT /M',r.offVM,'VAT '+prPct(prSet.vat))+
  `<div class="card prchain"><div class="muted" style="margin-bottom:4px">계산 체인 (YD당)</div>생지 ${prW(r.g)}${p.gCur==='USD'?` <small class="muted">($${+(+p.g).toFixed(4)}×${prW(prSet.fx)})</small>`:''} → 염색 ${prW(r.c1)} <small class="muted">(축 ${prPct(r.dS)})</small> → 가공1 ${prW(r.c2)} <small class="muted">(축 ${prPct(r.s1)})</small> → 가공2 ${prW(r.c3)} <small class="muted">(축 ${prPct(r.s2)})</small> → +기타·운임 ${prW(p.e+p.t)}</div>`;
 $('pc_route').textContent=sel?(prRoute(sel)||'-')+(sel.width?` · 폭 ${sel.width}`:''):'(품목을 고르면 공장·가공소 경로가 나와요)';
 $('pc_info').textContent=`환율 ₩${prW(prSet.fx)}/USD  │  1YD = ${prSet.yd2m}m  │  VAT ${prPct(prSet.vat)}`}
async function prCalcSave(){const inp=prInputs(),sel=prices.find(x=>x.id===prSel);
 if(!sel){prOpen('',inp);return}
 if(!await uiConfirm(`"${prLabel(sel)}"의 단가·축·마진율을 지금 입력한 값으로 바꿀까요?`))return;Object.assign(sel,prNorm({...sel,...inp}));save();toast('목록에 저장했습니다');prRecalc()}
// ---- 단가 목록 ----
const PR_SK=[['cat','품목'],['item','ITEM'],['code','CODE']];
function prSortGet(){const s=listSort.price;return s&&PR_SK.some(k=>k[0]===s.k)?{k:s.k,d:s.d===-1?-1:1}:{k:'cat',d:1}}
function prSortPick(v){const [k,d]=v.split(':');listSort.price={k,d:+d};save();render()}
function prRows(){const q=$('pr_k').value.trim().toLowerCase(),c=$('pr_cat').value,s=prSortGet(),ord=[s.k,...PR_SK.map(x=>x[0]).filter(k=>k!==s.k)];
 return prices.filter(p=>(!c||p.cat===c)&&(!q||[p.cat,p.part,p.code,p.item,p.color,p.width,p.gV,p.dV,p.p1V,p.p1D,p.p2V,p.p2D,p.eD,p.memo].join(' ').toLowerCase().includes(q)))
  .map((p,i)=>[p,i]).sort(([a,ia],[b,ib])=>{for(let j=0;j<ord.length;j++){const k=ord[j],d=j?1:s.d,va=a[k],vb=b[k];if(!va&&!vb)continue;if(!va)return 1;if(!vb)return -1;const r=lsCmp(va,vb)*d;if(r)return r}return ia-ib}).map(x=>x[0])}
function prList(){const cs=[...new Set(prices.map(p=>p.cat).filter(Boolean))].sort(lsCmp),e=$('pr_cat'),v=e.value,h=`<option value="">전체 품목</option>`+cs.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(e.dataset.h!==h){e.innerHTML=h;e.dataset.h=h}e.value=cs.includes(v)?v:'';
 const so=$('srt_price'),sh=PR_SK.flatMap(([k,l])=>[1,-1].map(d=>`<option value="${k}:${d}">정렬: ${l} ${d===1?'↑':'↓'}</option>`)).join('');if(so.dataset.h!==sh){so.innerHTML=sh;so.dataset.h=sh}const s=prSortGet();so.value=s.k+':'+s.d;
 const L=prRows(),st=(pr,ax,v)=>pr?`${prW(pr)}${ax?` <small class="muted">${prPct(ax)}</small>`:''}${v?`<br><small class="muted">${esc(v)}</small>`:''}`:(v?`<small class="muted">${esc(v)}</small>`:'');
 $('prtb').innerHTML=L.map(p=>{const r=prCalc(p);return `<tr class="r" onclick="prOpen('${p.id}')"><td>${esc(p.cat)}${tag(p)}</td><td>${esc(p.part)}</td><td>${esc(p.code)}</td><td>${esc(p.item)}${p.src==='xl'?'<span class="xlt" title="연결된 엑셀 파일에서 온 행">엑셀</span>':''}</td><td>${esc(p.color)}</td><td>${esc(p.width)}</td>
  <td class="n">${p.g?(p.gCur==='USD'?`$${+(+p.g).toFixed(4)}<br><small class="muted">₩${prW(r.g)}</small>`:prW(p.g)):''}${p.gV?`<br><small class="muted">${esc(p.gV)}</small>`:''}</td><td class="n">${st(p.d,p.dS,p.dV)}</td><td class="n">${st(p.p1,p.p1S,p.p1V)}</td><td class="n">${st(p.p2,p.p2S,p.p2V)}</td>
  <td class="n">${p.e||p.t?prW(p.e+p.t):''}${p.memo?`<br><small class="muted" title="${esc(p.memo)}">비고</small>`:''}</td><td class="n"><b>${prW(r.net)}</b></td><td class="n"><b style="color:#2271b1">${prW(r.off)}</b></td></tr>`}).join('')||`<tr><td colspan="13" class="muted">단가 데이터가 없어요. [+ 추가]나 [엑셀 가져오기]로 넣으세요.</td></tr>`;
 $('prcnt').textContent=`${L.length}건`+(L.length!==prices.length?` / 전체 ${prices.length}건`:'')}
// ---- 편집 ----
function prOpen(id,pre){const x=id?prices.find(p=>p.id===id):prNorm({...(pre||{}),id:'x'});if(!x)return;
 const f=(k,l,a='')=>`<label>${l}<input id="pe_${k}" value="${esc(x[k]??'')}" ${a}></label>`,nf=(k,l)=>`<label>${l}<input id="pe_${k}" class="num" inputmode="decimal" value="${x[k]?+(+x[k]).toFixed(4):''}" oninput="prEdCalc()"></label>`,pf=(k,l,d)=>`<label>${l}<input id="pe_${k}" class="num" inputmode="decimal" value="${x[k]==null?'':+(x[k]*100).toFixed(4)}" placeholder="기본 ${prPct(prSet[d])}" oninput="prEdCalc()"></label>`;
 $('dt').textContent=id?'단가 수정':'단가 추가';if(!dlg.style.width){dlg.style.width='min(980px,96vw)';dlg.addEventListener('close',()=>dlg.style.width='',{once:true})}
 $('dbody').innerHTML=`<div class="pe"><div class="fsec">품목 정보</div><div class="pe6 pe6a">${f('cat','품목 (분류1)','list="pe_cl"')}${f('part','부위 (분류2)')}${f('code','CODE')}${f('color','색상')}${f('width','폭')}<span></span></div>
 <datalist id="pe_cl">${[...new Set(prices.map(p=>p.cat).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist><div style="margin-top:8px">${f('item','ITEM')}</div>
 <div class="fsec" style="margin-top:12px">공정별 공장 · 축 · 가격 (YD당)</div>
 <div class="pe6"><b>생지</b>${f('gV','생지 공장')}<label>통화<select id="pe_gCur" onchange="prEdCalc()"><option${x.gCur==='KRW'?' selected':''}>KRW</option><option${x.gCur==='USD'?' selected':''}>USD</option></select></label>${nf('g','생지 가격')}<span></span><span></span></div>
 <div class="pe6"><b>염색</b>${f('dV','염색 공장')}<span></span>${nf('d','염색 가격')}${pf('dS','염색 축 (%)','dye')}<span></span></div>
 <div class="pe6"><b>가공1</b>${f('p1V','가공소')}${f('p1D','가공내역')}${nf('p1','가공1 가격')}${pf('p1S','가공1 축 (%)','g1')}<span></span></div>
 <div class="pe6"><b>가공2</b>${f('p2V','가공소')}${f('p2D','가공내역')}${nf('p2','가공2 가격')}${pf('p2S','가공2 축 (%)','g2')}<span></span></div>
 <div class="pe6"><b>기타</b>${f('eD','기타 내용')}<span></span>${nf('e','기타 금액')}${nf('t','TRANS (운임)')}${pf('m','마진율 (%)','margin')}</div>
 <label style="margin-top:8px;display:block">비고${`<input id="pe_memo" value="${esc(x.memo)}">`}</label>
 <div id="pe_res" class="muted" style="margin-top:10px;font-size:13px"></div></div>`;
 $('dfoot').innerHTML=`${id?`<button class="d" onclick="prDel('${id}')">삭제</button><span style="flex:1"></span>`:''}<button onclick="dlg.close()">취소</button><button class="p" onclick="prSave('${id||''}')">저장</button>`;if(!dlg.open)dlg.showModal();prEdCalc()}
const PE_T=['cat','part','code','item','color','width','gV','dV','p1V','p1D','p2V','p2D','eD','memo'],PE_N=['g','d','p1','p2','e','t'],PE_P=['dS','p1S','p2S','m'];
function prEdGet(){const o={gCur:$('pe_gCur').value};PE_T.forEach(k=>o[k]=$('pe_'+k).value.trim());PE_N.forEach(k=>o[k]=prNum($('pe_'+k).value)||0);PE_P.forEach(k=>{const v=prNum($('pe_'+k).value);o[k]=v==null?null:v/100});return o}
function prEdCalc(){const r=prCalc(prNorm(prEdGet()));$('pe_res').innerHTML=`NET <b>${prW(r.net)}</b>원/YD · ${prW(r.netM)}원/M  │  OFFER <b style="color:#2271b1">${prW(r.off)}</b>원/YD · ${prW(r.offM)}원/M  │  OFFER+VAT ${prW(r.offV)}원/YD`}
function prSave(id){const o=prEdGet();if(!o.item&&!o.code)return uiAlert('ITEM이나 CODE를 입력하세요.');const n=prNorm({...o,id:id||uid()});
 const i=id?prices.findIndex(p=>p.id===id):-1;if(i>=0){n.example=prices[i].example;n.src=prices[i].src;prices[i]=n}else{prices.push(n);prSel=n.id;const pk=$('pc_pick');if(pk)pk.value=prLabel(n)}save();dlg.close();render();toast('저장했습니다')}
async function prDel(id){if(!await uiConfirm('이 단가를 삭제할까요?'))return;prices=prices.filter(p=>p.id!==id);if(prSel===id)prSel='';save();dlg.close();render();toast('삭제했습니다')}
// ---- 설정 ----
const PS_F=[['fx','환율 (₩/USD)',''],['yd2m','1야드 = ? 미터',''],['vat','VAT (%)','p'],['dye','기본 염색 축 (%)','p'],['g1','기본 가공1 축 (%)','p'],['g2','기본 가공2 축 (%)','p'],['margin','기본 마진율 PRO (%)','p']];
function prSetView(){const b=$('pr_setf');if(!b.dataset.b){b.dataset.b=1;b.innerHTML=PS_F.map(([k,l])=>`<label>${l}<input id="ps_${k}" class="num" inputmode="decimal" onchange="prSetSave('${k}',this)"></label>`).join('')}
 PS_F.forEach(([k,,p])=>{const e=$('ps_'+k);if(document.activeElement!==e)e.value=p?+(prSet[k]*100).toFixed(4):prSet[k]});
 $('pr_xl').innerHTML=xlCard('price');$('pr_setx').textContent=`현재 등록된 ${prices.length}개 품목의 NET·OFFER가 이 값으로 계산돼요. 환율을 바꾸면 USD 생지 단가가 들어간 품목이 모두 바로 다시 계산돼요.`}
function prSetSave(k,e){let v=prNum(e.value);if(v==null||v<0||(k==='yd2m'&&!v)||(k==='fx'&&!v)){uiAlert('올바른 숫자를 입력하세요.');e.value='';prSetView();return}
 if((PS_F.find(f=>f[0]===k)||[])[2])v/=100;prSet[k]=v;save();prSetView();toast('설정을 저장했어요 · 모든 단가 다시 계산')}
async function prSetReset(){if(!await uiConfirm('설정을 기본값(환율 1,400 · 0.9144m · VAT 10% · 축 0% · 마진 20%)으로 되돌릴까요?'))return;prSet={...PR_DEF};save();render()}
// ---- 엑셀 가져오기 (Price 시트 자동 인식, '=2.74*$H$1' 같은 수식은 USD 2.74로) ----
let piBook=null,piSh=0,piName='';
const PI_COLS=['cat','part','code','item','color','width','gV','g','dV','dS','d','p1V','p1D','p1S','p1','p2V','p2D','p2S','p2','eD','e','t'];
const PI_LBL={g:'생지 가격',dS:'염색 축',d:'염색 가격',p1S:'가공1 축',p1:'가공1 가격',p2S:'가공2 축',p2:'가공2 가격',e:'기타 금액',t:'TRANS'};
const piU=s=>String(s||'').toUpperCase().replace(/\s/g,'');
function piHdr(rows){let h=-1;rows.slice(0,12).forEach((r,i)=>{const n=r.map(c=>piU(c[0]));if(n.includes("CODE")&&n.includes("ITEM"))h=i});return h}
function piFx(rows){const v=prNum(rows[0]&&rows[0][7]&&rows[0][7][0]);return v>100?v:null}
function piAnalyze(){const sh=piBook[piSh],h=piHdr(sh.rows),R=sh.rows.slice(h+1),L=[];let usd=0,txt=0;
 R.forEach((r,i)=>{const c=k=>r[PI_COLS.indexOf(k)]||['',''],T=k=>String(c(k)[0]||'').trim(),o={},notes=[];
  ['cat','part','code','item','color','width','gV','dV','p1V','p1D','p2V','p2D','eD'].forEach(k=>o[k]=T(k));if(!o.item&&!o.code)return;
  ['g','d','p1','p2','e','t'].forEach(k=>{const [v,f]=c(k),m=String(f||'').replace(/^=/,'').match(/^\s*([\d.]+)\s*\*\s*\$?H\$?1\s*$|^\s*\$?H\$?1\s*\*\s*([\d.]+)\s*$/i);
   if(k==='g'&&m){o.gCur='USD';o.g=+(m[1]||m[2]);usd++;return}const n=prNum(v);if(n==null&&String(v).trim()){notes.push(`${PI_LBL[k]}: ${String(v).trim()}`);txt++}o[k]=n||0});
  ['dS','p1S','p2S'].forEach(k=>{const v=T(k),n=prNum(v.replace('%',''));if(v&&n==null){notes.push(`${PI_LBL[k]}: ${v}`);txt++;o[k]=null}else o[k]=n==null?null:(n>1||v.includes('%')?n/100:n)});
  o.memo=notes.join(' / ');const p=prNorm(o);p.rn=h+i+2;p.key=[p.item,p.color,p.part].map(piU).join('|');p.dup=prices.some(x=>[x.item,x.color,x.part].map(piU).join('|')===p.key);L.push(p)});
 return {L,usd,txt,h,fx:piFx(sh.rows)}}
async function prImportOpen(){if(!A.priceImportPick)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');let r;try{r=await A.priceImportPick()}catch(e){return uiAlert('파일을 읽지 못했습니다: '+e)}if(!r)return;
 piBook=r.sheets.filter(s=>s.rows.length&&piHdr(s.rows)>=0);if(!piBook.length)return uiAlert('CODE·ITEM 머리글이 있는 단가 시트를 찾지 못했습니다.');piName=r.name;piSh=Math.max(0,piBook.findIndex(s=>/^price/i.test(s.name.trim())));piRender()}
function piRender(){const a=piAnalyze(),mode=(document.querySelector('input[name=pimode]:checked')||{}).value||'skip',nd=a.L.filter(p=>p.dup).length;
 $('dt').textContent='단가 엑셀 가져오기 — '+piName;if(!dlg.style.width){dlg.style.width='min(1200px,96vw)';dlg.addEventListener('close',()=>dlg.style.width='',{once:true})}
 $('dbody').innerHTML=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap"><b style="font-size:13px">시트</b><select onchange="piSh=+this.value;piRender()">${piBook.map((s,i)=>`<option value="${i}"${i===piSh?' selected':''}>${esc(s.name)}</option>`).join('')}</select><span class="muted" style="font-size:12px">머리글 ${a.h+1}행 · 칸 순서: 분류1·분류2·CODE·ITEM·COLOR·WIDTH·생지 공장·가격·염색 공장·축·가격·가공1(가공소·내역·축·가격)·가공2(…)·기타(내용·금액)·TRANS</span></div>
 <div style="margin:6px 0 10px;display:flex;gap:16px;flex-wrap:wrap;align-items:center"><b>품목 ${a.L.length}건</b><span>새 품목 <b>${a.L.length-nd}</b></span><span>이미 있는 품목 <b>${nd}</b> <small class="muted">(ITEM+색상+부위 기준)</small></span><span>USD 생지 <b>${a.usd}</b></span><span>숫자 아닌 칸 <b class="${a.txt?'neg':''}">${a.txt}</b> <small class="muted">(0으로 계산, 비고에 보관)</small></span></div>
 <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px"><span style="font-size:13px">이미 있는 품목은</span><label style="display:inline"><input type="radio" name="pimode" value="skip"${mode==='skip'?' checked':''}> 건너뛰기</label><label style="display:inline"><input type="radio" name="pimode" value="over"${mode==='over'?' checked':''}> 덮어쓰기</label>
 ${a.fx?`<label style="display:inline;margin-left:12px"><input type="checkbox" id="pi_fx"${a.fx!==prSet.fx?' checked':''}> 환율도 엑셀 값 ₩${prW(a.fx)}로 설정 <small class="muted">(현재 ₩${prW(prSet.fx)})</small></label>`:''}</div>
 <div style="max-height:46vh;overflow:auto"><table><thead><tr><th>행</th><th>품목</th><th>부위</th><th>CODE</th><th>ITEM</th><th>색상</th><th class="n">생지</th><th class="n">염색</th><th class="n">가공1</th><th class="n">가공2</th><th class="n">기타·운임</th><th class="n">NET/YD</th><th>비고</th></tr></thead><tbody>${a.L.slice(0,400).map(p=>{const r=prCalc(p,{...prSet,fx:a.fx||prSet.fx});return `<tr${p.dup?' style="background:#fffbe6"':''}><td>${p.rn}</td><td>${esc(p.cat)}</td><td>${esc(p.part)}</td><td>${esc(p.code)}</td><td>${esc(p.item)}${p.dup?' <small class="muted">(있음)</small>':''}</td><td>${esc(p.color)}</td><td class="n">${p.gCur==='USD'?'$'+p.g:prW(p.g)}</td><td class="n">${prW(p.d)}</td><td class="n">${prW(p.p1)}</td><td class="n">${prW(p.p2)}</td><td class="n">${prW(p.e+p.t)}</td><td class="n">${prW(r.net)}</td><td class="neg" style="font-size:12px">${esc(p.memo)}</td></tr>`}).join('')}</tbody></table></div>`;
 $('dfoot').innerHTML=`<span class="muted" style="font-size:12px">가져오기 전에 현재 데이터를 자동 백업해요.</span><span style="flex:1"></span><button onclick="dlg.close()">취소</button><button class="p" onclick="piRun()"${a.L.length?'':' disabled'}>가져오기</button>`;
 document.querySelectorAll('input[name=pimode]').forEach(e=>e.onchange=piRender);if(!dlg.open)dlg.showModal()}
async function piRun(){const a=piAnalyze(),over=(document.querySelector('input[name=pimode]:checked')||{}).value==='over',fx=$('pi_fx')&&$('pi_fx').checked;if(A.preImportBackup)await A.preImportBackup();
 let add=0,up=0,sk=0;a.L.forEach((x,i)=>{const {rn,key,dup,...o}=x,j=prices.findIndex(p=>[p.item,p.color,p.part].map(piU).join('|')===key);
  if(j>=0){if(over){o.id=prices[j].id;o.src=prices[j].src;prices[j]=o;up++}else sk++}else{o.id=uid()+i;prices.push(o);add++}});
 if(fx&&a.fx)prSet.fx=a.fx;save();dlg.close();prTab='list';render();toast(`가져오기 완료: 추가 ${add}건${up?` · 덮어쓰기 ${up}건`:''}${sk?` · 건너뜀 ${sk}건`:''}${fx?` · 환율 ₩${prW(a.fx)}`:''}`)}
