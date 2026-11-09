(function(){"use strict";
const root=document.querySelector(".learn-page");if(!root)return;
const ru=root.dataset.learnLang==="ru";
const search=document.getElementById("learn-query"),specialty=document.getElementById("learn-specialty"),format=document.getElementById("learn-format"),onlySaved=document.getElementById("learn-only-saved"),count=document.getElementById("learn-count"),savedCount=document.getElementById("learn-saved-count"),empty=document.getElementById("learn-empty"),cards=Array.from(document.querySelectorAll(".learn-card"));
const key="ms_free_learning_bookmarks_v1";let saved=[];
try{const data=JSON.parse(localStorage.getItem(key)||"[]");if(Array.isArray(data))saved=data.map(String)}catch(e){saved=[]}
function filter(){const q=search.value.trim().toLocaleLowerCase(),sp=specialty.value,fmt=format.value;let shown=0;
cards.forEach(card=>{const ok=(!q||card.dataset.search.includes(q))&&(sp==="all"||card.dataset.specialties.split(" ").includes(sp))&&(fmt==="all"||card.dataset.format===fmt)&&(!onlySaved.checked||saved.includes(card.dataset.id));card.hidden=!ok;if(ok)shown++});
count.textContent=shown;empty.hidden=shown!==0;savedCount.textContent=saved.length;
document.querySelectorAll(".learn-bookmark").forEach(btn=>{const on=saved.includes(btn.dataset.bookmark);btn.setAttribute("aria-pressed",String(on));btn.setAttribute("aria-label",on?(ru?"Убрать из избранного":"Remove bookmark"):(ru?"Добавить в избранное":"Save resource"));btn.title=btn.getAttribute("aria-label")});
}
cards.forEach(card=>card.querySelector(".learn-bookmark").addEventListener("click",()=>{const id=card.dataset.id;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem(key,JSON.stringify(saved))}catch(e){}filter()}));
[search,specialty,format,onlySaved].forEach(el=>el.addEventListener(el===search?"input":"change",filter));
document.getElementById("learn-reset").addEventListener("click",()=>{search.value="";specialty.value="all";format.value="all";onlySaved.checked=false;filter();search.focus()});
document.getElementById("learn-share").addEventListener("click",async(e)=>{const button=e.currentTarget,url=location.href;
try{if(navigator.share){await navigator.share({title:document.title,url});return}
if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url)}else{const el=document.createElement("textarea");el.value=url;document.body.appendChild(el);el.select();document.execCommand("copy");el.remove()}
const prev=button.textContent;button.textContent=ru?"Ссылка скопирована ✓":"Link copied ✓";setTimeout(()=>{button.textContent=prev},1800)}catch(err){/* User dismissed share dialog or clipboard unavailable */}});
filter();
})();