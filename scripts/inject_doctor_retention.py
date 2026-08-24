from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_LINK = '<link rel="stylesheet" href="/for-doctors/doctor-retention.css?v=20260825-1">'
JS_SCRIPT = '<script defer src="/for-doctors/doctor-retention.js?v=20260825-1"></script>'
START = '<!-- doctor-retention:start -->'
END = '<!-- doctor-retention:end -->'
SERVICE_SLUGS = {'updates'}


def is_material_slug(slug: str) -> bool:
    value = str(slug or '').strip()
    return bool(value) and value not in SERVICE_SLUGS and not value.startswith('.')


def _assets(text: str) -> str:
    text = re.sub(
        r'<link\s+rel="stylesheet"\s+href="/for-doctors/doctor-retention\.css(?:\?v=[^"]*)?">',
        CSS_LINK,
        text,
    )
    if '/for-doctors/doctor-retention.css' not in text and '</head>' in text:
        text = text.replace('</head>', CSS_LINK + '</head>', 1)
    text = re.sub(
        r'<script\s+defer\s+src="/for-doctors/doctor-retention\.js(?:\?v=[^"]*)?"></script>',
        JS_SCRIPT,
        text,
    )
    if '/for-doctors/doctor-retention.js' not in text and '</body>' in text:
        text = text.replace('</body>', JS_SCRIPT + '</body>', 1)
    return text


def hub_shell(lang: str) -> str:
    en = str(lang or '').lower().startswith('en')
    if en:
        kicker = 'Your professional workspace'
        title = 'Professional workspace'
        summary = 'Choose topics to make this workspace more useful on your next visit.'
        all_updates = 'All updates'
        updates_url = '/en/for-doctors/updates/'
        telegram = 'Get updates in Telegram'
        topics = 'Your topics'
        continue_title = 'Continue working'
        saved = 'Saved'
        personal = 'For you'
    else:
        kicker = 'Ваше профессиональное пространство'
        title = 'Профессиональное рабочее пространство'
        summary = 'Выберите темы — при следующем визите здесь появятся обновления именно по вашим интересам.'
        all_updates = 'Все обновления'
        updates_url = '/for-doctors/updates/'
        telegram = 'Получать обновления в Telegram'
        topics = 'Ваши темы'
        continue_title = 'Продолжить работу'
        saved = 'Сохранённое'
        personal = 'Для вас'
    return (
        START
        + '<section class="doctor-workspace" id="doctor-workspace" aria-labelledby="doctor-workspace-title">'
        + '<div class="container">'
        + '<div class="doctor-workspace-head"><div>'
        + f'<p class="eyebrow">{kicker}</p>'
        + f'<h2 id="doctor-workspace-title">{title}</h2>'
        + f'<p class="doctor-workspace-summary" id="doctor-return-summary">{summary}</p>'
        + '</div>'
        + '<div class="doctor-workspace-actions">'
        + f'<a class="button secondary" href="{updates_url}">{all_updates}</a>'
        + f'<a class="button primary" href="https://t.me/DrShemMYu" target="_blank" rel="noopener noreferrer" data-doctor-telegram>{telegram}</a>'
        + '</div></div>'
        + '<div class="doctor-workspace-grid">'
        + f'<section class="doctor-workspace-panel wide"><h3>{topics}</h3><div class="doctor-topic-list" id="doctor-topic-list"></div></section>'
        + f'<section class="doctor-workspace-panel"><h3>{continue_title}</h3><div class="doctor-workspace-list" id="doctor-continue-list"></div></section>'
        + f'<section class="doctor-workspace-panel"><h3>{saved}</h3><div class="doctor-workspace-list" id="doctor-bookmark-list"></div></section>'
        + f'<section class="doctor-workspace-panel"><h3>{personal}</h3><div class="doctor-workspace-list" id="doctor-personal-list"></div></section>'
        + '</div></div></section>'
        + END
    )


def material_shell(lang: str) -> str:
    en = str(lang or '').lower().startswith('en')
    if en:
        tools_aria = 'Professional workspace tools'
        tools_copy = 'Keep this material in your professional workspace on this device.'
        save = 'Save'
        related = 'Related professional materials'
        telegram_copy = 'New and updated clinician materials are announced in the Telegram channel.'
        telegram = 'Get clinician updates'
    else:
        tools_aria = 'Инструменты профессионального пространства'
        tools_copy = 'Сохраните материал в своём профессиональном пространстве на этом устройстве.'
        save = 'Сохранить'
        related = 'Связанные профессиональные материалы'
        telegram_copy = 'Новые и обновлённые материалы для врачей публикуются в Telegram-канале.'
        telegram = 'Получать обновления'
    return (
        START
        + f'<section class="doctor-material-tools" id="doctor-material-tools" aria-label="{tools_aria}">'
        + '<div class="doctor-material-tools-row">'
        + f'<p class="doctor-material-tools-copy">{tools_copy}</p>'
        + f'<button class="doctor-bookmark-toggle" id="doctor-bookmark-toggle" type="button" aria-pressed="false">{save}</button>'
        + '</div></section>'
        + '<section class="doctor-related" aria-labelledby="doctor-related-title">'
        + f'<h2 id="doctor-related-title">{related}</h2>'
        + '<div class="doctor-workspace-list" id="doctor-related-list"></div>'
        + '</section>'
        + '<div class="doctor-material-telegram">'
        + f'<p>{telegram_copy}</p>'
        + f'<a class="button secondary" href="https://t.me/DrShemMYu" target="_blank" rel="noopener noreferrer" data-doctor-telegram>{telegram}</a>'
        + '</div>'
        + END
    )


def _replace_marker(text: str, shell: str) -> tuple[str, bool]:
    pattern = re.compile(re.escape(START) + r'.*?' + re.escape(END), re.S)
    if pattern.search(text):
        return pattern.sub(shell, text, count=1), True
    return text, False


def inject_hub(text: str, lang: str) -> str:
    text = _assets(text)
    shell = hub_shell(lang)
    text, replaced = _replace_marker(text, shell)
    if replaced:
        return text
    library = re.search(r'<section\s+class="library"(?=[\s>])', text)
    if library:
        return text[:library.start()] + shell + text[library.start():]
    if '</main>' in text:
        return text.replace('</main>', shell + '</main>', 1)
    return text


def inject_material(text: str, lang: str) -> str:
    text = _assets(text)
    shell = material_shell(lang)
    text, replaced = _replace_marker(text, shell)
    if replaced:
        return text
    if '</main>' in text:
        return text.replace('</main>', shell + '</main>', 1)
    return text


def main() -> None:
    changed: list[str] = []
    hubs = [
        (ROOT / 'for-doctors' / 'index.html', 'ru'),
        (ROOT / 'en' / 'for-doctors' / 'index.html', 'en'),
    ]
    for path, lang in hubs:
        if not path.exists():
            continue
        original = path.read_text(encoding='utf-8')
        updated = inject_hub(original, lang)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            changed.append(path.relative_to(ROOT).as_posix())

    for base, lang in ((ROOT / 'for-doctors', 'ru'), (ROOT / 'en' / 'for-doctors', 'en')):
        if not base.exists():
            continue
        for path in sorted(base.glob('*/index.html')):
            if not is_material_slug(path.parent.name):
                continue
            original = path.read_text(encoding='utf-8')
            updated = inject_material(original, lang)
            if updated != original:
                path.write_text(updated, encoding='utf-8')
                changed.append(path.relative_to(ROOT).as_posix())

    print('\n'.join(changed) if changed else 'No clinician retention injection changes required')


if __name__ == '__main__':
    main()
