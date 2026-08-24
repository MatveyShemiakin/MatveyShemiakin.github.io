from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FEED = ROOT / 'for-doctors' / 'updates.json'
DEFAULT_CHAT_ID = '@DrShemMYu'
SITE_ORIGIN = 'https://matveyshemyakin.ru'

TOPIC_CONTEXT = {
    'cornea': (
        'Почему решил этим заняться: в работе с патологией роговицы особенно важно быстро отделять ситуацию, которую можно спокойно вести амбулаторно, от той, где промедление меняет прогноз.',
        'Думаю, материал будет полезен коллегам-офтальмологам, которые наблюдают пациентов с заболеваниями роговицы и после кератопластики.'
    ),
    'drugs': (
        'Почему это важно: лекарственные схемы легко превращаются в набор привычных назначений, поэтому мне хочется держать их привязанными к клинической задаче и актуальным источникам.',
        'В первую очередь это для коллег, которым нужен быстрый практический ориентир по терапии и контролю ответа.'
    ),
    'research': (
        'Почему вернулся к этой теме: публикаций становится всё больше, а времени на ручной поиск по разным базам у врача обычно не становится больше.',
        'Хочу, чтобы коллегам было проще быстро находить исследования, которые действительно могут пригодиться в клинической работе.'
    ),
    'events': (
        'Почему это важно: хорошие конференции, дедлайны и образовательные события легко пропустить, особенно если следить сразу за несколькими регионами и профессиональными сообществами.',
        'Собираю это прежде всего для коллег, которые хотят заранее планировать конференции, обучение и подачу научных работ.'
    ),
    'cataract': (
        'Почему решил это разобрать: в хирургии катаракты многие решения выглядят очевидными только до тех пор, пока не появляется нестандартная клиническая ситуация.',
        'Материал рассчитан на коллег, которым нужен практический ориентир для предоперационного планирования и хирургической тактики.'
    ),
    'iol': (
        'Почему это важно: вопросы положения, фиксации и замены ИОЛ часто требуют не одного универсального решения, а последовательной оценки конкретной ситуации.',
        'Будет полезно коллегам, которые ведут пациентов с осложнёнными случаями ИОЛ и планируют хирургическую тактику.'
    ),
    'glaucoma': (
        'Почему решил вернуться к теме: при глаукоме особенно легко потерять время между формально стабильными цифрами и реальным прогрессированием заболевания.',
        'Материал ориентирован на коллег, которым нужен практический алгоритм наблюдения и принятия решений.'
    ),
    'retina': (
        'Почему это важно: в патологии сетчатки сроки, динамика и правильная маршрутизация часто напрямую влияют на функциональный результат.',
        'Будет полезно коллегам, которые принимают решение о наблюдении, дообследовании или направлении на хирургическое лечение.'
    ),
}

TOPIC_HASHTAGS = {
    'cornea': '#роговица',
    'drugs': '#фармакотерапия',
    'research': '#наука',
    'events': '#конференции',
    'cataract': '#катаракта',
    'iol': '#ИОЛ',
    'glaucoma': '#глаукома',
    'retina': '#ретина',
    'surgery': '#офтальмохирургия',
}


def _event_id(item: Any) -> str:
    return str(item.get('event_id', '')).strip() if isinstance(item, dict) else ''


def detect_new_events(previous: Any, current: Any) -> list[dict[str, Any]]:
    previous_ids = {
        _event_id(item)
        for item in previous if isinstance(previous, list)
        if _event_id(item)
    }
    result: list[dict[str, Any]] = []
    if not isinstance(current, list):
        return result
    for item in current:
        if not isinstance(item, dict):
            continue
        event_id = _event_id(item)
        if not event_id or event_id in previous_ids:
            continue
        result.append(item)
    return result


def absolute_url(value: str) -> str:
    path = str(value or '').strip()
    if not path.startswith('/for-doctors/'):
        raise ValueError('Telegram clinician update URL must start with /for-doctors/')
    return SITE_ORIGIN + path


