import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/contact-worker/worker.mjs';

function validPayload(overrides = {}) {
  return {
    name: 'Иван Иванов',
    organization: 'Клиника',
    reply_email: 'doctor@example.com',
    topic: 'research',
    message: 'Предлагаю обсудить совместный исследовательский проект.',
    consent: true,
    honeypot: '',
    started_at: Date.now() - 3000,
    lang: 'ru',
    ...overrides
  };
}

function requestFor(payload, origin = 'https://matveyshemyakin.ru') {
  return new Request('https://matveyshemyakin.ru/api/contact', {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

test('valid professional enquiry is sent through the Email Service binding', async () => {
  let sent;
  const env = {
    CONTACT_RECIPIENT: 'hidden-destination@example.com',
    EMAIL: {
      async send(message) {
        sent = message;
        return { messageId: 'test-message' };
      }
    }
  };

  const response = await worker.fetch(requestFor(validPayload()), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.equal(sent.to, 'hidden-destination@example.com');
  assert.equal(sent.from, 'website@matveyshemyakin.ru');
  assert.equal(sent.replyTo, 'doctor@example.com');
  assert.match(sent.subject, /Научный проект/);
  assert.match(sent.text, /Иван Иванов/);
});

test('foreign origins are rejected before email is sent', async () => {
  let calls = 0;
  const env = {
    CONTACT_RECIPIENT: 'hidden-destination@example.com',
    EMAIL: { async send() { calls += 1; } }
  };

  const response = await worker.fetch(requestFor(validPayload(), 'https://example.org'), env);
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test('honeypot submissions are silently accepted but never emailed', async () => {
  let calls = 0;
  const env = {
    CONTACT_RECIPIENT: 'hidden-destination@example.com',
    EMAIL: { async send() { calls += 1; } }
  };

  const response = await worker.fetch(requestFor(validPayload({ honeypot: 'spam.example' })), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.equal(calls, 0);
});

test('missing consent is rejected', async () => {
  const env = {
    CONTACT_RECIPIENT: 'hidden-destination@example.com',
    EMAIL: { async send() { throw new Error('must not send'); } }
  };

  const response = await worker.fetch(requestFor(validPayload({ consent: false })), env);
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.field, 'consent');
});
