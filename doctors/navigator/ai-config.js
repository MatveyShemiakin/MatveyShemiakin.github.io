window.CLINICAL_AI_CONFIG = Object.assign({
  endpoint: 'https://functions.yandexcloud.net/d4e9unn69ovvqcr6cvj7',
  authoringMode: window.location.pathname.includes('/preview/'),
  requestTimeoutMs: 90000
}, window.CLINICAL_AI_CONFIG || {});
