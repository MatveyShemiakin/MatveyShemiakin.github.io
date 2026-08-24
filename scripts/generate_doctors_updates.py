from __future__ import annotations

import hashlib
import html
import json
import re
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FEED_PATH = ROOT / 'for-doctors' / 'updates.json'
MANIFEST_PATH = ROOT / 'for-doctors' / 'updates-manifest.json'
META_PATH = ROOT / 'for-doctors' / 'professional-meta.json'
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
TOPIC_RE = re.compile(r'^[a-z0-9-]+$')
SERVICE_SLUGS = {'updates'}


def _read(path: Path) -> str:
    return path.read_text(encoding='utf-8') if path.exists() else ''


def _strip_tags(value: str) -> str:
    value = re.sub(r'<[^>]+>', ' ', value, flags=re.S)
    return re.sub(r'\s+', ' ', html.unescape(value)).strip()


def _main_html(source: str) -> str:
    match = re.search(r'<main\b[^>]*>(.*?)</main\s*>', source, flags=re.I | re.S)
    if not match:
        return ''
    content = match.group(1)
    content = re.sub(r'<!--.*?-->', '', content, flags=re.S)
    content = re.sub(r'<(?:script|style|noscript|template)\b[^>]*>.*?</(?:script|style|noscript|template)\s*>', '', content, flags=re.I | re.S)
    for marker in ('site-next-material', 'patient-consultation-cta', 'doctor-retention'):
        content = re.sub(
            rf'<!--\s*{re.escape(marker)}:start\s*-->.*?<!--\s*{re.escape(marker)}:end\s*-->',
            '',
            content,
            flags=re.I | re.S,
        )
    content = re.sub(r'>\s+<', '><', content)
    content = re.sub(r'\s+', ' ', content).strip()
    return content


def _fingerprint(source: str) -> str:
    canonical = _main_html(source)
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest() if canonical else ''


def _first_tag_text(source: str, tag: str) -> str:
    match = re.search(rf'<{tag}\b[^>]*>(.*?)</{tag}\s*>', source, flags=re.I | re.S)
    return _strip_tags(match.group(1)) if match else ''


def _meta_description(source: str) -> str:
    for match in re.finditer(r'<meta\b[^>]*>', source, flags=re.I | re.S):
        tag = match.group(0)
        attrs = {
            key.lower(): html.unescape(value)
            for key, _, value in re.findall(r'([\w:-]+)\s*=\s*(["\'])(.*?)\2', tag, flags=re.S)
        }
        if attrs.get('name', '').lower() == 'description':
            return re.sub(r'\s+', ' ', attrs.get('content', '')).strip()
    return ''


def _document_date(source: str) -> str:
    values = re.findall(r'["\'](?:dateModified|lastReviewed)["\']\s*:\s*["\'](\d{4}-\d{2}-\d{2})["\']', source)
    for value in values:
        if DATE_RE.match(value):
            return value
    return ''


def _material_metadata(source: str, fallback_title: str) -> dict[str, str]:
    return {
        'title': _first_tag_text(source, 'h1') or _first_tag_text(source, 'title') or fallback_title,
        'description': _meta_description(source),
        'date': _document_date(source),
    }


def _load_manifest(root: Path) -> dict[str, Any]:
    path = root / 'for-doctors' / 'updates-manifest.json'
    if not path.exists():
        return {'version': 1, 'materials': {}}
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return {'version': 1, 'materials': {}}
    if not isinstance(value, dict) or not isinstance(value.get('materials'), dict):
        return {'version': 1, 'materials': {}}
    return {'version': 1, 'materials': value['materials']}


def _load_professional_meta(root: Path) -> dict[str, Any]:
    path = root / 'for-doctors' / 'professional-meta.json'
    if not path.exists():
        return {}
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _topics_for(meta: dict[str, Any], slug: str) -> list[str]:
    entry = meta.get(slug)
    if not isinstance(entry, dict) or not isinstance(entry.get('topics'), list):
        return []
    result: list[str] = []
    seen: set[str] = set()
    for raw in entry['topics']:
        topic = str(raw or '').strip().lower()
        if not topic or not TOPIC_RE.match(topic) or topic in seen:
            continue
        seen.add(topic)
        result.append(topic)
    return result


