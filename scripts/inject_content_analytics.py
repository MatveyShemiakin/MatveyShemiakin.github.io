from pathlib import Path
from html import unescape
import json
import re

ROOT = Path(__file__).resolve().parents[1]
MARKER = 'data-yandex-content-analytics="true"'
GENERATED_RE = re.compile(
    r'<script\s+type=["\']application/ld\+json["\']\s+data-yandex-content-analytics=["\']true["\']>.*?</script>',
    flags=re.IGNORECASE | re.DOTALL,
)

EXCLUDED = {
    'patients/index.html',
    'en/patients/index.html',
    'for-doctors/index.html',
    'en/for-doctors/index.html',
    'for-doctors/professional-use.html',
    'en/for-doctors/professional-use.html',
}

CATARACT_SLUGS = {
    'cataract', 'before-surgery', 'surgery-day', 'recovery',
    'daily-life', 'eye-drops', 'glasses',
}

def clean_text(value: str) -> str:
    value = re.sub(r'<script\b[^>]*>.*?</script>', ' ', value, flags=re.I | re.S)
    value = re.sub(r'<style\b[^>]*>.*?</style>', ' ', value, flags=re.I | re.S)
    value = re.sub(r'<[^>]+>', ' ', value)
    return re.sub(r'\s+', ' ', unescape(value)).strip()

def attr_value(tag: str, name: str):
    match = re.search(rf'\b{name}\s*=\s*["\']([^"\']+)["\']', tag, flags=re.I)
    return unescape(match.group(1)).strip() if match else None

def find_canonical(text: str):
    for match in re.finditer(r'<link\b[^>]*>', text, flags=re.I):
        tag = match.group(0)
        if (attr_value(tag, 'rel') or '').lower() == 'canonical':
            return attr_value(tag, 'href')
    return None

def find_language(text: str, relative: str):
    match = re.search(r'<html\b[^>]*>', text, flags=re.I)
    lang = attr_value(match.group(0), 'lang') if match else None
    return (lang or ('en' if relative.startswith('en/') else 'ru')).lower()

def find_headline(text: str):
    match = re.search(r'<h1\b[^>]*>(.*?)</h1>', text, flags=re.I | re.S)
    if match:
        return clean_text(match.group(1))
    match = re.search(r'<title\b[^>]*>(.*?)</title>', text, flags=re.I | re.S)
    return clean_text(match.group(1)) if match else None

def find_date(text: str, key: str):
    match = re.search(rf'"{re.escape(key)}"\s*:\s*"([^"]+)"', text)
    return match.group(1) if match else None

def eligible(relative: str):
    if relative in EXCLUDED:
        return False
    return (
        relative.startswith('patients/')
        or relative.startswith('en/patients/')
        or relative.startswith('for-doctors/')
        or relative.startswith('en/for-doctors/')
    )

def topic_meta(relative: str, lang: str, canonical: str):
    english = lang.startswith('en')
    parts = relative.split('/')
    slug = parts[-2] if parts[-1] == 'index.html' and len(parts) > 1 else Path(relative).stem

    if '/patients/' in f'/{relative}':
        root_name = 'For patients' if english else 'Пациентам'
        root_url = 'https://matveyshemyakin.ru/en/patients/' if english else 'https://matveyshemyakin.ru/patients/'
        if slug in CATARACT_SLUGS:
            topic = 'Cataract' if english else 'Катаракта'
            topic_url = 'https://matveyshemyakin.ru/en/patients/cataract/' if english else 'https://matveyshemyakin.ru/patients/cataract/'
        elif slug == 'iol-dislocation':
            topic = 'Intraocular lens dislocation' if english else 'Дислокация ИОЛ'
            topic_url = 'https://matveyshemyakin.ru/en/patients/iol-dislocation/' if english else 'https://matveyshemyakin.ru/patients/iol-dislocation/'
        else:
            topic = slug.replace('-', ' ').strip().title()
            topic_url = canonical
    else:
        root_name = 'For doctors' if english else 'Для врачей'
        root_url = 'https://matveyshemyakin.ru/en/for-doctors/' if english else 'https://matveyshemyakin.ru/for-doctors/'
        known = {
            'bacterial-keratitis': 'Bacterial keratitis' if english else 'Бактериальный кератит',
            'penetrating-keratoplasty': 'Penetrating keratoplasty' if english else 'Сквозная кератопластика',
        }
        topic = known.get(slug, slug.replace('-', ' ').strip().title())
        topic_url = canonical

    about = [
        {'@type': 'MedicalCondition', 'name': topic},
        {'@type': 'Thing', 'name': 'Ophthalmology' if english else 'Офтальмология'},
    ]
    return root_name, root_url, topic, topic_url, about

