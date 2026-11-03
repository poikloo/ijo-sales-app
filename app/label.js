// ===== 라벨 인쇄: 폼텍 주소용 라벨 3106 (24칸) · 3105 (21칸) =====
// 규격 (폼텍 FAQ · 3106 규격표): 위 여백 12.5mm, 왼쪽 여백 6.5mm, 가로 간격(칸 왼쪽→다음 칸 왼쪽) 66.5mm, 세로 간격 34mm
// 3105 (폼텍 LS-3105 규격표): 위 15.8mm, 왼쪽 7mm, 가로 간격 66mm, 세로 간격 38.1mm, 63.5×38.1mm 3열×7행 = 21칸
const LBS={'3106':{w:64,h:34,cols:3,rows:8,top:12.5,left:6.5,px:66.5,py:34},'3105':{w:63.5,h:38.1,cols:3,rows:7,top:15.8,left:7,px:66,py:38.1}};
const LBK=['3106','3105'];
let lbSheet=LBS[localStorage.getItem('ijo_lbl_sheet')]?localStorage.getItem('ijo_lbl_sheet'):'3106',LB=LBS[lbSheet],LB_N=LB.cols*LB.rows;
function lbUse(k){if(!LBS[k])return;lbSheet=k;LB=LBS[k];LB_N=LB.cols*LB.rows;localStorage.setItem('ijo_lbl_sheet',k);if(lbStart>LB_N)lbStart=1}
const LB_FF="'Malgun Gothic','맑은 고딕','Noto Sans CJK KR','Noto Sans KR',sans-serif";
// 보정값: 용지별 {3106:{x,y},3105:{x,y}} (예전 {x,y}는 3106으로)
const lbOffAll=()=>{try{const o=JSON.parse(localStorage.getItem('ijo_lbl_off')||'{}');return ('x' in o||'y' in o)?{'3106':o}:o}catch(e){return {}}};
const lbOff=(k=lbSheet)=>{const o=lbOffAll()[k]||{};return {x:+o.x||0,y:+o.y||0}};
let lbRows=[],lbStart=1;
// 긴 글자는 칸 폭에 맞게 줄임 (mm 단위 글자 크기)
let lbCtx=null;
function lbFs(t,max=5.2,min=2.2,wmm=LB.w-6){t=String(t||'');if(!t)return max;lbCtx=lbCtx||document.createElement('canvas').getContext('2d');lbCtx.font=`bold 100px ${LB_FF}`;const w=lbCtx.measureText(t).width/100;return Math.max(min,Math.min(max,wmm/(w||1)))}
function lbLabels(){const out=[];lbRows.forEach(r=>{const n=Math.max(0,Math.min(999,parseInt(r.qty)||0));if(!(r.name||r.color||r.spec))return;for(let i=0;i<n;i++)out.push(r)});return out}
function lbCellHTML(r){const ln=[r.name,r.color,r.spec].map(s=>String(s||'').trim());
 return ln.map(s=>{if(!s)return '';const f=lbFs(s);return f>=3?`<div style="font-size:${f.toFixed(2)}mm;line-height:1.25;white-space:nowrap">${esc(s)}</div>`:`<div style="font-size:${Math.max(2.4,lbFs(s,5.2,2.4,(LB.w-6)*1.6)).toFixed(2)}mm;line-height:1.2;word-break:keep-all;overflow-wrap:anywhere">${esc(s)}</div>`}).join('')}
