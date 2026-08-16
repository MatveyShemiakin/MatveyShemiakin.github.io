(function(){
  const lang=(document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
  const copy=lang==='en'?{
    label:'Main navigation',open:'Open menu',
    groups:[
      {key:'patients',label:'Patients',href:'/en/patients/',lead:'Patient information',note:'Conditions, surgery and recovery',sections:[
        {title:'Conditions',items:[
          {label:'Cataract',href:'/en/patients/cataract/'},
          {label:'Glaucoma',href:'/en/patients/glaucoma/'},
          {label:'Intraocular lens dislocation',href:'/en/patients/iol-dislocation/'}
        ]},
        {items:[
          {label:'Treatment stages',href:'/en/patients/#paths'},
          {label:'Frequently asked questions',href:'/en/patients/#faq'},
          {label:'Latest materials',href:'/en/patients/#conditions'}
        ]}
      ]},
      {key:'doctors',label:'For doctors',href:'/en/for-doctors/',lead:'Professional library',note:'Clinical ophthalmology resources',sections:[
        {title:'Clinical materials',items:[
          {label:'Bacterial keratitis and corneal ulcer',href:'/en/for-doctors/bacterial-keratitis/'},
          {label:'Follow-up after penetrating keratoplasty',href:'/en/for-doctors/penetrating-keratoplasty/'}
        ]}
      ]},
      {key:'about',label:'About the doctor',href:'/en/#about',lead:'Matvey Shemyakin',note:'Clinical, educational and research work',sections:[
        {items:[
          {label:'About the doctor',href:'/en/#about'},
          {label:'Specialties',href:'/en/#directions'},
          {label:'Education',href:'/en/#education'},
          {label:'Research',href:'/en/#science'},
          {label:'Contacts',href:'/en/#contacts'}
        ]}
      ]}
    ]
  }:{
    label:'Основная навигация',open:'Открыть меню',
    groups:[
      {key:'patients',label:'Пациентам',href:'/patients/',lead:'Пациентам',note:'Заболевания, операции и восстановление',sections:[
        {title:'Заболевания',items:[
          {label:'Катаракта',href:'/patients/cataract/'},
          {label:'Глаукома',href:'/patients/glaucoma/'},
          {label:'Смещение искусственного хрусталика',href:'/patients/iol-dislocation/'}
        ]},
        {items:[
          {label:'Этапы лечения',href:'/patients/#paths'},
          {label:'Частые вопросы',href:'/patients/#faq'},
          {label:'Что нового',href:'/patients/#patient-updates'}
        ]}
      ]},
      {key:'doctors',label:'Для врачей',href:'/for-doctors/',lead:'Для врачей',note:'Профессиональная библиотека',sections:[
        {title:'Клинические материалы',items:[
          {label:'Бактериальный кератит и язва роговицы',href:'/for-doctors/bacterial-keratitis/'},
          {label:'Ведение после сквозной кератопластики',href:'/for-doctors/penetrating-keratoplasty/'}
        ]}
      ]},
      {key:'about',label:'О враче',href:'/#about',lead:'Матвей Шемякин',note:'Клиническая, образовательная и научная работа',sections:[
        {items:[
          {label:'О враче',href:'/#about'},
          {label:'Направления',href:'/#directions'},
          {label:'Образование',href:'/#education'},
          {label:'Наука',href:'/#science'},
          {label:'Контакты',href:'/#contacts'}
        ]}
      ]}
    ]
  };

  function createLink(item,className){
    const link=document.createElement('a');
    link.className=className;
    link.href=item.href;
    link.textContent=item.label;
    return link;
  }

  function createGroup(group,index){
    const wrap=document.createElement('div');
    wrap.className='site-mega-nav__group';
    wrap.dataset.megaNavGroup=group.key;

    const top=document.createElement('div');
    top.className='site-mega-nav__top';
    const direct=createLink(group,'site-mega-nav__toplink');
    const toggle=document.createElement('button');
    const panelId='site-mega-nav-panel-'+index;
    toggle.className='site-mega-nav__toggle';
    toggle.type='button';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls',panelId);
    toggle.setAttribute('aria-label',copy.open+' «'+group.label+'»');
    toggle.innerHTML='<span aria-hidden="true">⌄</span>';
    top.append(direct,toggle);

    const panel=document.createElement('div');
    panel.className='site-mega-nav__panel';
    panel.id=panelId;
    const surface=document.createElement('div');
    surface.className='site-mega-nav__surface';

    const lead=createLink({label:group.lead,href:group.href},'site-mega-nav__lead');
    const leadText=document.createElement('span');
    leadText.className='site-mega-nav__lead-copy';
    const strong=document.createElement('strong');
    strong.textContent=group.lead;
    const small=document.createElement('small');
    small.textContent=group.note;
    leadText.append(strong,small);
    const arrow=document.createElement('b');
    arrow.setAttribute('aria-hidden','true');
    arrow.textContent='→';
    lead.replaceChildren(leadText,arrow);
    surface.appendChild(lead);

    group.sections.forEach((section,sectionIndex)=>{
      const block=document.createElement('div');
      block.className='site-mega-nav__section';
      if(section.title){
        const title=document.createElement('span');
        title.className='site-mega-nav__section-title';
        title.textContent=section.title;
        block.appendChild(title);
      }
      const list=document.createElement('div');
      list.className='site-mega-nav__links';
      section.items.forEach(item=>{
        const link=createLink(item,'site-mega-nav__link');
        const arrow=document.createElement('span');
        arrow.setAttribute('aria-hidden','true');
        arrow.textContent='→';
        link.appendChild(arrow);
        list.appendChild(link);
      });
      block.appendChild(list);
      if(sectionIndex>0)block.classList.add('site-mega-nav__section--divided');
      surface.appendChild(block);
    });

    panel.appendChild(surface);
    wrap.append(top,panel);
    return wrap;
  }

  function createNav(){
    const nav=document.createElement('nav');
    nav.className='site-mega-nav';
    nav.setAttribute('aria-label',copy.label);
    copy.groups.forEach((group,index)=>nav.appendChild(createGroup(group,index)));
    return nav;
  }

  function findMount(){
    const replacements=[
      document.querySelector('.site-header .nav-right > nav'),
      document.querySelector('.patient-header .header-row > nav'),
      document.querySelector('.site-head .nav-links')
    ].filter(Boolean);
    if(replacements.length)return{mode:'replace',target:replacements[0]};
    const doctors=document.querySelector('.doctors-header .doctors-nav');
    if(doctors)return{mode:'insert',target:doctors,before:doctors.querySelector('.doctors-nav-actions')};
    return null;
  }

  function setOpen(group,open){
    group.classList.toggle('is-open',open);
    const toggle=group.querySelector('.site-mega-nav__toggle');
    if(toggle)toggle.setAttribute('aria-expanded',open?'true':'false');
  }

  function closeAll(nav,except){
    nav.querySelectorAll('.site-mega-nav__group').forEach(group=>{
      if(group!==except)setOpen(group,false);
    });
  }

  function bind(nav){
    nav.addEventListener('click',event=>{
      const toggle=event.target.closest('.site-mega-nav__toggle');
      if(!toggle)return;
      const group=toggle.closest('.site-mega-nav__group');
      const next=!group.classList.contains('is-open');
      closeAll(nav,group);
      setOpen(group,next);
    });
    nav.addEventListener('focusin',event=>{
      const group=event.target.closest('.site-mega-nav__group');
      if(!group)return;
      closeAll(nav,group);
      setOpen(group,true);
    });
    nav.addEventListener('focusout',()=>{
      window.setTimeout(()=>{
        if(!nav.contains(document.activeElement))closeAll(nav);
      },0);
    });
    document.addEventListener('click',event=>{
      if(!nav.contains(event.target))closeAll(nav);
    });
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      const active=nav.querySelector('.site-mega-nav__toggle[aria-expanded="true"]');
      closeAll(nav);
      if(active)active.focus();
    });
  }

  function mount(){
    if(document.querySelector('.site-mega-nav'))return;
    const location=findMount();
    if(!location)return;
    const nav=createNav();
    if(location.mode==='replace')location.target.replaceWith(nav);
    else location.target.insertBefore(nav,location.before||null);
    const header=nav.closest('header');
    if(header)header.classList.add('site-mega-nav-mounted');
    bind(nav);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
