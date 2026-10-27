// ===== 외주작업의뢰서 (생산 오더 + 공정 기준) =====
let owReqs=[],owEd=null;
const OW_TERMS='* 생산자의 귀책사유로 납기지연시 발생되는 문제점은 생산자의 책임으로 한다.\n* 제품하자시 발생되는 문제점은 생산자의 부담으로 하며 명시되어 있지않은 사항은 일반상관례에 준한다.\n* (주의) 제품출고 즉시 거래명세서를 작성 FAX 및 접수를 확인해야 한다.\n* 송장발송지연으로 인하여 당사전산등록 및 임가공료 누락에 유의 요망.';
const OW_ROWS=8;
function normOw(x){x=x&&typeof x==='object'?x:{};const s=k=>String(x[k]??'');
 return {id:String(x.id||uid()),orderId:s('orderId'),processId:s('processId'),date:s('date'),to:s('to'),liNo:s('liNo'),poNo:s('poNo'),origin:s('origin'),manager:s('manager'),due:s('due'),ref:s('ref'),dest:s('dest'),item:s('item'),procType:s('procType'),
  lines:(Array.isArray(x.lines)?x.lines:[]).map(l=>({color:String(l&&l.color||''),qty:+(l&&l.qty)||0,unit:String(l&&l.unit||'YD'),memo:String(l&&l.memo||'')})),
  notes:s('notes'),info:s('info'),remarks:s('remarks'),mark:x.mark==null?'별도발송\n\nMADE IN KOREA':s('mark'),terms:x.terms==null?OW_TERMS:s('terms'),supplierId:s('supplierId'),sup:x.sup&&typeof x.sup==='object'?x.sup:null,updated:s('updated')}}
const owLoad=r=>{const a=r&&!Array.isArray(r)?r.outsourceRequests:null;owReqs=Array.isArray(a)?a.filter(x=>x&&typeof x==='object').map(normOw):[]};
const owPayload=()=>({outsourceRequests:owReqs});
function owImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.outsourceRequests))owReqs=raw.outsourceRequests.map(normOw);owEd=null}
const owFor=(oid,pid)=>owReqs.filter(r=>r.orderId===oid&&r.processId===pid).sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
function owPrefill(o,i){const p=o.procs[i],pr=o.procs[i-1],nx=o.procs[i+1],last=[...owReqs].sort((a,b)=>(b.updated||'').localeCompare(a.updated||''))[0],d=defSup();
 const notes=[pr&&pr.vendor?`원단 출처: ${pr.vendor}${pr.name?' ('+pr.name+')':''}`:'',p.shrink!=null&&!isRaw(p)?`가공 축: ${p.shrink}%`:''].filter(Boolean).join('\n');
 return normOw({orderId:o.id,processId:p.id,date:ymd(new Date()),to:p.vendor,liNo:o.no,origin:o.client,due:o.due||'',dest:nx?nx.vendor:'',item:[o.item,o.fabric].filter(Boolean).join(' / '),procType:p.name,
  lines:o.lines.map(l=>({color:l.color,qty:l.qty,unit:l.unit,memo:''})),notes,info:last?last.info:'',manager:last?last.manager:'',supplierId:d?d.id:'',sup:d?supSnap(d):null})}
