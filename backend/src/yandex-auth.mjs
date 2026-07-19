export function resolveYandexAuth(env = process.env) {
  if (env.YANDEX_API_KEY) {
    return {
      credential: env.YANDEX_API_KEY,
      authScheme: 'Api-Key',
      source: 'api_key'
    };
  }

  if (env.YANDEX_IAM_TOKEN) {
    return {
      credential: env.YANDEX_IAM_TOKEN,
      authScheme: 'Bearer',
      source: 'attached_service_account'
    };
  }

  throw new Error('Yandex authentication requires an API key or an attached service account IAM token');
}