def ensure_main_anchor(text: str):
    match = re.search(r'<main\b[^>]*>', text, flags=re.I)
    if not match:
        return text, None
    tag = match.group(0)
    existing_id = attr_value(tag, 'id')
    if existing_id:
        return text, existing_id
    fragment = 'content-material'
    replacement = tag[:-1] + f' id="{fragment}">'
    return text[:match.start()] + replacement + text[match.end():], fragment

def generated_markup(data):
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return f'<script type="application/ld+json" {MARKER}>{payload}</script>'

changed = []
for path in ROOT.rglob('*.html'):
    relative = path.relative_to(ROOT)
    if any(part.startswith('.') for part in relative.parts):
        continue

    relative_posix = relative.as_posix()
    if not eligible(relative_posix):
        continue

    text = path.read_text(encoding='utf-8')
    original = text
    text = GENERATED_RE.sub('', text)

    canonical = find_canonical(text)
    headline = find_headline(text)
    if not canonical or not headline:
        continue

    text, fragment = ensure_main_anchor(text)
    if not fragment:
        continue

    lang = find_language(text, relative_posix)
    english = lang.startswith('en')
    material_url = canonical.split('#', 1)[0] + '#' + fragment
    root_name, root_url, topic, topic_url, about = topic_meta(relative_posix, lang, canonical)

    breadcrumbs = {
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {
                '@type': 'ListItem',
                'position': 1,
                'item': {'@id': root_url, 'name': root_name},
            },
            {
                '@type': 'ListItem',
                'position': 2,
                'item': {'@id': topic_url, 'name': topic},
            },
        ],
    }
    article = {
        '@type': 'Article',
        '@id': material_url,
        'url': material_url,
        'headline': headline,
        'mainEntityOfPage': canonical,
        'inLanguage': lang,
        'author': {
            '@type': 'Person',
            '@id': 'https://matveyshemyakin.ru/#person',
            'name': 'Matvey Yuryevich Shemyakin' if english else 'Матвей Юрьевич Шемякин',
        },
        'about': about,
    }

    date_published = find_date(text, 'datePublished')
    date_modified = find_date(text, 'dateModified')
    if date_published:
        article['datePublished'] = date_published
    if date_modified:
        article['dateModified'] = date_modified

    graph = {
        '@context': 'https://schema.org',
        '@graph': [breadcrumbs, article],
    }
    markup = generated_markup(graph)

    analytics_match = re.search(
        r'<script\s+src=["\']/analytics\.js(?:\?v=[^"\']*)?["\']\s*></script>',
        text,
        flags=re.I,
    )
    if analytics_match:
        insert_at = analytics_match.end()
    else:
        head_match = re.search(r'<head(?:\s[^>]*)?>', text, flags=re.I)
        if not head_match:
            continue
        insert_at = head_match.end()

    text = text[:insert_at] + markup + text[insert_at:]

    if text != original:
        path.write_text(text, encoding='utf-8')
        changed.append(relative_posix)

print('\n'.join(changed) if changed else 'No content analytics changes required')
