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
const brList=c=>{const k=brKey(c);return k?bizRegs.filter(x=>x.key===k):[]};
const brNames=c=>brList(c).map(f=>f.name).join(', ');
async function brRemoveFile(f){try{await A.brDelete(f.path)}catch(e){}bizRegs=bizRegs.filter(x=>x.id!==f.id)}
async function brAdd(company,srcs){if(!A.brAttach)return uiAlert('데스크톱 앱에서만 사용할 수 있어요.');if(!brKey(company))return toast('회사명을 먼저 입력해 주세요');let n=0;
 for(const src of srcs){if(!ATT_OK.test(src||'')){toast('PDF·이미지 파일만 첨부할 수 있어요');continue}try{const r=await A.brAttach(src);if(r){bizRegs.push(normBr({...r,company,addedAt:now()}));n++}}catch(e){uiAlert('첨부 실패: '+e)}}
 if(n){save();toast('사업자등록증을 첨부했어요')}}
// 회사별 (같은 회사의 모든 명함에 같은 파일). key = 회사명
attReg('br',{label:'사업자등록증',title:c=>c,files:brList,add:brAdd,preview:f=>A.brPreview(f.path,f.name),save:f=>A.brSaveAs(f.path,f.name),del:async f=>{await brRemoveFile(f);save()}});
function brCell(c){return brKey(c.company)?attCell('br',c.company):'<td data-nolr data-x=""></td>'}
// 수정 창: 회사명 입력에 따라 칸을 다시 그림
function brBox(company){return `<span id="ct_br">${brKey(company)?attCell('br',company,{tag:'span'}):''}</span>`}
function brModal(){const el=$('ct_br');if(!el||!$('ct_company'))return;const co=$('ct_company').value.trim();el.innerHTML=brKey(co)?attCell('br',co,{tag:'span'}):'<small class="muted">회사명 입력 후 첨부</small>'}
