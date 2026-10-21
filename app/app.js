const ST=['진행중','개찰완료','낙찰','유찰'],PT={dash:'대시보드',bids:'공고 일정',results:'개찰 결과',work:'작업의뢰서',outwork:'외주작업의뢰서',stmt:'거래명세서',docs:'서류 보관함',settings:'설정'};
const A=window.api||{load:()=>JSON.parse(localStorage.getItem('ijo')||'null'),save:async d=>localStorage.setItem('ijo',JSON.stringify(d)),info:async()=>({file:'(브라우저)',backups:'-'}),openFolder:()=>{},saveFile:async()=>null,openFile:async()=>null};
let data=[],cur=new Date(),mcur=new Date(),page='dash';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const won=n=>n?Number(n).toLocaleString('ko-KR')+'원':'',fdt=s=>s?String(s).replace('T',' ').slice(0,16):'';
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const now=()=>{const d=new Date();return ymd(d)+'T'+d.toTimeString().slice(0,5)};
function toast(m){const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',2200)}
function examples(){return [{id:'ex1',example:true,name:'(예시) 2026년 군(육군·해병대) 개인전투용천막 제조',no:'R26BK01619258-000',org:'육군군수사령부',pub:'2026-07-07T10:54',open:'2026-11-03T11:00',price:1250000000,rep:'(예시)가나섬유',cos:[{n:'(예시)가나섬유',s:60},{n:'(예시)다라텍스',s:40}],status:'진행중',result:'',memo:'예시 데이터입니다. 가격·개찰일시는 임의 값입니다.',updated:now()},
 {id:'ex2',example:true,name:'(예시) 2026년 해군 방한복 원단 구매',no:'R26BK00000000-000',org:'해군군수사령부',pub:'2026-10-10T09:00',open:'2026-10-23T10:00',price:480000000,rep:'(예시)이조아이엔디',cos:[{n:'(예시)이조아이엔디',s:100}],status:'진행중',result:'',memo:'예시 데이터입니다.',updated:now()}]}
function normalize(d){const arr=Array.isArray(d)?d:(d&&Array.isArray(d.bids)?d.bids:null);if(!arr)return null;
 return arr.filter(x=>x&&typeof x==='object').map(x=>({id:String(x.id||Date.now().toString(36)+Math.random().toString(36).slice(2,6)),example:!!x.example,name:x.name||'',no:x.no||'',org:x.org||'',pub:x.pub||'',open:x.open||'',price:+x.price||0,rep:x.rep||'',cos:Array.isArray(x.cos)?x.cos.map(c=>({n:c.n||'',s:+c.s||0})):[],status:ST.includes(x.status)?x.status:'진행중',result:x.result||'',memo:x.memo||'',updated:x.updated||''}))}
function load(){const r=A.load();data=r?normalize(r):null;if(!data){data=examples();save()}}
function save(){A.save({app:'ijo-sales',version:1,savedAt:new Date().toISOString(),bids:data}).catch(e=>alert('저장 실패: '+e))}
function dday(s){const d=new Date(s.slice(0,10)+'T00:00'),t=new Date();t.setHours(0,0,0,0);return Math.round((d-t)/864e5)}
const ddLabel=n=>n===0?'D-day':n>0?'D-'+n:'D+'+(-n),tag=x=>x.example?'<span class="ex">예시</span>':'';
function go(p){page=p;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('on',e.id==='p_'+p));document.querySelectorAll('#side a').forEach(a=>a.classList.toggle('on',a.dataset.p===p));$('ptitle').textContent=PT[p];render()}
document.querySelectorAll('#side a').forEach(a=>a.onclick=()=>go(a.dataset.p));
function mv(k){cur=new Date(cur.getFullYear(),cur.getMonth()+k,1);render()}
function mvm(k){mcur=new Date(mcur.getFullYear(),mcur.getMonth()+k,1);render()}
function filtered(){const k=$('fk').value.trim().toLowerCase(),o=$('fo').value,s=$('fs').value;
 return data.filter(x=>(!o||x.org===o)&&(!s||x.status===s)&&(!k||[x.name,x.no,x.rep,x.org,...x.cos.map(c=>c.n)].join(' ').toLowerCase().includes(k))).sort((a,b)=>(a.open||'').localeCompare(b.open||''))}
