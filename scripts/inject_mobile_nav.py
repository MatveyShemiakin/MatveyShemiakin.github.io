from pathlib import Path
from urllib.parse import urlparse
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
STYLE = '<link rel="stylesheet" href="/mobile-nav.css?v=20260806-1">'
SCRIPT = '<script src="/mobile-nav.js?v=20260806-1"></script>'
EXCLUDED = {ROOT / 'konspekt.html'}

def public_pages():
    sitemap = ET.parse(ROOT / 'sitemap.xml')
    namespace = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    for loc in sitemap.findall('.//sm:loc', namespace):
        url_path = urlparse(loc.text.strip()).path
        if url_path == '/':
            page = ROOT / 'index.html'
        elif url_path.endswith('/'):
            page = ROOT / url_path.lstrip('/') / 'index.html'
        else:
            page = ROOT / url_path.lstrip('/')
        if page not in EXCLUDED:
            yield page

changed = []
for path in public_pages():
    if not path.exists():
        raise FileNotFoundError(path)
    text = path.read_text(encoding='utf-8')
    original = text
    text = re.sub(r'<link\s+rel="stylesheet"\s+href="/mobile-nav\.css(?:\?v=[^"]*)?">', STYLE, text)
    text = re.sub(r'<script\s+src="/mobile-nav\.js(?:\?v=[^"]*)?"></script>', SCRIPT, text)
    if '/mobile-nav.css' not in text:
        if '</head>' not in text:
            raise ValueError(f'Missing </head> in {path}')
        text = text.replace('</head>', STYLE + '</head>', 1)
    if '/mobile-nav.js' not in text:
        if '</body>' not in text:
            raise ValueError(f'Missing </body> in {path}')
        text = text.replace('</body>', SCRIPT + '</body>', 1)
    if text != original:
        path.write_text(text, encoding='utf-8')
        changed.append(path.relative_to(ROOT).as_posix())

print('\n'.join(changed) if changed else 'No mobile navbar changes required')
