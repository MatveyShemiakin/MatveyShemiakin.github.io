import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveYandexAuth } from '../src/yandex-auth.mjs';
import { providerFromEnvironment } from '../src/providers.mjs';
import { optionProviderFromEnvironment } from '../src/option-providers.mjs';
import { runtimeEnvironment } from '../src/handler.mjs';

test('runtime injects attached service account IAM token', () => {
  const env = runtimeEnvironment({ token: 't1.test-token' }, { AI_PROVIDER: 'yandex' });
  assert.equal(env.AI_PROVIDER, 'yandex');
  assert.equal(env.YANDEX_IAM_TOKEN, 't1.test-token');
});

test('Yandex auth prefers explicit API key when present', () => {
  const auth = resolveYandexAuth({ YANDEX_API_KEY: 'api-key', YANDEX_IAM_TOKEN: 'iam-token' });
  assert.equal(auth.authScheme, 'Api-Key');
  assert.equal(auth.credential, 'api-key');
  assert.equal(auth.source, 'api_key');
});

test('Yandex auth uses attached service account token without API key', () => {
  const auth = resolveYandexAuth({ YANDEX_IAM_TOKEN: 'iam-token' });
  assert.equal(auth.authScheme, 'Bearer');
  assert.equal(auth.credential, 'iam-token');
  assert.equal(auth.source, 'attached_service_account');
});

test('both clinical providers initialize with attached service account token', () => {
  const env = {
    AI_PROVIDER: 'yandex',
    YANDEX_FOLDER_ID: 'folder-id',
    YANDEX_MODEL: 'yandexgpt/latest',
    YANDEX_IAM_TOKEN: 'iam-token'
  };
  const extractor = providerFromEnvironment(env);
  const generator = optionProviderFromEnvironment(env);
  assert.equal(extractor.id, 'yandex');
  assert.equal(extractor.auth_source, 'attached_service_account');
  assert.equal(generator.id, 'yandex');
  assert.equal(generator.auth_source, 'attached_service_account');
});

test('Yandex provider rejects missing credentials', () => {
  assert.throws(
    () => providerFromEnvironment({
      AI_PROVIDER: 'yandex',
      YANDEX_FOLDER_ID: 'folder-id',
      YANDEX_MODEL: 'yandexgpt/latest'
    }),
    /attached service account IAM token/
  );
});
