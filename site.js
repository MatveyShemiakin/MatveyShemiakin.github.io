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

  function setupViewportVideo(language) {
    const video = document.getElementById('media-video');
    const shell = video && video.closest('.video-shell');
    if (!video || !shell || shell.dataset.autoplayReady === 'true') return;

    shell.dataset.autoplayReady = 'true';
    shell.classList.add('viewport-video');

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const labels = language === 'en'
      ? { soundOn: 'Turn sound on', soundOff: 'Mute', soundOnAria: 'Turn video sound on', soundOffAria: 'Mute video' }
      : { soundOn: 'Включить звук', soundOff: 'Выключить звук', soundOnAria: 'Включить звук видео', soundOffAria: 'Выключить звук видео' };

    const style = document.createElement('style');
    style.textContent = `
      .viewport-video{position:relative}
      .viewport-video video{width:100%;height:auto}
      .video-sound-toggle{
        position:absolute;z-index:3;top:16px;right:16px;
        display:inline-flex;align-items:center;gap:8px;
        min-height:42px;padding:0 14px;border:1px solid rgba(255,255,255,.72);
        border-radius:999px;background:rgba(4,18,37,.76);color:#fff;
        font:700 12px/1.2 var(--sans);letter-spacing:.02em;cursor:pointer;
        box-shadow:0 10px 28px rgba(0,0,0,.26);backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);transition:background .2s ease,transform .2s ease
      }
      .video-sound-toggle:hover{background:rgba(13,43,81,.92);transform:translateY(-1px)}
      .video-sound-toggle:focus-visible{outline:3px solid rgba(135,181,255,.9);outline-offset:3px}
      .video-sound-toggle-icon{font-size:16px;line-height:1}
      @media(max-width:680px){
        .video-sound-toggle{top:10px;right:10px;min-height:38px;padding:0 12px;font-size:11px}
        .video-sound-toggle-icon{font-size:15px}
      }
      @media(prefers-reduced-motion:reduce){.video-sound-toggle{transition:none}}
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-sound-toggle';

    const icon = document.createElement('span');
    icon.className = 'video-sound-toggle-icon';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    button.append(icon, text);
    shell.appendChild(button);

    const updateSoundButton = () => {
      const muted = video.muted || video.volume === 0;
      icon.textContent = muted ? '🔇' : '🔊';
      text.textContent = muted ? labels.soundOn : labels.soundOff;
      button.setAttribute('aria-label', muted ? labels.soundOnAria : labels.soundOffAria);
      button.setAttribute('aria-pressed', String(!muted));
    };

    let automaticAction = false;
    let manuallyPaused = false;
    let mostlyVisible = false;

    const playAutomatically = () => {
      if (!video.paused || video.ended || manuallyPaused) return;
      automaticAction = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.finally === 'function') {
        playPromise.catch(() => {}).finally(() => { automaticAction = false; });
      } else {
        window.setTimeout(() => { automaticAction = false; }, 0);
      }
    };

    const pauseAutomatically = () => {
      if (video.paused) return;
      automaticAction = true;
      video.pause();
      window.setTimeout(() => { automaticAction = false; }, 0);
    };

    video.addEventListener('play', () => {
      if (!automaticAction) manuallyPaused = false;
    });

    video.addEventListener('pause', () => {
      if (!automaticAction && !video.ended) manuallyPaused = true;
    });

    video.addEventListener('volumechange', updateSoundButton);
    video.addEventListener('ended', () => { manuallyPaused = true; });

    button.addEventListener('click', () => {
      video.muted = !(video.muted || video.volume === 0);
      if (!video.muted && video.volume === 0) video.volume = 1;
      manuallyPaused = false;
      if (video.paused) video.play().catch(() => {});
      updateSoundButton();
    });

    updateSoundButton();

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    const autoplayEnabled = !reduceMotion && !saveData;

    if ('IntersectionObserver' in window && autoplayEnabled) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          mostlyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.55;
          if (mostlyVisible) {
            playAutomatically();
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
            pauseAutomatically();
          }
        });
      }, { threshold: [0, 0.2, 0.55, 0.85] });

      observer.observe(video);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          pauseAutomatically();
        } else if (mostlyVisible) {
          playAutomatically();
        }
      });
    }
  }

  render(currentLanguage);
  setupViewportVideo(currentLanguage);

  const scienceDataScript = document.createElement('script');
  scienceDataScript.src = '/science-section-data.js?v=20260712-5';
  scienceDataScript.onload = () => {
    const scienceScript = document.createElement('script');
    scienceScript.src = '/science-section.js?v=20260712-10';
    document.body.appendChild(scienceScript);
  };
  document.body.appendChild(scienceDataScript);
})();
