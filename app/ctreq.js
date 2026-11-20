// ===== 요청함: 거래처 정보 (contact.attachImage · contact.add · contact.update) — 별칭 contact.addContact = contact.add, contact.updateContact = contact.update =====
// 명함 찾기: contactId(스냅샷 contacts[].id) 또는 company+name — 띄어쓰기 · (주) · ㈜ · 주식회사 · 대소문자 무시하고 비교. 0명/여러 명이면 오류
// 명함 이미지: file · image (하나) 또는 files · images (앞/뒤 여러 장). 요청함 inbox 기준 상대 경로(예: files/card_001.jpg). 적용할 때 앱의 첨부 저장소(bizreg)로 복사
// 거래처(회사)는 따로 목록이 없고 명함의 회사명이 곧 거래처 → 처음 보는 회사면 명함과 함께 새 거래처가 생기고 카드에 경고
const CT_TXT=CT_TEXT.map(([k])=>k),CT_ARR=CT_LISTS.map(([k])=>k),CT_FIELDS=[...CT_TXT,...CT_ARR],CT_FILE=['file','files','image','images'];
const CT_LB=Object.fromEntries([...CT_TEXT,...CT_LISTS.map(([k,l])=>[k,l])]);
Object.assign(RQ_T,{'contact.attachImage':'명함 이미지 첨부','contact.add':'거래처 명함 추가','contact.addContact':'거래처 명함 추가','contact.update':'거래처 명함 수정','contact.updateContact':'거래처 명함 수정'});
Object.assign(RQ_KEYS,{'contact.attachImage':['contactId','company','name',...CT_FILE,'replace'],'contact.add':[...CT_FIELDS,...CT_FILE,'onDuplicate'],'contact.update':['contactId','company','name','set','fillEmptyOnly']});
RQ_KEYS['contact.addContact']=RQ_KEYS['contact.add'];RQ_KEYS['contact.updateContact']=RQ_KEYS['contact.update'];
const crCo=s=>String(s||'').replace(/\(주\)|㈜|주식회사|\s/g,'').toLowerCase(),crNm=s=>String(s||'').replace(/\s/g,'').toLowerCase(),crK=(c,n)=>crCo(c)+'|'+crNm(n);
const crWho=c=>[c.company,c.name].filter(Boolean).join(' · ')||'(이름 없음)';
// 명함 찾기
function crFind(a,it){const id=rqS(a.contactId),co=rqS(a.company),nm=rqS(a.name);
 if(id){const c=contacts.find(x=>x.id===id);if(!c)it.errors.push(`contactId '${id}'인 명함이 없습니다`);else if((co&&crCo(co)!==crCo(c.company))||(nm&&crNm(nm)!==crNm(c.name)))it.warns.push(`contactId '${id}'의 명함은 '${crWho(c)}'입니다 (적은 company/name과 다름 — contactId 기준으로 처리)`);return c||null}
 if(!co&&!nm){it.errors.push('contactId 또는 company+name(명함 찾기)이 없습니다');return null}
 const l=contacts.filter(x=>crK(x.company,x.name)===crK(co,nm));
 if(!l.length){it.errors.push(`'${[co,nm].filter(Boolean).join(' ')}' 명함이 없습니다${nm&&contacts.some(x=>crCo(x.company)===crCo(co))?` (같은 회사 명함: ${contacts.filter(x=>crCo(x.company)===crCo(co)).map(x=>x.name||'(이름 없음)').slice(0,8).join(', ')})`:''}`);return null}
 if(l.length>1){it.errors.push(`'${[co,nm].filter(Boolean).join(' ')}' 명함이 ${l.length}장입니다 — contactId로 골라 주세요 (${l.map(x=>x.id).join(', ')})`);return null}
 return l[0]}
// 파일 목록 (file/image 또는 files/images)
function crFiles(a,it,P,need){const one=[a.file,a.image].filter(x=>x!=null),many=[a.files,a.images].filter(x=>x!=null);
 if(one.length+many.length>1){it.errors.push('file · image · files · images 중 하나만 적어 주세요');return null}
 let L=one.length?[one[0]]:many.length?many[0]:[];if(!Array.isArray(L)){it.errors.push('files/images는 파일 경로 배열이어야 합니다');return null}
 if(!L.length){if(need)it.errors.push('file(명함 이미지 경로)이 없습니다');return []}
 if(L.length>10){it.errors.push('명함 이미지는 한 번에 10장까지입니다');return null}
 const out=[];for(const f of L){if(typeof f!=='string'||!f.trim()){it.errors.push('파일 경로가 비었거나 문자열이 아닙니다');continue}const fi=(P&&P.files||{})[f];
  if(!fi)it.errors.push(`file '${f}' 정보를 읽지 못했습니다 — [지금 확인]을 눌러 주세요`);else if(fi.error)it.errors.push(fi.error);else out.push(fi)}
 const nm=out.map(f=>f.name.toLowerCase());if(new Set(nm).size<nm.length)it.errors.push('같은 이름의 파일이 두 번 있습니다');return it.errors.length?null:out}
