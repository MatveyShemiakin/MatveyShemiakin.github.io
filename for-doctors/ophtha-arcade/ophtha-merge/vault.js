const L = (ru, en) => ({ ru, en });

export const VAULT_ITEMS = [
  {
    id: 'first-iol', kind: 'fact', icon: '◉',
    title: L('Первая ИОЛ', 'The First IOL'),
    copy: L('Harold Ridley выполнил первые имплантации искусственного хрусталика в 1949 году. Идея, которая сегодня кажется очевидной, десятилетиями встречала серьёзное сопротивление.', 'Harold Ridley performed the first implantable intraocular lenses in 1949. An idea that now feels obvious faced serious resistance for decades.'),
    sourceTitle: 'Harold Ridley and the invention of the intraocular lens: a reappraisal',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12187139/',
    rule: { metric: 'score', threshold: 128 }
  },
  {
    id: 'kelman-phaco', kind: 'fact', icon: '✦',
    title: L('Phaco: 1967', 'Phaco: 1967'),
    copy: L('Charles Kelman представил первоначальную работу по факоэмульсификации в 1967 году. Для новой техники он прямо подчёркивал необходимость операционного микроскопа.', 'Charles Kelman presented his initial report on phacoemulsification in 1967 and explicitly emphasized the need for an operating microscope.'),
    sourceTitle: 'The history of cataract surgery: from couching to phacoemulsification',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7729313/',
    rule: { metric: 'maxTile', threshold: 16 }
  },
  {
    id: 'zirm-1905', kind: 'fact', icon: '◌',
    title: L('Роговица · 1905', 'Cornea · 1905'),
    copy: L('Eduard Zirm выполнил первую успешную пересадку человеческой роговицы в 1905 году. Один из двух трансплантатов сохранил прозрачность и дал пациенту функциональное зрение.', 'Eduard Zirm performed the first successful human corneal transplant in 1905. One of the two grafts remained clear and restored functional vision.'),
    sourceTitle: 'A brief history of corneal transplantation: From ancient to modern',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3872837/',
    rule: { metric: 'mergeCount', threshold: 10 }
  },
  {
    id: 'keratoplasty-word', kind: 'fact', icon: '⌁',
    title: L('Откуда взялась «кератопластика»', 'Where “keratoplasty” came from'),
    copy: L('Термин «keratoplasty» ввёл Franz Reisinger ещё в 1818 году во время экспериментальных работ по трансплантации роговицы.', 'Franz Reisinger coined the term “keratoplasty” in 1818 during experimental work on corneal transplantation.'),
    sourceTitle: 'A brief history of corneal transplantation: From ancient to modern',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3872837/',
    rule: { metric: 'moves', threshold: 25 }
  },
  {
    id: 'dmek-2006', kind: 'fact', icon: '◎',
    title: L('DMEK · 2006', 'DMEK · 2006'),
    copy: L('Первый клинический случай DMEK был выполнен группой Gerrit Melles в 2006 году: трансплантат состоял только из десцеметовой мембраны и эндотелия.', 'The first clinical DMEK case was performed by Gerrit Melles and colleagues in 2006, transplanting only Descemet membrane and endothelium.'),
    sourceTitle: "Step-by-step Descemet's membrane endothelial keratoplasty surgery",
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6432849/',
    rule: { metric: 'score', threshold: 512 }
  },
  {
    id: 'oct-1991', kind: 'fact', icon: '▤',
    title: L('OCT · 1991', 'OCT · 1991'),
    copy: L('Работа, давшая название optical coherence tomography и показавшая оптические срезы сетчатки, вышла в Science в 1991 году.', 'The paper that introduced optical coherence tomography and demonstrated optical cross-sections of the retina was published in Science in 1991.'),
    sourceTitle: 'Optical Coherence Tomography',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4638169/',
    rule: { metric: 'maxTile', threshold: 64 }
  },
  {
    id: 'sunlight-laser', kind: 'fact', icon: '☀',
    title: L('До лазера было Солнце', 'Before the laser, there was sunlight'),
    copy: L('Идею терапевтической фотокоагуляции Gerd Meyer-Schwickerath связал с наблюдением солнечного повреждения сетчатки. Первую световую коагуляцию при угрозе отслойки он выполнил в 1949 году.', 'Gerd Meyer-Schwickerath connected the idea of therapeutic photocoagulation with observations of solar retinal injury and performed his first light coagulation for impending retinal detachment in 1949.'),
    sourceTitle: 'Prof. Dr. Gerd Meyer-Schwickerath inventor of light coagulation on his 100th birthday',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7438286/',
    rule: { metric: 'mergeCount', threshold: 30 }
  },
  {
    id: 'kasner-1961', kind: 'fact', icon: '✂',
    title: L('Open-sky vitrectomy', 'Open-sky vitrectomy'),
    copy: L('David Kasner в 1961 году выполнил плановую субтотальную open-sky витрэктомию на травмированном глазу. Его работы стали одной из ступеней к современной PPV.', 'David Kasner performed a planned subtotal open-sky vitrectomy in a traumatized eye in 1961. His work became one of the stepping stones toward modern PPV.'),
    sourceTitle: 'David Kasner, MD, and the Road to Pars Plana Vitrectomy',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5024792/',
    rule: { metric: 'moves', threshold: 75 }
  },
  {
    id: 'machemer-1970', kind: 'fact', icon: '⌖',
    title: L('Первая PPV', 'The first PPV'),
    copy: L('Robert Machemer выполнил первую pars plana vitrectomy 20 апреля 1970 года пациенту с диабетическим гемофтальмом, используя ранний vitreous infusion suction cutter.', 'Robert Machemer performed his first pars plana vitrectomy on April 20, 1970 in a patient with diabetic vitreous hemorrhage using an early vitreous infusion suction cutter.'),
    sourceTitle: 'David Kasner, MD, and the Road to Pars Plana Vitrectomy',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5024792/',
    rule: { metric: 'score', threshold: 1500 }
  },
  {
    id: 'macular-hole-1991', kind: 'fact', icon: '◉',
    title: L('Макулярный разрыв · 1991', 'Macular hole · 1991'),
    copy: L('Современная хирургия макулярного разрыва начинается с предварительного сообщения Kelly и Wendel 1991 года. Позже пилинг ILM существенно повысил анатомическую эффективность.', 'Modern macular hole surgery traces back to Kelly and Wendel’s preliminary 1991 report. Later, ILM peeling substantially improved anatomical success.'),
    sourceTitle: 'Macular Hole Surgery as a Historical Perspective',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11246662/',
    rule: { metric: 'maxTile', threshold: 128 }
  },
  {
    id: 'cxl-dresden', kind: 'fact', icon: '✺',
    title: L('Dresden protocol', 'Dresden protocol'),
    copy: L('Классический epi-off CXL вырос из работ дрезденской группы Theo Seiler: рибофлавин + UVA с суммарной дозой 5,4 Дж/см² стал базовой точкой отсчёта для развития методики.', 'Classic epi-off CXL grew from Theo Seiler’s Dresden group: riboflavin plus UVA at a total dose of 5.4 J/cm² became the reference point for later protocols.'),
    sourceTitle: 'Corneal Cross-Linking: The Evolution of Treatment for Corneal Diseases',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8326410/',
    rule: { metric: 'score', threshold: 3000 }
  },
  {
    id: 'anti-vegf-era', kind: 'fact', icon: '↯',
    title: L('Эра anti-VEGF', 'The anti-VEGF era'),
    copy: L('Anti-VEGF препараты вошли в офтальмологическую литературу в начале 2000-х и за короткое время радикально изменили лечение неоваскулярных заболеваний сетчатки.', 'Anti-VEGF agents entered the ophthalmic literature in the early 2000s and rapidly transformed the treatment of neovascular retinal disease.'),
    sourceTitle: 'A History of Anti-VEGF Inhibitors in the Ophthalmic Literature',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9976233/',
    rule: { metric: 'mergeCount', threshold: 60 }
  },
  {
    id: 'paper-ridley', kind: 'paper', icon: '▣',
    title: L('Ridley: переоценка истории ИОЛ', 'Ridley: reappraising the IOL story'),
    copy: L('Современная open-access переоценка истории изобретения ИОЛ: технический прорыв, ранние осложнения и причины сопротивления профессионального сообщества.', 'A modern open-access reappraisal of the IOL invention: technical breakthrough, early complications, and why the profession resisted it.'),
    sourceTitle: 'Harold Ridley and the invention of the intraocular lens: a reappraisal',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12187139/',
    rule: { metric: 'maxTile', threshold: 256 }
  },
  {
    id: 'paper-cataract', kind: 'paper', icon: '▣',
    title: L('От couching до phaco', 'From couching to phaco'),
    copy: L('Большой исторический обзор хирургии катаракты: от древних техник до микроскопа, ИОЛ и факоэмульсификации.', 'A broad history of cataract surgery, from ancient techniques to the operating microscope, IOLs, and phacoemulsification.'),
    sourceTitle: 'The history of cataract surgery: from couching to phacoemulsification',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7729313/',
    rule: { metric: 'score', threshold: 5000 }
  },
  {
    id: 'paper-ek', kind: 'paper', icon: '▣',
    title: L('От DLEK к DMEK', 'From DLEK to DMEK'),
    copy: L('Короткий и наглядный обзор эволюции эндотелиальной кератопластики и идей, которые привели к селективной замене эндотелия.', 'A concise review of the evolution of endothelial keratoplasty and the ideas that led to selective endothelial replacement.'),
    sourceTitle: 'Endothelial Keratoplasty: From DLEK to DMEK',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2880365/',
    rule: { metric: 'totalMoves', threshold: 500 }
  },
  {
    id: 'paper-oct', kind: 'paper', icon: '▣',
    title: L('Как развивался OCT', 'How OCT evolved'),
    copy: L('История OCT от low-coherence interferometry до клинической визуализации сетчатки и диска зрительного нерва.', 'The evolution of OCT from low-coherence interferometry to clinical imaging of the retina and optic nerve head.'),
    sourceTitle: 'Optical Coherence Tomography: History, Current Status, and Laboratory Work',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3088542/',
    rule: { metric: 'totalMerges', threshold: 250 }
  },
  {
    id: 'paper-retinal-laser', kind: 'paper', icon: '▣',
    title: L('История retinal laser', 'The history of retinal laser'),
    copy: L('От солнечной фотокоагуляции и xenon arc до современных лазерных систем при диабетической ретинопатии.', 'From sunlight photocoagulation and xenon arc systems to modern retinal laser technology in diabetic retinopathy.'),
    sourceTitle: 'Laser Treatment for Diabetic Retinopathy: History, Mechanism, and Novel Technologies',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11432231/',
    rule: { metric: 'maxTile', threshold: 512 }
  },
  {
    id: 'paper-small-gauge', kind: 'paper', icon: '▣',
    title: L('17G → 27G', '17G → 27G'),
    copy: L('Обзор того, как витрэктомия прошла путь от VISC Machemer до трёхпортовой 20G и современной микроинвазивной 25/27G хирургии.', 'A review of the path from Machemer’s VISC to three-port 20G and modern 25/27G microincisional vitrectomy.'),
    sourceTitle: 'Review of Small Gauge Vitrectomy: Progress and Innovations',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5447313/',
    rule: { metric: 'score', threshold: 10000 }
  },
  {
    id: 'paper-macular-hole', kind: 'paper', icon: '▣',
    title: L('Эволюция surgery макулярного разрыва', 'Evolution of macular hole surgery'),
    copy: L('Исторический разбор ключевых этапов: ранняя PPV, ILM peeling и последующие техники для сложных разрывов.', 'A historical look at the key steps: early PPV, ILM peeling, and later techniques for difficult macular holes.'),
    sourceTitle: 'Macular Hole Surgery as a Historical Perspective',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11246662/',
    rule: { metric: 'games', threshold: 10 }
  },
  {
    id: 'paper-scleral-buckle', kind: 'paper', icon: '▣',
    title: L('Почему buckle всё ещё важен', 'Why buckling still matters'),
    copy: L('Современный обзор scleral buckling с историей от Gonin, Custodis и Schepens до актуальных показаний и техники.', 'A modern scleral buckling review, from Gonin, Custodis, and Schepens to current indications and technique.'),
    sourceTitle: 'Scleral Buckling: A Review of Clinical Aspects and Current Concepts',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8778378/',
    rule: { metric: 'maxTile', threshold: 1024 }
  },
  {
    id: 'paper-antivegf', kind: 'paper', icon: '▣',
    title: L('Как появился anti-VEGF', 'How anti-VEGF emerged'),
    copy: L('Короткая история от идеи VEGF-зависимого ангиогенеза до препаратов, изменивших прогноз при neovascular AMD.', 'A concise history from VEGF-driven angiogenesis to the agents that changed outcomes in neovascular AMD.'),
    sourceTitle: 'A Brief History of Anti-VEGF for the Treatment of Ocular Angiogenesis',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5691342/',
    rule: { metric: 'score', threshold: 20000 }
  },
  {
    id: 'paper-migs', kind: 'paper', icon: '▣',
    title: L('Зачем появился MIGS', 'Why MIGS emerged'),
    copy: L('Open-access обзор идеи minimally invasive glaucoma surgery: попытка снизить ВГД при более благоприятном профиле безопасности, чем у классической фильтрующей хирургии.', 'An open-access review of minimally invasive glaucoma surgery: lowering IOP with a safety profile designed to improve on traditional filtering surgery.'),
    sourceTitle: 'Update on Minimally Invasive Glaucoma Surgery (MIGS) and New Implants',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3863473/',
    rule: { metric: 'totalMoves', threshold: 2000 }
  },
  {
    id: 'paper-excimer', kind: 'paper', icon: '▣',
    title: L('Excimer и рождение laser refractive surgery', 'Excimer and the birth of laser refractive surgery'),
    copy: L('История применения excimer laser к роговице: работы IBM, Stephen Trokel и путь к PRK/LASIK.', 'The story of excimer laser on the cornea: IBM research, Stephen Trokel, and the route to PRK/LASIK.'),
    sourceTitle: 'Excimer Lasers in Refractive Surgery',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7004285/',
    rule: { metric: 'maxTile', threshold: 2048 }
  },
  {
    id: 'paper-glaucoma', kind: 'paper', icon: '★',
    title: L('25 лет эволюции glaucoma surgery', '25 years of glaucoma surgery evolution'),
    copy: L('Финальная находка коллекции: обзор перехода от классической фильтрующей хирургии к современным микроинвазивным подходам.', 'The final discovery: a review of the transition from classic filtering surgery to modern microinvasive approaches.'),
    sourceTitle: 'Evolution of Glaucoma Surgery in the Last 25 Years',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6115476/',
    rule: { metric: 'bestScore', threshold: 50000 }
  }
];

