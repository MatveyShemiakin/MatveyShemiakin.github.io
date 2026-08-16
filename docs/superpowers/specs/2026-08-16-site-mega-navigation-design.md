# Global Mega Navigation Design

## Goal
Replace the long desktop header link list with three scalable navigation groups across the RU/EN site: **Patients**, **For doctors**, and **About the doctor**.

## Desktop structure
Top-level navigation:
- Пациентам / Patients
- Для врачей / For doctors
- О враче / About the doctor
- existing RU/EN control remains separate

Each top-level label remains a direct link to its section. A visually integrated chevron button opens the dropdown on click. The dropdown also opens on mouse hover and keyboard focus.

### Пациентам
- Пациентам — hub
- Катаракта
- Глаукома
- Смещение искусственного хрусталика
- Этапы лечения
- Частые вопросы
- Что нового

### Для врачей
- Для врачей — professional library
- Бактериальный кератит и язва роговицы
- Ведение после сквозной кератопластики

### О враче
- О враче
- Направления
- Образование
- Наука
- Контакты

English uses equivalent English labels and `/en/` routes where localised pages exist.

## Behaviour
- Desktop only; hidden at viewport widths `<=1020px`.
- Hover opens the corresponding dropdown.
- `focus-within` keeps the dropdown open for keyboard navigation.
- Clicking the chevron toggles the dropdown and updates `aria-expanded`.
- Clicking a top-level text label navigates directly to its hub/anchor.
- Escape closes all open dropdowns.
- Clicking outside closes all open dropdowns.
- Only one dropdown is open by click at a time.
- Existing mobile bottom navigation remains unchanged.

## Visual design
Use the existing navy/blue site palette, thin translucent borders, rounded corners, modest backdrop blur, and short opacity/translate transitions. No inline styles and no external UI library.

## Architecture
Create global `site-mega-nav.js` and `site-mega-nav.css`. JavaScript detects the current language, creates the navigation from one central data model, and mounts it into recognised site headers. A build injector adds the two assets to HTML pages idempotently. Existing section-specific desktop navigation is replaced only after the global component mounts successfully.

Recognised header patterns include the main site, patient pages, glaucoma/IOL pages, and the professional-library header. Pages without a recognised header are left unchanged except for harmless asset tags.

## Analytics and privacy
Navigation links use ordinary URLs. No medical search text or other personal data is transmitted. Existing Yandex Metrica link tracking remains in place; no new event payloads are required.

## Testing
Automated tests verify:
- RU and EN menu labels/routes;
- all three dropdown groups;
- accessibility attributes and Escape/outside-click logic markers;
- `<=1020px` desktop-menu cutoff;
- injector idempotency on representative RU/EN pages;
- no inline `style=` attributes in generated markup;
- existing mobile navigation files remain untouched.
