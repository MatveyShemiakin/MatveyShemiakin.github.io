const ANSWER_FIRST_MOBILE_CSS = '/for-doctors/ophthasearch/ophthasearch-answer-first.css?v=20260824-1';

function refreshOphthaSearchStyles() {
  const link = document.querySelector('link[data-ophtha-answer-first]');
  if (link && link.href !== new URL(ANSWER_FIRST_MOBILE_CSS, location.href).href) {
    link.href = ANSWER_FIRST_MOBILE_CSS;
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshOphthaSearchStyles, { once: true });
  } else {
    refreshOphthaSearchStyles();
  }
}
