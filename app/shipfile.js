// ===== 출고별 거래명세서 PDF·이미지 첨부 =====
let shipFiles=[];
const normSs=x=>({id:String(x.id||uid()),orderId:String(x.orderId||''),processId:String(x.processId||''),shipId:String(x.shipId||''),name:String(x.name||''),path:String(x.path||''),addedAt:String(x.addedAt||'')});
const ssLoad=r=>{const a=r&&!Array.isArray(r)?r.shipFiles:null;shipFiles=Array.isArray(a)?a.filter(x=>x&&typeof x==='object'&&x.path&&x.shipId).map(normSs):[]};
const ssPayload=()=>({shipFiles});
function ssImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.shipFiles))shipFiles=raw.shipFiles.filter(x=>x&&x.path&&x.shipId).map(normSs)}
const ssOf=sid=>shipFiles.find(x=>x.shipId===sid);
const ssGet=id=>shipFiles.find(x=>x.id===id);
async function ssRemoveFile(f){try{await A.ssDelete(f.path)}catch(e){}shipFiles=shipFiles.filter(x=>x.id!==f.id)}
async function ssAdd(oid,pid,sid,src){if(!A.ssAttach)return alert('데스크톱 앱에서만 사용할 수 있어요.');if(!ATT_OK.test(src||''))return toast('PDF·이미지(JPG·PNG·WEBP·GIF) 파일만 첨부할 수 있어요');
 const old=ssOf(sid);if(old&&!confirm(`이미 첨부된 '${old.name}' 파일을 새 파일로 바꿀까요?`))return;
 try{const r=await A.ssAttach(oid,src);if(!r)return;if(old)await ssRemoveFile(old);shipFiles.push(normSs({...r,orderId:oid,processId:pid,shipId:sid,addedAt:now()}));save();render();toast('거래명세서를 첨부했어요')}catch(e){alert('첨부 실패: '+e)}}
async function ssPick(oid,pid,sid){const p=await A.ssPick();if(p)ssAdd(oid,pid,sid,p)}
function ssOver(e){e.preventDefault();e.currentTarget.classList.add('wfdrop')}
function ssDrop(e,oid,pid,sid){e.preventDefault();e.stopPropagation();e.currentTarget.classList.remove('wfdrop');const f=[...e.dataTransfer.files][0];const p=f&&A.pathForFile?A.pathForFile(f):'';if(p)ssAdd(oid,pid,sid,p)}
function ssPreview(id){const f=ssGet(id);if(f)A.ssPreview(f.path,f.name).then(r=>{if(r===false)alert('파일을 찾을 수 없어요.')})}
function ssSaveAs(id){const f=ssGet(id);if(f)A.ssSaveAs(f.path,f.name).then(r=>{if(r===false)alert('파일을 찾을 수 없어요.');else if(r)toast('저장했어요')})}
async function ssDel(id){const f=ssGet(id);if(!f||!confirm(`'${f.name}' 거래명세서를 삭제할까요?`))return;await ssRemoveFile(f);save();render();toast('삭제했어요')}
function ssOnShipDelete(sid){const f=ssOf(sid);if(f&&confirm('첨부된 거래명세서도 삭제할까요?'))ssRemoveFile(f).then(save)}
function ssCell(oid,pid,sid){const f=ssOf(sid);
 return `<td class="ssd" ondragover="ssOver(event)" ondragleave="this.classList.remove('wfdrop')" ondrop="ssDrop(event,'${oid}','${pid}','${sid}')"><div class="ssb">${f?`<span class="ssb" title="${esc(f.name)}">${attTag(f.name)}<button onclick="ssPreview('${f.id}')">미리보기</button><button onclick="ssSaveAs('${f.id}')">${attSaveLbl(f.name)}</button><button class="ssx" title="삭제" onclick="ssDel('${f.id}')">✕</button></span>`:`<button title="PDF·이미지를 이 칸에 끌어다 놓아도 돼요" onclick="ssPick('${oid}','${pid}','${sid}')">첨부</button><small class="muted">또는 끌어놓기</small>`}</div></td>`}
