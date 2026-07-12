(() => {
  const d = (window.SCIENCE_SECTION_CONTENT || {})[window.CURRENT_LANG] || null;
  if (!d) return;

  const owner = 'MatveyShemiakin';
  const repo = 'MatveyShemiakin.github.io';
  const branch = 'main';
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;

  function resolveScienceAsset(src) {
    if (!src) return '';
    if (src.startsWith('/assets/science/')) return `${rawBase}${src}`;
    return src;
  }

  function image(src, alt = '') {
    const actual = resolveScienceAsset(src);
    return `<img src="${actual}" alt="${alt}" loading="lazy">`;
  }

  function list(items) {
    return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  }

  function paperCard(p) {
    return `<article class="paper-card"><h3>${p.title}</h3><p class="journal">${p.journal}</p><p class="meta">${p.authors}</p>${p.doi ? `<a class="btn btn-small" href="${p.doi}" target="_blank" rel="noopener">DOI</a>` : ''}</article>`;
  }

  function conferenceCard(c) {
    return `<article class="conf-card">${image(c.image, c.title)}<div class="conf-body"><div class="conf-year">${c.year}</div><h3>${c.title}</h3><p>${c.text}</p></div></article>`;
  }

  const html = `
    <section class="section section-light" id="science-section">
      <div class="container">
        <div class="section-header left">
          <span class="eyebrow">${d.navLabel}</span>
          <h2>${d.hero.title}</h2>
          <p>${d.hero.text}</p>
          <div class="science-links">
            <a class="btn btn-primary" href="${d.links.istina}" target="_blank" rel="noopener">Istina MSU</a>
            <a class="btn btn-ghost" href="${d.links.orcid}" target="_blank" rel="noopener">ORCID</a>
            <a class="btn btn-ghost" href="${d.links.elibrary}" target="_blank" rel="noopener">eLIBRARY</a>
          </div>
        </div>

        <div class="science-hero-grid">
          <div class="science-hero-image">${image(d.hero.image || '/assets/science/mko-2026-hero.jpg', d.hero.title)}</div>
          <div class="science-hero-stats">
            <div class="science-stat"><strong>${d.stats.papers}</strong><span>${window.CURRENT_LANG === 'ru' ? 'публикаций' : 'publications'}</span></div>
            <div class="science-stat"><strong>${d.stats.citations}</strong><span>${window.CURRENT_LANG === 'ru' ? 'цитирования' : 'citations'}</span></div>
            <div class="science-stat"><strong>${d.stats.hindex}</strong><span>H-index</span></div>
          </div>
        </div>

        <div class="science-grid-3">
          <article class="science-panel">
            <h3>${d.categoriesTitle}</h3>
            ${list(d.categories)}
          </article>
          <article class="science-panel science-panel-wide">
            <h3>${d.topPapersTitle}</h3>
            <div class="papers-grid">${d.papers.map(paperCard).join('')}</div>
          </article>
        </div>

        <div class="science-grid-3 conferences-wrap">
          <article class="science-panel science-panel-wide full-span">
            <h3>${d.conferencesTitle}</h3>
            <div class="conferences-grid">${d.conferences.map(conferenceCard).join('')}</div>
          </article>
        </div>
      </div>
    </section>`;

  const mount = document.getElementById('science-mount');
  if (mount) mount.innerHTML = html;
})();