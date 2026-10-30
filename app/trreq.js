// ===== 요청함: TEST REPORT 기준 비교 결과 입력 (testReport.setResults) =====
Object.assign(RQ_T,{'testReport.setResults':'시험 결과 입력'});
Object.assign(RQ_KEYS,{'testReport.setResults':['id','reportNo','name','received','link','results','overall','failedItems','replace']});
const trK=v=>gsN(String(v??'')).replace(/\(예시\)/g,'');
const trPart=v=>{v=trK(v);return v==='-'?'':v};
// 성적서 찾기: id 우선. reportNo 중복이면 name(품명 일부)·received(접수일)로 좁힘. 그래도 2건 이상이면 오류
function trFind(a,it){const id=rqS(a.id),no=rqS(a.reportNo);if(!id&&!no){it.errors.push('id 또는 reportNo(접수번호)가 필요합니다');return null}
 if(id){const t=trs.find(x=>x.id===id);if(!t)it.errors.push(`id '${id}'인 성적서가 없습니다`);else if(no&&trNoKey(t.no)!==trNoKey(no))it.errors.push(`id '${id}'의 접수번호는 '${t.no}'입니다`);return t&&!it.errors.length?t:null}
 let l=trs.filter(x=>trNoKey(x.no)===trNoKey(no));if(!l.length){it.errors.push(`접수번호 '${no}'인 성적서가 없습니다`);return null}
 if(l.length>1&&a.name!=null){const n=trK(a.name);l=l.filter(x=>trK(x.name).includes(n))}
 if(l.length>1&&a.received!=null){const d=trDate(a.received);l=l.filter(x=>x.recv===d)}
 if(!l.length){it.errors.push(`접수번호 '${no}' 중 name/received가 맞는 성적서가 없습니다`);return null}
 if(l.length>1){it.errors.push(`접수번호 '${no}'인 성적서가 ${l.length}건입니다 — id(스냅샷 testReports[].id) 또는 name·received로 골라 주세요`);return null}return l[0]}
function trLinkQ(L,it){const id=rqS(L.qualityItemId),sp=rqS(L.specNo),nm=rqS(L.name);let l;
 if(id)l=qualities.filter(q=>q.id===id);else if(sp)l=qualities.filter(q=>q.spec&&qrK(q.spec)===qrK(sp)&&(!nm||trK(q.name)===trK(nm)));else if(nm)l=qualities.filter(q=>trK(q.name)===trK(nm));else{it.errors.push('link에 qualityItemId, specNo 또는 name(품목명)이 필요합니다');return null}
 if(!l.length){it.errors.push('link: 일치하는 품질 기준이 없습니다');return null}if(l.length>1){it.errors.push(`link: 품질 기준이 ${l.length}개 일치합니다 — qualityItemId로 골라 주세요`);return null}return l[0]}
const trJudge=v=>v===true||/^(pass|ok|o|합격|적합)$/i.test(String(v??'').trim())?true:v===false||/^(fail|ng|x|불합격|부적합)$/i.test(String(v??'').trim())?false:null;
function trSnapRows(t){const q=t.qs&&qsGet(t.qs.id),f=q&&(q.fabrics.find(x=>x.id===t.qs.fab)||q.fabrics[0]);if(!f)return [];const res=t.qs.res||{},jd=t.qs.jd||{},rm=t.qs.rm||{};
 const J=j=>j===true?'pass':j===false?'fail':null;return f.rows.flatMap(r=>{const S=trSubs(t,r),o=[];if(res[r.id]||r.id in jd||rm[r.id]||S.length)o.push({item:r.item,part:r.div&&r.div!=='-'?r.div:'',subItem:'',standard:r.std,unit:r.unit,value:res[r.id]||'',judge:J(trJ(t,r)),manual:r.id in jd,memo:rm[r.id]||''});
  S.forEach(x=>o.push({item:r.item,part:x.part,subItem:x.sub,standard:trSubStd(r,x),unit:r.unit,value:res[x.k]||'',judge:J(trJS(t,r,x)),manual:x.k in jd,memo:rm[x.k]||''}));return o}).concat((t.qs.extra||[]).map(e=>({...e,judge:e.judge===true?'pass':e.judge===false?'fail':null,unmatched:true})))}