// 첨부 예약 (적용할 때 복사). ctx.ctPend[cid] = 이번 요청에서 붙일 파일 이름들
function crAttach(c,fis,it,ctx,replace){const pend=ctx.ctPend[c.id]=ctx.ctPend[c.id]||[],cur=c.cards.length+pend.length;let rm=[];
 if(replace&&cur){rm=c.cards.map(f=>f.name);c.cards=[];ctx.attach=ctx.attach.filter(x=>!(x.kind==='contact'&&x.cid===c.id));const pn=pend.splice(0);
  it.warns.push(`기존 명함 이미지 ${rm.length+pn.length}장을 새 이미지로 바꿉니다 (빠지는 것: ${[...rm,...pn].join(', ')})`)}
 const have=new Set([...c.cards.map(f=>f.name.toLowerCase()),...pend.map(n=>n.toLowerCase())]);let n=0;
 fis.forEach(fi=>{if(have.has(fi.name.toLowerCase())){it.warns.push(`같은 이름의 명함 '${fi.name}'이(가) 이미 붙어 있어 건너뜁니다`);return}
  ctx.attach.push({kind:'contact',cid:c.id,abs:fi.abs,name:fi.name});pend.push(fi.name);have.add(fi.name.toLowerCase());n++});
 it.files=fis.map(f=>f.rel);
 it.diff.push(['명함 이미지',cur?`${cur}장`:'',`${replace&&cur?'':cur?'+ ':''}${fis.map(f=>`${f.name} (${rqSize(f.size)})`).join(', ')}`]);return n}
// 필드 읽기 (문자열 · 배열; 배열 칸에 문자열 하나를 적으면 한 줄로)
function crFields(o,it,pre){const F={};for(const k of CT_FIELDS){if(o[k]==null)continue;const v=o[k];
  if(CT_ARR.includes(k)){const l=Array.isArray(v)?v:typeof v==='string'||typeof v==='number'?[v]:null;if(!l||l.some(x=>typeof x!=='string'&&typeof x!=='number')){it.errors.push(`${pre}${k}는 문자열 배열이어야 합니다`);continue}F[k]=strArr(l)}
  else{if(typeof v!=='string'&&typeof v!=='number'){it.errors.push(`${pre}${k}는 문자열이어야 합니다`);continue}F[k]=String(v).trim()}}return F}
const crSame=(k,a,b)=>k==='addrs'||k==='email'||k==='web'?crNm(a)===crNm(b):digits(a)===digits(b);
// 합치기: fill=true면 빈 칸만 채우고 배열은 겹치지 않게 더함, 아니면 바꿈. diff 줄 반환
function crMerge(c,F,fill){const D=[];for(const k of Object.keys(F)){const lb=CT_LB[k]||k;
  if(CT_ARR.includes(k)){const old=c[k].slice();let nv;if(fill){nv=old.slice();F[k].forEach(v=>{if(!nv.some(x=>crSame(k,x,v)))nv.push(v)})}else nv=F[k];
   if(nv.join('\n')!==old.join('\n')){c[k]=nv;D.push([lb,old.join(', '),nv.join(', ')])}}
  else{const old=c[k];if(fill&&old){if(F[k]&&crNm(F[k])!==crNm(old))D.push([lb+' (유지)',old,`${F[k]} → 채우지 않음 (이미 값 있음)`]);continue}
   if(F[k]!==old){c[k]=F[k];D.push([lb,old,F[k]])}}}return D}
// 처음 보는 회사(거래처) 경고. 다른 카테고리에 비슷한 이름이 있으면 알려 줌
function crNewCo(co,it,self){if(!co||contacts.some(x=>x!==self&&crCo(x.company)===crCo(co)))return;
 const other=[...new Set([...orders.map(o=>o.client),...sales.map(s=>s.client),...(typeof custs!=='undefined'?custs.map(c=>c.name):[])].filter(Boolean))].filter(x=>crCo(x)===crCo(co)||(crCo(co).length>=2&&(crCo(x).includes(crCo(co))||crCo(co).includes(crCo(x)))));
 it.warns.push(`새 거래처: '${co}'은(는) 거래처 정보에 처음 등록되는 회사입니다${other.length?` — 다른 곳에 있는 이름: ${other.slice(0,5).join(', ')} (같은 회사면 그 이름으로 적어 주세요)`:''}`)}
