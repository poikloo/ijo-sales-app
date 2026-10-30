// ===== 품질 기준 (조달청 규격서 기준: 품목 → 원단 탭 → 시험항목, 무늬·색상 탭: 염색견뢰도·적외선 반사율) =====
// 품목: {id,name,cat 분류,spec 규격서 번호,rev 개정일,ir IR 적용,fav 즐겨찾기,usage 용도,material 재질,colorDesc 색상,memo,
//        fabrics[{id,name,rows[{id,item 항목,div 구분,std 기준,unit 단위,method 시험방법}]}],
//        patterns[{id,name 무늬,applies 적용 원단,grade 등급,fast[{color,v[7]}],irMethod,irColors[],ir[{nm,v[]}]}]}
let qualities=[],qsSel='',qsTab='',qsPat='',qsF={k:'',cat:'',ir:'',sort:'name'},qsRecent=[],qsFold={};
const QS_FAST=['일광','세탁 변퇴','세탁 오염','땀 변퇴','땀 오염','마찰 건','마찰 습'];
const qsArr=a=>Array.isArray(a)?a.filter(x=>x&&typeof x==='object'):[];
const qsStr=v=>String(v??'').replace(/\u3000/g,' ').trim();
const normQsRow=r=>({id:String(r.id||uid()),item:qsStr(r.item),div:qsStr(r.div),std:qsStr(r.std),unit:qsStr(r.unit),method:qsStr(r.method)});
const normQsPat=p=>{const irColors=(Array.isArray(p.irColors)?p.irColors:[]).map(qsStr);return {id:String(p.id||uid()),name:qsStr(p.name),applies:qsStr(p.applies),grade:qsStr(p.grade),
 fast:qsArr(p.fast).map(f=>({color:qsStr(f.color),v:QS_FAST.map((_,i)=>qsStr((f.v||[])[i]))})),irMethod:qsStr(p.irMethod),irColors,
 ir:qsArr(p.ir).map(r=>({nm:qsStr(r.nm),v:irColors.map((_,i)=>qsStr((r.v||[])[i]))}))}};
const normQs=x=>{const o={id:String(x.id||uid())};['name','cat','spec','rev','usage','material','colorDesc','memo'].forEach(k=>o[k]=qsStr(x[k]));o.ir=!!x.ir;o.fav=!!x.fav;
 o.fabrics=qsArr(x.fabrics).map(f=>({id:String(f.id||uid()),name:qsStr(f.name),rows:qsArr(f.rows).map(normQsRow)}));o.patterns=qsArr(x.patterns).map(normQsPat);
 o.updated=String(x.updated||'');if(x.example)o.example=true;return o};
const qsLoad=r=>{const ok=r&&!Array.isArray(r);qualities=ok?qsArr(r.qualities).map(normQs):[];qsRecent=ok&&Array.isArray(r.qualityRecent)?r.qualityRecent.map(String).slice(0,5):[];if(ok&&r.qualityFilter&&typeof r.qualityFilter==='object')qsF={...qsF,...r.qualityFilter,k:''}};
const qsPayload=()=>({qualities,qualityRecent:qsRecent,qualityFilter:{cat:qsF.cat,ir:qsF.ir,sort:qsF.sort}});
function qsImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.qualities))qualities=raw.qualities.filter(x=>x&&typeof x==='object').map(normQs)}
const qsGet=id=>qualities.find(q=>q.id===id);
const qsMeta=q=>[q.spec&&'규격 '+q.spec,q.rev&&'개정 '+q.rev,'원단 '+q.fabrics.length].filter(Boolean).join(' · ');
(function(){const s=document.createElement('style');s.textContent=`
#p_quality .qsw{display:grid;grid-template-columns:290px minmax(0,1fr);gap:14px;align-items:start}
.qsl{background:#fff;border-radius:10px;box-shadow:0 1px 3px #0001;position:sticky;top:0;max-height:calc(100vh - 110px);display:flex;flex-direction:column;overflow:hidden}
.qsl .top{padding:10px;border-bottom:1px solid #e5e5e5;flex:none}.qsl .top input{width:100%;box-sizing:border-box;margin-bottom:6px}.qsl .top .rw{display:flex;gap:4px;flex-wrap:wrap}.qsl .top select{font-size:12px;padding:4px}
.qsl .lst{overflow:auto;flex:1}.qsg{padding:6px 10px;background:#f5f7fa;font-weight:bold;font-size:12px;color:#456;border-bottom:1px solid #eee;cursor:pointer;user-select:none}
.qsi{padding:7px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;border-left:3px solid transparent;display:flex;gap:6px;align-items:flex-start}.qsi:hover{background:#f7f9fc}.qsi.sel{background:#e8f0fe;border-left-color:#2271b1}
.qsi .nm{flex:1;min-width:0}.qsi b{font-size:13px}.qsi small{display:block;color:#789;font-size:11px}.qsi .st{color:#bbb;cursor:pointer;font-size:14px}.qsi .st.on{color:#e0a800}
.qshd{display:flex;gap:10px;align-items:flex-start}.qshd h2{margin:0 0 4px;font-size:18px}.qspill{background:#e8f0fe;color:#1a56b8;border-radius:10px;padding:2px 8px;font-size:12px;margin-left:6px;font-weight:normal}
.qstabs{display:flex;gap:2px;flex-wrap:wrap;margin:0 0 -1px}.qstabs span{padding:7px 11px;background:#e3e7ee;border-radius:6px 6px 0 0;font-size:12px;cursor:pointer}.qstabs span.on{background:#fff;font-weight:bold;color:#2271b1;box-shadow:0 -1px 2px #0001}
.qsbody{background:#fff;border-radius:0 10px 10px 10px;padding:14px;box-shadow:0 1px 3px #0001}
.qsinfo{display:grid;grid-template-columns:60px 1fr;gap:3px 10px;font-size:12px;margin-bottom:10px}.qsinfo span{color:#567}
.qsbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
table.qst{border-collapse:collapse;width:100%;min-width:0;font-size:12px;table-layout:fixed}table.qst th,table.qst td{border:1px solid #e1e4ea;padding:5px 6px;text-align:center;overflow:hidden;text-overflow:ellipsis}table.qst th{background:#f3f5f8;position:relative}
table.qst tr.r{cursor:pointer}table.qst tr.r:hover td{background:#f7f9fc}table.qst td.l{text-align:left}
.qscol{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}.qscol h3{font-size:13px;margin:0 0 6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.qstag{background:#e8f0fe;color:#1a56b8;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:normal}.qstag.g{background:#e6f4ea;color:#1e7e34}
.qsir{max-height:62vh;overflow:auto}
.qsempty{background:#fff;border-radius:10px;padding:50px 20px;text-align:center;color:#777;box-shadow:0 1px 3px #0001}
#p_testrpt.cmpon{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(420px,46%);gap:14px;align-items:start}#p_testrpt:not(.on){display:none!important}
#trcmp{display:none;position:sticky;top:0;max-height:calc(100vh - 110px);overflow:auto}#p_testrpt.cmpon #trcmp{display:block}
#trcmp .hd{display:flex;align-items:center;gap:8px;margin-bottom:6px}#trcmp .hd b{font-size:15px;flex:1}
.cmpsum{border-radius:6px;padding:8px 10px;margin:8px 0;font-weight:bold;font-size:12px;background:#eef2f6}.cmpsum.ng{background:#fdecea;color:#c0392b}.cmpsum.ok{background:#e6f4ea;color:#1e7e34}
table.qst tr.x td{background:#fdecea}.cmpo{color:#1e7e34;font-weight:bold}.cmpx{color:#c0392b;font-weight:bold}table.qst input{width:100%;box-sizing:border-box;padding:3px 4px;text-align:center;font-size:12px}
#trcmp details{background:#f5f7fa;border-radius:6px;margin-top:8px;padding:6px 8px}#trcmp summary{cursor:pointer;font-weight:bold;font-size:12px}
.trt tr.r.cur td{background:#e8f0fe}`;document.head.appendChild(s)})();

