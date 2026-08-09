const links=[...document.querySelectorAll('.side-link')];
const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+entry.target.id));}})},{rootMargin:'-20% 0px -70% 0px'});
sections.forEach(section=>observer.observe(section));

document.addEventListener('contextmenu',event=>{if(event.target.closest('.protected-media,img[data-protected]'))event.preventDefault();});
document.addEventListener('dragstart',event=>{if(event.target.closest('.protected-media,img[data-protected]'))event.preventDefault();});

const copyExamButton=document.getElementById('copyExamTemplate');
copyExamButton?.addEventListener('click',async()=>{
  const value=document.getElementById('examTemplate')?.textContent?.trim()||'';
  const markCopied=()=>{copyExamButton.textContent='Copied';copyExamButton.classList.add('copied');setTimeout(()=>{copyExamButton.textContent='Copy template';copyExamButton.classList.remove('copied');},1800);};
  try{await navigator.clipboard.writeText(value);markCopied();}
  catch{const area=document.createElement('textarea');area.value=value;document.body.append(area);area.select();document.execCommand('copy');area.remove();markCopied();}
});

const dutyToggle=document.getElementById('dutyToggle');
dutyToggle?.addEventListener('click',()=>{
  const enabled=document.body.classList.toggle('duty-mode');
  dutyToggle.textContent=enabled?'Full version':'On-call mode';
  document.getElementById('triage')?.scrollIntoView({behavior:'smooth'});
});

document.querySelectorAll('[data-therapy-view]').forEach(button=>{
  button.addEventListener('click',()=>{
    const view=button.dataset.therapyView;
    document.querySelectorAll('[data-therapy-view]').forEach(item=>item.classList.toggle('active',item===button));
    document.querySelectorAll('[data-therapy-panel]').forEach(panel=>{
      const active=panel.dataset.therapyPanel===view;
      panel.hidden=!active;
      panel.classList.toggle('active',active);
    });
  });
});

const diffData={
  bacterial:{title:'Bacterial keratitis',summary:'Acute onset, a suppurative stromal infiltrate, an epithelial defect and anterior chamber inflammation are typical. Morphology alone does not identify the causative organism.',clues:['Contact-lens wear, corneal trauma, recent surgery or corneal sutures','Purulent discharge and rapid stromal progression','Hypopyon, deep stromal infiltration or corneal melt'],actions:['Assess for vision-threatening features','Perform corneal scraping in severe or atypical disease','Start antibacterial therapy immediately after sampling when sampling is indicated']},
  fungal:{title:'Fungal keratitis',summary:'Feathery indistinct margins, satellite infiltrates and gradual progression are particularly suggestive after trauma with vegetative material.',clues:['Vegetative trauma or agricultural exposure','Dry grey-white stromal infiltrate','Satellite lesions or an endothelial plaque'],actions:['Request fungal microscopy and culture on appropriate media','Avoid topical corticosteroids until fungal infection has been excluded','Consider early corneal-specialist review']},
  acanthamoeba:{title:'Acanthamoeba keratitis',summary:'Pain may be disproportionate to the early slit-lamp findings. A ring-shaped stromal infiltrate is usually a later manifestation.',clues:['Contact lenses plus water exposure','Pain out of proportion to early biomicroscopic findings','Radial perineural infiltrates'],actions:['Use appropriate culture, PCR and/or in-vivo confocal microscopy as indicated','Avoid topical corticosteroids until the diagnosis is established','Reassess lens hygiene and water exposure']},
  herpetic:{title:'Herpetic keratitis',summary:'A dendritic or geographic epithelial defect together with reduced corneal sensation should prompt reconsideration of the presumed etiology and treatment strategy.',clues:['Recurrent unilateral disease','Dendritic epithelial defect with terminal bulbs','Reduced corneal sensation'],actions:['Assess corneal sensation','Do not regard antibacterial monotherapy as etiologic treatment','Differentiate epithelial from stromal herpetic disease']},
  neurotrophic:{title:'Neurotrophic keratitis',summary:'A persistent epithelial defect, reduced corneal sensation and stromal thinning can be mistaken for persistent infection.',clues:['Reduced corneal sensation','A non-healing epithelial defect','Pain that is less marked than the structural damage would suggest'],actions:['Assess corneal sensation and the ocular surface','Exclude ongoing infection before de-escalating antimicrobial treatment','Assess the need for ocular-surface protection and the risk of stromal melt']}
};
const diffTitle=document.getElementById('diffTitle');
const diffSummary=document.getElementById('diffSummary');
const diffClues=document.getElementById('diffClues');
const diffAction=document.getElementById('diffAction');
document.querySelectorAll('[data-diff]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-diff]').forEach(item=>item.classList.toggle('active',item===button));
  const data=diffData[button.dataset.diff];
  if(!data)return;
  diffTitle.textContent=data.title;
  diffSummary.textContent=data.summary;
  diffClues.innerHTML=data.clues.map(item=>`<li>${item}</li>`).join('');
  diffAction.innerHTML=data.actions.map(item=>`<li>${item}</li>`).join('');
}));

