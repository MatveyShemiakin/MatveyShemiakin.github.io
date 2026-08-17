#!/usr/bin/env python3
from pathlib import Path

js_path = Path('assets/events/events.js')
text = js_path.read_text(encoding='utf-8')
old = "function switchView(v){state.view=v;$$('.view-panel').forEach(x=>x.classList.toggle('active',x.id===`view-${v}`));$$('[data-view]').forEach(x=>{x.classList.toggle('active',x.dataset.view===v);x.setAttribute('aria-selected',String(x.dataset.view===v))});$$('[data-mobile-view]').forEach(x=>x.classList.toggle('active',x.dataset.mobileView===v));if(v==='calendar')calendar()}"
new = "function switchView(v){state.view=v;const panel=$(`#view-${v}`);$$('.view-panel').forEach(x=>x.classList.toggle('active',x.id===`view-${v}`));$$('[data-view]').forEach(x=>{x.classList.toggle('active',x.dataset.view===v);x.setAttribute('aria-selected',String(x.dataset.view===v))});$$('[data-mobile-view]').forEach(x=>x.classList.toggle('active',x.dataset.mobileView===v));if(v==='calendar')calendar();if(panel){const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;requestAnimationFrame(()=>panel.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'}))}}"
if old not in text:
    raise SystemExit('switchView target not found')
js_path.write_text(text.replace(old, new), encoding='utf-8')

for path in [Path('for-doctors/events/index.html'), Path('en/for-doctors/events/index.html')]:
    html = path.read_text(encoding='utf-8')
    old_src = '<script src="/assets/events/events.js" defer></script>'
    new_src = '<script src="/assets/events/events.js?v=20260817-1" defer></script>'
    if old_src not in html and new_src not in html:
        raise SystemExit(f'events.js script tag not found in {path}')
    path.write_text(html.replace(old_src, new_src), encoding='utf-8')

print('patched events view switching and cache-busted JS')
