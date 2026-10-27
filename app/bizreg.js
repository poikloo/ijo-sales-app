// ===== 거래처 정보: 회사별 사업자등록증 (PDF·이미지) — 같은 회사(㈜·(주)·주식회사·띄어쓰기 무시)의 모든 명함에 같은 파일 표시 =====
let bizRegs=[];
const brKey=c=>String(c||'').replace(/\(주\)|㈜|주식회사|\s/g,'').toLowerCase();
const normBr=x=>({id:String(x.id||uid()),key:brKey(x.key||x.company),company:String(x.company||''),name:String(x.name||''),path:String(x.path||''),addedAt:String(x.addedAt||'')});
const brValid=x=>x&&typeof x==='object'&&x.path&&brKey(x.key||x.company);
const brLoad=r=>{const a=r&&!Array.isArray(r)?r.bizRegs:null;bizRegs=Array.isArray(a)?a.filter(brValid).map(normBr):[]};
const brPayload=()=>({bizRegs});
function brImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.bizRegs))bizRegs=raw.bizRegs.filter(brValid).map(normBr)}
const brOf=c=>{const k=brKey(c);return k?bizRegs.find(x=>x.key===k):null};
const brGet=id=>bizRegs.find(x=>x.id===id);
const BR_OK=ATT_OK;
async function brRemoveFile(f){try{await A.brDelete(f.path)}catch(e){}bizRegs=bizRegs.filter(x=>x.id!==f.id)}
function brRefresh(){render();if(dlg.open&&$('ct_br'))brModal()}
async function brAdd(company,src){if(!A.brAttach)return uiAlert('데스크톱 앱에서만 사용할 수 있어요.');if(!brKey(company))return toast('회사명을 먼저 입력해 주세요');
 if(!BR_OK.test(src||''))return toast('PDF·이미지(JPG·PNG·WEBP·GIF) 파일만 첨부할 수 있어요');
 const old=brOf(company);if(old&&!await uiConfirm(`이미 첨부된 사업자등록증 '${old.name}'을(를) 새 파일로 바꿀까요?`))return;
 try{const r=await A.brAttach(src);if(!r)return;if(old)await brRemoveFile(old);bizRegs.push(normBr({...r,company,addedAt:now()}));save();brRefresh();toast('사업자등록증을 첨부했어요')}catch(e){uiAlert('첨부 실패: '+e)}}
async function brPick(company){const p=await A.brPick();if(p)brAdd(company,p)}
const brCo=el=>el.closest('[data-brc]').dataset.brc;
function brOver(e){e.preventDefault();e.currentTarget.classList.add('wfdrop')}
function brDrop(e){e.preventDefault();e.stopPropagation();const el=e.currentTarget;el.classList.remove('wfdrop');const f=[...e.dataTransfer.files][0];const p=f&&A.pathForFile?A.pathForFile(f):'';if(p)brAdd(brCo(el),p)}
function brPreview(id){const f=brGet(id);if(f)A.brPreview(f.path,f.name).then(r=>{if(r===false)uiAlert('파일을 찾을 수 없어요.')})}
async function brDel(id){const f=brGet(id);if(!f||!await uiConfirm(`'${f.company}'의 사업자등록증 '${f.name}'을(를) 삭제할까요?\n(같은 회사의 모든 명함에서 사라져요)`))return;await brRemoveFile(f);save();brRefresh();toast('삭제했어요')}
const brIcon=n=>attIsImg(n)?'IMG':'PDF';
// 칸/창 공통 내용 (data-brc 에 회사명)
function brInner(company){const f=brOf(company);if(!brKey(company))return '<small class="muted">회사명 없음</small>';
 return f?`<span class="brchip" title="${esc(f.name)} — 눌러서 열기" onclick="brPreview('${f.id}')"><i${attIsImg(f.name)?' class="img"':''}>${brIcon(f.name)}</i>${esc(f.name)}</span><button class="brb" title="다른 파일로 교체" onclick="brPick(brCo(this))">교체</button><button class="brb ssx" title="삭제" onclick="brDel('${f.id}')">✕</button>`
  :`<button class="brb" title="PDF·이미지를 이 칸에 끌어다 놓아도 돼요" onclick="brPick(brCo(this))">첨부</button>`}
function brCell(c){return `<td class="brd" data-nolr data-brc="${esc(c.company)}" onclick="event.stopPropagation()" ondragover="brOver(event)" ondragleave="this.classList.remove('wfdrop')" ondrop="brDrop(event)"><div class="ssb">${brInner(c.company)}</div></td>`}
// 명함 보기/수정 창 안의 사업자등록증 영역
function brModal(){const el=$('ct_br');if(!el)return;const co=$('ct_company')?$('ct_company').value.trim():el.dataset.brc;el.dataset.brc=co;
 el.innerHTML=`<div class="ssb">${brInner(co)}${brOf(co)?'':(brKey(co)?'<small class="muted">또는 끌어놓기 · 같은 회사의 모든 명함에 함께 표시돼요</small>':'')}</div>`}
function brBox(company){return `<div id="ct_br" class="brbox" data-brc="${esc(company)}" ondragover="brOver(event)" ondragleave="this.classList.remove('wfdrop')" ondrop="brDrop(event)"></div>`}
