import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameBase = new URL('../for-doctors/ophtha-arcade/ophtha-merge/', import.meta.url);
const vaultUrl = new URL('vault.js', gameBase);
const storageUrl = new URL('storage.js', gameBase);
const ruHtml = fs.readFileSync(new URL('index.html', gameBase), 'utf8');
const enHtml = fs.readFileSync(new URL('../en/for-doctors/ophtha-arcade/ophtha-merge/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('ophtha-merge.css', gameBase), 'utf8');

async function loadVaultModule() {
  assert.equal(fs.existsSync(vaultUrl), true, 'vault.js must exist');
  return import(vaultUrl.href);
}

test('Ophtha Vault ships 24 curated RU/EN discoveries with legal full-text sources', async () => {
  const { VAULT_ITEMS } = await loadVaultModule();
  assert.equal(VAULT_ITEMS.length, 24);
  assert.equal(VAULT_ITEMS.filter((item) => item.kind === 'fact').length, 12);
  assert.equal(VAULT_ITEMS.filter((item) => item.kind === 'paper').length, 12);
  assert.equal(new Set(VAULT_ITEMS.map((item) => item.id)).size, 24);
  for (const item of VAULT_ITEMS) {
    assert.match(item.sourceUrl, /^https:\/\/pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+\/?$/);
    assert.ok(item.title?.ru && item.title?.en);
    assert.ok(item.copy?.ru && item.copy?.en);
    assert.ok(item.rule?.metric && Number.isFinite(item.rule?.threshold));
  }
});

test('vault unlock evaluation is deterministic, progressive and preserves prior discoveries', async () => {
  const { evaluateVaultUnlocks } = await loadVaultModule();
  const empty = evaluateVaultUnlocks({ score: 0, bestScore: 0, maxTile: 2, moves: 0, mergeCount: 0, totalMoves: 0, totalMerges: 0, games: 0 }, []);
  assert.deepEqual(empty.unlockedIds, []);
  assert.deepEqual(empty.newIds, []);

  const first = evaluateVaultUnlocks({ score: 128, bestScore: 128, maxTile: 16, moves: 25, mergeCount: 10, totalMoves: 25, totalMerges: 10, games: 0 }, []);
  assert.ok(first.newIds.length >= 1);
  assert.equal(new Set(first.unlockedIds).size, first.unlockedIds.length);

  const repeated = evaluateVaultUnlocks({ score: 128, bestScore: 128, maxTile: 16, moves: 25, mergeCount: 10, totalMoves: 25, totalMerges: 10, games: 0 }, first.unlockedIds);
  assert.deepEqual(repeated.newIds, []);
  assert.deepEqual(repeated.unlockedIds, first.unlockedIds);
});

test('vault progress persists independently in the existing local storage layer', async () => {
  const storage = await import(storageUrl.href);
  assert.equal(typeof storage.loadVault, 'function');
  assert.equal(typeof storage.saveVault, 'function');
  const store = storage.createMemoryStore();
  storage.saveVault({ unlockedIds: ['first-iol', 'oct-1991'] }, store);
  assert.deepEqual(storage.loadVault(store), { unlockedIds: ['first-iol', 'oct-1991'] });
});

test('RU and EN game shells expose Vault collection and discovery dialogs', () => {
  for (const html of [ruHtml, enHtml]) {
    assert.match(html, /id=["']vault-button["']/);
    assert.match(html, /id=["']vault-count["']/);
    assert.match(html, /id=["']vault-dialog["']/);
    assert.match(html, /id=["']vault-grid["']/);
    assert.match(html, /id=["']vault-unlock-dialog["']/);
  }
});

test('Vault styling stays inside the existing Ophtha Merge visual system', () => {
  assert.match(css, /\.ophtha-merge-vault-grid\{/);
  assert.match(css, /\.ophtha-merge-vault-card\{/);
  assert.match(css, /html\[data-site-theme=["']dark["']\][^\n]*\.ophtha-merge-vault-card/s);
  assert.doesNotMatch(css, /font-family:\s*(?!inherit)/);
});

test('Vault discovery actions keep full touch-target height on mobile', () => {
  assert.match(css, /\.ophtha-merge-vault-unlock-actions \.button\{[^}]*flex:0 0 auto[^}]*min-height:(?:50|52|54|56|58)px[^}]*\}/);
  const mobileBlock = css.slice(css.indexOf('@media(max-width:680px)'));
  assert.doesNotMatch(mobileBlock, /\.ophtha-merge-vault-unlock-actions \.button\{[^}]*flex:1 1 0/);
});
