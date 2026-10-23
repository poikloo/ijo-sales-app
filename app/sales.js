// ===== 매출 관리 (data.sales) — 매출 현황(집계) / 매출 목록 / 엑셀 가져오기 =====
let sales=[],slTab='dash',slF={year:'',client:'',basis:'total'};
const slN=v=>{if(v==null)return 0;const s=String(v).replace(/[,\s원₩]/g,'');if(!s||/^-+$/.test(s))return 0;const n=+s;return isNaN(n)?NaN:n};
const slWon=n=>Math.round(+n||0).toLocaleString('ko-KR');
// 금액 규칙: 단가×수량 → 공급가액, 공급가/총액 중 하나만 있으면 VAT 10%로 환산
function slFix(x){if(!x.supply&&x.unitPrice&&x.qty)x.supply=Math.round(x.unitPrice*x.qty);
 if(x.supply&&!x.total)x.total=Math.round(x.supply*1.1);else if(x.total&&!x.supply)x.supply=Math.round(x.total/1.1);return x}
function slNorm(x){const d=/^\d{4}-\d{2}-\d{2}$/.test(x&&x.date||'')?x.date:'',n=k=>{const v=+x[k];return isFinite(v)?v:0};
 return slFix({id:String(x.id||uid()),date:d,year:d?+d.slice(0,4):(Math.round(+x.year)||0),client:String(x.client||'').trim(),orderNo:String(x.orderNo||'').trim(),item:String(x.item||''),fabric:String(x.fabric||''),process:String(x.process||''),color:String(x.color||''),
  unitPrice:n('unitPrice'),qty:n('qty'),supply:n('supply'),total:n('total'),memo:String(x.memo||''),source:x.source==='import'?'import':''})}
function slLoad(r){sales=(r&&!Array.isArray(r)&&Array.isArray(r.sales)?r.sales:[]).filter(x=>x&&typeof x==='object').map(slNorm)}
const slPayload=()=>({sales});
function slImport(r){if(r&&!Array.isArray(r)&&Array.isArray(r.sales))slLoad(r)}
// ---- 집계 ----
const slAmt=(x,b)=>b==='supply'?x.supply:x.total;
const slOk=(x,b)=>slAmt(x,b)>0&&x.year>0&&!!x.client;
function slAgg(rows,f){const b=f.basis,V=rows.filter(x=>slOk(x,b)),ex=rows.length-V.length,yrs=[...new Set(V.map(x=>x.year))].sort((a,b)=>a-b);
 const S=a=>a.reduce((s,x)=>s+slAmt(x,b),0),byY=f.client?V.filter(x=>x.client===f.client):V,byC=f.year?V.filter(x=>x.year===+f.year):V,cur=f.client?byC.filter(x=>x.client===f.client):byC;
 const yT=yrs.map(y=>{const a=byY.filter(x=>x.year===y);return {y,cnt:a.length,amt:S(a),cl:new Set(a.map(x=>x.client)).size}}),yTot=S(byY);
 yT.forEach((r,i)=>{r.share=yTot?r.amt/yTot:0;const p=i?yT[i-1]:null;r.prev=p&&p.y===r.y-1?p.amt:null;r.diff=r.prev!=null?r.amt-r.prev:null;r.gr=r.prev?r.diff/r.prev:null});
 const cm=new Map();byC.forEach(x=>{let c=cm.get(x.client);if(!c)cm.set(x.client,c={c:x.client,cnt:0,amt:0,ys:{}});c.cnt++;c.amt+=slAmt(x,b);c.ys[x.year]=(c.ys[x.year]||0)+slAmt(x,b)});
 const cT=[...cm.values()].sort((a,b)=>b.amt-a.amt||lsCmp(a.c,b.c)),cTot=S(byC);let cu=0;cT.forEach((r,i)=>{r.rank=i+1;r.share=cTot?r.amt/cTot:0;cu+=r.share;r.cum=cu});
 const sum=S(cur),cnt=cur.length,prevY=f.year?S((f.client?V.filter(x=>x.client===f.client):V).filter(x=>x.year===+f.year-1)):0;
 let mon=null,undated=0;if(f.year){mon=Array.from({length:12},()=>({cnt:0,amt:0}));cur.forEach(x=>{if(x.date){const m=mon[+x.date.slice(5,7)-1];m.cnt++;m.amt+=slAmt(x,b)}else undated++})}
 return {V,ex,yrs,yT,yTot,yCnt:byY.length,cT,cTot,sum,cnt,qty:cur.reduce((s,x)=>s+(+x.qty||0),0),clients:new Set(cur.map(x=>x.client)).size,rank:f.client?(cT.find(r=>r.c===f.client)||{}).rank:null,prevY,mon,undated,nYears:new Set(cur.map(x=>x.year)).size}}
