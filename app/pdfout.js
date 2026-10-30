// ===== PDF 저장 (인쇄용 HTML → printToPDF) =====
const PDF_CSS=`@page{size:A4 __O;margin:12mm 10mm}*{box-sizing:border-box}body{font-family:'맑은 고딕','Malgun Gothic','Noto Sans CJK KR','Noto Sans KR',sans-serif;font-size:10px;color:#111;margin:0}
h1{text-align:center;font-size:20px;text-decoration:underline;margin:4px 0 14px}h3{font-size:12px;margin:14px 0 5px}
table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{page-break-inside:avoid;break-inside:avoid}
th,td{border:1px solid #444;padding:4px 6px;vertical-align:middle;word-break:break-all;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#f2f2f2;font-weight:700;text-align:center}
td.r{text-align:right}td.c{text-align:center}tr.t td{background:#f2f2f2;font-weight:700}.meta{display:flex;justify-content:space-between;margin-bottom:6px}.meta b{font-size:13px}
.ft{margin-top:18px;border-collapse:collapse;width:auto}.ft td{border:0;padding:2px 10px 2px 0}.ft td:first-child{font-weight:700;width:90px}.sub{color:#555;margin-bottom:6px}`;
const pdfDoc=(body,land)=>`<!doctype html><html><head><meta charset="utf-8"><style>${PDF_CSS.replace('__O',land?'landscape':'portrait')}</style></head><body>${body}</body></html>`;
const pE=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function pdfSave(html,name){if(!A.htmlPDF)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');try{const p=await A.htmlPDF(html,name);if(p)toast('PDF 저장: '+p)}catch(e){uiAlert('PDF 저장 실패: '+(e.message||e))}}
// 화면에 보이는(필터된) 표 읽기
function pdfGrab(tb){const t=$(tb)&&$(tb).closest('table');if(!t)return null;const ths=[...t.querySelectorAll('thead th')],keep=ths.map((h,i)=>h.innerText.trim()?i:-1).filter(i=>i>=0);
 const rows=[...t.querySelectorAll('tbody tr')].filter(r=>r.offsetParent!==null||!r.closest('.page:not(.on)')).map(r=>[...r.children]).filter(c=>c.length>=keep.length&&!(c.length===1)).map(c=>keep.map(i=>c[i]?c[i].innerText.replace(/\s*\n\s*/g,' ').trim():''));
 const al=keep.map(i=>{const c=t.querySelector(`tbody tr td:nth-child(${i+1})`);return c?getComputedStyle(c).textAlign:''});return {h:keep.map(i=>ths[i].innerText.trim()),rows,al}}
async function pdfList(tb,title,name){const g=pdfGrab(tb);if(!g)return;const land=g.h.length>7;
 const body=`<h1>${pE(title)}</h1><div class="sub">${pE(new Date().toLocaleString('ko-KR'))} · ${g.rows.length}건</div><table><thead><tr>${g.h.map(h=>`<th>${pE(h)}</th>`).join('')}</tr></thead><tbody>${g.rows.map(r=>`<tr>${r.map((v,i)=>`<td class="${g.al[i]==='right'?'r':g.al[i]==='center'?'c':''}">${pE(v)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${g.h.length}" class="c">항목이 없습니다.</td></tr>`}</tbody></table>`;
 await pdfSave(pdfDoc(body,land),name)}
async function xlsxList(tb,title,name){const g=pdfGrab(tb);if(!g)return;if(!A.tableXlsx)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');try{const p=await A.tableXlsx(title,g.h,g.rows,name);if(p)toast('엑셀 저장: '+p)}catch(e){uiAlert('엑셀 저장 실패: '+(e.message||e))}}
