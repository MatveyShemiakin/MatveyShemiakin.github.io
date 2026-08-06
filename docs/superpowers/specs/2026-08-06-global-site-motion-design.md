# Global Site Motion Design

## Objective

Add restrained motion and interaction feedback to every public Russian and English page of matveyshemyakin.ru on desktop and mobile devices without changing the existing content hierarchy, medical tone or Vanilla HTML/CSS/JS architecture.

## Approved first release

The first release includes five coordinated behaviours:

1. a thin reading-progress indicator on sufficiently long pages;
2. one-time reveal transitions for ordinary content sections;
3. restrained hover/press feedback for interactive cards and links;
4. localized FAQ/detail opening feedback;
5. a localized “next material” card on mapped educational routes.

No parallax, particles, cursor effects, autoplay motion, external library or framework is introduced.

## Architecture

### Shared stylesheet

`site-motion.css` owns all visual behaviour. It defines:

- shared duration and distance tokens;
- the fixed reading-progress bar;
- reveal states based on `.site-motion-reveal` and `.is-visible`;
- card hover and active states based on `.site-motion-card`;
- `details` opening feedback;
- the reusable next-material component;
- mobile-specific reductions;
- a complete `prefers-reduced-motion: reduce` override.

Only `transform`, `opacity`, `box-shadow`, border and color transitions are used for motion. The module does not animate layout properties such as `height`, `top` or `left`.

### Shared controller

`site-motion.js` runs after the existing global theme controller. It:

- exits safely when JavaScript APIs are unavailable;
- mounts the progress bar only when the document is meaningfully taller than the viewport;
- updates progress through a single passive scroll listener coordinated by `requestAnimationFrame`;
- marks known card components with a shared motion class;
- applies one-time reveal transitions through one `IntersectionObserver`;
- excludes urgent, warning, emergency, red-flag, alert and disclaimer blocks from delayed reveal;
- applies localized FAQ state classes without replacing native `<details>` behaviour;
- injects one localized next-material card for explicitly mapped RU and EN routes;
- avoids duplicate UI when scripts are initialized more than once.

### Global injection

The existing `scripts/inject_site_theme.py` remains the single sitemap-driven injector. It adds:

- `/site-motion.css?v=20260806-1` after the global theme stylesheet;
- `/site-motion.js?v=20260806-1` after the global theme controller.

The injector continues to cover exactly the 27 public URLs in `sitemap.xml`. `konspekt.html` and other non-public technical pages remain excluded.

## Route mapping

The next-material component is limited to explicit educational sequences.

### Russian patient route

`before-surgery` → `surgery-day` → `recovery` → `eye-drops` → `daily-life` → `glasses` → patient library.

The IOL-dislocation article returns to the patient library.

### English patient route

The same route is mirrored under `/en/patients/` with English labels.

### Professional route

Bacterial keratitis → penetrating keratoplasty → professional library, mirrored for the English professional section where the corresponding pages exist.

No next-material component is injected on the home page, privacy pages or section landing pages.

## Accessibility and medical-safety constraints

- Critical medical warnings must be visible immediately and are never assigned a reveal delay.
- Native focus order, keyboard activation and `<details>` semantics remain unchanged.
- The progress bar is decorative and `aria-hidden="true"`.
- The next-material card uses a normal anchor and localized visible copy.
- Coarse-pointer devices do not depend on hover to communicate interactivity.
- `prefers-reduced-motion: reduce` disables reveal displacement, progress transition, card movement and detail motion.

## Responsive behaviour

Desktop uses the full 14 px reveal distance and 3 px card lift. Mobile uses a smaller reveal distance, removes hover-only lift on coarse pointers and keeps tap feedback brief. The progress bar remains 2 px high on all viewports and accounts for safe-area insets.

## Performance constraints

- One stylesheet and one deferred script shared across all public pages.
- One `IntersectionObserver` instance.
- One passive scroll listener only when the progress bar is active.
- No `MutationObserver`.
- No third-party dependency.
- No image processing, blur or `backdrop-filter`.

## Verification

Static regression tests verify:

- single CSS/JS inclusion on all sitemap pages and correct execution order;
- exclusion of technical pages;
- RU and EN localized labels and route mappings;
- explicit critical-content exclusion selectors;
- `IntersectionObserver`, passive scrolling and reduced-motion support;
- absence of `MutationObserver`, framework imports and `backdrop-filter`;
- idempotent injector behaviour.
