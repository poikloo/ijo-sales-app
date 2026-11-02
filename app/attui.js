// ===== 첨부 칸 공통 컴포넌트 (작업의뢰서 방식) — 앞으로 모든 첨부는 이것만 사용 =====
// 칸: 📎 N (없으면 ＋) · 칸에 파일 끌어놓기 · 📎 누르면 팝오버 '<이름> - <키>' (👁 보기 · ⬇ 저장 · 🗑 삭제 · ＋ 파일 첨부 · ✕ 닫기)
// 등록: attReg('이름',{label, title(key), files(key)->[{id,name,path}], add(key,paths), preview(f), save(f), del(f), pick?(key)})
const ATT_SRC={};
function attReg(n,o){ATT_SRC[n]=o}
const attK=(s,k)=>s+'|'+k;
const attQ=v=>esc(String(v)).replace(/'/g,'&#39;');
function attInner(s,key,ak){const S=ATT_SRC[s],fl=S.files(key)||[],on=attPop&&attPop.k===ak;
 return fl.length?`<button class="wfpill${on?' on':''}" data-attp="${esc(ak)}" aria-haspopup="dialog" aria-expanded="${!!on}" title="${esc(fl.map(f=>f.name).join('\n'))}" onclick="event.stopPropagation();attToggle(this)">📎 ${fl.length}</button>`
  :`<button class="wfemp" data-attp="${esc(ak)}" title="${esc(S.label)} 첨부" aria-label="${esc(S.label)} 첨부" onclick="event.stopPropagation();attPick(this)">＋</button>`}
// tag 'td' = 표 칸, 'span' = 창·머리글 안. data-x = 엑셀/PDF 저장에 쓰는 파일 이름
function attCell(s,key,o={}){const tag=o.tag||'td',ak=attK(s,key),fl=ATT_SRC[s].files(key)||[];
 return `<${tag} class="wfc attc${o.cls?' '+o.cls:''}" data-nolr data-att="${esc(ak)}" data-x="${esc(fl.map(f=>f.name).join(', '))}" onclick="event.stopPropagation()" ondragover="wfOver(event)" ondragleave="this.classList.remove('wfdrop')" ondrop="attDrop(event)">${attInner(s,key,ak)}</${tag}>`}
const attOf=el=>{const ak=(el.closest('[data-att]')||el).dataset.att||el.dataset.attp,i=ak.indexOf('|');return {ak,s:ak.slice(0,i),key:ak.slice(i+1)}};
async function attAdd(s,key,paths){const S=ATT_SRC[s];if(!paths||!paths.length)return;await S.add(key,paths);attRefresh()}
async function attPick(el){const {s,key}=attOf(el),S=ATT_SRC[s];const l=S.pick?await S.pick(key):await A.wfPick();if(l&&l.length)attAdd(s,key,l)}
function attDrop(e){e.preventDefault();e.stopPropagation();const el=e.currentTarget;el.classList.remove('wfdrop');const l=[...e.dataTransfer.files].map(f=>A.pathForFile?A.pathForFile(f):'').filter(Boolean);const {s,key}=attOf(el);if(l.length)attAdd(s,key,l)}
// 표는 render(), 창·머리글 안의 칸은 직접 다시 그림
function attRefresh(){if(typeof render==='function')render();document.querySelectorAll('span[data-att],div[data-att]').forEach(el=>{const {ak,s,key}=attOf(el);if(!ATT_SRC[s])return;const fl=ATT_SRC[s].files(key)||[];el.dataset.x=fl.map(f=>f.name).join(', ');el.innerHTML=attInner(s,key,ak)});attPopRender()}
// ---- 팝오버 ----
let attPop=null;
const attAnchor=ak=>{const l=[...document.querySelectorAll(`[data-attp="${CSS.escape(ak)}"]`)].filter(b=>b.offsetParent!==null),d=l.find(b=>b.closest('dialog[open]'));return d||l[0]||null};
function attToggle(el){const {ak,s,key}=attOf(el);if(attPop&&attPop.k===ak)return attClose(true);attPop={k:ak,s,key,dlg:!!el.closest('dialog')};attPopRender();setTimeout(()=>{const b=document.querySelector('#wfpop button');if(b)b.focus()},0)}
function attClose(refocus){if(!attPop)return;const ak=attPop.k;attPop=null;const el=$('wfpop');if(el)el.remove();
 document.querySelectorAll('.wfpill.on').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-expanded','false')});if(refocus){const a=attAnchor(ak);if(a)a.focus()}}
function attFile(id){const S=attPop&&ATT_SRC[attPop.s];return S&&(S.files(attPop.key)||[]).find(f=>f.id===id)}
function attView(id){const f=attFile(id);if(f)Promise.resolve(ATT_SRC[attPop.s].preview(f)).then(r=>{if(r===false)uiAlert('파일을 찾을 수 없어요.')})}
function attSave(id){const f=attFile(id);if(f)Promise.resolve(ATT_SRC[attPop.s].save(f)).then(r=>{if(r===false)uiAlert('파일을 찾을 수 없어요.');else if(r)toast('저장했어요')})}
async function attDel(id){const f=attFile(id);if(!f)return;const s=attPop.s,key=attPop.key;if(!await uiConfirm(`'${f.name}' 파일을 삭제할까요?`))return;await ATT_SRC[s].del(f,key);attRefresh();toast('삭제했어요')}
async function attPopAdd(){if(!attPop)return;const {s,key}=attPop,S=ATT_SRC[s];const l=S.pick?await S.pick(key):await A.wfPick();if(l&&l.length)attAdd(s,key,l)}
function attPopRender(){let el=$('wfpop');if(!attPop){if(el)el.remove();return}
 const S=ATT_SRC[attPop.s],fl=S?S.files(attPop.key)||[]:[],a=attAnchor(attPop.k);if(!S||!a||!fl.length){attClose(false);return}
 const host=a.closest('dialog[open]')||document.body;if(!el||el.parentNode!==host){if(el)el.remove();el=document.createElement('div');el.id='wfpop';el.className='wfpop';el.setAttribute('role','dialog');host.appendChild(el)}
 const ttl=`${S.label} - ${S.title(attPop.key)||''}`;el.setAttribute('aria-label',ttl);
 el.innerHTML=`<h4>${esc(ttl)}<button class="wfpx" title="닫기" aria-label="닫기" onclick="attClose(true)">✕</button></h4>${fl.map(f=>`<div class="wfpr"><span class="fi">${attIsImg(f.name)?'🖼':'📄'}</span><span class="fn" title="${esc(f.name)}">${esc(f.name)}</span><button title="보기" aria-label="보기 ${esc(f.name)}" onclick="attView('${f.id}')">👁</button><button title="다운로드" aria-label="다운로드 ${esc(f.name)}" onclick="attSave('${f.id}')">⬇</button><button class="del" title="삭제" aria-label="삭제 ${esc(f.name)}" onclick="attDel('${f.id}')">🗑</button></div>`).join('')}<button class="wfpa" onclick="attPopAdd()">＋ 파일 첨부</button>`;
 const r=a.getBoundingClientRect(),hr=host===document.body?{left:0,top:0}:host.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight,M=8;let top=r.bottom+4;if(top+h>innerHeight-M)top=Math.max(M,r.top-h-4);
 el.style.top=(top-hr.top)+'px';el.style.left=(Math.max(M,Math.min(r.left,innerWidth-w-M))-hr.left)+'px';el.style.position=host===document.body?'fixed':'absolute';
 a.classList.add('on');a.setAttribute('aria-expanded','true')}
document.addEventListener('mousedown',e=>{if(!attPop)return;const t=e.target;if(t.closest&&(t.closest('#wfpop')||t.closest('[data-attp]')||t.closest('.uidlg')))return;attClose(false)},true);
document.addEventListener('keydown',e=>{if(attPop&&e.key==='Escape'){e.preventDefault();e.stopPropagation();attClose(true)}},true);
document.addEventListener('scroll',e=>{if(attPop&&!(e.target&&e.target.closest&&e.target.closest('#wfpop')))attClose(false)},true);
window.addEventListener('resize',()=>attClose(false));

// ---- 공통 저장소 어댑터 ----
const attWf=(k,label,title,pre)=>attReg(k,{label,title,files:id=>wfFiles.filter(f=>f.orderId===id&&f.kind===k),add:(id,l)=>wfAdd(id,l,k),
 preview:f=>ATT_OK.test(f.name)?A.wfPreview(f.path,f.name):A.wfOpenExt(f.path),save:f=>A.wfSaveAs(f.path,f.name),
 del:async f=>{try{await A.wfDelete(f.path)}catch(e){}wfFiles=wfFiles.filter(x=>x.id!==f.id);save()},pick:k==='qs'?()=>A.wfPick('qs'):null});
attWf('wo','작업의뢰서',id=>(orders.find(o=>o.id===id)||{}).no);
attWf('po','발주서',id=>(orders.find(o=>o.id===id)||{}).no);
attWf('tr','시험성적서',id=>(t=>t&&(t.no||t.name))(trs.find(x=>x.id===id)));
attWf('qs','규격서',id=>(q=>q&&(q.spec||q.name))(typeof qsGet==='function'&&qsGet(id)));
// 출고별 거래명세서: key = 오더id~공정id~출고id (출고 1건에 1파일 — 새로 넣으면 바꿈)
attReg('ss',{label:'거래명세서',title:k=>{const [o,p,s]=k.split('~'),O=orders.find(x=>x.id===o),P=O&&O.procs.find(x=>x.id===p),S=P&&P.ships.find(x=>x.id===s);return [O&&O.no,S&&S.date].filter(Boolean).join(' ')},
 files:k=>{const f=ssOf(k.split('~')[2]);return f?[f]:[]},add:async(k,l)=>{const [o,p,s]=k.split('~');await ssAdd(o,p,s,l[0])},
 preview:f=>A.ssPreview(f.path,f.name),save:f=>A.ssSaveAs(f.path,f.name),del:async f=>{await ssRemoveFile(f);save()}});