// ---- 화면 ----
function slSetTab(t){slTab=t;render()}
function slSel(id,opts,val,all){const e=$(id);if(!e)return;const h=`<option value="">${all}</option>`+opts.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');if(e.dataset.h!==h){e.innerHTML=h;e.dataset.h=h}e.value=opts.map(String).includes(String(val))?val:''}
function renderSales(){document.querySelectorAll('#p_sales .tab').forEach(e=>e.classList.toggle('on',e.dataset.t===slTab));$('sl_dash').style.display=slTab==='dash'?'':'none';$('sl_list').style.display=slTab==='list'?'':'none';
 const ys=[...new Set(sales.map(x=>x.year).filter(Boolean))].sort((a,b)=>b-a),cs=[...new Set(sales.map(x=>x.client).filter(Boolean))].sort(lsCmp);
 if(slTab==='dash'){slSel('sd_y',ys,slF.year,'전체 연도');slSel('sd_c',cs,slF.client,'전체 거래처');$('sd_b').value=slF.basis;slF.year=$('sd_y').value;slF.client=$('sd_c').value;slDash()}else{slSel('sl_y',ys,$('sl_y').value,'전체 연도');slSel('sl_c',cs,$('sl_c').value,'전체 거래처');slList()}}
function slFilt(){slF.year=$('sd_y').value;slF.client=$('sd_c').value;slF.basis=$('sd_b').value;render()}
function slPick(c){slF.client=slF.client===c?'':c;render()}
const slPc=v=>v==null?'—':(v*100).toFixed(1)+'%',slSg=v=>v==null?'—':`<span class="${v<0?'neg':v>0?'pos':''}">${v>0?'+':''}${typeof v==='number'&&Math.abs(v)<10&&!Number.isInteger(v)?(v*100).toFixed(1)+'%':slWon(v)}</span>`;
function slBars(rows){const mx=Math.max(1,...rows.map(r=>r[1]));return `<div class="slb">${rows.map(([k,v])=>`<div class="slbr"><span>${k}</span><span class="dbt"><span style="width:${v>0?Math.max(1,v/mx*100):0}%;background:#2271b1"></span></span><span class="slv">${slWon(v)}원</span></div>`).join('')}</div>`}
function slDash(){const a=slAgg(sales,slF),bl=slF.basis==='supply'?'공급가액':'총액(VAT포함)',kpi=(t,v,s)=>`<div class="card dbk"><div class="muted">${t}</div><b>${v}</b><small class="muted">${s}</small></div>`;
 const yoy=slF.year?(a.prevY?((a.sum-a.prevY)/a.prevY):null):null;
 $('sd_k').innerHTML=kpi('매출 합계',slWon(a.sum)+'원',`약 ${(a.sum/1e8).toFixed(1)}억원 · ${bl}`)+kpi('거래 건수',slWon(a.cnt)+'건',`납품수량 ${slWon(a.qty)}`)+
  (slF.client?kpi('거래처 순위',a.rank?a.rank+'위':'—',`${slF.year?slF.year+'년 ':''}전체 ${a.cT.length}곳 중`):kpi('거래처 수',slWon(a.clients)+'곳',slF.year?slF.year+'년 거래처':'전체 기간'))+
  kpi('건당 평균',slWon(a.cnt?a.sum/a.cnt:0)+'원','매출 합계 ÷ 거래 건수')+
  (slF.year?kpi('전년 대비',yoy==null?'—':`<span class="${yoy<0?'neg':'pos'}">${yoy>0?'+':''}${(yoy*100).toFixed(1)}%</span>`,`${+slF.year-1}년 ${slWon(a.prevY)}원`):kpi('연평균 매출',slWon(a.nYears?a.sum/a.nYears:0)+'원',`${a.nYears}개 연도 평균`));
 $('sd_ex').innerHTML=a.ex?`<span class="muted">⚠ 금액이 0이거나 연도·거래처가 비어 있는 ${slWon(a.ex)}건은 집계에서 뺐어요.</span>`:'';
 const yr=a.yT.map(r=>`<tr${slF.year&&+slF.year===r.y?' class="sel"':''}><td>${r.y}년</td><td class="n">${slWon(r.cnt)}</td><td class="n"><b>${slWon(r.amt)}</b></td><td class="n">${slPc(r.share)}</td><td class="n">${r.gr==null?'—':`<span class="${r.gr<0?'neg':'pos'}">${r.gr>0?'+':''}${(r.gr*100).toFixed(1)}%</span>`}</td><td class="n">${r.diff==null?'—':`<span class="${r.diff<0?'neg':'pos'}">${r.diff>0?'+':''}${slWon(r.diff)}</span>`}</td><td class="n">${r.prev==null?'—':slWon(r.prev)}</td><td class="n">${r.cl}</td></tr>`).join('');
 $('sd_y_t').innerHTML=`<table class="ul slt"><thead><tr><th>연도</th><th class="n">건수</th><th class="n">매출</th><th class="n">비중</th><th class="n">증감률</th><th class="n">증감액</th><th class="n">전년 매출</th><th class="n">거래처 수</th></tr></thead><tbody>${yr||'<tr><td colspan="8" class="muted">매출 데이터가 없어요. [매출 목록]에서 추가하거나 엑셀을 가져오세요.</td></tr>'}</tbody>${a.yT.length?`<tfoot><tr><td>합계</td><td class="n">${slWon(a.yCnt)}</td><td class="n">${slWon(a.yTot)}</td><td class="n">100.0%</td><td colspan="3"></td><td class="n">${new Set(a.V.filter(x=>!slF.client||x.client===slF.client).map(x=>x.client)).size}</td></tr></tfoot>`:''}</table>`;
 $('sd_y_c').innerHTML=a.yT.length?slBars(a.yT.map(r=>[r.y+'년',r.amt])):'';
 $('sd_m').style.display=slF.year?'':'none';
 if(slF.year)$('sd_m_b').innerHTML=slBars(a.mon.map((m,i)=>[(i+1)+'월',m.amt]))+(a.undated?`<p class="muted" style="font-size:12px;margin:6px 0 0">매출일 없이 연도만 있는 ${slWon(a.undated)}건(${slWon(a.sum-a.mon.reduce((s,m)=>s+m.amt,0))}원)은 월별에서 빠져요.</p>`:'');
 $('sd_mt').textContent=slF.year?`${slF.year}년 월별 매출`:'';
 const yc=a.yrs;$('sd_c_t').innerHTML=`<table class="ul slt"><thead><tr><th>순위</th><th>거래처</th><th class="n">건수</th><th class="n">매출</th><th class="n">비중</th><th class="n">누적</th>${yc.map(y=>`<th class="n">${y}년</th>`).join('')}</tr></thead><tbody>${a.cT.map(r=>`<tr class="r${slF.client===r.c?' sel':''}" onclick="slPick(${esc(JSON.stringify(r.c))})" title="클릭: 이 거래처로 보기"><td>${r.rank}</td><td><b>${esc(r.c)}</b></td><td class="n">${slWon(r.cnt)}</td><td class="n"><b>${slWon(r.amt)}</b></td><td class="n">${slPc(r.share)}</td><td class="n">${slPc(r.cum)}</td>${yc.map(y=>`<td class="n">${r.ys[y]?slWon(r.ys[y]):'-'}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${6+yc.length}" class="muted">데이터가 없어요.</td></tr>`}</tbody>${a.cT.length?`<tfoot><tr><td colspan="2">합계</td><td class="n">${slWon(a.cT.reduce((s,r)=>s+r.cnt,0))}</td><td class="n">${slWon(a.cTot)}</td><td class="n">100.0%</td><td></td>${yc.map(y=>`<td class="n">${slWon(a.cT.reduce((s,r)=>s+(r.ys[y]||0),0))}</td>`).join('')}</tr></tfoot>`:''}</table>`}
function slRows(){const q=$('sl_k').value.trim().toLowerCase(),y=$('sl_y').value,c=$('sl_c').value;
 return lsSort('sales',sales.filter(x=>(!y||x.year===+y)&&(!c||x.client===c)&&(!q||[x.orderNo,x.client,x.item,x.fabric,x.color,x.process,x.memo,x.date,x.year].join(' ').toLowerCase().includes(q))),x=>({no:x.orderNo,client:x.client,date:x.date||(x.year?String(x.year):'')}))}
function slList(){lsBar('sales','매출일');const L=slRows();
 $('sltb').innerHTML=L.map(x=>`<tr class="r" onclick="slOpen('${x.id}')"${slOk(x,'total')?'':' style="color:#999"'}><td><b>${esc(x.orderNo)||'-'}</b></td><td class="dt">${x.date||(x.year?x.year+'년':'-')}</td><td>${esc(x.client)}</td><td>${esc(x.item)}${x.fabric?`<br><small class="muted">${esc(x.fabric)}</small>`:''}</td><td>${esc(x.color)}</td><td>${esc(x.process)}</td><td class="n">${x.qty?slWon(x.qty):''}</td><td class="n">${x.unitPrice?slWon(x.unitPrice):''}</td><td class="n">${slWon(x.supply)}</td><td class="n"><b>${slWon(x.total)}</b></td></tr>`).join('')||'<tr><td colspan="10" class="muted">매출이 없어요. [+ 추가] 또는 [엑셀 가져오기]로 넣으세요.</td></tr>';
 const s=k=>L.reduce((a,x)=>a+(+x[k]||0),0);$('sltf').innerHTML=`<tr><td colspan="6">합계 ${slWon(L.length)}건</td><td class="n">${slWon(s('qty'))}</td><td></td><td class="n">${slWon(s('supply'))}</td><td class="n">${slWon(s('total'))}</td></tr>`}
// ---- 편집 ----
let slMan={};
function slOpen(id){const x=id?sales.find(s=>s.id===id):{date:ymd(new Date()),year:new Date().getFullYear(),client:'',orderNo:'',item:'',fabric:'',process:'',color:'',unitPrice:0,qty:0,supply:0,total:0,memo:''};if(!x)return;slMan={s:!!(id&&x.supply&&Math.round(x.unitPrice*x.qty)!==x.supply),t:!!(id&&x.total&&Math.round(x.supply*1.1)!==x.total)};
 const f=(k,l,v,a='')=>`<label>${l}<input id="sa_${k}" value="${esc(v)}" ${a}></label>`,n=v=>v?slWon(v):'';
 $('dt').textContent=id?'매출 수정':'매출 추가';
 $('dbody').innerHTML=`<div class="g"><div style="display:grid;grid-template-columns:1fr 110px;gap:8px"><label>매출일<input id="sa_date" type="date" value="${esc(x.date)}" onchange="slDateCh()"></label><label>연도<input id="sa_year" inputmode="numeric" value="${x.year||''}" ${x.date?'disabled':''} title="매출일을 모를 때만 연도만 입력"></label></div>
 <label>오더번호<input id="sa_orderNo" list="sa_ol" value="${esc(x.orderNo)}" onchange="slOrdCh()" placeholder="생산 관리 오더에서 고르면 자동 입력"></label><datalist id="sa_ol">${orders.map(o=>`<option value="${esc(o.no)}">${esc(o.client)} · ${esc(o.item)}</option>`).join('')}</datalist>
 ${f('client','거래처',x.client,'list="sa_cl"')}<datalist id="sa_cl">${[...new Set([...sales,...orders].map(o=>o.client).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist>${f('item','품목',x.item)}${f('fabric','아이템명',x.fabric)}
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>색상<input id="sa_color" value="${esc(x.color)}"><select id="sa_cp" style="display:none;margin-top:4px" onchange="if(this.value)$('sa_color').value=this.value"></select></label>${f('process','가공구분',x.process)}</div>
 <div class="w" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${f('unitPrice','단가',n(x.unitPrice),'class="num" inputmode="numeric" oninput="slCalc(this)"')}${f('qty','수량',n(x.qty),'class="num" inputmode="numeric" oninput="slCalc(this)"')}${f('supply','공급가액',n(x.supply),'class="num" inputmode="numeric" oninput="slCalc(this)"')}${f('total','총액(VAT포함)',n(x.total),'class="num" inputmode="numeric" oninput="slCalc(this)"')}</div>
 <p class="muted w" style="font-size:12px;margin:0">단가×수량으로 공급가액, 공급가액×1.1로 총액이 자동 계산돼요. 직접 고쳐 쓰면 그 값이 유지돼요.</p>
 <label class="w">메모<input id="sa_memo" value="${esc(x.memo)}"></label></div>`;
 $('dfoot').innerHTML=`${id?`<button class="d" onclick="slDel('${id}')">삭제</button><span style="flex:1"></span>`:''}<button onclick="dlg.close()">취소</button><button class="p" onclick="slSave('${id||''}')">저장</button>`;if(!dlg.open)dlg.showModal();slOrdCh(true)}
function slDateCh(){const d=$('sa_date').value,y=$('sa_year');if(d){y.value=d.slice(0,4);y.disabled=true}else y.disabled=false}
function slOrdCh(init){const o=orders.find(x=>x.no===$('sa_orderNo').value.trim()),cp=$('sa_cp');if(!o){cp.style.display='none';return}
 if(!init)[['client','client'],['item','item'],['fabric','fabric']].forEach(([k,ok])=>{if(o[ok])$('sa_'+k).value=o[ok]});
 const cols=[...new Set(o.lines.map(l=>l.color).filter(Boolean))];if(cols.length>1){cp.innerHTML='<option value="">색상 선택…</option>'+cols.map(c=>`<option>${esc(c)}</option>`).join('');cp.style.display=''}else{cp.style.display='none';if(!init&&cols[0])$('sa_color').value=cols[0]}}
function slCalc(el){el.value=fmtN(el.value);const g=k=>+$('sa_'+k).value.replace(/,/g,'')||0,k=el.id.slice(3);
 if(k==='supply')slMan.s=!!el.value;if(k==='total')slMan.t=!!el.value;
 if((k==='unitPrice'||k==='qty')&&!slMan.s){const s=Math.round(g('unitPrice')*g('qty'));$('sa_supply').value=s?slWon(s):''}
 if(k!=='total'&&!slMan.t){const s=g('supply');$('sa_total').value=s?slWon(Math.round(s*1.1)):''}}
function slSave(id){const g=k=>$('sa_'+k).value.trim(),nn=k=>+g(k).replace(/,/g,'')||0,d=g('date'),y=d?+d.slice(0,4):Math.round(+g('year'))||0;
 if(!y)return alert('매출일이나 연도를 입력하세요.');if(!g('client'))return alert('거래처를 입력하세요.');
 const o=slNorm({id:id||uid(),date:d,year:y,client:g('client'),orderNo:g('orderNo'),item:g('item'),fabric:g('fabric'),process:g('process'),color:g('color'),unitPrice:nn('unitPrice'),qty:nn('qty'),supply:nn('supply'),total:nn('total'),memo:g('memo')});
 if(id){const i=sales.findIndex(s=>s.id===id);o.source=sales[i].source;sales[i]=o}else sales.push(o);save();dlg.close();render();toast('저장했습니다')}
function slDel(id){if(!confirm('이 매출을 삭제할까요?'))return;sales=sales.filter(s=>s.id!==id);save();dlg.close();render();toast('삭제했습니다')}
async function slCSV(){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',h=['오더번호','매출일','연도','거래처','품목','아이템명','색상','가공구분','수량','단가','공급가액','총액(VAT포함)','메모'];
 const rows=slRows().map(x=>[x.orderNo,x.date,x.year||'',x.client,x.item,x.fabric,x.color,x.process,x.qty,x.unitPrice,x.supply,x.total,x.memo]);
 const p=await A.saveFile(`매출관리_${stamp()}.csv`,'\uFEFF'+[h.map(q).join(','),...rows.map(r=>r.map(q).join(','))].join('\r\n'));if(p)toast('내보내기 완료: '+p)}
// ---- 대시보드 위젯 ----
function slDashW(){const e=$('dbsales');if(!e)return;const t=new Date(),ym=dbYm(t),y=t.getFullYear(),V=sales.filter(x=>slOk(x,'total')),m=V.filter(x=>x.date.startsWith(ym)),yy=V.filter(x=>x.year===y),S=a=>a.reduce((s,x)=>s+x.total,0);
 e.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><h2 style="margin:0">매출</h2><span class="muted" style="font-size:12px">총액(VAT포함)</span><span style="flex:1"></span><button style="font-size:12px;padding:2px 8px" onclick="go('sales')">매출 관리 ›</button></div>
 <div class="slw"><div><div class="muted">이번 달 (${t.getMonth()+1}월)</div><b>${slWon(S(m))}원</b><small class="muted">${m.length}건</small></div><div><div class="muted">올해 (${y}년)</div><b>${slWon(S(yy))}원</b><small class="muted">${yy.length}건 · 약 ${(S(yy)/1e8).toFixed(1)}억원</small></div></div>`}
// ---- 엑셀 가져오기 ----
let siBook=null,siSh=0,siHdr=0,siMap={},siName='';
const SI_F=[['year','연도'],['date','매출일'],['client','거래처'],['orderNo','오더번호'],['item','품목'],['fabric','아이템명'],['process','가공구분'],['color','색상'],['unitPrice','단가'],['qty','수량'],['supply','공급가액'],['total','총액(VAT)']];
const siH=x=>String(x||'').toUpperCase().replace(/[\s._()]/g,'');
function siDetect(h){const n=h.map(siH),f=t=>n.findIndex(t),m={};
 m.year=f(x=>x==='연도'||x==='년도'||x==='YEAR');m.date=f(x=>x.includes('매출일')||x.includes('납품일')||x==='날짜'||x==='DATE');m.client=f(x=>x.includes('업체')||x.includes('거래처')||x.includes('BUYER'));
 m.orderNo=f(x=>x.includes('LINO')||x.includes('ORDERNO')||x.includes('오더번호'));m.item=f(x=>x.includes('용도')||x.includes('품목'));m.fabric=f(x=>x.includes('품명')||x.includes('아이템'));
 m.process=f(x=>x.includes('가공'));m.color=f(x=>x.includes('COLOR')||x.includes('색상'));m.unitPrice=f(x=>x.includes('단가'));m.qty=f(x=>x.includes('수량'));m.supply=f(x=>x.includes('공급가'));m.total=f(x=>x.includes('총액')||x.includes('합계금액'));return m}
function siFindHdr(rows){return rows.slice(0,15).findIndex(r=>{const n=r.map(siH);return n.some(x=>x.includes('업체')||x.includes('거래처'))&&n.some(x=>x.includes('단가'))})}
async function slImportOpen(){if(!A.salesImportPick)return alert('데스크톱 앱에서만 사용할 수 있습니다.');let r;try{r=await A.salesImportPick()}catch(e){return alert('파일을 읽지 못했습니다: '+e)}if(!r)return;
 siBook=r.sheets.filter(s=>s.rows.length);if(!siBook.length)return alert('데이터가 없습니다.');siName=r.name;let best=-1;siBook.forEach((s,i)=>{const h=siFindHdr(s.rows);if(h>=0&&(best<0||s.rows.length-h>siBook[best].rows.length-siFindHdr(siBook[best].rows)))best=i});siSh=Math.max(0,best);siSet()}
function siSet(){const rows=siBook[siSh].rows;siHdr=Math.max(0,siFindHdr(rows));siMap=siDetect(rows[siHdr]);siRender()}
function siAnalyze(){const R=siBook[siSh].rows.slice(siHdr+1),g=(r,k)=>siMap[k]>=0?String(r[siMap[k]]??'').trim():'',cl=v=>/^-+$/.test(v)?'':v,L=[],bad=[];let ex=0;
 R.forEach((r,i)=>{const rn=siHdr+i+2,t={};['client','orderNo','item','fabric','process','color'].forEach(k=>t[k]=cl(g(r,k)));
  const nums={};['unitPrice','qty','supply','total'].forEach(k=>{const v=slN(g(r,k));if(isNaN(v)){bad.push(`${rn}행: ${SI_F.find(f=>f[0]===k)[1]} "${g(r,k)}" 숫자 아님`);nums[k]=0}else nums[k]=v});
  const yv=cl(g(r,'year')),d=oiDate(g(r,'date'));if(d.bad)bad.push(`${rn}행: 매출일 "${g(r,'date')}" 인식 불가`);
  let year=d.v?+d.v.slice(0,4):0;if(!year&&yv){const m=yv.match(/^(\d{4})/)||yv.match(/^(\d{2})$/);year=m?(m[1].length===2?2000+ +m[1]:+m[1]):0;if(!year)bad.push(`${rn}행: 연도 "${yv}" 인식 불가`)}
  if(!year&&!t.client&&!t.orderNo&&!t.item&&!t.fabric&&!nums.unitPrice&&!nums.qty)return;// 빈 줄(수식만 있는 줄 포함)
  const o=slNorm({id:'',date:d.v,year,...t,orderNo:t.orderNo.replace(/^[Mm]\s*(?=\d)/,''),...nums,source:'import'});o.rn=rn;o.ok=slOk(o,'total');if(!o.ok)ex++;L.push(o)});
 return {L,bad,ex}}
function siRender(){const sh=siBook[siSh],h=sh.rows[siHdr]||[],a=siAnalyze(),mode=(document.querySelector('input[name=simode]:checked')||{}).value||'add',prev=sales.filter(x=>x.source==='import').length;
 $('dt').textContent='매출 엑셀 가져오기 — '+siName;if(!dlg.style.width){dlg.style.width='min(1200px,96vw)';dlg.addEventListener('close',()=>dlg.style.width='',{once:true})}
 $('dbody').innerHTML=`${siBook.length>1?`<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><b style="font-size:13px">시트</b><select onchange="siSh=+this.value;siSet()">${siBook.map((s,i)=>`<option value="${i}"${i===siSh?' selected':''}>${esc(s.name)}</option>`).join('')}</select><span class="muted" style="font-size:12px">머리글 ${siHdr+1}행</span></div>`:''}
 <div class="fsec">칸 연결 (자동 인식, 필요하면 바꾸세요)</div><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px 12px;margin-top:6px">${SI_F.map(([k,t])=>`<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:12px;font-weight:600;color:#555">${t}</span><select style="width:100%;min-width:0;box-sizing:border-box" onchange="siMap.${k}=+this.value;siRender()"><option value="-1">(없음)</option>${h.map((c,i)=>`<option value="${i}"${siMap[k]===i?' selected':''}>${esc(c||'열 '+(i+1))}</option>`).join('')}</select></div>`).join('')}</div>
 <div style="margin:16px 0 10px;padding-top:10px;border-top:1px solid #e5e5e5;display:flex;gap:16px;flex-wrap:wrap;align-items:center"><b>매출 ${a.L.length}건</b><span>합계(총액) <b>${slWon(a.L.reduce((s,x)=>s+x.total,0))}원</b></span><span>집계 제외 <b class="${a.ex?'neg':''}">${a.ex}</b> <small class="muted">(금액 0 또는 연도·거래처 없음)</small></span><span>문제 <b class="${a.bad.length?'neg':''}">${a.bad.length}</b></span></div>
 <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px"><label style="display:inline"><input type="radio" name="simode" value="add"${mode==='add'?' checked':''}> 모두 추가</label><label style="display:inline"><input type="radio" name="simode" value="re"${mode==='re'?' checked':''}${prev?'':' disabled'}> 기존 엑셀 가져온 매출(${prev}건) 삭제 후 다시 넣기</label></div>
 ${a.bad.length?`<div class="neg" style="max-height:80px;overflow:auto;font-size:12px;margin-bottom:8px">${a.bad.slice(0,200).map(esc).join('<br>')}</div>`:''}
 <div style="max-height:44vh;overflow:auto"><table><thead><tr><th>행</th><th>연도/매출일</th><th>거래처</th><th>오더번호</th><th>품목 / 아이템명</th><th>색상</th><th>가공구분</th><th class="n">수량</th><th class="n">단가</th><th class="n">공급가액</th><th class="n">총액</th></tr></thead><tbody>${a.L.slice(0,500).map(x=>`<tr${x.ok?'':' style="background:#fff1f0"'}><td class="muted">${x.rn}</td><td>${x.date||x.year||''}</td><td>${esc(x.client)}</td><td>${esc(x.orderNo)}</td><td>${esc(x.item)}${x.fabric?`<br><small class="muted">${esc(x.fabric)}</small>`:''}</td><td>${esc(x.color)}</td><td>${esc(x.process)}</td><td class="n">${slWon(x.qty)}</td><td class="n">${slWon(x.unitPrice)}</td><td class="n">${slWon(x.supply)}</td><td class="n">${slWon(x.total)}</td></tr>`).join('')}</tbody></table>${a.L.length>500?'<div class="muted">… 미리보기는 500건까지 표시</div>':''}</div>`;
 $('dfoot').innerHTML=`<button onclick="dlg.close()">취소</button><button class="p" onclick="siRun()"${a.L.length?'':' disabled'}>가져오기 (${a.L.length}건)</button>`;if(!dlg.open)dlg.showModal()}
async function siRun(){const a=siAnalyze(),re=(document.querySelector('input[name=simode]:checked')||{}).value==='re';if(A.preImportBackup)await A.preImportBackup();
 let del=0;if(re){del=sales.filter(x=>x.source==='import').length;sales=sales.filter(x=>x.source!=='import')}
 a.L.forEach((x,i)=>{const {rn,ok,...o}=x;o.id=uid()+i;sales.push(o)});save();dlg.close();slTab='list';render();toast(`가져오기 완료: ${a.L.length}건${del?` (기존 ${del}건 교체)`:''}${a.ex?` · 집계 제외 ${a.ex}건`:''}`)}
