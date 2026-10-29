// ===== 수량 가져오기: PDF·이미지 → LOT별 수량 (오프라인) =====
// 추출기 인터페이스: extract(src,onProg) → {lots:[{lot,color,rolls:[],cut,yd}], total:{cut,yd}|null, warnings:[], previews:[dataURL]}
// src = {name, type:'pdf'|'image', bytes:Uint8Array}. 나중에 AI(API 키) 추출기를 LotExtractors에 추가하면 됨.
const LotExtractors={local:{name:'노트북 안에서 인식 (오프라인)',extract:liLocal}};
async function extractLots(src,onProg,id){return (LotExtractors[id||'local']||LotExtractors.local).extract(src,onProg||(()=>{}))}
const LI={src:null,res:null,lots:[],total:null,previews:[],busy:false,zoom:false};
if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdfjs/pdf.worker.min.js';
const PDFOPT={cMapUrl:'vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'vendor/pdfjs/standard_fonts/',isEvalSupported:false};
async function liPdfTokens(page){const vp=page.getViewport({scale:1}),tc=await page.getTextContent(),out=[];
 for(const it of tc.items){const s=it.str||'';if(!s.trim())continue;const [x,y]=vp.convertToViewportPoint(it.transform[4],it.transform[5]),fh=Math.hypot(it.transform[2],it.transform[3])||10,cw=(it.width||fh*s.length*0.5)/s.length;let off=0;
  for(const p of s.split(/(\s+)/)){if(p.trim())out.push({t:p,x0:x+off*cw,x1:x+(off+p.length)*cw,y0:y-fh,y1:y});off+=p.length}}return out}
async function liRender(page,width){const v1=page.getViewport({scale:1}),vp=page.getViewport({scale:width/v1.width}),cv=document.createElement('canvas');cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
 const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);await page.render({canvasContext:g,viewport:vp}).promise;return cv}
// 전처리: 확대 → 흑백 → 이진화(Otsu) → 표 선 지우기
function liPrep(src,mode){mode=mode||window.LI_PREP||'gray';const TW=window.LI_TW||1600,sc=Math.min(3,TW/src.width),W=Math.round(src.width*sc),H=Math.round(src.height*sc),cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.imageSmoothingQuality='high';g.fillStyle='#fff';g.fillRect(0,0,W,H);g.drawImage(src,0,0,W,H);
 const im=g.getImageData(0,0,W,H),d=im.data,gr=new Uint8Array(W*H),hist=new Array(256).fill(0);for(let i=0;i<W*H;i++){const v=(d[i*4]*0.299+d[i*4+1]*0.587+d[i*4+2]*0.114)|0;gr[i]=v;hist[v]++}
 let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let sb=0,wb=0,best=0,th=128;for(let t=0;t<256;t++){wb+=hist[t];if(!wb)continue;const wf=W*H-wb;if(!wf)break;sb+=t*hist[t];const mb=sb/wb,mf=(sum-sb)/wf,b=wb*wf*(mb-mf)*(mb-mf);if(b>best){best=b;th=t}}
 if(mode==='gray'){for(let i=0;i<W*H;i++){d[i*4]=d[i*4+1]=d[i*4+2]=gr[i]}g.putImageData(im,0,0);return cv}
 const bk=new Uint8Array(W*H);for(let i=0;i<W*H;i++)bk[i]=gr[i]<th?1:0;const rm=new Uint8Array(W*H),LH=Math.max(60,W*0.04),LV=Math.max(60,H*0.03);
 for(let y=0;y<H;y++){let s=-1;for(let x=0;x<=W;x++){const on=x<W&&bk[y*W+x];if(on&&s<0)s=x;if(!on&&s>=0){if(x-s>=LH)for(let k=s;k<x;k++)rm[y*W+k]=1;s=-1}}}
 for(let x=0;x<W;x++){let s=-1;for(let y=0;y<=H;y++){const on=y<H&&bk[y*W+x];if(on&&s<0)s=y;if(!on&&s>=0){if(y-s>=LV)for(let k=s;k<y;k++)rm[k*W+x]=1;s=-1}}}
 for(let i=0;i<W*H;i++){const v=mode==='bin'?(bk[i]?0:255):(bk[i]&&!rm[i]?0:255);d[i*4]=d[i*4+1]=d[i*4+2]=v;d[i*4+3]=255}g.putImageData(im,0,0);return cv}
