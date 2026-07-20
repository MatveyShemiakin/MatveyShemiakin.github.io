const links=[...document.querySelectorAll('.side-link')];
    const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}})},{rootMargin:'-20% 0px -70% 0px'});
    sections.forEach(s=>obs.observe(s));

    document.querySelectorAll('img[data-protected]').forEach(img=>{img.draggable=false;img.setAttribute('decoding','async');});
    document.addEventListener('contextmenu',event=>{if(event.target.closest('.protected-media,img[data-protected]'))event.preventDefault();});
    document.addEventListener('dragstart',event=>{if(event.target.closest('.protected-media,img[data-protected]'))event.preventDefault();});

    const copyExamButton=document.getElementById('copyExamTemplate');
    copyExamButton?.addEventListener('click',async()=>{
      const value=document.getElementById('examTemplate')?.textContent?.trim()||'';
      try{
        await navigator.clipboard.writeText(value);
        copyExamButton.textContent='Скопировано';copyExamButton.classList.add('copied');
        setTimeout(()=>{copyExamButton.textContent='Копировать шаблон';copyExamButton.classList.remove('copied');},1800);
      }catch{
        const area=document.createElement('textarea');area.value=value;document.body.append(area);area.select();document.execCommand('copy');area.remove();
        copyExamButton.textContent='Скопировано';copyExamButton.classList.add('copied');
      }
    });

    const dutyToggle=document.getElementById('dutyToggle');
    dutyToggle?.addEventListener('click',()=>{
      const enabled=document.body.classList.toggle('duty-mode');
      dutyToggle.textContent=enabled?'Полная версия':'Режим дежурства';
      document.getElementById('triage')?.scrollIntoView({behavior:'smooth'});
    });

    document.querySelectorAll('[data-therapy-view]').forEach(button=>{
      button.addEventListener('click',()=>{
        const view=button.dataset.therapyView;
        document.querySelectorAll('[data-therapy-view]').forEach(b=>b.classList.toggle('active',b===button));
        document.querySelectorAll('[data-therapy-panel]').forEach(panel=>{
          const active=panel.dataset.therapyPanel===view;
          panel.hidden=!active;
          panel.classList.toggle('active',active);
        });
      });
    });

    const diffData={
      bacterial:{title:'Бактериальный кератит',summary:'Острое начало, гнойный стромальный инфильтрат, эпителиальный дефект и клеточная реакция во влаге передней камеры. Морфологическая картина сама по себе не позволяет установить возбудителя.',clues:['Контактные линзы, травма роговицы, операция или роговичные швы','Гнойное отделяемое и быстрое прогрессирование стромального поражения','Гипопион, глубокая стромальная инфильтрация и расплавление'],actions:['Оценить критерии угрожающего зрению течения','При тяжёлом или атипичном процессе выполнить соскоб роговицы','Начать антибактериальную терапию сразу после забора материала']},
      fungal:{title:'Грибковый кератит',summary:'Нечёткие перистые края, сателлитные инфильтраты и постепенное прогрессирование особенно характерны после травмы растительным материалом.',clues:['Растительная травма и сельскохозяйственная работа','Сухой серовато-белый инфильтрат','Сателлиты и эндотелиальная бляшка'],actions:['Выполнить микроскопию на грибы и посев на соответствующие среды','Не назначать местные ГКС до исключения грибковой этиологии','Рассмотреть раннюю консультацию специалиста по роговице']},
      acanthamoeba:{title:'Акантамёбный кератит',summary:'Интенсивность боли может не соответствовать выраженности ранних биомикроскопических изменений. Кольцевидный стромальный инфильтрат обычно относится к более поздним проявлениям.',clues:['Контактные линзы и контакт с водой','Боль, непропорциональная выраженности биомикроскопических изменений','Радиальные периневральные инфильтраты'],actions:['Специальная культуральная среда, ПЦР и/или конфокальная микроскопия роговицы','Не назначать местные ГКС до верификации этиологии','Уточнить уход за линзами и водную экспозицию']},
      herpetic:{title:'Герпетический кератит',summary:'Древовидный или географический эпителиальный дефект в сочетании со снижением чувствительности роговицы требует пересмотра этиологической гипотезы и лечебной тактики.',clues:['Рецидивирующее одностороннее течение','Древовидный дефект с терминальными утолщениями','Сниженная чувствительность роговицы'],actions:['Проверить чувствительность роговицы','Не считать антибактериальную монотерапию этиотропной','Разграничить эпителиальную и стромальную форму']},
      neurotrophic:{title:'Нейротрофический кератит',summary:'Персистирующий эпителиальный дефект, снижение чувствительности роговицы и стромальное истончение могут ошибочно расцениваться как продолжающаяся инфекция.',clues:['Сниженная чувствительность роговицы','Длительно незаживающий дефект эпителия','Несоответствие выраженности боли и структурного повреждения'],actions:['Исследовать чувствительность роговицы и состояние глазной поверхности','Исключить сохраняющуюся инфекцию до снижения терапии','Оценить необходимость защиты глазной поверхности и риск стромального расплавления']}
    };
    const diffTitle=document.getElementById('diffTitle'),diffSummary=document.getElementById('diffSummary'),diffClues=document.getElementById('diffClues'),diffAction=document.getElementById('diffAction');
    document.querySelectorAll('[data-diff]').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('[data-diff]').forEach(b=>b.classList.toggle('active',b===button));
      const data=diffData[button.dataset.diff];
      diffTitle.textContent=data.title;diffSummary.textContent=data.summary;
      diffClues.innerHTML=data.clues.map(x=>`<li>${x}</li>`).join('');
      diffAction.innerHTML=data.actions.map(x=>`<li>${x}</li>`).join('');
    }));

    const reasonData={
      etiology:{title:'Несоответствие предполагаемой этиологии',text:'Повторно оцените вероятность грибкового, акантамёбного, герпетического, нокардиального кератита и инфекции, вызванной нетуберкулёзными микобактериями, особенно при атипичном анамнезе или клинико-морфологической картине.',steps:['Повторно оценить анамнез, факторы риска и клинико-морфологическую картину.','Расширить микроскопические, культуральные и молекулярно-генетические исследования по показаниям.','До уточнения этиологии избегать терапии, способной ухудшить течение альтернативного инфекционного процесса, прежде всего преждевременного назначения местных ГКС.']},
      delivery:{title:'Недостаточная интенсивность или нарушение режима инстилляций',text:'Даже активный в отношении возбудителя препарат может быть неэффективен при недостаточной частоте инстилляций, нарушении техники введения, низкой приверженности или невозможности соблюдать интенсивный режим.',steps:['Прямо уточнить фактическую частоту инстилляций.','Проверить технику, помощь родственников и доступность препарата.','При невозможности режима рассмотреть стационарное ведение.']},
      resistance:{title:'Антимикробная резистентность или неполное покрытие',text:'Результаты культурального исследования и определения чувствительности необходимо интерпретировать совместно с клинической динамикой и вероятностью смешанной инфекции.',steps:['Сопоставить выделенный микроорганизм с клинической значимостью.','Сопоставить данные определения чувствительности с фактической концентрацией и режимом применения препарата.','После получения результатов выполнить целевую коррекцию и, при возможности, сужение спектра антибактериальной терапии.']},
      toxicity:{title:'Лекарственная эпителиотоксичность',text:'Частые инстилляции, консерванты и сочетание нескольких препаратов могут поддерживать дефект эпителия даже при подавлении инфекции.',steps:['Дифференцировать признаки продолжающейся инфекции и лекарственной эпителиопатии.','Отменить необоснованно назначенные местные препараты и по возможности уменьшить воздействие консервантов.','Не уменьшать интенсивность противомикробной терапии при продолжающейся стромальной деструкции без повторной оценки этиологии.']},
      surgery:{title:'Локальный источник инфекции или хирургическое осложнение',text:'Инфицированный шов, инородное тело, поражение ламеллярного интерфейса, некротическая ткань или формирующаяся перфорация могут требовать хирургического вмешательства, а не только изменения местной терапии.',steps:['Оценить состояние роговичных швов, операционной раны, ламеллярного интерфейса и передней камеры.','Оценить глубину истончения и риск перфорации.','Рассмотреть удаление источника, биопсию или лечебную кератопластику по показаниям.']}
    };
    const reasonTitle=document.getElementById('reasonTitle'),reasonText=document.getElementById('reasonText'),reasonSteps=document.getElementById('reasonSteps');
    document.querySelectorAll('[data-reason]').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('[data-reason]').forEach(b=>b.classList.toggle('active',b===button));
      const data=reasonData[button.dataset.reason];
      reasonTitle.textContent=data.title;reasonText.textContent=data.text;
      reasonSteps.innerHTML=data.steps.map(x=>`<li>${x}</li>`).join('');
    }));

    const feedback=document.getElementById('caseFeedback');
    document.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('[data-answer]').forEach(b=>b.classList.remove('correct','wrong'));
      const correct=button.dataset.answer==='correct';
      button.classList.add(correct?'correct':'wrong');
      feedback.className='case-feedback'+(correct?' success':'');
      feedback.innerHTML=correct
        ? '<strong>Обоснованный выбор.</strong> Выполнены критерии угрожающего зрению течения: центральный инфильтрат диаметром ≥2 мм и клеточная реакция во влаге передней камеры. Соскоб роговицы следует получить до первой инстилляции антибиотика, если это не приводит к клинически значимой задержке терапии. Далее необходимы ранний повторный осмотр и коррекция лечения с учётом клинической динамики и результатов микробиологического исследования.'
        : '<strong>Этот вариант создаёт риск задержки адекватной помощи.</strong> В представленном случае имеются признаки угрожающего зрению течения; показаны микробиологическое исследование и незамедлительное начало антибактериальной терапии. Наблюдение без лечения или монотерапия местным ГКС противопоказаны.';
    }));
    const photoLightbox=document.getElementById('photoLightbox');
    const photoLightboxImage=document.getElementById('photoLightboxImage');
    const photoLightboxCaption=document.getElementById('photoLightboxCaption');
    const photoLightboxClose=document.getElementById('photoLightboxClose');
    const photoLightboxStage=document.getElementById('photoLightboxStage');
    let photoLightboxReturnFocus=null;

    const getPhotoSource=element=>{
      const raw=element.style.getPropertyValue('--photo').trim();
      const match=raw.match(/^url\((['"]?)([\s\S]*?)\1\)$/i);
      return match?match[2]:'';
    };
    const getPhotoCaption=element=>{
      const stored=element.dataset.photoCaption;
      if(stored)return stored;
      const explicit=element.getAttribute('aria-label');
      if(explicit)return explicit;
      const figure=element.closest('figure');
      const figureTitle=figure?.querySelector('.clinical-figure-caption strong')?.textContent?.trim();
      if(figureTitle)return figureTitle;
      const caseButton=element.closest('.visual-case');
      const caseTitle=caseButton?.querySelector('strong')?.textContent?.trim();
      if(caseTitle)return caseTitle;
      const embeddedTitle=element.querySelector('.visual-label strong,.case-photo-placeholder strong')?.textContent?.trim();
      return embeddedTitle||'Клиническая фотография';
    };
    const closePhotoLightbox=()=>{
      if(!photoLightbox||photoLightbox.hidden)return;
      photoLightbox.hidden=true;
      photoLightbox.setAttribute('aria-hidden','true');
      document.body.classList.remove('lightbox-open');
      photoLightboxImage.removeAttribute('src');
      photoLightboxImage.alt='';
      photoLightboxCaption.textContent='';
      photoLightboxReturnFocus?.focus?.({preventScroll:true});
      photoLightboxReturnFocus=null;
    };
    const openPhotoLightbox=element=>{
      const source=getPhotoSource(element);
      if(!source)return;
      const caption=getPhotoCaption(element);
      photoLightboxReturnFocus=document.activeElement;
      photoLightboxImage.src=source;
      photoLightboxImage.alt=caption;
      photoLightboxCaption.textContent=caption;
      photoLightbox.hidden=false;
      photoLightbox.setAttribute('aria-hidden','false');
      document.body.classList.add('lightbox-open');
      photoLightboxClose.focus({preventScroll:true});
    };

    document.querySelectorAll('[style*="--photo"]').forEach(photo=>{
      photo.classList.add('zoomable-photo');
      photo.title='Нажмите, чтобы увеличить';
      const label=getPhotoCaption(photo);
      photo.dataset.photoCaption=label;
      const insideInteractive=photo.closest('button,a');
      if(!insideInteractive){
        photo.tabIndex=0;
        photo.setAttribute('role','button');
        photo.setAttribute('aria-haspopup','dialog');
        photo.setAttribute('aria-label',`Увеличить изображение: ${label}`);
        photo.addEventListener('keydown',event=>{
          if(event.key==='Enter'||event.key===' '){event.preventDefault();openPhotoLightbox(photo);}
        });
      }
      if(!photo.querySelector(':scope > .photo-zoom-badge')){
        const badge=document.createElement('span');
        badge.className='photo-zoom-badge';
        badge.setAttribute('aria-hidden','true');
        photo.append(badge);
      }
      photo.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        openPhotoLightbox(photo);
      });
    });

    photoLightboxClose?.addEventListener('click',closePhotoLightbox);
    photoLightbox?.addEventListener('click',event=>{if(event.target===photoLightbox)closePhotoLightbox();});
    photoLightboxStage?.addEventListener('click',event=>{if(event.target===photoLightboxStage)closePhotoLightbox();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!photoLightbox?.hidden)closePhotoLightbox();});