// 아주 긴 글자는 두 줄까지 줄바꿈
// 페이지 HTML (인쇄·PDF·미리보기 공통). guide=칸 윤곽선 (미리보기 전용)
function lbPagesHTML(guide){const L=lbLabels(),o=lbOff();let slot;
 let pages=[[]];slot=lbStart-1;L.forEach(r=>{if(slot>=LB_N){pages.push([]);slot=0}pages[pages.length-1].push([slot++,r])});
 return pages.map((pg,pi)=>{let h='';for(let s=0;s<LB_N;s++){const it=pg.find(x=>x[0]===s),c=s%LB.cols,rw=Math.floor(s/LB.cols);
  const used=pi===0&&s<lbStart-1;if(!it&&!guide)continue;
  h+=`<div style="position:absolute;box-sizing:border-box;left:${LB.left+o.x+c*LB.px}mm;top:${LB.top+o.y+rw*LB.py}mm;width:${LB.w}mm;height:${LB.h}mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-weight:bold;overflow:hidden;padding:0 3mm;${guide?`border:0.3mm dashed ${used?'#ddd':'#bbb'};border-radius:1mm;${used?'background:#f1f1f1;':''}`:''}">${it?lbCellHTML(it[1]):''}</div>`}
  return `<div class="lbpg" style="position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff;font-family:${LB_FF};color:#000;page-break-after:always;break-after:page">${h}</div>`}).join('')}
