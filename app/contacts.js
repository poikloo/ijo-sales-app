// ===== 거래처 정보 (명함) =====
let contacts=[],ctSel='',ctDraft=null;
const CT_LISTS=[['addrs','주소','주소'],['tels','회사 전화번호','전화번호'],['faxes','회사 팩스번호','팩스번호'],['mobiles','휴대폰 전화번호','휴대폰 번호']];
const CT_TEXT=[['company','회사명'],['name','성함'],['team','팀명'],['title','직급'],['email','메일 주소'],['web','홈페이지 주소']];
const strArr=a=>(Array.isArray(a)?a:[]).map(x=>String(x??'').trim()).filter(Boolean);
function normContact(c){const o={id:String(c&&c.id||uid()),example:!!(c&&c.example),updated:c&&c.updated||''};CT_TEXT.forEach(([k])=>o[k]=String(c&&c[k]||'').trim());CT_LISTS.forEach(([k])=>o[k]=strArr(c&&c[k]));return o}
const exContact=()=>normContact({id:'xct1',example:true,company:'예시상사',name:'홍길동',team:'영업팀',title:'과장',addrs:['(예시) 서울시 ○○구 ○○로 00'],tels:['000-0000-0000'],faxes:['000-0000-0001'],mobiles:['000-0000-0002'],email:'example@example.com',web:'www.example.com',updated:now()});
function ctLoad(r){const o=r&&!Array.isArray(r)?r:{};contacts=Array.isArray(o.contacts)?o.contacts.map(normContact):[];
 if(!Array.isArray(o.contacts)){if(!r||(Array.isArray(r.bids)&&r.bids.some(x=>x.example))||(Array.isArray(r.orders)&&r.orders.some(x=>x.example)))contacts.push(exContact());setTimeout(save,0)}}
const ctPayload=()=>({contacts});
function ctImport(raw){if(raw&&!Array.isArray(raw)&&Array.isArray(raw.contacts))contacts=raw.contacts.map(normContact)}
const digits=s=>String(s||'').replace(/[\s\-().]/g,'').toLowerCase();
function ctMatch(c,q){if(!q)return true;const t=q.toLowerCase(),d=digits(q);
 return [c.company,c.name,...c.addrs].some(x=>x.toLowerCase().includes(t))||(d&&[...c.tels,...c.faxes,...c.mobiles].some(x=>digits(x).includes(d)))}
