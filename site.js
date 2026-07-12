document.addEventListener('DOMContentLoaded', () => {
  const langSwitch = document.querySelector('.lang-switch');
  if (!langSwitch) return;

  const buttons = langSwitch.querySelectorAll('button[data-lang]');
  const defaultLang = document.documentElement.lang === 'en' ? 'en' : 'ru';

  const setLanguage = (lang) => {
    document.documentElement.lang = lang;

    buttons.forEach((button) => {
      const active = button.dataset.lang === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    document.querySelectorAll('[data-ru]').forEach((node) => {
      const nextValue = node.dataset[lang] ?? node.dataset.ru;
      if (!nextValue) return;
      node.innerHTML = nextValue;
    });

    if (window.SCIENCE_SECTION_CONTENT && typeof window.renderScienceSection === 'function') {
      window.renderScienceSection(document.getElementById('science'));
    }
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang || defaultLang));
  });

  setLanguage(defaultLang);
});