function lbDoc(){return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}html,body{margin:0;padding:0}.lbpg:last-child{page-break-after:auto;break-after:auto}</style></head><body>${lbPagesHTML(false)}</body></html>`}
// ---- 창 ----
function lbOpen(fromOrders){lbRows=[];lbStart=1;
 if(fromOrders){const ids=[...lbSel];
  orders.filter(o=>ids.includes(o.id)).forEach(o=>(o.lines.length?o.lines:[{color:''}]).forEach(l=>lbRows.push({name:o.item||'',color:l.color||'',spec:o.fabric||'',qty:1})))}
 if(!lbRows.length)lbRows.push({name:'',color:'',spec:'',qty:1});
 $('dt').textContent='라벨 인쇄';
 $('dbody').innerHTML=`<div class="lbw"><div class="lbl"><table class="lbt"><thead><tr><th>품명</th><th>색상</th><th>규격</th><th style="width:52px">수량</th><th style="width:28px"></th></tr></thead><tbody id="lb_tb"></tbody></table>
 <button onclick="lbRows.push({name:'',color:'',spec:'',qty:1});lbRender(true)">＋ 행</button>
 <div class="lbsh"><label style="font-size:12px;display:block;margin:10px 0 0">용지 <select id="lb_sheet" onchange="lbUse(this.value);lbRender(false)">${LBK.map(k=>`<option value="${k}"${k===lbSheet?' selected':''}>폼텍 ${k} (${LBS[k].cols*LBS[k].rows}칸 ${LBS[k].w}×${LBS[k].h}mm)</option>`).join('')}</select></label><div style="font-size:12px;margin:8px 0 4px">시작 칸 <b id="lb_sn"></b></div><div class="lbgrid" id="lb_grid"></div></div></div>
 <div class="lbr"><div id="lb_info" class="muted" style="font-size:12px;margin-bottom:4px"></div><div id="lb_pv" class="lbpv"></div></div></div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="lbPrint()">인쇄</button><button onclick="lbPDF()">PDF 저장</button><span style="flex:1"></span><button onclick="dlg.close()">취소</button>`;
 dlg.classList.add('lbdlg');dlg.addEventListener('close',()=>dlg.classList.remove('lbdlg'),{once:true});
 lbRender(true);if(!dlg.open)dlg.showModal()}
function lbSet(i,k,v){if(!lbRows[i])return;lbRows[i][k]=v;lbRender(false)}
function lbRender(rows){if(rows){$('lb_tb').innerHTML=lbRows.map((r,i)=>`<tr>${['name','color','spec'].map(k=>`<td><input value="${esc(r[k])}" oninput="lbSet(${i},'${k}',this.value)"></td>`).join('')}<td><input class="num" type="number" min="0" max="999" value="${r.qty}" oninput="lbSet(${i},'qty',this.value)"></td><td><button title="삭제" onclick="lbRows.splice(${i},1);if(!lbRows.length)lbRows.push({name:'',color:'',spec:'',qty:1});lbRender(true)">✕</button></td></tr>`).join('')}
 let g='';for(let s=1;s<=LB_N;s++)g+=`<button class="${s<lbStart?'u':s===lbStart?'on':''}" onclick="lbStart=${s};lbRender(false)" title="${s}">${s}</button>`;$('lb_grid').innerHTML=g;$('lb_sn').textContent=lbStart;
 const n=lbLabels().length,pages=n?Math.ceil((n+lbStart-1)/LB_N):0;$('lb_info').textContent=n?`라벨 ${n}장 · 용지 ${pages}장`:'';
 $('lb_pv').innerHTML=`<div class="lbsc">${lbPagesHTML(true)}</div>`}
async function lbPrint(){if(!lbLabels().length)return toast('내용을 입력해 주세요');if(!A.labelPrint)return uiAlert('데스크톱 앱에서만 사용할 수 있어요.');const r=await A.labelPrint(lbDoc());if(r&&r!==true&&r!=='cancelled')uiAlert('인쇄 실패: '+r)}
async function lbPDF(){if(!lbLabels().length)return toast('내용을 입력해 주세요');if(!A.labelPDF)return uiAlert('데스크톱 앱에서만 사용할 수 있어요.');const p=await A.labelPDF(lbDoc(),`라벨_${stamp()}.pdf`);if(p)toast('PDF로 저장했어요')}
// ---- 생산 관리 목록: 선택 칸 ----
// 선택은 오더 id로 보관 (상세 보기·검색·저장 후에도 유지, 직접 해제할 때만 지움)
const lbSel=new Set();
function lbSelCount(){[...lbSel].forEach(id=>{if(!orders.some(o=>o.id===id))lbSel.delete(id)});const n=lbSel.size,b=$('lb_btn');if(b)b.textContent=n?`라벨 인쇄 (${n})`:'라벨 인쇄';
 const all=document.querySelector('#lb_all'),v=[...document.querySelectorAll('#ptb input.lbck')];if(all){const k=v.filter(c=>c.checked).length;all.checked=!!v.length&&k===v.length;all.indeterminate=k>0&&k<v.length}}
function lbTick(id,on){on?lbSel.add(id):lbSel.delete(id);lbSelCount()}
function lbAll(on){document.querySelectorAll('#ptb input.lbck').forEach(c=>{c.checked=on;on?lbSel.add(c.value):lbSel.delete(c.value)});lbSelCount()}
function lbCk(id){return `<td class="lbcc" onclick="event.stopPropagation()"><input type="checkbox" class="lbck" value="${id}"${lbSel.has(id)?' checked':''} aria-label="라벨 선택" onchange="lbTick(this.value,this.checked)"></td>`}
// ---- 설정: 인쇄 위치 보정 ----
function lbSetCard(){const el=$('lb_card');if(!el)return;
 el.innerHTML=`<h2>라벨 인쇄 위치 보정 <span class="muted" style="font-weight:normal">(이 PC에만 저장)</span></h2>${LBK.map(k=>{const o=lbOff(k);return `<div style="margin:4px 0"><b style="display:inline-block;width:90px">폼텍 ${k}</b><label style="display:inline-block;margin-right:12px">위 (mm) <input id="lb_oy_${k}" type="number" step="0.5" value="${o.y}" style="width:80px" onchange="lbSaveOff()"></label><label style="display:inline-block">왼쪽 (mm) <input id="lb_ox_${k}" type="number" step="0.5" value="${o.x}" style="width:80px" onchange="lbSaveOff()"></label></div>`}).join('')}`}
function lbSaveOff(){const o={};LBK.forEach(k=>o[k]={x:+$('lb_ox_'+k).value||0,y:+$('lb_oy_'+k).value||0});localStorage.setItem('ijo_lbl_off',JSON.stringify(o));toast('저장했어요')}
window.addEventListener("load",()=>lbSetCard());
window.addEventListener('load',()=>{const f=window.renderProd;if(typeof f==='function')window.renderProd=function(){const r=f.apply(this,arguments);lbSelCount();return r}});
