# Активация реальной модели Yandex AI Studio

Документ относится к закрытому vertical slice `preview/clinical-ai/` и функции `clinical-navigator-api`.

## Текущая схема

Функция использует прикреплённый сервисный аккаунт `clinical-navigator-ai` и временный IAM-токен из контекста выполнения. Постоянный API-ключ не требуется и не должен храниться в переменных окружения.

## Сервисный аккаунт

Сервисный аккаунт:

```text
clinical-navigator-ai
```

Роль каталога:

```text
ai.languageModels.user
```

Не назначать роли editor/admin.

## Переменные Cloud Function

```text
AI_PROVIDER=yandex
YANDEX_FOLDER_ID=b1g55lebko782ade6ati
YANDEX_MODEL=yandexgpt/latest
ALLOWED_ORIGINS=https://raw.githack.com,https://matveyshemyakin.ru
ALLOW_DRAFT_CLINICAL_OPTIONS=true
```

`YANDEX_API_KEY` не используется.

## Ресурсы функции

```text
Runtime: Node.js 22
Entry point: index.handler
Timeout: 90 seconds
Memory: 256 MB
Service account: clinical-navigator-ai
```

## Автоматическая проверка

Preview поддерживает параметр:

```text
?autotest=1
```

Он автоматически подставляет контрольный HLA-B27-кейс и запускает `analyze_case`. Успешный ответ должен показывать:

```text
Провайдер: yandex
```

При ошибке интерфейс выводит безопасное сообщение backend без зависания.

## Ожидаемый ответ

- `recognized_facts`;
- `missing_questions`;
- `diagnostic_options` (2–5);
- `management_options` в authoring mode;
- `urgency`;
- `physician_selection_required: true`;
- `final_decision_owner: physician`.

Ни один вариант не может иметь `selected: true` до действия врача.

## Контрольный случай

```text
Женщина 34 лет. Острый односторонний передний увеит: боль, светобоязнь, перикорнеальная инъекция, фибрин, клетки 3+. В анамнезе HLA-B27-ассоциированный артрит. ВГД 18 мм рт. ст., гипопиона нет, задний отрезок без патологии.
```

Ожидается:

- HLA-B27-ассоциированный передний увеит среди ведущих вариантов;
- боль, светобоязнь, латеральность, клетки, ВГД, фибрин и HLA-B27 не задаются повторно;
- срочность не повышается только из-за отрицания гипопиона;
- врач получает несколько вариантов и самостоятельно выбирает рабочую гипотезу;
- лечебная тактика сопровождается evidence IDs и пометкой authoring mode.

## Откат

При ошибках модели вернуть:

```text
AI_PROVIDER=mock
```

Код и интерфейс менять не требуется. Не удалять предыдущую активную версию функции до успешной проверки новой.
