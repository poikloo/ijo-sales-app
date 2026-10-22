// ===== 작업의뢰서 (전산 PDF 보관) =====
let wfFiles=[];
const normWf=x=>({id:String(x.id||uid()),orderId:String(x.orderId||''),name:String(x.name||''),path:String(x.path||''),addedAt:String(x.addedAt||''),kind:x.kind==='po'?'po':'wo'});
const wfLoad=r=>{const a=r&&!Array.isArray(r)?r.workOrderFiles:null;wfFiles=Array.isArray(a)?a.filter(x=>x&&typeof x==='object'&&x.path).map(normWf):[]};
const wfPayload=()=>({workOrderFiles:wfFiles});
function wfImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.workOrderFiles))wfFiles=raw.workOrderFiles.filter(x=>x&&x.path).map(normWf)}
async function wfAdd(oid,paths,kind){kind=kind==='po'?'po':'wo';if(!A.wfAttach)return alert('데스크톱 앱에서만 사용할 수 있어요.');let n=0;
 for(const p of paths){if(!/\.pdf$/i.test(p)){toast('PDF 파일만 첨부할 수 있어요');continue}try{const r=await A.wfAttach(oid,p);if(r){wfFiles.push(normWf({...r,orderId:oid,addedAt:now(),kind}));n++}}catch(e){alert('첨부 실패: '+e)}}
 if(n){save();render();toast(`${kind==='po'?'발주서':'작업의뢰서'} ${n}건을 첨부했어요`)}}
async function wfPick(oid,kind){const l=await A.wfPick();if(l&&l.length)wfAdd(oid,l,kind)}
function wfDrop(e,oid,kind){e.stopPropagation();e.preventDefault();e.currentTarget.classList.remove('wfdrop');const l=[...e.dataTransfer.files].map(f=>A.pathForFile?A.pathForFile(f):'').filter(Boolean);if(l.length)wfAdd(oid,l,kind)}
function wfOver(e){e.preventDefault();e.currentTarget.classList.add('wfdrop')}
const wfGet=id=>wfFiles.find(x=>x.id===id);
function wfPreview(id){const f=wfGet(id);if(f)A.wfPreview(f.path,f.name).then(r=>{if(r===false)alert('파일을 찾을 수 없어요.')})}
function wfSaveAs(id){const f=wfGet(id);if(f)A.wfSaveAs(f.path,f.name).then(r=>{if(r===false)alert('파일을 찾을 수 없어요.');else if(r)toast('저장했어요')})}
async function wfDel(id){const f=wfGet(id);if(!f||!confirm(`'${f.name}' 파일을 삭제할까요?`))return;try{await A.wfDelete(f.path)}catch(e){}wfFiles=wfFiles.filter(x=>x.id!==id);save();render();toast('삭제했어요')}
function wfCell(x,fl,k){fl=fl.filter(f=>f.kind===k);return `<td class="wfc" ondragover="wfOver(event)" ondragleave="this.classList.remove('wfdrop')" ondrop="wfDrop(event,'${x.id}','${k}')"><div class="wff">${fl.map(f=>`<div class="wfi"><span class="fn" title="${esc(f.name)}">${esc(f.name)}</span><span class="bt"><button onclick="wfPreview('${f.id}')">미리보기</button><button onclick="wfSaveAs('${f.id}')">PDF 파일</button><button class="d" title="삭제" onclick="wfDel('${f.id}')">✕</button></span></div>`).join('')}<button class="wfa" onclick="wfPick('${x.id}','${k}')">+ 파일 첨부</button>${fl.length?'':'<small class="muted">PDF를 이 칸에 끌어다 놓아도 돼요</small>'}</div></td>`}
function renderWork(){const q=$('wfk').value.trim().toLowerCase(),fc=$('wfc'),cv=fc.value,cs=[...new Set(orders.map(o=>o.client).filter(Boolean))];fc.innerHTML='<option value="">전체 거래처</option>'+cs.map(c=>`<option>${esc(c)}</option>`).join('');fc.value=cv;
 const l=orders.filter(x=>(!cv||x.client===cv)&&(!q||[x.no,x.item,x.fabric,x.client,...x.lines.map(l=>l.color),...wfFiles.filter(f=>f.orderId===x.id).map(f=>f.name)].join(' ').toLowerCase().includes(q))).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 $('wfl').innerHTML=l.length?l.map(x=>{const fl=wfFiles.filter(f=>f.orderId===x.id);return `<tr${x.delivered?' class="dlv"':''} ><td><b>${esc(x.no)}</b></td><td>${esc(x.client)}</td><td>${tag(x)}${esc(x.item)}${x.fabric?`<br><small class="muted">${esc(x.fabric)}</small>`:''}</td><td>${x.lines.map(l=>`<div class="ln">${esc(l.color)||'-'}</div>`).join('')}</td><td style="text-align:right">${x.lines.map(l=>`<div class="ln">${num(l.qty)} ${esc(l.unit)}</div>`).join('')}${x.lines.length>1&&!x.mixedUnit?`<div class="ln tot">계 ${num(x.qty)} ${esc(x.unit)}</div>`:''}</td>
  ${wfCell(x,fl,'wo')}${wfCell(x,fl,'po')}</tr>`}).join(''):'<tr><td colspan="7">생산 오더가 없습니다. 생산 관리에서 오더를 먼저 등록하세요.</td></tr>'}
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
