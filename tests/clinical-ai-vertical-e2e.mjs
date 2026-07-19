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
  '.svg': 'image/svg+xml'
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
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.route('https://functions.yandexcloud.net/**', async (route) => {
  const body = route.request().postDataJSON();
  assert.equal(body.action, 'analyze_case');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      action: 'analyze_case',
      provider: 'mock',
      case_text: body.case_text,
      facts: {
        laterality: 'unilateral',
        course: 'first',
        onset: 'days',
        symptoms: ['pain', 'photophobia', 'redness'],
        examination: {
          visual_acuity_reduced: null,
          iop_mm_hg: 18,
          iop_state: 'normal',
          anterior_chamber_cells: '3+',
          hypopyon: false,
          synechiae: null,
          corneal_infiltrate: null,
          epithelial_defect: null,
          vitritis: null,
          retinal_tear: null,
          retinal_detachment: null
        },
        procedures: [],
        suspected_diagnoses: ['передний увеит'],
        red_flags: [],
        negated_facts: ['hypopyon'],
        source_confidence: 0.84
      },
      recognized_facts: [
        { id: 'unilateral', label: 'Одностороннее поражение', value: 'unilateral', confidence: 0.84 },
        { id: 'photophobia', label: 'Светобоязнь', value: 'photophobia', confidence: 0.84 },
        { id: 'hla_b27', label: 'Указана связь с HLA-B27', value: 'указано', confidence: 0.72 },
        { id: 'iop_mm_hg', label: 'ВГД', value: '18 мм рт. ст.', confidence: 0.84 }
      ],
      missing_questions: [
        { id: 'visual_acuity', text: 'Какова острота зрения каждого глаза?', reason: 'Нужна для оценки срочности.', priority: 'safety' },
        { id: 'posterior', text: 'Есть ли вовлечение заднего отрезка?', reason: 'Это меняет тактику.', priority: 'safety' }
      ],
      diagnostic_options: [
        {
          id: 'diagnosis_hla_b27',
          label: 'HLA-B27-ассоциированный передний увеит',
          support_level: 'strong',
          supporting_facts: ['Острый односторонний фенотип', 'HLA-B27-ассоциированный артрит'],
          against_or_missing_facts: ['Не указана острота зрения'],
          tests_to_discriminate: ['Оценить задний отрезок'],
          evidence_chunk_ids: ['au-hlab27-classification'],
          selected: false
        },
        {
          id: 'diagnosis_viral',
          label: 'Вирусный передний увеит',
          support_level: 'weak',
          supporting_facts: ['Односторонний процесс'],
          against_or_missing_facts: ['ВГД не повышено', 'Нет данных об атрофии радужки'],
          tests_to_discriminate: ['Оценить радужку и чувствительность роговицы'],
          evidence_chunk_ids: ['au-viral-discriminating-clues'],
          selected: false
        }
      ],
      management_options: [
        {
          id: 'management_noninfectious_local',
          label: 'Местная противовоспалительная тактика при неинфекционном фенотипе',
          applies_to_diagnostic_option_ids: ['diagnosis_hla_b27'],
          rationale: 'Вариант для обсуждения после исключения инфекции.',
          components: [{ intervention: 'Местная противовоспалительная терапия', regimen: null, duration: null, status: 'insufficient_source_detail' }],
          monitoring: ['Активность воспаления', 'ВГД'],
          risks_and_constraints: ['Исключить инфекционную этиологию'],
          evidence_chunk_ids: ['au-noninfectious-local-option'],
          selected: false,
          physician_selection_required: true
        }
      ],
      urgency: { level: 'accelerated', rationale: 'Необходимо уточнить остроту зрения и задний отрезок.', evidence_chunk_ids: ['au-universal-safety-stop'] },
      limitations: ['Draft authoring mode.'],
      physician_selection_required: true,
      final_decision_owner: 'physician'
    })
  });
});

try {
  await page.goto(`${baseUrl}/preview/clinical-ai/index.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.suggestion-chip').count(), 0, 'The clean flow must not contain the legacy checkbox questionnaire.');

  await page.locator('#case-input').fill('Женщина 34 лет, острый односторонний передний увеит, боль, светобоязнь, клетки 3+, HLA-B27-артрит, ВГД 18.');
  await page.locator('#analyze-button').click();

  await page.getByText('HLA-B27-ассоциированный передний увеит', { exact: true }).waitFor({ timeout: 5000 });
  assert.equal(errors.length, 0, `Browser errors: ${errors.join('; ')}`);
  assert.equal(await page.locator('#analysis-status.is-loading').count(), 0, 'Loading state must finish.');
  assert.match(await page.locator('#recognized-facts').innerText(), /HLA-B27/);
  assert.doesNotMatch(await page.locator('#questions-list').innerText(), /светобоязн/i, 'Known photophobia must not be asked again.');
  assert.match(await page.locator('#questions-list').innerText(), /острота зрения/i);

  const firstDiagnosis = page.locator('#diagnosis-options .option-card').first();
  await firstDiagnosis.locator('.select-option').click();
  assert.equal(await firstDiagnosis.locator('.select-option').innerText(), 'Выбрано врачом');
  assert.equal(await page.locator('#diagnosis-options .option-card.is-selected').count(), 1);

  console.log('Clean clinical AI vertical slice browser test passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
