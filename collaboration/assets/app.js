(() => {
  const root = document.documentElement;
  const body = document.body;
  const isEn = (document.documentElement.lang || '').toLowerCase().startsWith('en');

  function ensureContactModal() {
    if (document.querySelector('[data-contact-modal]')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = isEn
      ? `<div class="modal" data-contact-modal aria-hidden="true"><div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title"><div class="modal-top"><div><h2 id="contact-modal-title">Professional inquiry</h2><p>Fill in the form without leaving the website.</p></div><button class="close-button" type="button" data-close-contact aria-label="Close">×</button></div><form data-contact-form><div class="form-grid"><div class="field"><label for="contact-name">Name <span class="required">*</span></label><input id="contact-name" name="name" autocomplete="name" maxlength="120" required></div><div class="field"><label for="contact-org">Organization / role</label><input id="contact-org" name="organization" autocomplete="organization" maxlength="180"></div><div class="field"><label for="contact-email">Email for reply <span class="required">*</span></label><input id="contact-email" name="reply_email" type="email" autocomplete="email" maxlength="254" required></div><div class="field"><label for="contact-topic">Topic <span class="required">*</span></label><select id="contact-topic" name="topic" required><option value="clinical">Clinical collaboration</option><option value="research">Research project</option><option value="education">Medical education</option><option value="conference">Conference / speaking</option><option value="medtech">MedTech / Industry</option><option value="other" selected>Other professional inquiry</option></select></div><div class="field full"><label for="contact-message">Message <span class="required">*</span></label><textarea id="contact-message" name="message" minlength="10" maxlength="5000" required></textarea></div></div><div class="honeypot" aria-hidden="true"><label for="contact-website">Website</label><input id="contact-website" name="honeypot" tabindex="-1" autocomplete="off"></div><div class="consent-row"><input id="contact-consent" name="consent" type="checkbox" required><label for="contact-consent">I consent to the processing of the information submitted through this form in accordance with the <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. Do not include patient-identifiable information or medical records.</label></div><div class="form-footer"><button class="button primary" type="submit" data-contact-submit>Send enquiry →</button></div><div class="form-status" data-form-status aria-live="polite"></div></form></div></div>`
      : `<div class="modal" data-contact-modal aria-hidden="true"><div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title"><div class="modal-top"><div><h2 id="contact-modal-title">Профессиональное обращение</h2><p>Заполните форму, не покидая сайт.</p></div><button class="close-button" type="button" data-close-contact aria-label="Закрыть">×</button></div><form data-contact-form><div class="form-grid"><div class="field"><label for="contact-name">Имя <span class="required">*</span></label><input id="contact-name" name="name" autocomplete="name" maxlength="120" required></div><div class="field"><label for="contact-org">Организация / должность</label><input id="contact-org" name="organization" autocomplete="organization" maxlength="180"></div><div class="field"><label for="contact-email">E-mail для ответа <span class="required">*</span></label><input id="contact-email" name="reply_email" type="email" autocomplete="email" maxlength="254" required></div><div class="field"><label for="contact-topic">Тема <span class="required">*</span></label><select id="contact-topic" name="topic" required><option value="clinical">Клиническое взаимодействие</option><option value="research">Научный проект</option><option value="education">Образовательный проект</option><option value="conference">Конференция / выступление</option><option value="medtech">MedTech / Industry</option><option value="other" selected>Другой профессиональный вопрос</option></select></div><div class="field full"><label for="contact-message">Сообщение <span class="required">*</span></label><textarea id="contact-message" name="message" minlength="10" maxlength="5000" required></textarea></div></div><div class="honeypot" aria-hidden="true"><label for="contact-website">Сайт</label><input id="contact-website" name="honeypot" tabindex="-1" autocomplete="off"></div><div class="consent-row"><input id="contact-consent" name="consent" type="checkbox" required><label for="contact-consent">Я согласен на обработку информации, отправленной через форму, в соответствии с <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</a>. Не указывайте персональные данные пациентов и не прикладывайте медицинские документы.</label></div><div class="form-footer"><button class="button primary" type="submit" data-contact-submit>Отправить обращение →</button></div><div class="form-status" data-form-status aria-live="polite"></div></form></div></div>`;
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
  const submitButton = form?.querySelector('[data-contact-submit]');
  const mobileCta = document.querySelector('.mobile-cta');
  let formStartedAt = Date.now();
  let sentSuccessfully = false;

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

  function resetSubmissionUi() {
    if (status) {
      status.className = 'form-status';
      status.textContent = '';
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      submitButton.textContent = isEn ? 'Send enquiry →' : 'Отправить обращение →';
    }
    sentSuccessfully = false;
  }

  function openModal(topic = '') {
    if (!modal) return;
    formStartedAt = Date.now();
    resetSubmissionUi();
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
    if (sentSuccessfully) form?.reset();
    resetSubmissionUi();
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

  function showInvalidField(field) {
    if (!field) return;
    if (status) {
      status.className = 'form-status error';
      status.textContent = isEn
        ? 'Please complete the highlighted required field.'
        : 'Заполните обязательное поле, отмеченное выше.';
    }
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => field.focus({ preventScroll: true }), 250);
  }

  form?.addEventListener('invalid', e => {
    e.preventDefault();
    showInvalidField(e.target);
  }, true);

  function buildPayload() {
    const fd = new FormData(form);
    return {
      name: String(fd.get('name') || '').trim(),
      organization: String(fd.get('organization') || '').trim(),
      reply_email: String(fd.get('reply_email') || '').trim(),
      topic: String(fd.get('topic') || 'other'),
      message: String(fd.get('message') || '').trim(),
      consent: fd.get('consent') === 'on',
      honeypot: String(fd.get('honeypot') || '').trim(),
      started_at: formStartedAt,
      lang: isEn ? 'en' : 'ru'
    };
  }

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const invalid = form.querySelector(':invalid');
    if (invalid) {
      showInvalidField(invalid);
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.textContent = isEn ? 'Sending…' : 'Отправляем…';
    }
    if (status) {
      status.className = 'form-status';
      status.textContent = isEn ? 'Sending your enquiry securely…' : 'Безопасно отправляем обращение…';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(buildPayload())
      });
      let result = {};
      try { result = await response.json(); } catch (_) {}
      if (!response.ok || result.ok !== true) {
        throw new Error(result.message || 'contact_submit_failed');
      }

      sentSuccessfully = true;
      if (status) {
        status.className = 'form-status success';
        status.textContent = isEn
          ? 'Message sent. Thank you — your professional enquiry has been received.'
          : 'Сообщение отправлено. Спасибо — профессиональное обращение получено.';
      }
      if (submitButton) {
        submitButton.textContent = isEn ? 'Message sent ✓' : 'Сообщение отправлено ✓';
        submitButton.removeAttribute('aria-busy');
      }
    } catch (_) {
      if (status) {
        status.className = 'form-status error';
        status.textContent = isEn
          ? 'The message could not be sent. Please try again a little later.'
          : 'Не удалось отправить сообщение. Попробуйте ещё раз немного позже.';
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
        submitButton.textContent = isEn ? 'Try again →' : 'Повторить отправку →';
      }
    }
  });
})();