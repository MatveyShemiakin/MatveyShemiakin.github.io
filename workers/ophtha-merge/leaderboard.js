const TRUSTED_ORIGINS = new Set([
  'https://matveyshemyakin.ru',
  'https://www.matveyshemyakin.ru',
  'https://matveyshemiakin-github-io.matvei-shemyakin.workers.dev'
]);
const MODES = new Set(['classic', 'sprint']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SCORE = Number.MAX_SAFE_INTEGER;
const MAX_TILE = 2 ** 52;
const MAX_MOVES = 10_000_000;
const MAX_DURATION = 7 * 24 * 60 * 60 * 1000;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {})
    }
  });
}

export function allowedOrigin(origin) {
  return !origin || TRUSTED_ORIGINS.has(origin);
}

export function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (origin && TRUSTED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function sanitizeDisplayName(input) {
  const clean = String(input ?? '')
    .replace(/[<>]/g, '')
    .replace(/[^\p{L}\p{N} ._\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 23)
    .replace(/[\s._-]+$/g, '');
  return clean.length >= 2 ? clean : 'Игрок';
}

function boundedInteger(value, name, max) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new TypeError(`${name} is invalid`);
  return value;
}

function powerOfTwo(value) {
  return Number.isSafeInteger(value) && value >= 2 && value <= MAX_TILE && Number.isInteger(Math.log2(value));
}

export function normalizeSubmission(input) {
  if (!input || typeof input !== 'object') throw new TypeError('payload is invalid');
  const playerId = String(input.playerId || '').trim();
  if (!UUID_RE.test(playerId)) throw new TypeError('playerId is invalid');
  const mode = String(input.mode || '');
  if (!MODES.has(mode)) throw new TypeError('mode is invalid');
  const score = boundedInteger(input.score, 'score', MAX_SCORE);
  const maxTile = boundedInteger(input.maxTile, 'maxTile', MAX_TILE);
  if (maxTile !== 0 && !powerOfTwo(maxTile)) throw new TypeError('maxTile is invalid');
  const moves = boundedInteger(input.moves ?? 0, 'moves', MAX_MOVES);
  const durationMs = boundedInteger(input.durationMs ?? 0, 'durationMs', MAX_DURATION);
  return {
    playerId,
    displayName: sanitizeDisplayName(input.displayName),
    score,
    maxTile,
    moves,
    durationMs,
    mode
  };
}

export function compareEntries(a, b) {
  return (b.score - a.score) || (b.maxTile - a.maxTile) || (a.updatedAt - b.updatedAt);
}

function rowsToEntries(cursor) {
  return Array.from(cursor).map((row) => ({
    playerId: String(row.player_id),
    displayName: String(row.display_name),
    score: Number(row.score),
    maxTile: Number(row.max_tile),
    moves: Number(row.moves),
    durationMs: Number(row.duration_ms),
    mode: String(row.mode),
    updatedAt: Number(row.updated_at)
  }));
}

export class OphthaMergeLeaderboard {
  constructor(state) {
    this.state = state;
    this.sql = state.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS ophtha_merge_scores (
        player_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        display_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        max_tile INTEGER NOT NULL,
        moves INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, mode)
      );
      CREATE INDEX IF NOT EXISTS idx_ophtha_merge_rank
      ON ophtha_merge_scores(mode, score DESC, max_tile DESC, updated_at ASC);
    `);
    this.lastWrite = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      if (!allowedOrigin(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers });
    }

    if (request.method === 'GET' && url.pathname.endsWith('/leaderboard')) {
      const mode = MODES.has(url.searchParams.get('mode')) ? url.searchParams.get('mode') : 'classic';
      const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));
      const rows = rowsToEntries(this.sql.exec(
        `SELECT player_id, display_name, score, max_tile, moves, duration_ms, mode, updated_at
         FROM ophtha_merge_scores
         WHERE mode = ?
         ORDER BY score DESC, max_tile DESC, updated_at ASC
         LIMIT ?`,
        mode,
        limit
      ));
      return json({ ok: true, mode, entries: rows.map((entry, index) => ({ ...entry, rank: index + 1 })) }, { headers });
    }

    if (request.method === 'POST' && url.pathname.endsWith('/score')) {
      if (!allowedOrigin(origin)) return json({ ok: false, error: 'origin_not_allowed' }, { status: 403, headers });
      let submission;
      try {
        submission = normalizeSubmission(await request.json());
      } catch (error) {
        return json({ ok: false, error: String(error?.message || 'invalid_submission') }, { status: 400, headers });
      }

      const now = Date.now();
      const key = `${submission.mode}:${submission.playerId}`;
      const lastWrite = this.lastWrite.get(key) || 0;
      if (now - lastWrite < 3000) {
        return json({ ok: false, error: 'rate_limited' }, { status: 429, headers: { ...headers, 'Retry-After': '3' } });
      }
      this.lastWrite.set(key, now);

      this.sql.exec(
        `INSERT INTO ophtha_merge_scores
          (player_id, mode, display_name, score, max_tile, moves, duration_ms, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(player_id, mode) DO UPDATE SET
           display_name = excluded.display_name,
           score = CASE WHEN excluded.score > score THEN excluded.score ELSE score END,
           max_tile = CASE
             WHEN excluded.score > score THEN excluded.max_tile
             WHEN excluded.score = score AND excluded.max_tile > max_tile THEN excluded.max_tile
             ELSE max_tile END,
           moves = CASE WHEN excluded.score >= score THEN excluded.moves ELSE moves END,
           duration_ms = CASE WHEN excluded.score >= score THEN excluded.duration_ms ELSE duration_ms END,
           updated_at = CASE WHEN excluded.score >= score THEN excluded.updated_at ELSE updated_at END`,
        submission.playerId,
        submission.mode,
        submission.displayName,
        submission.score,
        submission.maxTile,
        submission.moves,
        submission.durationMs,
        now
      );

      const current = rowsToEntries(this.sql.exec(
        `SELECT player_id, display_name, score, max_tile, moves, duration_ms, mode, updated_at
         FROM ophtha_merge_scores WHERE player_id = ? AND mode = ?`,
        submission.playerId,
        submission.mode
      ))[0];
      const rankRow = Array.from(this.sql.exec(
        `SELECT 1 + COUNT(*) AS rank FROM ophtha_merge_scores
         WHERE mode = ? AND (
           score > ? OR
           (score = ? AND max_tile > ?) OR
           (score = ? AND max_tile = ? AND updated_at < ?)
         )`,
        submission.mode,
        current.score,
        current.score,
        current.maxTile,
        current.score,
        current.maxTile,
        current.updatedAt
      ))[0];

      return json({ ok: true, entry: current, rank: Number(rankRow?.rank || 1) }, { headers });
    }

    return json({ ok: false, error: 'not_found' }, { status: 404, headers });
  }
}
