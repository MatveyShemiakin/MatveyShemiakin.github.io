(function(){
  'use strict';

  var root=document.documentElement;
  var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var criticalSelector=[
    '.urgent',
    '.warning',
    '.emergency',
    '.red-flag',
    '.red-flags',
    '.danger',
    '.medical-warning',
    '.clinical-alert',
    '.answer-important',
    '.medical-disclaimer',
    '.disclaimer',
    '[role="alert"]',
    '[data-urgent]',
    '[data-emergency]',
    '[data-medical-disclaimer]'
  ].join(',');

  var revealSelector=[
    'main > section',
    'main > article',
    'main .question',
    'main .section-card',
    'main .content-section',
    'main .topic-section',
    'main .stage-card',
    'main .resource-card',
    'main .publication-card',
    'main .timeline-item',
    'main .faq-item'
  ].join(',');

  var cardSelector=[
    'a.topic-card',
    'a.direction-card',
    'a.pathway-card',
    'a.resource-card',
    'a.stage-card',
    'a.publication-card',
    'a.doctor-card',
    'a.card',
    '.topic-card a',
    '.direction-card a',
    '.pathway-card a',
    '.resource-card a',
    '.stage-card a',
    '.publication-card a',
    '.doctor-card a',
    '.related a',
    'button.card',
    'details.faq-item'
  ].join(',');

  var routes={
    '/patients/before-surgery/':{
      eyebrow:'Следующий материал',
      title:'День операции',
      description:'Что происходит в клинике и как вести себя во время вмешательства.',
      href:'/patients/surgery-day/',
      linkLabel:'Открыть материал'
    },
    '/patients/surgery-day/':{
      eyebrow:'Следующий материал',
      title:'Восстановление после операции',
      description:'Нормальные ощущения, ограничения и признаки, при которых требуется осмотр.',
      href:'/patients/recovery/',
      linkLabel:'Открыть материал'
    },
    '/patients/recovery/':{
      eyebrow:'Следующий материал',
      title:'Как правильно закапывать капли',
      description:'Пошаговая техника и правила безопасного применения назначенных препаратов.',
      href:'/patients/eye-drops/',
      linkLabel:'Открыть материал'
    },
    '/patients/eye-drops/':{
      eyebrow:'Следующий материал',
      title:'Повседневная жизнь после операции',
      description:'Когда можно читать, работать, наклоняться, мыться и возвращаться к нагрузкам.',
      href:'/patients/daily-life/',
      linkLabel:'Открыть материал'
    },
    '/patients/daily-life/':{
      eyebrow:'Следующий материал',
      title:'Очки после операции',
      description:'Когда стабилизируется зрение и в какой момент подбирать постоянную коррекцию.',
      href:'/patients/glasses/',
      linkLabel:'Открыть материал'
    },
    '/patients/glasses/':{
      eyebrow:'Продолжить чтение',
      title:'Все материалы для пациентов',
      description:'Вернитесь к библиотеке и выберите следующий вопрос или этап лечения.',
      href:'/patients/',
      linkLabel:'Перейти в раздел'
    },
    '/patients/iol-dislocation/':{
      eyebrow:'Продолжить чтение',
      title:'Все материалы для пациентов',
      description:'Памятки, ответы на частые вопросы и последовательные маршруты подготовки и восстановления.',
      href:'/patients/',
      linkLabel:'Перейти в раздел'
    },
    '/for-doctors/bacterial-keratitis/':{
      eyebrow:'Следующий клинический материал',
      title:'Сквозная кератопластика',
      description:'Практический конспект по отбору пациентов, хирургической технике и послеоперационному ведению.',
      href:'/for-doctors/penetrating-keratoplasty/',
      linkLabel:'Открыть материал'
    },
    '/for-doctors/penetrating-keratoplasty/':{
      eyebrow:'Продолжить работу',
      title:'Библиотека для врачей',
      description:'Вернитесь к профессиональным материалам и выберите следующий клинический конспект.',
      href:'/for-doctors/',
      linkLabel:'Перейти в раздел'
    },
    '/en/patients/before-surgery/':{
      eyebrow:'Next material',
      title:'The day of surgery',
      description:'What happens at the clinic and how to behave during the procedure.',
      href:'/en/patients/surgery-day/',
      linkLabel:'Open material'
    },
    '/en/patients/surgery-day/':{
      eyebrow:'Next material',
      title:'Recovery after surgery',
      description:'Expected sensations, temporary restrictions, and symptoms that require an examination.',
      href:'/en/patients/recovery/',
      linkLabel:'Open material'
    },
    '/en/patients/recovery/':{
      eyebrow:'Next material',
      title:'How to use eye drops correctly',
      description:'A step-by-step technique and safe-use rules for prescribed medicines.',
      href:'/en/patients/eye-drops/',
      linkLabel:'Open material'
    },
    '/en/patients/eye-drops/':{
      eyebrow:'Next material',
      title:'Daily life after surgery',
      description:'When to resume reading, work, washing, bending, and physical activity.',
      href:'/en/patients/daily-life/',
      linkLabel:'Open material'
    },
    '/en/patients/daily-life/':{
      eyebrow:'Next material',
      title:'Glasses after surgery',
      description:'When vision stabilizes and when permanent optical correction can be selected.',
      href:'/en/patients/glasses/',
      linkLabel:'Open material'
    },
    '/en/patients/glasses/':{
      eyebrow:'Continue reading',
      title:'All patient materials',
      description:'Return to the library and choose another question or stage of treatment.',
      href:'/en/patients/',
      linkLabel:'Open patient library'
    },
    '/en/patients/iol-dislocation/':{
      eyebrow:'Continue reading',
      title:'All patient materials',
      description:'Guides, frequently asked questions, and structured preparation and recovery routes.',
      href:'/en/patients/',
      linkLabel:'Open patient library'
    },
    '/en/for-doctors/penetrating-keratoplasty/':{
      eyebrow:'Continue learning',
      title:'Professional library',
      description:'Return to the clinical library and choose the next professional material.',
      href:'/en/for-doctors/',
      linkLabel:'Open professional library'
    }
  };

  function normalisePath(pathname){
    var path=(pathname||'/').replace(/\/index\.html$/,'/');
    if(path.indexOf('.')===-1&&path.charAt(path.length-1)!=='/')path+='/';
    return path;
  }

  function isCritical(element){
    if(!element||!element.matches)return false;
    if(element.matches(criticalSelector))return true;
    if(element.closest(criticalSelector))return true;
    return Boolean(element.querySelector&&element.querySelector(criticalSelector));
  }

  function mountCards(){
    document.querySelectorAll(cardSelector).forEach(function(element){
      if(!isCritical(element))element.classList.add('site-motion-card');
    });
  }

  function mountDetails(){
    document.querySelectorAll('details').forEach(function(details){
      details.classList.add('site-motion-details');
      details.classList.toggle('is-open',details.open);
      details.addEventListener('toggle',function(){
        details.classList.toggle('is-open',details.open);
      });
    });
  }

  function createTextElement(tag,className,text){
    var element=document.createElement(tag);
    element.className=className;
    element.textContent=text;
    return element;
  }

  function ensureHomepageMissionStyles(){
    if(document.querySelector('link[data-homepage-mission]'))return;
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/homepage-mission.css?v=20260827-1';
    link.dataset.homepageMission='true';
    document.head.appendChild(link);
  }

  function createMissionLine(text,isAccent){
    var line=document.createElement('span');
    line.className='hero-mission__line';
    if(isAccent){
      var accent=document.createElement('span');
      accent.className='hero-mission__accent';
      accent.textContent=text;
      line.appendChild(accent);
    }else{
      line.textContent=text;
    }
    return line;
  }

  function mountHomepageMission(){
    var path=normalisePath(window.location.pathname);
    var isRu=path==='/';
    var isEn=path==='/en/';
    if(!isRu&&!isEn)return;

    var copy=document.querySelector('.hero .hero-copy');
    var credentials=copy&&copy.querySelector('.hero-credentials');
    if(!copy||!credentials||copy.querySelector('.hero-mission'))return;

    var focus=copy.querySelector('.hero-focus');
    if(focus)focus.remove();
    ensureHomepageMissionStyles();

    var mission=document.createElement('div');
    mission.className='hero-mission';
    mission.setAttribute('aria-label',isRu?'Миссия':'Mission');

    var label=createTextElement('span','hero-mission__label',isRu?'Миссия':'Mission');
    var text=document.createElement('p');
    text.className='hero-mission__text';

    var lines=isRu?[
      ['Сделать современную офтальмохирургию',false],
      ['понятной, предсказуемой и безопасной',true],
      ['для пациента — от постановки диагноза до восстановления зрения.',false]
    ]:[
      ['Make modern ophthalmic surgery',false],
      ['understandable, predictable and safe',true],
      ['for patients — from first diagnosis to visual recovery.',false]
    ];

    lines.forEach(function(item){text.appendChild(createMissionLine(item[0],item[1]));});
    mission.appendChild(label);
    mission.appendChild(text);
    credentials.parentNode.insertBefore(mission,credentials.nextSibling);
  }

  function mountNextMaterial(){
    var main=document.querySelector('main');
    var route=routes[normalisePath(window.location.pathname)];
    var existing=document.querySelector('.related,.next-material,.next-section,[data-next-material],[data-site-next-material]');
    if(!main||!route||existing)return;

    var aside=document.createElement('aside');
    aside.className='site-next-material';
    aside.dataset.siteNextMaterial='';
    aside.setAttribute('aria-labelledby','site-next-material-title');

    var copy=document.createElement('div');
    copy.className='site-next-material__copy';
    copy.appendChild(createTextElement('span','site-next-material__eyebrow',route.eyebrow));

    var title=createTextElement('h2','site-next-material__title',route.title);
    title.id='site-next-material-title';
    copy.appendChild(title);
    copy.appendChild(createTextElement('p','site-next-material__description',route.description));

    var link=document.createElement('a');
    link.className='site-next-material__link';
    link.href=route.href;
    link.appendChild(createTextElement('span','site-next-material__label',route.linkLabel));
    link.appendChild(createTextElement('span','site-next-material__arrow','→'));

    aside.appendChild(copy);
    aside.appendChild(link);

    var disclaimer=main.querySelector('.medical-disclaimer,.disclaimer,[data-medical-disclaimer]');
    if(disclaimer){
      var insertionTarget=disclaimer;
      while(insertionTarget.parentElement&&insertionTarget.parentElement!==main){
        insertionTarget=insertionTarget.parentElement;
      }
      main.insertBefore(aside,insertionTarget);
    }else{
      main.appendChild(aside);
    }
  }

  function mountReveals(){
    var elements=Array.prototype.filter.call(document.querySelectorAll(revealSelector),function(element,index,list){
      if(isCritical(element))return false;
      return list.indexOf(element)===index;
    });

    elements.forEach(function(element){
      element.classList.add('site-motion-reveal');
      var rect=element.getBoundingClientRect();
      if(reduceMotion||rect.top<window.innerHeight*.88)element.classList.add('is-visible');
    });

    root.classList.add('site-motion-ready');

    if(reduceMotion||!('IntersectionObserver' in window)){
      elements.forEach(function(element){element.classList.add('is-visible');});
      return;
    }

    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },{
      rootMargin:'0px 0px -8% 0px',
      threshold:.08
    });

    elements.forEach(function(element){
      if(!element.classList.contains('is-visible'))observer.observe(element);
    });
  }

  function mountProgress(){
    if(document.querySelector('.reading-progress,[data-reading-progress]'))return;

    var progress=null;
    var frame=0;
    var listening=false;

    function pageIsLong(){
      return document.documentElement.scrollHeight>window.innerHeight*1.35;
    }

    function updateProgress(){
      frame=0;
      if(!progress)return;
      var maximum=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      var offset=window.scrollY||document.documentElement.scrollTop||0;
      progress.value=Math.max(0,Math.min(1,offset/maximum));
    }

    function queueProgress(){
      if(!frame)frame=window.requestAnimationFrame(updateProgress);
    }

    function attach(){
      if(listening)return;
      window.addEventListener('scroll',queueProgress,{passive:true});
      listening=true;
    }

    function detach(){
      if(!listening)return;
      window.removeEventListener('scroll',queueProgress);
      listening=false;
    }

    function synchronise(){
      if(pageIsLong()){
        if(!progress){
          progress=document.createElement('progress');
          progress.className='site-reading-progress';
          progress.max=1;
          progress.value=0;
          progress.setAttribute('aria-hidden','true');
          document.body.prepend(progress);
        }
        attach();
        queueProgress();
      }else{
        detach();
        if(progress){
          progress.remove();
          progress=null;
        }
      }
    }

    window.addEventListener('resize',synchronise,{passive:true});
    synchronise();
  }

  function init(){
    if(root.dataset.siteMotionReady==='true')return;
    root.dataset.siteMotionReady='true';
    mountHomepageMission();
    mountCards();
    mountDetails();
    mountNextMaterial();
    mountReveals();
    mountProgress();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();