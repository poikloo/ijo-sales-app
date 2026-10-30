// ===== 통합 검색 (앱 안 모든 데이터 로컬 검색, 띄어쓰기 무시, 여러 단어 AND) =====
const GS_C=[['price','단가','#e67e22','단가 관리','prtb','prOpen'],['prod','생산','#2f6fd6','생산 관리','ptb','openDetail'],['sales','매출','#16a085','매출 관리','sltb','slOpen'],
 ['stmt','거래명세서','#8e44ad','거래명세서','stb','editStmt'],['testrpt','TEST REPORT','#c0392b','TEST REPORT','trtb','trOpen'],['quality','품질 기준','#2c7a3a','품질 기준','',''],['contacts','거래처','#7f8c8d','거래처 정보','cttb','viewContact']];
let gsTab='all',gsLast={q:'',R:{},ms:0};
const gsN=s=>String(s||'').toLowerCase().replace(/\s+/g,'');
const gsJ=(...a)=>a.filter(v=>v!=null&&v!=='').join(' · ');
const gsNum=v=>v==null||v===''||!isFinite(+v)?'':Number(v).toLocaleString('ko-KR');
function gsItems(){const S=snapBuild(),q=S.qualityStandards||[];
 return {price:S.prices.map(p=>({id:p.id,t:gsJ(p.item,p.part)||p.code||'(이름 없음)',b:gsJ(p.category,p.greige&&p.greige.vendor),k:gsJ(p.net!=null&&'NET단가 '+gsNum(p.net)+'원',p.processingFee!=null&&'가공료 '+gsNum(p.processingFee)+'원',p.color,p.width),s:p.search,ex:p.example})),
 prod:S.orders.map(o=>({id:o.id,t:gsJ(o.no,o.item),b:o.client,k:gsJ(o.fabric,o.qty&&gsNum(o.qty)+(o.unit||''),o.due&&'납기 '+o.due,o.delivered?'완료':'진행중'),s:o.search,ex:o.example})),
 sales:S.sales.map(x=>({id:x.id,t:gsJ(x.date,x.item),b:x.client,k:gsJ(x.total!=null&&x.total!==''&&gsNum(x.total)+'원',x.qty&&gsNum(x.qty),x.orderNo,x.fabric),s:x.search,ex:false})),
 stmt:S.statements.map(s=>({id:s.id,t:gsJ(s.orderNo||s.no,s.item),b:gsJ(s.date,s.customer&&s.customer.name),k:gsJ(s.spec,s.totalQty&&'수량 '+gsNum(s.totalQty),s.dest),s:s.search,ex:s.example})),
 testrpt:S.testReports.map(x=>({id:x.id,t:x.name,b:gsJ(x.lab,x.reportNo),k:gsJ(x.result,x.completed&&'완료 '+x.completed,x.failedItems,x.files.length?'📎 성적서':''),s:x.search,ex:x.example})),
 quality:q.map(x=>({id:x.id,t:x.name,b:x.category,k:gsJ(x.specNo&&'규격 '+x.specNo,x.fabrics.length&&'원단 '+x.fabrics.map(f=>f.name).join('·'),x.irApplied&&'IR 적용'),s:x.search,ex:x.example})),
 contacts:S.contacts.map(c=>({id:c.id,t:gsJ(c.company,c.name),b:gsJ(c.team,c.title),k:gsJ(c.tels&&c.tels[0],c.mobiles&&c.mobiles[0],c.email),s:c.search,ex:c.example}))}}
function gsRun(q){const t0=performance.now(),terms=q.trim().split(/\s+/).map(gsN).filter(Boolean),R={};
 if(terms.length){const I=gsItems();for(const [k] of GS_C)R[k]=(I[k]||[]).filter(x=>{const h=gsN(x.s+' '+x.t+' '+x.b+' '+x.k);return terms.every(w=>h.includes(w))})}
 gsLast={q,R,ms:performance.now()-t0,terms};return gsLast}
