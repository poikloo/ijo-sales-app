// ===== 실행 취소 (Ctrl+Z) / 다시 실행 (Ctrl+Y, Ctrl+Shift+Z) — 모든 카테고리 공통 =====
// save() 직전 상태를 통째로 보관 (최대 50단계). 0.4초 안에 이어진 저장(요청함 적용 등)은 한 단계로 묶음.
// 칸 넓이·정렬·요청함 기록·스냅샷 설정은 되돌리지 않음.
const UNDO_MAX=50,UNDO_KEEP=['savedAt','colWidths','listSort','requestLog','requestDoneIds','snapshotEnabled'];
let undoS=[],redoS=[],undoLast=null,undoBusy=false,undoT=0,undoHold=0;
const undoStr=p=>{const o={...p};UNDO_KEEP.forEach(k=>delete o[k]);return JSON.stringify(o)};
function undoInit(){try{undoLast=undoStr(payload())}catch(e){undoLast=null}}
function undoTrack(p){const s=undoStr(p);if(undoBusy||undoLast==null||s===undoLast){undoLast=s;return}
 const t=Date.now();if(!(undoHold||t-undoT<400)){undoS.push(undoLast);if(undoS.length>UNDO_MAX)undoS.shift();redoS=[]}undoT=t;undoLast=s}
function undoApply(s){const cur=payload(),o=JSON.parse(s);UNDO_KEEP.forEach(k=>{if(k in cur)o[k]=cur[k]});undoBusy=true;
 try{load(o);save()}finally{undoBusy=false}undoLast=s;if(typeof attClose==='function')attClose(false);render()}
function undoDo(){if(!undoS.length){toast('되돌릴 작업이 없어요');return}redoS.push(undoLast);undoApply(undoS.pop());undoT=0;toast('실행 취소')}
function redoDo(){if(!redoS.length){toast('다시 실행할 작업이 없어요');return}undoS.push(undoLast);undoApply(redoS.pop());undoT=0;toast('다시 실행')}
const undoTxt=el=>el&&(el.tagName==='TEXTAREA'||el.tagName==='INPUT'&&/^(text|search|email|tel|url|password|)$/i.test(el.type)||el.isContentEditable);
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const k=e.key.toLowerCase(),redo=k==='y'||k==='z'&&e.shiftKey;if(k!=='z'&&k!=='y')return;
 if(document.querySelector('dialog[open]'))return; // 창 안에서는 입력칸의 기본 실행 취소만
 const el=document.activeElement;
 if(undoTxt(el)){const v=el.value;setTimeout(()=>{if(el.value===v&&document.activeElement===el){el.blur();redo?redoDo():undoDo()}},0);return} // 입력칸에서 더 되돌릴 게 없을 때 데이터 실행 취소
 e.preventDefault();if(el&&el.blur&&el!==document.body)el.blur();redo?redoDo():undoDo()},true);
// 요청함 적용은 한 단계
window.addEventListener('load',()=>{const f=window.rqApply;if(typeof f==='function')window.rqApply=async function(){undoT=0;const pre=undoLast;undoHold++;try{return await f.apply(this,arguments)}finally{undoHold--;if(undoLast!==pre&&undoS[undoS.length-1]!==pre){undoS.push(pre);if(undoS.length>UNDO_MAX)undoS.shift();redoS=[]}}}});
