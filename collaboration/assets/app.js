(() => {
  const root = document.documentElement;
  const body = document.body;
  const modal = document.querySelector('[data-contact-modal]');
  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-form-status]');
  const mobileCta = document.querySelector('.mobile-cta');

  const storedTheme = localStorage.getItem('ms-theme');
  if (storedTheme) root.dataset.theme = storedTheme;

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      localStorage.setItem('ms-theme', next);
      btn.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
  });

  function openModal(topic = '') {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    body.classList.add('modal-open');
    const select = form?.querySelector('[name="topic"]');
    if (select && topic) select.value = topic;
    setTimeout(() => form?.querySelector('[name="name"]')?.focus(), 50);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    body.classList.remove('modal-open');
  }

  document.querySelectorAll('[data-open-contact]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      openModal(el.dataset.topic || '');
    });
  });
  document.querySelectorAll('[data-close-contact]').forEach(el => el.addEventListener('click', closeModal));
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeModal(); });

  let ctaShown = false;
  addEventListener('scroll', () => {
    if (!mobileCta || ctaShown) return;
    if (scrollY > innerHeight * .65) {
      mobileCta.classList.add('is-visible');
      ctaShown = true;
    }
  }, { passive: true });

  function recipientAddress() {
    const codes = [109,100,115,104,101,109,121,97,107,105,110,64,111,112,104,116,97,108,109,46,114,117];
    return String.fromCharCode(...codes);
  }

  const topics = {
    clinical: ['Клиническое взаимодействие','Clinical collaboration'],
    research: ['Научный проект','Research project'],
    education: ['Образовательный проект','Medical education'],
    conference: ['Конференция / выступление','Conference / speaking'],
    medtech: ['MedTech / Industry','MedTech / Industry'],
    other: ['Другой профессиональный вопрос','Other professional inquiry']
  };

  form?.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const isEn = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    const name = String(fd.get('name') || '').trim();
    const org = String(fd.get('organization') || '').trim();
    const reply = String(fd.get('reply_email') || '').trim();
    const topicKey = String(fd.get('topic') || 'other');
    const message = String(fd.get('message') || '').trim();
    const topic = (topics[topicKey] || topics.other)[isEn ? 1 : 0];
    const subject = isEn ? `Professional inquiry: ${topic} — ${name}` : `Профессиональное обращение: ${topic} — ${name}`;
    const bodyText = isEn
      ? [`Name: ${name}`, org ? `Organization / role: ${org}` : '', `Reply email: ${reply}`, `Topic: ${topic}`, '', message, '', 'Sent from matveyshemyakin.ru/collaboration/'].filter(Boolean).join('\n')
      : [`Имя: ${name}`, org ? `Организация / должность: ${org}` : '', `E-mail для ответа: ${reply}`, `Тема: ${topic}`, '', message, '', 'Сформировано на matveyshemyakin.ru/collaboration/'].filter(Boolean).join('\n');

    if (status) {
      status.className = 'form-status success';
      status.textContent = form.dataset.mailClientText || (isEn ? 'Opening your email app…' : 'Открываем почтовое приложение…');
    }
    const mailto = `mailto:${recipientAddress()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailto;
  });
})();