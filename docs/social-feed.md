# Telegram social feed

Channel: https://t.me/DrShemMYu; bot: @DrShemMYubot.

Public routes: /social/ and /en/social/. Interface is bilingual; captions preserve the original language. Instagram is deferred until Meta verification.

Daily Actions schedule: 06:17 UTC (09:17 Moscow). Authenticated webhook receives channel posts continuously into a separate Cloudflare KV namespace. Immutable update records preserve edits despite concurrent deliveries; export selects the latest update. Previous public records are retained if KV reads are incomplete. Telegram does not expose channel history or deletion events through this bot API. To hide a post, add its stable id from social/feed.json to social/excluded.json; it is filtered during the next daily sync.

Secrets: TELEGRAM_BOT_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID. Credentials remain in Actions/Worker secrets and never enter public feed files. The setup script refuses to replace an unrelated existing webhook.

Run tests: node --test tests/social-feed-worker.test.mjs; python -m unittest tests/test_social_feed.py.

2026-10-05 review: corrected asset paths and mobile CTA; immutable webhook update records; GitHub Pages build replaces full-site Cloudflare deployment. Tests cover authorization, channel filtering, concurrent edits, metadata minimization, escaping, albums, and localized page assets.
