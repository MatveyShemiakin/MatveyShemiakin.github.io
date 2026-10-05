# Telegram social feed

Channel: https://t.me/DrShemMYu; bot: @DrShemMYubot.

Public routes: /social/ and /en/social/. Interface is bilingual; captions preserve the original language. Instagram is deferred until Meta verification.

Daily Actions schedule: 06:17 UTC (09:17 Moscow). Authenticated webhook receives channel posts continuously into a dedicated Cloudflare Durable Object with transactional storage. Transactions preserve edits despite concurrent deliveries; older updates cannot replace newer records. Previous public records are retained if an export is incomplete. Telegram does not expose channel history or deletion events through this bot API. To hide a post, add its stable id from social/feed.json to social/excluded.json; it is filtered during the next daily sync.

Secrets: TELEGRAM_BOT_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID. Credentials remain in Actions/Worker secrets and never enter public feed files. The setup script refuses to replace an unrelated existing webhook.

Run tests: node --test tests/social-feed-worker.test.mjs; python -m unittest tests/test_social_feed.py.

2026-10-05 review: corrected asset paths and mobile CTA; transactional webhook update records; GitHub Pages build replaces full-site Cloudflare deployment. Tests cover authorization, channel filtering, concurrent edits, metadata minimization, escaping, albums, and localized page assets.

Live verification 2026-10-05: workflow run 37328748479 completed successfully, including webhook configuration, health check, export, regressions, and Pages build request. Public Russian and English routes return their localized social titles and stylesheet. Export initially has zero records; no fabricated channel posts were published.
