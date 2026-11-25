// Esc = 뒤로: 직전에 보던 화면으로 (nav.js 이동 기록). 기록이 없으면 상세 화면의 '◀ 목록'(data-back) 버튼을 누른 것과 같음
// - 열린 창(dialog)·팝업은 각자 Esc로 먼저 닫힘(여기서는 건드리지 않음)
// - 입력칸에서 Esc는 먼저 입력칸에서 빠져나옴(입력 내용은 평소처럼 반영) → 한 번 더 누르면 목록으로
// - 편집 화면(거래명세서·외주작업의뢰서)은 바뀐 내용이 없으면 확인 없이 바로, 있으면 평소처럼 확인
window.edSnap=new WeakMap();
window.edMark=o=>{if(o&&typeof o==='object'&&!edSnap.has(o))edSnap.set(o,JSON.stringify(o))};
window.edDirty=o=>!o||!edSnap.has(o)||edSnap.get(o)!==JSON.stringify(o);
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.defaultPrevented||e.isComposing||e.ctrlKey||e.altKey||e.metaKey)return;
 if(document.querySelector('dialog[open]'))return;
 const a=document.activeElement;if(a&&a!==document.body&&a.matches&&a.matches('input,textarea,select,[contenteditable],[contenteditable] *')){e.preventDefault();a.blur();return}
 const pg=document.querySelector('.page.on');if(!pg)return;const b=[...pg.querySelectorAll('[data-back]')].find(x=>x.offsetParent!==null&&!x.disabled);
 if(window.navBack&&navBack(b||null)){e.preventDefault();return} // 이동 기록이 있으면 직전 화면으로 (nav.js)
 if(b){e.preventDefault();b.click()}});