// OCR: 여러 배율·전처리로 읽어 보고, 명세서 합계(절/YD)와 가장 잘 맞는 결과를 고름. 모두 맞으면 바로 멈춤
function liScore(r){let sc=0,all=r.lots.length>0;for(const l of r.lots){const c=LotParse.check(l),has=l.cut!=null||l.yd!=null;if(has&&c.okCut&&c.okYd)sc+=10;else{all=false;if(has)sc-=6}sc+=Math.min(c.n,20)*0.3}
 if(r.total&&r.total.yd!=null){const s=r.lots.reduce((a,l)=>a+LotParse.check(l).s,0);if(Math.abs(s-r.total.yd)<0.01)sc+=8;else all=false}return {sc,all}}
async function liOcr(cv,onProg){const ws=[...new Set([Math.min(cv.width,2400),1000,1600,2400].map(w=>Math.round(w/100)*100))],tries=[];
 for(const w of ws)for(const m of ['gray','lines'])tries.push([w,m]);if(window.LI_W)tries.splice(0,tries.length,[window.LI_W,window.LI_PREP||'gray']);
 let best=null;for(let i=0;i<tries.length;i++){const [w,m]=tries[i];onProg(`글자 인식 중… (${i+1}/${tries.length}) 여러 방식으로 읽고 합계와 맞춰 보는 중`);
  window.LI_TW=w;const p=liPrep(cv,m),blob=await new Promise(r=>p.toBlob(r,'image/png'));const o=await A.lotOcr(new Uint8Array(await blob.arrayBuffer()));if(window.LI_DEBUG)window.__liDbg={r:o,prep:p.toDataURL()};
  const r=LotParse.parseTokens(LotParse.mergeOcr(LotParse.mergeOcr(o.words,o.digits),o.digits6||[],true),{ocr:true}),q=liScore(r);r._q=q.sc;r._v=`${w}/${m}`;if(!best||q.sc>best._q)best=r;if(q.all)break}
 return best}
async function liLocal(src,onProg){const pages=[],previews=[];
 if(src.type==='pdf'){onProg('PDF 여는 중…');const doc=await pdfjsLib.getDocument({...PDFOPT,data:src.bytes.slice()}).promise,n=Math.min(doc.numPages,5);
  for(let i=1;i<=n;i++){const pg=await doc.getPage(i),toks=await liPdfTokens(pg),digits=toks.filter(k=>/\d/.test(k.t)).length;previews.push((await liRender(pg,1100)).toDataURL('image/jpeg',0.85));
   if(digits>=15){onProg(`${i}쪽 글자 읽는 중…`);pages.push({...LotParse.parseTokens(toks),mode:'text'})}else{onProg(`${i}쪽 스캔 이미지 인식 준비…`);pages.push({...await liOcr(await liRender(pg,2000),onProg),mode:'ocr'})}}}
 else{const bmp=await createImageBitmap(new Blob([src.bytes]));const cv=document.createElement('canvas');cv.width=bmp.width;cv.height=bmp.height;cv.getContext('2d').drawImage(bmp,0,0);previews.push(cv.toDataURL('image/jpeg',0.9));pages.push({...await liOcr(cv,onProg),mode:'ocr'})}
 const lots=[],warnings=[];let total=null;pages.forEach((p,i)=>{lots.push(...p.lots);p.warnings.forEach(w=>warnings.push((pages.length>1?`${i+1}쪽: `:'')+w));if(p.total)total=p.total});
 return {lots,total,warnings,previews,mode:pages.some(p=>p.mode==='ocr')?'ocr':'text'}}