const UI = {
  ru: {
    fact: 'Факт', paper: 'Open access', locked: 'Не открыто', readSource: 'Источник · полный текст', readPaper: 'Читать полный текст',
    collection: 'My Ophtha Vault', discovered: 'Найдено', discoveryUnlocked: 'Discovery unlocked', continue: 'Продолжить',
    collectionCopy: '24 профессиональные находки открываются по мере игры. Они не влияют на счёт и глобальный рейтинг.'
  },
  en: {
    fact: 'Fact', paper: 'Open access', locked: 'Locked', readSource: 'Source · full text', readPaper: 'Read full text',
    collection: 'My Ophtha Vault', discovered: 'Discovered', discoveryUnlocked: 'Discovery unlocked', continue: 'Continue',
    collectionCopy: '24 professional discoveries unlock as you play. They never affect your score or global ranking.'
  }
};

function lang(language) {
  return String(language || '').toLowerCase().startsWith('en') ? 'en' : 'ru';
}

export function vaultUi(key, language = 'ru') {
  const selected = lang(language);
  return UI[selected][key] ?? UI.ru[key] ?? String(key);
}

export function vaultItemText(item, language = 'ru') {
  const selected = lang(language);
  return {
    title: item?.title?.[selected] ?? item?.title?.ru ?? '',
    copy: item?.copy?.[selected] ?? item?.copy?.ru ?? ''
  };
}

export function evaluateVaultUnlocks(progress = {}, existingIds = []) {
  const validIds = new Set(VAULT_ITEMS.map((item) => item.id));
  const unlockedIds = Array.from(new Set(existingIds.filter((id) => validIds.has(id))));
  const known = new Set(unlockedIds);
  const newIds = [];
  for (const item of VAULT_ITEMS) {
    const value = Number(progress[item.rule.metric] || 0);
    if (value >= item.rule.threshold && !known.has(item.id)) {
      known.add(item.id);
      unlockedIds.push(item.id);
      newIds.push(item.id);
    }
  }
  return { unlockedIds, newIds };
}

export function vaultItemById(id) {
  return VAULT_ITEMS.find((item) => item.id === id) || null;
}