function owNew(oid,pid){const o=orders.find(x=>x.id===oid),i=o?o.procs.findIndex(p=>p.id===pid):-1;if(i<0)return;owEd=owPrefill(o,i);owEd._new=true;go('outwork');$('content').scrollTop=0}
function owOpen(id){const r=owReqs.find(x=>x.id===id);if(!r)return;owEd=JSON.parse(JSON.stringify(r));go('outwork');$('content').scrollTop=0}
function owChip(oid,pid){const l=owFor(oid,pid);l.length?owOpen(l[0].id):owNew(oid,pid)}
function owList(){const o=$('owl'),q=$('owk').value.trim().toLowerCase(),fc=$('owc'),cv=fc.value,cs=[...new Set(orders.map(o=>o.client).filter(Boolean))];fc.innerHTML='<option value="">전체 거래처</option>'+cs.map(c=>`<option>${esc(c)}</option>`).join('');fc.value=cv;
 let l=orders.filter(x=>(!cv||x.client===cv)&&(!q||[x.no,x.item,x.fabric,x.color,x.client,...x.procs.flatMap(p=>[p.name,p.vendor])].join(' ').toLowerCase().includes(q)));lsBar('outwork');l=lsSort('outwork',l,o=>o);
 o.innerHTML=l.length?l.map(x=>`<tr${x.delivered?' class="dlv"':''}><td><b>${esc(x.no)}</b></td><td>${esc(x.client)}</td><td>${tag(x)}${esc(x.item)}${x.fabric?`<br><small class="muted">${esc(x.fabric)}</small>`:''}</td><td>${x.lines.map(l=>`<div class="ln">${esc(l.color)||'-'}</div>`).join('')}</td><td style="text-align:right">${x.lines.map(l=>`<div class="ln">${num(l.qty)} ${esc(l.unit)}</div>`).join('')}${x.lines.length>1&&!x.mixedUnit?`<div class="ln tot">계 ${num(x.qty)} ${esc(x.unit)}</div>`:''}</td>
  <td><div class="owf">${x.procs.map((p,i)=>{const n=owFor(x.id,p.id).length;return `${i?'<span class="arr">→</span>':''}<button class="owv${n?' has':''}" style="--c:${pcol(i)}" title="${esc(p.name)} · ${n?'의뢰서 '+n+'건 (열기)':'새 의뢰서 작성'}" onclick="owChip('${x.id}','${p.id}')">${esc(p.vendor||p.name||'(업체 없음)')}</button>`}).join('')||'<small class="muted">공정 없음</small>'}</div></td></tr>`).join(''):'<tr><td colspan="6">생산 오더가 없습니다. 생산 관리에서 오더를 먼저 등록하세요.</td></tr>'}
