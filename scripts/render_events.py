#!/usr/bin/env python3
"""Publish the existing event catalogue as visible HTML, with JS enhancement.

Run after editing either locale catalogue. No network calls or event-date
inference: dates, locations and links come directly from the checked-in JSON.
"""
from __future__ import annotations

import argparse
import hashlib
from datetime import date, datetime
from html import escape
import json
from pathlib import Path
import re
from zoneinfo import ZoneInfo

from site_header import Elements

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://matveyshemyakin.ru'
MONTHS = {
    'ru': ('января февраля марта апреля мая июня июля августа сентября октября ноября декабря').split(),
    'en': ('January February March April May June July August September October November December').split(),
}


def inner(text: str, element_id: str, content: str) -> str:
    node = next(n for n in Elements(text).nodes if n['attrs'].get('id') == element_id)
    return text[:node['open_end']] + content + text[node['close_start']:]


def day(value: str) -> date:
    return date.fromisoformat(value[:10])


def formatted(value: str, lang: str) -> str:
    d = day(value)
    return f'{d.day} {MONTHS[lang][d.month - 1]} {d.year}'


def time_tag(value: str, lang: str) -> str:
    # Date-only output does not invent a closing time or translate a timezone.
    return f'<time datetime="{escape(value[:10], quote=True)}">{formatted(value, lang)}</time>'


def official_link(url: str, label: str, css: str = 'card-btn') -> str:
    if not url.startswith('https://'):
        raise ValueError('Official event links must use HTTPS')
    return f'<a class="{css}" href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{label}</a>'


def card(event: dict, lang: str, as_of: date) -> str:
    en = lang == 'en'
    dates = time_tag(event['start'], lang)
    if event['start'] != event['end']:
        dates += ' – ' + time_tag(event['end'], lang)
    deadlines = ''.join(
        '<div class="event-deadline"><span>' + escape(d['label']) + '</span><strong>'
        + time_tag(d['date'], lang) + '</strong></div>'
        for d in sorted(event['deadlines'], key=lambda d: d['date']) if day(d['date']) >= as_of
    )
    logo = ''
    if event.get('logo'):
        logo = '<div class="event-logo-frame"><img class="event-logo" src="' + escape(event['logo'], quote=True) + '" alt="' + escape(event.get('logoAlt') or event['title'], quote=True) + '" loading="lazy" referrerpolicy="no-referrer"></div>'
    return (
        '<article class="event-card">'
        f'<div class="event-head"><div class="event-datebox"><span class="event-day">{day(event["start"]).day}</span>'
        f'<span class="event-month">{formatted(event["start"], lang).split(" ", 1)[1]}</span></div></div>'
        + logo + f'<div class="event-org">{escape(event["org"])}</div>'
        f'<h3>{escape(event["title"])}</h3>'
        f'<div class="event-location"><span>{escape(event["city"])}</span><span>{escape(event["country"])}</span><span>{escape(event["mode"])}</span></div>'
        f'<p class="dialog-description">{dates}</p>'
        f'<p class="dialog-description">{escape(event["description"])}</p>'
        '<div class="tag-row">' + ''.join(f'<span class="tag">{escape(c)}</span>' for c in event['categories']) + '</div>'
        + (f'<div class="event-deadlines">{deadlines}</div>' if deadlines else '')
        + '<div class="event-actions">' + official_link(event['official'], 'Official website ↗' if en else 'Официальный сайт ↗') + '</div>'
        + f'<div class="source-line"><span>{"Verified" if en else "Проверено"} {escape(event["verified"])}</span></div></article>'
    )


