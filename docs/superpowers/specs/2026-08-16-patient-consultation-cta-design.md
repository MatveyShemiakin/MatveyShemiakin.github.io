# CTA очной консультации для пациентских страниц

## Цель
Сделать единый по смыслу CTA очной консультации на страницах глаукомы, катаракты и дислокации ИОЛ в RU/EN версиях.

## Поведение
- CTA располагается непосредственно перед блоком автора.
- Кнопка ведёт на личный Telegram: `https://t.me/ShemMYu`.
- Ссылка открывается в новой вкладке и имеет `rel="noopener"`.
- На каждой патологии вопрос и пояснение индивидуальны.
- Срочные симптомы не должны направляться в Telegram; существующие блоки красных флагов сохраняются без изменений.
- Ссылка помечается `data-analytics-cta`, чтобы существующий `analytics.js` отправлял `cta_click`; Telegram-переход также учитывается как `telegram_click`.

## Тексты RU
### Глаукома
**Очная консультация**

**Нужна индивидуальная оценка тактики лечения?**

Решение зависит от типа глаукомы, стадии заболевания, состояния зрительного нерва, поля зрения и достигнутого внутриглазного давления.

Кнопка: **Написать в Telegram →**

### Катаракта
**Очная консультация**

**Нужно определить оптимальную тактику лечения катаракты?**

Срок операции, выбор интраокулярной линзы и объём вмешательства зависят от выраженности катаракты, состояния роговицы, сетчатки и зрительного нерва, сопутствующих заболеваний и зрительных задач пациента.

Кнопка: **Написать в Telegram →**

### Дислокация ИОЛ
**Очная консультация**

**Нужно определить, можно ли сохранить и зафиксировать ИОЛ или потребуется её замена?**

Тактика зависит от положения и модели ИОЛ, сохранности капсульной и связочной опоры, состояния роговицы, стекловидного тела, сетчатки и внутриглазного давления. Окончательное решение принимается после очного обследования.

Кнопка: **Написать в Telegram →**

## Тексты EN
### Glaucoma
**In-person consultation**

**Do you need an individual assessment of your treatment strategy?**

Management depends on the type and stage of glaucoma, the condition of the optic nerve, visual-field findings and the intraocular pressure achieved.

Button: **Message me on Telegram →**

### Cataract
**In-person consultation**

**Do you need to determine the most appropriate cataract treatment strategy?**

The timing of surgery, choice of intraocular lens and scope of treatment depend on cataract severity, the condition of the cornea, retina and optic nerve, associated eye disease and the patient’s visual needs.

Button: **Message me on Telegram →**

### IOL dislocation
**In-person consultation**

**Do you need to determine whether the IOL can be preserved and stabilised or should be exchanged?**

Management depends on the IOL position and model, remaining capsular and zonular support, and the condition of the cornea, vitreous, retina and intraocular pressure. The final strategy is determined after an in-person examination.

Button: **Message me on Telegram →**

## Дизайн
- На страницах глаукомы и дислокации ИОЛ используется существующая визуальная модель `.section-next`.
- Для катаракты используется аналогичный по иерархии блок в текущей пациентской дизайн-системе.
- Новые inline-стили не используются.
- Должны сохраняться светлая/тёмная тема и мобильная адаптивность.

## Тестирование
Проверить шесть страниц: RU/EN для глаукомы, катаракты и дислокации ИОЛ; наличие ровно одного CTA, корректную ссылку Telegram, отсутствие старой ссылки на `#contacts` в глаукомном CTA, наличие аналитического атрибута и отсутствие дублирования после повторного запуска генератора.
