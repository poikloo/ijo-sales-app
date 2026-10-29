// ===== 작업의뢰서 (전산 PDF·이미지 보관) =====
// 첨부 공통: PDF + 이미지(JPG·PNG·WEBP·GIF) — 작업의뢰서·발주서·출고 거래명세서·사업자등록증
const ATT_OK=/\.(pdf|jpe?g|png|webp|gif)$/i,attIsImg=n=>/\.(jpe?g|png|webp|gif)$/i.test(n||'');
const attTag=n=>attIsImg(n)?'<i class="ftag img">IMG</i>':'';
const attSaveLbl=n=>attIsImg(n)?'이미지':'PDF 파일';
let wfFiles=[];
const normWf=x=>({id:String(x.id||uid()),orderId:String(x.orderId||''),name:String(x.name||''),path:String(x.path||''),addedAt:String(x.addedAt||''),kind:x.kind==='po'||x.kind==='tr'?x.kind:'wo'});
const wfLoad=r=>{const a=r&&!Array.isArray(r)?r.workOrderFiles:null;wfFiles=Array.isArray(a)?a.filter(x=>x&&typeof x==='object'&&x.path).map(normWf):[]};
const wfPayload=()=>({workOrderFiles:wfFiles});
function wfImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.workOrderFiles))wfFiles=raw.workOrderFiles.filter(x=>x&&x.path).map(normWf)}
const WFK={wo:'작업의뢰서',po:'발주서',tr:'시험성적서'};
async function wfAdd(oid,paths,kind){kind=WFK[kind]?kind:'wo';if(!A.wfAttach)return uiAlert('데스크톱 앱에서만 사용할 수 있어요.');let n=0;
 for(const p of paths){if(!ATT_OK.test(p)){toast('PDF·이미지(JPG·PNG·WEBP·GIF) 파일만 첨부할 수 있어요');continue}try{const r=await A.wfAttach(kind==='tr'?'tr-'+oid:oid,p);if(r){wfFiles.push(normWf({...r,orderId:oid,addedAt:now(),kind}));n++}}catch(e){uiAlert('첨부 실패: '+e)}}
 if(n){save();render();toast(`${WFK[kind]} ${n}건을 첨부했어요`)}}
async function wfPick(oid,kind){const l=await A.wfPick();if(l&&l.length)wfAdd(oid,l,kind)}
function wfDrop(e,oid,kind){e.stopPropagation();e.preventDefault();e.currentTarget.classList.remove('wfdrop');const l=[...e.dataTransfer.files].map(f=>A.pathForFile?A.pathForFile(f):'').filter(Boolean);if(l.length)wfAdd(oid,l,kind)}
function wfOver(e){e.preventDefault();e.currentTarget.classList.add('wfdrop')}
const wfGet=id=>wfFiles.find(x=>x.id===id);
function wfPreview(id){const f=wfGet(id);if(f)A.wfPreview(f.path,f.name).then(r=>{if(r===false)uiAlert('파일을 찾을 수 없어요.')})}
function wfSaveAs(id){const f=wfGet(id);if(f)A.wfSaveAs(f.path,f.name).then(r=>{if(r===false)uiAlert('파일을 찾을 수 없어요.');else if(r)toast('저장했어요')})}
async function wfDel(id){const f=wfGet(id);if(!f||!await uiConfirm(`'${f.name}' 파일을 삭제할까요?`))return;try{await A.wfDelete(f.path)}catch(e){}wfFiles=wfFiles.filter(x=>x.id!==id);save();render();toast('삭제했어요')}
function wfCell(x,fl,k){fl=fl.filter(f=>f.kind===k);const lb=WFK[k],key=`${x.id}:${k}`;
 return `<td class="wfc" ondragover="wfOver(event)" ondragleave="this.classList.remove('wfdrop')" ondrop="wfDrop(event,'${x.id}','${k}')">${fl.length
  ?`<button class="wfpill${wfPop&&wfPop.key===key?' on':''}" data-wfp="${key}" aria-haspopup="dialog" aria-expanded="${wfPop&&wfPop.key===key}" title="${esc(lb+' '+fl.length+'개\n'+fl.map(f=>'· '+f.name).join('\n')+'\n(눌러서 보기 · 파일을 끌어다 놓으면 추가)')}" onclick="wfPopToggle('${x.id}','${k}')">📎 ${fl.length}</button>`
  :`<button class="wfemp" data-wfp="${key}" title="${lb} 첨부 (PDF·이미지를 이 칸에 끌어다 놓아도 돼요)" aria-label="${lb} 첨부" onclick="wfPick('${x.id}','${k}')">＋</button>`}</td>`}
