import { hydrateGame, serializeGame } from './game-engine.js';

const PREFIX = 'ophthaMerge:v2';
const PROFILE_KEY = `${PREFIX}:profile`;
const STATS_KEY = `${PREFIX}:stats`;
const PREFS_KEY = `${PREFIX}:prefs`;

function gameKey(mode) {
  return `${PREFIX}:game:${mode}`;
}

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function defaultStore() {
  return globalThis.localStorage;
}

export function createMemoryStore() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

export function saveGame(state, store = defaultStore()) {
  store.setItem(gameKey(state.mode), serializeGame(state));
}

export function loadGame(mode, store = defaultStore()) {
  return hydrateGame(store.getItem(gameKey(mode)));
}

export function clearGame(mode, store = defaultStore()) {
  store.removeItem(gameKey(mode));
}

export function loadProfile(store = defaultStore(), uuidFactory = () => globalThis.crypto.randomUUID()) {
  const stored = safeParse(store.getItem(PROFILE_KEY), null);
  if (stored?.playerId && stored?.displayName) return stored;
  const playerId = uuidFactory();
  const suffix = String(playerId).replace(/-/g, '').slice(-4).toUpperCase();
  const profile = { playerId, displayName: `Доктор ${suffix}` };
  saveProfile(profile, store);
  return profile;
}

export function saveProfile(profile, store = defaultStore()) {
  store.setItem(PROFILE_KEY, JSON.stringify({
    playerId: String(profile.playerId),
    displayName: String(profile.displayName).trim().slice(0, 23) || 'Игрок'
  }));
}

export function loadStats(store = defaultStore()) {
  return {
    games: 0,
    bestScore: 0,
    bestTile: 0,
    totalMoves: 0,
    totalMerges: 0,
    longestMs: 0,
    ...safeParse(store.getItem(STATS_KEY), {})
  };
}

export function recordFinishedGame(state, durationMs, store = defaultStore()) {
  const stats = loadStats(store);
  stats.games += 1;
  stats.bestScore = Math.max(stats.bestScore, state.score || 0);
  stats.bestTile = Math.max(stats.bestTile, state.maxTile || 0);
  stats.totalMoves += state.moves || 0;
  stats.totalMerges += state.mergeCount || 0;
  stats.longestMs = Math.max(stats.longestMs, Math.max(0, durationMs || 0));
  store.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}

export function loadPrefs(store = defaultStore()) {
  return {
    sound: false,
    haptics: true,
    ...safeParse(store.getItem(PREFS_KEY), {})
  };
}

export function savePrefs(prefs, store = defaultStore()) {
  store.setItem(PREFS_KEY, JSON.stringify({ sound: Boolean(prefs.sound), haptics: Boolean(prefs.haptics) }));
}
