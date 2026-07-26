(function(){
  const pathname=window.location.pathname.replace(/\/+$/,'/')||'/';
  const inDoctors=pathname.startsWith('/for-doctors/')||pathname.startsWith('/en/for-doctors/');
  if(!inDoctors)return;

  const lang=(document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
  const isLanding=pathname==='/for-doctors/'||pathname==='/en/for-doctors/';
  const professionalUseUrl=lang==='en'?'/en/for-doctors/professional-use.html':'/for-doctors/professional-use.html';
  const patientsUrl=lang==='en'?'/en/patients/':'/patients/';
  const STORAGE_KEY='medical_professional_audience_v1';

  const T=lang==='en'?{
    audienceKicker:'Professional audience',
    audienceTitle:'Materials intended for healthcare professionals',
    audienceP1:'This section contains professional educational materials for ophthalmologists and other appropriately trained healthcare professionals.',
    audienceP2:'The materials are not medical advice, an official clinical guideline, a healthcare organisation protocol or an individual prescription. They are not intended for patient self-diagnosis or self-treatment.',
    audienceP3:'Diagnostic and treatment decisions must be made by the treating clinician after assessing the individual patient and checking current official guidance, approved prescribing information, contraindications, interactions and local protocols.',
    more:'Professional-use terms',
    clinicalKicker:'Professional warning',
    clinicalTitle:'Author-prepared clinical synopsis — not an individual treatment plan',
    clinicalP1:'This material is provided solely for the education and information support of qualified healthcare professionals. It does not replace current official clinical guidelines, approved prescribing information, local protocols, a multidisciplinary decision or the treating clinician’s judgement.',
    clinicalP2:'Drug choice, dose, route, frequency, duration, monitoring and the need for admission or surgery must be determined individually after examination of the patient.',
    treatmentKicker:'Before using any regimen',
    treatmentTitle:'Adapt the regimen to the individual clinical situation',
    treatmentP:'Before prescribing, verify all factors that may affect safety, legality and effectiveness:',
    treatmentItems:['age and body weight','pregnancy and breastfeeding','allergy history','renal and hepatic function','comorbidities and drug interactions','contraindications and age restrictions','the current approved prescribing information','etiological testing and indications for admission or surgery'],
    legalKicker:'Legal and clinical status',
    legalTitle:'Conditions governing professional use of this material',
    legalP1:'The content is an author-prepared review of professional sources current on the stated medical-review date. It is not a healthcare service, telemedicine consultation, official guideline, standard of care, healthcare organisation protocol or universal treatment prescription.',
    legalP2:'The clinician directly responsible for the patient remains responsible for confirming the diagnosis, assessing risks, selecting and documenting treatment, obtaining any required consent and arranging follow-up within the clinician’s competence and applicable law.',
    legalP3:'The author and website owner cannot control the user’s qualifications, the completeness of patient assessment, the accuracy of the diagnosis, adherence to contraindications or subsequent monitoring. This notice does not exclude liability where exclusion is prohibited by applicable law.',
    version:'Professional-use notice v1.0',
    updated:'Updated 21 July 2026',
    modalKicker:'Access to professional content',
    modalTitle:'Please confirm your professional status',
    modalText:'By continuing, you confirm that you are a healthcare or pharmaceutical professional, or are enrolled in an appropriate professional education programme, and understand that these materials are not an individual prescription or a substitute for clinical judgement.',
    confirm:'I confirm and wish to continue',
    goPatients:'Go to patient information',
    footer:'Professional-use terms'
  }:{
    audienceKicker:'Профессиональная аудитория',
    audienceTitle:'Материалы предназначены для медицинских работников',
    audienceP1:'Раздел содержит профессиональные информационно-образовательные материалы для врачей-офтальмологов и иных медицинских работников, имеющих соответствующую подготовку.',
    audienceP2:'Материалы не являются медицинской консультацией, официальной клинической рекомендацией, протоколом медицинской организации или индивидуальным назначением. Они не предназначены для самостоятельной диагностики и самолечения пациентов.',
    audienceP3:'Диагностические и лечебные решения принимает лечащий врач после оценки конкретного пациента и проверки действующих клинических рекомендаций, инструкций по медицинскому применению, противопоказаний, взаимодействий и локальных СОП.',
    more:'Условия профессионального использования',
    clinicalKicker:'Профессиональное предупреждение',
    clinicalTitle:'Авторский клинический конспект — не индивидуальная схема лечения',
    clinicalP1:'Материал предназначен исключительно для обучения и информационной поддержки квалифицированных медицинских работников. Он не заменяет действующие клинические рекомендации, инструкции по медицинскому применению препаратов, локальные СОП, решение консилиума или клиническое решение лечащего врача.',
    clinicalP2:'Выбор препарата, дозы, способа введения, кратности, продолжительности лечения, мониторинга и необходимости госпитализации либо хирургического вмешательства определяется индивидуально после обследования пациента.',
    treatmentKicker:'Перед применением любой схемы',
    treatmentTitle:'Адаптируйте схему к конкретной клинической ситуации',
    treatmentP:'До назначения необходимо проверить все факторы, влияющие на безопасность, законность и эффективность лечения:',
    treatmentItems:['возраст и массу тела','беременность и грудное вскармливание','аллергологический анамнез','функцию почек и печени','сопутствующие заболевания и взаимодействия','противопоказания и возрастные ограничения','актуальную инструкцию конкретного препарата','этиологическую диагностику и показания к госпитализации или операции'],
    legalKicker:'Правовой и клинический статус',
    legalTitle:'Условия профессионального использования материала',
    legalP1:'Содержание представляет собой авторский обзор профессиональных источников, актуальных на указанную дату медицинской проверки. Оно не является медицинской услугой, телемедицинской консультацией, официальной клинической рекомендацией, стандартом медицинской помощи, протоколом медицинской организации или универсальным назначением лечения.',
    legalP2:'Врач, непосредственно оказывающий помощь пациенту, самостоятельно отвечает за подтверждение диагноза, оценку рисков, выбор и документирование лечения, получение требуемого согласия и организацию последующего наблюдения в пределах своей квалификации и законодательства.',
    legalP3:'Автор и владелец сайта не контролируют квалификацию пользователя, полноту обследования пациента, правильность диагноза, соблюдение противопоказаний и последующее наблюдение. Настоящее предупреждение не исключает ответственность в случаях, когда её исключение не допускается законом.',
    version:'Предупреждение v1.0',
    updated:'Обновлено 21 июля 2026 года',
    modalKicker:'Доступ к профессиональным материалам',
    modalTitle:'Подтвердите профессиональный статус',
    modalText:'Продолжая, вы подтверждаете, что являетесь медицинским или фармацевтическим работником либо обучаетесь по соответствующей профессиональной программе и понимаете, что материалы не являются индивидуальным назначением и не заменяют клиническое решение врача.',
    confirm:'Подтверждаю и продолжить',
    goPatients:'Перейти в раздел для пациентов',
    footer:'Условия профессионального использования'
  };

  function ensureStylesheet(href,marker){
    if(document.querySelector(`link[data-shared-style="${marker}"]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.dataset.sharedStyle=marker;
    document.head.appendChild(link);
  }

  ensureStylesheet('/doctors-legal.css?v=20260721-2','doctors-legal');
  ensureStylesheet('/clinical-header.css?v=20260726-1','clinical-header');

  function normalizeClinicalHeader(){
    if(isLanding)return;
    const header=document.querySelector('body > header.site-header, body > header.clinical-header');
    if(!header)return;
    header.classList.add('clinical-header');

    const inner=header.querySelector('.header-inner,.container.nav,.nav');
    if(inner)inner.classList.add('clinical-header__inner');

    const brand=header.querySelector('.brand');
    if(brand){
      brand.classList.add('clinical-brand');
      const mark=brand.querySelector('.brand-mark,.monogram');
      if(mark)mark.classList.add('clinical-brand__mark');
      const text=brand.querySelector('.brand-copy')||Array.from(brand.children).find(el=>el!==mark&&el.tagName==='SPAN');
      if(text){
        text.classList.add('clinical-brand__text');
        const directText=Array.from(text.childNodes).find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
        if(directText&&!text.querySelector(':scope > strong,:scope > .clinical-brand__name')){
          const name=document.createElement('strong');
          name.className='clinical-brand__name';
          name.textContent=directText.textContent.trim();
          directText.remove();
          text.prepend(name);
        }
      }
    }

    const actions=header.querySelector('.header-actions');
    if(actions)actions.classList.add('clinical-header__actions');

    const language=header.querySelector('.language-switch');
    if(language){
      language.classList.add('clinical-language');
      language.querySelectorAll('.language-button').forEach(item=>{
        item.classList.add('clinical-language__item');
        if(item.classList.contains('is-active'))item.setAttribute('aria-current','page');
      });
    }

    const theme=header.querySelector('[data-theme-toggle]');
    if(theme)theme.classList.add('clinical-theme-toggle');
  }

  normalizeClinicalHeader();

  const html=(strings,...values)=>strings.reduce((result,string,index)=>result+string+(values[index]??''),'');
  function professionalLink(){return `<a class="md-prof-text-link" href="${professionalUseUrl}">${T.more} →</a>`;}
  function createLandingNotice(){if(document.querySelector('.md-prof-entry'))return;const section=document.createElement('section');section.className='md-prof-notice md-prof-entry';section.setAttribute('aria-labelledby','md-prof-entry-title');section.innerHTML=html`<div class="md-prof-notice__inner"><div><span class="md-prof-eyebrow">${T.audienceKicker}</span><h2 id="md-prof-entry-title">${T.audienceTitle}</h2></div><div class="md-prof-notice__copy"><p>${T.audienceP1}</p><p>${T.audienceP2}</p><p>${T.audienceP3}</p>${professionalLink()}</div></div>`;const hero=document.querySelector('.doctors-hero');if(hero)hero.insertAdjacentElement('afterend',section);else document.querySelector('main')?.prepend(section);}
  function createClinicalNotice(){const article=document.querySelector('.article,article');if(!article||article.querySelector('.md-prof-clinical'))return;const notice=document.createElement('section');notice.className='md-prof-notice md-prof-clinical';notice.setAttribute('aria-labelledby','md-prof-clinical-title');notice.innerHTML=html`<div class="md-prof-notice__inner"><div><span class="md-prof-eyebrow">${T.clinicalKicker}</span><h2 id="md-prof-clinical-title">${T.clinicalTitle}</h2></div><div class="md-prof-notice__copy"><p>${T.clinicalP1}</p><p>${T.clinicalP2}</p>${professionalLink()}</div></div>`;article.prepend(notice);}
  function createTreatmentWarning(){const therapy=document.getElementById('therapy')||document.querySelector('[data-treatment-section],.treatment-section,.therapy-section');if(!therapy||document.querySelector('.md-prof-treatment'))return;const warning=document.createElement('aside');warning.className='md-prof-treatment';warning.setAttribute('aria-labelledby','md-prof-treatment-title');warning.innerHTML=html`<span class="md-prof-eyebrow">${T.treatmentKicker}</span><h3 id="md-prof-treatment-title">${T.treatmentTitle}</h3><p>${T.treatmentP}</p><ul>${T.treatmentItems.map(item=>`<li>${item}</li>`).join('')}</ul>`;therapy.insertAdjacentElement('beforebegin',warning);}
  function createFullLegalBlock(){const article=document.querySelector('.article,article');if(!article||article.querySelector('.md-prof-legal'))return;const block=document.createElement('section');block.className='md-prof-legal';block.setAttribute('aria-labelledby','md-prof-legal-title');block.innerHTML=html`<span class="md-prof-eyebrow">${T.legalKicker}</span><h2 id="md-prof-legal-title">${T.legalTitle}</h2><p>${T.legalP1}</p><p>${T.legalP2}</p><p>${T.legalP3}</p><a class="md-prof-text-link" href="${professionalUseUrl}">${T.more} →</a><div class="md-prof-legal__meta"><span>${T.version}</span><span>${T.updated}</span></div>`;const sources=document.getElementById('sources');if(sources)sources.insertAdjacentElement('afterend',block);else article.appendChild(block);}
  function addFooterLink(){const footer=document.querySelector('footer .footer-row')||document.querySelector('footer');if(!footer||footer.querySelector(`a[href="${professionalUseUrl}"]`))return;let tools=footer.querySelector('.footer-service-links');if(!tools){tools=document.createElement('div');tools.className='footer-service-links';footer.appendChild(tools);}const link=document.createElement('a');link.href=professionalUseUrl;link.className='md-prof-text-link md-prof-footer-link';link.textContent=T.footer;tools.prepend(link);}
  function showAudienceModal(){try{if(localStorage.getItem(STORAGE_KEY)==='confirmed')return;}catch(e){}const modal=document.createElement('div');modal.className='md-prof-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','md-prof-modal-title');modal.innerHTML=html`<div class="md-prof-modal__panel"><span class="md-prof-eyebrow">${T.modalKicker}</span><h2 id="md-prof-modal-title">${T.modalTitle}</h2><p>${T.modalText}</p><a class="md-prof-text-link" href="${professionalUseUrl}">${T.more} →</a><div class="md-prof-modal__actions"><button class="md-prof-confirm" type="button">${T.confirm}</button><a class="md-prof-patients" href="${patientsUrl}">${T.goPatients}</a></div></div>`;document.body.appendChild(modal);const confirm=modal.querySelector('.md-prof-confirm');const focusables=()=>Array.from(modal.querySelectorAll('button,a[href]'));confirm.addEventListener('click',()=>{try{localStorage.setItem(STORAGE_KEY,'confirmed');}catch(e){}modal.remove();});modal.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const items=focusables();const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});window.setTimeout(()=>confirm.focus(),0);}

  if(isLanding)createLandingNotice();else{createClinicalNotice();createTreatmentWarning();createFullLegalBlock();}
  addFooterLink();
  showAudienceModal();
})();
