function credentialString(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!value || typeof value !== 'object') return '';
  const candidates = [value.access_token, value.accessToken, value.iamToken, value.secret, value.apiKey];
  return candidates.find((item) => typeof item === 'string' && item.trim())?.trim() || '';
}

export function resolveYandexAuth(env = process.env) {
  const apiKey = credentialString(env.YANDEX_API_KEY);
  if (apiKey) {
    return {
      credential: apiKey,
      authScheme: 'Api-Key',
      source: 'api_key'
    };
  }

  const iamToken = credentialString(env.YANDEX_IAM_TOKEN);
  if (iamToken) {
    return {
      credential: iamToken,
      authScheme: 'Bearer',
      source: 'attached_service_account'
    };
  }

  throw new Error('Yandex authentication requires an API key or an attached service account IAM token');
}