Object.assign(RQ_H,{
 'testReport.setResults'(a,it,ctx){const t=trFind(a,it);it.summary=`TEST REPORT ${t?t.no||t.name:(rqS(a.reportNo)||rqS(a.id)||'?')}에 시험 결과를 입력합니다`;
  if(a.link!=null&&!rqObj(a.link))it.errors.push('link는 객체여야 합니다');if(rqObj(a.link))rqExtra(a.link,['qualityItemId','specNo','name','fabric'],'link',it);
  if(a.results!=null&&!Array.isArray(a.results))it.errors.push('results는 배열이어야 합니다');
  if(a.overall!=null&&a.overall!==''&&trJudge(a.overall)===null)it.errors.push("overall은 'pass' / 'fail' (또는 합격/불합격)이어야 합니다");
  if(a.replace!=null&&typeof a.replace!=='boolean')it.errors.push('replace는 true/false');
  if(!t||it.errors.length)return;
  const old={q:t.qs&&qsGet(t.qs.id),result:t.result,fail:t.fail},oq=old.q,of=oq&&(oq.fabrics.find(x=>x.id===t.qs.fab)||oq.fabrics[0]);let q=oq,f=of;
  if(rqObj(a.link)){q=trLinkQ(a.link,it);if(!q)return;const fn=rqS(a.link.fabric);if(fn){f=q.fabrics.find(x=>trK(x.name)===trK(fn));if(!f){it.errors.push(`link: '${q.name}'에 원단 '${fn}'이(가) 없습니다 (${q.fabrics.map(x=>x.name).join(', ')||'원단 없음'})`);return}}else f=q===oq&&of?of:q.fabrics[0]}
  else if(!q){const g=trCmpGuess(t);q=g&&qsGet(g.id);f=q&&(q.fabrics.find(x=>x.id===g.fab)||q.fabrics[0]);if(!q){it.errors.push('연결된 품질 기준이 없습니다 — link를 넣어 주세요');return}it.warns.push(`link가 없어 '${q.name}'에 자동 연결합니다`)}
  if(!f){it.errors.push(`'${q.name}'에 원단이 없습니다`);return}
  const chg=!oq||oq.id!==q.id||(of&&of.id)!==f.id,rep=a.replace===true||chg;
  if(chg&&oq&&Object.keys(t.qs.res||{}).length&&a.replace!==true)it.warns.push('연결 기준이 바뀌어 기존 입력값을 지웁니다');
  const prev=t.qs?rqClone(t.qs):{res:{}};t.qs=rep?{id:q.id,fab:f.id,res:{}}:{...t.qs,id:q.id,fab:f.id,res:{...(t.qs.res||{})},subs:{...(t.qs.subs||{})}};
  const jd=rep?{}:{...(t.qs.jd||{})},rm=rep?{}:{...(t.qs.rm||{})},ex=rep?[]:(t.qs.extra||[]).slice(),D=[],used=new Set();
  (a.results||[]).forEach((r,i)=>{if(!rqObj(r)){it.errors.push(`results[${i}]가 객체가 아닙니다`);return}rqExtra(r,['item','part','subItem','value','unit','judge','memo'],`results[${i}]`,it);
   const item=rqS(r.item),part=rqS(r.part),subItem=rqS(r.subItem),val=rqS(r.value),unit=rqS(r.unit),memo=rqS(r.memo),jg=r.judge==null||r.judge===''?null:trJudge(r.judge);
   if(!item){it.errors.push(`results[${i}]에 item이 없습니다`);return}if(r.judge!=null&&r.judge!==''&&jg===null){it.errors.push(`results[${i}].judge는 'pass' / 'fail' / null`);return}
   const lab=item+(part||subItem?`(${[part,subItem].filter(Boolean).join(' ')})`:'');let c=f.rows.filter(x=>trK(x.item)===trK(item));if(!c.length)c=f.rows.filter(x=>trK(x.item)&&(trK(x.item).includes(trK(item))||trK(item).includes(trK(x.item))));
   let comb=null,sub=null;if(subItem&&c.length){const d=c.filter(x=>trPart(x.div)&&trPart(x.div)===trK([part,subItem].filter(Boolean).join(' ')))  ;if(d.length===1)c=d;else{const p=trPart(part),cp=part?c.filter(x=>trPart(x.div)===p):[];const base=cp.length?cp:c.filter(x=>!trPart(x.div)).concat(c);c=[base[0]];sub={sub:subItem,part:cp.length?'':part}}}
   if(!sub&&(c.length>1||part)){const p=trPart(part),cp=c.filter(x=>trPart(x.div)===p||(p&&trPart(x.div).includes(p)));if(cp.length)c=cp;else if(part){const sp=c.filter(x=>!trPart(x.div)&&qsParts(x.std)&&qsParts(x.std)[part.toUpperCase()]!=null);c=sp;if(sp.length===1)comb=part.toUpperCase()}}
   if(c.length!==1){it.warns.push(`'${lab}' — ${c.length?`'${f.name}'에 구분이 여러 개라 part가 필요합니다`:`'${f.name}' 시험항목에 없습니다`} (기준 없이 보관)`);const e={item,part,subItem,value:val,unit,judge:jg,memo},k=ex.findIndex(x=>trK(x.item)===trK(item)&&trPart(x.part)===trPart(part)&&trK(x.subItem)===trK(subItem));if(k>=0)ex[k]=e;else ex.push(e);D.push([`⚠ ${lab}`,'',[val,unit,jg===true?'O':jg===false?'X':''].filter(Boolean).join(' ')]);return}
   const row=c[0];if(sub){const S=(t.qs.subs=t.qs.subs||{});S[row.id]=(S[row.id]||[]).slice();let x=S[row.id].find(y=>trK(y.sub)===trK(sub.sub)&&trK(y.part)===trK(sub.part));
    if(!x){x={k:`${row.id}#${sub.part}#${sub.sub}`,sub:sub.sub,part:sub.part,label:[sub.part,sub.sub].filter(Boolean).join(' ')};S[row.id].push(x)}
    if(used.has(x.k))it.warns.push(`'${lab}'이(가) 두 번 들어왔습니다 — 뒤의 값을 씁니다`);used.add(x.k);const ov=prev.res&&prev.res[x.k]||'';if(val)t.qs.res[x.k]=val;else delete t.qs.res[x.k];if(jg===null)delete jd[x.k];else jd[x.k]=jg;if(memo)rm[x.k]=memo;
    const j=trJS({qs:{...t.qs,jd}},row,x);if(jg===null&&val&&j===null)it.warns.push(`'${lab}' 자동 판정 못 함 (기준 '${trSubStd(row,x)}') — judge를 넣으면 반영됩니다`);
    D.push([`${row.item}(${x.label})`,chg?'':ov,`${val||'-'} ${j===true?'O':j===false?'X':''}${jg!==null?' (직접)':''}`]);return}const uk=row.id+'|'+(comb||'');if(used.has(uk))it.warns.push(`'${lab}'이(가) 같은 행에 두 번 들어왔습니다 — 뒤의 값을 씁니다`);used.add(uk);
   if(unit&&row.unit&&trK(unit)!==trK(row.unit))it.warns.push(`'${lab}' 단위 '${unit}' ≠ 기준 '${row.unit}'`);
   const ov=prev.res&&prev.res[row.id]||'';if(comb){const cur=qsParts(t.qs.res[row.id])||(()=>{const m=String(t.qs.res[row.id]||'').match(QS_PT);return m?{[m[1].toUpperCase()]:String(t.qs.res[row.id]).slice(m[0].length).trim()}:{}})();if(val)cur[comb]=val;else delete cur[comb];const ks=Object.keys(qsParts(row.std)).filter(k=>cur[k]!=null);const sv=ks.map(k=>`${k} ${cur[k]}`).join(' / ');if(sv)t.qs.res[row.id]=sv;else delete t.qs.res[row.id]}else if(val)t.qs.res[row.id]=val;else delete t.qs.res[row.id];if(jg===null)delete jd[row.id];else jd[row.id]=jg;if(memo)rm[row.id]=memo;
   const tmp={qs:{...t.qs,jd}},j=trJ(tmp,row);if(jg===null&&val&&j===null&&!comb)it.warns.push(`'${lab}' 자동 판정 못 함 (기준 '${row.std}') — judge를 넣으면 반영됩니다`);
   D.push([row.item+(row.div&&row.div!=='-'?`(${row.div})`:comb?`(${comb})`:''),chg?'':ov,`${comb?t.qs.res[row.id]||'-':val||'-'} ${j===true?'O':j===false?'X':''}${jg!==null?' (직접)':''}`])});
  if(Object.keys(jd).length)t.qs.jd=jd;else delete t.qs.jd;if(Object.keys(rm).length)t.qs.rm=rm;else delete t.qs.rm;if(ex.length)t.qs.extra=ex;else delete t.qs.extra;if(t.qs.subs&&!Object.keys(t.qs.subs).length)delete t.qs.subs;
  const {L}=trCmpCalc(t,q,f),ng=L.filter(x=>x.j===false),done=L.filter(x=>x.j!==null).length,exNg=(t.qs.extra||[]).filter(e=>e.judge===false);
  if(a.overall!=null&&a.overall!=='')t.result=trJudge(a.overall)?'합격':'불합격';else if(ng.length||exNg.length)t.result='불합격';else if(done&&done===L.length)t.result='합격';else if(done)it.warns.push(`미입력 ${L.length-done}항목 — 결과(합격/불합격)는 그대로 둡니다`);
  if(a.failedItems!=null)t.fail=Array.isArray(a.failedItems)?a.failedItems.map(rqS).filter(Boolean).join(', '):rqS(a.failedItems);else if(done||exNg.length)t.fail=[trCmpFail(L),...exNg.map(e=>e.item+(e.part?`(${e.part})`:''))].filter(Boolean).join(', ');
  if(t.result==='합격'&&ng.length&&a.overall!=null)it.warns.push(`overall은 pass지만 불합격 판정 ${ng.length}항목이 있습니다`);
  t.updated=now();
  it.diff=[['성적서','',`${t.no||'-'} · ${t.name}`],['연결 기준',oq?`${oq.name} / ${of?of.name:''}`:'',`${q.name} / ${f.name}`]].concat(D,[['결과',old.result,t.result],['불합격 항목',old.fail,t.fail],['입력 방식','',rep?'바꿈 (기존 입력 지움)':'합침']]);
  if(!it.warns.length)it.warns=[];if(ctx.trRes)ctx.trRes.push(t.id)}
});
