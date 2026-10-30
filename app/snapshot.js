// ===== 조회용 스냅샷 (Grok Bot 업무 요청이 읽기 전용으로 조회) — requests/snapshot/snapshot.json =====
// 형식: docs/REQUESTS.md 'Lookup snapshot'. 저장 후 약 2초 뒤(디바운스)·앱 시작 시 다시 씀. 비밀·토큰·설정은 넣지 않음.
const SNAP_SCHEMA=1;let snapOn=true,snapT=0,snapLast='',snapErr='',appVer='';
const snapLoad=r=>{snapOn=!(r&&!Array.isArray(r)&&r.snapshotEnabled===false)};
const snapPayload=()=>({snapshotEnabled:snapOn});
const r2=v=>v==null||v===''||!isFinite(+v)?null:Math.round(+v*100)/100;
const snapS=a=>a.map(v=>v==null?'':String(v)).filter(Boolean).join(' ');
const fnames=(l,f)=>l.filter(f).map(x=>x.name);
function snapBuild(){
 const S=typeof prSet!=='undefined'?prSet:{};
 const P=prices.map(p=>{const c=prCalc(p);return {id:p.id,category:p.cat,part:p.part,code:p.code,item:p.item,color:p.color,width:p.width,
  greige:{vendor:p.gV,currency:p.gCur,price:r2(p.g),priceKRW:r2(c.g)},dye:{vendor:p.dV,shrink:r2(c.dS),price:r2(p.d),cumulative:r2(c.c1)},
  proc1:{vendor:p.p1V,desc:p.p1D,shrink:r2(c.s1),price:r2(p.p1),cumulative:r2(c.c2)},proc2:{vendor:p.p2V,desc:p.p2D,shrink:r2(c.s2),price:r2(p.p2),cumulative:r2(c.c3)},
  processingFee:r2((+p.p1||0)+(+p.p2||0)),etc:{desc:p.eD,price:r2(p.e)},trans:r2(p.t),marginRate:r2(c.m),
  net:r2(c.net),netPerM:r2(c.netM),margin:r2(c.mg),offer:r2(c.off),offerPerM:r2(c.offM),offerVat:r2(c.offV),offerVatPerM:r2(c.offVM),
  memo:p.memo,example:!!p.example,search:snapS([p.cat,p.part,p.code,p.item,p.color,p.width,p.gV,p.dV,p.p1V,p.p1D,p.p2V,p.p2D,p.eD,p.memo])}});
 const SL=sales.map(x=>({id:x.id,date:x.date,year:x.year,client:x.client,orderNo:x.orderNo,item:x.item,fabric:x.fabric,process:x.process,color:x.color,unitPrice:x.unitPrice,qty:x.qty,supply:x.supply,total:x.total,memo:x.memo,
  search:snapS([x.client,x.orderNo,x.item,x.fabric,x.process,x.color,x.memo])}));
 const O=orders.map(o=>{const wf=wfFiles.filter(f=>f.orderId===o.id);return {id:o.id,no:o.no,item:o.item,fabric:o.fabric,client:o.client,date:o.date,due:o.due,delivered:!!o.delivered,
  qty:o.qty,unit:o.unit,lines:o.lines.map(l=>({color:l.color,qty:l.qty,unit:l.unit})),
  processes:o.procs.map((p,i)=>({step:i+1,name:p.name,vendor:p.vendor,shrink:p.shrink,shippedQty:p.ships.reduce((s,x)=>s+(+x.qty||0),0),
   shipments:p.ships.map(x=>({date:x.date,qty:x.qty,memo:x.memo,statementFiles:fnames(shipFiles,f=>f.shipId===x.id)}))})),
  workOrderFiles:fnames(wf,f=>f.kind==='wo'),purchaseOrderFiles:fnames(wf,f=>f.kind==='po'),example:!!o.example,
  search:snapS([o.no,o.item,o.fabric,o.client,...o.lines.map(l=>l.color),...o.procs.flatMap(p=>[p.name,p.vendor])])}});
 const ST=stmts.map(s=>{const lots=s.lots.map(l=>{const rolls=l.rolls.filter(v=>v!=='');return {lotNo:l.lotNo,color:l.color,rolls,qty:r2(rolls.reduce((a,b)=>a+(+b||0),0))}});
  return {id:s.id,no:s.no,date:s.date,orderNo:s.orderNo,item:s.item,spec:s.spec,customer:{...s.cust},supplier:s.sup?s.sup.name||'':'',dest:s.dest,contact:s.contact,unitPrice:s.price===''?null:s.price,note:s.note,
   lots,totalQty:r2(lots.reduce((a,l)=>a+l.qty,0)),example:!!s.example,search:snapS([s.orderNo,s.item,s.spec,s.cust&&s.cust.name,s.dest,s.note,...lots.flatMap(l=>[l.lotNo,l.color])])}});
 const TR=trs.map(x=>({id:x.id,name:x.name,lab:x.lab,reportNo:x.no,received:x.recv,completed:x.done,result:x.result,failedItems:x.fail,memo:x.memo,linkedQuality:x.qs&&qsGet(x.qs.id)?{name:qsGet(x.qs.id).name,fabric:(qsGet(x.qs.id).fabrics.find(f=>f.id===x.qs.fab)||{}).name||'',results:x.qs.res}:null,files:fnames(wfFiles,f=>f.kind==='tr'&&f.orderId===x.id),example:!!x.example,
  search:snapS([x.name,x.lab,x.no,x.result,x.fail,x.memo])}));
 const CT=contacts.map(c=>({id:c.id,company:c.company,name:c.name,team:c.team,title:c.title,email:c.email,web:c.web,addrs:c.addrs,tels:c.tels,faxes:c.faxes,mobiles:c.mobiles,memo:c.memo,example:!!c.example,
  search:snapS([c.company,c.name,c.team,c.title,c.email,c.memo,...c.tels,...c.mobiles])}));
 const QS=typeof qsSnap==='function'?qsSnap():[];
 return {schema:SNAP_SCHEMA,app:'ijo-sales',appVersion:appVer,generatedAt:new Date().toISOString(),readOnly:true,
  priceSettings:{fx:S.fx,yd2m:S.yd2m,vat:S.vat,defaultDyeShrink:S.dye,defaultProc1Shrink:S.g1,defaultProc2Shrink:S.g2,defaultMargin:S.margin},
  counts:{prices:P.length,sales:SL.length,orders:O.length,statements:ST.length,testReports:TR.length,contacts:CT.length,qualityStandards:QS.length},
  prices:P,sales:SL,orders:O,statements:ST,testReports:TR,contacts:CT,qualityStandards:QS}}
