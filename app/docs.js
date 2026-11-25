// ===== 서류 보관함 =====
// 다른 카테고리의 첨부 파일(작업의뢰서·발주서·출고 거래명세서·시험성적서·규격서·명함·사업자등록증)은 그 자리에 둔 채 '연결'해서 보여 주고(읽기 전용),
// 여기서 직접 추가한 서류는 docs 폴더에 복사해 documents[]에 저장. 폴더 없이 태그(종류 · 거래처 · 오더번호)로 찾음.
let docs=[],dcF={k:'',kind:'',client:'',per:'',view:'list'},dcSizes={};const dcSel=new Set();
// 많이 쌓여도 빠르게: 종류마다 처음 몇 줄만 그리고 [더보기], 검색은 0.15초 쉬면, 썸네일은 화면에 보이는 카드만 읽음
let dcLim={},dcVis=[],dcKT=0;const dcColl=new Intl.Collator('ko');
const DC_K=['성적서','거래명세서','청구서','작업의뢰서','발주서','규격서','계약·인증','명함','사업자등록증','사진','기타'];
const DC_C={'성적서':'#e3f4ea;color:#16803c','거래명세서':'#e5effb;color:#1d5fa8','청구서':'#fde8e8;color:#b42318','작업의뢰서':'#f1e8fb;color:#7a3db8','발주서':'#efe9fb;color:#5b3fb0','규격서':'#e6f4f1;color:#0f766e','계약·인증':'#e8f0fe;color:#1e4fa3','명함':'#fff3e0;color:#b45309','사업자등록증':'#f3f4f6;color:#374151','사진':'#fdecee;color:#be123c','기타':'#eef0f2;color:#4b5563'};
const normDoc=x=>({id:String(x&&x.id||uid()),name:String(x&&x.name||''),path:String(x&&x.path||''),size:+(x&&x.size)||0,addedAt:String(x&&x.addedAt||''),kind:DC_K.includes(x&&x.kind)?x.kind:'기타',
 client:String(x&&x.client||'').trim(),orderNo:String(x&&x.orderNo||'').trim(),date:/^\d{4}-\d{2}-\d{2}$/.test(x&&x.date||'')?x.date:'',memo:String(x&&x.memo||'')});
function dcLoad(r){const o=r&&!Array.isArray(r)?r:{};docs=(Array.isArray(o.documents)?o.documents:[]).filter(x=>x&&x.path).map(normDoc);
 }
const dcPayload=()=>({documents:docs});
function dcImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.documents))dcLoad(raw)}
const dcNk=s=>String(s||'').replace(/\(주\)|㈜|주식회사|\s/g,'').toLowerCase();
const dcD=s=>String(s||'').slice(0,10);
// ---- 모든 서류 (연결 + 직접) ----
function dcItems(){const L=[],O=new Map(orders.map(o=>[o.id,o])),add=x=>L.push(x);
 wfFiles.forEach(f=>{if(f.kind==='tr'){const t=trs.find(x=>x.id===f.orderId);add({key:'wf:'+f.id,store:'wf',path:f.path,name:f.name,kind:'성적서',client:'',orderNo:'',date:dcD(t&&(t.done||t.recv)||f.addedAt),org:'TEST REPORT',ref:t?[t.no,t.name,t.lab].filter(Boolean).join(' · '):'',go:t?['testrpt',t.id]:null});return}
  if(f.kind==='qs'){const q=typeof qsGet==='function'?qsGet(f.orderId):null;add({key:'wf:'+f.id,store:'wf',path:f.path,name:f.name,kind:'규격서',client:'',orderNo:'',date:dcD(f.addedAt),org:'품질 기준',ref:q?q.spec||q.name:'',go:q?['quality',q.id]:null});return}
  const o=O.get(f.orderId);add({key:'wf:'+f.id,store:'wf',path:f.path,name:f.name,kind:f.kind==='po'?'발주서':'작업의뢰서',client:o?o.client:'',orderNo:o?o.no:'',date:dcD(f.addedAt),org:'생산 관리',go:o?['prod',o.id]:null})});
 shipFiles.forEach(f=>{const o=O.get(f.orderId),p=o&&o.procs.find(x=>x.id===f.processId),s=p?p.ships.find(x=>x.id===f.shipId):o&&(o.dlv||[]).find(x=>x.id===f.shipId);
  add({key:'ss:'+f.id,store:'ss',path:f.path,name:f.name,kind:'거래명세서',client:o?o.client:'',orderNo:o?o.no:'',date:dcD(s&&s.date||f.addedAt),org:'생산 관리',go:o?['prod',o.id]:null})});
 bizRegs.forEach(f=>add({key:'br:'+f.id,store:'br',path:f.path,name:f.name,kind:'사업자등록증',client:f.company,orderNo:'',date:dcD(f.addedAt),org:'거래처 정보'}));
 contacts.forEach(c=>c.cards.forEach(f=>add({key:'nc:'+f.id,store:'br',path:f.path,name:f.name,kind:'명함',client:c.company,orderNo:'',date:dcD(f.addedAt),org:'거래처 정보',ref:c.name,go:['contacts',c.id]})));
 docs.forEach(d=>add({key:'dc:'+d.id,store:'dc',path:d.path,name:d.name,kind:d.kind,client:d.client,orderNo:d.orderNo,date:d.date||dcD(d.addedAt),memo:d.memo,org:'직접 추가',own:true,id:d.id,size:d.size}));
 return L}