const ctSort=(a,b)=>(a.company||'\uffff').localeCompare(b.company||'\uffff','ko')||(a.name||'\uffff').localeCompare(b.name||'\uffff','ko');
function renderContacts(){const q=$('ctq').value.trim(),cs=[...new Set(contacts.map(c=>c.company).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko')),cc=$('ctc'),cv=cc.value;
 cc.innerHTML='<option value="">전체 회사</option>'+cs.map(c=>`<option>${esc(c)}</option>`).join('');cc.value=cs.includes(cv)?cv:'';
 const l=contacts.filter(c=>(!cc.value||c.company===cc.value)&&ctMatch(c,q)).sort(ctSort);$('ctcnt').textContent=`${l.length}명`;
 $('cttb').innerHTML=l.length?l.map(c=>`<tr class="r" onclick="viewContact('${c.id}')"><td>${tag(c)}<b>${esc(c.company)}</b></td><td>${esc(c.name)}</td><td>${esc(c.team)}</td><td>${esc(c.title)}</td><td>${esc(c.mobiles[0]||'')}</td><td>${esc(c.tels[0]||'')}</td><td>${esc(c.email)}</td></tr>`).join(''):`<tr><td colspan="7">${contacts.length?'검색 결과가 없습니다.':'등록된 명함이 없습니다. [+ 추가]로 등록하세요.'}</td></tr>`}
const webUrl=u=>/^https?:\/\//i.test(u)?u:'https://'+u;
function ctCopy(t){A.copyText?A.copyText(t):navigator.clipboard.writeText(t);toast('복사했습니다: '+t)}
function viewContact(id){const c=contacts.find(x=>x.id===id);if(!c)return;$('dt').textContent=(c.example?'[예시] ':'')+([c.company,c.name].filter(Boolean).join(' · ')||'명함');
 const ph=(l)=>l.map(p=>`<div>${esc(p)} <button class="mini" onclick="ctCopy(${esc(JSON.stringify(p))})">복사</button></div>`).join('');
 const rows=[['회사명',esc(c.company)],['성함',esc(c.name)],['팀명',esc(c.team)],['직급',esc(c.title)],['주소',c.addrs.map(esc).join('<br>')],['회사 전화',ph(c.tels)],['회사 팩스',ph(c.faxes)],['휴대폰',ph(c.mobiles)],
  ['메일',c.email?`<a href="#" onclick="A.openExternal('mailto:'+${esc(JSON.stringify(c.email))});return false">${esc(c.email)}</a> <button class="mini" onclick="ctCopy(${esc(JSON.stringify(c.email))})">복사</button>`:''],
  ['홈페이지',c.web?`<a href="#" onclick="A.openExternal(${esc(JSON.stringify(webUrl(c.web)))});return false">${esc(c.web)}</a>`:'']].filter(r=>r[1]);
 $('dbody').innerHTML=`<dl class="dv">${rows.map(([k,v])=>`<dt>${k}</dt><dd style="white-space:normal">${v}</dd>`).join('')}</dl>`;
 $('dfoot').innerHTML=`<button class="d" onclick="delContact('${id}')">삭제</button><button onclick="openContact('${id}')">수정</button><button onclick="dlg.close()">닫기</button>`;if(!dlg.open)dlg.showModal()}
function delContact(id){const c=contacts.find(x=>x.id===id);if(c&&confirm(`'${[c.company,c.name].filter(Boolean).join(' ')||'이 명함'}'을(를) 삭제할까요?`)){contacts=contacts.filter(x=>x.id!==id);save();dlg.close();render();toast('삭제했습니다')}}
function ctRows(k,ph){const l=ctDraft[k].length?ctDraft[k]:[''];if(!ctDraft[k].length)ctDraft[k]=[''];
 return l.map((v,i)=>`<div class="cr"><input value="${esc(v)}" placeholder="${ph}" oninput="ctDraft['${k}'][${i}]=this.value" ${k==='addrs'?'':'inputmode="tel"'}><button type="button" onclick="ctDraft['${k}'].splice(${i},1);ctListRender('${k}')" title="삭제">✕</button></div>`).join('')}
function ctListRender(k){const d=CT_LISTS.find(x=>x[0]===k);$('ctl_'+k).innerHTML=ctRows(k,d[2])}
function ctAddRow(k){ctDraft[k].push('');ctListRender(k);const ins=$('ctl_'+k).querySelectorAll('input');ins[ins.length-1].focus()}
function openContact(id){const c=id?contacts.find(x=>x.id===id):normContact({});if(!c)return;ctDraft=JSON.parse(JSON.stringify(c));$('dt').textContent=id?'명함 수정':'명함 추가';
 $('dbody').innerHTML=`<div class="g">${CT_TEXT.slice(0,4).map(([k,l])=>`<label>${l}<input id="ct_${k}" value="${esc(c[k])}"></label>`).join('')}
 ${CT_LISTS.map(([k,l])=>`<div class="w"><div style="font-size:12px;color:#555">${l}</div><div id="ctl_${k}"></div><button type="button" onclick="ctAddRow('${k}')">+ ${l.replace('회사 ','')} 추가</button></div>`).join('')}
 <label>메일 주소<input id="ct_email" type="email" value="${esc(c.email)}"></label><label>홈페이지 주소<input id="ct_web" value="${esc(c.web)}" placeholder="www.example.com"></label></div><p class="muted">모든 항목은 선택 입력입니다.</p>`;
 CT_LISTS.forEach(([k])=>ctListRender(k));
 $('dfoot').innerHTML=`<button onclick="dlg.close()">취소</button><button class="p" onclick="saveContact('${id||''}')">저장</button>`;if(!dlg.open)dlg.showModal();$('ct_company').focus()}
function saveContact(id){const o={};CT_TEXT.forEach(([k])=>o[k]=$('ct_'+k).value.trim());CT_LISTS.forEach(([k])=>o[k]=strArr(ctDraft[k]));o.updated=now();
 if(!CT_TEXT.some(([k])=>o[k])&&!CT_LISTS.some(([k])=>o[k].length)){toast('입력된 내용이 없어요. 한 가지 이상 입력해 주세요.');return}
 if(id){const i=contacts.findIndex(x=>x.id===id);contacts[i]=normContact({...contacts[i],...o})}else contacts.push(normContact({...o,id:uid()}));save();render();toast('저장했습니다');id?viewContact(id):dlg.close()}
async function exportContactsCSV(){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',h=['회사명','성함','팀명','직급','주소','회사 전화번호','회사 팩스번호','휴대폰 전화번호','메일 주소','홈페이지 주소','예시'];
 const rows=[...contacts].sort(ctSort).map(c=>[c.company,c.name,c.team,c.title,c.addrs.join(' / '),c.tels.join(' / '),c.faxes.join(' / '),c.mobiles.join(' / '),c.email,c.web,c.example?'예시':''].map(q).join(','));
 const p=await A.saveFile(`거래처정보_${stamp()}.csv`,'\uFEFF'+[h.map(q).join(','),...rows].join('\r\n'));if(p)toast('내보내기 완료: '+p)}
