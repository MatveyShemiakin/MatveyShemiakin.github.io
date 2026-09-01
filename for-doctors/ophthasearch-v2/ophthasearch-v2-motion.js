const TYPEWRITER_COPY = {
  ru: [
    'Латанопрост или тимолол при ПОУГ?',
    'Витрэктомия или пломбирование при RRD?',
    'Yamane или шовная фиксация при дислокации ИОЛ?',
    'Фторхинолон или фортифицированные антибиотики при кератите?'
  ],
  en: [
    'Latanoprost or timolol for primary open-angle glaucoma?',
    'Vitrectomy or scleral buckle for primary RRD?',
    'Yamane or sutured fixation for a dislocated IOL?',
    'Fluoroquinolone or fortified antibiotics for bacterial keratitis?'
  ]
};

function pageLanguage() {
  return document.documentElement.lang === 'en' ? 'en' : 'ru';
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function runTypewriter(input, state) {
  if (!input || state.stopped || reducedMotion()) return;
  const copy = TYPEWRITER_COPY[pageLanguage()];
  let exampleIndex = 0;
  while (!state.stopped && document.contains(input)) {
    const phrase = copy[exampleIndex % copy.length];
    for (let i = 1; i <= phrase.length && !state.stopped; i += 1) {
      input.placeholder = phrase.slice(0, i);
      await sleep(34);
    }
    if (state.stopped) break;
    await sleep(1450);
    for (let i = phrase.length - 1; i >= 0 && !state.stopped; i -= 1) {
      input.placeholder = phrase.slice(0, i);
      await sleep(17);
    }
    exampleIndex += 1;
    if (!state.stopped) await sleep(260);
  }
}

function stopTypewriter(state, input) {
  if (state.stopped) return;
  state.stopped = true;
  if (input && !input.value.trim()) {
    input.placeholder = pageLanguage() === 'en' ? 'Ask a clinical question' : 'Задайте клинический вопрос';
  }
}

function wireExamples(root, input, state) {
  root.querySelectorAll('[data-v2-example]').forEach((button) => {
    button.addEventListener('click', () => {
      stopTypewriter(state, input);
      const question = button.getAttribute('data-v2-example') || '';
      input.value = question;
      input.focus({ preventScroll: true });
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

function wireAnswerObserver(root, answerShell) {
  if (!answerShell) return;
  const sync = () => {
    const visible = !answerShell.hidden;
    document.body.classList.toggle('has-answer', visible);
    if (visible) {
      document.body.classList.remove('is-searching');
      if (!reducedMotion()) {
        window.setTimeout(() => answerShell.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      }
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(answerShell, { attributes: true, attributeFilter: ['hidden'] });
  sync();
}

function initOphthaSearchMotion(root = document) {
  const form = root.querySelector('[data-v2-search-form]');
  const input = root.querySelector('[data-v2-query]');
  const answerShell = root.querySelector('[data-v2-answer-shell]');
  const eye = root.querySelector('[data-v2-eye-mark]');
  if (!form || !input) return;

  const state = { stopped: false };
  if (eye) window.requestAnimationFrame(() => eye.classList.add('is-ready'));

  wireExamples(root, input, state);
  wireAnswerObserver(root, answerShell);

  input.addEventListener('focus', () => stopTypewriter(state, input), { once: true });
  input.addEventListener('input', () => stopTypewriter(state, input), { once: true });
  form.addEventListener('submit', () => {
    stopTypewriter(state, input);
    document.body.classList.add('is-searching');
    document.body.classList.remove('has-answer');
  });

  if (!reducedMotion() && !input.value.trim()) void runTypewriter(input, state);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initOphthaSearchMotion(), { once: true });
} else {
  initOphthaSearchMotion();
}