function dcPerOk(d){const p=dcF.per;if(!p)return true;if(!d)return false;const t=new Date(),y=t.getFullYear(),ym=dcToday().slice(0,7);
 if(p==='m')return d.slice(0,7)===ym;if(p==='3m'){const b=new Date(t);b.setMonth(b.getMonth()-3);return d>=ymd(b)}if(p==='y')return d.slice(0,4)===String(y);if(p==='py')return d.slice(0,4)===String(y-1);return true}
function dcFilter(L,noKind){const k=dcNk(dcF.k);return L.filter(x=>(noKind||!dcF.kind||x.kind===dcF.kind)&&(!dcF.client||dcNk(x.client)===dcNk(dcF.client))&&dcPerOk(x.date)&&(!k||dcNk([x.name,x.kind,x.client,x.orderNo,x.org,x.ref,x.memo].join(' ')).includes(k)))}
const dcSz=x=>{const n=x.own?x.size:dcSizes[x.key];return n==null||n<0?'':n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'};
const dcTag=k=>`<span class="dctag" style="background:${DC_C[k]||DC_C['기타']}">${esc(k)}</span>`;
const dcCl=c=>c?`<span class="dccl">${esc(c)}</span>`:'<span class="muted">—</span>',dcOn=o=>o?`<span class="dcon">${esc(o)}</span>`:'<span class="muted">—</span>';
const dcOrg=x=>`<span class="dcorg${x.own?' own':''}" title="${esc(x.org+(x.ref?' · '+x.ref:''))}">${x.own?'직접 추가':'자동'}</span>`;
function renderDocs(){const el=$('dc_wrap');if(!el)return;const all=dcItems(),base=dcFilter(all,true),L=dcFilter(all),keys=new Set(all.map(x=>x.key));[...dcSel].forEach(k=>{if(!keys.has(k))dcSel.delete(k)});
 const cnt=k=>base.filter(x=>x.kind===k).length,cls=[...new Set(all.map(x=>x.client).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko')),n=dcSel.size;
 const rail=`<div class="dcrail"><div class="dcrh">종류</div><a class="${!dcF.kind?'on':''}" onclick="dcKind('')">전체<b>${base.length}</b></a>${DC_K.filter(k=>cnt(k)||dcF.kind===k).map(k=>`<a class="${dcF.kind===k?'on':''}" onclick="dcKind('${k}')">${esc(k)}<b>${cnt(k)}</b></a>`).join('')}</div>`;
 const bar=`<div class="filters dcbar"><input id="dck" placeholder="검색" value="${esc(dcF.k)}" oninput="dcF.k=this.value;dcKey()" style="width:200px">
  <label class="dcfl">거래처<select onchange="dcF.client=this.value;render()"><option value="">전체</option>${cls.map(c=>`<option${c===dcF.client?' selected':''}>${esc(c)}</option>`).join('')}</select></label>
  <label class="dcfl">기간<select onchange="dcF.per=this.value;render()">${[['','전체 기간'],['m','이번 달'],['3m','최근 3개월'],['y','올해'],['py','작년']].map(([v,t])=>`<option value="${v}"${dcF.per===v?' selected':''}>${t}</option>`).join('')}</select></label>
  <span style="flex:1"></span><button id="dc_del" class="d" style="${n?'':'display:none'}" onclick="dcBulkDel()">삭제 (${n})</button>
  <span class="dcvt"><button class="${dcF.view==='list'?'on':''}" onclick="dcF.view='list';render()">목록</button><button class="${dcF.view==='card'?'on':''}" onclick="dcF.view='card';render()">카드</button></span><button class="p" onclick="dcPickUp()">+ 서류 추가</button></div>`;
 let body;
 if(dcF.view==='card'){const lim=dcLim.card||120,CL=L.sort(dcSort).slice(0,lim);body=`<div class="dcgrid" id="dctb">${L.length?CL.map(x=>`<div class="dccard" data-k="${esc(x.key)}" onclick="dcOpen(this.dataset.k)"><div class="dcth" data-th="${esc(x.key)}">${/\.pdf$/i.test(x.name)?'PDF':'🖼'}</div><div class="dccn" title="${esc(x.name)}">${esc(x.name)}</div><div>${dcTag(x.kind)} ${x.client?dcCl(x.client):''}</div></div>`).join(''):'<div class="muted">서류가 없어요.</div>'}</div>${L.length>lim?`<div class="dcmorec"><a onclick="dcMore('card')">더보기 › <span class="muted">(${(L.length-lim).toLocaleString()}건 더)</span></a></div>`:''}`}
 else{const G=dcF.kind?[[dcF.kind,L]]:DC_K.map(k=>[k,L.filter(x=>x.kind===k)]).filter(g=>g[1].length);
  const row=x=>`<tr class="r" data-k="${esc(x.key)}" onclick="dcOpen(this.dataset.k)"><td class="lbcc" onclick="event.stopPropagation()"><input type="checkbox" class="dcck" value="${esc(x.key)}"${dcSel.has(x.key)?' checked':''} aria-label="선택" onchange="dcTick(this.value,this.checked)"></td><td><b>${esc(x.name)}</b></td><td>${dcTag(x.kind)}</td><td>${dcCl(x.client)}</td><td>${dcOn(x.orderNo)}</td><td class="c">${x.date||''}</td><td class="r">${dcSz(x)}</td><td>${dcOrg(x)}</td></tr>`;
  body=`<div class="tw"><table class="dct" data-rz="docs_list"><colgroup><col style="width:30px"><col style="width:300px"><col style="width:96px"><col style="width:150px"><col style="width:100px"><col style="width:100px"><col style="width:80px"><col></colgroup><thead><tr><th class="lbcc" data-rzmin="24"><input type="checkbox" id="dc_all" aria-label="전체 선택"${L.length&&L.every(x=>dcSel.has(x.key))?' checked':''} onclick="event.stopPropagation();dcAll(this.checked)"></th><th>파일명</th><th>종류</th><th>거래처</th><th>오더</th><th class="c">날짜</th><th class="r">크기</th><th>출처</th></tr></thead>
  <tbody id="dctb">${L.length?G.map(([k,l])=>(dcF.kind?'':`<tr class="dcgh"><td colspan="8">${dcTag(k)} <span class="muted">${l.length}</span></td></tr>`)+(()=>{const lim=dcLim[k]||(dcF.kind?300:50),S=l.sort(dcSort);return S.slice(0,lim).map(row).join('')+(S.length>lim?dcMoreRow(k,S.length-lim):'')})()).join(''):`<tr><td colspan="8" class="muted">${all.length?'검색 결과가 없어요.':'서류가 없어요. 파일을 이 화면에 끌어다 놓거나 [+ 서류 추가]를 누르세요.'}</td></tr>`}</tbody></table></div>`}
 dcVis=L;el.innerHTML=`<div class="dcw">${rail}<div class="card dcmain">${bar}${body}</div></div>`;if(typeof crInit==='function')crInit();dcSelCount();dcStatFill(all);if(dcF.view==='card')dcThumbFill(all)}
const dcSort=(a,b)=>(b.date||'').localeCompare(a.date||'')||dcColl.compare(a.name,b.name);
function dcKind(k){dcF.kind=k;dcLim={};render()}
function dcKey(){clearTimeout(dcKT);dcKT=setTimeout(()=>{dcKT=0;dcLim={};render()},150)}
function dcMore(k){dcLim[k]=(dcLim[k]||(k==='card'?120:dcF.kind?300:50))+(k==='card'?240:dcF.kind?500:200);render()}
const dcMoreRow=(k,n)=>`<tr class="dcmore"><td colspan="8"><a onclick="dcMore('${k}')">더보기 › <span class="muted">(${n.toLocaleString()}건 더)</span></a></td></tr>`;
// 크기: 연결된 파일은 디스크에서 한 번 읽어 둠
let dcStatBusy=false;async function dcStatFill(all){if(dcStatBusy||!A.fileStat)return;const need=all.filter(x=>!x.own&&dcSizes[x.key]==null);if(!need.length)return;dcStatBusy=true;
 try{const r=await A.fileStat(need.map(x=>[x.store,x.path]));need.forEach((x,i)=>dcSizes[x.key]=r[i])}finally{dcStatBusy=false}if(page==='docs')render()}
// ---- 선택 · 삭제 ----
function dcSelCount(){const n=dcSel.size,b=$('dc_del');if(b){b.style.display=n?'':'none';b.textContent=`삭제 (${n})`}const all=$('dc_all');if(all){const k=dcVis.filter(x=>dcSel.has(x.key)).length;all.checked=!!dcVis.length&&k===dcVis.length;all.indeterminate=k>0&&k<dcVis.length}}
function dcTick(k,on){on?dcSel.add(k):dcSel.delete(k);dcSelCount()}
function dcAll(on){dcVis.forEach(x=>on?dcSel.add(x.key):dcSel.delete(x.key));document.querySelectorAll('#dctb input.dcck').forEach(c=>c.checked=on);dcSelCount()}
async function dcBulkDel(){const L=dcItems().filter(x=>dcSel.has(x.key)),own=L.filter(x=>x.own),lk=L.length-own.length;if(!L.length)return;
 if(!own.length)return uiAlert(`고른 ${lk}건은 다른 카테고리(${[...new Set(L.map(x=>x.org))].join(' · ')})의 첨부라 여기서 지울 수 없어요. 그 화면에서 지워 주세요.`);
 if(await uiChoice(`서류 ${own.length}건을 삭제할까요?${lk?`\n\n· 다른 카테고리 첨부 ${lk}건은 여기서 지울 수 없어 그대로 둬요`:''}\n\n(Ctrl+Z로 되돌릴 수 있어요)`,[{t:'삭제',c:'d'}])!==0)return;
 const ids=new Set(own.map(x=>x.id));docs=docs.filter(d=>!ids.has(d.id));own.forEach(x=>dcSel.delete(x.key));save();render();toast(`${own.length}건을 삭제했어요`)}
// ---- 미리보기 창 ----
let dcCur='';
function dcDlg(id,cls){let d=$(id);if(!d){d=document.createElement('dialog');d.id=id;d.className=cls;document.body.appendChild(d)}return d}
function dcOpen(key){const x=dcItems().find(i=>i.key===key);if(!x)return;dcCur=key;const d=dcDlg('dcpv','dcpv');
 d.innerHTML=`<div class="dh">${esc(x.name)}<button class="dcx" onclick="this.closest('dialog').close()" title="닫기" aria-label="닫기">✕</button></div><div class="dcpm"><span>${dcTag(x.kind)} ${x.client?dcCl(x.client):''} ${x.orderNo?dcOn(x.orderNo):''} ${dcOrg(x)}</span><span class="muted">${[x.date,dcSz(x)].filter(Boolean).join(' · ')}</span></div>
 <div class="dcpb" id="dcpb"><div class="muted" style="padding:30px">불러오는 중…</div></div>
 <div class="df"><button class="p" onclick="dcFileOpen()">열기</button><button onclick="dcReveal()">폴더 열기</button>${x.own?'<button onclick="dcEdit()">연결 편집</button>':''}${x.go?`<button onclick="dcGo()">${esc(x.org)}에서 보기</button>`:''}<button onclick="this.closest('dialog').close()">닫기</button></div>`;
 if(!d.open)d.showModal();d.querySelector('.df .p').focus();dcRenderPrev(x)}
async function dcRenderPrev(x){const box=$('dcpb');let b64=null;try{b64=await A.attRead(x.store,x.path)}catch(e){}if(!box||dcCur!==x.key)return;
 if(!b64){box.innerHTML='<div class="muted" style="padding:30px">파일을 찾을 수 없어요.</div>';return}
 if(!/\.pdf$/i.test(x.name)){const ext=(x.name.match(/\.(\w+)$/)||[])[1].toLowerCase();box.innerHTML=`<img src="data:image/${ext==='jpg'?'jpeg':ext};base64,${b64}" alt="">`;return}
 try{const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),doc=await pdfjsLib.getDocument({...PDFOPT,data:bin}).promise;box.innerHTML='';const W=Math.min(760,box.clientWidth-40||700);
  for(let i=1;i<=Math.min(doc.numPages,10);i++){const pg=await doc.getPage(i),v1=pg.getViewport({scale:1}),vp=pg.getViewport({scale:W/v1.width*(window.devicePixelRatio||1)}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;cv.style.width=W+'px';
   await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;if(dcCur!==x.key)return;box.appendChild(cv)}
  if(doc.numPages>10)box.insertAdjacentHTML('beforeend',`<div class="muted">${doc.numPages-10}쪽 더 있어요 — [열기]로 보세요</div>`)}catch(e){box.innerHTML='<div class="muted" style="padding:30px">미리 볼 수 없어요. [열기]로 보세요.</div>'}}
const dcCurItem=()=>dcItems().find(i=>i.key===dcCur);
async function dcFileOpen(){const x=dcCurItem();if(x&&!await A.fileOpen(x.store,x.path))uiAlert('파일을 찾을 수 없어요.')}
async function dcReveal(){const x=dcCurItem();if(x&&!await A.fileReveal(x.store,x.path))uiAlert('파일을 찾을 수 없어요.')}
function dcGo(){const x=dcCurItem();if(!x||!x.go)return;$('dcpv').close();const [p,id]=x.go;go(p);if(p==='contacts')viewContact(id);else if(p==='prod'&&typeof openDetail==='function')openDetail(id);else if(p==='testrpt'&&typeof trOpen==='function')trOpen(id)}
// 연결 편집 (직접 추가 서류만): 종류·거래처·오더·날짜·메모. 다른 카테고리 첨부는 원래 화면에서
function dcEdit(){const x=dcCurItem();if(!x||!x.own)return;const d=dcDlg('dced','dced'),cls=dcClients(),nos=orders.map(o=>o.no).filter(Boolean);
 d.innerHTML=`<div class="dh">연결 편집<button class="dcx" onclick="this.closest('dialog').close()" aria-label="닫기">✕</button></div><div class="db"><div class="blform">
 <label>종류<select id="dce_k">${DC_K.map(k=>`<option${k===x.kind?' selected':''}>${k}</option>`).join('')}</select></label><label>거래처<input id="dce_c" list="dce_cl" value="${esc(x.client)}"></label><label>오더번호<input id="dce_o" list="dce_ol" value="${esc(x.orderNo)}"></label><label>날짜<input id="dce_d" type="date" value="${esc(x.date)}"></label>
 <label class="w">메모<input id="dce_m" value="${esc(x.memo||'')}"></label></div>
 <datalist id="dce_cl">${cls.map(c=>`<option value="${esc(c)}">`).join('')}</datalist><datalist id="dce_ol">${nos.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
 <div class="df"><button class="p" onclick="dcEditOk()">저장</button><button onclick="this.closest('dialog').close()">취소</button></div>`;d.showModal()}
function dcEditOk(){const x=dcCurItem();if(!x||!x.own)return;const d=docs.find(v=>v.id===x.id);if(!d)return;
 Object.assign(d,normDoc({...d,kind:$('dce_k').value,client:$('dce_c').value,orderNo:$('dce_o').value,date:$('dce_d').value,memo:$('dce_m').value}));
 save();$('dced').close();render();dcOpen(x.key);toast('저장했어요')}
// ---- 서류 추가 (여러 개) ----
function dcClients(){return [...new Set([...orders.map(o=>o.client),...contacts.map(c=>c.company),...sales.map(s=>s.client),...(typeof custs!=='undefined'?custs.map(c=>c.name):[]),...docs.map(d=>d.client)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'))}
const DC_RX=[['성적서',/성적서|시험|test.?report|\btr\b/i],['거래명세서',/명세서|statement/i],['청구서',/청구|invoice|bill/i],['작업의뢰서',/의뢰서|작업지시/i],['발주서',/발주|purchase.?order|\bpo\b/i],['규격서',/규격/i],['계약·인증',/계약|인증|certif|cert\b|contract/i],['명함',/명함|card/i],['사업자등록증',/사업자/i]];
function dcGuess(p){const file=String(p).split(/[\\/]/).pop(),base=file.replace(/\.\w+$/,''),nk=dcNk(base),img=/\.(jpe?g|png|webp|gif)$/i.test(file);
 let kind=(DC_RX.find(([,r])=>r.test(base))||[])[0]||(img?'사진':''),orderNo='',client='';
 const os=orders.filter(o=>o.no&&nk.includes(dcNk(o.no))).sort((a,b)=>b.no.length-a.no.length);if(os[0]){orderNo=os[0].no;client=os[0].client||''}
 if(!client){const c=dcClients().filter(c=>{const k=dcNk(c);return k.replace(/\(예시\)/,'').length>=2&&nk.includes(k)}).sort((a,b)=>b.length-a.length)[0];if(c)client=c}
 const m=base.match(/(20\d\d)[-._]?(\d\d)[-._]?(\d\d)/),date=m&&+m[2]>=1&&+m[2]<=12&&+m[3]>=1&&+m[3]<=31?`${m[1]}-${m[2]}-${m[3]}`:'';
 return {path:p,name:file,kind,client,orderNo,date,ok:!!(kind&&client)}}
let dcUp=[];
function dcUpOpen(paths){const ok=paths.filter(p=>/\.(pdf|jpe?g|png|webp|gif)$/i.test(p)),bad=paths.length-ok.length;if(bad)toast(`PDF·이미지만 넣을 수 있어요 (${bad}개 뺌)`);if(!ok.length)return;
 const have=new Set(dcUp.map(r=>r.path));ok.filter(p=>!have.has(p)).forEach(p=>{const g=dcGuess(p);g.ck=!g.ok;dcUp.push(g)});dcUpRender();const d=$('dcup');if(!d.open){d.showModal();d.querySelector('.df .p').focus()}}
async function dcPickUp(){const l=A.dcPick?await A.dcPick():[];if(l&&l.length){dcUp=[];dcUpOpen(l)}}
function dcUpRender(){const d=dcDlg('dcup','dcup'),cls=dcClients(),nos=orders.map(o=>o.no).filter(Boolean),ok=dcUp.filter(r=>r.ok).length,n=dcUp.filter(r=>r.ck).length;
 const st=(v,ok)=>ok?'<i class="dcok">✓</i>':'<i class="dcq">?</i>';
 d.innerHTML=`<div class="dh">서류 추가<button class="dcx" onclick="dcUpClose()" aria-label="닫기">✕</button></div><div class="db">
 <div class="dcchips"><b>파일 ${dcUp.length}</b>${dcUp.map(r=>`<span>📎 ${esc(r.name)}</span>`).join('')}</div>
 <div class="dcsum"><span class="dcokt">✓ 자동 ${ok}</span> <span class="dcqt">? 확인 필요 ${dcUp.length-ok}</span></div>
 <div class="dcbat"><b>선택 ${n}</b><label>종류<select id="dcb_k"><option value="">—</option>${DC_K.map(k=>`<option>${k}</option>`).join('')}</select></label><label>거래처<input id="dcb_c" list="dcu_cl" style="width:150px"></label><button onclick="dcBatch()">적용</button></div>
 <div class="tw"><table class="dcut"><colgroup><col style="width:30px"><col><col style="width:130px"><col style="width:170px"><col style="width:130px"><col style="width:90px"></colgroup><thead><tr><th class="lbcc"><input type="checkbox" id="dcu_all" aria-label="전체 선택"${dcUp.length&&dcUp.every(r=>r.ck)?' checked':''} onclick="dcUp.forEach(r=>r.ck=this.checked);dcUpRender()"></th><th>파일명</th><th>종류</th><th>거래처</th><th>오더</th><th>상태</th></tr></thead><tbody>
 ${dcUp.map((r,i)=>`<tr class="${r.ok?'':'dcwarn'}"><td class="lbcc"><input type="checkbox"${r.ck?' checked':''} onchange="dcUp[${i}].ck=this.checked;dcUpRender()"></td><td class="dcun" title="${esc(r.path)}">${esc(r.name)}</td>
  <td><select onchange="dcUpSet(${i},'kind',this.value)"><option value="">—</option>${DC_K.map(k=>`<option${k===r.kind?' selected':''}>${k}</option>`).join('')}</select>${st(r.kind,!!r.kind)}</td>
  <td><input list="dcu_cl" value="${esc(r.client)}" onchange="dcUpSet(${i},'client',this.value)">${st(r.client,!!r.client)}</td>
  <td><input list="dcu_ol" value="${esc(r.orderNo)}" onchange="dcUpSet(${i},'orderNo',this.value)" placeholder="—"></td><td>${r.ok?'<b class="dcokt">✓ 자동</b>':'<b class="dcqt">? 확인 필요</b>'}</td></tr>`).join('')}</tbody></table></div>
 <datalist id="dcu_cl">${cls.map(c=>`<option value="${esc(c)}">`).join('')}</datalist><datalist id="dcu_ol">${nos.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
 <div class="df"><button class="p" onclick="dcUpOk()">추가</button><button onclick="dcUpClose()">취소</button></div>`}
function dcUpSet(i,k,v){const r=dcUp[i];r[k]=String(v||'').trim();if(k==='orderNo'&&r.orderNo&&!r.client){const o=orders.find(o=>dcNk(o.no)===dcNk(r.orderNo));if(o)r.client=o.client}r.ok=!!(r.kind&&r.client);dcUpRender()}
function dcBatch(){const k=$('dcb_k').value,c=$('dcb_c').value.trim();if(!k&&!c)return toast('종류나 거래처를 고르세요');dcUp.forEach(r=>{if(!r.ck)return;if(k)r.kind=k;if(c)r.client=c;r.ok=!!(r.kind&&r.client)});dcUpRender()}
function dcUpClose(){dcUp=[];const d=$('dcup');if(d&&d.open)d.close()}
async function dcUpOk(){if(!dcUp.length)return;if(!A.dcAttach)return uiAlert('데스크톱 앱에서만 사용할 수 있어요.');const add=[];
 for(const r of dcUp){try{const f=await A.dcAttach(r.path);add.push(normDoc({...f,kind:r.kind||'기타',client:r.client,orderNo:r.orderNo,date:r.date,addedAt:now()}))}catch(e){uiAlert(`'${r.name}' 추가 실패: ${e.message||e}`)}}
 if(!add.length)return;docs.push(...add);save();dcUpClose();render();toast(`${add.length}건 추가했어요`)}
// ---- 끌어다 놓기: 서류 보관함 화면 어디든 → 서류 추가 창 ----
(()=>{let n=0;const ov=()=>{let o=$('dcdrop');if(!o){o=document.createElement('div');o.id='dcdrop';o.innerHTML='<div>여기에 놓으세요</div>';document.body.appendChild(o)}return o};
 const on=e=>page==='docs'&&e.dataTransfer&&[...e.dataTransfer.types].includes('Files')&&!document.querySelector('dialog[open]:not(#dcup)');
 document.addEventListener('dragenter',e=>{if(!on(e))return;n++;ov().classList.add('on')});
 document.addEventListener('dragleave',e=>{if(!on(e))return;if(--n<=0){n=0;ov().classList.remove('on')}});
 document.addEventListener('dragover',e=>{if(on(e)){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
 document.addEventListener('drop',e=>{n=0;const o=$('dcdrop');if(o)o.classList.remove('on');if(!on(e))return;e.preventDefault();const l=[...e.dataTransfer.files].map(f=>A.pathForFile?A.pathForFile(f):'').filter(Boolean);if(l.length){if(!($('dcup')&&$('dcup').open))dcUp=[];dcUpOpen(l)}});
})();
// 카드 보기 미리보기 (이미지 · PDF 첫 쪽)
const dcThumbs=new Map(),DC_TH_MAX=300;let dcThIO=null,dcThQ=[],dcThBusy=false,dcThAll=new Map();
function dcThumbFill(all){dcThAll=new Map(all.map(x=>[x.key,x]));dcThQ=[];if(dcThIO)dcThIO.disconnect();
 const els=[...document.querySelectorAll('.dcth[data-th]')];els.forEach(el=>{const u=dcThumbs.get(el.dataset.th);if(u)el.innerHTML=`<img src="${u}">`});
 dcThIO=new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting)return;dcThIO.unobserve(e.target);if(!dcThumbs.has(e.target.dataset.th))dcThQ.push(e.target)});dcThRun()},{rootMargin:'300px'});
 els.forEach(el=>{if(!dcThumbs.has(el.dataset.th))dcThIO.observe(el)})}
async function dcThRun(){if(dcThBusy)return;dcThBusy=true;try{while(dcThQ.length){const el=dcThQ.shift();if(!el.isConnected)continue;const k=el.dataset.th,x=dcThAll.get(k);if(!x)continue;
 try{const b=await A.attRead(x.store,x.path);if(!b)continue;let u;if(/\.pdf$/i.test(x.name)){const doc=await pdfjsLib.getDocument({...PDFOPT,data:Uint8Array.from(atob(b),c=>c.charCodeAt(0))}).promise,pg=await doc.getPage(1),v=pg.getViewport({scale:1}),vp=pg.getViewport({scale:220/v.width}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;u=cv.toDataURL('image/jpeg',0.8);doc.destroy&&doc.destroy()}
  else{const ext=(x.name.match(/\.(\w+)$/)||[])[1].toLowerCase();u=`data:image/${ext==='jpg'?'jpeg':ext};base64,${b}`}
  dcThumbs.set(k,u);if(dcThumbs.size>DC_TH_MAX)dcThumbs.delete(dcThumbs.keys().next().value);if(el.isConnected)el.innerHTML=`<img src="${u}">`}catch(e){}}}finally{dcThBusy=false}}
// ---- 요청함: docs.add (서류 보관함에 직접 추가) ----
Object.assign(RQ_T,{'docs.add':'서류 추가'});RQ_KEYS['docs.add']=['file','files','image','images','kind','client','orderNo','date','memo'];
RQ_H['docs.add']=function(a,it,ctx,req,P){const kind=rqS(a.kind),cl=rqS(a.client),no=rqS(a.orderNo),fis=crFiles(a,it,P,true);
 if(!DC_K.includes(kind))it.errors.push(`kind는 ${DC_K.join(' · ')} 중 하나입니다`);
 for(const k of ['date'])if(a[k]!=null&&a[k]!==''&&!rqDateOk(a[k]))it.errors.push(`${k} '${a[k]}'은(는) YYYY-MM-DD 날짜가 아닙니다`);
 it.summary=`서류 보관함에 ${kind||'?'}${fis?` ${fis.length}건`:''}을(를) 추가합니다${cl?` (${cl})`:''}`;if(it.errors.length||!fis)return;
 const o=no?orders.find(x=>dcNk(x.no)===dcNk(no)):null;if(no&&!o)it.warns.push(`오더번호 '${no}'인 오더가 없습니다 (태그로만 저장)`);
 const client=cl||(o?o.client:'');if(client&&!dcClients().some(c=>dcNk(c)===dcNk(client)))it.warns.push(`처음 보는 거래처 '${client}' (태그로만 저장)`);
 if(!client)it.warns.push('거래처가 없습니다 — 화면에서 [연결 편집]으로 넣을 수 있어요');
 ctx.dcTaken=ctx.dcTaken||new Set();
 fis.forEach(fi=>{const dk=[kind,dcNk(client),fi.name.toLowerCase()].join('|');if(ctx.dcTaken.has(dk)||docs.some(d=>[d.kind,dcNk(d.client),d.name.toLowerCase()].join('|')===dk)){it.warns.push(`같은 서류 '${fi.name}'이(가) 이미 있어 건너뜁니다`);return}
  ctx.dcTaken.add(dk);ctx.attach.push({kind:'doc',abs:fi.abs,name:fi.name,meta:{kind,client,orderNo:o?o.no:no,date:rqS(a.date),memo:rqS(a.memo)}})});
 it.files=fis.map(f=>f.rel);it.diff=[['종류','',kind],['거래처','',client],['오더번호','',o?o.no:no],['날짜','',rqS(a.date)],['파일','',fis.map(f=>`${f.name} (${rqSize(f.size)})`).join(', ')]].filter(r=>r[2])};
window.addEventListener('load',()=>{if(A.dcGc)A.dcGc(docs.map(d=>d.path)).catch(()=>{})});
{const st=document.createElement('style');st.textContent=`
.dcw{display:flex;gap:12px;align-items:flex-start}.dcrail{flex:0 0 130px;background:#fff;border-radius:10px;padding:10px 8px;box-shadow:0 1px 3px #0001;position:sticky;top:0}
.dcrh{font-size:12px;color:#646970;margin:0 0 6px 6px;font-weight:600}.dcrail a{display:flex;justify-content:space-between;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:13px;color:#3c434a;border-left:3px solid transparent}
.dcrail a:hover{background:#f0f6fc}.dcrail a.on{background:#e8f1fb;color:#1d5fa8;font-weight:600;border-left-color:#2271b1}.dcrail a b{font-weight:normal;color:#8c8f94;font-size:12px}.dcrail a.on b{color:#1d5fa8;font-weight:600}
.dcmain{flex:1;min-width:0}.dcbar{align-items:center}.dcfl{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#50575e}
.dcvt{display:inline-flex}.dcvt button{border-radius:0}.dcvt button:first-child{border-radius:4px 0 0 4px}.dcvt button:last-child{border-radius:0 4px 4px 0;margin-left:-1px}.dcvt button.on{background:#2271b1;color:#fff;border-color:#2271b1}
.dctag{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:9px;white-space:nowrap}.dccl{display:inline-block;font-size:11px;padding:1px 7px;border-radius:9px;background:#f3e8ff;color:#7e22ce;white-space:nowrap}
.dcon{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:#e8f0fe;color:#1d4ed8;font-family:monospace}.dcorg{font-size:11px;padding:1px 7px;border-radius:9px;background:#eef0f2;color:#50575e}.dcorg.own{background:#e0ecfb;color:#1d5fa8}
table.dct tr.dcgh td{background:#f6f7f7;padding:5px 8px;font-size:12px}
.dcgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.dccard{border:1px solid #dcdcde;border-radius:8px;padding:8px;cursor:pointer;background:#fff;font-size:12px}.dccard:hover{border-color:#2271b1;box-shadow:0 2px 6px #0001}
.dcth{height:120px;background:#f0f0f1;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#a7aaad;font-weight:bold;overflow:hidden;margin-bottom:6px}.dcth img{max-width:100%;max-height:100%}.dccn{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
tr.dcmore td{padding:6px 10px;font-size:12px}tr.dcmore a,.dcmorec a{color:#2271b1;cursor:pointer;font-weight:600}.dcmorec{text-align:center;padding:12px;font-size:13px}
dialog.dcpv{width:min(900px,94vw);max-width:none}dialog.dcpv .dh,dialog.dcup .dh,dialog.dced .dh{display:flex;align-items:center}.dcx{margin-left:auto;background:none;border:none;color:#fff;font-size:16px;cursor:pointer;padding:0 4px}
.dcpm{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #eee;font-size:12px}
.dcpb{background:#e9ebee;margin:10px 14px;border-radius:6px;height:60vh;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px 0}.dcpb canvas,.dcpb img{box-shadow:0 1px 4px #0003;background:#fff;max-width:calc(100% - 24px)}.dcpb img{object-fit:contain}
dialog.dcup{width:min(1000px,96vw);max-width:none}.dcchips{border:1px dashed #c3c4c7;border-radius:8px;padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;max-height:90px;overflow:auto}.dcchips span{background:#f0f6fc;color:#1d5fa8;border-radius:9px;padding:1px 8px}
.dcsum{margin:8px 0;font-size:12px;font-weight:600}.dcokt{color:#16803c}.dcqt{color:#b45309}.dcbat{display:flex;align-items:center;gap:10px;background:#f6f7f7;border:1px solid #e0e0e0;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:12px}.dcbat label{display:inline-flex;gap:5px;align-items:center}
table.dcut{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12px}table.dcut th{text-align:left;background:#f6f7f7;padding:6px}table.dcut td{padding:4px 6px;border-top:1px solid #eee;white-space:nowrap}table.dcut select,table.dcut input:not([type=checkbox]){width:calc(100% - 22px);font-size:12px}
.dcun{overflow:hidden;text-overflow:ellipsis;font-weight:600}table.dcut tr.dcwarn td{background:#fff8c5}table.dcut tr.dcwarn .dcun{color:#b42318}.dcok,.dcq{font-style:normal;margin-left:4px;font-weight:bold}.dcok{color:#16803c}.dcq{display:inline-block;width:15px;height:15px;line-height:15px;text-align:center;border-radius:50%;background:#f59e0b;color:#fff;font-size:10px}
#dcdrop{display:none;position:fixed;inset:0;z-index:9999;background:#2271b122;border:4px dashed #2271b1;pointer-events:none;align-items:center;justify-content:center}#dcdrop.on{display:flex}#dcdrop div{background:#2271b1;color:#fff;font-size:22px;font-weight:bold;padding:18px 36px;border-radius:12px;box-shadow:0 6px 20px #0003}`;document.head.appendChild(st)}
