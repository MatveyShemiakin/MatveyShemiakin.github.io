import {
  GAME_VERSION,
  addRandomTile,
  canMove,
  createInitialBoard,
  maxTile,
  moveBoard
} from './game-engine.js';
import {
  clearGame,
  loadGame,
  loadPrefs,
  loadProfile,
  loadStats,
  recordFinishedGame,
  saveGame,
  savePrefs,
  saveProfile
} from './storage.js';
import { loadLeaderboard, submitScore } from './leaderboard-client.js';
import { levelForScore } from './levels.js';
import { pageLanguage, tileLabel, uiText } from './i18n.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const language = pageLanguage();
const numberFormat = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ru-RU');
const stateByMode = new Map();
const profile = loadProfile(undefined, undefined, uiText('defaultDoctor', language));
let prefs = loadPrefs();
let state;
let timerHandle = null;
let leaderboardMode = 'classic';
let lastSubmittedScore = -1;
let submitting = false;
let touchStart = null;
let audioContext = null;

const TILE_MARKS = new Map([
  [2, '∙'],
  [4, '◒'],
  [8, '◉'],
  [16, '◎'],
  [32, '⌁'],
  [64, 'IOL'],
  [128, 'OCT'],
  [256, '✦'],
  [512, '⌖']
]);

function now() { return Date.now(); }
function format(value) { return numberFormat.format(value || 0); }
function elapsedMs() { return Math.max(0, now() - (state.startedAt || now())); }

function normalizeState(saved, mode) {
  if (saved) {
    return {
      mergeCount: 0,
      undoSnapshot: null,
      finished: false,
      endsAt: mode === 'sprint' ? now() + 60_000 : null,
      ...saved,
      mode
    };
  }
  return newGameState(mode);
}

function bestForMode(mode) {
  const saved = loadGame(mode);
  return saved?.bestScore || 0;
}

function newGameState(mode) {
  const board = createInitialBoard();
  return {
    version: GAME_VERSION,
    board,
    score: 0,
    bestScore: bestForMode(mode),
    maxTile: maxTile(board),
    mode,
    moves: 0,
    mergeCount: 0,
    undoUsed: false,
    undoSnapshot: null,
    startedAt: now(),
    endsAt: mode === 'sprint' ? now() + 60_000 : null,
    milestones: [],
    finished: false
  };
}

function loadMode(mode) {
  if (state) {
    stateByMode.set(state.mode, state);
    saveGame(state);
  }
  const memory = stateByMode.get(mode);
  state = memory || normalizeState(loadGame(mode), mode);
  if (mode === 'sprint' && !state.finished && state.endsAt && state.endsAt <= now()) {
    finishGame('time');
  }
  setModeButtons();
  startTimer();
  render();
  refreshLeaderboardPreview();
}

function snapshotForUndo() {
  return {
    board: state.board.map((row) => row.slice()),
    score: state.score,
    bestScore: state.bestScore,
    maxTile: state.maxTile,
    moves: state.moves,
    mergeCount: state.mergeCount
  };
}

function setModeButtons() {
  $$('.ophtha-merge-mode').forEach((button) => button.classList.toggle('is-active', button.dataset.mode === state.mode));
  $('#timer-card').hidden = state.mode !== 'sprint';
}

function tileMeta(value) {
  const level = Math.log2(value);
  return [TILE_MARKS.get(value) || '◆', tileLabel(value, language), level];
}

function renderBoard({ mergedValues = [], newIndex = -1, direction = '' } = {}) {
  const board = $('#game-board');
  board.innerHTML = '';
  const mergedQueue = [...mergedValues];
  state.board.flat().forEach((value, index) => {
    const cell = document.createElement('div');
    cell.className = 'ophtha-merge-cell';
    if (value) {
      const tile = document.createElement('div');
      const level = Math.log2(value);
      tile.className = `ophtha-merge-tile level-${Math.min(level, 10)}${level > 10 ? ' tile-super' : ''}`;
      if (index === newIndex) tile.classList.add('is-new');
      const mergeAt = mergedQueue.indexOf(value);
      if (mergeAt !== -1) {
        tile.classList.add('is-merged');
        mergedQueue.splice(mergeAt, 1);
      }
      const [mark, label] = tileMeta(value);
      const number = document.createElement('strong');
      number.className = 'ophtha-merge-tile-number';
      number.textContent = format(value);
      const symbol = document.createElement('span');
      symbol.className = 'ophtha-merge-tile-mark';
      symbol.textContent = mark;
      const caption = document.createElement('span');
      caption.className = 'ophtha-merge-tile-label';
      caption.textContent = label;
      tile.append(number, symbol, caption);
      cell.append(tile);
    }
    board.append(cell);
  });

  if (direction) {
    const className = `swipe-${direction}`;
    board.classList.remove('swipe-left', 'swipe-right', 'swipe-up', 'swipe-down');
    void board.offsetWidth;
    board.classList.add(className);
    setTimeout(() => board.classList.remove(className), 160);
  }
}