const reasonData={
  etiology:{title:'The presumed etiology may be wrong',text:'Reassess the possibility of fungal, Acanthamoeba, herpetic, Nocardia or nontuberculous mycobacterial keratitis, particularly when the history or morphology is atypical.',steps:['Reassess the history, risk factors and clinical morphology.','Expand microscopy, culture and molecular testing when indicated.','Until the etiology is clarified, avoid treatment that could worsen an alternative infection, especially premature topical corticosteroids.']},
  delivery:{title:'Insufficient intensity or poor treatment delivery',text:'Even an active antimicrobial may fail if instillation frequency is inadequate, technique is poor, adherence is low or an intensive regimen cannot be delivered reliably.',steps:['Ask explicitly about the actual instillation frequency.','Check technique, caregiver support and access to the prescribed drug.','If the required regimen cannot be delivered safely, consider inpatient management.']},
  resistance:{title:'Antimicrobial resistance or incomplete coverage',text:'Culture and susceptibility results must be interpreted together with the clinical course and the possibility of a mixed infection.',steps:['Assess whether the isolated organism is clinically significant.','Relate susceptibility data to the actual concentration and dosing regimen being used.','Once results are available, target therapy and narrow antibacterial coverage when clinically appropriate.']},
  toxicity:{title:'Drug-related epithelial toxicity',text:'Frequent instillation, preservatives and multiple topical agents can perpetuate epithelial breakdown even after microbial suppression.',steps:['Differentiate persistent infection from medication-related epitheliopathy.','Stop non-essential topical agents and reduce preservative exposure when possible.','Do not reduce antimicrobial intensity in the presence of ongoing stromal destruction without reassessing the etiology.']},
  surgery:{title:'A local infectious source or surgical complication',text:'An infected suture, foreign body, interface infection, necrotic tissue or impending perforation may require a procedure rather than simply changing topical medication.',steps:['Examine corneal sutures, the surgical wound, any lamellar interface and the anterior chamber.','Assess the depth of thinning and the risk of perforation.','Consider removal of the source, biopsy or therapeutic keratoplasty when indicated.']}
};
const reasonTitle=document.getElementById('reasonTitle');
const reasonText=document.getElementById('reasonText');
const reasonSteps=document.getElementById('reasonSteps');
document.querySelectorAll('[data-reason]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-reason]').forEach(item=>item.classList.toggle('active',item===button));
  const data=reasonData[button.dataset.reason];
  if(!data)return;
  reasonTitle.textContent=data.title;
  reasonText.textContent=data.text;
  reasonSteps.innerHTML=data.steps.map(item=>`<li>${item}</li>`).join('');
}));

