(() => {
  const target = document.getElementById('science');
  const source = window.SCIENCE_SECTION_CONTENT;
  if (!target || !source) return;

  if (!document.querySelector('link[href*="science-section.css"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/science-section.css?v=20260712-4';
    document.head.appendChild(stylesheet);
  }

  const language = location.pathname.startsWith('/en') ? 'en' : 'ru';
  const d = source[language];
  if (!d) return;

  const links = {
    istina: 'https://istina.msu.ru/workers/691089486/',
    talks: 'https://istina.msu.ru/workers/691089486/talks/',
    publications: 'https://istina.msu.ru/workers/691089486/publications/',
    orcid: 'https://orcid.org/0000-0003-1537-1405',
    rsci: 'https://www.elibrary.ru/authors.asp?spin=7070-4286'
  };

  const ru = language === 'ru';
  const externalLink = (href, html, className = '') =>
    `<a class="${className}" href="${href}" target="_blank" rel="noopener noreferrer">${html}</a>`;

  const imageMarkup = (src, alt, eager = false) =>
    `<img src="${src}" alt="${alt}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;

  const statsData = ru
    ? [['15', 'статей'], ['17', 'докладов'], ['4', 'патента'], ['1', 'свидетельство на ПО']]
    : [['15', 'articles'], ['17', 'presentations'], ['4', 'patents'], ['1', 'software certificate']];

  const stats = statsData
    .map(([value, label]) => `<div class="science-fact"><strong>${value}</strong><span>${label}</span></div>`)
    .join('');

  const conferenceImages = [
    d.conferences?.[0]?.image || '/assets/science/mko-2026-stage.jpg',
    d.conferences?.[1]?.image || '/assets/science/mko-2025.jpg',
    d.conferences?.[2]?.image || '/assets/science/vospalenie-2023.jpg'
  ];

  const conferencesData = ru ? [
    {
      year: '2026',
      title: 'II Московский конгресс офтальмологов',
      meta: 'Москва · 18 апреля 2026',
      text: 'Учёный доклад «Дороги, которые мы выбираем: опыт хирургии пациентов с прогрессирующим инфекционным воспалением переднего отдела глаза».',
      image: conferenceImages[0],
      alt: 'Выступление на II Московском конгрессе офтальмологов',
      wide: true,
      href: links.talks,
      linkText: 'Проверить в ИСТИНЕ ↗'
    },
    {
      year: '2025',
      title: 'I Московский конгресс офтальмологов',
      meta: 'Москва · 19 апреля 2025',
      text: 'Участие в научной программе конгресса. Перечень докладов представлен в профиле ИСТИНА.',
      image: conferenceImages[1],
      alt: 'Выступление на I Московском конгрессе офтальмологов',
      href: links.talks,
      linkText: 'Перечень докладов ↗'
    },
    {
      year: '2023',
      title: 'III Всероссийская конференция с международным участием «Воспаление глаза»',
      meta: 'Москва · 11 ноября 2023',
      text: 'Устные доклады: «Нетипичный в лечении бактериальный кератит и язва роговицы — потенциал и перспективы»; «Микробный профиль при воспалительных заболеваниях роговицы, требующих проведения сквозной кератопластики».',
      image: conferenceImages[2],
      alt: 'Выступление на III Всероссийской конференции «Воспаление глаза»',
      portrait: true,
      href: 'https://vospalenie.oor.ru/itogi',
      linkText: 'Проверить в источнике ↗'
    }
  ] : [
    {
      year: '2026',
      title: 'Second Moscow Congress of Ophthalmologists',
      meta: 'Moscow · 18 April 2026',
      text: 'Scientific presentation on surgical management of progressive infectious inflammation of the anterior segment.',
      image: conferenceImages[0],
      alt: 'Presentation at the Second Moscow Congress of Ophthalmologists',
      wide: true,
      href: links.talks,
      linkText: 'Verify on ISTINA ↗'
    },
    {
      year: '2025',
      title: 'First Moscow Congress of Ophthalmologists',
      meta: 'Moscow · 19 April 2025',
      text: 'Participation in the scientific programme. The complete presentation list is available in the ISTINA profile.',
      image: conferenceImages[1],
      alt: 'Presentation at the First Moscow Congress of Ophthalmologists',
      href: links.talks,
      linkText: 'Presentation list ↗'
    },
    {
      year: '2023',
      title: 'Third All-Russian Conference with International Participation “Eye Inflammation”',
      meta: 'Moscow · 11 November 2023',
      text: 'Oral presentations on atypical bacterial keratitis and corneal ulcer management, and on the microbial profile of inflammatory corneal diseases requiring penetrating keratoplasty.',
      image: conferenceImages[2],
      alt: 'Presentation at the Third All-Russian Eye Inflammation Conference',
      portrait: true,
      href: 'https://vospalenie.oor.ru/itogi',
      linkText: 'Verify source ↗'
    }
  ];

  const conferences = conferencesData.map((item) => {
    const classes = ['science-conference-card'];
    if (item.wide) classes.push('science-conference-card--wide');
    if (item.portrait) classes.push('science-conference-card--portrait');
    return `<article class="${classes.join(' ')}">
      ${externalLink(item.href, imageMarkup(item.image, item.alt), 'science-conference-image')}
      <div class="science-conference-content">
        <span class="science-conference-year">${item.year}</span>
        <h4>${item.title}</h4>
        <p class="science-conference-meta">${item.meta}</p>
        <p>${item.text}</p>
        ${externalLink(item.href, item.linkText)}
      </div>
    </article>`;
  }).join('');

  const publicationsData = ru ? [
    ['2025', 'Современное понимание работы системы факоэмульсификации при хирургии катаракты различной плотности', 'Г. Ш. Аржиматова, В. Е. Белкин, М. Ю. Шемякин · «Офтальмохирургия».'],
    ['2025', 'Современный подход к рациональной терапии бактериального кератита перед сквозной кератопластикой', 'М. Ю. Шемякин и соавт. · «РМЖ. Клиническая офтальмология».'],
    ['2024', 'Статистический анализ факторов риска болезни сквозного трансплантата роговицы при проведении кератопластики высокого риска', 'Г. Ш. Аржиматова, Г. М. Чернакова, Э. А. Салихов, М. Ю. Шемякин · «Офтальмология». 2024;21(3):509–516.']
  ] : [
    ['2025', 'Current Understanding of Phacoemulsification System Performance in Cataract Surgery of Different Densities', 'G. Sh. Arzhimatova, V. E. Belkin, M. Yu. Shemyakin · Fyodorov Journal of Ophthalmic Surgery.'],
    ['2025', 'A Modern Approach to Rational Therapy of Bacterial Keratitis Before Penetrating Keratoplasty', 'M. Yu. Shemyakin et al. · RMJ Clinical Ophthalmology.'],
    ['2024', 'Statistical Analysis of Risk Factors in High-Risk Penetrating Keratoplasty', 'G. Sh. Arzhimatova, G. M. Chernakova, E. A. Salikhov, M. Yu. Shemyakin · Ophthalmology in Russia. 2024;21(3):509–516.']
  ];

  const publications = publicationsData
    .map(([year, title, meta]) => `<li><span class="science-publication-year">${year}</span><div><h4>${title}</h4><p>${meta}</p></div></li>`)
    .join('');

  const heroTitle = ru ? 'Научная<br>деятельность' : 'Scientific<br>activity';
  const heroLead = ru
    ? 'Исследования, публикации и выступления на российских и международных офтальмологических конгрессах.'
    : 'Research, publications, and presentations at Russian and international ophthalmology congresses.';
  const heroKicker = ru ? 'Профессиональный профиль' : 'Professional profile';
  const interests = ru
    ? 'Хирургия осложнённой катаракты; диагностика и хирургическое лечение дислокаций интраокулярных линз; хирургическое лечение глаукомы; патология сетчатки; патология роговицы.'
    : 'Complex cataract surgery; diagnosis and surgical management of intraocular lens dislocation; glaucoma surgery; retinal pathology; corneal pathology.';

  target.className = 'science-section';
  target.innerHTML = `<div class="science-shell">
    <div class="science-hero">
      <div class="science-hero__copy">
        <p class="science-eyebrow">${heroKicker}</p>
        <h2>${heroTitle}</h2>
        <p class="science-hero__lead">${heroLead}</p>
        <div class="science-actions" aria-label="Scientific profiles">
          ${externalLink(links.istina, ru ? 'Профиль в ИСТИНЕ ↗' : 'ISTINA profile ↗', 'science-button science-button--primary')}
          ${externalLink(links.orcid, 'ORCID ↗', 'science-button science-button--ghost')}
          ${externalLink(links.rsci, ru ? 'РИНЦ / SPIN ↗' : 'RSCI / SPIN ↗', 'science-button science-button--ghost')}
        </div>
        <div class="science-identifiers"><span>IRID 691089486</span><span>ORCID 0000-0003-1537-1405</span><span>SPIN 7070-4286</span></div>
      </div>
      <figure class="science-hero__media">
        ${imageMarkup(d.hero.image, ru ? 'Матвей Шемякин выступает на II Московском конгрессе офтальмологов' : 'Matvey Shemyakin speaking at the Second Moscow Congress of Ophthalmologists', true)}
        <div class="science-hero__shade" aria-hidden="true"></div>
        <figcaption><span class="science-caption-date">${ru ? '18 апреля 2026 · Москва' : '18 April 2026 · Moscow'}</span><strong>${ru ? 'II Московский конгресс офтальмологов с международным участием' : 'Second Moscow Congress of Ophthalmologists with International Participation'}</strong><span>${ru ? '200 лет Московской глазной больнице' : '200 years of the Moscow Eye Hospital'}</span></figcaption>
      </figure>
    </div>
    <div class="science-facts">
      <div class="science-facts__intro"><p class="science-eyebrow">${ru ? 'Научные интересы' : 'Research interests'}</p><p>${interests}</p>${externalLink(links.istina, ru ? 'Источник: профиль ИСТИНА ↗' : 'Source: ISTINA profile ↗')}</div>
      ${stats}
    </div>
    <div class="science-block">
      <div class="science-heading"><div><p class="science-eyebrow">${ru ? 'Конгрессы и конференции' : 'Congresses and conferences'}</p><h3>${ru ? 'Выступления перед профессиональным сообществом' : 'Presentations to the professional community'}</h3></div>${externalLink(links.talks, ru ? 'Все доклады в ИСТИНЕ ↗' : 'All presentations on ISTINA ↗', 'science-text-link')}</div>
      <div class="science-conference-grid">${conferences}</div>
    </div>
    <div class="science-block science-block--compact">
      <div class="science-heading"><div><p class="science-eyebrow">${ru ? 'Научные статьи' : 'Scientific articles'}</p><h3>${ru ? 'Избранные публикации' : 'Selected publications'}</h3></div>${externalLink(links.publications, ru ? 'Все публикации ↗' : 'All publications ↗', 'science-text-link')}</div>
      <ol class="science-publication-list">${publications}</ol>
    </div>
    <div class="science-block science-block--compact">
      <div class="science-heading"><div><p class="science-eyebrow">${ru ? 'Идентификация автора' : 'Author identification'}</p><h3>${ru ? 'Научные профили' : 'Scientific profiles'}</h3></div></div>
      <div class="science-profile-grid">
        ${externalLink(links.istina, '<span class="science-profile-mark">И</span><span class="science-profile-copy"><strong>ИСТИНА</strong><small>IRID 691089486</small></span><span class="science-profile-arrow">↗</span>', 'science-profile-card')}
        ${externalLink(links.orcid, '<span class="science-profile-mark">iD</span><span class="science-profile-copy"><strong>ORCID</strong><small>0000-0003-1537-1405</small></span><span class="science-profile-arrow">↗</span>', 'science-profile-card')}
        ${externalLink(links.rsci, `<span class="science-profile-mark">${ru ? 'Р' : 'R'}</span><span class="science-profile-copy"><strong>${ru ? 'РИНЦ / SPIN' : 'RSCI / SPIN'}</strong><small>7070-4286</small></span><span class="science-profile-arrow">↗</span>`, 'science-profile-card')}
      </div>
    </div>
  </div>`;
})();