function renderScores() {
  $('#score-value').textContent = format(state.score);
  $('#best-value').textContent = format(state.bestScore);
  $('#max-tile-value').textContent = format(Math.max(2, state.maxTile));
  $('#undo-button').disabled = state.undoUsed || !state.undoSnapshot || state.finished;
}

function renderProfile() {
  $('#profile-name').textContent = profile.displayName;
  $('#profile-input').value = profile.displayName;
  const savedBest = loadStats().bestScore || 0;
  const level = levelForScore(Math.max(state?.bestScore || 0, state?.score || 0, savedBest));
  const badge = $('#profile-level');
  if (badge) {
    badge.textContent = level.name;
    badge.setAttribute('aria-label', `${uiText('profileLevel', language)}: ${level.name}`);
  }
}

function renderStats() {
  const stats = loadStats();
  $('#stat-games').textContent = format(stats.games);
  $('#stat-tile').textContent = format(stats.bestTile);
  $('#stat-moves').textContent = format(stats.totalMoves);
  $('#stat-score').textContent = format(stats.bestScore);
}

function render() {
  renderBoard();
  renderScores();
  renderProfile();
  renderStats();
  setModeButtons();
  const over = $('#game-over-panel');
  over.hidden = !state.finished;
  if (state.finished) {
    $('#game-over-title').textContent = state.mode === 'sprint' ? uiText('gameOverTime', language) : uiText('gameOverMoves', language);
    $('#game-over-summary').textContent = `${uiText('score', language)} ${format(state.score)} · ${uiText('tile', language)} ${format(state.maxTile)}`;
  }
  updateTimer();
}

function showGain(gained) {
  if (!gained) return;
  const node = $('#score-gain');
  node.textContent = `+${format(gained)}`;
  node.classList.remove('is-visible');
  void node.offsetWidth;
  node.classList.add('is-visible');
}

function findNewTileIndex(beforeSpawn, afterSpawn) {
  const before = beforeSpawn.flat();
  const after = afterSpawn.flat();
  for (let index = 0; index < after.length; index += 1) {
    if (before[index] === 0 && after[index] !== 0) return index;
  }
  return -1;
}

function haptic(pattern = 10) {
  if (prefs.haptics && navigator.vibrate) navigator.vibrate(pattern);
}

