// 거래처 정보: 엑셀(.xlsx/.csv) 가져오기 — 명함 1장 = 1행 (같은 회사 여러 명은 각각 별도 명함으로 저장)
let ciRaw=null,ciHdr=0,ciMap={},ciName='';
const CI_F=[['company','회사명'],['name','성함'],['team','팀명'],['title','직급'],['addrs','주소'],['tels','회사 전화번호'],['faxes','회사 팩스번호'],['mobiles','휴대폰 전화번호'],['email','메일 주소'],['web','홈페이지 주소'],['memo','메모']];
const CI_LIST=new Set(['addrs','tels','faxes','mobiles']);
function ciDetect(h){const n=h.map(x=>String(x||'').toUpperCase().replace(/[\s._()]/g,'')),m={},used=new Set(),f=t=>{const i=n.findIndex((x,j)=>!used.has(j)&&x&&t(x));if(i>=0)used.add(i);return i};
 m.faxes=f(x=>x.includes('팩스')||x.includes('FAX'));
 m.mobiles=f(x=>x.includes('휴대')||x.includes('핸드폰')||x.includes('MOBILE')||x==='HP'||x==='CELL');
 m.email=f(x=>x.includes('메일')||x.includes('MAIL'));
 m.web=f(x=>x.includes('홈페이지')||x.includes('WEB')||x.includes('URL')||x.includes('사이트'));
 m.tels=f(x=>x.includes('전화')||x.includes('TEL')||x.includes('PHONE')||x.includes('연락처'));
 m.company=f(x=>x.includes('회사')||x.includes('상호')||x.includes('업체')||x.includes('거래처')||x.includes('COMPANY'));
 m.name=f(x=>x.includes('성함')||x.includes('이름')||x.includes('성명')||x.includes('담당자')||x==='NAME');
 m.team=f(x=>x.includes('팀')||x.includes('부서')||x.includes('DEPT'));
 m.title=f(x=>x.includes('직급')||x.includes('직함')||x.includes('직위')||x.includes('직책')||x.includes('TITLE'));
 m.addrs=f(x=>x.includes('주소')||x.includes('ADDR'));
 m.memo=f(x=>x.includes('메모')||x.includes('비고')||x.includes('MEMO')||x.includes('NOTE'));return m}
const ciKey=(c,n)=>String(c||'').replace(/\(주\)|㈜|주식회사|\s/g,'').toLowerCase()+'|'+String(n||'').replace(/\s/g,'').toLowerCase();
function ciAnalyze(){const R=ciRaw.slice(ciHdr+1),g=(r,k)=>ciMap[k]>=0?String(r[ciMap[k]]??'').trim():'',map=new Map(),bad=[];let rows=0;
 R.forEach((r,i)=>{if(!r.some(c=>String(c||'').trim()))return;rows++;const rn=ciHdr+i+2,o={};
  CI_F.forEach(([k])=>{const v=g(r,k);o[k]=CI_LIST.has(k)?v.split(/\s*(?:\/|\r?\n|;)\s*/).map(s=>s.trim()).filter(Boolean):v});
  if(!o.company&&!o.name){bad.push(`${rn}행: 회사명·성함 모두 없음`);return}
  const k=ciKey(o.company,o.name),p=map.get(k);if(p){CI_LIST.forEach(f=>o[f].forEach(v=>{if(!p[f].includes(v))p[f].push(v)}));CI_F.forEach(([f])=>{if(!CI_LIST.has(f)&&!p[f])p[f]=o[f]});p.merged=true;return}
  o.key=k;map.set(k,o)});
 const L=[...map.values()],ex=new Set(contacts.map(c=>ciKey(c.company,c.name)));L.forEach(o=>o.dup=ex.has(o.key));return {rows,L,bad}}
async function ctImportOpen(){if(!A.ctImportPick)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');let r;try{r=await A.ctImportPick()}catch(e){return uiAlert('파일을 읽지 못했습니다: '+e)}if(!r)return;
 if(!r.rows.length)return uiAlert('데이터가 없습니다.');ciRaw=r.rows;ciName=r.name;ciHdr=Math.max(0,ciRaw.slice(0,15).findIndex(x=>x.some(c=>/회사|상호|성함|이름|COMPANY|NAME/i.test(String(c)))));ciMap=ciDetect(ciRaw[ciHdr]);ciRender()}
