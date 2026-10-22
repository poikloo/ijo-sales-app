// ===== 수량 가져오기: 표 토큰 → LOT 목록 (PDF 텍스트·OCR 공용, 네트워크 없음) =====
// 입력 토큰: {t:문자열, x0,y0,x1,y1} (y는 위→아래 증가). 출력: {lots:[{lot,color,rolls:[],cut,yd}], total:{cut,yd}|null, warnings:[]}
(function(root){
const norm=s=>String(s||'').replace(/\s+/g,'');
const OCRFIX={O:'0',o:'0',D:'0',Q:'0',l:'1',I:'1','|':'1','!':'1',i:'1',S:'5',s:'5',B:'8',Z:'2',z:'2',g:'9',q:'9'};
function num(t,ocr){let s=String(t).trim().replace(/[()]/g,'');if(ocr&&/\d/.test(s)&&s.replace(/[^A-Za-z|!]/g,'').length<=Math.max(1,s.length/3))s=s.replace(/[OoDQlI|!iSsBZzgq]/g,c=>OCRFIX[c]);
 s=s.replace(/^[^\d-]+|[^\d]+$/g,'');if(!/^-?\d{1,3}(,\d{3})+(\.\d+)?$|^-?\d+(\.\d+)?$/.test(s))return null;const v=+s.replace(/,/g,'');return isFinite(v)?v:null}
const cx=k=>(k.x0+k.x1)/2,cy=k=>(k.y0+k.y1)/2,med=a=>{if(!a.length)return 0;const b=[...a].sort((p,q)=>p-q);return b[b.length>>1]};
function lines(toks,h){const s=[...toks].sort((a,b)=>cy(a)-cy(b)),out=[];for(const k of s){const L=out[out.length-1];if(L&&Math.abs(cy(k)-L.y)<h*0.55){L.t.push(k);L.y=(L.y*(L.t.length-1)+cy(k))/L.t.length}else out.push({y:cy(k),t:[k]})}
 for(let i=out.length-1;i>0;i--){const A=out[i-1],B=out[i];if(B.y-A.y<h*0.9&&!B.t.some(b=>A.t.some(a=>Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>-h*0.2))){A.y=(A.y*A.t.length+B.y*B.t.length)/(A.t.length+B.t.length);A.t.push(...B.t);out.splice(i,1)}}
 out.forEach(L=>{L.t.sort((a,b)=>a.x0-b.x0);const m=[];for(const k of L.t){const p=m[m.length-1];if(p&&k.x0-p.x1<h*0.28&&k.x0>=p.x0){p.t+=k.t;p.x1=Math.max(p.x1,k.x1);p.y0=Math.min(p.y0,k.y0);p.y1=Math.max(p.y1,k.y1)}else m.push({...k})}L.t=m});return out}
// 띄어 쓴 머리글(예: '합 계')을 합쳐서 검사
function findHdr(L,re){const r=[];const t=L.t;for(let i=0;i<t.length;i++){let s='';for(let j=i;j<Math.min(t.length,i+4);j++){if(j>i&&t[j].x0-t[j-1].x1>(t[j].y1-t[j].y0)*1.5)break;s+=norm(t[j].t);if(re.test(s)){r.push({x0:t[i].x0,x1:t[j].x1,x:(t[i].x0+t[j].x1)/2,y:L.y});i=j;break}}}return r}
const RE={lot:/^(LOT|L0T|LOTNO\.?|LOTN0)$/i,color:/^(COLOR|C0LOR|COLOUR|색상|COLOR명)$/i,cut:/^(절|切|切数|절수|CUT)$/i,yd:/^(합계|수량\(?YDS?\)?|\(?YDS?\)?|YDS?|수량|QTY|총수량)$/i,tot:/(합계|COL계|소계|총계|TOTAL|^계$)/i};
function parseTokens(toks,opt){opt=opt||{};const ocr=!!opt.ocr,W=[];toks=toks.filter(k=>/[0-9A-Za-z가-힣一-龥]/.test(String(k.t)));if(!toks.length)return {lots:[],total:null,warnings:['글자를 찾지 못했습니다']};
 const h=med(toks.map(k=>k.y1-k.y0))||10,L=lines(toks,h);
 // 1) 롤 번호 머리글(1~10) 줄 찾기
 let hi=-1,slots=null;for(let i=0;i<L.length;i++){const d=L[i].t.filter(k=>/^\d{1,2}$/.test(norm(k.t))&&+norm(k.t)>=1&&+norm(k.t)<=10);const u=new Map();d.forEach(k=>{if(!u.has(+norm(k.t)))u.set(+norm(k.t),cx(k))});
  if(u.size>=7&&u.size>=d.length-1){const xs=[...u.entries()].sort((a,b)=>a[0]-b[0]);const inc=xs.filter((e,j)=>j&&e[1]>xs[j-1][1]).length,dec=xs.length-1-inc;if(Math.min(inc,dec)<=1){hi=i;slots=xs;break}}}
 let rev=false;if(slots){rev=slots[slots.length-1][1]<slots[0][1];// 빠진 번호는 선형 보간
  const f=n=>{const a=slots.filter(e=>e[0]<=n).pop(),b=slots.find(e=>e[0]>=n);if(a&&b)return a[0]===b[0]?a[1]:a[1]+(b[1]-a[1])*(n-a[0])/(b[0]-a[0]);const p=slots[0],q=slots[slots.length-1],st=(q[1]-p[1])/((q[0]-p[0])||1);return a?a[1]+st*(n-a[0]):b[1]-st*(b[0]-n)};
  slots=Array.from({length:10},(_,i)=>[i+1,f(i+1)])}
 // 2) 머리글 영역(롤 번호 줄 위 3줄 ~ 그 줄)에서 LOT/COLOR/절/YD 위치
 let top=hi;if(hi<0){for(let i=0;i<L.length;i++){if(findHdr(L[i],RE.color).length){hi=top=i;break}}}
 if(hi<0)return {lots:[],total:null,warnings:['표 머리글(COLOR 또는 1~10 롤 번호)을 찾지 못했습니다']};
 const H={};const sx=slots?slots.map(e=>e[1]):[],smin=Math.min(...sx),smax=Math.max(...sx),pitch=slots?Math.abs(slots[1][1]-slots[0][1]):0,inS=x=>slots&&x>smin-pitch*0.5&&x<smax+pitch*0.5;
 for(let i=Math.max(0,hi-3);i<=hi;i++)for(const k of ['lot','color','cut','yd']){const c=findHdr(L[i],RE[k]).filter(o=>!inS(o.x));if(c.length&&!H[k])H[k]=k==='yd'?c[c.length-1]:c[0];if(c.length)top=Math.min(top,i)}
 if(H.lot&&H.color&&Math.abs(H.lot.x-H.color.x)<h)delete H.lot;
 const hdrBottom=Math.max(...L[hi].t.map(k=>k.y1));
 // 3) 데이터 줄: 합계 줄 전까지
 const data=[];let total=null;for(let i=hi+1;i<L.length;i++){const ln=L[i],txt=ln.t.map(k=>norm(k.t)).join('');
  if(ln.t.every(k=>k.y0<hdrBottom-h*0.3))continue;
  if(RE.tot.test(txt)&&!/\d{3,}.*\d{3,}.*\d{3,}/.test(txt.replace(/,/g,''))){total=ln;break}
  data.push(ln)}
 // 4) 열 결정
 const cols=[];if(H.lot)cols.push({k:'lot',x:H.lot.x});if(H.color)cols.push({k:'color',x:H.color.x,x0:H.color.x0});
 const leftBound=H.color?(H.lot&&H.lot.x<H.color.x?Math.min(H.lot.x0,H.color.x0)-h:H.color.x0-h*2):-Infinity;
 const numToks=[];data.forEach((ln,li)=>ln.t.forEach(k=>{const v=num(k.t,ocr);if(v!=null)numToks.push({k,v,li})}));
 if(slots)slots.forEach(([n,x])=>cols.push({k:'r',n,x}));
 let extra=[];// 롤 칸 밖의 숫자 열 (절/YD 후보)
 const nearCol=x=>{let b=null,bd=1e9;for(const c of cols){const d=Math.abs(c.x-x);if(d<bd){bd=d;b=c}}return {c:b,d:bd}};
 if(slots){if(H.cut)cols.push({k:'cut',x:H.cut.x});if(H.yd)cols.push({k:'yd',x:H.yd.x});
  if(!H.cut||!H.yd){const out=numToks.filter(o=>!inS(cx(o.k))&&cx(o.k)>leftBound&&!(H.lot&&Math.abs(cx(o.k)-H.lot.x)<Math.abs(cx(o.k)-(H.color?H.color.x:-1e9))&&Math.abs(cx(o.k)-H.lot.x)<pitch*1.5));extra=clusterX(out,pitch*0.6||h*2)}}
 else{// 롤 번호 머리글이 없으면 숫자 열을 x로 묶어서 결정 (색상 오른쪽)
  const out=numToks.filter(o=>o.k.x0>(H.color?H.color.x0+ (H.color.x1-H.color.x0):leftBound));const dd=[];data.forEach((ln,li)=>{const xs=out.filter(o=>o.li===li).map(o=>cx(o.k)).sort((a,b)=>a-b);for(let j=1;j<xs.length;j++)dd.push(xs[j]-xs[j-1])});const step=med(dd.filter(d=>d>h*0.8))||h*3;extra=clusterX(out,step*0.5);}
 if(extra.length){let ex=extra;// 값으로 절/YD 판단: 절=작은 정수, YD=그 오른쪽(또는 큰 값)
  const isCut=c=>c.m.every(o=>Number.isInteger(o.v)&&o.v>=0&&o.v<=30),hasYd=!!H.yd;
  if(!slots){// 오른쪽부터 YD, 절
   let yd=null,cut=null;if(H.yd){yd=ex.reduce((a,c)=>!a||Math.abs(c.x-H.yd.x)<Math.abs(a.x-H.yd.x)?c:a,null)}else if(ex.length>=3){const r=ex[ex.length-1];if(!isCut(r))yd=r}
   if(yd){const i=ex.indexOf(yd);const p=ex[i-1];if(p&&isCut(p)&&(H.cut||ex.length>=3))cut=p}
   if(yd)cols.push({k:'yd',x:yd.x});if(cut)cols.push({k:'cut',x:cut.x});ex.filter(c=>c!==yd&&c!==cut&&(!yd||c.x<yd.x)).slice(0,10).forEach((c,i)=>cols.push({k:'r',n:i+1,x:c.x}));
   if(!hasYd&&!yd)W.push('YD 합계 열을 찾지 못해 검증 없이 가져옵니다')}
  else{const side=ex.filter(c=>!cols.some(q=>q.k!=='r'&&q.k!=='lot'&&q.k!=='color'&&Math.abs(q.x-c.x)<pitch*0.6));
   if(!H.cut){const c=side.find(isCut);if(c){cols.push({k:'cut',x:c.x});side.splice(side.indexOf(c),1)}}
   if(!H.yd){const c=side.find(c=>!isCut(c))||side[0];if(c)cols.push({k:'yd',x:c.x})}}}
 // 5) 토큰 → 열, LOT 앵커
 const anchors=[],rl=[],meta=[];data.forEach((ln,li)=>{const rr=[];for(const k of ln.t){const x=cx(k);if(x<leftBound&&!(H.lot&&Math.abs(x-H.lot.x)<h*3))continue;
   const v=num(k.t,ocr);let {c}=nearCol(x);if(!c)continue;
   if(H.color&&k.x0<H.color.x+(H.color.x1-H.color.x0)&&k.x1>H.color.x0-h&&v==null&&/[^\d\s.,\-]/.test(k.t))c=cols.find(q=>q.k==='color');
   if(c.k==='r'){if(v!=null)rr.push({n:c.n,v,x})}else if(c.k==='color'){if(v==null&&/[A-Za-z가-힣]/.test(k.t))meta.push({k:'color',y:cy(k),t:String(k.t).trim(),x})}
   else if(c.k==='lot'){const s=String(k.t).trim();if(s&&s!=='-')meta.push({k:'lot',y:cy(k),t:s,x})}else if(v!=null)meta.push({k:c.k,y:cy(k),v})}
  if(rr.length)rl.push({y:ln.y,r:rr})});
 // 색상 여러 단어 합치기 / LOT 토큰 합치기
 const mergeMeta=k=>{const a=meta.filter(m=>m.k===k).sort((p,q)=>p.y-q.y||p.x-q.x),o=[];for(const m of a){const L2=o[o.length-1];if(L2&&Math.abs(L2.y-m.y)<h*0.6){L2.t+=(k==='color'?' ':'')+m.t}else o.push({...m})}return o};
 const lotA=mergeMeta('lot'),colA=mergeMeta('color');
 const pit=med(rl.map((r,i)=>i?r.y-rl[i-1].y:0).filter(d=>d>h*0.6))||h*1.6;
 let anc=(lotA.length?lotA:colA).map(m=>({y:m.y}));if(!anc.length)anc=rl.length?[{y:rl[0].y}]:[];
 const lots=anc.map(a=>({y:a.y,lot:'',color:'',lines:[],cut:null,yd:null,cuts:0,yds:0}));
 const own=y=>{let r=null;for(const o of lots)if(o.y<=y+pit*0.75)r=o;return r||lots[0]};
 rl.forEach(r=>{const o=own(r.y);if(o)o.lines.push(r)});
 lotA.forEach(m=>{const o=own(m.y);if(o&&!o.lot)o.lot=m.t});colA.forEach(m=>{const o=own(m.y);if(o)o.color=o.color?o.color+(/[가-힣]$/.test(o.color)&&/^[가-힣]/.test(m.t)?'':' ')+m.t:m.t});
 const lastY=rl.length?rl[rl.length-1].y:1e9,tail={cut:null,yd:null};
 meta.filter(m=>m.k==='cut'||m.k==='yd').forEach(m=>{if(m.y>lastY+pit*1.5){if(tail[m.k]==null)tail[m.k]=m.v;return}const o=own(m.y);if(!o)return;o[m.k]=(o[m.k]||0)+m.v;o[m.k+'s']++});
 // 6) 롤 순서: 머리글 번호 순 (역순 머리글도 번호 기준), 다음 줄은 이어서
 const res=lots.filter(o=>o.lines.length||o.lot).map((o,i)=>{const rolls=[];o.lines.forEach(ln=>ln.r.sort((a,b)=>a.n-b.n||(rev?b.x-a.x:a.x-b.x)).forEach(q=>rolls.push(q.v)));
  return {lot:o.lot||String(i+1),color:o.color,rolls,cut:o.cut,yd:o.yd}});
 res.forEach((o,i)=>{if(!o.color&&i)o.color=res[i-1].color});
 // 합계 줄 (글자로 못 찾으면 마지막 행 아래 숫자)
 if(!total&&(tail.cut!=null||tail.yd!=null))total={t:[],pre:tail};
 if(total&&total.pre)total=total.pre;else if(total){const t={cut:null,yd:null};for(const k of total.t){const v=num(k.t,ocr);if(v==null)continue;const {c}=nearCol(cx(k));if(c&&(c.k==='cut'||c.k==='yd'))t[c.k]=v}if(t.cut!=null||t.yd!=null)total=t;else total=null}
 if(!res.length)W.push('수량 행을 찾지 못했습니다');
 return {lots:res,total,warnings:W,reversed:rev}}
function clusterX(items,gap){const s=[...items].sort((a,b)=>cx(a.k)-cx(b.k)),out=[];for(const o of s){const c=out[out.length-1],x=cx(o.k);if(c&&x-c.last<gap){c.m.push(o);c.last=x;c.x=c.m.reduce((a,q)=>a+cx(q.k),0)/c.m.length}else out.push({m:[o],x,last:x})}return out}
function check(l){const n=l.rolls.filter(v=>v!==''&&v!=null).length,s=Math.round(l.rolls.reduce((a,v)=>a+(+v||0),0)*100)/100;return {n,s,okCut:l.cut==null||+l.cut===n,okYd:l.yd==null||Math.abs(+l.yd-s)<0.01}}
// OCR 2회(일반 + 숫자 전용) 결과 합치기
function mergeOcr(words,digits,addOnly){const ov=(a,b)=>{const w=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0),h=Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0);return w>0&&h>0?w*h/Math.min((a.x1-a.x0)*(a.y1-a.y0),(b.x1-b.x0)*(b.y1-b.y0)):0};
 const out=words.map(w=>({...w}));for(const d of digits){if(num(d.t)==null)continue;const hit=out.filter(w=>ov(w,d)>0.4);
  if(!hit.length){out.push({...d,fromDigits:true});continue}
  if(addOnly)continue;
  for(const w of hit){if(num(w.t,true)!=null||/\d/.test(w.t)){if(hit.length===1){w.t=d.t;w.x0=Math.min(w.x0,d.x0);w.x1=Math.max(w.x1,d.x1)}}}}
 return out}
const api={parseTokens,check,num,mergeOcr};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LotParse=api})(typeof window!=='undefined'?window:globalThis);
