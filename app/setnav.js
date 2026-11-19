// ===== 설정: 항목 버튼 → 누르면 그 항목만 (◀ 설정으로 돌아가기) =====
const SET_SECS=[['sup','공급자 정보'],['bl','청구서 정보'],['pl','공정 목록'],['g','구글 계정 연결'],['rq','요청함'],['snap','조회용 파일'],['lb','라벨 인쇄 위치 보정'],['bk','백업 / 복원'],['upd','프로그램 정보 / 업데이트'],['loc','저장 위치']];
let setSec='';
function setHint(k){try{if(k==='sup')return typeof sups!=='undefined'&&Array.isArray(sups)&&sups.length?`${sups.length}곳`:'';
 if(k==='pl')return `${procList.length}개`;if(k==='snap')return snapOn?'켜짐':'꺼짐';if(k==='upd')return ($('curver')||{}).textContent||''}catch(e){}return ''}
function setNav(){const pg=$('p_settings'),el=$('set_nav');if(!pg||!el)return;if(setSec&&!SET_SECS.some(x=>x[0]===setSec))setSec='';pg.dataset.sec=setSec;
 {const t=$('ptitle'),L=SET_SECS.find(x=>x[0]===setSec);if(t)t.textContent=L?'설정 › '+L[1]:'설정'}
 pg.querySelectorAll('.card[data-sec]').forEach(c=>c.style.display=setSec&&c.dataset.sec===setSec?'block':'');
 el.innerHTML=setSec?`<div class="sback"><button onclick="setOpen('')">◀ 설정</button></div>`:`<div class="stiles">${SET_SECS.map(([k,l])=>{const h=setHint(k);return `<button class="stile" onclick="setOpen('${k}')">${esc(l)}${h&&h!=='-'?`<small>${esc(h)}</small>`:''}</button>`}).join('')}</div>`}
function setOpen(k){setSec=k||'';if(page!=='settings')return go('settings');render();const c=$('content');if(c)c.scrollTop=0;if(k==='lb'&&typeof lbSetCard==='function')lbSetCard()}
