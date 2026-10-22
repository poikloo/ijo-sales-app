// 대시보드: 숫자로 보는 현황판 (기존 데이터만 사용)
let dbM=null;
const dbPct=v=>(v>0?'+':'')+v.toFixed(1)+'%',dbCol=['#1f6feb','#1a7f37','#d4620a','#8250df','#0f8a8a','#c2255c'],dbPc=i=>dbCol[i%dbCol.length],dbSum=p=>p.ships.reduce((a,s)=>a+(+s.qty||0),0),dbNum=n=>(+n||0).toLocaleString('ko-KR');
const dbYm=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const dbIsYD=o=>String(o.unit||'YD').toUpperCase()!=='M';
function dbMv(k){const b=dbM||new Date();dbM=new Date(b.getFullYear(),b.getMonth()+k,1);render()}
function dbFinal(o){return o.procs.length?o.procs[o.procs.length-1]:null}
// 진행 공정: 출고 합계가 발주량에 못 미친 첫 공정 (모두 채웠으면 마지막 공정)
function dbStage(o){if(!o.procs.length)return null;const p=o.procs.find(p=>dbSum(p)<(+o.qty||0))||o.procs[o.procs.length-1];return {p,i:o.procs.indexOf(p),left:Math.max(0,(+o.qty||0)-dbSum(p))}}
function dbFinalYD(ym){let yd=0,m=0;orders.forEach(o=>{const f=dbFinal(o);if(!f)return;const s=f.ships.filter(x=>(x.date||'').startsWith(ym)).reduce((a,x)=>a+(+x.qty||0),0);if(dbIsYD(o))yd+=s;else m+=s});return {yd,m}}
function dbBars(rows,color){if(!rows.length)return '<p class="muted">이 달 출고가 없어요.</p>';const mx=Math.max(...rows.map(r=>r[1]),1);
 return '<div class="dbb">'+rows.map(([k,v],i)=>`<div class="dbr"><span class="dbl" title="${esc(k)}">${esc(k)}</span><span class="dbt"><span style="width:${Math.max(1,v/mx*100)}%;background:${typeof color==='function'?color(i):color}"></span></span><span class="dbv">${dbNum(Math.round(v))} YD</span></div>`).join('')+'</div>'}