def _discover_slugs(root: Path) -> list[str]:
    base = root / 'for-doctors'
    if not base.exists():
        return []
    return sorted(
        path.parent.name
        for path in base.glob('*/index.html')
        if path.parent.name
        and not path.parent.name.startswith('.')
        and path.parent.name not in SERVICE_SLUGS
    )


def build_updates(root: Path, today: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not DATE_RE.match(today):
        raise ValueError('today must be YYYY-MM-DD')

    previous = _load_manifest(root)
    previous_materials = previous.get('materials', {})
    professional_meta = _load_professional_meta(root)
    next_materials: dict[str, Any] = {}
    feed: list[dict[str, Any]] = []

    for slug in _discover_slugs(root):
        ru_path = root / 'for-doctors' / slug / 'index.html'
        en_path = root / 'en' / 'for-doctors' / slug / 'index.html'
        ru_source = _read(ru_path)
        en_source = _read(en_path)
        ru_fp = _fingerprint(ru_source)
        en_fp = _fingerprint(en_source)
        if not ru_fp and not en_fp:
            continue

        combined = hashlib.sha256(f'{ru_fp}\n{en_fp}'.encode('utf-8')).hexdigest()
        ru_meta = _material_metadata(ru_source, slug)
        en_meta = _material_metadata(en_source, ru_meta['title'])
        source_dates = sorted(value for value in (ru_meta['date'], en_meta['date']) if DATE_RE.match(value or ''))
        initial_date = source_dates[0] if source_dates else today

        prior = previous_materials.get(slug) if isinstance(previous_materials.get(slug), dict) else None
        if not prior:
            state = {
                'fingerprint': combined,
                'published': initial_date,
                'updated': initial_date,
                'revision': 1,
                'kind': 'new',
            }
        elif prior.get('fingerprint') != combined:
            state = {
                'fingerprint': combined,
                'published': prior.get('published') if DATE_RE.match(str(prior.get('published', ''))) else initial_date,
                'updated': today,
                'revision': max(1, int(prior.get('revision') or 1)) + 1,
                'kind': 'updated',
            }
        else:
            state = {
                'fingerprint': combined,
                'published': prior.get('published') if DATE_RE.match(str(prior.get('published', ''))) else initial_date,
                'updated': prior.get('updated') if DATE_RE.match(str(prior.get('updated', ''))) else initial_date,
                'revision': max(1, int(prior.get('revision') or 1)),
                'kind': prior.get('kind') if prior.get('kind') in {'new', 'updated'} else 'new',
            }

        next_materials[slug] = state
        revision = state['revision']
        feed.append({
            'id': slug,
            'event_id': f'{slug}:{revision}',
            'published': state['published'],
            'updated': state['updated'],
            'revision': revision,
            'kind': state['kind'],
            'title': ru_meta['title'] or en_meta['title'] or slug,
            'title_en': en_meta['title'] or ru_meta['title'] or slug,
            'description': ru_meta['description'],
            'description_en': en_meta['description'] or ru_meta['description'],
            'url': f'/for-doctors/{slug}/' if ru_source else '',
            'url_en': f'/en/for-doctors/{slug}/' if en_source else '',
            'topics': _topics_for(professional_meta, slug),
        })

    feed.sort(key=lambda item: (item['updated'], item['id']), reverse=True)
    return feed, {'version': 1, 'materials': next_materials}


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    today = date.today().isoformat()
    feed, manifest = build_updates(ROOT, today)
    _write_json(FEED_PATH, feed)
    _write_json(MANIFEST_PATH, manifest)
    print(f'Doctor updates: {len(feed)} materials')


if __name__ == '__main__':
    main()