function tone(frequency = 440, duration = 0.045) {
  if (!prefs.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
}

function move(direction) {
  if (state.finished) return;
  if (state.mode === 'sprint' && state.endsAt <= now()) {
    finishGame('time');
    return;
  }

  const before = snapshotForUndo();
  const result = moveBoard(state.board, direction);
  if (!result.moved) {
    haptic(5);
    return;
  }

  if (!state.undoUsed) state.undoSnapshot = before;
  const beforeSpawn = result.board;
  state.board = addRandomTile(beforeSpawn);
  const newIndex = findNewTileIndex(beforeSpawn, state.board);
  state.score += result.gained;
  state.bestScore = Math.max(state.bestScore, state.score);
  state.maxTile = maxTile(state.board);
  state.moves += 1;
  state.mergeCount += result.merges.length;
  state.finished = false;
  saveGame(state);

  renderBoard({ mergedValues: result.merges, newIndex, direction });
  renderScores();
  renderProfile();
  showGain(result.gained);
  if (result.merges.length) {
    haptic(result.merges.length > 1 ? [8, 20, 8] : 12);
    tone(Math.min(880, 330 + Math.log2(Math.max(...result.merges)) * 34));
  }
  announceSave();
  checkMilestone();
  maybeSubmit();

  if (!canMove(state.board)) finishGame('moves');
}

function undo() {
  if (state.finished || state.undoUsed || !state.undoSnapshot) return;
  const snapshot = state.undoSnapshot;
  state.board = snapshot.board.map((row) => row.slice());
  state.score = snapshot.score;
  state.bestScore = Math.max(state.bestScore, snapshot.bestScore);
  state.maxTile = snapshot.maxTile;
  state.moves = snapshot.moves;
  state.mergeCount = snapshot.mergeCount;
  state.undoUsed = true;
  state.undoSnapshot = null;
  saveGame(state);
  haptic(14);
  render();
  announceSave(uiText('undoDone', language));
}

function restart(mode = state.mode) {
  const preservedBest = state?.mode === mode ? state.bestScore : bestForMode(mode);
  clearGame(mode);
  state = newGameState(mode);
  state.bestScore = Math.max(state.bestScore, preservedBest || 0);
  stateByMode.set(mode, state);
  lastSubmittedScore = -1;
  saveGame(state);
  startTimer();
  render();
  announceSave(uiText('newGame', language));
}

function finishGame(reason) {
  if (state.finished) return;
  state.finished = true;
  state.finishReason = reason;
  state.bestScore = Math.max(state.bestScore, state.score);
  saveGame(state);
  recordFinishedGame(state, elapsedMs());
  stopTimer();
  render();
  haptic([20, 35, 20]);
  maybeSubmit(true);
}

function checkMilestone() {
  if (state.maxTile < 1024 || state.milestones.includes(state.maxTile)) return;
  state.milestones.push(state.maxTile);
  saveGame(state);
  const level = Math.log2(state.maxTile);
  $('#milestone-tile').textContent = format(state.maxTile);
  $('#milestone-title').textContent = level === 10 ? 'Legendary IOL' : `Legendary IOL · ${uiText('milestoneLevel', language)} ${level - 9}`;
  $('#milestone-copy').textContent = `${uiText('milestoneCopyPrefix', language)} ${format(state.maxTile)} ${uiText('milestoneCopySuffix', language)}`;
  $('#milestone-dialog').showModal();
  tone(660, .12);
}

function announceSave(text = uiText('saved', language)) {
  const node = $('#save-status');
  node.textContent = text;
  clearTimeout(announceSave.timer);
  announceSave.timer = setTimeout(() => { node.textContent = uiText('autosave', language); }, 1500);
}

function startTimer() {
  stopTimer();
  if (state.mode !== 'sprint' || state.finished) return;
  if (!state.endsAt) state.endsAt = now() + 60_000;
  timerHandle = setInterval(() => {
    updateTimer();
    if (state.endsAt <= now()) finishGame('time');
  }, 100);
}

function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

function updateTimer() {
  if (state.mode !== 'sprint') {
    $('#timer-value').textContent = '∞';
    return;
  }
  const remaining = Math.max(0, (state.endsAt || now()) - now());
  $('#timer-value').textContent = `${(remaining / 1000).toFixed(1)}s`;
}

async function maybeSubmit(force = false) {
  if (submitting || state.score <= 0) return;
  if (!force && state.score <= lastSubmittedScore) return;
  submitting = true;
  try {
    const response = await submitScore(profile, state, elapsedMs());
    lastSubmittedScore = Math.max(lastSubmittedScore, state.score);
    $('#leaderboard-status').textContent = `${uiText('currentRank', language)}: #${response.rank}`;
    refreshLeaderboardPreview();
  } catch (error) {
    if (error.status !== 429) $('#leaderboard-status').textContent = uiText('leaderboardUnavailable', language);
  } finally {
    submitting = false;
  }
}

function leaderboardItem(entry) {
  const li = document.createElement('li');
  const rank = document.createElement('span');
  rank.className = `ophtha-merge-rank${entry.rank <= 3 ? ' top' : ''}`;
  rank.textContent = entry.rank;
  const player = document.createElement('span');
  player.className = 'ophtha-merge-player';
  const nameRow = document.createElement('span');
  nameRow.className = 'ophtha-merge-player-name-row';
  const name = document.createElement('strong');
  name.textContent = entry.displayName;
  const playerLevel = document.createElement('span');
  playerLevel.className = 'ophtha-merge-player-level';
  playerLevel.textContent = levelForScore(entry.score).name;
  nameRow.append(name, playerLevel);
  const detail = document.createElement('span');
  detail.textContent = `${uiText('tile', language)} ${format(entry.maxTile)}`;
  player.append(nameRow, detail);
  const score = document.createElement('strong');
  score.className = 'ophtha-merge-leader-score';
  score.textContent = format(entry.score);
  li.append(rank, player, score);
  if (entry.playerId === profile.playerId) li.setAttribute('aria-current', 'true');
  return li;
}

async function refreshLeaderboardPreview() {
  const list = $('#leaderboard-preview');
  try {
    const data = await loadLeaderboard(state.mode, 5);
    list.innerHTML = '';
    if (!data.entries.length) {
      const empty = document.createElement('li');
      empty.className = 'ophtha-merge-loading';
      empty.textContent = uiText('firstInRanking', language);
      list.append(empty);
      return;
    }
    data.entries.forEach((entry) => list.append(leaderboardItem(entry)));
  } catch {
    list.innerHTML = `<li class="ophtha-merge-loading">${uiText('offline', language)}</li>`;
  }
}

async function renderFullLeaderboard(mode = leaderboardMode) {
  leaderboardMode = mode;
  $$('.ophtha-merge-dialog-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.rankMode === mode));
  const list = $('#leaderboard-full');
  list.innerHTML = `<li class="ophtha-merge-loading">${uiText('loading', language)}</li>`;
  try {
    const data = await loadLeaderboard(mode, 20);
    list.innerHTML = '';
    data.entries.forEach((entry) => list.append(leaderboardItem(entry)));
    if (!data.entries.length) list.innerHTML = `<li class="ophtha-merge-loading">${uiText('rankingEmpty', language)}</li>`;
  } catch {
    list.innerHTML = `<li class="ophtha-merge-loading">${uiText('rankingLoadFailed', language)}</li>`;
  }
}

function openLeaderboard() {
  $('#leaderboard-dialog').showModal();
  renderFullLeaderboard(state.mode);
}

async function shareResult() {
  const text = `Ophtha Merge — ${format(state.score)} ${uiText('sharePoints', language)} · ${uiText('tile', language)} ${format(state.maxTile)}. ${uiText('shareChallenge', language)}`;
  const url = language === 'en'
    ? 'https://matveyshemyakin.ru/en/for-doctors/ophtha-arcade/ophtha-merge/'
    : 'https://matveyshemyakin.ru/for-doctors/ophtha-arcade/ophtha-merge/';
  try {
    if (navigator.share) await navigator.share({ title: 'Ophtha Merge', text, url });
    else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      announceSave(uiText('resultCopied', language));
    }
  } catch {}
}

function saveProfileFromDialog() {
  const input = $('#profile-input').value.trim();
  profile.displayName = input.slice(0, 23) || profile.displayName;
  saveProfile(profile);
  renderProfile();
  $('#profile-dialog').close();
  lastSubmittedScore = -1;
  maybeSubmit(true);
}

function updateSettings() {
  $('#sound-toggle').textContent = prefs.sound ? uiText('on', language) : uiText('off', language);
  $('#haptics-toggle').textContent = prefs.haptics ? uiText('on', language) : uiText('off', language);
}

function onPointerDown(event) {
  if (event.target.closest('button,a,input')) return;
  touchStart = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event) {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
}

function bindEvents() {
  $('#game-play-zone').addEventListener('pointerdown', onPointerDown, { passive: true });
  $('#game-play-zone').addEventListener('pointerup', onPointerUp, { passive: true });
  $('#game-board').addEventListener('keydown', (event) => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (!map[event.key]) return;
    event.preventDefault();
    move(map[event.key]);
  });
  $('#undo-button').addEventListener('click', undo);
  $('#new-game-button').addEventListener('click', () => restart());
  $('#game-over-restart').addEventListener('click', () => restart());
  $('#leaderboard-button').addEventListener('click', openLeaderboard);
  $('#leaderboard-open-secondary').addEventListener('click', openLeaderboard);
  $('#share-button').addEventListener('click', shareResult);
  $('#edit-profile-button').addEventListener('click', () => $('#profile-dialog').showModal());
  $('#profile-save-button').addEventListener('click', saveProfileFromDialog);
  $('#milestone-continue').addEventListener('click', () => $('#milestone-dialog').close());
  $('#settings-button').addEventListener('click', () => $('#settings-dialog').showModal());
  $('#sound-toggle').addEventListener('click', () => { prefs.sound = !prefs.sound; savePrefs(prefs); updateSettings(); tone(520); });
  $('#haptics-toggle').addEventListener('click', () => { prefs.haptics = !prefs.haptics; savePrefs(prefs); updateSettings(); haptic(20); });
  $$('.ophtha-merge-mode').forEach((button) => button.addEventListener('click', () => loadMode(button.dataset.mode)));
  $$('.ophtha-merge-dialog-tab').forEach((button) => button.addEventListener('click', () => renderFullLeaderboard(button.dataset.rankMode)));
  $$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(state); });
  window.addEventListener('pagehide', () => saveGame(state));
}

function init() {
  const saved = loadGame('classic');
  state = normalizeState(saved, 'classic');
  if (saved) $('#save-status').textContent = uiText('restored', language);
  state.maxTile = Math.max(state.maxTile || 0, maxTile(state.board));
  state.bestScore = Math.max(state.bestScore || 0, state.score);
  saveGame(state);
  bindEvents();
  updateSettings();
  render();
  startTimer();
  refreshLeaderboardPreview();
  maybeSubmit();
}

init();
