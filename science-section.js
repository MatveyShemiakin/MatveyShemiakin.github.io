(() => {
  const target = document.getElementById('science');
  const source = window.SCIENCE_SECTION_CONTENT;
  if (!target || !source) return;

  if (!document.querySelector('link[href*="science-section.css"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/science-section.css?v=20260712-2';
    document.head.appendChild(stylesheet);
  }

  const language = location.pathname.startsWith('/en') ? 'en' : 'ru';
  const d = source[language];
  const links = source.links;
  const externalLink = (href, html, className = '') => `<a class="${className}" href="${href}" target="_blank" rel="noopener noreferrer">${html}</a>`;

  const stats = d.stats
    .map(([value, label]) => `<div class="science-fact"><strong>${value}</strong><span>${label}</span></div>`)
    .join('');

  const conferences = d.conferences.map((item) => {
    const classes = ['science-conference-card'];
    if (item.wide) classes.push('science-conference-card--wide');
    if (item.portrait) classes.push('science-conference-card--portrait');
    const href = item.link || links[item.linkKey];
    return `<article class="${classes.join(' ')}">
      ${externalLink(item.image, `<img src="${item.image}" alt="${item.alt}" loading="lazy">`, 'science-conference-image')}
      <div class="science-conference-content">
        <span class="science-conference-year">${item.year}</span>
        <h4>${item.title}</h4>
        <p class="science-conference-meta">${item.meta}</p>
        <p>${item.text}</p>
        ${externalLink(href, item.linkText)}
      </div>
    </article>`;
  }).join('');

  const publications = d.publications
    .map(([year, title, meta]) => `<li><span class="science-publication-year">${year}</span><div><h4>${title}</h4><p>${meta}</p></div></li>`)
    .join('');

  target.className = 'science-section';
  target.innerHTML = `<div class="science-shell">
    <div class="science-hero">
      <div class="science-hero__copy">
        <p class="science-eyebrow">${d.hero.kicker}</p>
        <h2>${d.hero.title}</h2>
        <p class="science-hero__lead">${d.hero.lead}</p>
        <div class="science-actions" aria-label="Scientific profiles">
          ${externalLink(links.istina, d.labels.istina, 'science-button science-button--primary')}
          ${externalLink(links.orcid, 'ORCID ↗', 'science-button science-button--ghost')}
          ${externalLink(links.rsci, d.labels.rinz, 'science-button science-button--ghost')}
        </div>
        <div class="science-identifiers"><span>IRID 691089486</span><span>ORCID 0000-0003-1537-1405</span><span>SPIN 7070-4286</span></div>
      </div>
      <figure class="science-hero__media">
        <img src="/assets/science/mko-2026-hero.svg" alt="${d.hero.alt}" loading="lazy">
        <div class="science-hero__shade" aria-hidden="true"></div>
        <figcaption><span class="science-caption-date">${d.hero.date}</span><strong>${d.hero.event}</strong><span>${d.hero.subtitle}</span></figcaption>
      </figure>
    </div>
    <div class="science-facts">
      <div class="science-facts__intro"><p class="science-eyebrow">${d.labels.interests}</p><p>${d.interests}</p></div>
      ${stats}
    </div>
    <div class="science-block">
      <div class="science-heading"><div><p class="science-eyebrow">${d.labels.conferenceKicker}</p><h3>${d.labels.conferenceTitle}</h3></div>${externalLink(links.talks, d.labels.allTalks, 'science-text-link')}</div>
      <div class="science-conference-grid">${conferences}</div>
    </div>
    <div class="science-block science-block--compact">
      <div class="science-heading"><div><p class="science-eyebrow">${d.labels.publicationKicker}</p><h3>${d.labels.publicationTitle}</h3></div>${externalLink(links.publications, d.labels.allPublications, 'science-text-link')}</div>
      <ol class="science-publication-list">${publications}</ol>
    </div>
    <div class="science-block science-block--compact">
      <div class="science-heading"><div><p class="science-eyebrow">${d.labels.profileKicker}</p><h3>${d.labels.profileTitle}</h3></div></div>
      <div class="science-profile-grid">
        ${externalLink(links.istina, '<span class="science-profile-mark">I</span><span class="science-profile-copy"><strong>ISTINA</strong><small>IRID 691089486</small></span><span class="science-profile-arrow">↗</span>', 'science-profile-card')}
        ${externalLink(links.orcid, '<span class="science-profile-mark">iD</span><span class="science-profile-copy"><strong>ORCID</strong><small>0000-0003-1537-1405</small></span><span class="science-profile-arrow">↗</span>', 'science-profile-card')}
        ${externalLink(links.rsci, `<span class="science-profile-mark">${language === 'en' ? 'R' : 'Р'}</span><span class="science-profile-copy"><strong>${language === 'en' ? 'RSCI / SPIN' : 'РИНЦ / SPIN'}</strong><small>7070-4286</small></span><span class="science-profile-arrow">↗</span>`, 'science-profile-card')}
      </div>
    </div>
  </div>`;
})();