function renderOutwork(){$('owl_wrap').style.display=owEd?'none':'';$('owe_wrap').style.display=owEd?'':'none';$('ptitle').textContent=owEd?'외주작업의뢰서 › '+(owEd.liNo||owEd.poNo||'새 의뢰서')+(owEd.to?' · '+owEd.to:''):'외주작업의뢰서';owEd?owEditor():owList()}
const owIn=(k,lab,ph='',cls='')=>`<label class="${cls}">${lab}<input value="${esc(owEd[k])}" placeholder="${esc(ph)}" oninput="owEd['${k}']=this.value"></label>`;
const owTa=(k,lab,rows,ph='',cls='w')=>`<label class="${cls}">${lab}<textarea rows="${rows}" placeholder="${esc(ph)}" oninput="owEd['${k}']=this.value">${esc(owEd[k])}</textarea></label>`;
function owEditor(){const e=owEd,o=orders.find(x=>x.id===e.orderId),pi=o?o.procs.findIndex(p=>p.id===e.processId):-1,p=pi>=0?o.procs[pi]:null;
 const tot=owTot(e);
 $('owe_wrap').innerHTML=`<div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><button onclick="owBack()">◀ 목록</button>${o?`<span class="muted">연결: <b>${esc(o.no)}</b>${p?` · <span style="color:${pcol(pi)};font-weight:bold">${pi+1}. ${esc(p.name)} / ${esc(p.vendor)}</span>`:''}</span> <button class="mini" onclick="pv='${o.id}';owEd=null;go('prod')">오더 보기</button>`:''}<span style="flex:1"></span>${e._new?'':`<button class="d" onclick="owDel()">삭제</button>`}<button onclick="owOut('preview')">미리보기</button><button onclick="owOut('print')">인쇄</button><button onclick="owOut('pdf')">PDF 저장</button><button onclick="owOut('xlsx')">엑셀 내보내기</button><button class="p" onclick="owSave()">저장</button></div>
 <div class="fsec">머리말</div><div class="g">${owIn('to','받는 곳 (귀하) — 가공 업체')}<label>작성일<input type="date" value="${esc(e.date)}" oninput="owEd.date=this.value"></label>
 <label>보내는 회사 (설정 › 공급자)<select onchange="owSupPick(this.value)">${sups.length?'':'<option value="">(설정에서 공급자를 등록하세요)</option>'}${sups.map(s=>`<option value="${s.id}"${s.id===e.supplierId?' selected':''}>${esc(s.name||'(상호 없음)')}</option>`).join('')}</select></label><label></label></div>
 <div class="fsec" style="margin-top:14px">오더 정보</div><div class="g" style="grid-template-columns:repeat(3,1fr)">${owIn('liNo','LI NO.')}${owIn('origin','원발주처')}<label>납기일<input type="date" value="${esc(e.due)}" oninput="owEd.due=this.value"></label>${owIn('poNo','PO NO.')}${owIn('manager','담당자')}${owIn('ref','참조')}</div>
 <div class="g" style="margin-top:9px">${owIn('dest','납품처','다음 공정 업체 등')}${owIn('procType','가공구분')}${owIn('item','품명','',"w")}</div>
 <div class="fsec" style="margin-top:14px">COLOR / 수량</div><div class="owrow lhead"><span></span><span>COLOR</span><span>수량</span><span>단위</span><span>비고</span><span></span></div><div id="owlines">${e.lines.map((l,i)=>`<div class="owrow"><span class="shmv">${mvBtns('ow:'+i,i,e.lines.length,'owMvLine')}</span><input value="${esc(l.color)}" placeholder="색상" oninput="owEd.lines[${i}].color=this.value"><input inputmode="numeric" value="${l.qty?num(l.qty):''}" placeholder="수량" oninput="this.value=fmtN(this.value);owEd.lines[${i}].qty=+this.value.replace(/,/g,'')||0;owTotUpd()"><select onchange="owEd.lines[${i}].unit=this.value;owTotUpd()">${[...new Set([...UNITS,l.unit])].map(u=>`<option${u===l.unit?' selected':''}>${u}</option>`).join('')}</select><input value="${esc(l.memo)}" placeholder="비고" oninput="owEd.lines[${i}].memo=this.value"><button type="button" title="삭제" onclick="owEd.lines.splice(${i},1);owEditor()">✕</button></div>`).join('')}</div>
 <div style="display:flex;align-items:center;gap:10px"><button type="button" onclick="owEd.lines.push({color:'',qty:0,unit:(owEd.lines[owEd.lines.length-1]||{}).unit||'YD',memo:''});owEditor()">+ 추가</button><span class="muted" id="owtot">TOTAL ${tot}</span>${e.lines.length>OW_ROWS?`<span class="warn">COLOR가 ${OW_ROWS}줄을 넘으면 인쇄 시 칸이 늘어나요</span>`:''}</div>
 <div class="fsec" style="margin-top:14px">문구</div><div class="g">${owTa('notes','작업, 주의 사항',5)}${owTa('info','안내 문구 (TOTAL 아래, 예: 수불·팩스 안내)',2,'* 한 줄에 하나씩 입력 — 다음 의뢰서에 자동으로 이어져요')}${owTa('remarks','비고',4,'','')}${owTa('mark','SHIPPING MARK',4,'','')}${owTa('terms','하단 약관',4)}</div></div>`}