function renderDash(){const now=new Date(),cm=dbYm(now),pm=dbYm(new Date(now.getFullYear(),now.getMonth()-1,1)),td=ymd(now),wk=ymd(new Date(Date.now()+7*864e5));
 const open=orders.filter(o=>!o.delivered);
 const a=dbFinalYD(cm),b=dbFinalYD(pm),chg=b.yd?dbPct((a.yd-b.yd)/b.yd*100):'—';
 const stc=(typeof stmts!=='undefined'?stmts:[]).filter(s=>(s.date||'').startsWith(cm)).length;
 const soon=open.filter(o=>o.due&&o.due<=wk),late=soon.filter(o=>o.due<td).length;
 const kpi=(t,v,s)=>`<div class="card dbk"><div class="muted">${t}</div><b>${v}</b><small class="muted">${s}</small></div>`;
 $('dbkpi').innerHTML=kpi('진행중 오더',dbNum(open.length)+'건','납품 완료 체크 안 된 오더')
  +kpi('이번 달 출고량',dbNum(Math.round(a.yd))+' YD',`최종 공정 출고 · 지난달 대비 <b style="font-size:12px;color:${a.yd>=b.yd?'#1a7f37':'#c2255c'}">${chg}</b>${a.m?` · M 단위 ${dbNum(a.m)} M 별도`:''}`)
  +ivCard(cm)+'<div class="card dbk"><div class="muted">현재 날짜·시간</div><b id="dbclk"></b><small class="muted" id="dbcld"></small></div>';
 dbClock();
 // 2. 월 출고 현황
 const sm=dbM||now,ym=dbYm(sm);$('dbym').textContent=`${sm.getFullYear()}년 ${sm.getMonth()+1}월`;
 const byC={},byP={};let mx=0;orders.forEach(o=>{if(!dbIsYD(o)){return}const f=dbFinal(o);o.procs.forEach(p=>{const s=p.ships.filter(x=>(x.date||'').startsWith(ym)).reduce((a,x)=>a+(+x.qty||0),0);if(!s)return;const n=p.name||'(공정명 없음)';byP[n]=(byP[n]||0)+s;if(p===f){const c=o.client||'(거래처 없음)';byC[c]=(byC[c]||0)+s}})});
 const srt=m=>Object.entries(m).sort((x,y)=>y[1]-x[1]);
 $('dbcli').innerHTML=dbBars(srt(byC),'#2271b1');$('dbproc').innerHTML=dbBars(srt(byP),i=>dbPc(i));
 // 3. 진행중 오더 요약
 const ol=[...open].sort((x,y)=>(x.due||'9999').localeCompare(y.due||'9999'));
 $('dbord').innerHTML=ol.length?ol.map(o=>{const f=dbFinal(o),rt=f&&o.qty?dbSum(f)/o.qty*100:0,st=dbStage(o),r=Math.min(100,rt),od=o.due&&o.due<td;
  return `<tr class="ck" onclick="go('prod');openDetail('${o.id}')"><td>${esc(o.no)}</td><td>${esc(o.client)}</td><td>${esc(o.item)}</td><td>${st?`<span class="badge" style="background:${dbPc(st.i)};color:#fff">${esc(st.p.name||'공정')}</span>`:'<small class="muted">공정 없음</small>'}</td><td><span class="dbp"><span style="width:${r}%"></span></span><small>${rt.toFixed(0)}%</small></td><td class="dt"${od?' style="color:#c2255c"':''}>${esc(o.due||'-')}</td></tr>`}).join(''):'<tr><td colspan="6" class="muted c">진행중인 오더가 없어요.</td></tr>';
 // 4. 가공 업체별 작업량
 const V={};open.forEach(o=>{const st=dbStage(o);if(!st)return;const v=st.p.vendor||'(업체 미지정)';V[v]=V[v]||{n:0,yd:0,m:0};V[v].n++;if(dbIsYD(o))V[v].yd+=st.left;else V[v].m+=st.left});
 const vl=Object.entries(V).sort((x,y)=>y[1].yd-x[1].yd);
 $('dbven').innerHTML=vl.length?vl.map(([k,v])=>`<tr><td>${esc(k)}</td><td style="text-align:right">${v.n}건</td><td style="text-align:right">${v.yd||!v.m?dbNum(Math.round(v.yd))+" YD":""}${v.m?` <small class="muted">${v.yd?"+":""}${dbNum(v.m)} M</small>`:''}</td></tr>`).join(''):'<tr><td colspan="3" class="muted c">진행중인 가공이 없어요.</td></tr>';
 // 5. 월별 출고 추이 (최근 12개월, 최종 공정 출고 YD)
 const ms=[];for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);ms.push([d.getMonth()+1,dbFinalYD(dbYm(d)).yd])}
 const top=Math.max(...ms.map(x=>x[1]),1),W=1000,H=200,bw=W/12;
 $('dbtr').innerHTML=ms.some(x=>x[1])?`<svg viewBox="0 0 ${W} ${H+40}" style="width:100%;height:240px">${ms.map(([m,v],i)=>{const h=v/top*H,x=i*bw+bw*.18;return `<rect x="${x}" y="${H-h+16}" width="${bw*.64}" height="${h}" rx="3" fill="${i===11?'#2271b1':'#9ec5e8'}"><title>${m}월 ${dbNum(Math.round(v))} YD</title></rect>${v?`<text x="${x+bw*.32}" y="${H-h+11}" font-size="12" text-anchor="middle" fill="#444">${dbNum(Math.round(v))}</text>`:''}<text x="${x+bw*.32}" y="${H+34}" font-size="13" text-anchor="middle" fill="#666">${m}월</text>`}).join('')}<line x1="0" x2="${W}" y1="${H+16}" y2="${H+16}" stroke="#ccc"/></svg>`:'<p class="muted">최근 12개월 출고가 없어요.</p>'}