async function snapWrite(){snapT=0;if(!snapOn||!A.snapWrite)return;try{const r=await A.snapWrite(JSON.stringify(snapBuild(),null,1));snapLast=r&&r.mtime||'';snapErr=''}catch(e){snapErr=String(e&&e.message||e)}if(page==='settings')snapSettings()}
function snapSched(){if(!snapOn||!A.snapWrite)return;clearTimeout(snapT);snapT=setTimeout(snapWrite,2000)}
async function snapToggle(v){snapOn=!!v;save();if(!snapOn){clearTimeout(snapT);snapT=0;try{await A.snapDelete()}catch(e){}snapLast='';toast('조회용 파일을 삭제했어요')}else{await snapWrite();toast('조회용 파일을 만들었어요')}snapSettings()}
async function snapInit(){try{const i=await A.info();appVer=i&&i.version||''}catch(e){}if(!A.snapWrite)return;if(snapOn)snapWrite();else A.snapDelete().catch(()=>{})}
function snapSettings(){const el=$('snap_card');if(!el)return;const d=snapLast?new Date(snapLast):null,t=d?ymd(d)+' '+d.toTimeString().slice(0,8):'-';
 el.innerHTML=`<h2>조회용 파일 (Grok Bot 조회)</h2><p class="muted" style="margin:0 0 8px">켜 두면 단가·매출·생산·거래명세서·TEST REPORT·품질 기준·거래처 정보를 읽기 전용 파일(requests\\snapshot\\snapshot.json)로 저장해, Grok Bot이 "○○ 원단의 NET단가와 가공료" 같은 질문에 답할 수 있어요. 비밀번호·토큰·설정은 들어가지 않아요.</p>
 <label style="display:flex;align-items:center;gap:8px;font-weight:600"><input type="checkbox" id="snap_on" ${snapOn?'checked':''} onchange="snapToggle(this.checked)"> 조회용 파일 만들기 (Grok Bot 조회)</label>
 <div class="rqbar" style="margin-top:8px"><span class="muted">마지막 저장</span><b>${snapOn?esc(t):'꺼짐'}</b>${snapErr?`<span class="neg">오류: ${esc(snapErr)}</span>`:''}<span style="flex:1"></span><button onclick="A.snapOpenFolder()"${A.snapOpenFolder?'':' disabled'}>폴더 열기</button>${snapOn?'<button onclick="snapWrite().then(()=>toast(\'조회용 파일을 다시 만들었어요\'))">지금 만들기</button>':''}</div>`}