// COLOR 줄 순서 바꾸기 (저장 버튼을 눌러야 저장됨)
function owMvLine(i,d){const j=mvArr(owEd.lines,i,d);if(j<0)return;owEditor();mvFocus('ow:'+j,d)}
function owTot(e){const u=(e.lines[0]||{}).unit||'YD';return `${num(e.lines.filter(l=>l.unit===u).reduce((a,l)=>a+(+l.qty||0),0))} ${u}`}
function owTotUpd(){const t=$('owtot');if(t)t.textContent='TOTAL '+owTot(owEd)}
function owSupPick(id){const x=sups.find(y=>y.id===id);owEd.supplierId=id;owEd.sup=x?supSnap(x):null}
async function owBack(){if(await uiConfirm('저장하지 않은 변경 내용은 사라집니다. 목록으로 돌아갈까요?')){owEd=null;render()}}
function owClean(e){const r=normOw(e);r.lines=r.lines.filter(l=>l.color.trim()||l.qty||l.memo.trim());r.updated=now();return r}
function owSave(){const r=owClean(owEd),i=owReqs.findIndex(x=>x.id===r.id);if(i>=0)owReqs[i]=r;else owReqs.push(r);owEd=JSON.parse(JSON.stringify(r));save();render();toast('저장했습니다')}
async function owDel(){if(!await uiConfirm('이 외주작업의뢰서를 삭제할까요?'))return;owReqs=owReqs.filter(x=>x.id!==owEd.id);owEd=null;save();render();toast('삭제했습니다')}
function owHTML(r){const S=r.sup||supSnap(sups.find(x=>x.id===r.supplierId)||defSup())||{},E=v=>esc(v),br=v=>esc(v).replace(/\r?\n/g,'<br>'),u=(r.lines[0]||{}).unit||'YD',n=Math.max(OW_ROWS,r.lines.length);
 const dt=r.date?r.date:'';let rows='';for(let i=0;i<n;i++){const l=r.lines[i];rows+=`<tr class="ln"><td colspan="3" class="c">${l?E(l.color):''}</td><td class="r">${l&&l.qty?num(l.qty):''}</td><td>${l&&(l.qty||l.color)?E(l.unit):''}</td><td colspan="2">${l?E(l.memo):''}</td>${i===0?`<td colspan="8" rowspan="${n}" class="tl wr">${br(r.notes)}</td>`:''}</tr>`}
 const info=String(r.info||'').split(/\r?\n/).filter(x=>x.trim()),terms=String(r.terms||'').split(/\r?\n/).filter(x=>x.trim());
 return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>외주작업의뢰서</title><style>
@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","맑은 고딕","Noto Sans CJK KR",sans-serif;font-size:9.5pt;color:#000;width:190mm}
table{border-collapse:collapse;width:100%;table-layout:fixed}td{border:1px solid #000;padding:2px 4px;height:22px;text-align:center;vertical-align:middle;overflow:hidden}
.nb td,td.nb{border:none}.tl{text-align:left;vertical-align:top}.r{text-align:right}.wr{white-space:normal;word-break:keep-all}.hd{background:#f2f2f2}
h1{text-align:center;font-size:26pt;letter-spacing:12pt;color:#1f3a93;margin:4mm 0 4mm}.top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:3mm}
.to{font-size:13pt}.to span{display:inline-block;min-width:60mm;border-bottom:1px solid #000;padding:0 2mm;font-weight:bold}.sg td{width:15mm;height:7mm}.sg tr+tr td{height:13mm}
tr.dbl>td{height:44px;line-height:1.25;word-break:break-all}.sp{height:3mm;border:none}.mark{border:1px solid #000;margin:3mm auto;width:85%;height:46mm;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12pt;line-height:1.5}
.ft{text-align:right;font-weight:bold;font-size:12pt;margin-top:5mm}
</style></head><body>
<h1>작업의뢰서</h1>
<div class="top"><div style="flex:1;margin-right:8mm"><div class="to"><span>${E(r.to)}</span> 귀하</div><div style="margin-top:3mm;text-align:center">${E(dt)}</div></div>
<table class="sg" style="width:auto"><tr><td rowspan="2" style="width:7mm" class="hd">결<br>재</td><td class="hd">담당</td><td class="hd">과장</td><td class="hd">부장</td><td class="hd">상무</td><td class="hd">사장</td></tr><tr><td></td><td></td><td></td><td></td><td></td></tr></table></div>
<table>
<colgroup><col span="15"></colgroup>
<tr class="dbl"><td colspan="2" class="hd">LI NO.</td><td colspan="2">${E(r.liNo)}</td><td colspan="2" class="hd">원발주처</td><td colspan="2" class="wr">${E(r.origin)}</td><td colspan="2" class="hd">납기일</td><td colspan="2">${E(r.due)}</td><td rowspan="2" class="hd">납품처</td><td colspan="2" rowspan="2" class="wr"><b>${E(r.dest)}</b></td></tr>
<tr class="dbl"><td colspan="2" class="hd">PO NO.</td><td colspan="2">${E(r.poNo)}</td><td colspan="2" class="hd">담당자</td><td colspan="2">${E(r.manager)}</td><td colspan="2" class="hd">참조</td><td colspan="2" class="wr">${E(r.ref)}</td></tr>
<tr><td colspan="15" class="sp"></td></tr>
<tr class="dbl"><td colspan="2" class="hd">품명</td><td colspan="7" class="tl wr" style="vertical-align:middle"><b>${E(r.item)}</b></td><td colspan="2" class="hd">가공구분</td><td colspan="4" class="wr" style="line-height:1.2;word-break:break-all${String(r.procType).length>14?';font-size:8.5pt':''}"><b>${E(r.procType)}</b></td></tr>
<tr class="hd"><td colspan="3">COLOR</td><td>수량</td><td>단위</td><td colspan="2">비고</td><td colspan="8">작업, 주의 사항</td></tr>
${rows}
<tr><td colspan="3" class="hd">TOTAL</td><td class="r"><b>${num(r.lines.filter(l=>l.unit===u).reduce((a,l)=>a+(+l.qty||0),0))}</b></td><td>${E(u)}</td><td colspan="2"></td><td colspan="8" style="border-top:none"></td></tr>
<tr><td colspan="15" class="tl wr" style="height:8mm;border-bottom:none">${info.map(E).join('<br>')}</td></tr>
<tr><td colspan="9" class="hd">비 고</td><td colspan="6" class="hd">SHIPPING MARK</td></tr>
<tr><td colspan="9" class="tl wr" style="height:58mm">${br(r.remarks)}</td><td colspan="6" style="vertical-align:middle"><div class="mark fit">${br(r.mark)}</div></td></tr>
<tr><td colspan="15" class="tl wr" style="font-size:8pt;line-height:1.5">${terms.map(E).join('<br>')}</td></tr>
</table>
<div class="ft">${E(S.name||'')}</div>
${FIT_JS}</body></html>`}
async function owOut(mode){const r=owClean(owEd),fs=v=>String(v||'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'').replace(/\s+/g,' ').trim().replace(/[. ]+$/,''),nm=[(r.date||ymd(new Date())).replace(/-/g,''),'외주작업의뢰서',fs(r.to)].filter(Boolean).join('_');
 try{if(mode==='pdf'){const p=await A.stmtPDF(owHTML(r),nm+'.pdf');if(p)toast('PDF 저장: '+p)}else if(mode==='preview'){await A.stmtPreview(owHTML(r),nm)}else if(mode==='xlsx'){const p=await A.owXlsx({vendor:r.to,date:r.date,liNo:r.liNo,client:r.origin,due:r.due,dest:r.dest,poNo:r.poNo,manager:r.manager,ref:r.ref,item:r.item,procName:r.procType,lines:r.lines.map(l=>({color:l.color,qty:l.qty||'',unit:l.unit,note:l.memo})),shrink:'',src:'',work:r.notes,notes:r.info,memo:r.remarks,mark:r.mark,terms:r.terms},r.sup||supSnap(defSup()),nm+'.xlsx');if(p)toast('엑셀 저장: '+p)}
  else await A.stmtPrint(owHTML(r))}catch(e){uiAlert('출력 실패: '+(e.message||e))}}
