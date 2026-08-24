(() => {
  const root = document.documentElement;
  const body = document.body;
  const isEn = (document.documentElement.lang || '').toLowerCase().startsWith('en');

  function ensureContactModal() {
    if (document.querySelector('[data-contact-modal]')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = isEn
      ? `<div class="modal" data-contact-modal aria-hidden="true"><div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title"><div class="modal-top"><div><h2 id="contact-modal-title">Professional inquiry</h2><p>Fill in the form without leaving the website.</p></div><button class="close-button" type="button" data-close-contact aria-label="Close">×</button></div><form data-contact-form data-mail-client-text="Opening your email app…"><div class="form-grid"><div class="field"><label for="contact-name">Name <span class="required">*</span></label><input id="contact-name" name="name" autocomplete="name" required></div><div class="field"><label for="contact-org">Organization / role</label><input id="contact-org" name="organization" autocomplete="organization"></div><div class="field"><label for="contact-email">Email for reply <span class="required">*</span></label><input id="contact-email" name="reply_email" type="email" autocomplete="email" required></div><div class="field"><label for="contact-topic">Topic <span class="required">*</span></label><select id="contact-topic" name="topic" required><option value="clinical">Clinical collaboration</option><option value="research">Research project</option><option value="education">Medical education</option><option value="conference">Conference / speaking</option><option value="medtech">MedTech / Industry</option><option value="other" selected>Other professional inquiry</option></select></div><div class="field full"><label for="contact-message">Message <span class="required">*</span></label><textarea id="contact-message" name="message" required></textarea></div></div><div class="consent-row"><input id="contact-consent" name="consent" type="checkbox" required><label for="contact-consent">I consent to the processing of the information submitted through this form in accordance with the <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. Do not include patient-identifiable information or medical records.</label></div><div class="form-footer"><p class="form-policy">The professional email address is not displayed on this page.</p><button class="button primary" type="submit">Continue to send →</button></div><div class="form-status" data-form-status aria-live="polite"></div></form></div></div>`
      : `<div class="modal" data-contact-modal aria-hidden="true"><div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title"><div class="modal-top"><div><h2 id="contact-modal-title">Профессиональное обращение</h2><p>Заполните форму, не покидая сайт.</p></div><button class="close-button" type="button" data-close-contact aria-label="Закрыть">×</button></div><form data-contact-form data-mail-client-text="Открываем почтовое приложение…"><div class="form-grid"><div class="field"><label for="contact-name">Имя <span class="required">*</span></label><input id="contact-name" name="name" autocomplete="name" required></div><div class="field"><label for="contact-org">Организация / должность</label><input id="contact-org" name="organization" autocomplete="organization"></div><div class="field"><label for="contact-email">E-mail для ответа <span class="required">*</span></label><input id="contact-email" name="reply_email" type="email" autocomplete="email" required></div><div class="field"><label for="contact-topic">Тема <span class="required">*</span></label><select id="contact-topic" name="topic" required><option value="clinical">Клиническое взаимодействие</option><option value="research">Научный проект</option><option value="education">Образовательный проект</option><option value="conference">Конференция / выступление</option><option value="medtech">MedTech / Industry</option><option value="other" selected>Другой профессиональный вопрос</option></select></div><div class="field full"><label for="contact-message">Сообщение <span class="required">*</span></label><textarea id="contact-message" name="message" required></textarea></div></div><div class="consent-row"><input id="contact-consent" name="consent" type="checkbox" required><label for="contact-consent">Я согласен на обработку информации, отправленной через форму, в соответствии с <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</a>. Не указывайте персональные данные пациентов и не прикладывайте медицинские документы.</label></div><div class="form-footer"><p class="form-policy">Профессиональный адрес e-mail на странице не отображается.</p><button class="button primary" type="submit">Продолжить отправку →</button></div><div class="form-status" data-form-status aria-live="polite"></div></form></div></div>`;
    document.body.appendChild(wrapper.firstElementChild);
  }

  function pruneDuplicateBlocks() {
    document.querySelector('.hero-side')?.remove();
    document.querySelector('.stats-strip')?.remove();
    document.querySelector('.hero-grid')?.classList.add('hero-grid--single');
    const contactBox = document.querySelector('.contact-box');
    if (contactBox) {
      [...contactBox.children].forEach(el => {
        if (el.tagName === 'P' && !el.classList.contains('contact-note')) el.remove();
      });
    }
  }

  ensureContactModal();
  pruneDuplicateBlocks();

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

  document.querySelectorAll('[data-mail-topic]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      openModal(el.dataset.mailTopic || 'other');
    });
  });

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