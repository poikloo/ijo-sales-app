// 생산 관리: 엑셀(.xlsx/.csv) 가져오기 — 오더 기본 정보만 일괄 입력 (공정·출고는 만들지 않음)
let oiRaw=null,oiHdr=0,oiMap={},oiName='';
const OI_F=[['client','거래처'],['no','오더번호'],['item','품목'],['fabric','아이템명'],['color','색상'],['qty','발주량'],['unit','단위'],['date','발주일'],['due','납기일']];
function oiDetect(h){const n=h.map(x=>String(x||'').toUpperCase().replace(/[\s._]/g,'')),f=t=>n.findIndex(t),m={};
 m.no=f(x=>x.includes('ORDERNO')||x.includes('오더번호'));
 m.item=f(x=>x.includes('BUYERPO')||x.includes('품목'));
 m.client=f((x,i)=>(x.includes('BUYER')&&!x.includes('PO'))||x.includes('거래처'));
 m.fabric=f(x=>(x==='ITEM'||x.startsWith('ITEM')&&!x.includes('CODE'))||x.includes('아이템'));
 m.color=f(x=>x.includes('COLOR')||x.includes('색상'));
 m.qty=f(x=>x.includes('오더량')||x.includes('발주량'));
 m.unit=f(x=>x.includes('단위')||x==='UNIT');
 m.date=f(x=>x.includes('작성날')||x.includes('발주일'));
 m.due=f(x=>x.includes('완제품')||x.includes('납기'));return m}
function oiDate(v){v=String(v||'').trim();if(!v||/^-+$/.test(v))return {v:''};let m=v.match(/^(\d{2}|\d{4})[-./ ](\d{1,2})[-./ ](\d{1,2})/);if(!m&&/^\d{8}$/.test(v))m=[0,v.slice(0,4),v.slice(4,6),v.slice(6)];
 if(!m&&/^\d{5}(\.\d+)?$/.test(v)){const d=new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5);return {v:d.toISOString().slice(0,10)}}
 if(!m)return {v:'',bad:true};const y=m[1].length===2?2000+ +m[1]:+m[1],mo=+m[2],d=+m[3],t=new Date(y,mo-1,d);if(t.getMonth()!==mo-1||t.getDate()!==d)return {v:'',bad:true};return {v:`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`}}
function oiAnalyze(){const R=oiRaw.slice(oiHdr+1),g=(r,k)=>oiMap[k]>=0?String(r[oiMap[k]]??'').trim():'',clean=v=>/^-+$/.test(v)?'':v,map=new Map(),bad=[];let rows=0;
 R.forEach((r,i)=>{if(!r.some(c=>String(c||'').trim()))return;rows++;const rn=oiHdr+i+2,no=clean(g(r,'no')).replace(/^[Mm]\s*/,'');if(!no){bad.push(`${rn}행: 오더번호 없음`);return}
  const d=oiDate(g(r,'date')),u=oiDate(g(r,'due'));if(d.bad)bad.push(`${rn}행 (${no}): 발주일 "${g(r,'date')}" 인식 불가`);if(u.bad)bad.push(`${rn}행 (${no}): 납기일 "${g(r,'due')}" 인식 불가`);
  const qs=clean(g(r,'qty')).replace(/[,\s]/g,''),qty=qs===''?0:+qs;if(isNaN(qty))bad.push(`${rn}행 (${no}): 발주량 "${g(r,'qty')}" 숫자 아님`);
  const un=clean(g(r,'unit')).toUpperCase(),unit=UNITS.includes(un)?un:(un==='Y'||un==='YDS'?'YD':un==='MTR'||un==='MTS'?'M':'YD'),line={color:clean(g(r,'color')),qty:isNaN(qty)?0:qty,unit};
  let o=map.get(no);if(!o){o={no,client:clean(g(r,'client')),item:clean(g(r,'item')),fabric:clean(g(r,'fabric')),date:d.v,due:u.v,lines:[],bad:!!(d.bad||u.bad||isNaN(qty))};map.set(no,o)}else{o.bad=o.bad||!!(d.bad||u.bad||isNaN(qty));['client','item','fabric','date','due'].forEach(k=>{if(!o[k])o[k]=k==='date'?d.v:k==='due'?u.v:clean(g(r,k))})}
  o.lines.push(line)});
 const L=[...map.values()],ex=new Set(orders.map(o=>o.no));L.forEach(o=>o.dup=ex.has(o.no));return {rows,L,bad}}
async function ordImportOpen(){if(!A.ordImportPick)return alert('데스크톱 앱에서만 사용할 수 있습니다.');let r;try{r=await A.ordImportPick()}catch(e){return alert('파일을 읽지 못했습니다: '+e)}if(!r)return;
 if(!r.rows.length)return alert('데이터가 없습니다.');oiRaw=r.rows;oiName=r.name;oiHdr=Math.max(0,oiRaw.slice(0,15).findIndex(x=>x.some(c=>/ORDER\s*NO|오더번호/i.test(String(c)))));oiMap=oiDetect(oiRaw[oiHdr]);oiRender()}
