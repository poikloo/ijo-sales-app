// ===== 요청함: 품질 기준 (quality.addItem · quality.updateItem · quality.attachFile) =====
// 같은 규격번호(+분류)가 이미 있으면 addItem 도 새로 만들지 않고 합침: 원단은 이름이 같으면 통째로 바꾸고, 없으면 추가. 부록 표는 제목이 같으면 바꿈.
Object.assign(RQ_T,{'quality.addItem':'품질 기준 추가','quality.updateItem':'품질 기준 수정','quality.attachFile':'규격서 첨부'});
Object.assign(RQ_KEYS,{'quality.addItem':['item'],'quality.updateItem':['itemId','specNo','category','set'],'quality.attachFile':['itemId','specNo','category','file']});
const QR_ITEM={name:'name',category:'cat',specNo:'spec',revised:'rev',org:'org',drawing:'drawing',memo:'memo',usage:'usage',material:'material',color:'colorDesc'};
const QR_KEYS=[...Object.keys(QR_ITEM),'irApplied','types','fabrics','appendix'];
const qrK=s=>String(s??'').replace(/\s+/g,'').toLowerCase();
// markdown 표 → {columns,rows}, 표가 아니면 text
function qrMd(md){const L=String(md||'').split(/\r?\n/),tl=L.filter(l=>/^\s*\|.*\|\s*$/.test(l));if(tl.length<2)return {columns:[],rows:[],text:String(md||'').trim()};
 const cells=l=>l.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim()),body=tl.filter(l=>!/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
 const rest=L.filter(l=>!/^\s*\|.*\|\s*$/.test(l)).join('\n').trim();return {columns:body[0]||[],rows:body.slice(1),text:rest}}
function qrApx(x,i,it,p){if(typeof x==='string')x={markdown:x};if(!x||typeof x!=='object'){it.errors.push(`${p}[${i}]가 객체(또는 markdown 문자열)가 아닙니다`);return null}
 let t={title:qsStr(x.title),columns:x.columns,rows:x.rows,text:x.text};if(x.markdown!=null){const m=qrMd(x.markdown);t={...t,...m,text:[m.text,qsStr(x.text)].filter(Boolean).join('\n')}}
 if(t.columns!=null&&!Array.isArray(t.columns))it.errors.push(`${p}[${i}].columns는 배열이어야 합니다`);
 if(t.rows!=null&&(!Array.isArray(t.rows)||t.rows.some(r=>!Array.isArray(r))))it.errors.push(`${p}[${i}].rows는 배열의 배열이어야 합니다`);
 return normQsApx({...t,columns:Array.isArray(t.columns)?t.columns:[],rows:Array.isArray(t.rows)?t.rows.filter(Array.isArray):[]})}
function qrFab(f,i,it,p){if(!f||typeof f!=='object'){it.errors.push(`${p}[${i}]가 객체가 아닙니다`);return null}if(!qsStr(f.name))it.errors.push(`${p}[${i}].name(원단 이름)이 없습니다`);
 rqExtra(f,['name',...QS_FAB_K,'tests'],`${p}[${i}]`,it);if(f.tests!=null&&!Array.isArray(f.tests))it.errors.push(`${p}[${i}].tests는 배열이어야 합니다`);
 const o={name:f.name};QS_FAB_K.forEach(k=>o[k]=f[k]);o.rows=(Array.isArray(f.tests)?f.tests:[]).map((t,j)=>{if(!t||typeof t!=='object'){it.errors.push(`${p}[${i}].tests[${j}]가 객체가 아닙니다`);return null}
  rqExtra(t,['item','standard','method','unit','memo','division'],`${p}[${i}].tests[${j}]`,it);if(!qsStr(t.item))it.errors.push(`${p}[${i}].tests[${j}].item이 없습니다`);return {item:t.item,std:t.standard,method:t.method,unit:t.unit,memo:t.memo,div:t.division}}).filter(Boolean);
 return {...normQs({fabrics:[o]}).fabrics[0]}}