function ciRender(){const h=ciRaw[ciHdr],a=ciAnalyze(),nw=a.L.filter(o=>!o.dup).length,dp=a.L.length-nw,mg=a.L.filter(o=>o.merged).length,cos=new Set(a.L.filter(o=>o.company).map(o=>o.key.split('|')[0])).size,mode=(document.querySelector('input[name=cimode]:checked')||{}).value||'skip';
 $('dt').textContent='엑셀 가져오기 — '+ciName;
 $('dbody').innerHTML=`<div class="fsec">칸 연결 (자동 인식, 필요하면 바꾸세요)</div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px 12px;margin-top:6px">${CI_F.map(([k,t])=>`<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:12px;font-weight:600;color:#555">${t}</span><select style="width:100%;min-width:0;box-sizing:border-box" onchange="ciMap.${k}=+this.value;ciRender()"><option value="-1">(없음)</option>${h.map((c,i)=>`<option value="${i}"${ciMap[k]===i?' selected':''}>${esc(c||'열 '+(i+1))}</option>`).join('')}</select></div>`).join('')}</div>
 <div class="muted" style="margin-top:6px">전화·팩스·휴대폰·주소가 여러 개면 한 칸에 " / " 로 구분해 넣으세요. 같은 회사의 여러 명은 각각 별도 명함으로 들어갑니다.</div>
 <div style="margin:12px 0 10px;padding-top:10px;border-top:1px solid #e5e5e5;display:flex;gap:16px;flex-wrap:wrap;align-items:center"><b>데이터 ${a.rows}행 → 명함 ${a.L.length}장 (회사 ${cos}곳)</b><span>새 명함 <b>${nw}</b></span><span>파일 안 중복 합침 <b>${mg}</b></span><span>이미 있는 명함 <b class="${dp?'neg':''}">${dp}</b></span><span>문제 <b class="${a.bad.length?'neg':''}">${a.bad.length}</b></span></div>
 <div style="margin-bottom:8px">이미 있는 명함 (회사명+성함 같음): <label style="display:inline"><input type="radio" name="cimode" value="skip"${mode==='skip'?' checked':''}> 건너뛰기</label> <label style="display:inline"><input type="radio" name="cimode" value="over"${mode==='over'?' checked':''}> 덮어쓰기</label></div>
 ${a.bad.length?`<div class="neg" style="max-height:90px;overflow:auto;font-size:12px;margin-bottom:8px">${a.bad.slice(0,200).map(esc).join('<br>')}</div>`:''}
 <div style="max-height:46vh;overflow:auto"><table class="ciprev"><thead><tr><th>상태</th><th>회사명</th><th>성함</th><th>팀명 / 직급</th><th>휴대폰</th><th>회사 전화</th><th>팩스</th><th>메일</th></tr></thead><tbody>${a.L.slice(0,500).map(o=>`<tr><td>${o.dup?'<span class="neg">중복</span>':'새 명함'}</td><td><b>${esc(o.company)}</b></td><td>${esc(o.name)}</td><td>${esc([o.team,o.title].filter(Boolean).join(' / '))}</td><td>${o.mobiles.map(esc).join('<br>')}</td><td>${o.tels.map(esc).join('<br>')}</td><td>${o.faxes.map(esc).join('<br>')}</td><td>${esc(o.email)}</td></tr>`).join('')}</tbody></table></div>`;
 $('dfoot').innerHTML=`<button onclick="dlg.close()">취소</button><button class="p" onclick="ciRun()"${a.L.length?'':' disabled'}>가져오기 (${a.L.length}장)</button>`;if(!dlg.open)dlg.showModal()}
async function ciRun(){const a=ciAnalyze(),over=(document.querySelector('input[name=cimode]:checked')||{}).value==='over';let add=0,upd=0,skip=0;
 if(A.preImportBackup)await A.preImportBackup();
 a.L.forEach(x=>{const o={};CI_F.forEach(([k])=>o[k]=x[k]);o.updated=now();
  if(x.dup){if(!over){skip++;return}contacts.forEach((c,i)=>{if(ciKey(c.company,c.name)===x.key){const m={...c};CI_F.forEach(([k])=>{if(CI_LIST.has(k)?o[k].length:o[k])m[k]=o[k]});m.updated=o.updated;m.example=false;contacts[i]=normContact(m)}});upd++}
  else{contacts.push(normContact({...o,id:uid()+add}));add++}});
 save();dlg.close();render();toast(`가져오기 완료: 새 명함 ${add}장${upd?`, 덮어쓰기 ${upd}장`:''}${skip?`, 건너뜀 ${skip}장`:''}`)}
async function ctTemplate(){if(!A.ctTemplate)return uiAlert('데스크톱 앱에서만 사용할 수 있습니다.');const p=await A.ctTemplate(CI_F.map(x=>x[1]));if(p)toast('양식 저장: '+p)}