function upList(){return data.filter(x=>x.open&&dday(x.open)>=0&&x.status==='진행중').sort((a,b)=>a.open.localeCompare(b.open))}
function upHTML(list){return list.length?list.map(x=>{const n=dday(x.open);return `<li onclick="view('${x.id}')"><span class="badge ${n===0?'hot':n<=3?'warm':''}">${ddLabel(n)}</span>${tag(x)}<b>${esc(x.name)}</b><br><small>${fdt(x.open)} · ${esc(x.org)}${x.price?' · '+won(x.price):''}</small></li>`}).join(''):'<li>예정된 개찰이 없습니다.</li>'}
function calHTML(y,m,mini){let h='일월화수목금토'.split('').map(d=>`<div class="dn">${d}</div>`).join('');
 const st=new Date(y,m,1-new Date(y,m,1).getDay()),today=new Date().toDateString(),sp=!mini&&$('spub').checked;
 for(let i=0;i<42;i++){const d=new Date(st.getFullYear(),st.getMonth(),st.getDate()+i),ds=ymd(d),cls=`c${d.getMonth()!==m?' o':''}${d.toDateString()===today?' t':''}`;
  const hits=data.filter(x=>x.open&&x.open.startsWith(ds));
  if(mini){h+=`<div class="${cls}${hits.length?' has':''}" ${hits.length?`onclick="view('${hits[0].id}')" title="${esc(hits.map(x=>x.name).join('\n'))}"`:''}>${d.getDate()}${hits.length?'<span class="dot"></span>':''}</div>`;continue}
  let c=hits.map(x=>`<span class="chip s${ST.indexOf(x.status)}" title="${esc(x.name)}" onclick="view('${x.id}')">${x.open.slice(11,16)} ${esc(x.name)}</span>`).join('');
  if(sp)data.forEach(x=>{if(x.pub&&x.pub.startsWith(ds))c+=`<span class="chip pub" onclick="view('${x.id}')">게시 ${esc(x.name)}</span>`});
  h+=`<div class="${cls}"><div>${d.getDate()}</div>${c}</div>`}return h}
function render(){
 const ex=data.filter(x=>x.example).length;$('exbtn').style.display=ex?'':'none';$('excnt').textContent=`현재 예시 ${ex}건`;
 if(page==='dash'){const t=new Date();t.setHours(0,0,0,0);const ws=new Date(t);ws.setDate(t.getDate()-t.getDay());const we=new Date(ws);we.setDate(ws.getDate()+7);
  $('k1').textContent=data.filter(x=>{if(!x.open)return false;const d=new Date(x.open.slice(0,10)+'T00:00');return d>=ws&&d<we}).length;
  $('k2').textContent=data.filter(x=>x.open&&x.status==='진행중'&&dday(x.open)>=0&&dday(x.open)<=3).length;
  $('k3').textContent=data.filter(x=>x.status==='진행중').length;
  const ym=ymd(t).slice(0,7);$('k4').textContent=data.filter(x=>x.status==='낙찰'&&(x.open||'').startsWith(ym)).length;
  $('dup').innerHTML=upHTML(upList().slice(0,8));$('mym').textContent=`${mcur.getFullYear()}년 ${mcur.getMonth()+1}월`;$('mcal').innerHTML=calHTML(mcur.getFullYear(),mcur.getMonth(),true);
  const rec=[...data].sort((a,b)=>(b.updated||'').localeCompare(a.updated||'')).slice(0,5);
  $('drecent').innerHTML=rec.length?rec.map(x=>`<li onclick="view('${x.id}')">${tag(x)}<b>${esc(x.name)}</b> <span class="chip s${ST.indexOf(x.status)}" style="display:inline-block">${x.status}</span><br><small>개찰 ${fdt(x.open)} · ${esc(x.org)}</small></li>`).join(''):'<li>등록된 공고가 없습니다.</li>'}
 if(page==='bids'){$('ym').textContent=`${cur.getFullYear()}년 ${cur.getMonth()+1}월`;$('cal').innerHTML=calHTML(cur.getFullYear(),cur.getMonth(),false);$('up').innerHTML=upHTML(upList());
  const orgs=[...new Set(data.map(x=>x.org).filter(Boolean))],fo=$('fo'),ov=fo.value;fo.innerHTML='<option value="">전체 수요기관</option>'+orgs.map(o=>`<option>${esc(o)}</option>`).join('');fo.value=ov;
  const f=filtered();$('tb').innerHTML=f.length?f.map(x=>`<tr class="r" onclick="view('${x.id}')"><td>${fdt(x.open)}</td><td>${tag(x)}${esc(x.name)}</td><td>${esc(x.no)}</td><td>${esc(x.org)}</td><td>${won(x.price)}</td><td>${esc(x.rep)}</td><td><span class="chip s${ST.indexOf(x.status)}" style="display:inline-block">${esc(x.status)}</span></td></tr>`).join(''):'<tr><td colspan="7">데이터가 없습니다.</td></tr>'}
 if(page==='results'){const s=$('rs').value,r=data.filter(x=>x.status!=='진행중'&&(!s||x.status===s)).sort((a,b)=>(b.open||'').localeCompare(a.open||''));
  const c=k=>data.filter(x=>x.status===k).length;$('rsum').textContent=`개찰완료 ${c('개찰완료')} · 낙찰 ${c('낙찰')} · 유찰 ${c('유찰')}`;
  $('rtb').innerHTML=r.length?r.map(x=>`<tr class="r" onclick="view('${x.id}')"><td>${fdt(x.open)}</td><td>${tag(x)}${esc(x.name)}</td><td>${esc(x.org)}</td><td>${won(x.price)}</td><td>${esc(x.rep)}</td><td><span class="chip s${ST.indexOf(x.status)}" style="display:inline-block">${x.status}</span></td><td>${esc(x.result)}</td></tr>`).join(''):'<tr><td colspan="7">개찰 결과가 없습니다.</td></tr>'}
}
function view(id){const x=data.find(e=>e.id===id);if(!x)return;$('dt').textContent=(x.example?'[예시] ':'')+x.name;const tot=x.cos.reduce((a,c)=>a+(+c.s||0),0);
 $('dbody').innerHTML=`<dl class="dv"><dt>입찰공고번호</dt><dd>${esc(x.no)}</dd><dt>수요기관</dt><dd>${esc(x.org)}</dd><dt>게시일시</dt><dd>${fdt(x.pub)}</dd><dt>개찰일시</dt><dd>${fdt(x.open)} ${x.open?'('+ddLabel(dday(x.open))+')':''}</dd><dt>가격</dt><dd>${won(x.price)}</dd><dt>계약대표업체</dt><dd>${esc(x.rep)}</dd><dt>계약업체<br><small>(합계 ${tot}%)</small></dt><dd>${x.cos.map(c=>esc(c.n)+' — '+c.s+'%').join('\n')}</dd><dt>상태</dt><dd>${esc(x.status)}</dd><dt>개찰결과 메모</dt><dd>${esc(x.result)}</dd><dt>비고</dt><dd>${esc(x.memo)}</dd></dl>`;
 $('dfoot').innerHTML=`<button class="d" onclick="del('${id}')">삭제</button><button onclick="openForm('${id}')">수정</button><button onclick="dlg.close()">닫기</button>`;if(!dlg.open)dlg.showModal()}
