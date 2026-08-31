import { loadGame, loadStats, loadVault, saveVault } from './storage.js';
import { VAULT_ITEMS, evaluateVaultUnlocks, vaultItemById, vaultItemText, vaultUi } from './vault.js';

const $ = (selector) => document.querySelector(selector);
const language = String(document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'ru';
let vaultState = loadVault();
const unlockQueue = [];

function activeMode() {
  return $('.ophtha-merge-mode.is-active')?.dataset.mode || 'classic';
}

function vaultContext() {
  const game = loadGame(activeMode()) || {};
  const stats = loadStats();
  const currentMoves = game.finished ? 0 : Number(game.moves || 0);
  const currentMerges = game.finished ? 0 : Number(game.mergeCount || 0);
  return {
    score: Number(game.score || 0),
    bestScore: Math.max(Number(game.bestScore || 0), Number(game.score || 0), Number(stats.bestScore || 0)),
    maxTile: Math.max(Number(game.maxTile || 0), Number(stats.bestTile || 0)),
    moves: Number(game.moves || 0),
    mergeCount: Number(game.mergeCount || 0),
    totalMoves: Number(stats.totalMoves || 0) + currentMoves,
    totalMerges: Number(stats.totalMerges || 0) + currentMerges,
    games: Number(stats.games || 0)
  };
}

function unlockedSet() {
  return new Set(vaultState.unlockedIds || []);
}

function renderVaultSummary() {
  const count = vaultState.unlockedIds.length;
  const text = `${count} / ${VAULT_ITEMS.length}`;
  if ($('#vault-count')) $('#vault-count').textContent = text;
  if ($('#vault-dialog-count')) $('#vault-dialog-count').textContent = text;
}

function makeVaultCard(item, unlocked) {
  const card = document.createElement('article');
  card.className = `ophtha-merge-vault-card${unlocked ? ' is-unlocked' : ' is-locked'}`;

  const top = document.createElement('div');
  top.className = 'ophtha-merge-vault-card-top';
  const icon = document.createElement('span');
  icon.className = 'ophtha-merge-vault-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = unlocked ? item.icon : '🔒';
  const kind = document.createElement('span');
  kind.className = 'ophtha-merge-vault-kind';
  kind.textContent = unlocked ? vaultUi(item.kind, language) : vaultUi('locked', language);
  top.append(icon, kind);

  const title = document.createElement('h3');
  const copy = document.createElement('p');
  if (unlocked) {
    const localized = vaultItemText(item, language);
    title.textContent = localized.title;
    copy.textContent = localized.copy;
  } else {
    title.textContent = '???';
    copy.textContent = language === 'en' ? 'Keep playing to discover this entry.' : 'Продолжайте играть, чтобы открыть эту находку.';
  }
  card.append(top, title, copy);

  if (unlocked) {
    const source = document.createElement('a');
    source.className = 'button secondary ophtha-merge-vault-source';
    source.href = item.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = vaultUi(item.kind === 'paper' ? 'readPaper' : 'readSource', language);
    source.setAttribute('aria-label', `${source.textContent}: ${item.sourceTitle}`);
    card.append(source);
  }
  return card;
}

function renderVaultGrid() {
  const grid = $('#vault-grid');
  if (!grid) return;
  const unlocked = unlockedSet();
  grid.replaceChildren(...VAULT_ITEMS.map((item) => makeVaultCard(item, unlocked.has(item.id))));
  renderVaultSummary();
}

function openVault() {
  renderVaultGrid();
  $('#vault-dialog')?.showModal();
}

function presentNextUnlock() {
  const dialog = $('#vault-unlock-dialog');
  if (!dialog || dialog.open || document.querySelector('dialog[open]')) return;
  const id = unlockQueue.shift();
  if (!id) return;
  const item = vaultItemById(id);
  if (!item) {
    presentNextUnlock();
    return;
  }
  const localized = vaultItemText(item, language);
  $('#vault-unlock-icon').textContent = item.icon;
  $('#vault-unlock-kind').textContent = vaultUi('discoveryUnlocked', language);
  $('#vault-unlock-title').textContent = localized.title;
  $('#vault-unlock-copy').textContent = localized.copy;
  const source = $('#vault-unlock-source');
  source.href = item.sourceUrl;
  source.textContent = vaultUi(item.kind === 'paper' ? 'readPaper' : 'readSource', language);
  source.setAttribute('aria-label', `${source.textContent}: ${item.sourceTitle}`);
  $('#vault-unlock-continue').textContent = vaultUi('continue', language);
  dialog.showModal();
}

function checkVaultUnlocks(announce = true) {
  const result = evaluateVaultUnlocks(vaultContext(), vaultState.unlockedIds);
  if (result.unlockedIds.length !== vaultState.unlockedIds.length) {
    vaultState = { unlockedIds: result.unlockedIds };
    saveVault(vaultState);
    renderVaultSummary();
    if ($('#vault-dialog')?.open) renderVaultGrid();
  }
  if (announce && result.newIds.length) {
    unlockQueue.push(...result.newIds);
    presentNextUnlock();
  }
}

function bindVault() {
  $('#vault-button')?.addEventListener('click', openVault);
  $('#vault-unlock-continue')?.addEventListener('click', () => $('#vault-unlock-dialog')?.close());
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('close', () => {
    setTimeout(presentNextUnlock, 80);
  }));

  const watched = ['#score-value', '#max-tile-value', '#stat-games', '#stat-moves']
    .map((selector) => $(selector))
    .filter(Boolean);
  const observer = new MutationObserver(() => checkVaultUnlocks(true));
  watched.forEach((node) => observer.observe(node, { childList: true, characterData: true, subtree: true }));
}

function initVault() {
  renderVaultSummary();
  checkVaultUnlocks(false);
  bindVault();
}

initVault();
