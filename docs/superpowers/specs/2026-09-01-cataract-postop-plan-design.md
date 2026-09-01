# Cataract Postoperative Plan — Design Specification

**Date:** 2026-09-01

## Goal
Add an ergonomic patient-facing postoperative plan for cataract surgery with IOL implantation, reachable from `/patients/cataract/`, while preserving the existing visual system and the static Vanilla HTML/CSS/JS architecture.

## Entry point
On the cataract page, add a prominent existing-style `.path-card` linking to `/patients/cataract-postop-plan/` with the title **«Послеоперационный план лечения Шемякина М.Ю.»** and a short explanation: medication schedule, reminders and adherence journal.

## Patient page
Public URL: `/patients/cataract-postop-plan/`.

Reuse existing patient section classes and global design assets only. No inline styles and no new CSS framework.

The page includes:
- H1: postoperative treatment plan after cataract removal and IOL implantation;
- operation date input;
- week tabs: week 1, week 2, week 3, week 4, after one month;
- medication cards by INN / active ingredient with examples of trade names;
- dose-time actions: completed / missed;
- local adherence journal with daily summary and doctor-view / print action;
- browser reminder permission plus downloadable calendar (`.ics`) as the reliable fallback;
- postoperative restrictions, permitted activities and emergency red flags;
- consultation CTA and medical disclaimer.

## Medication plan from the patient's current printed memo

### Week 1
- Комбинил — 1 drop 4 times/day.
- Броксинак — 1 drop 1 time/day.
- Корнерегель — 1 drop 3 times/day.

### Week 2
- Броксинак — 1 drop 1 time/day.
- Корнерегель — 1 drop 2 times/day.

### Week 3
- Броксинак — 1 drop 1 time/day.
- Корнерегель — 1 drop 1 time/day.

### Week 4
- Броксинак — 1 drop 1 time/day.
- Корнерегель — 1 drop 1 time/day.

### After one month
- Офтолик or Офтолик БК — 1 drop 3 times/day for 3 months.

Rules copied from the memo:
- each type of drops should be instilled at equal intervals during the day;
- interval between different types of drops: 5 minutes;
- medication duration follows the prescribed instruction / physician plan.

## INN mapping used for patient explanation
- Комбинил → ципрофлоксацин + дексаметазон.
- Броксинак → бромфенак.
- Корнерегель → декспантенол.
- Офтолик / Офтолик БК → повидон + поливиниловый спирт.

Trade names are examples only. The page explicitly tells the patient to compare active ingredients and to follow the discharge prescription / treating physician if there is any discrepancy.

## Postoperative instructions from the current printed memo

### First 2–3 days
Do not touch, press or rub the operated eye except during careful washing. Tearing and foreign-body sensation may occur; wipe tears only from the cheek after washing hands.

### Temporarily prohibited for 1 month
- sealing the eye with plaster or a bandage;
- bathhouse, sauna, hot shower / hot bath and steaming the face;
- swimming in pools and open water;
- lifting more than 5 kg, especially abruptly;
- dusty or dirty work, including sweeping and repair work;
- strenuous exercise (running, skiing, skating, etc.);
- alcohol.

Eye cosmetics are prohibited for 3 weeks.

### Allowed after surgery
- careful washing from the next day with eyes closed and no pressure on the eye;
- sleeping on either side;
- warm shower;
- washing hair with the head tilted back;
- bending to tie shoes or pick up an item;
- reading, writing, cooking and light household activities without dust/dirt;
- lifting up to 5 kg smoothly, without jerks.

Main rule from the memo: **nothing should get into the eye.**

### Emergency symptoms
If vision decreases, the eye becomes markedly red, eye pain appears, or there is abundant discharge, seek urgent ophthalmic care and take the discharge papers. Contact center from the memo: **+7 (499) 490-0303**.

## Privacy and storage
The MVP stores operation date, dose status and journal data only in `localStorage` on the patient's own device. No name, phone number, diagnosis record or medication-adherence log is transmitted to GitHub Pages or a backend.

## Reminder limitations
Static GitHub Pages cannot provide guaranteed scheduled background push notifications without a dedicated push backend/service-worker scheduling infrastructure. The MVP therefore:
1. requests browser notification permission and can notify while the page is active;
2. offers an `.ics` calendar export with alarms for reliable OS-level reminders.

## Accessibility and UX
- large touch targets using existing `.button` and `.filter-button` controls;
- clear status text (completed / missed / pending);
- keyboard-operable controls;
- semantic `<section>`, `<article>`, `<h2>`, `<h3>`, `<ul>`, `<p>` structure;
- mobile-first stacking using the existing patient section responsive CSS.