def _topics(item: dict[str, Any]) -> list[str]:
    raw = item.get('topics', [])
    if not isinstance(raw, list):
        return []
    result: list[str] = []
    for value in raw:
        topic = str(value or '').strip().lower()
        if topic and topic not in result:
            result.append(topic)
    return result


def _context_for(topics: list[str]) -> tuple[str, str]:
    for topic in topics:
        if topic in TOPIC_CONTEXT:
            return TOPIC_CONTEXT[topic]
    return (
        'Почему решил это сделать: мне хочется, чтобы раздел «Для врачей» был не архивом текстов, а рабочим инструментом, к которому можно возвращаться в реальной практике.',
        'В первую очередь делаю такие материалы для коллег-офтальмологов и ординаторов, которым нужен быстрый и понятный профессиональный ориентир.'
    )


def _hashtags_for(topics: list[str]) -> str:
    tags = ['#офтальмология']
    for topic in topics:
        tag = TOPIC_HASHTAGS.get(topic)
        if tag and tag not in tags:
            tags.append(tag)
        if len(tags) >= 4:
            break
    return ' '.join(tags)


def format_message(item: dict[str, Any]) -> str:
    if not isinstance(item, dict):
        raise ValueError('Telegram update must be an object')

    kind = str(item.get('kind', '')).strip()
    title = str(item.get('title', '')).strip()
    description = str(item.get('description', '')).strip()
    url = absolute_url(str(item.get('url', '')))
    topics = _topics(item)
    if not title:
        raise ValueError('Telegram clinician update requires title')

    reason, audience = _context_for(topics)
    if kind == 'updated':
        opening = f'Сегодня вернулся к материалу «{title}» и немного его доработал.'
    else:
        opening = f'Сегодня работал над новым материалом «{title}».'

    parts = [
        'Доброго времени суток! 👋',
        '',
        opening,
        '',
        reason,
        '',
        audience,
    ]

    if description:
        concise = description if len(description) <= 700 else description[:697].rstrip() + '…'
        parts.extend(['', '📌 Что получилось / что изменилось:', concise])

    parts.extend([
        '',
        'Постепенно продолжаю собирать на сайте практическую офтальмологическую базу — без лишней теории, с акцентом на то, что можно использовать в работе. 👁️',
        '',
        f'🔗 Материал: {url}',
        '',
        _hashtags_for(topics),
    ])

    return '\n'.join(parts)


def publish(token: str, chat_id: str, text: str, *, timeout: int = 20) -> dict[str, Any]:
    token = str(token or '').strip()
    chat_id = str(chat_id or '').strip()
    if not token:
        raise ValueError('Telegram bot token is required')
    if not chat_id:
        raise ValueError('Telegram chat id is required')
    payload = json.dumps({
        'chat_id': chat_id,
        'text': text,
        'disable_web_page_preview': False,
    }, ensure_ascii=False).encode('utf-8')
    request = urllib.request.Request(
        f'https://api.telegram.org/bot{token}/sendMessage',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode('utf-8')
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Telegram API HTTP {exc.code}: {detail}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'Telegram API unavailable: {exc.reason}') from exc
    result = json.loads(body)
    if not isinstance(result, dict) or result.get('ok') is not True:
        raise RuntimeError(f'Telegram API rejected message: {result!r}')
    return result


def _load_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return fallback


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Publish new clinician feed revisions to Telegram.')
    parser.add_argument('--previous', type=Path)
    parser.add_argument('--current', type=Path, default=DEFAULT_FEED)
    parser.add_argument('--chat-id', default=os.environ.get('TELEGRAM_CHAT_ID') or DEFAULT_CHAT_ID)
    args = parser.parse_args(argv)

    token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    if not token:
        print('TELEGRAM_BOT_TOKEN is not configured; Telegram publication skipped.')
        return 0

    current = _load_json(args.current, [])
    previous = _load_json(args.previous, []) if args.previous else []
    events = detect_new_events(previous, current)
    if not events:
        print('No new clinician event_id values to publish.')
        return 0

    for item in events:
        event_id = _event_id(item)
        publish(token, args.chat_id, format_message(item))
        print(f'Published clinician update: {event_id}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