function crAdd(a,it,ctx,req,P){const F=crFields(a,it,''),fis=crFiles(a,it,P,false),od=a.onDuplicate==null?'skip':a.onDuplicate;
 if(!['skip','add','fillEmpty'].includes(od))it.errors.push("onDuplicate는 'skip' · 'add' · 'fillEmpty' 중 하나입니다");
 if(!F.company&&!F.name)it.errors.push('company(회사명) 또는 name(성함)이 필요합니다');
 it.summary=`거래처 정보에 '${[F.company,F.name].filter(Boolean).join(' · ')||'?'}' 명함을 추가합니다`;if(it.errors.length||!fis)return;
 const dup=contacts.filter(x=>crK(x.company,x.name)===crK(F.company,F.name));
 if(dup.length&&od==='skip'){it.warns.push(`중복: 같은 회사 · 성함의 명함이 이미 있어 건너뜁니다 (${dup.map(x=>x.id).join(', ')}) — 추가하려면 onDuplicate:'add', 빈 칸만 채우려면 'fillEmpty'`);it.summary=`'${crWho(dup[0])}' 명함이 이미 있어 건너뜁니다`;it.skip=true;it.diff=[['기존 명함','',crWho(dup[0])+(dup[0].cards.length?` · 명함 이미지 ${dup[0].cards.length}장`:'')]];if(fis.length)it.files=fis.map(f=>f.rel);return}
 if(dup.length&&od==='fillEmpty'){if(dup.length>1){it.errors.push(`같은 회사 · 성함의 명함이 ${dup.length}장이라 어느 것을 채울지 모릅니다 — contact.update + contactId를 쓰세요`);return}
  const c=dup[0];it.warns.push(`중복: '${crWho(c)}' 명함이 이미 있어 빈 칸만 채웁니다 (onDuplicate:'fillEmpty')`);it.summary=`'${crWho(c)}' 명함의 빈 칸을 채웁니다`;
  const {company,name,...rest}=F;it.diff=crMerge(c,rest,true);if(fis.length)crAttach(c,fis,it,ctx,false);if(it.diff.length)c.updated=now();else it.diff=[['바뀌는 내용','','없음']];return}
 if(dup.length)it.warns.push(`중복: 같은 회사 · 성함의 명함이 이미 있지만 새로 추가합니다 (onDuplicate:'add', 기존 ${dup.map(x=>x.id).join(', ')})`);
 crNewCo(F.company,it,null);const c=normContact({...F,id:uid(),updated:now()});contacts.push(c);
 it.diff=CT_FIELDS.filter(k=>CT_ARR.includes(k)?c[k].length:c[k]).map(k=>[CT_LB[k],'',CT_ARR.includes(k)?c[k].join(', '):c[k]]);if(fis.length)crAttach(c,fis,it,ctx,false)}
function crUpd(a,it){const c=crFind(a,it);if(!rqObj(a.set)){it.errors.push('set 객체가 없습니다');return}rqExtra(a.set,CT_FIELDS,'set',it);
 const F=crFields(a.set,it,'set.'),fill=!!a.fillEmptyOnly;if(a.fillEmptyOnly!=null&&typeof a.fillEmptyOnly!=='boolean')it.errors.push('fillEmptyOnly는 true/false입니다');
 if(!Object.keys(F).length&&!it.errors.length)it.errors.push('set에 바꿀 내용이 없습니다');
 it.summary=`거래처 명함 '${c?crWho(c):[rqS(a.company),rqS(a.name)].filter(Boolean).join(' ')||rqS(a.contactId)||'?'}'을(를) ${fill?'빈 칸만 채웁니다':'고칩니다'}`;if(it.errors.length||!c)return;
 if(!fill&&(('company' in F&&!F.company&&!(F.name??c.name))||('name' in F&&!F.name&&!(F.company??c.company))))return void it.errors.push('회사명과 성함을 모두 비울 수 없습니다');
 const k0=crK(c.company,c.name);it.diff=crMerge(c,F,fill);
 if(crK(c.company,c.name)!==k0){const d=contacts.filter(x=>x!==c&&crK(x.company,x.name)===crK(c.company,c.name));if(d.length)it.warns.push(`고친 회사 · 성함이 다른 명함(${d.map(x=>x.id).join(', ')})과 같아집니다`);crNewCo(c.company,it,c)}
 if(it.diff.length)c.updated=now();else{it.warns.push('바뀌는 내용이 없습니다');it.diff=[['바뀌는 내용','','없음']]}}
Object.assign(RQ_H,{
 'contact.attachImage'(a,it,ctx,req,P){const c=crFind(a,it),fis=crFiles(a,it,P,true);if(a.replace!=null&&typeof a.replace!=='boolean')it.errors.push('replace는 true/false입니다');
  it.summary=`거래처 명함 '${c?crWho(c):[rqS(a.company),rqS(a.name)].filter(Boolean).join(' ')||rqS(a.contactId)||'?'}'에 명함 이미지${fis?` ${fis.length}장`:''}을(를) ${a.replace?'바꿔 넣습니다':'첨부합니다'}`;if(it.errors.length||!c||!fis)return;
  it.diff=[['명함','',crWho(c)]];crAttach(c,fis,it,ctx,!!a.replace)},
 'contact.add':crAdd,'contact.addContact':crAdd,'contact.update':crUpd,'contact.updateContact':crUpd});