// ---- 첨부 목록 팝오버 (📎 N 을 누르면) ----
let wfPop=null;
function wfPopToggle(oid,k){const key=`${oid}:${k}`;if(wfPop&&wfPop.key===key)return wfPopClose(true);wfPop={oid,k,key};render();setTimeout(()=>{const b=document.querySelector('#wfpop button');if(b)b.focus()},0)}
function wfPopClose(refocus){if(!wfPop)return;const key=wfPop.key;wfPop=null;const el=$('wfpop');if(el)el.remove();
 document.querySelectorAll('.wfpill.on').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-expanded','false')});if(refocus){const a=document.querySelector(`[data-wfp="${key}"]`);if(a)a.focus()}}
function wfPopRender(){let el=$('wfpop');const pg=wfPop&&wfPop.k==='tr'?'testrpt':'work';if(!wfPop||page!==pg){if(el)el.remove();wfPop=null;return}
 const o=wfPop.k==='tr'?(x=>x&&{no:x.no||x.name})(trs.find(x=>x.id===wfPop.oid)):orders.find(x=>x.id===wfPop.oid),fl=wfFiles.filter(f=>f.orderId===wfPop.oid&&f.kind===wfPop.k),a=document.querySelector(`[data-wfp="${wfPop.key}"]`);
 if(!o||!a||!fl.length){wfPopClose(false);return}
 if(!el){el=document.createElement('div');el.id='wfpop';el.className='wfpop';el.setAttribute('role','dialog');document.body.appendChild(el)}
 const lb=WFK[wfPop.k];el.setAttribute('aria-label',`${lb} ${o.no}`);
 el.innerHTML=`<h4>${lb} · ${esc(o.no)}<button class="wfpx" title="닫기 (Esc)" aria-label="닫기" onclick="wfPopClose(true)">✕</button></h4>${fl.map(f=>`<div class="wfpr"><span class="fi">${attIsImg(f.name)?'🖼':'📄'}</span><span class="fn" title="${esc(f.name)}">${esc(f.name)}</span><button title="미리보기" aria-label="미리보기 ${esc(f.name)}" onclick="wfPreview('${f.id}')">👁</button><button title="${attSaveLbl(f.name)}로 저장" aria-label="${attSaveLbl(f.name)}로 저장 ${esc(f.name)}" onclick="wfSaveAs('${f.id}')">⬇</button><button class="del" title="삭제" aria-label="삭제 ${esc(f.name)}" onclick="wfDel('${f.id}')">🗑</button></div>`).join('')}<button class="wfpa" onclick="wfPick('${wfPop.oid}','${wfPop.k}')">＋ 파일 첨부</button><div class="muted wfph">파일을 표의 칸에 끌어다 놓아도 추가돼요</div>`;
 // 화면 안에 들어오게: 아래 공간이 모자라면 위로, 좌우는 창 안으로
 const r=a.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight,M=8;let top=r.bottom+4;if(top+h>innerHeight-M)top=Math.max(M,r.top-h-4);
 el.style.top=top+'px';el.style.left=Math.max(M,Math.min(r.left,innerWidth-w-M))+'px';
 a.classList.add('on');a.setAttribute('aria-expanded','true')}
{const f=renderWork;renderWork=function(){const r=f.apply(this,arguments);wfPopRender();return r}}
document.addEventListener('mousedown',e=>{if(!wfPop)return;const t=e.target;if(t.closest&&(t.closest('#wfpop')||t.closest('[data-wfp]')||t.closest('dialog')))return;wfPopClose(false)},true);
document.addEventListener('keydown',e=>{if(wfPop&&e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();wfPopClose(true)}},true);
document.addEventListener('scroll',e=>{if(wfPop&&!(e.target&&e.target.closest&&e.target.closest('#wfpop')))wfPopClose(false)},true);
window.addEventListener('resize',()=>wfPopClose(false));
function renderWork(){const q=$('wfk').value.trim().toLowerCase(),fc=$('wfc'),cv=fc.value,cs=[...new Set(orders.map(o=>o.client).filter(Boolean))];fc.innerHTML='<option value="">전체 거래처</option>'+cs.map(c=>`<option>${esc(c)}</option>`).join('');fc.value=cv;
 let l=orders.filter(x=>(!cv||x.client===cv)&&(!q||[x.no,x.item,x.fabric,x.client,...x.lines.map(l=>l.color),...wfFiles.filter(f=>f.orderId===x.id).map(f=>f.name)].join(' ').toLowerCase().includes(q)));lsBar('work');l=lsSort('work',l,o=>o);
 $('wfl').innerHTML=l.length?l.map(x=>{const fl=wfFiles.filter(f=>f.orderId===x.id);return `<tr${x.delivered?' class="dlv"':''} ><td><b>${esc(x.no)}</b></td><td>${esc(x.client)}</td><td>${tag(x)}${esc(x.item)}${x.fabric?`<br><small class="muted">${esc(x.fabric)}</small>`:''}</td><td>${x.lines.map(l=>`<div class="ln">${esc(l.color)||'-'}</div>`).join('')}</td><td style="text-align:right">${x.lines.map(l=>`<div class="ln">${num(l.qty)} ${esc(l.unit)}</div>`).join('')}${x.lines.length>1&&!x.mixedUnit?`<div class="ln tot">계 ${num(x.qty)} ${esc(x.unit)}</div>`:''}</td>
  ${wfCell(x,fl,'wo')}${wfCell(x,fl,'po')}</tr>`}).join(''):'<tr><td colspan="7">생산 오더가 없습니다. 생산 관리에서 오더를 먼저 등록하세요.</td></tr>'}
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
