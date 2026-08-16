#!/usr/bin/env python3
from pathlib import Path

paths = [Path('for-doctors/events/index.html'), Path('en/for-doctors/events/index.html')]
old = '/assets/events/events.css?v=20260816-2'
new = '/assets/events/events.css?v=20260816-3'
for path in paths:
    text = path.read_text(encoding='utf-8')
    if old not in text and new not in text:
        raise SystemExit(f'events.css reference not found in {path}')
    text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')
print('patched events.css cache version in RU/EN')
