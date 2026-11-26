// ===== 화면 이동 기록 (Esc = 브라우저 '뒤로'처럼 직전 화면으로) =====
// 화면 = 카테고리(page) + 그 안에서 연 상세(생산 오더 · 청구서 · 거래명세서/외주작업의뢰서 편집 · 설정 항목 · TEST REPORT 기준 비교).
// 어떤 경로로 이동하든(메뉴 · 대시보드 · 통합 검색 · 다른 카테고리의 링크 · 서류 보관함 · 요청함 …) 화면이 바뀌면 바로 앞 화면(스크롤 위치 포함)을 기록.
// Esc: 상세/편집 화면이면 먼저 그 화면의 '◀ 목록'을 누른 것과 같이 닫고(저장 안 한 변경은 평소처럼 확인 — 취소하면 그대로 머묾), 기록이 있으면 직전 화면으로.
// 기록이 없으면 예전과 같음(상세 → 목록). 카테고리 안의 탭·필터·검색어는 그 화면에 그대로 남아 있어 돌아오면 이어서 보임.
(function(){
 const NAV_MAX=50;let S=[],cur=null,busy=false,T=0,bk=false;
 const C=()=>document.getElementById('content');
 const st=()=>{const p=page,o={page:p};
  if(p==='prod')o.pv=pv||null;
  if(p==='bill')o.bl=typeof blSel!=='undefined'&&blSel||null;
  if(p==='stmt')o.st=typeof stEd!=='undefined'&&stEd?stEd.id:null;
  if(p==='outwork')o.ow=typeof owEd!=='undefined'&&owEd?(owEd.id||'new'):null;
  if(p==='settings')o.set=typeof setSec!=='undefined'?setSec:'';
  if(p==='testrpt')o.tc=typeof trCmpId!=='undefined'&&trCmpId||'';
  return o};
 // 기록을 나누는 기준: TEST REPORT 기준 비교는 열림/닫힘만 (다른 성적서를 눌러 바꾸는 것은 같은 화면)
 const sigOf=o=>JSON.stringify([o.page,o.pv,o.bl,o.st,o.ow,o.set,o.tc?1:0]);
 const snap=()=>{const o=st();o.sig=sigOf(o);const c=C();o.top=c?c.scrollTop:0;return o};
 // '◀ 목록'(data-back)으로 닫은 것은 '뒤로'라서 기록하지 않음 (기록의 직전 화면과 같으면 그 기록을 씀) → Esc를 다시 눌러도 상세로 되돌아가지 않음
 function check(){T=0;if(busy){bk=false;return} // Esc 처리 중에 눌린 '◀ 목록'은 navBack이 정리 — 표시를 남기면 다음 이동이 '뒤로'로 잘못 처리돼 기록이 빠짐
 const s=snap(),b=bk;bk=false;if(!cur){cur=s;return}if(s.sig===cur.sig)return;
  const top=S[S.length-1];if(b){if(top&&top.sig===s.sig)S.pop();cur=s;return}
  if(!(top&&top.sig===cur.sig))S.push(cur);if(S.length>NAV_MAX)S.shift();cur=s}
 const sched=()=>{if(!T)T=setTimeout(check,0)};
 // 화면을 그릴 때 · 클릭 뒤 · 스크롤(같은 화면이면 위치만 갱신)
 window.addEventListener('load',()=>{const r=window.render;if(typeof r==='function'&&!r._nav){const w=function(){const x=r.apply(this,arguments);sched();return x};w._nav=1;window.render=w}
  document.addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('[data-back]')){if(T){clearTimeout(T);check()}bk=true}sched()},true);const c=C();if(c)c.addEventListener('scroll',()=>{if(busy||!cur)return;const s=st();if(sigOf(s)===cur.sig)cur.top=c.scrollTop;else check()},{passive:true});
  setTimeout(()=>{cur=snap()},0)});
 const settle=async()=>{await new Promise(r=>setTimeout(r,0));while(document.querySelector('dialog[open]'))await new Promise(r=>setTimeout(r,60));await new Promise(r=>setTimeout(r,0))};
 // 기록한 화면으로 되돌림 (지워진 오더·청구서 등은 그 목록으로)
 function restore(t){busy=true;try{
  if(t.page==='prod')pv=t.pv&&orders.some(o=>o.id===t.pv)?t.pv:null;
  if(t.page==='bill'&&typeof blSel!=='undefined'){if(t.bl){blSel=t.bl;blYm=t.bl.slice(0,7)}else blSel=null}
  if(t.page==='stmt'&&typeof stEd!=='undefined'){if(t.st){if(!(stEd&&stEd.id===t.st)){const s=stmts.find(x=>x.id===t.st);if(s){stEd=JSON.parse(JSON.stringify(s));if(!stEd.lots.length)stEd.lots.push(emptyLot())}else if(!stEd||!edDirty(stEd))stEd=null}}else if(stEd&&!edDirty(stEd))stEd=null}
  if(t.page==='outwork'&&typeof owEd!=='undefined'){if(t.ow){if(!(owEd&&(owEd.id||'new')===t.ow)){const r=owReqs.find(x=>x.id===t.ow);if(r)owEd=JSON.parse(JSON.stringify(r));else if(!owEd||!edDirty(owEd))owEd=null}}else if(owEd&&!edDirty(owEd))owEd=null}
  if(t.page==='settings'&&typeof setSec!=='undefined')setSec=t.set||'';
  if(t.page==='testrpt'&&typeof trCmpId!=='undefined'){trCmpId=t.tc&&trs.some(x=>x.id===t.tc)?t.tc:'';if(typeof trCmpRender==='function')trCmpRender()}
  if(page===t.page)render();else go(t.page);
  if(t.page==='stmt'&&typeof renderEditor==='function'&&stEd)renderEditor();
  const c=C(),y=t.top||0;if(c){c.scrollTop=y;requestAnimationFrame(()=>requestAnimationFrame(()=>{c.scrollTop=y;if(window.stickyUpdate)stickyUpdate();if(cur)cur.top=c.scrollTop}))}
  cur=snap();cur.top=y}finally{busy=false}}
 // Esc에서 부름: 처리했으면 true. back = 지금 화면의 '◀ 목록' 버튼(없으면 null)
 window.navBack=function(back){if(T){clearTimeout(T);check()}if(!S.length){if(back)back.click();return !!back}
  if(!back){restore(S.pop());return true}
  (async()=>{const before=snap().sig;busy=true;try{back.click();await settle()}finally{busy=false;bk=false;if(T){clearTimeout(T);T=0}}
   const now=snap();if(now.sig===before){cur=now;return} // 저장 안 한 변경 확인에서 취소 → 그대로
   const t=S.pop();if(!t){cur=now;return}if(now.sig===t.sig){cur=now;const c=C(),y=t.top||0;if(c)requestAnimationFrame(()=>requestAnimationFrame(()=>{c.scrollTop=y;cur.top=y}));return}
   restore(t)})();return true};
 window.navHist=()=>({S:S.map(x=>x.sig),cur:cur&&cur.sig}); // 테스트·점검용
 window.navReset=()=>{S=[];cur=snap()};
})();
