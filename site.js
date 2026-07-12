(function () {
  const data = window.SITE_CONTENT;
  const pathLanguage = window.location.pathname.startsWith('/en') ? 'en' : 'ru';
  const params = new URLSearchParams(window.location.search);

  if (params.get('lang') === 'en' && pathLanguage !== 'en') {
    window.location.replace('/en/');
    return;
  }
  if (params.get('lang') === 'ru' && pathLanguage !== 'ru') {
    window.location.replace('/');
    return;
  }

  const currentLanguage = pathLanguage;
  const getByPath = (object, path) =>
    path.split('.').reduce((acc, key) => acc && acc[key], object);

  const createContent = (language) => ({
    ...data[language],
    links: data.shared.links,
    media: {
      ...data[language].media,
      video: data.shared.media.video.startsWith('/') ? data.shared.media.video : '/' + data.shared.media.video,
      poster: data.shared.media.poster.startsWith('/') ? data.shared.media.poster : '/' + data.shared.media.poster
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
    const content = createContent(language);

    document.documentElement.lang = language;

    const year = document.getElementById('current-year');
    if (year) year.textContent = new Date().getFullYear();

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

    document.querySelectorAll('.language-button').forEach((link) => {
      const linkLanguage = link.getAttribute('hreflang');
      const active = linkLanguage === language;
      link.classList.toggle('active', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
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
    if (video) {
      video.poster = content.media.poster;
      if (video.currentSrc !== content.media.video) {
        video.src = content.media.video;
        video.load();
      }
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

  render(currentLanguage);

  const scienceDataScript = document.createElement('script');
  scienceDataScript.src = '/science-section-data.js?v=20260712-5';
  scienceDataScript.onload = () => {
    const scienceScript = document.createElement('script');
    scienceScript.src = '/science-section.js?v=20260712-10';
    document.body.appendChild(scienceScript);
  };
  document.body.appendChild(scienceDataScript);
})();