let invoices={},ivDraft=[],dbClkT=null;
function ivLoad(r){const o=r&&!Array.isArray(r)&&r.invoices&&typeof r.invoices==='object'?r.invoices:{};invoices={};Object.keys(o).forEach(k=>{if(Array.isArray(o[k]))invoices[k]=o[k].filter(x=>x&&typeof x==='object').map(x=>({client:String(x.client||''),count:Math.max(0,Math.round(+x.count||0))}))})}
function ivPayload(){return {invoices}}
function ivImport(r){if(r&&!Array.isArray(r)&&r.invoices)ivLoad(r)}
function ivCard(ym){const l=invoices[ym]||[],t=l.reduce((a,x)=>a+x.count,0),n=l.map(x=>x.client).filter(Boolean).join(', ');
 return `<div class="card dbk" style="cursor:pointer" onclick="ivEdit('${ym}')" title="${esc(n||'눌러서 입력')}"><div class="muted" style="display:flex;justify-content:space-between">이번 달 청구서<button style="font-size:11px;padding:1px 8px" onclick="event.stopPropagation();ivEdit('${ym}')">수정</button></div><b>${dbNum(t)}건</b><small class="muted dbl">${esc(n||'보낼 거래처 없음')}</small></div>`}
function ivSugg(){const s=new Set();(typeof orders!=='undefined'?orders:[]).forEach(o=>o.client&&s.add(o.client));(typeof contacts!=='undefined'?contacts:[]).forEach(c=>c.company&&s.add(c.company));return [...s].sort()}
function ivRows(){$('iv_rows').innerHTML=ivDraft.map((r,i)=>`<div style="display:grid;grid-template-columns:1fr 90px 32px;gap:6px;margin-bottom:6px"><input list="iv_dl" placeholder="거래처명" value="${esc(r.client)}" oninput="ivDraft[${i}].client=this.value"><input type="number" min="0" value="${r.count}" oninput="ivDraft[${i}].count=this.value"><button type="button" onclick="ivDraft.splice(${i},1);ivRows()">✕</button></div>`).join('')||'<p class="muted">거래처를 추가하세요.</p>'}
function ivEdit(ym){ivDraft=(invoices[ym]||[]).map(x=>({...x}));$('dt').textContent=`이번 달 청구서 (${ym.replace('-','년 ')}월)`;
 $('dbody').innerHTML=`<div style="display:grid;grid-template-columns:1fr 90px 32px;gap:6px;font-size:12px" class="muted"><span>거래처명</span><span>건수</span><span></span></div><div id="iv_rows"></div><datalist id="iv_dl">${ivSugg().map(c=>`<option value="${esc(c)}">`).join('')}</datalist><button type="button" onclick="ivDraft.push({client:'',count:1});ivRows()">+ 추가</button>`;
 $('dfoot').innerHTML=`<button onclick="dlg.close()">취소</button><button class="p" onclick="ivSave('${ym}')">저장</button>`;ivRows();if(!dlg.open)dlg.showModal()}
function ivSave(ym){const l=ivDraft.map(r=>({client:String(r.client).trim(),count:Math.max(0,Math.round(+r.count||0))})).filter(r=>r.client||r.count);if(l.length)invoices[ym]=l;else delete invoices[ym];save();dlg.close();render()}
function dbClock(){if(dbClkT)clearInterval(dbClkT);const W='일월화수목금토',f=()=>{const e=$('dbclk');if(!e){clearInterval(dbClkT);dbClkT=null;return}const d=new Date(),p=n=>String(n).padStart(2,'0');e.textContent=`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;$('dbcld').textContent=`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${W[d.getDay()]})`};f();dbClkT=setInterval(f,1000)}
