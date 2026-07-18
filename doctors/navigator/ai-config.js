window.CLINICAL_AI_CONFIG = Object.assign({
  endpoint: '',
  authoringMode: window.location.pathname.includes('/preview/'),
  requestTimeoutMs: 90000
}, window.CLINICAL_AI_CONFIG || {});