function gsHi(s,terms){s=String(s||'');if(!terms||!terms.length)return esc(s);
 const re=new RegExp(terms.map(w=>[...w].map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*')).sort((a,b)=>b.length-a.length).join('|'),'gi');
 let o='',i=0;s.replace(re,(m,p)=>{if(!m)return m;o+=esc(s.slice(i,p))+'<mark>'+esc(m)+'</mark>';i=p+m.length;return m});return o+esc(s.slice(i))}
function gsInput(){gsRender()}
function gsClear(){$('gsq').value='';gsRender();$('gsq').focus()}
function gsSetTab(t){gsTab=t;gsRender()}
function gsRender(){const el=$('gsres');if(!el)return;const q=$('gsq').value,{R,ms,terms}=gsRun(q);
 $('gsx').style.visibility=q?'visible':'hidden';
 const cats=GS_C.filter(([k])=>k!=='quality'||(typeof qualities!=='undefined'&&qualities.length)),tot=cats.reduce((a,[k])=>a+(R[k]||[]).length,0);
 if(gsTab!=='all'&&!cats.some(c=>c[0]===gsTab))gsTab='all';
 $('gstabs').innerHTML=[['all','전체',tot],...cats.map(([k,l])=>[k,l,(R[k]||[]).length])].map(([k,l,n])=>`<span class="${k===gsTab?'on':''}${n?'':' z'}" onclick="gsSetTab('${k}')">${l} ${n}</span>`).join('');
 if(!terms.length){$('gsmeta').textContent='';el.innerHTML='';return}
 $('gsmeta').textContent=`약 ${(gsTab==='all'?tot:(R[gsTab]||[]).length).toLocaleString()}건 (${(ms/1000).toFixed(2)}초)`;
 const secs=cats.filter(([k])=>(gsTab==='all'||gsTab===k)&&(R[k]||[]).length);
 el.innerHTML=secs.length?secs.map(([k,l,c,crumb])=>{const L=R[k],show=gsTab==='all'?L.slice(0,3):L;
  return `<div class="gssec"><h4><span class="gsbd" style="background:${c}">${l}</span>${L.length}건</h4>${show.map(x=>`<div class="gsr" onclick="gsOpen('${k}','${x.id}')"><div class="gsm"><div class="gst">${gsHi(x.t,terms)}${x.ex?' <small class="muted">(예시)</small>':''}</div><div class="gsbc">${esc(crumb)}${x.b?' › '+gsHi(x.b,terms):''}</div>${x.k?`<div class="gskv">${gsHi(x.k,terms)}</div>`:''}</div><span class="gso">↗ 열기</span></div>`).join('')}${gsTab==='all'&&L.length>3?`<div class="gsmore" onclick="gsSetTab('${k}')">${l} 결과 더보기 ›</div>`:''}</div>`}).join('')
  :'<div class="gsempty">검색 결과가 없어요.</div>'}
function gsFind(c,id){const tb=c[4]&&$(c[4]);return tb&&[...tb.rows].find(r=>(r.getAttribute('onclick')||'').includes(`'${id}'`))}
function gsOpen(k,id){const c=GS_C.find(x=>x[0]===k);if(!c)return;if(k==='quality'){qsF.k='';qsF.cat='';qsF.ir='';go('quality');if($('qsk'))$('qsk').value='';qsPick(id);setTimeout(()=>{const e=document.querySelector('#qslst .qsi.sel');if(e){e.scrollIntoView({block:'center'});e.classList.add('gsflash');setTimeout(()=>e.classList.remove('gsflash'),2600)}},50);return}if(k==='price'&&typeof prTab!=='undefined')prTab='list';go(k);
 setTimeout(()=>{let tr=gsFind(c,id);
  if(!tr){const pg=$('p_'+k);if(pg){pg.querySelectorAll('.filters input:not([type=checkbox]),.filters select:not([title="정렬"])').forEach(e=>{if(e.tagName==='SELECT'?[...e.options].some(o=>o.value===''):true)e.value=''});render();tr=gsFind(c,id)}}
  if(tr){tr.scrollIntoView({block:'center'});tr.classList.remove('gsflash');void tr.offsetWidth;tr.classList.add('gsflash');setTimeout(()=>tr.classList.remove('gsflash'),2600)}
  else if(c[5]&&window[c[5]])window[c[5]](id)},60)}
function gsShow(){go('gsearch');setTimeout(()=>{const i=$('gsq');i.focus();i.select()},30)}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='k'||e.key==='K')){e.preventDefault();if(document.querySelector('dialog[open]'))return;gsShow()}},true);
