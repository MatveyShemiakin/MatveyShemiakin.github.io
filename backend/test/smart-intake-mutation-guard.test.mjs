import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(here, '../../doctors/navigator/smart-intake.js');

test('MutationObserver does not rewrite the same none-label indefinitely', async () => {
  const source = await readFile(sourcePath, 'utf8');
  assert.match(
    source,
    /if \(noneButton\.textContent !== noneLabel\) noneButton\.textContent = noneLabel;/,
    'The none-label DOM write must be guarded by an equality check.'
  );
  assert.doesNotMatch(
    source,
    /noneButton\.textContent = 'Остальных перечисленных признаков нет';/,
    'An unconditional textContent write inside the observed subtree can create an infinite MutationObserver loop.'
  );
});
