import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('Wrangler production config targets the live OphthaSearch Worker with Workers AI', async () => {
  const config = await read('wrangler.jsonc');
  assert.match(config, /"name"\s*:\s*"matveyshemiakin-github-io"/);
  assert.match(config, /"main"\s*:\s*"_worker\.js"/);
  assert.match(config, /"binding"\s*:\s*"AI"/);
  assert.match(config, /"run_worker_first"\s*:\s*\[[^\]]*"\/v2\/\*"/s);
});

test('Worker asset upload excludes build-time dependencies', async () => {
  const ignore = await read('.assetsignore');
  assert.match(ignore, /^node_modules\/\*\*$/m);
});

test('OphthaSearch Worker changes are automatically deployed and live-smoke verified', async () => {
  const workflow = await read('.github/workflows/deploy-ophthasearch-worker.yml');
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /npx wrangler deploy --config wrangler\.jsonc/);
  assert.match(workflow, /workers\/ophthasearch-v2\/\*\*/);
  assert.match(workflow, /_worker\.js/);
  assert.match(workflow, /\/v2\/research/);
  assert.match(workflow, /latanoprost/i);
  assert.match(workflow, /timolol/i);
  assert.match(workflow, /evidence_only/);
});
