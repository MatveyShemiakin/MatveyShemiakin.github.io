import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function safePath(urlPath) {
  const pathname = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  const normalized = path.normalize(pathname).replace(/^([/\\])+/, '');
  const candidate = path.resolve(root, normalized || 'index.html');
  if (!candidate.startsWith(root)) throw new Error('Path traversal blocked');
  return candidate;
}

const server = createServer(async (request, response) => {
  try {
    let filePath = safePath(request.url);
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(body);
  } catch (_error) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

await page.route('https://functions.yandexcloud.net/**', async (route) => {
  const requestBody = route.request().postDataJSON();
  if (requestBody?.action === 'extract_facts') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        action: 'extract_facts',
        provider: 'mock',
        facts: {
          laterality: null,
          course: null,
          onset: null,
          symptoms: ['photophobia', 'redness'],
          examination: {
            iop_mm_hg: null,
            iop_state: null,
            anterior_chamber_cells: null,
            hypopyon: null,
            synechiae: null,
            corneal_infiltrate: null,
            epithelial_defect: null,
            vitritis: null,
            retinal_tear: null,
            retinal_detachment: null
          },
          procedures: [],
          suspected_diagnoses: [],
          red_flags: [],
          negated_facts: [],
          source_confidence: 0.55
        },
        usage: null,
        provider_response_id: null
      })
    });
    return;
  }
  await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
});

try {
  await page.goto(`${baseUrl}/preview/clinical-navigator/index.html`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Да, продолжить' }).click();
  await page.getByText('Опишите жалобы, сроки, латеральность', { exact: false }).waitFor();

  const caseText = 'Женщина, светобоязнь и блефароспазм в анамнезе, B27-артрит, фибрин, перикорнеальная инъекция, что делать?';
  await page.locator('#chat-input').fill(caseText);
  await page.locator('#send-button').click();

  await page.locator('[data-recognized-facts-note]').waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);

  assert.equal(await page.locator('.typing-row').count(), 0, 'Typing indicator must not remain stuck.');
  assert.equal(pageErrors.length, 0, `Browser page errors: ${pageErrors.join('; ')}`);

  const recognizedText = await page.locator('[data-recognized-facts-note]').innerText();
  assert.match(recognizedText, /Боль или светобоязнь/i);
  assert.match(recognizedText, /Красный глаз/i);

  const painChip = page.locator('.suggestion-chip[data-value="pain_photophobia"]');
  const redEyeChip = page.locator('.suggestion-chip[data-value="red_eye"]');
  const visionChip = page.locator('.suggestion-chip[data-value="vision_loss"]');
  assert.equal(await painChip.isHidden(), true, 'Recognized pain/photophobia must be hidden from repeat questions.');
  assert.equal(await redEyeChip.isHidden(), true, 'Recognized redness must be hidden from repeat questions.');
  assert.equal(await visionChip.isVisible(), true, 'Unknown vision loss must remain available for clarification.');

  const submit = page.locator('.suggestion-submit');
  assert.equal(await submit.isEnabled(), true, 'Known selected facts must enable continuation.');

  console.log('Clinical navigator browser smoke test passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