// ---- 목록 ----
function qsList(){const k=gsN(qsF.k);return qualities.filter(q=>(!qsF.cat||q.cat===qsF.cat)&&(!qsF.ir||(qsF.ir==='y')===q.ir)&&(!k||gsN([q.name,q.cat,q.spec,q.usage,q.material,...q.fabrics.flatMap(f=>[f.name,...f.rows.flatMap(r=>[r.item,r.method])])].join(' ')).includes(k)))
 .sort((a,b)=>qsF.sort==='rev'?(b.rev||'').localeCompare(a.rev||'')||a.name.localeCompare(b.name,'ko'):a.name.localeCompare(b.name,'ko'))}
function qsItemHTML(q){return `<div class="qsi${q.id===qsSel?' sel':''}" onclick="qsPick('${q.id}')"><span class="st${q.fav?' on':''}" title="즐겨찾기" onclick="event.stopPropagation();qsFav('${q.id}')">${q.fav?'★':'☆'}</span><div class="nm"><b>${esc(q.name)}</b>${q.example?' <small style="display:inline" class="muted">(예시)</small>':''}<small>${esc(qsMeta(q))}</small></div></div>`}
function renderQuality(){const pg=$('p_quality');if(!pg)return;
 if(!pg.querySelector('.qsw'))pg.innerHTML=`<div class="qsw"><div class="qsl"><div class="top"><input id="qsk" placeholder="🔍 품목명·규격서 번호·원단·시험방법" oninput="qsF.k=this.value;qsRenderList()"><div class="rw"><select id="qscat" onchange="qsF.cat=this.value;save();qsRenderList()"></select><select id="qsir" onchange="qsF.ir=this.value;save();qsRenderList()"><option value="">IR 적용: 전체</option><option value="y">IR 적용</option><option value="n">IR 미적용</option></select><select id="qssrt" onchange="qsF.sort=this.value;save();qsRenderList()"><option value="name">이름순</option><option value="rev">개정일순</option></select><span style="flex:1"></span><button class="p" onclick="qsEdit()">+ 추가</button></div></div><div class="lst" id="qslst"></div></div><div id="qsdet"></div></div>`;
 qsRenderList();qsRenderDet()}