function del(id){if(confirm('삭제하시겠습니까?')){data=data.filter(e=>e.id!==id);save();dlg.close();render();toast('삭제했습니다')}}
function delExamples(){const n=data.filter(e=>e.example).length;if(!n)return toast('예시 데이터가 없습니다');if(confirm(`예시 데이터 ${n}건을 모두 삭제할까요?`)){data=data.filter(e=>!e.example);save();render();toast('예시를 삭제했습니다')}}
function coRow(n='',s=''){return `<div class="cr"><input placeholder="업체명" value="${esc(n)}" class="cn"><input class="sh cs" type="number" step="0.01" placeholder="지분 %" value="${esc(s)}" oninput="chk()"><button type="button" onclick="this.parentNode.remove();chk()">✕</button></div>`}
function chk(){const v=[...document.querySelectorAll('.cs')].map(i=>+i.value||0),t=Math.round(v.reduce((a,b)=>a+b,0)*100)/100,w=$('sw');if(w){w.className=t===100?'ok':'warn';w.textContent=`지분율 합계: ${t}%`+(t===100?' ✓':' — 100%가 아닙니다!')}}
function openForm(id){const x=id?data.find(e=>e.id===id):{status:'진행중',cos:[]};$('dt').textContent=id?'공고 수정':'새 공고';
 $('dbody').innerHTML=`<div class="g"><label class="w">공고명 *<input id="f_name" value="${esc(x.name)}"></label><label>입찰공고번호<input id="f_no" value="${esc(x.no)}" placeholder="R26BK01619258-000"></label><label>수요기관<input id="f_org" list="orgs" value="${esc(x.org)}"></label>
 <label>게시일시<input id="f_pub" type="datetime-local" value="${esc(x.pub)}"></label><label>개찰일시 *<input id="f_open" type="datetime-local" value="${esc(x.open)}"></label>
 <label>가격 (원)<input id="f_price" inputmode="numeric" value="${x.price?Number(x.price).toLocaleString('ko-KR'):''}" oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\\B(?=(\\d{3})+(?!\\d))/g,',')"></label><label>계약대표업체<input id="f_rep" value="${esc(x.rep)}"></label>
 <div class="w"><div style="font-size:12px;color:#555">계약업체 / 지분율</div><div id="cos">${(x.cos.length?x.cos:[{n:'',s:''}]).map(c=>coRow(c.n,c.s)).join('')}</div><button type="button" onclick="$('cos').insertAdjacentHTML('beforeend',coRow());chk()">+ 업체 추가</button> <span id="sw"></span></div>
 <label>상태<select id="f_status">${ST.map(s=>`<option${s===x.status?' selected':''}>${s}</option>`).join('')}</select></label><label></label>
 <label class="w">개찰결과 메모<textarea id="f_result" rows="2">${esc(x.result)}</textarea></label><label class="w">비고<textarea id="f_memo" rows="2">${esc(x.memo)}</textarea></label></div>`;
 $('dfoot').innerHTML=`<button onclick="dlg.close()">취소</button><button class="p" onclick="saveForm('${id||''}')">저장</button>`;chk();if(!dlg.open)dlg.showModal();$('f_name').focus()}
