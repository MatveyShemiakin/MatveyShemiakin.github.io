from pathlib import Path
import re

# Shared build step: keep privacy controls connected to every static HTML page,
# consent-gated analytics loaded early, and professional safeguards connected
# to every clinician-facing page.
ROOT = Path(__file__).resolve().parents[1]
ANALYTICS_SCRIPT = '<script src="/analytics.js?v=20260811-2"></script>'
EVENTS_ANALYTICS_SCRIPT = '<script src="/analytics.js?v=20261008-1"></script>'
HOME_ANALYTICS_SCRIPT = '<script defer src="/analytics.js?v=20260811-2"></script>'
LEGAL_SCRIPT = '<script src="/legal.js?v=20260721-3"></script>'
HOME_LEGAL_SCRIPT = '<script src="/legal.js?v=20261004-1"></script>'
DOCTORS_SCRIPT = '<script src="/doctors-legal.js?v=20260816-2"></script>'
PRIVACY_PAGES = {ROOT / 'privacy.html', ROOT / 'en' / 'privacy.html'}
PROFESSIONAL_TERMS = {
    ROOT / 'for-doctors' / 'professional-use.html',
    ROOT / 'en' / 'for-doctors' / 'professional-use.html',
}

changed = []
for path in ROOT.rglob('*.html'):
    relative = path.relative_to(ROOT)
    if any(part.startswith('.') for part in relative.parts) or relative.parts[0] == 'logbook':
        continue

    text = path.read_text(encoding='utf-8')
    original = text
    # Only homepages have been verified for deferred analytics. The events
    # calendar still relies on the early fetch patch in the synchronous loader.
    is_home = relative.as_posix() in {'index.html', 'en/index.html'}
    is_events = relative.as_posix() in {'for-doctors/events/index.html', 'en/for-doctors/events/index.html'}
    analytics_script = HOME_ANALYTICS_SCRIPT if is_home else (EVENTS_ANALYTICS_SCRIPT if is_events else ANALYTICS_SCRIPT)
    legal_script = HOME_LEGAL_SCRIPT if is_home else LEGAL_SCRIPT

    if '/analytics.js' in text:
        text = re.sub(r'<script\s+(?:defer\s+)?src="/analytics\.js(?:\?v=[^"]*)?"></script>', analytics_script, text)
    else:
        head_match = re.search(r'<head(?:\s[^>]*)?>', text, flags=re.IGNORECASE)
        if head_match:
            text = text[:head_match.end()] + '\n  ' + analytics_script + text[head_match.end():]
        elif '</body>' in text:
            text = text.replace('</body>', analytics_script + '</body>', 1)
        elif '</html>' in text:
            text = text.replace('</html>', analytics_script + '</html>', 1)

    if path not in PRIVACY_PAGES:
        if '/legal.js' in text:
            text = re.sub(r'<script\s+src="/legal\.js(?:\?v=[^"]*)?"></script>', legal_script, text)
        else:
            if '</body>' in text:
                text = text.replace('</body>', legal_script + '</body>', 1)
            elif '</html>' in text:
                text = text.replace('</html>', legal_script + '</html>', 1)

    relative_posix = relative.as_posix()
    is_doctors_page = relative_posix.startswith('for-doctors/') or relative_posix.startswith('en/for-doctors/')
    if is_doctors_page and path not in PROFESSIONAL_TERMS:
        if '/doctors-legal.js' in text:
            text = re.sub(r'<script\s+src="/doctors-legal\.js(?:\?v=[^"]*)?"></script>', DOCTORS_SCRIPT, text)
        elif '</body>' in text:
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
