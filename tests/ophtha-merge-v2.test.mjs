import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  slideLine, moveBoard, canMove, isPowerOfTwo, createInitialBoard,
  addRandomTile, maxTile, serializeGame, hydrateGame
} from '../for-doctors/ophtha-arcade/ophtha-merge/game-engine.js';
import {
  createMemoryStore, loadGame, saveGame, loadProfile, saveProfile,
  recordFinishedGame, loadStats
} from '../for-doctors/ophtha-arcade/ophtha-merge/storage.js';
import {
  sanitizeDisplayName, normalizeSubmission, compareEntries,
  corsHeaders, allowedOrigin
} from '../workers/ophtha-merge/leaderboard.js';

test('canonical 2048 merges each tile at most once', () => {
  assert.deepEqual(slideLine([2,2,2,2]), { line:[4,4,0,0], gained:8, merges:[4,4] });
  assert.deepEqual(slideLine([4,4,8,0]), { line:[8,8,0,0], gained:8, merges:[8] });
  assert.deepEqual(slideLine([2,2,4,4]), { line:[4,8,0,0], gained:12, merges:[4,8] });
});

test('moves work in all directions and no-op stays a no-op', () => {
  const source = [[2,2,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  const left = moveBoard(source, 'left');
  assert.equal(left.moved, true);
  assert.equal(left.gained, 4);
  assert.deepEqual(left.board[0], [4,0,0,0]);
  assert.equal(moveBoard(left.board, 'left').moved, false);
  const down = moveBoard(source, 'down');
  assert.equal(down.board[3][0], 2);
  assert.equal(down.board[3][1], 2);
});

test('progression has no gameplay target cap', () => {
  assert.equal(isPowerOfTwo(2 ** 40), true);
  const result = moveBoard([[8192,8192,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], 'left');
  assert.equal(result.board[0][0], 16384);
  assert.equal(maxTile(result.board), 16384);
  assert.equal(canMove(result.board), true);
});

test('initial board has two tiles and random spawn is 2 or 4', () => {
  const seq = [0.01, 0.2, 0.99, 0.95];
  let i = 0;
  const board = createInitialBoard(() => seq[i++ % seq.length]);
  const tiles = board.flat().filter(Boolean);
  assert.equal(tiles.length, 2);
  assert.ok(tiles.every((value) => value === 2 || value === 4));
  const empty = Array.from({length:4}, () => [0,0,0,0]);
  const next = addRandomTile(empty, () => 0.95);
  assert.equal(next.flat().find(Boolean), 4);
  assert.equal(empty.flat().filter(Boolean).length, 0);
});

test('game state can be saved and safely hydrated', () => {
  const state = {version:2,board:[[2,4,8,16],[0,0,0,0],[0,0,0,0],[0,0,0,0]],score:1234,bestScore:9876,maxTile:16,mode:'classic',moves:42,undoUsed:false,startedAt:123456,milestones:[1024,2048]};
  assert.deepEqual(hydrateGame(serializeGame(state)), state);
  assert.equal(hydrateGame('{bad json'), null);
  assert.equal(hydrateGame(JSON.stringify({...state, board:[[3]]})), null);
});

test('browser storage resumes game, identity and statistics', () => {
  const store = createMemoryStore();
  const state = {version:2,board:[[2,4,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],score:6,bestScore:100,maxTile:4,mode:'classic',moves:2,undoUsed:false,startedAt:1000,milestones:[]};
  saveGame(state, store);
  assert.deepEqual(loadGame('classic', store), state);
  const profile = loadProfile(store, () => '550e8400-e29b-41d4-a716-446655440000');
  assert.match(profile.displayName, /^Доктор /);
  saveProfile({...profile, displayName:'Dr M'}, store);
  assert.equal(loadProfile(store).displayName, 'Dr M');
  recordFinishedGame({...state, score:1000, maxTile:128, moves:50}, 90_000, store);
  recordFinishedGame({...state, score:2000, maxTile:256, moves:80}, 120_000, store);
  const stats = loadStats(store);
  assert.equal(stats.games, 2);
  assert.equal(stats.bestScore, 2000);
  assert.equal(stats.bestTile, 256);
  assert.equal(stats.totalMoves, 130);
});

test('leaderboard validates pseudonymous submissions', () => {
  assert.equal(sanitizeDisplayName('  Доктор <script>  '), 'Доктор script');
  const ok = normalizeSubmission({playerId:'550e8400-e29b-41d4-a716-446655440000',displayName:'Dr. M',score:3872,maxTile:256,moves:120,durationMs:92000,mode:'classic'});
  assert.equal(ok.score, 3872);
  assert.throws(() => normalizeSubmission({...ok, maxTile:300}), /maxTile/);
  assert.throws(() => normalizeSubmission({...ok, mode:'zen'}), /mode/);
});

test('ranking and write origin rules are deterministic', () => {
  const a = {score:1000,maxTile:128,updatedAt:20};
  const b = {score:1000,maxTile:256,updatedAt:30};
  const c = {score:1200,maxTile:128,updatedAt:40};
  assert.deepEqual([a,b,c].sort(compareEntries), [c,b,a]);
  assert.equal(allowedOrigin('https://matveyshemyakin.ru'), true);
  assert.equal(allowedOrigin('https://evil.example'), false);
  assert.equal(corsHeaders('https://matveyshemyakin.ru')['Access-Control-Allow-Origin'], 'https://matveyshemyakin.ru');
});

test('production page has mobile game controls and no inline styles', () => {
  const base = new URL('../for-doctors/ophtha-arcade/ophtha-merge/', import.meta.url);
  const html = fs.readFileSync(new URL('index.html', base), 'utf8');
  const app = [
    fs.readFileSync(new URL('app.js', base), 'utf8'),
    fs.readFileSync(new URL('app-core.js', base), 'utf8')
  ].join('\n');
  const css = [
    fs.readFileSync(new URL('ophtha-merge.css', base), 'utf8'),
    fs.readFileSync(new URL('ophtha-merge-core.css', base), 'utf8')
  ].join('\n');
  assert.match(html, /\/styles\.css/);
  assert.match(html, /\/mobile-fix\.css/);
  assert.doesNotMatch(html, /style\s*=/i);
  for (const id of ['game-board','undo-button','new-game-button','leaderboard-button','mode-classic','mode-sprint','milestone-dialog']) assert.match(html, new RegExp(`id=["']${id}["']`));
  assert.doesNotMatch(app, /TARGET\s*=/);
  assert.match(app, /saveGame\(/);
  assert.match(app, /submitScore/);
  assert.match(app, /navigator\.vibrate/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /@keyframes\s+mergePulse/);
});

test('worker/config route leaderboard through SQLite Durable Object', () => {
  const worker = fs.readFileSync(new URL('../_worker.js', import.meta.url), 'utf8');
  const wrangler = fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  assert.match(worker, /OPHTHA_MERGE_LEADERBOARD/);
  assert.match(worker, /idFromName\(['"]global['"]\)/);
  assert.match(wrangler, /"OphthaMergeLeaderboard"/);
  assert.match(wrangler, /"storage"\s*:\s*"sqlite"/);
  assert.match(wrangler, /"\/api\/\*"/);
});