// 들어온 값 검사 → 바꿀 내용(patch)
function qrPatch(src,it,p){const P={};if(!src||typeof src!=='object'){it.errors.push(`${p} 객체가 없습니다`);return P}rqExtra(src,QR_KEYS,p,it);
 for(const [k,f] of Object.entries(QR_ITEM))if(src[k]!=null){if(typeof src[k]==='object')it.errors.push(`${p}.${k}는 문자열이어야 합니다`);else P[f]=qsStr(src[k])}
 if(src.revised!=null&&P.rev&&!/^\d{4}([.-]\d{1,2}([.-]\d{1,2})?)?$/.test(P.rev))it.warns.push(`${p}.revised '${P.rev}': 보통 YYYY-MM-DD 로 적습니다`);
 if(src.irApplied!=null)P.ir=!!src.irApplied;
 if(src.types!=null){if(!Array.isArray(src.types))it.errors.push(`${p}.types는 배열이어야 합니다`);else P.types=src.types.map((t,i)=>{if(!t||typeof t!=='object'){it.errors.push(`${p}.types[${i}]가 객체가 아닙니다`);return null}rqExtra(t,['type','stockNo','color'],`${p}.types[${i}]`,it);return {type:qsStr(t.type),stockNo:qsStr(t.stockNo),color:qsStr(t.color)}}).filter(Boolean)}
 if(src.fabrics!=null){if(!Array.isArray(src.fabrics))it.errors.push(`${p}.fabrics는 배열이어야 합니다`);else{P.fabrics=src.fabrics.map((f,i)=>qrFab(f,i,it,p+'.fabrics')).filter(Boolean);const ks=P.fabrics.map(f=>qrK(f.name));if(new Set(ks).size<ks.length)it.errors.push(`${p}.fabrics에 같은 이름의 원단이 두 번 있습니다`)}}
 if(src.appendix!=null){if(!Array.isArray(src.appendix))it.errors.push(`${p}.appendix는 배열이어야 합니다`);else P.appendix=src.appendix.map((x,i)=>qrApx(x,i,it,p+'.appendix')).filter(Boolean)}
 return P}
// 합치기 (원단: 이름 같으면 바꿈·없으면 추가 / 부록: 제목 같으면 바꿈·없으면 추가 / 형별: 통째로 바꿈 / 나머지: 준 값만 바꿈)
function qrMerge(q,P,it){const fd={rep:[],add:[]};Object.entries(P).forEach(([k,v])=>{if(k==='fabrics'){v.forEach(f=>{const i=q.fabrics.findIndex(x=>qrK(x.name)===qrK(f.name));if(i>=0){q.fabrics[i]={...f,id:q.fabrics[i].id};fd.rep.push(f.name)}else{q.fabrics.push(f);fd.add.push(f.name)}})}
  else if(k==='appendix'){v.forEach(a=>{const i=a.title?q.appendix.findIndex(x=>qrK(x.title)===qrK(a.title)):-1;if(i>=0)q.appendix[i]={...a,id:q.appendix[i].id};else q.appendix.push(a)})}else q[k]=v});
 q.updated=new Date().toISOString();return fd}
function qrFind(a,it,specKey){const id=rqS(a.itemId),sp=rqS(a[specKey||'specNo']),cat=rqS(a.category);if(!id&&!sp){it.errors.push('itemId 또는 specNo(규격번호)가 필요합니다');return null}
 let l=id?qualities.filter(q=>q.id===id):qualities.filter(q=>q.spec&&qrK(q.spec)===qrK(sp)&&(!cat||qrK(q.cat)===qrK(cat)));
 if(!l.length){it.errors.push(id?`itemId '${id}'인 품질 기준이 없습니다`:`규격번호 '${sp}'${cat?` (분류 ${cat})`:''}인 품질 기준이 없습니다`);return null}
 if(l.length>1){it.errors.push(`규격번호 '${sp}'인 품목이 ${l.length}개입니다 — category(분류) 또는 itemId로 골라 주세요`);return null}return l[0]}
const qrDiff=(q,P,old,fd)=>{const L=[['품목',old?old.name:'',q.name]];[['cat','분류'],['spec','규격번호'],['rev','제정/개정일'],['org','관리기관'],['drawing','관련 도면']].forEach(([k,l])=>{if(P[k]!=null)L.push([l,old?old[k]:'',q[k]])});
 if(P.memo!=null)L.push(['메모',old?old.memo.slice(0,60):'',q.memo.slice(0,80)+(q.memo.length>80?'…':'')]);if(P.types)L.push(['형별',old?old.types.length+'개':'',q.types.map(t=>[t.type,t.stockNo].filter(Boolean).join(' ')).join(', ')]);
 if(P.fabrics){if(fd.rep.length)L.push(['원단 (바꿈)','',fd.rep.join(', ')]);if(fd.add.length)L.push(['원단 (추가)','',fd.add.join(', ')]);L.push(['시험항목','',P.fabrics.map(f=>`${f.name} ${f.rows.length}개`).join(' · ')])}
 if(P.appendix)L.push(['부록 표','',P.appendix.map(x=>x.title||'(제목 없음)').join(', ')]);return L};