// ---- 화면 ----
function liDlg(){let d=$('lidlg');if(!d){d=document.createElement('dialog');d.id='lidlg';d.style.cssText='width:96vw;max-width:96vw;height:92vh;max-height:92vh';document.body.appendChild(d);
  d.addEventListener('paste',liPaste);d.addEventListener('close',()=>{LI.busy=false})}return d}
function liOpen(){Object.assign(LI,{src:null,res:null,lots:[],total:null,previews:[],busy:false,msg:''});const d=liDlg();liRenderDlg();if(!d.open)d.showModal()}
function liRenderDlg(){const d=liDlg(),has=LI.previews.length;
 d.innerHTML=`<div style="display:flex;flex-direction:column;height:100%"><div class="dh" style="display:flex;align-items:center;gap:10px">수량 가져오기 <span class="muted" style="font-weight:normal;font-size:13px">받은 거래명세서 PDF·이미지를 끌어다 놓거나, 캡처 후 Ctrl+V · 인식 결과는 적용 전에 고칠 수 있어요</span></div>
 <div style="flex:1;display:flex;gap:12px;padding:12px;min-height:0">
  <div style="width:38%;display:flex;flex-direction:column;gap:8px;min-height:0">
   <div id="li_drop" ondragover="event.preventDefault();this.style.background='#eef5ff'" ondragleave="this.style.background=''" ondrop="liDrop(event)" style="border:2px dashed #9ab;border-radius:8px;padding:14px;text-align:center;color:#456">
    ${LI.busy?`<b>${esc(LI.msg||'읽는 중…')}</b>`:`PDF·PNG·JPG 파일을 여기에 끌어다 놓기<br><button style="margin-top:6px" onclick="$('li_file').click()">파일 선택</button> <span class="muted">또는 Ctrl+V로 캡처 붙여넣기</span>`}
    <input type="file" id="li_file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" style="display:none" onchange="liPick(this)"></div>
   ${LI.src?`<div class="muted" style="font-size:12px">${esc(LI.src.name)}${LI.res?` · ${LI.res.mode==='text'?'PDF 글자에서 읽음 (정확도 높음)':'글자 인식(OCR) — 숫자를 꼭 확인하세요'}`:''}</div>`:''}
   <div style="flex:1;overflow:auto;border:1px solid #dde;border-radius:6px;background:#f7f8fa">${has?LI.previews.map(u=>`<img src="${u}" style="width:${LI.zoom?'200%':'100%'};display:block;cursor:zoom-in" onclick="LI.zoom=!LI.zoom;liRenderDlg()">`).join(''):'<p class="muted" style="padding:12px">원본 미리보기가 여기에 보여요.</p>'}</div>
  </div>
  <div style="flex:1;overflow:auto;min-width:0" id="li_grid">${liGrid()}</div></div>
 <div class="df"><span id="li_tot" style="margin-right:auto">${liTotHTML()}</span><button onclick="liApply(false)" ${LI.lots.length?'':'disabled'}>추가</button><button class="p" onclick="liApply(true)" ${LI.lots.length?'':'disabled'}>적용</button><button onclick="$('lidlg').close()">취소</button></div></div>`}