function saveForm(id){const g=k=>$('f_'+k).value.trim(),o={name:g('name'),no:g('no'),org:g('org'),pub:g('pub'),open:g('open'),price:+g('price').replace(/,/g,'')||0,rep:g('rep'),
 cos:[...document.querySelectorAll('#cos .cr')].map(r=>({n:r.querySelector('.cn').value.trim(),s:+r.querySelector('.cs').value||0})).filter(c=>c.n),status:g('status'),result:g('result'),memo:g('memo'),updated:now()};
 if(!o.name)return alert('공고명을 입력하세요.');if(!o.open)return alert('개찰일시를 입력하세요.');
 const t=o.cos.reduce((a,c)=>a+c.s,0);if(o.cos.length&&Math.round(t*100)!==10000&&!confirm(`지분율 합계가 ${t}%입니다. 그래도 저장할까요?`))return;
 if(id){const i=data.findIndex(e=>e.id===id);data[i]={...data[i],...o}}else data.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),example:false,...o});
 save();render();toast('저장했습니다');id?view(id):dlg.close()}
const stamp=()=>ymd(new Date());
async function exportJSON(){const p=await A.saveFile(`이조영업관리_백업_${stamp()}.json`,JSON.stringify({app:'ijo-sales',version:1,savedAt:new Date().toISOString(),bids:data},null,2));if(p)toast('백업 저장: '+p)}
async function importJSON(){const t=await A.openFile();if(t==null)return;let d;try{d=normalize(JSON.parse(t.replace(/^\uFEFF/,'')))}catch(e){d=null}
 if(!d)return alert('올바른 백업 파일이 아닙니다.');if(confirm(`${d.length}건을 불러옵니다. 현재 데이터(${data.length}건)를 대체할까요?\n(현재 데이터는 자동 백업 폴더에 남아 있습니다)`)){data=d;save();render();toast(`${d.length}건 복원 완료`)}}
async function exportCSV(){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',h=['공고명','입찰공고번호','수요기관','게시일시','개찰일시','가격','계약대표업체','계약업체(지분율)','지분율합계','상태','개찰결과','비고','예시'];
 const rows=[...data].sort((a,b)=>(a.open||'').localeCompare(b.open||'')).map(x=>[x.name,x.no,x.org,fdt(x.pub),fdt(x.open),x.price||'',x.rep,x.cos.map(c=>`${c.n} ${c.s}%`).join(' / '),x.cos.reduce((a,c)=>a+(+c.s||0),0),x.status,x.result,x.memo,x.example?'예시':''].map(q).join(','));
 const p=await A.saveFile(`공고일정_${stamp()}.csv`,'\uFEFF'+[h.map(q).join(','),...rows].join('\r\n'));if(p)toast('내보내기 완료: '+p)}
const dlg=$('dlg');load();A.info().then(i=>{$('dfile').textContent=i.file;$('dbk').textContent=i.backups;if(i.version){$('ver').textContent='v'+i.version;$('curver').textContent='v'+i.version}});go('dash');

const UPD={checking:'새 버전 확인 중…',none:'최신 버전입니다',available:'새 버전 내려받는 중…',error:'업데이트 확인 실패(오프라인?)'};
if(A.onUpdate)A.onUpdate(d=>{$('updst').textContent=d.s==='progress'?`새 버전 내려받는 중… ${d.pct}%`:d.s==='ready'?`v${d.v} 준비 완료 — 재시작하면 적용돼요`:d.s==='available'?`v${d.v} 내려받는 중…`:(UPD[d.s]||'')});
async function checkUpd(){if(!A.checkUpdate)return toast('업데이트 기능을 사용할 수 없습니다');const r=await A.checkUpdate();if(r&&r.dev)toast('개발 모드에서는 업데이트를 확인하지 않습니다')}
