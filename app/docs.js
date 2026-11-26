// ===== 서류 보관함 (화면은 없앰 — 2026-11-26) =====
// 예전에 서류 보관함에서 직접 추가한 서류 목록(documents[])과 docs 폴더의 파일은 지우지 않고, 불러오기·저장·백업에서 그대로 통과시킴.
// 다른 카테고리의 첨부(작업의뢰서·출고 거래명세서·사업자등록증·명함 등)는 각자 화면에서 그대로 씀.
let docs=[];
const DC_K=['성적서','거래명세서','청구서','작업의뢰서','발주서','규격서','계약·인증','명함','사업자등록증','사진','기타'];
const normDoc=x=>({id:String(x&&x.id||uid()),name:String(x&&x.name||''),path:String(x&&x.path||''),size:+(x&&x.size)||0,addedAt:String(x&&x.addedAt||''),kind:DC_K.includes(x&&x.kind)?x.kind:'기타',
 client:String(x&&x.client||'').trim(),orderNo:String(x&&x.orderNo||'').trim(),date:/^\d{4}-\d{2}-\d{2}$/.test(x&&x.date||'')?x.date:'',memo:String(x&&x.memo||'')});
function dcLoad(r){const o=r&&!Array.isArray(r)?r:{};docs=(Array.isArray(o.documents)?o.documents:[]).filter(x=>x&&x.path).map(normDoc);
 }
const dcPayload=()=>({documents:docs});
function dcImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.documents))dcLoad(raw)}