function liGrid(){if(!LI.res&&!LI.lots.length)return '<p class="muted">파일을 넣으면 LOT별 수량이 여기에 표로 나와요.</p>';
 const w=LI.res&&LI.res.warnings.length?`<p class="warn">${LI.res.warnings.map(esc).join('<br>')}</p>`:'';
 return w+`<table class="lot" id="li_t"><thead><tr><th style="width:80px">LOT NO.</th><th style="width:90px">COLOR</th>${Array.from({length:10},(_,i)=>`<th>${i+1}</th>`).join('')}<th style="width:44px">절</th><th style="width:70px">수량(YD)</th><th style="width:120px">명세서 절 / YD</th><th style="width:30px"></th></tr></thead>
 <tbody>${LI.lots.map((l,k)=>`<tr class="li_r${k}"><td rowspan="${LN(l)}"><input value="${esc(l.lot)}" oninput="LI.lots[${k}].lot=this.value"></td><td rowspan="${LN(l)}"><input value="${esc(l.color)}" oninput="LI.lots[${k}].color=this.value"></td>${Array.from({length:10},(_,i)=>liCell(k,i,l)).join('')}<td rowspan="${LN(l)}" class="num" id="li_c${k}"></td><td rowspan="${LN(l)}" class="num" id="li_q${k}"></td>
  <td rowspan="${LN(l)}" style="font-size:12px"><span style="display:flex;gap:3px"><input style="width:42px" inputmode="decimal" placeholder="절" value="${l.cut??''}" oninput="liV(${k},'cut',this.value)"><input inputmode="decimal" placeholder="YD" value="${l.yd??''}" oninput="liV(${k},'yd',this.value)"></span><div id="li_s${k}"></div></td><td rowspan="${LN(l)}"><button onclick="liDel(${k})" title="LOT 삭제">✕</button></td></tr>${Array.from({length:LN(l)-1},(_,j)=>`<tr class="li_r${k}">${Array.from({length:10},(_,i)=>liCell(k,(j+1)*10+i,l)).join('')}</tr>`).join('')}`).join('')}</tbody></table><div style="margin-top:8px"><button onclick="liAdd()">+ LOT 추가</button></div>`}
const LN=l=>Math.max(2,Math.ceil(l.rolls.length/10));
const liCell=(k,i,l)=>`<td class="rcw"><input class="rc" inputmode="decimal" value="${l.rolls[i]==null||l.rolls[i]===''?'':l.rolls[i]}" oninput="liR(${k},${i},this)"></td>`;
const liNum=v=>{v=String(v).replace(/,/g,'').trim();return v===''||isNaN(+v)?null:+v};
function liR(k,i,el){const v=liNum(el.value);LI.lots[k].rolls[i]=v==null?'':v;el.classList.toggle('bad',el.value.trim()!==''&&v==null);liCheck()}
function liV(k,f,v){LI.lots[k][f]=liNum(v);liCheck()}
function liDel(k){LI.lots.splice(k,1);$('li_grid').innerHTML=liGrid();liCheck();liBtns()}
function liAdd(){const p=LI.lots[LI.lots.length-1];LI.lots.push({lot:String(LI.lots.length+1),color:p?p.color:'',rolls:Array(20).fill(''),cut:null,yd:null});$('li_grid').innerHTML=liGrid();liCheck();liBtns()}
function liBtns(){const b=$('lidlg').querySelectorAll('.df button');b[1].disabled=b[2].disabled=!LI.lots.length}
function liTotHTML(){if(!LI.lots.length)return '';const c=LI.lots.map(LotParse.check),n=c.reduce((a,x)=>a+x.n,0),s=Math.round(c.reduce((a,x)=>a+x.s,0)*100)/100,bad=c.filter(x=>!x.okCut||!x.okYd).length;
 const T=LI.total,vt=T&&(T.cut!=null||T.yd!=null)?T:null,ok=!vt||((vt.cut==null||vt.cut===n)&&(vt.yd==null||Math.abs(vt.yd-s)<0.01));
 return `LOT ${LI.lots.length}개 · 총 <b>${n}</b>절 · <b>${fnum(s)}</b> YD${vt?` <span style="color:${ok?'#2f855a':'#c53030'}">(명세서 합계 ${vt.cut!=null?vt.cut+'절 ':''}${vt.yd!=null?fnum(vt.yd)+' YD':''} ${ok?'✓ 일치':'— 불일치'})</span>`:''}${bad?` · <b style="color:#c53030">확인 필요 ${bad}개 LOT</b>`:''}`}
