// ===== TEST REPORT (시험성적서 목록) =====
// 행: {id,name 품명(의뢰명),lab 시험기관,no 접수번호,recv 접수일,done 완료일,result 결과,fail 불합격 항목,memo 비고,imp 엑셀에서 가져온 행,updated}
let trs=[],trSortK='recv:-1';
const TR_F=[['name','품명 (의뢰명)'],['lab','시험기관'],['no','접수번호'],['recv','접수일'],['done','완료일'],['result','결과'],['fail','불합격 항목'],['memo','비고']];
const trDate=v=>{v=String(v||'').trim();let m=v.match(/^(\d{4})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
 m=v.match(/^(\d{2})[-./](\d{1,2})[-./](\d{1,2})$/);if(m)return `20${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
 if(/^\d{5}(\.\d+)?$/.test(v)){const d=new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5);return d.toISOString().slice(0,10)}return v};
const normTr=x=>{const o={id:String(x.id||uid())};TR_F.forEach(([k])=>o[k]=String(x[k]??'').replace(/\u3000/g,' ').trim());o.recv=trDate(o.recv);o.done=trDate(o.done);o.imp=!!x.imp;o.updated=String(x.updated||'');if(x.qs&&typeof x.qs==='object'&&x.qs.id){const r={};if(x.qs.res&&typeof x.qs.res==='object')for(const [k,v] of Object.entries(x.qs.res))if(String(v??'').trim())r[k]=String(v).trim();o.qs={id:String(x.qs.id),fab:String(x.qs.fab||''),res:r}}if(x.example)o.example=true;return o};
const trLoad=r=>{const a=r&&!Array.isArray(r)?r.testReports:null;trs=Array.isArray(a)?a.filter(x=>x&&typeof x==='object').map(normTr):[];if(r&&r.testReportSort)trSortK=String(r.testReportSort)};
const trPayload=()=>({testReports:trs,testReportSort:trSortK});
function trImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.testReports))trs=raw.testReports.filter(x=>x&&typeof x==='object').map(normTr)}
const trRes=r=>{r=String(r||'').trim();return /불합격|부적합|fail/i.test(r)?'ng':/합격|적합|pass/i.test(r)?'ok':r&&r!=='-'?'etc':'none'};
const trBadge=r=>{const c=trRes(r);return r?`<span class="trb ${c}">${esc(r)}</span>`:'<small class="muted">-</small>'};
const trYear=x=>(x.recv||x.done||'').slice(0,4);
function trOpts(id,all,vals){const el=$(id),cur=el.value;el.innerHTML=`<option value="">${all}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');el.value=vals.includes(cur)?cur:''}
function renderTr(){
 const uniq=a=>[...new Set(a.filter(Boolean))];
 trOpts('trlab','전체 시험기관',uniq(trs.map(x=>x.lab)).sort((a,b)=>a.localeCompare(b,'ko')));
 trOpts('trres','전체 결과',uniq(trs.map(x=>x.result)).sort((a,b)=>trRes(a).localeCompare(trRes(b))||a.localeCompare(b,'ko')));
 trOpts('tryr','전체 연도',uniq(trs.map(trYear)).sort().reverse());
 const k=$('trk').value.trim().toLowerCase(),lab=$('trlab').value,res=$('trres').value,yr=$('tryr').value;$('trsrt').value=trSortK;
 let l=trs.filter(x=>(!lab||x.lab===lab)&&(!res||x.result===res)&&(!yr||trYear(x)===yr)&&(!k||TR_F.map(([f])=>x[f]).join(' ').toLowerCase().includes(k)));
 const [sk,sd]=trSortK.split(':'),d=+sd||1;
 l=l.map((x,i)=>[x,i]).sort(([a,i],[b,j])=>{const va=a[sk]||'',vb=b[sk]||'';if(!va!==!vb)return va?-1:1;return (lsCmp(va,vb)||lsCmp(a.recv,b.recv)||i-j)*d}).map(p=>p[0]);
 const ok=l.filter(x=>trRes(x.result)==='ok').length,ng=l.filter(x=>trRes(x.result)==='ng').length;
 $('trsum').innerHTML=`<b>${l.length}</b>건${l.length!==trs.length?` <small class="muted">/ 전체 ${trs.length}</small>`:''} · 합격 <b class="trok">${ok}</b> · 불합격 <b class="neg">${ng}</b>${l.length-ok-ng?` · 기타 ${l.length-ok-ng}`:''}`;
 $('trtb').innerHTML=l.length?l.map(x=>`<tr class="r${x.id===trCmpId?' cur':''}" onclick="trRow('${x.id}')"><td><b>${esc(x.name)}</b>${x.example?' <small class="muted">(예시)</small>':''}</td><td>${esc(x.lab)}</td><td class="mono">${esc(x.no)}</td><td class="dt">${esc(x.recv)}</td><td class="dt">${esc(x.done)}</td><td style="text-align:center">${trBadge(x.result)}${x.qs&&qsGet(x.qs.id)?' <small class="muted" title="품질 기준 연결됨">⚖</small>':''}</td><td>${x.fail?`<span class="neg">${esc(x.fail)}</span>`:''}</td><td><small>${esc(x.memo)}</small></td>${wfCell(x,wfFiles.filter(f=>f.orderId===x.id),'tr').replace('<td class="wfc"','<td class="wfc" onclick="event.stopPropagation()"')}</tr>`).join('')
  :`<tr><td colspan="9">${trs.length?'조건에 맞는 성적서가 없습니다.':'TEST REPORT가 없습니다. [엑셀 가져오기] 또는 [+ 추가]로 등록하세요.'}</td></tr>`;
 if(window.wfPopRender)wfPopRender();if(trCmpId&&!$('trcmp').innerHTML)trCmpRender()}
function trSort(v){trSortK=v;save();render()}
// ---- 추가 / 수정 ----
function trOpen(id){const x=id?trs.find(t=>t.id===id):{name:'',lab:'',no:'',recv:ymd(new Date()),done:'',result:'',fail:'',memo:''};if(!x)return;
 const labs=[...new Set(trs.map(t=>t.lab).filter(Boolean))],ress=[...new Set(['합격','불합격',...trs.map(t=>t.result).filter(Boolean)])];
 $('dt').textContent=id?'TEST REPORT 수정':'TEST REPORT 추가';
 const inp=(k,t,o='')=>`<label>${t}<input id="tr_${k}" value="${esc(x[k])}"${o}></label>`;
 $('dbody').innerHTML=`<div class="trform">${inp('name','품명 (의뢰명) *',' style="width:100%"')}
 <div class="trg">${inp('lab','시험기관',' list="trlabs"')}${inp('no','접수번호')}<label>접수일<input id="tr_recv" type="date" value="${esc(x.recv)}"></label><label>완료일<input id="tr_done" type="date" value="${esc(x.done)}"></label></div>
 <div class="trg">${inp('result','결과',' list="trress"')}<label style="grid-column:span 3">불합격 항목<input id="tr_fail" value="${esc(x.fail)}" placeholder="예: 인열강도, 발수도"></label></div>
 <label>비고<textarea id="tr_memo" rows="2">${esc(x.memo)}</textarea></label>
 <datalist id="trlabs">${labs.map(v=>`<option value="${esc(v)}">`).join('')}</datalist><datalist id="trress">${ress.map(v=>`<option value="${esc(v)}">`).join('')}</datalist>
 ${id&&x.imp?'<div class="muted" style="font-size:12px">엑셀에서 가져온 행이라 다시 가져오면 엑셀 내용으로 바뀝니다.</div>':''}</div>`;
 $('dfoot').innerHTML=`${id?`<button class="d" onclick="trDel('${id}')">삭제</button>`:''}<button class="p" onclick="trSave('${id||''}')">저장</button><button onclick="dlg.close()">취소</button>`;
 if(!dlg.open)dlg.showModal();setTimeout(()=>$('tr_name').focus(),0)}
function trSave(id){const o={};TR_F.forEach(([k])=>o[k]=$('tr_'+k).value);if(!o.name.trim())return uiAlert('품명 (의뢰명)을 입력하세요.');
 if(id){const i=trs.findIndex(t=>t.id===id);if(i<0)return;trs[i]=normTr({...trs[i],...o,example:false,updated:now()})}else trs.push(normTr({...o,updated:now()}));
 save();dlg.close();render();toast(id?'수정했어요':'추가했어요')}
async function trDel(id){const x=trs.find(t=>t.id===id);if(!x)return;const fl=wfFiles.filter(f=>f.kind==='tr'&&f.orderId===id);
 if(!await uiConfirm(`'${x.name}' 성적서를 삭제할까요?${fl.length?`\n첨부 파일 ${fl.length}개도 함께 삭제됩니다.`:''}`))return;
 for(const f of fl){try{await A.wfDelete(f.path)}catch(e){}}wfFiles=wfFiles.filter(f=>!fl.includes(f));trs=trs.filter(t=>t.id!==id);save();if(dlg.open)dlg.close();render();toast('삭제했어요')}
// ---- 엑셀 가져오기 (머리글 자동 인식 · 미리보기 · 다시 가져오면 '가져온 행'만 교체) ----
let tiRaw=null,tiHdr=0,tiMap={},tiName='';
function tiDetect(h){const n=h.map(x=>String(x||'').toUpperCase().replace(/[\s._()]/g,'')),m={},used=new Set(),f=t=>{const i=n.findIndex((x,j)=>!used.has(j)&&x&&t(x));if(i>=0)used.add(i);return i};
 m.fail=f(x=>x.includes('불합격')||x.includes('부적합')||x.includes('FAIL'));
 m.lab=f(x=>x.includes('기관')||x.includes('시험소')||x.includes('LAB'));
 m.no=f(x=>x.includes('접수번호')||x.includes('성적서번호')||x.includes('번호')||x.includes('REPORTNO'));
 m.recv=f(x=>x.includes('접수일')||x.includes('의뢰일'));
 m.done=f(x=>x.includes('완료일')||x.includes('발행일')||x.includes('발급일'));
 m.result=f(x=>x.includes('결과')||x.includes('판정')||x.includes('RESULT'));
 m.memo=f(x=>x.includes('비고')||x.includes('메모')||x.includes('NOTE'));
 m.name=f(x=>x.includes('품명')||x.includes('의뢰명')||x.includes('품목')||x.includes('시료')||x.includes('ITEM'));return m}
const trNoKey=v=>String(v||'').replace(/[\s\-‐-―−]/g,'').toUpperCase();
const trKey=x=>String(x.no||'').replace(/\s/g,'').toUpperCase()+'|'+String(x.name||'').replace(/\s/g,'')+'|'+(x.recv||'');
function tiAnalyze(){const R=tiRaw.slice(tiHdr+1),g=(r,k)=>tiMap[k]>=0?String(r[tiMap[k]]??'').trim():'',L=[],bad=[];let rows=0;
 R.forEach((r,i)=>{if(!r.some(c=>String(c||'').trim()))return;rows++;const rn=tiHdr+i+2,o={};TR_F.forEach(([k])=>o[k]=g(r,k));
  if(!o.name){if(TR_F.some(([k])=>o[k]))bad.push(`${rn}행: 품명 없음 — 건너뜀`);return}
  const x=normTr({...o,imp:true});if(x.recv&&!/^\d{4}-\d\d-\d\d$/.test(x.recv))bad.push(`${rn}행: 접수일 형식 확인 (${x.recv})`);if(x.done&&!/^\d{4}-\d\d-\d\d$/.test(x.done))bad.push(`${rn}행: 완료일 형식 확인 (${x.done})`);[['recv','접수일'],['done','완료일']].forEach(([k,t])=>{const y=+x[k].slice(0,4);if(/^\d{4}-/.test(x[k])&&(y<2000||y>2099))bad.push(`${rn}행: ${t} 연도 확인 (${x[k]})`)});L.push(x)});
 const nk=new Set(L.map(trKey)),lost=trs.filter(t=>t.imp&&!nk.has(trKey(t))&&wfFiles.some(f=>f.kind==='tr'&&f.orderId===t.id)).length;
 return {rows,L,bad,old:trs.filter(t=>t.imp).length,lost}}
async function trImportOpen(){if(!A.trImportPick)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');let r;try{r=await A.trImportPick()}catch(e){return uiAlert('파일을 읽지 못했습니다: '+e)}if(!r)return;
 if(!r.rows.length)return uiAlert('데이터가 없습니다.');tiRaw=r.rows;tiName=r.name;tiHdr=Math.max(0,tiRaw.slice(0,15).findIndex(x=>x.some(c=>/품\s*명|시험기관|접수번호|의뢰명/.test(String(c)))));tiMap=tiDetect(tiRaw[tiHdr]);tiRender()}
function tiRender(){const h=tiRaw[tiHdr],a=tiAnalyze(),man=trs.length-a.old;
 $('dt').textContent='엑셀 가져오기 — '+tiName;
 $('dbody').innerHTML=`<div class="fsec">칸 연결 (자동 인식, 필요하면 바꾸세요)</div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 12px;margin-top:6px">${TR_F.map(([k,t])=>`<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:12px;font-weight:600;color:#555">${t}</span><select style="width:100%;min-width:0;box-sizing:border-box" onchange="tiMap['${k}']=+this.value;tiRender()"><option value="-1">(없음)</option>${h.map((c,i)=>`<option value="${i}"${tiMap[k]===i?' selected':''}>${esc(c||'('+(i+1)+'번째 칸)')}</option>`).join('')}</select></div>`).join('')}</div>
 <div style="margin:12px 0 10px;padding-top:10px;border-top:1px solid #e5e5e5;display:flex;gap:16px;flex-wrap:wrap;align-items:center"><b>데이터 ${a.rows}행 → 성적서 ${a.L.length}건</b><span>합격 <b class="trok">${a.L.filter(x=>trRes(x.result)==='ok').length}</b></span><span>불합격 <b class="neg">${a.L.filter(x=>trRes(x.result)==='ng').length}</b></span><span>확인 필요 <b class="${a.bad.length?'neg':''}">${a.bad.length}</b></span></div>
 <div class="muted" style="margin-bottom:8px;font-size:12px">${a.old?`이전에 엑셀에서 가져온 <b>${a.old}건</b>은 이번 파일 내용으로 <b>교체</b>됩니다 (같은 접수번호·품명·접수일이면 첨부 파일은 그대로 유지). `:''}직접 [+ 추가]한 ${man}건은 그대로 둡니다.${a.lost?`<div class="neg">⚠ 이번 파일에 없는 기존 행 ${a.lost}건에 첨부된 성적서 파일이 함께 삭제됩니다.</div>`:''}</div>
 ${a.bad.length?`<div class="neg" style="max-height:80px;overflow:auto;font-size:12px;margin-bottom:8px">${a.bad.slice(0,200).map(esc).join('<br>')}</div>`:''}
 <div style="max-height:44vh;overflow:auto"><table class="ciprev"><thead><tr>${TR_F.map(([,t])=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${a.L.slice(0,300).map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.lab)}</td><td>${esc(x.no)}</td><td>${esc(x.recv)}</td><td>${esc(x.done)}</td><td>${trBadge(x.result)}</td><td>${esc(x.fail)}</td><td>${esc(x.memo)}</td></tr>`).join('')}${a.L.length>300?`<tr><td colspan="8" class="muted">… 외 ${a.L.length-300}건</td></tr>`:''}</tbody></table></div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="tiRun()"${a.L.length?'':' disabled'}>가져오기 (${a.L.length}건)</button><button onclick="dlg.close()">취소</button>`;if(!dlg.open)dlg.showModal()}
async function tiRun(){const a=tiAnalyze();if(A.preImportBackup)await A.preImportBackup();
 const old=new Map();trs.filter(t=>t.imp).forEach(t=>{const k=trKey(t);if(!old.has(k))old.set(k,t.id)});const keep=new Set();
 const nl=a.L.map(x=>{const id=old.get(trKey(x));if(id&&!keep.has(id)){keep.add(id);const p=trs.find(t=>t.id===id);return {...x,id,qs:p&&p.qs}}return x});
 const gone=trs.filter(t=>t.imp&&!keep.has(t.id)).map(t=>t.id),orph=wfFiles.filter(f=>f.kind==='tr'&&gone.includes(f.orderId));
 for(const f of orph){try{await A.wfDelete(f.path)}catch(e){}}wfFiles=wfFiles.filter(f=>!orph.includes(f));
 const t=now();trs=[...trs.filter(x=>!x.imp),...nl.map(x=>normTr({...x,imp:true,updated:t}))];
 save();dlg.close();render();toast(`가져오기 완료: ${nl.length}건${a.old?` (이전 가져온 ${a.old}건 교체)`:''}`)}
