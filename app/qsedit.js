// ===== 품질 기준 편집 창: 원단(정보+시험항목 표), 부록 표, 품목 머리글(관리기관·도면·형별) =====
// 공통 표 편집기: G[key]={cols:[머리글], rows:[[칸]], ids:[행 id], hed:머리글 수정 가능}
const QG={};
function qgInit(key,cols,rows,ids,hed){QG[key]={cols:cols.slice(),rows:rows.map(r=>cols.map((_,j)=>r[j]??'')),ids:(ids||rows.map(()=>'')).slice(),hed:!!hed}}
function qgHTML(key){const g=QG[key],ea=s=>esc(String(s??''));
 return `<div class="qgw"><table class="qg"><thead><tr><th class="qgn"></th>${g.cols.map((c,j)=>`<th>${g.hed?`<input value="${ea(c)}" oninput="QG['${key}'].cols[${j}]=this.value" aria-label="머리글 ${j+1}"><button class="qgx" title="열 삭제" onclick="qgColDel('${key}',${j})">✕</button>`:ea(c)}</th>`).join('')}${g.hed?`<th class="qgn"><button title="열 추가" onclick="qgColAdd('${key}')">＋</button></th>`:''}<th class="qgn"></th></tr></thead>
 <tbody>${g.rows.map((r,i)=>`<tr><td class="qgn"><button title="위로" onclick="qgMove('${key}',${i},-1)"${i?'':' disabled'}>▲</button><button title="아래로" onclick="qgMove('${key}',${i},1)"${i<g.rows.length-1?'':' disabled'}>▼</button></td>${r.map((v,j)=>`<td><input value="${ea(v)}" oninput="QG['${key}'].rows[${i}][${j}]=this.value"></td>`).join('')}${g.hed?'<td></td>':''}<td class="qgn"><button title="행 삭제" onclick="qgDel('${key}',${i})">✕</button></td></tr>`).join('')}</tbody></table>
 <button onclick="qgAdd('${key}')">＋ 행</button></div>`}
function qgRe(key){const el=document.querySelector(`[data-qg="${key}"]`);if(el)el.innerHTML=qgHTML(key)}
function qgAdd(key){const g=QG[key];g.rows.push(g.cols.map(()=>''));g.ids.push('');qgRe(key);const l=[...document.querySelectorAll(`[data-qg="${key}"] tbody tr:last-child input`)];if(l[0])l[0].focus()}
function qgDel(key,i){const g=QG[key];g.rows.splice(i,1);g.ids.splice(i,1);qgRe(key)}
function qgMove(key,i,d){const g=QG[key],j=i+d;if(j<0||j>=g.rows.length)return;[g.rows[i],g.rows[j]]=[g.rows[j],g.rows[i]];[g.ids[i],g.ids[j]]=[g.ids[j],g.ids[i]];qgRe(key)}
function qgColAdd(key){const g=QG[key];g.cols.push('');g.rows.forEach(r=>r.push(''));qgRe(key)}
function qgColDel(key,j){const g=QG[key];if(g.cols.length<=1)return;g.cols.splice(j,1);g.rows.forEach(r=>r.splice(j,1));qgRe(key)}
const qgBox=key=>`<div data-qg="${key}">${qgHTML(key)}</div>`;
function qsWide(on){dlg.classList.toggle('qsdlg',on);if(on)dlg.addEventListener('close',()=>dlg.classList.remove('qsdlg'),{once:true})}
// ---- 원단 편집 ----
const QS_RK=['item','div','std','unit','method','memo'],QS_RL=['항목','구분','기준','단위','시험방법','비고'];
function qsFabFull(fid){const q=qsGet(qsSel),f=q&&q.fabrics.find(x=>x.id===fid);if(!f)return;
 qgInit('fab',QS_RL,f.rows.map(r=>QS_RK.map(k=>r[k])),f.rows.map(r=>r.id),false);
 $('dt').textContent='원단 편집';
 $('dbody').innerHTML=`<div class="trform"><label>원단명 *<input id="qf_name" value="${esc(f.name)}" style="width:100%"></label>
 <div class="qsg2">${QS_FAB_K.map(k=>`<label>${QS_FAB_L[k]}<input id="qf_${k}" value="${esc(f[k])}"></label>`).join('')}</div>
 <div style="font-size:12px;margin-top:6px">시험항목</div>${qgBox('fab')}</div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="qsFabFullSave('${fid}')">확인</button><button onclick="dlg.close()">취소</button><span style="flex:1"></span><button class="d" onclick="qsFabDel('${fid}')">탭 삭제</button>`;
 qsWide(true);if(!dlg.open)dlg.showModal();setTimeout(()=>$('qf_name').focus(),0)}
function qsFabFullSave(fid){const q=qsGet(qsSel),f=q&&q.fabrics.find(x=>x.id===fid);if(!f)return;const n=$('qf_name').value.trim();if(!n)return uiAlert('원단명을 입력하세요.');
 const g=QG.fab;f.name=n;QS_FAB_K.forEach(k=>f[k]=qsStr($('qf_'+k).value));
 f.rows=g.rows.map((r,i)=>({r,id:g.ids[i]})).filter(x=>x.r.some(v=>String(v).trim())).map(({r,id})=>{const o={id:id||uid()};QS_RK.forEach((k,j)=>o[k]=r[j]);return normQsRow(o)});
 q.example=false;q.updated=now();save();dlg.close();render();toast('수정했어요')}
// ---- 부록 편집 ----
let qsApxD=[];
function qsApxEdit(){const q=qsGet(qsSel);if(!q)return;qsApxD=q.appendix.map(x=>({id:x.id,title:x.title,text:x.text}));
 q.appendix.forEach((x,i)=>qgInit('apx'+x.id,x.columns.length?x.columns:['항목'],x.rows,null,true));
 $('dt').textContent='부록 편집';qsApxRe();$('dfoot').innerHTML=`<button class="p" onclick="qsApxSave()">확인</button><button onclick="dlg.close()">취소</button>`;
 qsWide(true);if(!dlg.open)dlg.showModal()}
function qsApxRe(){$('dbody').innerHTML=`<div class="trform">${qsApxD.map((x,i)=>`<div class="qsapxe"><div style="display:flex;gap:6px;align-items:center"><input value="${esc(x.title)}" placeholder="표 ${i+1}" oninput="qsApxD[${i}].title=this.value" style="flex:1"><button class="d" onclick="qsApxD.splice(${i},1);qsApxRe()">표 삭제</button></div>${qgBox('apx'+x.id)}<textarea rows="2" placeholder="비고" oninput="qsApxD[${i}].text=this.value">${esc(x.text)}</textarea></div>`).join('')}<button onclick="qsApxAdd()">＋ 표</button></div>`}
function qsApxAdd(){const id=uid();qgInit('apx'+id,['항목','기준'],[['','']],null,true);qsApxD.push({id,title:'',text:''});qsApxRe()}
function qsApxSave(){const q=qsGet(qsSel);if(!q)return;
 q.appendix=qsApxD.map(x=>{const g=QG['apx'+x.id];return normQsApx({id:x.id,title:x.title,columns:g.cols,rows:g.rows.filter(r=>r.some(v=>String(v).trim())),text:x.text})});
 q.example=false;q.updated=now();save();dlg.close();render();toast('수정했어요')}
