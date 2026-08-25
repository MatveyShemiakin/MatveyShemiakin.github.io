// Deployment is managed by GitHub Actions and verified against the production endpoint.
const ALLOWED_ORIGINS = new Set([
  'https://matveyshemyakin.ru',
  'https://www.matveyshemyakin.ru'
]);

const TOPICS = {
  clinical: 'Клиническое взаимодействие',
  research: 'Научный проект',
  education: 'Образовательный проект',
  conference: 'Конференция / выступление',
  medtech: 'MedTech / Industry',
  other: 'Другой профессиональный вопрос'
};

function corsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Accept',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
}

const json = (body, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...corsHeaders(origin)
  }
});

function cleanLine(value, max) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

function cleanMessage(value, max) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value) && value.length <= 254;
}

function validate(payload) {
  const name = cleanLine(payload.name, 120);
  const organization = cleanLine(payload.organization, 180);
  const replyEmail = cleanLine(payload.reply_email, 254).toLowerCase();
  const topicKey = cleanLine(payload.topic, 32);
  const message = cleanMessage(payload.message, 5000);
  const honeypot = cleanLine(payload.honeypot, 200);
  const consent = payload.consent === true;
  const startedAt = Number(payload.started_at || 0);
  const ageMs = Date.now() - startedAt;

  if (honeypot) return { ok: false, silent: true };
  if (!name || name.length < 2) return { ok: false, code: 'name' };
  if (!validEmail(replyEmail)) return { ok: false, code: 'email' };
  if (!Object.hasOwn(TOPICS, topicKey)) return { ok: false, code: 'topic' };
  if (!message || message.length < 10) return { ok: false, code: 'message' };
  if (!consent) return { ok: false, code: 'consent' };
  if (!Number.isFinite(startedAt) || startedAt <= 0 || ageMs < 1800 || ageMs > 7200000) {
    return { ok: false, code: 'timing' };
  }

  return {
    ok: true,
    value: { name, organization, replyEmail, topicKey, message }
  };
}

function emailText(value, request) {
  const cf = request.cf || {};
  return [
    'Новое профессиональное обращение с matveyshemyakin.ru',
    '',
    `Имя: ${value.name}`,
    value.organization ? `Организация / должность: ${value.organization}` : '',
    `E-mail для ответа: ${value.replyEmail}`,
    `Тема: ${TOPICS[value.topicKey]}`,
    '',
    value.message,
    '',
    '---',
    `Страница: ${request.headers.get('referer') || 'не указана'}`,
    `Страна (Cloudflare): ${cf.country || 'не определена'}`,
    `Время UTC: ${new Date().toISOString()}`,
    '',
    'Важно: форма предназначена только для профессиональных обращений и не должна использоваться для медицинских данных пациентов.'
  ].filter(Boolean).join('\n');
}

function safeEmailErrorCode(error) {
  const code = String(error?.code || error?.name || 'EMAIL_SEND_FAILED').trim();
  return /^[A-Z0-9_:-]{1,80}$/.test(code) ? code : 'EMAIL_SEND_FAILED';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '';

    if (request.method === 'OPTIONS') {
      if (!ALLOWED_ORIGINS.has(origin)) {
        return json({ ok: false, message: 'Origin not allowed' }, 403, origin);
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST' || !url.pathname.startsWith('/api/contact')) {
      return json({ ok: false, message: 'Not found' }, 404, origin);
    }
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return json({ ok: false, message: 'Origin not allowed' }, 403, origin);
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return json({ ok: false, message: 'Unsupported media type' }, 415, origin);
    }

    const length = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(length) && length > 16000) {
      return json({ ok: false, message: 'Request too large' }, 413, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ ok: false, message: 'Invalid request' }, 400, origin);
    }

    const checked = validate(payload || {});
    if (!checked.ok) {
      if (checked.silent) return json({ ok: true }, 200, origin);
      return json({ ok: false, message: 'Please check the form fields.', field: checked.code }, 400, origin);
    }

    if (!env.EMAIL || typeof env.EMAIL.send !== 'function' || !env.CONTACT_RECIPIENT) {
      console.error('Contact Worker is missing EMAIL binding or CONTACT_RECIPIENT secret');
      return json({ ok: false, message: 'Service unavailable', code: 'EMAIL_BINDING_UNAVAILABLE' }, 503, origin);
    }

    const value = checked.value;
    const subject = `[Сайт] ${TOPICS[value.topicKey]} — ${value.name}`;

    try {
      await env.EMAIL.send({
        to: env.CONTACT_RECIPIENT,
        from: 'website@matveyshemyakin.ru',
        replyTo: value.replyEmail,
        subject,
        text: emailText(value, request)
      });
      return json({ ok: true }, 200, origin);
    } catch (error) {
      const code = safeEmailErrorCode(error);
      console.error('Contact email send failed', code, error);
      return json({ ok: false, message: 'Service unavailable', code }, 503, origin);
    }
  }
};
