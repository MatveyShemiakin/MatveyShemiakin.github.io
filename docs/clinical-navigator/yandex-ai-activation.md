# Активация реальной модели Yandex AI Studio

Документ относится к закрытому vertical slice `preview/clinical-ai/` и функции `clinical-navigator-api`.

## 1. Сервисный аккаунт

В папке `clinical-navigator-dev` создать сервисный аккаунт:

```text
clinical-navigator-ai
```

Назначить ему только роль:

```text
ai.languageModels.user
```

Не назначать роли editor/admin.

## 2. API-ключ

У сервисного аккаунта создать API-ключ со scope:

```text
yc.ai.languageModels.execute
```

Рекомендуемый срок действия для закрытого теста: 90 дней. Секрет показывается один раз. Не сохранять его в GitHub, браузерном JavaScript, документации или сообщениях.

## 3. Переменные Cloud Function

В редакторе версии функции установить:

```text
AI_PROVIDER=yandex
YANDEX_FOLDER_ID=<ID папки clinical-navigator-dev>
YANDEX_MODEL=yandexgpt/latest
YANDEX_API_KEY=<секрет API-ключа>
ALLOWED_ORIGINS=https://raw.githack.com,https://matveyshemyakin.ru
ALLOW_DRAFT_CLINICAL_OPTIONS=true
```

Backend сам преобразует значение `yandexgpt/latest` в полный URI:

```text
gpt://<folder-id>/yandexgpt/latest
```

Полный URI также можно сразу указать в `YANDEX_MODEL`.

Backend сохраняет совместимость с OpenAI и другими OpenAI-compatible провайдерами.

## 4. Ресурсы функции

Для двух последовательных обращений к модели:

```text
Runtime: Node.js 22
Entry point: index.handler
Timeout: 90 seconds
Memory: 256 MB
```

10 секунд недостаточно надёжны для полного цикла `extract facts → retrieve evidence → generate options`.

## 5. Ожидаемый ответ

После сохранения новой версии preview должен показывать:

```text
Провайдер: yandex
```

Полный ответ `analyze_case` содержит:

- `recognized_facts`;
- `missing_questions`;
- `diagnostic_options` (2–5);
- `management_options` в authoring mode;
- `urgency`;
- `physician_selection_required: true`;
- `final_decision_owner: physician`.

Ни один вариант не может иметь `selected: true` до действия врача.

## 6. Контрольный случай

```text
Женщина 34 лет. Острый односторонний передний увеит: боль, светобоязнь, перикорнеальная инъекция, фибрин, клетки 3+. В анамнезе HLA-B27-ассоциированный артрит. ВГД 18 мм рт. ст., гипопиона нет, задний отрезок без патологии.
```

Ожидается:

- HLA-B27-ассоциированный передний увеит среди ведущих вариантов;
- боль, светобоязнь, латеральность, клетки, ВГД, фибрин и HLA-B27 не задаются повторно;
- срочность не должна быть автоматически повышена из-за отрицания гипопиона;
- врач получает несколько вариантов и самостоятельно выбирает рабочую гипотезу;
- лечебная тактика сопровождается evidence IDs и пометкой authoring mode.

## 7. Откат

При ошибках модели вернуть:

```text
AI_PROVIDER=mock
```

Код и интерфейс менять не требуется. Не удалять предыдущую активную версию функции до успешной проверки новой.
