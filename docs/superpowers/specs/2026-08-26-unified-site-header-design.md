# Unified Site Header Design

## Goal
Use the main page header as the canonical visual and structural model for every public section and subsection of matveyshemyakin.ru while preserving page content and section-specific functions.

## Canonical desktop structure
`MS | Patients ▾ | For doctors ▾ | About ▾ | contextual control | RU/EN | theme`

- Reuse the existing main-site visual language: container width, monogram, typography, border, spacing, colors and mega-navigation.
- Keep the existing mega-navigation data and interaction model.
- Show a contextual control only when relevant: patient updates bell in `/patients/`, clinician updates bell in `/for-doctors/`; otherwise no placeholder is rendered.
- Language switch and theme control occupy consistent positions on all pages.

## Canonical mobile structure
Top header: `MS | RU/EN | theme`.

Primary navigation remains in the existing bottom mobile navigation. Do not duplicate the same navigation links in the top header.

## Scope
Apply to all public HTML pages, including:
- `/` and `/en/`
- `/patients/**` and `/en/patients/**`
- `/for-doctors/**` and `/en/for-doctors/**`
- `/collaboration/**` and `/en/collaboration/**`
- current and future clinical, events and tool pages.

## Architecture
Create one shared runtime header component and one shared stylesheet. The runtime normalizes existing page-specific headers into the canonical shell instead of manually rewriting every page. A Python injector guarantees that every public HTML page loads the shared header assets and that future pages receive them through the existing site injection workflow.

The runtime must preserve and move, rather than recreate, existing stateful controls when they exist (patient updates bell, doctor updates bell). Existing `site-mega-nav.js`, `mobile-nav.js`, language routes and theme infrastructure remain the sources of navigation behavior.

## Constraints
- Vanilla HTML/CSS/JS only; no framework or build system.
- No inline styles introduced by this feature.
- Do not modify medical or editorial content inside `<main>`.
- Do not break current patient/doctor update read state.
- Do not duplicate mega navigation or mobile navigation.
- RU and EN must have equivalent structure and localized labels.
- Light/dark, desktop/mobile and reduced-motion behavior must remain accessible.
- Preserve page-specific breadcrumbs, hero sections, sticky TOCs and clinical tools below the header.

## Styling
The shared header should visually match the main page header: dark translucent/overlay-compatible surface, thin lower rule, canonical monogram size, compact uppercase desktop navigation, pill language switch and a compact theme control. On light pages the header remains visually coherent through the existing site theme variables rather than page-specific hard-coded colors.

## Testing
- Structural regression: every public HTML page includes the shared header CSS/JS exactly once.
- DOM regression: representative legacy headers (`site-header`, `patient-header`, `doctors-header`, collaboration header) normalize to one canonical shell.
- Preservation regression: patient/doctor bells survive normalization and remain functional.
- Navigation regression: mega navigation appears once; mobile navigation remains once.
- Visual smoke: RU/EN × desktop/mobile × light/dark on main, patients hub, cataract, doctors hub, bacterial keratitis, events and collaboration.
- Contrast/accessibility: no new WCAG AA text-contrast regressions and controls retain accessible labels/focus states.

## Rollout
Implement on a feature branch, verify representative pages and global HTML coverage, merge through PR, run the existing injection workflow, then verify the final GitHub Pages build on the generated `main` commit.