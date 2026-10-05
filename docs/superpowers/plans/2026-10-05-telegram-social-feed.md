# Telegram Social Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** Import public DrShemMYu channel posts into a daily bilingual social feed.
**Architecture:** A separate Cloudflare Worker receives authenticated Telegram webhooks into a dedicated KV namespace. A daily GitHub Actions job exports channel records, generates static RU/EN pages, and deploys using the site's verified hosting mechanism. Existing site worker and outbound Telegram publisher remain untouched.
**Tech Stack:** Cloudflare Workers/KV, Python 3.12, GitHub Actions, existing site CSS/JS.
**Spec:** docs/superpowers/specs/2026-10-05-social-feed-design.md

## Global Constraints
- /social/ and /en/social/; RU title «Публикации из соцсетей», EN title «Social media posts».
- Daily site updates; source captions remain in original language.
- Only channel username DrShemMYu; verify bot username DrShemMYubot.
- No secret output, no patient metadata beyond already-public post content.
- Instagram is not connected until separately authorized.
- Existing publisher must not be triggered manually.

## Review Focus
- Duplicate delivery and edits must not create duplicate cards.
- Telegram albums may arrive in multiple requests.
- API or hosting failure must preserve published feed and allow retry.
- Unexpected channel and unauthenticated export must be rejected.
- Long text and missing covers must fit mobile layouts without overflow.

### Task 1: Authenticated Telegram intake
**Files:** workers/social-feed/worker.mjs, workers/social-feed/wrangler.jsonc, tests/social-feed-worker.test.mjs.
**Interfaces:** POST /telegram accepts a Bot API update; GET /export returns {posts: []} to authenticated Actions only. KV keys use channel ID and message ID. Worker secrets use derived independent authentication values, not token-bearing URLs.
- [ ] Write failing Node tests for authentication, wrong channel, duplicate updates, edit ordering, album accumulation, unsupported message and missing caption.
- [ ] Run node --test tests/social-feed-worker.test.mjs and verify failures.
- [ ] Implement isolated Worker with bounded request size, public fields only, persistent KV records and metadata. No calls to outbound messaging APIs.
- [ ] Run tests; verify exports include durable records, never bot tokens or raw private updates.
- [ ] Commit Task 1.

### Task 2: Safe bot setup
**Files:** scripts/setup_social_telegram.py, .github/workflows/setup-social-telegram.yml, tests/test_setup_social_telegram.py.
**Interfaces:** reads TELEGRAM_BOT_TOKEN, CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from Actions secrets. Configures only the separate social Worker.
- [ ] Test bot identity mismatch, missing membership, existing unrelated webhook and HTTP error redaction.
- [ ] Implement diagnostics using getMe/getChatMember/getWebhookInfo; never print token or raw exceptions containing request URLs.
- [ ] Provision a dedicated KV namespace via Cloudflare API; supply its ID to a temporary config. Derive distinct webhook and export authentication values from token plus purpose strings, upload as Worker secrets through stdin.
- [ ] Deploy social Worker, verify health, then setWebhook only if webhook is empty or already our endpoint. Do not drop pending updates.
- [ ] Record sanitized run summary and commit scripts/workflow.

### Task 3: Static bilingual feed
**Files:** scripts/build_social_feed.py, social/index.html, en/social/index.html, social/feed.json, social-feed.css, tests/test_social_feed.py.
**Interfaces:** build_pages(posts: list[dict]) generates both static pages and normalized JSON; merge by source/channel/message key. Combine album entries at rendering.
- [ ] Test escapes, unsafe URL rejection, duplicate edits, album grouping, no posts, caption length, and absent images.
- [ ] Generate cards with dates, source and original Telegram link. Escape all text; do not render captions as arbitrary HTML.
- [ ] Fetch permitted Telegram covers via getFile in trusted Actions only, bounded size; retain local covers on transient failures. Video remains a link to original.
- [ ] Reuse current theme, navigation, language toggle and legal scripts; use responsive CSS without global overrides.
- [ ] Add navigation links and both sitemap entries.
- [ ] Run Python tests and validate generated HTML, links and sitemap.
- [ ] Commit Task 3.

### Task 4: Daily publishing and live verification
**Files:** .github/workflows/sync-social-feed.yml; deployment configuration only after hosting verification.
- [ ] Determine actual production hosting from current deployment runs and response headers. Do not assume CNAME means GitHub Pages.
- [ ] Use cron '17 6 * * *' (09:17 Moscow); allow manual run; serialize jobs.
- [ ] Export private Worker records, generate public pages; no authenticated responses in public artifacts.
- [ ] Commit changed feed assets only; explicitly execute verified site deployment because GITHUB_TOKEN commits do not necessarily trigger it.
- [ ] Run relevant existing regressions if site deployment touches the existing Worker. Stop on any failed test; keep production unchanged.
- [ ] Check RU/EN mobile and desktop, light/dark themes, language switch and overflow.
- [ ] Run setup and initial sync. Verify a genuinely new public channel post and its edit without sending messages automatically.
- [ ] Verify live /social/ and /en/social/ HTML after deployment. If no channel post is available, report setup status and specific live test still needed.
- [ ] Commit final verified changes and report deployment result.

## Execution
Native execution in the current session is proposed. Do not spawn agents without a separate explicit choice.