Object.assign(RQ_H,{
 'quality.addItem'(a,it){const P=qrPatch(a.item,it,'item');if(a.item&&!qsStr(a.item.name))it.errors.push('item.name(품목 이름)이 없습니다');
  const sp=P.spec,dup=sp?qualities.filter(q=>q.spec&&qrK(q.spec)===qrK(sp)&&(!P.cat||qrK(q.cat)===qrK(P.cat))):[];
  if(dup.length>1)it.errors.push(`규격번호 '${sp}'인 품목이 이미 ${dup.length}개입니다 — category(분류)를 적어 주세요`);
  it.summary=dup.length===1?`품질 기준 '${dup[0].name}'(규격 ${sp})이 이미 있어 합칩니다`:`품질 기준 '${qsStr(a.item&&a.item.name)}'을(를) 추가합니다`;if(it.errors.length)return;
  if(dup.length===1){const q=dup[0],old=rqClone(q);it.warns.push(`같은 규격번호 '${sp}'가 있어 새로 만들지 않고 합칩니다 (원단은 이름이 같으면 바꾸고, 없으면 추가)`);const fd=qrMerge(q,P,it);it.diff=qrDiff(q,P,old,fd);return}
  const q=normQs({id:uid()});const fd=qrMerge(q,P,it);qualities.push(q);it.diff=qrDiff(q,P,null,fd)},
 'quality.updateItem'(a,it){const q=qrFind(a,it);const P=a.set&&typeof a.set==='object'?qrPatch(a.set,it,'set'):(it.errors.push('set 객체가 없습니다'),{});
  if(P.name==='')it.errors.push('set.name을 비울 수 없습니다');if(q&&!Object.keys(P).length&&!it.errors.length)it.errors.push('set에 바꿀 내용이 없습니다');
  it.summary=`품질 기준 '${q?q.name:(rqS(a.specNo)||rqS(a.itemId)||'?')}'을(를) 고칩니다`;if(it.errors.length||!q)return;
  if(P.spec&&qualities.some(x=>x!==q&&x.spec&&qrK(x.spec)===qrK(P.spec)&&qrK(x.cat)===qrK(P.cat??q.cat)))it.warns.push(`규격번호 '${P.spec}'인 다른 품목이 있습니다`);
  const old=rqClone(q),fd=qrMerge(q,P,it);it.diff=qrDiff(q,P,old,fd)},
 'quality.attachFile'(a,it,ctx,req,P){const q=qrFind(a,it);let fi=null;
  if(typeof a.file!=='string'||!a.file.trim())it.errors.push('file(첨부할 파일 경로)이 없습니다');else{fi=(P&&P.files||{})[a.file];if(!fi)it.errors.push(`file '${a.file}' 정보를 읽지 못했습니다 — [지금 확인]을 눌러 주세요`);else if(fi.error){it.errors.push(fi.error);fi=null}}
  it.summary=`품질 기준 '${q?q.name:(rqS(a.specNo)||'?')}'에 규격서${fi?` '${fi.name}'`:''}을(를) 첨부합니다`;if(it.errors.length||!q||!fi)return;
  const nk=fi.name.toLowerCase(),dk=q.id+'|'+nk;it.diff=[['품목','',q.name],['규격번호','',q.spec],['파일','',`${fi.name} (${rqSize(fi.size)})`]];it.file=fi.rel;
  if(qsFiles(q.id).some(f=>f.name.toLowerCase()===nk)||ctx.qsTaken.has(dk)){it.warns.push(`같은 이름의 파일 '${fi.name}'이(가) 이미 붙어 있어 건너뜁니다`);return}
  ctx.qsTaken.add(dk);ctx.attach.push({kind:'quality',qid:q.id,abs:fi.abs,name:fi.name})}});