function liCheck(){LI.lots.forEach((l,k)=>{const c=LotParse.check(l),bad=!c.okCut||!c.okYd;if(!$('li_c'+k))return;$('li_c'+k).textContent=c.n||'';$('li_q'+k).textContent=fnum(c.s||'');
  document.querySelectorAll('.li_r'+k+' td').forEach(td=>td.style.background=bad?'#fde8e8':'');
  $('li_s'+k).innerHTML=l.cut==null&&l.yd==null?'<span class="muted">명세서 합계 없음</span>':bad?`<b style="color:#c53030">불일치</b><br>명세서 ${l.cut??'-'}절 / ${l.yd!=null?fnum(l.yd):'-'}<br>계산 ${c.n}절 / ${fnum(c.s)}`:'<span style="color:#2f855a">✓ 일치</span>'});const t=$('li_tot');if(t)t.innerHTML=liTotHTML()}
async function liLoad(name,type,bytes){if(LI.busy)return;Object.assign(LI,{src:{name,type,bytes},busy:true,msg:'읽는 중…',previews:[]});liRenderDlg();
 try{const r=await extractLots(LI.src,m=>{LI.msg=m;const z=$('li_drop');if(z&&LI.busy){const b=z.querySelector('b');if(b)b.textContent=m}});
  LI.res=r;LI.previews=r.previews;LI.total=r.total;LI.lots=r.lots.map(l=>{const ro=l.rolls.slice();ro.length=Math.max(20,Math.ceil(ro.length/10)*10);for(let i=0;i<ro.length;i++)if(ro[i]==null)ro[i]='';return {lot:l.lot,color:l.color,rolls:ro,cut:l.cut,yd:l.yd}});
  if(!LI.lots.length)r.warnings.push('수량을 찾지 못했어요. 더 선명한 PDF/캡처를 넣거나 직접 입력해 주세요.')}
 catch(e){LI.res={warnings:['읽지 못했습니다: '+(e.message||e)],lots:[]};LI.lots=[]}
 LI.busy=false;if($('lidlg').open){liRenderDlg();liCheck()}}
function liTypeOf(name,mime){if(/pdf/i.test(mime)||/\.pdf$/i.test(name))return 'pdf';if(/image\/(png|jpe?g)/i.test(mime)||/\.(png|jpe?g)$/i.test(name))return 'image';return ''}
async function liFile(f){const t=liTypeOf(f.name||'',f.type||'');if(!t)return toast('PDF, PNG, JPG 파일만 넣을 수 있어요');await liLoad(f.name||'붙여넣은 이미지',t,new Uint8Array(await f.arrayBuffer()))}
function liDrop(ev){ev.preventDefault();const f=ev.dataTransfer.files[0];if(f)liFile(f)}
function liPick(el){const f=el.files[0];if(f)liFile(f);el.value=''}
function liPaste(ev){const it=[...(ev.clipboardData||{}).items||[]].find(i=>i.kind==='file');if(!it)return;ev.preventDefault();const f=it.getAsFile();if(f)liFile(new File([f],'붙여넣은 캡처.png',{type:f.type||'image/png'}))}
async function liApply(replace){const ok=LI.lots.filter(l=>l.lot||l.rolls.some(v=>v!==''));if(!ok.length)return;if(!stEd)return;
 const has=stEd.lots.filter(l=>lotCnt(l));if(replace&&has.length&&!await uiConfirm(`지금 입력된 LOT ${has.length}개를 지우고 가져온 ${ok.length}개 LOT로 바꿀까요?`))return;
 const nl=ok.map(l=>normLot({lotNo:l.lot,color:l.color,rolls:l.rolls}));
 if(replace)stEd.lots=nl;else stEd.lots=stEd.lots.filter(l=>lotCnt(l)).concat(nl);
 $('lidlg').close();renderEditor();toast(`${nl.length}개 LOT를 ${replace?'적용':'추가'}했어요. 숫자를 한 번 더 확인해 주세요`)}
