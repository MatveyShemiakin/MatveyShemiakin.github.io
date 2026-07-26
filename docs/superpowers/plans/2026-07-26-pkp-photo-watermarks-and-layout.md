# PKP Photo Watermarks and Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the embedded first-photo signature, add the approved watermark pattern to every clinical image surface, and align the clinical header with the supplied site reference.

**Architecture:** Keep the original JPEG archive unchanged, apply a precise CSS crop to the first displayed eye, and apply reusable CSS pseudo-element overlays to the hero, figures, and lightbox frame. Use the existing shared clinical-header script and stylesheet for the site-wide navigation treatment.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, ImageMagick, Node.js built-in test runner.

## Global Constraints

- Preserve original clinical JPEG resolution and pixel content.
- Use the bacterial-keratitis `MATVEYSHEMYAKIN.RU` watermark pattern.
- Preserve `object-fit: contain` for clinical imagery.
- Preserve the 760 px article reading measure.
- Do not change medical copy.

---

### Task 1: Structural regression test

**Files:**
- Create: `tests/penetrating-keratoplasty-page.test.mjs`

**Interfaces:**
- Consumes: `for-doctors/penetrating-keratoplasty/index.html`, `clinical-header.css`, `doctors-legal.js`
- Produces: deterministic assertions runnable with `node --test`

- [ ] **Step 1: Write the failing test**

Assert that the first hero and clinical image use `clinical-01-eye.png`, the page includes watermark selectors for hero/figure/lightbox, the lightbox uses `.lightbox-media`, the shared navigation includes all seven primary links, and the article measure remains 760 px.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/penetrating-keratoplasty-page.test.mjs`

Expected: FAIL because the crop, watermark selectors, lightbox frame, and primary navigation are not present.

- [ ] **Step 3: Keep the test unchanged while implementing Tasks 2–4**

### Task 2: Non-destructive first-photo crop

**Files:**
- Modify: `for-doctors/penetrating-keratoplasty/index.html`

**Interfaces:**
- Consumes: full-resolution `clinical-01.jpg`
- Produces: a responsive viewport ending above the embedded surname at source coordinate 3280/4032

- [ ] **Step 1: Add the responsive crop treatment**

Use `height:122.93%` inside an overflow-hidden viewport, which maps 3280 visible source pixels to the full container height while leaving the original 4032 px JPEG unchanged.

- [ ] **Step 2: Mark the hero and first figure**

Add `.caption-cropped` to the hero and first figure. Add `data-crop="caption"` to the first lightbox trigger and toggle `.is-caption-cropped` on the lightbox frame.

### Task 3: Reusable watermark and lightbox frame

**Files:**
- Modify: `for-doctors/penetrating-keratoplasty/index.html`

**Interfaces:**
- Produces: `.hero-portrait::after`, `.figure-media::after`, `.lightbox-media::after`

- [ ] **Step 1: Add the bacterial-keratitis SVG tile**

Use the existing 270×150 diagonal pattern at 16% opacity on the hero and figure media.

- [ ] **Step 2: Wrap the lightbox image**

Replace the bare lightbox image with `.lightbox-media > img` and use the 360×210 tile at 14% opacity.

- [ ] **Step 3: Preserve interaction**

Set overlays to `pointer-events:none`; keep the zoom badge above the watermark and retain the current click/escape close behavior.

### Task 4: Reference-aligned shared clinical header

**Files:**
- Modify: `doctors-legal.js`
- Modify: `clinical-header.css`

**Interfaces:**
- Produces: shared desktop primary navigation and compact mobile fallback

- [ ] **Step 1: Replace page-section navigation injection with primary site navigation**

Generate language-aware links for Patients, Doctors, About, Directions, Education, Science, and Contacts.

- [ ] **Step 2: Match the supplied visual system**

Use a white serif `МШ` monogram without the circle, deep navy translucent background, a thin pale lower rule, uppercase 11 px navigation with approximately `.22em` tracking, and a 98–104 px desktop header height.

- [ ] **Step 3: Preserve compact responsive behavior**

Collapse primary navigation below 1020 px; retain language, theme, and library controls.

### Task 5: Verification and publication

**Files:**
- Test: `tests/penetrating-keratoplasty-page.test.mjs`

**Interfaces:**
- Consumes: final local source and deployed page
- Produces: test output, image-integrity evidence, live URL

- [ ] **Step 1: Run structural tests**

Run: `node --test tests/penetrating-keratoplasty-page.test.mjs`

Expected: PASS.

- [ ] **Step 2: Validate HTML and image decoding**

Check all 22 clinical/hero assets plus the cropped PNG with `identify`; no file may report zero dimensions.

- [ ] **Step 3: Perform browser QA**

Verify desktop first viewport, first clinical image, lightbox watermark, 760 px text measure, and absence of horizontal overflow. Verify the mobile breakpoint through computed responsive rules and the available browser surface.

- [ ] **Step 4: Publish only scoped files**

Stage the PKP page, shared header files, tests, and the two planning documents. Commit and push to the live GitHub Pages branch.

- [ ] **Step 5: Verify deployment**

Open the cache-busted production URL and confirm every referenced image has non-zero natural dimensions, the surname is absent from the first image, and the watermark appears in-page and in the lightbox.