function oiRender(){const h=oiRaw[oiHdr],a=oiAnalyze(),nw=a.L.filter(o=>!o.dup).length,dp=a.L.length-nw,mg=a.L.filter(o=>o.lines.length>1).length,mode=(document.querySelector('input[name=oimode]:checked')||{}).value||'skip',dv=$('oi_dv')?$('oi_dv').checked:false;
 $('dt').textContent='엑셀 가져오기 — '+oiName;
 $('dbody').innerHTML=`<div class="fsec">칸 연결 (자동 인식, 필요하면 바꾸세요)</div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px 12px;margin-top:6px">${OI_F.map(([k,t])=>`<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:12px;font-weight:600;color:#555">${t}</span><select style="width:100%;min-width:0;box-sizing:border-box" onchange="oiMap.${k}=+this.value;oiRender()"><option value="-1">(없음)</option>${h.map((c,i)=>`<option value="${i}"${oiMap[k]===i?' selected':''}>${esc(c||'열 '+(i+1))}</option>`).join('')}</select></div>`).join('')}</div>
 <div style="margin:16px 0 10px;padding-top:10px;border-top:1px solid #e5e5e5;display:flex;gap:16px;flex-wrap:wrap;align-items:center"><b>데이터 ${a.rows}행 → 오더 ${a.L.length}건</b><span>새 오더 <b>${nw}</b></span><span>여러 색상 합침 <b>${mg}</b></span><span>이미 있는 오더번호 <b class="${dp?'neg':''}">${dp}</b></span><span>문제 <b class="${a.bad.length?'neg':''}">${a.bad.length}</b></span></div>
 <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px"><span>이미 있는 오더번호: <label style="display:inline"><input type="radio" name="oimode" value="skip"${mode==='skip'?' checked':''}> 건너뛰기</label> <label style="display:inline"><input type="radio" name="oimode" value="over"${mode==='over'?' checked':''}> 덮어쓰기(기본 정보만)</label></span><label style="display:inline"><input type="checkbox" id="oi_dv"${dv?' checked':''}> 납기일이 지난 오더는 납품 완료로 표시</label></div>
 ${a.bad.length?`<div class="neg" style="max-height:90px;overflow:auto;font-size:12px;margin-bottom:8px">${a.bad.slice(0,200).map(esc).join('<br>')}${a.bad.length>200?'<br>…':''}</div>`:''}
 <div style="max-height:46vh;overflow:auto"><table><thead><tr><th>상태</th><th>오더번호</th><th>거래처</th><th>품목 / 아이템명</th><th>색상</th><th style="text-align:right">발주량</th><th>발주일</th><th>납기일</th></tr></thead><tbody>${a.L.slice(0,500).map(o=>`<tr${o.bad?' style="background:#fff1f0"':''}><td>${o.dup?'<span class="neg">중복</span>':'새 오더'}</td><td><b>${esc(o.no)}</b></td><td>${esc(o.client)}</td><td>${esc(o.item)}${o.fabric?`<br><small class="muted">${esc(o.fabric)}</small>`:''}</td><td>${o.lines.map(l=>`<div>${esc(l.color)||'-'}</div>`).join('')}</td><td style="text-align:right">${o.lines.map(l=>`<div>${num(l.qty)} ${l.unit}</div>`).join('')}</td><td>${esc(o.date)}</td><td>${esc(o.due)}</td></tr>`).join('')}</tbody></table>${a.L.length>500?'<div class="muted">… 미리보기는 500건까지 표시</div>':''}</div>`;
 $('dfoot').innerHTML=`<button onclick="dlg.close()">취소</button><button class="p" onclick="oiRun()"${a.L.length?'':' disabled'}>가져오기 (${a.L.length}건)</button>`;if(!dlg.open)dlg.showModal()}
async function oiRun(){const a=oiAnalyze(),over=(document.querySelector('input[name=oimode]:checked')||{}).value==='over',dv=$('oi_dv').checked,today=ymd(new Date());let add=0,upd=0,skip=0;
 if(A.preImportBackup)await A.preImportBackup();
 a.L.forEach(x=>{const base={no:x.no,client:x.client,item:x.item,fabric:x.fabric,date:x.date,due:x.due,lines:normLines({lines:x.lines}),updated:now()};deriveOrder(base);const del=dv&&!!x.due&&x.due<today;
  if(x.dup){if(!over){skip++;return}orders.filter(o=>o.no===x.no).forEach(o=>{Object.assign(o,base);if(del)o.delivered=true});upd++}else{orders.push({id:uid()+add,example:false,delivered:del,procs:[],...base});add++}});
 save();dlg.close();render();toast(`가져오기 완료: 새 오더 ${add}건${upd?`, 덮어쓰기 ${upd}건`:''}${skip?`, 건너뜀 ${skip}건`:''}`)}