function qsRenderList(){const el=$('qslst');if(!el)return;const cats=[...new Set(qualities.map(q=>q.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
 const cs=$('qscat');cs.innerHTML='<option value="">분류: 전체</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');cs.value=cats.includes(qsF.cat)?qsF.cat:'';$('qsir').value=qsF.ir;$('qssrt').value=qsF.sort;
 const L=qsList();if(!qualities.length){el.innerHTML='<div class="muted" style="padding:16px;font-size:12px">등록된 품목이 없습니다. [+ 추가]로 조달청 규격서의 품목을 등록하세요.</div>';return}
 if(!L.length){el.innerHTML='<div class="muted" style="padding:16px;font-size:12px">조건에 맞는 품목이 없습니다.</div>';return}
 const top=[...L.filter(q=>q.fav),...qsRecent.map(qsGet).filter(q=>q&&!q.fav&&L.includes(q))];
 const grp=new Map();L.forEach(q=>{const c=q.cat||'(분류 없음)';if(!grp.has(c))grp.set(c,[]);grp.get(c).push(q)});
 el.innerHTML=(top.length?`<div class="qsg">★ 즐겨찾기 · 최근 본 품목</div>${top.map(qsItemHTML).join('')}`:'')+[...grp].sort(([a],[b])=>a.localeCompare(b,'ko')).map(([c,l])=>`<div class="qsg" data-c="${esc(c)}" onclick="qsFold[this.dataset.c]=!qsFold[this.dataset.c];qsRenderList()">${qsFold[c]?'▸':'▾'} ${esc(c)} (${l.length})</div>${qsFold[c]?'':l.map(qsItemHTML).join('')}`).join('')}
function qsPick(id){qsSel=id;qsTab='';qsPat='';qsRecent=[id,...qsRecent.filter(x=>x!==id)].slice(0,5);save();qsRenderList();qsRenderDet()}
function qsFav(id){const q=qsGet(id);if(!q)return;q.fav=!q.fav;save();qsRenderList()}
// ---- 상세 ----
function qsRowsHTML(f){let prev=null;return f.rows.map(r=>{const same=prev!==null&&r.item===prev;prev=r.item;return `<tr class="r" onclick="qsRowEdit('${f.id}','${r.id}')"><td>${same?'':esc(r.item)}</td><td>${esc(r.div)||'-'}</td><td>${esc(r.std)}</td><td>${esc(r.unit)}</td><td>${esc(r.method)}</td></tr>`}).join('')}
const QS_ROWT=(id,body)=>`<table class="qst" data-rz="${id}"><colgroup><col style="width:18%"><col style="width:12%"><col style="width:20%"><col style="width:12%"><col></colgroup><thead><tr><th>항목</th><th>구분</th><th>기준</th><th>단위</th><th>시험방법</th></tr></thead><tbody>${body}</tbody></table>`;
function qsRenderDet(){const el=$('qsdet');if(!el)return;const q=qsGet(qsSel);
 if(!q){el.innerHTML=`<div class="qsempty">${qualities.length?'왼쪽 목록에서 품목을 선택하세요.':'조달청 규격서의 품질 기준을 품목 → 원단 → 시험항목 순서로 등록해 두면, TEST REPORT 결과와 바로 비교할 수 있어요.<br><br><button class="p" onclick="qsEdit()">+ 품목 추가</button>'}</div>`;return}
 if(qsTab!=='color'&&!q.fabrics.some(f=>f.id===qsTab))qsTab=q.fabrics[0]?q.fabrics[0].id:'color';
 const tabs=q.fabrics.map(f=>`<span class="${f.id===qsTab?'on':''}" onclick="qsTab='${f.id}';qsRenderDet()" ondblclick="qsFabEdit('${f.id}')" title="더블클릭: 이름 변경·삭제">${esc(f.name)||'(이름 없음)'}</span>`).join('')+`<span class="${qsTab==='color'?'on':''}" onclick="qsTab='color';qsRenderDet()">무늬·색상</span><span onclick="qsFabEdit()" title="원단 탭 추가">+ 원단</span>`;
 let body;
 if(qsTab==='color'){if(!q.patterns.some(p=>p.id===qsPat))qsPat=q.patterns[0]?q.patterns[0].id:'';const p=q.patterns.find(x=>x.id===qsPat);
  body=`<div class="qsbar">${q.patterns.map(x=>`<button class="${x.id===qsPat?'p':''}" onclick="qsPat='${x.id}';qsRenderDet()">${esc(x.name)||'(무늬)'}</button>`).join('')}<button onclick="qsPatEdit()">+ 무늬</button>${p&&p.applies?`<span class="muted" style="margin-left:6px">적용 원단:</span>${p.applies.split(/[,·]/).map(s=>s.trim()).filter(Boolean).map(s=>`<span class="qstag g">${esc(s)}</span>`).join('')}`:''}<span style="flex:1"></span>${p?`<button onclick="qsPatEdit('${p.id}')">✎ 편집</button>`:''}</div>`+
  (p?`<div class="qscol"><div><h3>염색견뢰도 ${p.grade?`<span class="qstag">${esc(p.grade)}</span>`:''}</h3>${p.fast.length?`<table class="qst" data-rz="qs_fast"><colgroup><col style="width:28%"><col><col><col><col><col><col><col></colgroup><thead><tr><th>색상</th>${QS_FAST.map(t=>`<th>${t.replace(' ','<br>')}</th>`).join('')}</tr></thead><tbody>${p.fast.map(f=>`<tr><td class="l">${esc(f.color)}</td>${f.v.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="muted" style="font-size:11px;margin-top:6px">값은 "급 이상"으로 비교 → TEST REPORT 결과와 자동 비교</div>`:'<div class="muted" style="font-size:12px">[✎ 편집]에서 입력하세요.</div>'}</div>
  <div><h3>적외선 반사율(%) ${p.irMethod?`<span class="muted" style="font-weight:normal">시험법 ${esc(p.irMethod)}</span>`:''}</h3>${p.ir.length&&p.irColors.length?`<div class="qsir"><table class="qst" data-rz="qs_ir"><colgroup><col style="width:70px">${p.irColors.map(()=>'<col>').join('')}</colgroup><thead><tr><th>파장(nm)</th>${p.irColors.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${p.ir.map(r=>`<tr><td><b>${esc(r.nm)}</b></td>${r.v.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="muted" style="font-size:12px">[✎ 편집]에서 입력하세요.</div>'}</div></div>`:'<div class="muted" style="font-size:12px">[+ 무늬]로 무늬(예: 5도 디지털무늬)를 추가하고 염색견뢰도·적외선 반사율 기준을 입력하세요.</div>');
 }else{const f=q.fabrics.find(x=>x.id===qsTab);
  body=`<div class="qsinfo">${q.usage?`<span>용도</span><div>${esc(q.usage)}</div>`:''}${q.material?`<span>재질</span><div>${esc(q.material)}</div>`:''}${q.colorDesc?`<span>색상</span><div>${esc(q.colorDesc)}</div>`:''}</div>
  <div class="qsbar"><button class="p" onclick="qsRowEdit('${f.id}')">+ 항목 추가</button><button onclick="qsCopy('${f.id}')">⧉ 품질기준 복사</button><span style="flex:1"></span><span class="muted" style="font-size:12px">행 클릭: 수정 · 탭 더블클릭: 원단 이름 변경</span></div>
  ${f.rows.length?QS_ROWT('qs_rows',qsRowsHTML(f)):'<div class="muted" style="font-size:12px">시험항목이 없습니다. [+ 항목 추가] 또는 [품질기준 복사]로 다른 원단의 기준을 가져오세요.</div>'}`}
 el.innerHTML=`<div class="card"><div class="qshd"><div style="flex:1"><h2>${esc(q.name)}${q.ir?'<span class="qspill">IR 적용</span>':''}${q.example?' <small class="muted">(예시)</small>':''}</h2><div class="muted" style="font-size:12px">${esc([q.cat,q.spec&&'규격서 번호 '+q.spec,q.rev&&'개정일 '+q.rev].filter(Boolean).join(' · '))}</div>${q.memo?`<div style="font-size:12px;margin-top:4px">${esc(q.memo)}</div>`:''}</div><button onclick="qsEdit('${q.id}')">✎ 편집</button></div></div><div class="qstabs">${tabs}</div><div class="qsbody">${body}</div>`;
 crInit()}
// ---- 품목 추가/수정 ----
function qsEdit(id){const q=id?qsGet(id):{name:'',cat:'',spec:'',rev:'',ir:false,usage:'',material:'',colorDesc:'',memo:''};if(!q)return;
 const cats=[...new Set(qualities.map(x=>x.cat).filter(Boolean))],inp=(k,t,o='')=>`<label>${t}<input id="qs_${k}" value="${esc(q[k])}"${o}></label>`;
 $('dt').textContent=id?'품목 수정':'품목 추가';
 $('dbody').innerHTML=`<div class="trform">${inp('name','품목명 *',' style="width:100%"')}<div class="trg">${inp('cat','분류',' list="qscats" placeholder="예: 배낭·가방류"')}${inp('spec','규격서 번호')}<label>개정일<input id="qs_rev" type="date" value="${esc(q.rev)}"></label><label style="flex-direction:row;align-items:center;gap:6px;display:flex;margin-top:18px"><input type="checkbox" id="qs_ir" ${q.ir?'checked':''}> IR 적용</label></div>
 ${inp('usage','용도',' style="width:100%"')}${inp('material','재질',' style="width:100%"')}${inp('colorDesc','색상',' style="width:100%"')}<label>메모<textarea id="qs_memo" rows="2">${esc(q.memo)}</textarea></label>${id?'':'<div class="muted" style="font-size:12px">저장하면 첫 원단 탭 "원단 1"이 만들어집니다. 탭을 더블클릭해 이름(예: 몸체)을 바꾸세요.</div>'}
 <datalist id="qscats">${cats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="qsSave('${id||''}')">확인</button><button onclick="dlg.close()">취소</button>${id?`<span style="flex:1"></span><button class="d" onclick="qsDel('${id}')">삭제</button>`:''}`;
 if(!dlg.open)dlg.showModal();setTimeout(()=>$('qs_name').focus(),0)}
function qsSave(id){const o={};['name','cat','spec','rev','usage','material','colorDesc','memo'].forEach(k=>o[k]=$('qs_'+k).value);o.ir=$('qs_ir').checked;if(!o.name.trim())return uiAlert('품목명을 입력하세요.');
 if(id){const i=qualities.findIndex(q=>q.id===id);if(i<0)return;qualities[i]=normQs({...qualities[i],...o,example:false,updated:now()})}
 else{const q=normQs({...o,fabrics:[{name:'원단 1',rows:[]}],updated:now()});qualities.push(q);qsSel=q.id;qsTab=''}
 save();dlg.close();render();toast(id?'수정했어요':'추가했어요')}
async function qsDel(id){const q=qsGet(id);if(!q)return;const n=trs.filter(t=>t.qs&&t.qs.id===id).length;
 if(!await uiConfirm(`'${q.name}' 품질 기준을 삭제할까요?${n?`\nTEST REPORT ${n}건의 기준 연결도 해제됩니다.`:''}`))return;
 qualities=qualities.filter(x=>x.id!==id);trs.forEach(t=>{if(t.qs&&t.qs.id===id)delete t.qs});if(qsSel===id)qsSel='';save();if(dlg.open)dlg.close();render();toast('삭제했어요')}
// ---- 원단 탭 ----
function qsFabEdit(fid){const q=qsGet(qsSel);if(!q)return;const f=fid?q.fabrics.find(x=>x.id===fid):{name:''};if(!f)return;
 $('dt').textContent=fid?'원단 탭 수정':'원단 탭 추가';$('dbody').innerHTML=`<div class="trform"><label>원단 이름 *<input id="qf_name" value="${esc(f.name)}" placeholder="예: 몸체, 몸체 보강, 덮개" style="width:100%"></label></div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="qsFabSave('${fid||''}')">확인</button><button onclick="dlg.close()">취소</button>${fid?`<span style="flex:1"></span><button class="d" onclick="qsFabDel('${fid}')">탭 삭제</button>`:''}`;if(!dlg.open)dlg.showModal();setTimeout(()=>$('qf_name').focus(),0)}
function qsFabSave(fid){const q=qsGet(qsSel),n=$('qf_name').value.trim();if(!q)return;if(!n)return uiAlert('원단 이름을 입력하세요.');
 if(fid){const f=q.fabrics.find(x=>x.id===fid);if(f)f.name=n}else{const f={id:uid(),name:n,rows:[]};q.fabrics.push(f);qsTab=f.id}q.updated=now();save();dlg.close();render()}
async function qsFabDel(fid){const q=qsGet(qsSel);if(!q)return;const f=q.fabrics.find(x=>x.id===fid);if(!f)return;if(!await uiConfirm(`'${f.name}' 원단 탭과 시험항목 ${f.rows.length}개를 삭제할까요?`))return;
 q.fabrics=q.fabrics.filter(x=>x.id!==fid);q.updated=now();save();if(dlg.open)dlg.close();render()}
// ---- 시험항목 ----
function qsRowEdit(fid,rid){const q=qsGet(qsSel),f=q&&q.fabrics.find(x=>x.id===fid);if(!f)return;const r=rid?f.rows.find(x=>x.id===rid):{item:'',div:'',std:'',unit:'',method:''};if(!r)return;
 const prev=!rid&&f.rows.length?f.rows[f.rows.length-1]:null,inp=(k,t,ph='')=>`<label>${t}<input id="qr_${k}" value="${esc(r[k])}" placeholder="${ph}"></label>`;
 $('dt').textContent=(rid?'시험항목 수정':'시험항목 추가')+' — '+f.name;
 $('dbody').innerHTML=`<div class="trform"><div class="trg">${inp('item','항목 *',prev?esc(prev.item):'예: 인장강도')}${inp('div','구분','예: 경사')}${inp('std','기준','예: 1,540 이상')}${inp('unit','단위','예: N')}</div>${inp('method','시험방법','예: KS K 0520 그래브법')}
 <div class="muted" style="font-size:12px">기준 예: "240 이상", "4 이하", "±2", "18-32", "3-4급 이상". 이런 형식이면 TEST REPORT 결과로 O/X가 자동 판정돼요.${prev?' 항목을 비우면 바로 위 항목('+esc(prev.item)+')과 같게 저장돼요.':''}</div></div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="qsRowSave('${fid}','${rid||''}')">확인</button><button onclick="dlg.close()">취소</button>${rid?`<span style="flex:1"></span><button onclick="qsRowMove('${fid}','${rid}',-1)">▲</button><button onclick="qsRowMove('${fid}','${rid}',1)">▼</button><button class="d" onclick="qsRowDel('${fid}','${rid}')">삭제</button>`:''}`;if(!dlg.open)dlg.showModal();setTimeout(()=>$('qr_item').focus(),0)}
function qsRowSave(fid,rid){const q=qsGet(qsSel),f=q&&q.fabrics.find(x=>x.id===fid);if(!f)return;const o={};['item','div','std','unit','method'].forEach(k=>o[k]=$('qr_'+k).value);
 if(!o.item.trim()&&!rid&&f.rows.length)o.item=f.rows[f.rows.length-1].item;if(!o.item.trim())return uiAlert('항목을 입력하세요.');
 if(rid){const i=f.rows.findIndex(x=>x.id===rid);if(i>=0)f.rows[i]=normQsRow({...f.rows[i],...o})}else f.rows.push(normQsRow(o));q.updated=now();q.example=false;save();dlg.close();render()}
function qsRowMove(fid,rid,d){const q=qsGet(qsSel),f=q&&q.fabrics.find(x=>x.id===fid);if(!f)return;const i=f.rows.findIndex(x=>x.id===rid),j=i+d;if(i<0||j<0||j>=f.rows.length)return;[f.rows[i],f.rows[j]]=[f.rows[j],f.rows[i]];save();render()}
async function qsRowDel(fid,rid){const q=qsGet(qsSel),f=q&&q.fabrics.find(x=>x.id===fid);if(!f)return;if(!await uiConfirm('이 시험항목을 삭제할까요?'))return;f.rows=f.rows.filter(x=>x.id!==rid);save();if(dlg.open)dlg.close();render()}
// ---- 품질기준 복사 (다른 품목·원단의 시험항목을 현재 원단으로) ----
function qsCopy(fid){const q=qsGet(qsSel),f=q&&q.fabrics.find(x=>x.id===fid);if(!f)return;
 const src=qualities.flatMap(x=>x.fabrics.filter(y=>y.id!==fid&&y.rows.length).map(y=>[x.id+'|'+y.id,`${x.name} › ${y.name} (${y.rows.length}항목)`]));
 if(!src.length)return uiAlert('복사할 수 있는 다른 원단의 품질 기준이 없습니다.');
 $('dt').textContent='품질기준 복사 → '+f.name;$('dbody').innerHTML=`<div class="trform"><label>가져올 품질 기준<select id="qc_src" style="width:100%">${src.map(([v,t])=>`<option value="${v}">${esc(t)}</option>`).join('')}</select></label>
 <label style="display:flex;flex-direction:row;gap:6px;align-items:center"><input type="checkbox" id="qc_rep" ${f.rows.length?'':'checked'}> 현재 시험항목 ${f.rows.length}개를 지우고 바꾸기 (체크 안 하면 아래에 덧붙임)</label></div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="qsCopyRun('${fid}')">확인</button><button onclick="dlg.close()">취소</button>`;if(!dlg.open)dlg.showModal()}
function qsCopyRun(fid){const q=qsGet(qsSel),f=q&&q.fabrics.find(x=>x.id===fid);if(!f)return;const [a,b]=$('qc_src').value.split('|'),s=qsGet(a),sf=s&&s.fabrics.find(x=>x.id===b);if(!sf)return;
 const rows=sf.rows.map(r=>normQsRow({...r,id:''}));f.rows=$('qc_rep').checked?rows:[...f.rows,...rows];q.updated=now();save();dlg.close();render();toast(`${rows.length}개 항목을 복사했어요`)}
// ---- 무늬·색상 ----
const qsTsv=(h,rows)=>[h.join('\t'),...rows.map(r=>r.join('\t'))].join('\n');
const qsParse=t=>String(t||'').split(/\r?\n/).map(l=>l.split('\t').map(qsStr)).filter(r=>r.some(Boolean));
function qsIrDefault(){const a=[];for(let n=600;n<=1040;n+=20)a.push(String(n));return a}
function qsPatEdit(pid){const q=qsGet(qsSel);if(!q)return;const p=pid?q.patterns.find(x=>x.id===pid):{name:'',applies:'',grade:'',fast:[],irMethod:'',irColors:[],ir:[]};if(!p)return;
 const fastT=p.fast.length?qsTsv(['색상',...QS_FAST],p.fast.map(f=>[f.color,...f.v])):'색상\t'+QS_FAST.join('\t');
 const irT=p.ir.length?qsTsv(['파장(nm)',...p.irColors],p.ir.map(r=>[r.nm,...r.v])):qsTsv(['파장(nm)'],qsIrDefault().map(n=>[n]));
 $('dt').textContent=pid?'무늬·색상 기준 수정':'무늬 추가';
 $('dbody').innerHTML=`<div class="trform"><div class="trg"><label>무늬 이름 *<input id="qp_name" value="${esc(p.name)}" placeholder="예: 5도 디지털무늬"></label><label style="grid-column:span 2">적용 원단 (쉼표로 구분)<input id="qp_app" value="${esc(p.applies)}" placeholder="${esc(q.fabrics.map(f=>f.name).join(', '))}"></label><label>등급·조건<input id="qp_grade" value="${esc(p.grade)}" placeholder="예: N85급"></label></div>
 <label>염색견뢰도 (엑셀에서 표를 복사해 붙여넣기 · 첫 줄은 머리글, 값은 "급 이상")<textarea id="qp_fast" rows="6" style="font-family:monospace;white-space:pre">${esc(fastT)}</textarea></label>
 <div class="trg"><label style="grid-column:span 2">적외선 반사율 시험법<input id="qp_irm" value="${esc(p.irMethod)}" placeholder="예: KDS 8305-1044"></label></div>
 <label>적외선 반사율(%) 범위표 (첫 줄: 파장(nm) + 색상 이름들, 값 예: 18-32)<textarea id="qp_ir" rows="8" style="font-family:monospace;white-space:pre">${esc(irT)}</textarea></label></div>`;
 $('dfoot').innerHTML=`<button class="p" onclick="qsPatSave('${pid||''}')">확인</button><button onclick="dlg.close()">취소</button>${pid?`<span style="flex:1"></span><button class="d" onclick="qsPatDel('${pid}')">무늬 삭제</button>`:''}`;if(!dlg.open)dlg.showModal();setTimeout(()=>$('qp_name').focus(),0)}
function qsPatSave(pid){const q=qsGet(qsSel);if(!q)return;const name=$('qp_name').value.trim();if(!name)return uiAlert('무늬 이름을 입력하세요.');
 const F=qsParse($('qp_fast').value),fast=(F[0]&&/색상|color/i.test(F[0][0])?F.slice(1):F).filter(r=>r[0]).map(r=>({color:r[0],v:QS_FAST.map((_,i)=>r[i+1]||'')}));
 const I=qsParse($('qp_ir').value),hd=I[0]&&!/^\d/.test(I[0][0])?I[0]:null,irColors=hd?hd.slice(1).filter(Boolean):[],ir=(hd?I.slice(1):I).filter(r=>r[0]&&r.slice(1).some(Boolean)).map(r=>({nm:r[0],v:irColors.map((_,i)=>r[i+1]||'')}));
 const o=normQsPat({id:pid||uid(),name,applies:$('qp_app').value,grade:$('qp_grade').value,irMethod:$('qp_irm').value,fast,irColors,ir});
 if(pid){const i=q.patterns.findIndex(x=>x.id===pid);if(i>=0)q.patterns[i]=o}else q.patterns.push(o);qsPat=o.id;q.updated=now();save();dlg.close();render()}
async function qsPatDel(pid){const q=qsGet(qsSel);if(!q)return;if(!await uiConfirm('이 무늬의 염색견뢰도·적외선 반사율 기준을 삭제할까요?'))return;q.patterns=q.patterns.filter(x=>x.id!==pid);save();if(dlg.open)dlg.close();render()}

// ===== 판정: 기준 문자열 vs 결과 =====
const qsNum=s=>{s=String(s||'').replace(/,/g,'').replace(/급/g,'').trim();const m=s.match(/^(\d+)\s*-\s*(\d+)$/);if(m&&+m[2]-+m[1]===1)return (+m[1]+ +m[2])/2;const n=s.match(/-?\d+(?:\.\d+)?/);return n?+n[0]:NaN};
function qsJudge(std,res){std=String(std||'').replace(/,/g,'').trim();res=String(res||'').trim();if(!res||!std||std==='-')return null;
 const v=qsNum(res);let m;
 if((m=std.match(/^±\s*(\d+(?:\.\d+)?)/)))return isNaN(v)?null:Math.abs(v)<=+m[1];
 if((m=std.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|~)\s*(\d+(?:\.\d+)?)\s*급?\s*이상/)))return isNaN(v)?null:v>=(+m[1]+ +m[2])/2;
 if((m=std.match(/^(-?\d+(?:\.\d+)?)\s*[^\d\s]*\s*이상/)))return isNaN(v)?null:v>=+m[1];
 if((m=std.match(/^(-?\d+(?:\.\d+)?)\s*[^\d\s]*\s*이하/)))return isNaN(v)?null:v<=+m[1];
 if((m=std.match(/^(-?\d+(?:\.\d+)?)\s*[^\d\s]*\s*초과/)))return isNaN(v)?null:v>+m[1];
 if((m=std.match(/^(-?\d+(?:\.\d+)?)\s*[^\d\s]*\s*미만/)))return isNaN(v)?null:v<+m[1];
 if((m=std.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|~)\s*(-?\d+(?:\.\d+)?)$/)))return isNaN(v)?null:v>=+m[1]&&v<=+m[2];
 if(/^-?\d+(?:\.\d+)?$/.test(std))return isNaN(v)?null:v>=+std; // 견뢰도 등급 숫자만 = "급 이상"
 return gsN(res)===gsN(std)?true:gsN(res).includes(gsN(std))?true:null}
const qsOX=j=>j===true?'<span class="cmpo">O</span>':j===false?'<span class="cmpx">X</span>':'<small class="muted">-</small>';

// ===== TEST REPORT 기준 비교 패널 =====
let trCmpId='';
function trRow(id){trCmpId=trCmpId===id?'':id;trCmpRender();render()}
function trCmpClose(){trCmpId='';trCmpRender();render()}
function trCmpGuess(t){const n=gsN(t.name);let best=null,bl=0;qualities.forEach(q=>{const k=gsN(q.name).replace(/\(예시\)/g,'');if(k&&n.includes(k)&&k.length>bl){best=q;bl=k.length}});if(!best)return null;
 const f=best.fabrics.find(f=>f.name&&n.includes(gsN(f.name)))||best.fabrics[0];return {id:best.id,fab:f?f.id:'',res:{}}}
function trCmpLink(){const t=trs.find(x=>x.id===trCmpId);if(!t)return;const q=qsGet($('tc_q').value);t.qs=q?{id:q.id,fab:(q.fabrics.find(f=>f.id===$('tc_f').value)||q.fabrics[0]||{}).id||'',res:(t.qs&&t.qs.res)||{}}:undefined;if(!q)delete t.qs;trCmpRender()}
function trCmpQ(){const t=trs.find(x=>x.id===trCmpId);if(!t)return;const q=qsGet($('tc_q').value);if(q){t.qs={id:q.id,fab:(q.fabrics[0]||{}).id||'',res:(t.qs&&t.qs.res)||{}}}else delete t.qs;trCmpRender()}
function trCmpCalc(t,q,f){const res=(t.qs&&t.qs.res)||{},L=[];let prev=null;
 (f?f.rows:[]).forEach(r=>{const j=qsJudge(r.std,res[r.id]);L.push({k:r.id,item:r.item,div:r.div,same:r.item===prev,j,label:r.item+(r.div&&r.div!=='-'?`(${r.div})`:'')});prev=r.item});
 const pats=q?q.patterns.filter(p=>!p.applies||!f||p.applies.split(/[,·]/).map(s=>gsN(s)).includes(gsN(f.name))):[];
 pats.forEach(p=>{p.fast.forEach((c,ci)=>c.v.forEach((sv,i)=>{const k=`F|${p.id}|${ci}|${i}`;if(!sv||!res[k])return;L.push({k,j:qsJudge(/이상|이하/.test(sv)?sv:sv+' 이상',res[k]),label:`견뢰도 ${c.color} ${QS_FAST[i]}`,fast:1})}));
  p.ir.forEach((r,ri)=>r.v.forEach((sv,i)=>{const k=`I|${p.id}|${ri}|${i}`;if(!sv||!res[k])return;L.push({k,j:qsJudge(sv,res[k]),label:`IR ${p.irColors[i]} ${r.nm}nm`,ir:1})}))});
 return {L,pats}}
function trCmpRender(){const sec=$('p_testrpt'),el=$('trcmp');if(!sec||!el)return;const t=trs.find(x=>x.id===trCmpId);sec.classList.toggle('cmpon',!!t);if(!t){el.innerHTML='';return}
 if(!t.qs){const g=trCmpGuess(t);if(g)t.qs=g}
 const q=t.qs&&qsGet(t.qs.id),f=q&&(q.fabrics.find(x=>x.id===t.qs.fab)||q.fabrics[0]),res=(t.qs&&t.qs.res)||{};
 const {L,pats}=q?trCmpCalc(t,q,f):{L:[],pats:[]},ok=L.filter(x=>x.j===true).length,ng=L.filter(x=>x.j===false),done=ok+ng.length;
 const iv=k=>`<input data-k="${esc(k)}" value="${esc(res[k]||'')}" oninput="trCmpIn(this)">`;
 const rowsH=f?f.rows.map((r,i)=>{const j=qsJudge(r.std,res[r.id]),same=i>0&&f.rows[i-1].item===r.item;return `<tr class="${j===false?'x':''}"><td>${same?'':esc(r.item)}</td><td>${esc(r.div)||'-'}</td><td>${esc(r.std)}</td><td>${esc(r.unit)}</td><td>${iv(r.id)}</td><td>${qsOX(j)}</td><td>${same?'':esc(r.method)}</td></tr>`}).join(''):'';
 const patH=pats.map(p=>(p.fast.length?`<details${p.fast.some((c,ci)=>c.v.some((_,i)=>res[`F|${p.id}|${ci}|${i}`]))?' open':''}><summary>염색견뢰도 (${esc(p.name)} · ${p.fast.length}색)</summary><table class="qst" style="margin-top:6px"><thead><tr><th>색상</th>${QS_FAST.map(x=>`<th>${x.replace(' ','<br>')}</th>`).join('')}</tr></thead><tbody>${p.fast.map((c,ci)=>`<tr><td class="l">${esc(c.color)}</td>${c.v.map((sv,i)=>{const k=`F|${p.id}|${ci}|${i}`,j=sv?qsJudge(/이상|이하/.test(sv)?sv:sv+' 이상',res[k]):null;return `<td${j===false?' style="background:#fdecea"':''}><small class="muted">${esc(sv)}↑</small>${sv?iv(k):''}<span class="ox">${qsOX(j)}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></details>`:'')+
  (p.ir.length?`<details${p.ir.some((r,ri)=>r.v.some((_,i)=>res[`I|${p.id}|${ri}|${i}`]))?' open':''}><summary>적외선 반사율 (${esc(p.name)} · ${esc(p.ir[0].nm)}~${esc(p.ir[p.ir.length-1].nm)}nm)</summary><table class="qst" style="margin-top:6px"><thead><tr><th>nm</th>${p.irColors.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${p.ir.map((r,ri)=>`<tr><td><b>${esc(r.nm)}</b></td>${r.v.map((sv,i)=>{const k=`I|${p.id}|${ri}|${i}`,j=qsJudge(sv,res[k]);return `<td${j===false?' style="background:#fdecea"':''}><small class="muted">${esc(sv)}</small>${sv?iv(k):''}<span class="ox">${qsOX(j)}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></details>`:'')).join('');
 el.innerHTML=`<div class="hd"><b>${esc(t.no||t.name)} · 기준 비교</b>${wfCell(t,wfFiles.filter(f=>f.orderId===t.id),'tr').replace(/^<td/,'<span').replace(/<\/td>$/,'</span>')}<button onclick="trOpen('${t.id}')">성적서 수정</button><button onclick="trCmpClose()" title="닫기">✕</button></div>
 <div class="muted" style="font-size:12px;margin-bottom:6px">${esc(t.name)}${t.lab?' · '+esc(t.lab):''}${t.done?' · 완료 '+esc(t.done):''}</div>
 ${qualities.length?`<div class="qsbar"><span style="font-size:12px">연결된 품질 기준</span><select id="tc_q" onchange="trCmpQ()"><option value="">(연결 안 함)</option>${qualities.map(x=>`<option value="${x.id}"${q&&q.id===x.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select>${q?`<select id="tc_f" onchange="trCmpLink()">${q.fabrics.map(x=>`<option value="${x.id}"${f&&f.id===x.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select><a href="#" onclick="event.preventDefault();go('quality');qsPick('${q.id}');qsTab='${f?f.id:''}';qsRenderDet()" style="font-size:12px">↗ 기준 보기</a>`:''}</div>`
  :'<div class="muted" style="font-size:12px">등록된 품질 기준이 없습니다. [품질 기준] 메뉴에서 품목을 먼저 등록하세요.</div>'}
 ${q?`<div class="cmpsum ${ng.length?'ng':done&&done===L.length?'ok':''}" id="tc_sum">${trCmpSum(L)}</div>
 ${f&&f.rows.length?`<table class="qst" data-rz="tr_cmp"><colgroup><col style="width:15%"><col style="width:9%"><col style="width:15%"><col style="width:10%"><col style="width:17%"><col style="width:8%"><col></colgroup><thead><tr><th>항목</th><th>구분</th><th>기준</th><th>단위</th><th>결과</th><th>판정</th><th>시험방법</th></tr></thead><tbody>${rowsH}</tbody></table>`:'<div class="muted" style="font-size:12px">이 원단에 시험항목이 없습니다.</div>'}
 ${patH}<div class="muted" style="font-size:11px;margin:8px 0">※ 결과를 입력하면 판정이 자동 계산되고, 저장하면 목록의 결과·불합격 항목 칸이 자동으로 채워져요.</div>
 <div class="df" style="justify-content:flex-start;padding:0"><button class="p" onclick="trCmpSave()">확인</button><button onclick="trCmpClose()">취소</button></div>`:''}`;
 crInit()}
function trCmpSum(L){const ok=L.filter(x=>x.j===true).length,ng=L.filter(x=>x.j===false),pend=L.length-ok-ng.length;
 return `총 ${L.length}항목 · 합격 ${ok} · 불합격 ${ng.length}${pend?` · 미입력 ${pend}`:''}${ng.length?' → 불합격':pend?'':' → 합격'}`}
function trCmpIn(inp){const t=trs.find(x=>x.id===trCmpId);if(!t||!t.qs)return;t.qs.res=t.qs.res||{};const v=inp.value.trim();if(v)t.qs.res[inp.dataset.k]=v;else delete t.qs.res[inp.dataset.k];
 const q=qsGet(t.qs.id),f=q&&(q.fabrics.find(x=>x.id===t.qs.fab)||q.fabrics[0]),{L}=trCmpCalc(t,q,f),me=L.find(x=>x.k===inp.dataset.k),td=inp.closest('td'),tr=inp.closest('tr');
 if(!me&&td&&inp.dataset.k.includes('|')){td.style.background='';const o=td.querySelector('.ox');if(o)o.innerHTML=qsOX(null)}
 if(me){if(tr&&!me.fast&&!me.ir){tr.classList.toggle('x',me.j===false);const c=tr.cells[5];if(c)c.innerHTML=qsOX(me.j)}else if(td){td.style.background=me.j===false?'#fdecea':'';const o=td.querySelector('.ox');if(o)o.innerHTML=qsOX(me.j)}}
 const s=$('tc_sum'),ng=L.filter(x=>x.j===false).length,done=L.filter(x=>x.j!==null).length;if(s){s.className='cmpsum '+(ng?'ng':done&&done===L.length?'ok':'');s.textContent=trCmpSum(L)}}
function trCmpFail(L){const ng=L.filter(x=>x.j===false),o=[];ng.filter(x=>!x.fast&&!x.ir).forEach(x=>{if(!o.includes(x.label))o.push(x.label)});ng.filter(x=>x.fast).forEach(x=>o.push(x.label));
 const ir=ng.filter(x=>x.ir).length;if(ir)o.push(`적외선 반사율 ${ir}개 파장`);return o.join(', ')}
function trCmpSave(){const t=trs.find(x=>x.id===trCmpId);if(!t||!t.qs)return;const q=qsGet(t.qs.id),f=q&&(q.fabrics.find(x=>x.id===t.qs.fab)||q.fabrics[0]);const {L}=trCmpCalc(t,q,f);
 const ng=L.filter(x=>x.j===false),done=L.filter(x=>x.j!==null).length;
 if(done){t.fail=trCmpFail(L);if(ng.length)t.result='불합격';else if(done===L.length)t.result='합격'}
 t.updated=now();save();render();trCmpRender();toast(done?`저장했어요 (${ng.length?'불합격 '+ng.length+'항목':'불합격 항목 없음'})`:'저장했어요')}
function qsSnap(){return qualities.map(q=>({id:q.id,name:q.name,category:q.cat,specNo:q.spec,revised:q.rev,irApplied:q.ir,usage:q.usage,material:q.material,color:q.colorDesc,memo:q.memo,
 fabrics:q.fabrics.map(f=>({name:f.name,tests:f.rows.map(r=>({item:r.item,division:r.div,standard:r.std,unit:r.unit,method:r.method}))})),
 patterns:q.patterns.map(p=>({name:p.name,appliesTo:p.applies,grade:p.grade,colorfastness:p.fast.map(c=>{const o={color:c.color};QS_FAST.forEach((k,i)=>o[k]=c.v[i]);return o}),irMethod:p.irMethod,irColors:p.irColors,irReflectance:p.ir.map(r=>({nm:r.nm,ranges:r.v}))})),
 example:!!q.example,search:snapS([q.name,q.cat,q.spec,q.usage,q.material,...q.fabrics.flatMap(f=>[f.name,...f.rows.map(r=>r.item)]),...q.patterns.map(p=>p.name)])}))}
