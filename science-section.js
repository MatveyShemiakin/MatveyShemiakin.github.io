(() => {
  const target = document.getElementById('science');
  if (!target) return;

  const ISTINA = 'https://istina.msu.ru/workers/691089486/';
  const TALKS = `${ISTINA}talks/`;
  const PUBLICATIONS = `${ISTINA}publications/`;
  const ORCID = 'https://orcid.org/0000-0003-1537-1405';
  const RSCI = 'https://www.elibrary.ru/authors.asp?spin=7070-4286';

  const content = {
    ru: {
      hero: {
        kicker: 'Профессиональный профиль',
        title: 'Научная<br>деятельность',
        lead: 'Исследования, публикации и выступления на российских и международных офтальмологических конгрессах.',
        date: '18 апреля 2026 · Москва',
        event: 'II Московский конгресс офтальмологов с международным участием',
        subtitle: '200 лет Московской глазной больнице',
        alt: 'Матвей Шемякин выступает на II Московском конгрессе офтальмологов'
      },
      interests: 'Хирургия осложнённой катаракты; диагностика и хирургическое лечение дислокаций интраокулярных линз; хирургическое лечение глаукомы; патология сетчатки; патология роговицы.',
      stats: [['15', 'статей'], ['17', 'докладов'], ['4', 'патента'], ['1', 'свидетельство на ПО']],
      labels: {
        interests: 'Научные интересы',
        istina: 'Профиль в ИСТИНЕ ↗',
        rinz: 'РИНЦ / SPIN ↗',
        conferenceKicker: 'Конгрессы и конференции',
        conferenceTitle: 'Выступления перед профессиональным сообществом',
        allTalks: 'Все доклады в ИСТИНЕ ↗',
        publicationKicker: 'Научные статьи',
        publicationTitle: 'Избранные публикации',
        allPublications: 'Все публикации ↗',
        profileKicker: 'Идентификация автора',
        profileTitle: 'Научные профили'
      },
      conferences: [
        {
          year: '2026',
          title: 'II Московский конгресс офтальмологов',
          meta: 'Москва · 18 апреля 2026',
          text: 'Участие в научной программе конгресса. Перечень докладов представлен в профиле ИСТИНА.',
          image: '/assets/science/mko-2026-stage.svg',
          alt: 'Выступление на II Московском конгрессе офтальмологов',
          wide: true,
          link: TALKS,
          linkText: 'Перечень докладов ↗'
        },
        {
          year: '2025',
          title: 'I Московский конгресс офтальмологов',
          meta: 'Москва · 19 апреля 2025',
          text: 'Участие в научной программе конгресса. Перечень докладов представлен в профиле ИСТИНА.',
          image: '/assets/science/mko-2025.svg',
          alt: 'Выступление на I Московском конгрессе офтальмологов',
          link: TALKS,
          linkText: 'Перечень докладов ↗'
        },
        {
          year: '2023',
          title: 'III Всероссийская конференция с международным участием «Воспаление глаза»',
          meta: 'Москва · 11 ноября 2023',
          text: 'Участие в научной программе конференции. Сведения о докладах представлены в профиле ИСТИНА и официальных материалах мероприятия.',
          image: '/assets/science/vospalenie-2023.svg',
          alt: 'Выступление на III Всероссийской конференции «Воспаление глаза»',
          portrait: true,
          link: 'https://vospalenie.oor.ru/itogi',
          linkText: 'Официальные итоги ↗'
        }
      ],
      publications: [
        ['2025', 'Современное понимание работы системы факоэмульсификации при хирургии катаракты различной плотности', 'Г. Ш. Аржиматова, В. Е. Белкин, М. Ю. Шемякин · «Офтальмохирургия».'],
        ['2025', 'Современный подход к рациональной терапии бактериального кератита перед сквозной кератопластикой', 'М. Ю. Шемякин и соавт. · «РМЖ. Клиническая офтальмология».'],
        ['2024', 'Статистический анализ факторов риска болезни сквозного трансплантата роговицы при проведении кератопластики высокого риска', 'Г. Ш. Аржиматова, Г. М. Чернакова, Э. А. Салихов, М. Ю. Шемякин · «Офтальмология». 2024;21(3):509–516.']
      ]
    },
    en: {
      hero: {
        kicker: 'Professional profile',
        title: 'Scientific<br>activity',
        lead: 'Research, publications, and presentations at Russian and international ophthalmology congresses.',
        date: '18 April 2026 · Moscow',
        event: 'Second Moscow Congress of Ophthalmologists with International Participation',
        subtitle: '200 years of the Moscow Eye Hospital',
        alt: 'Matvey Shemyakin speaking at the Second Moscow Congress of Ophthalmologists'
      },
      interests: 'Complex cataract surgery; diagnosis and surgical management of intraocular lens dislocation; glaucoma surgery; retinal pathology; corneal pathology.',
      stats: [['15', 'articles'], ['17', 'presentations'], ['4', 'patents'], ['1', 'software certificate']],
      labels: {
        interests: 'Research interests',
        istina: 'ISTINA profile ↗',
        rinz: 'RSCI / SPIN ↗',
        conferenceKicker: 'Congresses and conferences',
        conferenceTitle: 'Presentations to the professional community',
        allTalks: 'All presentations on ISTINA ↗',
        publicationKicker: 'Scientific articles',
        publicationTitle: 'Selected publications',
        allPublications: 'All publications ↗',
        profileKicker: 'Author identification',
        profileTitle: 'Scientific profiles'
      },
      conferences: [
        {
          year: '2026',
          title: 'Second Moscow Congress of Ophthalmologists',
          meta: 'Moscow · 18 April 2026',
          text: 'Participation in the scientific programme. The complete presentation list is available in the ISTINA profile.',
          image: '/assets/science/mko-2026-stage.svg',
          alt: 'Presentation at the Second Moscow Congress of Ophthalmologists',
          wide: true,
          link: TALKS,
          linkText: 'Presentation list ↗'
        },
        {
          year: '2025',
          title: 'First Moscow Congress of Ophthalmologists',
          meta: 'Moscow · 19 April 2025',
          text: 'Participation in the scientific programme. The complete presentation list is available in the ISTINA profile.',
          image: '/assets/science/mko-2025.svg',
          alt: 'Presentation at the First Moscow Congress of Ophthalmologists',
          link: TALKS,
          linkText: 'Presentation list ↗'
        },
        {
          year: '2023',
          title: 'Third All-Russian Conference with International Participation “Eye Inflammation”',
          meta: 'Moscow · 11 November 2023',
          text: 'Participation in the scientific programme. Presentation details are available in the ISTINA profile and official conference materials.',
          image: '/assets/science/vospalenie-2023.svg',
          alt: 'Presentation at the Third All-Russian Eye Inflammation Conference',
          portrait: true,
          link: 'https://vospalenie.oor.ru/itogi',
          linkText: 'Official conference report ↗'
        }
      ],
      publications: [
        ['2025', 'Current Understanding of Phacoemulsification System Performance in Cataract Surgery of Different Densities', 'G. Sh. Arzhimatova, V. E. Belkin, M. Yu. Shemyakin · Fyodorov Journal of Ophthalmic Surgery.'],
        ['2025', 'A Modern Approach to Rational Therapy of Bacterial Keratitis Before Penetrating Keratoplasty', 'M. Yu. Shemyakin et al. · RMJ Clinical Ophthalmology.'],
        ['2024', 'Statistical Analysis of Risk Factors in High-Risk Penetrating Keratoplasty', 'G. Sh. Arzhimatova, G. M. Chernakova, E. A. Salikhov, M. Yu. Shemyakin · Ophthalmology in Russia. 2024;21(3):509–516.']
      ]
    }
  };

  if (!document.querySelector('link[href*="science-section.css"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/science-section.css?v=20260712-2';
    document.head.appendChild(stylesheet);
  }

  const language = location.pathname.startsWith('/en') ? 'en' : 'ru';
  const d = content[language];
  const externalLink = (href, html, className = '') => `<a class="${className}" href="${href}" target="_blank" rel="noopener noreferrer">${html}</a>`;

  const stats = d.stats.map(([value, label]) => `<div class="science-fact"><strong>${value}</strong><span>${label}</span></div>`).join('');
  const conferences = d.conferences.map((item) => {
    const classes = ['science-conference-card'];
    if (item.wide) classes.push('science-conference-card--wide');
    if (item.portrait) classes.push('science-conference-card--portrait');
    return `<article class="${classes.join(' ')}">${externalLink(item.image, `<img src="${item.image}" alt="${item.alt}" loading="lazy">`, 'science-conference-image')}<div class="science-conference-content"><span class="science-conference-year">${item.year}</span><h4>${item.title}</h4><p class="science-conference-meta">${item.meta}</p><p>${item.text}</p>${externalLink(item.link, item.linkText)}</div></article>`;
  }).join('');
  const publications = d.publications.map(([year, title, meta]) => `<li><span class="science-publication-year">${year}</span><div><h4>${title}</h4><p>${meta}</p></div></li>`).join('');

  target.className = 'science-section';
  target.innerHTML = `<div class="science-shell">
    <div class="science-hero">
      <div class="science-hero__copy">
        <p class="science-eyebrow">${d.hero.kicker}</p>
        <h2>${d.hero.title}</h2>
        <p class="science-hero__lead">${d.hero.lead}</p>
        <div class="science-actions" aria-label="Scientific profiles">
          ${externalLink(ISTINA, d.labels.istina, 'science-button science-button--primary')}
          ${externalLink(ORCID, 'ORCID ↗', 'science-button science-button--ghost')}
          ${externalLink(RSCI, d.labels.rinz, 'science-button science-button--ghost')}
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
      <div class="science-heading"><div><p class="science-eyebrow">${d.labels.conferenceKicker}</p><h3>${d.labels.conferenceTitle}</h3></div>${externalLink(TALKS, d.labels.allTalks, 'science-text-link')}</div>
      <div class="science-conference-grid">${conferences}</div>
    </div>
    <div class="science-block science-block--compact">
      <div class="science-heading"><div><p class="science-eyebrow">${d.labels.publicationKicker}</p><h3>${d.labels.publicationTitle}</h3></div>${externalLink(PUBLICATIONS, d.labels.allPublications, 'science-text-link')}</div>
      <ol class="science-publication-list">${publications}</ol>
    </div>
    <div class="science-block science-block--compact">
      <div class="science-heading"><div><p class="science-eyebrow">${d.labels.profileKicker}</p><h3>${d.labels.profileTitle}</h3></div></div>
      <div class="science-profile-grid">
        ${externalLink(ISTINA, '<span class="science-profile-mark">I</span><span class="science-profile-copy"><strong>ISTINA</strong><small>IRID 691089486</small></span><span class="science-profile-arrow">↗</span>', 'science-profile-card')}
        ${externalLink(ORCID, '<span class="science-profile-mark">iD</span><span class="science-profile-copy"><strong>ORCID</strong><small>0000-0003-1537-1405</small></span><span class="science-profile-arrow">↗</span>', 'science-profile-card')}
        ${externalLink(RSCI, `<span class="science-profile-mark">${language === 'en' ? 'R' : 'Р'}</span><span class="science-profile-copy"><strong>${language === 'en' ? 'RSCI / SPIN' : 'РИНЦ / SPIN'}</strong><small>7070-4286</small></span><span class="science-profile-arrow">↗</span>`, 'science-profile-card')}
      </div>
    </div>
  </div>`;
})();
