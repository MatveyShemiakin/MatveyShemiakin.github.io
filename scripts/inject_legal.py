from pathlib import Path
import re

# Shared build step: keep privacy controls connected to every static HTML page
# and professional safeguards connected to every clinician-facing page.
ROOT = Path(__file__).resolve().parents[1]
LEGAL_SCRIPT = '<script src="/legal.js?v=20260721-3"></script>'
DOCTORS_SCRIPT = '<script src="/doctors-legal.js?v=20260721-1"></script>'
PRIVACY_PAGES = {ROOT / 'privacy.html', ROOT / 'en' / 'privacy.html'}
PROFESSIONAL_TERMS = {
    ROOT / 'for-doctors' / 'professional-use.html',
    ROOT / 'en' / 'for-doctors' / 'professional-use.html',
}

changed = []
for path in ROOT.rglob('*.html'):
    relative = path.relative_to(ROOT)
    if any(part.startswith('.') for part in relative.parts):
        continue

    text = path.read_text(encoding='utf-8')
    original = text

    if path not in PRIVACY_PAGES:
        if '/legal.js' in text:
            text = re.sub(r'<script\s+src="/legal\.js(?:\?v=[^"]*)?"></script>', LEGAL_SCRIPT, text)
        else:
            insertion = LEGAL_SCRIPT
            if '</body>' in text:
                text = text.replace('</body>', insertion + '</body>', 1)
            elif '</html>' in text:
                text = text.replace('</html>', insertion + '</html>', 1)

    relative_posix = relative.as_posix()
    is_doctors_page = relative_posix.startswith('for-doctors/') or relative_posix.startswith('en/for-doctors/')
    if is_doctors_page and path not in PROFESSIONAL_TERMS and '/doctors-legal.js' not in text:
        if '</body>' in text:
            text = text.replace('</body>', DOCTORS_SCRIPT + '</body>', 1)
        elif '</html>' in text:
            text = text.replace('</html>', DOCTORS_SCRIPT + '</html>', 1)

    if text != original:
        path.write_text(text, encoding='utf-8')
        changed.append(relative_posix)

sitemap = ROOT / 'sitemap.xml'
if sitemap.exists():
    text = sitemap.read_text(encoding='utf-8')
    urls = (
        'https://matveyshemyakin.ru/privacy.html',
        'https://matveyshemyakin.ru/en/privacy.html',
        'https://matveyshemyakin.ru/for-doctors/',
        'https://matveyshemyakin.ru/en/for-doctors/',
        'https://matveyshemyakin.ru/for-doctors/professional-use.html',
        'https://matveyshemyakin.ru/en/for-doctors/professional-use.html',
    )
    entries = []
    for url in urls:
        if url not in text:
            entries.append(f'<url><loc>{url}</loc><lastmod>2026-07-21</lastmod></url>')
    if entries and '</urlset>' in text:
        text = text.replace('</urlset>', ''.join(entries) + '</urlset>')
        sitemap.write_text(text, encoding='utf-8')
        changed.append('sitemap.xml')

print('\n'.join(changed) if changed else 'No changes required')
