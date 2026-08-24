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


def format_message(item: dict[str, Any]) -> str:
    if not isinstance(item, dict):
        raise ValueError('Telegram update must be an object')
    kind = str(item.get('kind', '')).strip()
    label = 'Обновление для врачей' if kind == 'updated' else 'Новый материал для врачей'
    title = str(item.get('title', '')).strip()
    description = str(item.get('description', '')).strip()
    url = absolute_url(str(item.get('url', '')))
    if not title:
        raise ValueError('Telegram clinician update requires title')
    parts = [label, '', title]
    if description:
        parts.extend(['', description])
    parts.extend(['', url])
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
