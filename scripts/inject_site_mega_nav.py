from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSS_LINK = '<link rel="stylesheet" href="/site-mega-nav.css?v=20261024-3">'
JS_SCRIPT = '<script defer src="/site-mega-nav.js?v=20260816-2"></script>'


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
    # Run last: templates, legal injection and feed generation may contain old copies.
    from scripts.site_header import main as update_headers
    update_headers()


if __name__ == '__main__':
    import sys
    sys.path.insert(0,str(ROOT))
    main()
