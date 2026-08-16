from __future__ import annotations

import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CSS_LINK='<link rel="stylesheet" href="/for-doctors/doctors-updates.css?v=20260816-1">'
JS_SCRIPT='<script defer src="/for-doctors/doctors-updates.js?v=20260816-1"></script>'
START='<!-- doctors-updates:start -->'
END='<!-- doctors-updates:end -->'


def shell(lang: str) -> str:
    en=str(lang or '').lower().startswith('en')
    aria='What’s new' if en else 'Что нового'
    section='Updates' if en else 'Обновления'
    title='What’s new' if en else 'Что нового'
    mark='Mark all read' if en else 'Прочитать всё'
    return (
        START+
        '<div class="doctors-updates" id="doctors-updates">'
        f'<button class="doctors-updates-toggle" id="doctors-updates-toggle" type="button" aria-expanded="false" aria-controls="doctors-updates-panel" aria-label="{aria}">'
        '<span class="doctors-updates-bell" aria-hidden="true"></span>'
        '<span class="doctors-updates-count" id="doctors-updates-count" hidden>0</span>'
        '</button>'
        '<section class="doctors-updates-panel" id="doctors-updates-panel" aria-labelledby="doctors-updates-title" hidden>'
        '<div class="doctors-updates-head"><div>'
        f'<span id="doctors-updates-section-label">{section}</span>'
        f'<h2 id="doctors-updates-title">{title}</h2>'
        '</div>'
        f'<button class="doctors-updates-mark-all" id="doctors-updates-mark-all" type="button">{mark}</button>'
        '</div><div class="doctors-updates-list" id="doctors-updates-list" aria-live="polite"></div>'
        '</section></div>'+END
    )


def inject_doctors_updates(text: str, lang: str) -> str:
    text=re.sub(r'<link\s+rel="stylesheet"\s+href="/for-doctors/doctors-updates\.css(?:\?v=[^"]*)?">',CSS_LINK,text)
    if '/for-doctors/doctors-updates.css' not in text and '</head>' in text:
        text=text.replace('</head>',CSS_LINK+'</head>',1)

    replacement=shell(lang)
    marker_pattern=re.compile(re.escape(START)+r'.*?'+re.escape(END),re.S)
    if marker_pattern.search(text):
        text=marker_pattern.sub(replacement,text,count=1)
    elif 'id="doctors-updates"' not in text:
        marker=re.search(r'<div\s+class="doctors-language"(?=[\s>])',text)
        if marker:
            text=text[:marker.start()]+replacement+text[marker.start():]

    text=re.sub(r'<script\s+defer\s+src="/for-doctors/doctors-updates\.js(?:\?v=[^"]*)?"></script>',JS_SCRIPT,text)
    if '/for-doctors/doctors-updates.js' not in text and '</body>' in text:
        text=text.replace('</body>',JS_SCRIPT+'</body>',1)
    return text


def main() -> None:
    targets=[
        (ROOT/'for-doctors'/'index.html','ru'),
        (ROOT/'en'/'for-doctors'/'index.html','en'),
    ]
    changed=[]
    for path,lang in targets:
        if not path.exists():
            continue
        original=path.read_text(encoding='utf-8')
        updated=inject_doctors_updates(original,lang)
        if updated!=original:
            path.write_text(updated,encoding='utf-8')
            changed.append(path.relative_to(ROOT).as_posix())
    print('\n'.join(changed) if changed else 'No doctor updates injection changes required')


if __name__=='__main__':
    main()
