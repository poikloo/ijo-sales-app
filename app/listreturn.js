// 목록 → 상세(또는 편집 창) → 목록으로 돌아오면: 정렬·필터는 그대로 두고, 마지막으로 연 행을 보이는 영역 맨 위로 올리고 잠깐 강조
(function(){
 let P=null;// {page,key,top,hid}
 const C=()=>document.getElementById('content');
 const find=()=>{if(!P)return null;const pg=document.getElementById('p_'+P.page);if(!pg)return null;return [...pg.querySelectorAll('tr.r')].find(t=>t.getAttribute('onclick')===P.key)||null};
 const tableShown=()=>{const pg=document.getElementById('p_'+P.page);if(!pg||!pg.classList.contains('on'))return false;return [...pg.querySelectorAll('tbody')].some(b=>b.contains(document.querySelector(`[data-lrt="${P.tb}"]`))&&b.offsetParent!==null)};
 function flash(tr){tr.classList.remove('lrhl');void tr.offsetWidth;tr.classList.add('lrhl');setTimeout(()=>tr.classList.remove('lrhl'),2200)}
 function toTop(tr){const th=tr.closest('table').querySelector('thead th'),sticky=th&&getComputedStyle(th).position==='sticky';tr.style.scrollMarginTop=(sticky?th.getBoundingClientRect().height:0)+'px';tr.scrollIntoView({block:'start'})}
 document.addEventListener('click',e=>{const tr=e.target.closest&&e.target.closest('#content tr.r[onclick]');if(!tr)return;const pg=tr.closest('.page');if(!pg)return;
  const tb=tr.closest('tbody');if(!tb.dataset.lrt)tb.dataset.lrt=Math.random().toString(36).slice(2);
  P={page:pg.id.slice(2),key:tr.getAttribute('onclick'),top:C().scrollTop,tb:tb.dataset.lrt,tbid:tb.id,hid:false}},true);
 function after(){if(!P)return;const pg=document.getElementById('p_'+P.page);if(!pg||!pg.classList.contains('on')){return}
  const tb=(P.tbid&&document.getElementById(P.tbid))||pg.querySelector(`[data-lrt="${P.tb}"]`);const shown=tb&&tb.offsetParent!==null;
  if(!shown){P.hid=true;return}if(!P.hid)return;// 아직 목록을 떠난 적 없음 (편집 창 등은 dlgClose에서 처리)
  const tr=find(),p=P;P=null;requestAnimationFrame(()=>{if(tr&&tr.isConnected){toTop(tr);flash(tr)}else C().scrollTop=p.top})}
 window.lrAfter=after;
 // 편집 창(dialog)으로 여는 목록: 닫힌 뒤 그 행을 강조 (화면 밖이면 맨 위로)
 window.addEventListener('load',()=>{const d=document.getElementById('dlg');if(d)d.addEventListener('close',()=>setTimeout(()=>{if(!P||P.hid)return;const tr=find();P=null;if(!tr)return;const r=tr.getBoundingClientRect(),c=C().getBoundingClientRect();if(r.top<c.top||r.bottom>c.bottom)toTop(tr);flash(tr)},0))});
})();
