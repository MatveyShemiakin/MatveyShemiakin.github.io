(function () {
  const storageKey = 'shemyakin_site_content_v4';
  const languageKey = 'shemyakin_site_language';

  let data = window.SITE_CONTENT;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try { data = JSON.parse(stored); } catch (_) {}
  }

  const availableLanguages = ['ru', 'en'];
  const params = new URLSearchParams(window.location.search);
  let currentLanguage = params.get('lang') || localStorage.getItem(languageKey) || data.defaultLanguage || 'ru';
  if (!availableLanguages.includes(currentLanguage)) currentLanguage = 'ru';

  const getByPath = (object, path) =>
    path.split('.').reduce((acc, key) => acc && acc[key], object);

  const createContent = (language) => ({
    ...data[language],
    links: data.shared.links,
    media: {
      ...data[language].media,
      video: data.shared.media.video,
      poster: data.shared.media.poster
    }
  });

  const clearElement = (id) => {
    const element = document.getElementById(id);
    if (element) element.replaceChildren();
    return element;
  };

  const createTextElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  };

  function render(language) {
    currentLanguage = language;
    const content = createContent(language);

    document.documentElement.lang = language;
    document.title = content.meta.title;
    document.querySelector('meta[name="description"]').setAttribute('content', content.meta.description);
    document.getElementById('current-year').textContent = new Date().getFullYear();

    document.querySelectorAll('[data-text]').forEach((element) => {
      const value = getByPath(content, element.dataset.text);
      if (value !== undefined) element.textContent = value;
    });

    document.querySelectorAll('[data-href]').forEach((element) => {
      const value = getByPath(content, element.dataset.href);
      if (value) element.href = value;
    });

    document.querySelectorAll('[data-alt]').forEach((element) => {
      const value = getByPath(content, element.dataset.alt);
      if (value) element.alt = value;
    });

    document.querySelectorAll('[data-aria-label]').forEach((element) => {
      const value = getByPath(content, element.dataset.ariaLabel);
      if (value) element.setAttribute('aria-label', value);
    });

    document.querySelectorAll('.language-button').forEach((button) => {
      const active = button.dataset.lang === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const cards = clearElement('directions-cards');
    content.directions.cards.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'direction-card';
      article.append(
        createTextElement('span', '', item.number),
        createTextElement('h3', '', item.title),
        createTextElement('p', '', item.text)
      );
      cards.appendChild(article);
    });

    const aboutParagraphs = clearElement('about-paragraphs');
    content.about.paragraphs.forEach((text) => {
      aboutParagraphs.appendChild(createTextElement('p', '', text));
    });

    const facts = clearElement('about-facts');
    content.about.facts.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'fact';
      div.append(
        createTextElement('span', '', item.label),
        createTextElement('strong', '', item.value)
      );
      facts.appendChild(div);
    });

    const video = document.getElementById('media-video');
    if (video.src !== content.media.video) {
      video.src = content.media.video;
      video.poster = content.media.poster;
      video.load();
    } else {
      video.poster = content.media.poster;
    }

    const timeline = clearElement('education-timeline');
    content.education.items.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'timeline-item';
      const copy = document.createElement('div');
      copy.append(
        createTextElement('h3', '', item.title),
        createTextElement('p', '', item.text)
      );
      row.append(
        createTextElement('div', 'timeline-year', item.year),
        copy
      );
      timeline.appendChild(row);
    });

    const metrics = clearElement('science-metrics');
    content.science.metrics.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'metric';
      div.append(
        createTextElement('strong', '', item.value),
        createTextElement('span', '', item.label)
      );
      metrics.appendChild(div);
    });

    const publications = clearElement('science-publications');
    content.science.publications.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'publication';

      const copy = document.createElement('div');
      copy.append(
        createTextElement('h3', '', item.title),
        createTextElement('p', '', item.meta)
      );

      article.append(
        createTextElement('div', 'pub-year', item.year),
        copy
      );

      if (item.link) {
        const link = document.createElement('a');
        link.href = item.link;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = content.ui.openLink + ' ↗';
        article.appendChild(link);
      } else {
        article.appendChild(document.createElement('span'));
      }

      publications.appendChild(article);
    });
  }

  document.querySelectorAll('.language-button').forEach((button) => {
    button.addEventListener('click', () => {
      const language = button.dataset.lang;
      localStorage.setItem(languageKey, language);

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('lang', language);
      window.history.replaceState({}, '', nextUrl);

      render(language);
    });
  });

  render(currentLanguage);
})();