def render_page(text: str, dataset: dict, lang: str, as_of: date) -> str:
    en = lang == 'en'
    upcoming = sorted((e for e in dataset['events'] if day(e['end']) >= as_of), key=lambda e: e['start'])
    deadlines = sorted((d | {'event': e} for e in upcoming for d in e['deadlines'] if day(d['date']) >= as_of), key=lambda d: d['date'])
    cards = '\n'.join(card(e, lang, as_of) for e in upcoming)
    empty = 'No upcoming events yet' if en else 'Ближайших мероприятий пока нет'
    text = inner(text, 'events-grid', cards or f'<div class="empty-state"><strong>{empty}</strong></div>')
    if 'data-events-prerendered=' not in text:
        text = text.replace('id="events-grid"', 'id="events-grid" data-events-prerendered="true"', 1)
    for field, count in (
        ('stat-events', len(upcoming)),
        ('stat-open', sum(bool(e['submissionOpen']) for e in upcoming)),
        ('stat-deadlines', sum((day(d['date']) - as_of).days <= 30 for d in deadlines)),
    ):
        text = inner(text, field, str(count))
    text = inner(text, 'results-meta', f'{"Found" if en else "Найдено"}: {len(upcoming)}')
    radar = ''.join(
        '<article class="deadline-card level-ok"><h3>' + escape(d['event']['title']) + ' · ' + escape(d['label']) + '</h3>'
        '<div class="deadline-date">' + time_tag(d['date'], lang) + '</div><div class="deadline-actions">'
        + official_link(d['url'], 'Official source ↗' if en else 'Официальный источник ↗', 'small-btn primary') + '</div></article>'
        for d in deadlines[:6]
    )
    text = inner(text, 'radar-list', radar or '<div class="empty-state"><strong>' + ('No upcoming deadlines' if en else 'Ближайших дедлайнов нет') + '</strong></div>')
    author = '<p class="hero-lead" data-events-author><small>' + (
        'Matvey Yuryevich Shemyakin · Calendar for ophthalmologists'
        if en else 'Матвей Юрьевич Шемякин · Календарь для офтальмологов'
    ) + '</small></p>'
    if 'data-events-author' in text:
        text = re.sub(r'<p class="(?:sync-status|hero-lead)" data-events-author>.*?</p>', lambda _: author, text, count=1)
    else:
        text = re.sub(r'(<p class="hero-lead">.*?</p>)', lambda m: m[0] + author, text, count=1)
    return text


def sync(root: Path, as_of: date, check: bool = False) -> list[str]:
    changes = []
    sitemap_path = root / 'sitemap.xml'
    sitemap = sitemap_path.read_text()
    for lang, prefix in (('ru', ''), ('en', 'en/')):
        relative = f'{prefix}for-doctors/events/index.html'
        path = root / relative
        original = path.read_text()
        dataset = json.loads((root / f'assets/data/ophthalmology-events.{lang}.json').read_text())
        rendered = render_page(original, dataset, lang, as_of)
        for script in ('events', 'globe', 'satellite'):
            asset = f'/assets/events/{script}.js'
            version = hashlib.sha256((root / asset.lstrip('/')).read_bytes()).hexdigest()[:12]
            rendered = re.sub('(' + re.escape(asset) + r')(?:\?v=[^"\s]+)?', lambda m: m[1] + '?v=' + version, rendered)
        analytics_version = hashlib.sha256((root / 'analytics.js').read_bytes()).hexdigest()[:12]
        rendered = re.sub(r'(/analytics\.js)(?:\?v=[^"\s]+)?', lambda m: m[1] + '?v=' + analytics_version, rendered)
        if rendered == original:
            continue
        changes.append(relative)
        url = HOST + '/' + relative.removesuffix('index.html')
        pattern = r'(<loc>' + re.escape(url) + r'</loc>\s*<lastmod>)[^<]*(</lastmod>)'
        sitemap, count = re.subn(pattern, lambda m: m[1] + as_of.isoformat() + m[2], sitemap)
        if count != 1:
            raise ValueError(f'Expected one sitemap record for {url}')
        if not check:
            path.write_text(rendered)
    if sitemap != sitemap_path.read_text():
        changes.append('sitemap.xml')
        if not check:
            sitemap_path.write_text(sitemap)
    return changes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--date', type=date.fromisoformat)
    args = parser.parse_args()
    as_of = args.date or datetime.now(ZoneInfo('Europe/Moscow')).date()
    changes = sync(ROOT, as_of, args.check)
    print(('Stale' if args.check else 'Updated') + ': ' + (', '.join(changes) or 'none'))
    return int(args.check and bool(changes))


if __name__ == '__main__':
    raise SystemExit(main())
