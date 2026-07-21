from pathlib import Path

# Shared build step: keep privacy controls connected to every static HTML page.
ROOT = Path(__file__).resolve().parents[1]
SCRIPT = '<script src="/legal.js?v=20260721-1"></script>'
EXCLUDED = {ROOT / 'privacy.html', ROOT / 'en' / 'privacy.html'}

changed = []
for path in ROOT.rglob('*.html'):
    if path in EXCLUDED or any(part.startswith('.') for part in path.relative_to(ROOT).parts):
        continue
    text = path.read_text(encoding='utf-8')
    if '/legal.js' in text:
        continue
    if '</body>' in text:
        text = text.replace('</body>', SCRIPT + '</body>', 1)
    elif '</html>' in text:
        text = text.replace('</html>', SCRIPT + '</html>', 1)
    else:
        continue
    path.write_text(text, encoding='utf-8')
    changed.append(str(path.relative_to(ROOT)))

sitemap = ROOT / 'sitemap.xml'
if sitemap.exists():
    text = sitemap.read_text(encoding='utf-8')
    entries = []
    for url in ('https://matveyshemyakin.ru/privacy.html', 'https://matveyshemyakin.ru/en/privacy.html'):
        if url not in text:
            entries.append(f'<url><loc>{url}</loc><lastmod>2026-07-21</lastmod></url>')
    if entries and '</urlset>' in text:
        text = text.replace('</urlset>', ''.join(entries) + '</urlset>')
        sitemap.write_text(text, encoding='utf-8')
        changed.append('sitemap.xml')

print('\n'.join(changed) if changed else 'No changes required')
