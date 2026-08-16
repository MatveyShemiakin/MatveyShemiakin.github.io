from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSS_LINK = '<link rel="stylesheet" href="/site-mega-nav.css?v=20260816-1">'
JS_SCRIPT = '<script defer src="/site-mega-nav.js?v=20260816-1"></script>'


def inject_assets(text: str) -> str:
    text = re.sub(
        r'<link\s+rel="stylesheet"\s+href="/site-mega-nav\.css(?:\?v=[^"]*)?">',
        CSS_LINK,
        text,
    )
    if '/site-mega-nav.css' not in text and '</head>' in text:
        text = text.replace('</head>', CSS_LINK + '</head>', 1)

    text = re.sub(
        r'<script\s+defer\s+src="/site-mega-nav\.js(?:\?v=[^"]*)?"></script>',
        JS_SCRIPT,
        text,
    )
    if '/site-mega-nav.js' not in text and '</body>' in text:
        text = text.replace('</body>', JS_SCRIPT + '</body>', 1)
    return text


def main() -> None:
    changed = 0
    for path in ROOT.rglob('*.html'):
        if '.git' in path.parts:
            continue
        original = path.read_text(encoding='utf-8')
        updated = inject_assets(original)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            changed += 1
            print(path.relative_to(ROOT))
    print(f'Updated HTML files: {changed}')


if __name__ == '__main__':
    main()
