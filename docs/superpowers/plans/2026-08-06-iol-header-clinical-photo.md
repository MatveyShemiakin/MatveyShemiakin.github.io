# IOL Header Clinical Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the exact uploaded slit-lamp photograph as a CSS background on the right side of the existing IOL-dislocation header in Russian and English without changing header layout or content.

**Architecture:** Store the original JPEG as a dedicated asset, add a small page-specific stylesheet loaded after the existing styles, and use `.site-head::before`/`.site-head::after` layers for the image and blue readability gradients. The HTML change is limited to one stylesheet link per language version.

**Tech Stack:** Static HTML5, CSS3, Node.js built-in test runner, GitHub Pages.

## Global Constraints

- Use the uploaded JPEG byte-for-byte; SHA-256 must remain `16805deb82252d3d48334ca423c7009c9043eca1c5739ffe75004dbb58b29988`.
- Do not modify the existing header markup, copy, navigation, controls, spacing, or document structure.
- Do not use inline styles, JavaScript, frameworks, or build tooling.
- Apply the same asset and CSS to Russian and English pages.
- Keep text readable in light and dark site themes and at desktop, tablet, and mobile widths.

---

### Task 1: Regression contract

**Files:**
- Create: `tests/iol-header-photo.test.mjs`
- Create temporarily: `.github/workflows/iol-header-photo-temp.yml`

**Interfaces:**
- Consumes: current Russian and English IOL page HTML.
- Produces: automated contract for asset checksum, stylesheet links, CSS pseudo-layers, and mobile rules.

- [ ] **Step 1: Write the failing test**

Create a Node test that asserts:

```js
assert.ok(fs.existsSync('assets/iol-dislocation-header.jpg'));
assert.equal(sha256(image), '16805deb82252d3d48334ca423c7009c9043eca1c5739ffe75004dbb58b29988');
assert.match(ruHtml, /header-photo\.css\?v=20260806-1/);
assert.match(enHtml, /header-photo\.css\?v=20260806-1/);
assert.match(css, /\.sim-page \.site-head::before/);
assert.match(css, /@media \(max-width:680px\)/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node --test tests/iol-header-photo.test.mjs
```

Expected: failure because the image, stylesheet, and links do not exist yet.

- [ ] **Step 3: Commit the failing contract**

```bash
git add tests/iol-header-photo.test.mjs .github/workflows/iol-header-photo-temp.yml
git commit -m "test: define IOL header photo contract"
```

### Task 2: Exact image asset

**Files:**
- Create: `assets/iol-dislocation-header.jpg`

**Interfaces:**
- Consumes: uploaded source `/mnt/data/1000058724.jpg`.
- Produces: `/assets/iol-dislocation-header.jpg` referenced only by CSS.

- [ ] **Step 1: Add the uploaded JPEG without transformation**

Store the original bytes directly at `assets/iol-dislocation-header.jpg`.

- [ ] **Step 2: Verify byte identity**

Run:

```bash
sha256sum assets/iol-dislocation-header.jpg
```

Expected:

```text
16805deb82252d3d48334ca423c7009c9043eca1c5739ffe75004dbb58b29988
```

- [ ] **Step 3: Commit the asset**

```bash
git add assets/iol-dislocation-header.jpg
git commit -m "assets: add original IOL header photograph"
```

### Task 3: CSS-only header integration

**Files:**
- Create: `patients/iol-dislocation/header-photo.css`
- Modify: `patients/iol-dislocation/index.html`
- Modify: `en/patients/iol-dislocation/index.html`

**Interfaces:**
- Consumes: existing `.sim-page`, `.site-head`, `.nav`, and `.hero` classes.
- Produces: a background image layer and readability overlay with no layout changes.

- [ ] **Step 1: Add isolated desktop CSS**

Use `.sim-page .site-head::before` for the photograph and `.sim-page .site-head::after` for blue gradients. Keep all existing children above the layers using `position:relative; z-index:1`.

- [ ] **Step 2: Add tablet and mobile CSS**

At `max-width:1020px`, reduce the photo width and opacity. At `max-width:680px`, keep the photograph within the existing header as a lower/right background layer and strengthen the vertical blue gradient for text contrast.

- [ ] **Step 3: Link the stylesheet last in both page heads**

Insert exactly:

```html
<link rel="stylesheet" href="/patients/iol-dislocation/header-photo.css?v=20260806-1">
```

immediately before `</head>` in both language versions.

- [ ] **Step 4: Run focused verification**

Run:

```bash
node --test tests/iol-header-photo.test.mjs
node --test tests/mobile-navbar.test.mjs
node --test tests/site-theme.test.mjs
node --test tests/site-motion.test.mjs
```

Expected: all tests pass.

- [ ] **Step 5: Commit implementation**

```bash
git add patients/iol-dislocation/header-photo.css patients/iol-dislocation/index.html en/patients/iol-dislocation/index.html
git commit -m "feat: add clinical photo to IOL page header"
```

### Task 4: Publication cleanup

**Files:**
- Delete: `.github/workflows/iol-header-photo-temp.yml`
- Create: `docs/releases/2026-08-06-iol-header-clinical-photo.md`

**Interfaces:**
- Consumes: passing CI result.
- Produces: merge-ready branch without temporary workflow files.

- [ ] **Step 1: Record release details**

Document the exact-image checksum, CSS-only integration, affected pages, and test commands.

- [ ] **Step 2: Remove the temporary workflow**

Delete `.github/workflows/iol-header-photo-temp.yml` after the passing run.

- [ ] **Step 3: Create and merge a pull request**

Use squash merge into `main`, then verify that `main` points to the merge commit and that GitHub Pages serves the new stylesheet and image.