const feedback=document.getElementById('caseFeedback');
document.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-answer]').forEach(item=>item.classList.remove('correct','wrong'));
  const correct=button.dataset.answer==='correct';
  button.classList.add(correct?'correct':'wrong');
  feedback.className='case-feedback'+(correct?' success':'');
  feedback.innerHTML=correct
    ? '<strong>Appropriate choice.</strong> The case fulfils vision-threatening criteria: a central infiltrate measuring at least 2 mm and anterior chamber cell. Corneal scraping should be obtained before the first antibiotic dose when this does not cause a clinically meaningful treatment delay. Early reassessment and subsequent treatment adjustment should be guided by the clinical course and microbiology.'
    : '<strong>This option risks delaying appropriate treatment.</strong> The case has features of vision-threatening keratitis. Microbiological sampling and immediate antibacterial treatment are indicated; observation without treatment and topical corticosteroid monotherapy are inappropriate.';
}));

const photoSources={
  hero:'/for-doctors/bacterial-keratitis/assets/clinical/hero-bacterial-infiltrate.webp',
  'mild-peripheral':'/for-doctors/bacterial-keratitis/assets/clinical/mild-peripheral-keratitis-1mm.webp',
  'paracentral-ulcer':'/for-doctors/bacterial-keratitis/assets/clinical/paracentral-corneal-ulcer-2mm.webp',
  fungal:'/for-doctors/bacterial-keratitis/assets/clinical/fungal-keratitis.webp',
  acanthamoeba:'/for-doctors/bacterial-keratitis/assets/clinical/acanthamoeba-keratitis.webp',
  herpetic:'/for-doctors/bacterial-keratitis/assets/clinical/herpetic-keratitis.webp',
  neurotrophic:'/for-doctors/bacterial-keratitis/assets/clinical/neurotrophic-keratitis.webp',
  'post-keratitis-opacity':'/for-doctors/bacterial-keratitis/assets/clinical/post-keratitis-corneal-opacity.webp',
  'graft-thinning':'/for-doctors/bacterial-keratitis/assets/clinical/trophic-graft-thinning.webp',
  'case-ulcer':'/for-doctors/bacterial-keratitis/assets/clinical/case-paracentral-ulcer-2mm.webp'
};
const photoLightbox=document.getElementById('photoLightbox');
const photoLightboxImage=document.getElementById('photoLightboxImage');
const photoLightboxCaption=document.getElementById('photoLightboxCaption');
const photoLightboxClose=document.getElementById('photoLightboxClose');
const photoLightboxStage=document.getElementById('photoLightboxStage');
let photoLightboxReturnFocus=null;

const getPhotoCaption=element=>{
  const explicit=element.getAttribute('aria-label');
  if(explicit)return explicit;
  const figure=element.closest('figure');
  const title=figure?.querySelector('.clinical-figure-caption strong')?.textContent?.trim();
  return title||'Clinical photograph';
};
const closeLightbox=()=>{
  if(!photoLightbox||photoLightbox.hidden)return;
  photoLightbox.hidden=true;
  photoLightbox.setAttribute('aria-hidden','true');
  document.body.classList.remove('photo-lightbox-open');
  photoLightboxImage.removeAttribute('src');
  if(photoLightboxReturnFocus?.focus)photoLightboxReturnFocus.focus();
};
const openLightbox=element=>{
  if(!photoLightbox||!photoLightboxImage)return;
  const source=photoSources[element.dataset.photo];
  if(!source)return;
  photoLightboxReturnFocus=element;
  photoLightboxImage.src=source;
  photoLightboxImage.alt=getPhotoCaption(element);
  photoLightboxCaption.textContent=getPhotoCaption(element);
  photoLightbox.hidden=false;
  photoLightbox.setAttribute('aria-hidden','false');
  document.body.classList.add('photo-lightbox-open');
  photoLightboxClose?.focus();
};

document.querySelectorAll('[data-photo]').forEach(element=>{
  element.tabIndex=0;
  element.setAttribute('role','button');
  const label=getPhotoCaption(element);
  element.setAttribute('aria-label',`${label}. Open enlarged image`);
  element.addEventListener('click',()=>openLightbox(element));
  element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openLightbox(element);}});
});
photoLightboxClose?.addEventListener('click',closeLightbox);
photoLightboxStage?.addEventListener('click',event=>{if(event.target===photoLightboxStage)closeLightbox();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!photoLightbox?.hidden)closeLightbox();});
