export const NAMED_THERAPIES = [
  ['citicoline', ['citicoline', 'цитиколин']],
  ['latanoprost', ['latanoprost', 'латанопрост']],
  ['timolol', ['timolol', 'тимолол']],
  ['travoprost', ['travoprost', 'травопрост']],
  ['bimatoprost', ['bimatoprost', 'биматопрост']],
  ['tafluprost', ['tafluprost', 'тафлупрост']],
  ['brimonidine', ['brimonidine', 'бримонидин']],
  ['dorzolamide', ['dorzolamide', 'дорзоламид']],
  ['brinzolamide', ['brinzolamide', 'бринзоламид']],
  ['netarsudil', ['netarsudil', 'нетарсудил']],
  ['aflibercept', ['aflibercept', 'афлиберцепт']],
  ['faricimab', ['faricimab', 'фарицимаб']],
  ['ranibizumab', ['ranibizumab', 'ранибизумаб']],
  ['bevacizumab', ['bevacizumab', 'бевацизумаб']],
  ['brolucizumab', ['brolucizumab', 'бролуцизумаб']]
];

const PROCEDURES = [
  ['selective laser trabeculoplasty', ['selective laser trabeculoplasty','slt','селективн','слт']],
  ['pars plana vitrectomy', ['pars plana vitrectomy','vitrectomy','ppv','витрэктом','витреэктом']],
  ['scleral buckling', ['scleral buckling','scleral buckle','buckle','пломбирован']],
  ['scleral buckle', ['scleral buckling','scleral buckle','buckle','пломбирован']],
  ['Yamane fixation', ['yamane','ямане']],
  ['sutured scleral fixation', ['sutured scleral fixation','suture fixation','шовн','подшиван']],
  ['internal limiting membrane peeling', ['internal limiting membrane peeling','ilm peeling','пилинг впм','пилинг внутренней пограничной']],
  ['inverted ILM flap', ['inverted ilm flap','инвертированн']],
  ['penetrating keratoplasty', ['penetrating keratoplasty','сквозн']],
  ['deep anterior lamellar keratoplasty', ['deep anterior lamellar keratoplasty','dalk','глубокая передняя послойная']],
  ['DMEK', ['dmek','дмэк']], ['DSAEK', ['dsaek','дсаэк']],
  ['phacoemulsification', ['phacoemulsification','факоэмульсификац']],
  ['femtosecond laser-assisted cataract surgery', ['femtosecond','femtolaser','фемтолазер']],
  ['trabeculectomy', ['trabeculectomy','трабекулэктом']],
  ['tube shunt', ['tube shunt','дренаж','шунт']]
];

export function mentions(text, term) {
  const value = String(text || '').toLowerCase().replace(/ё/g, 'е');
  const names = [...NAMED_THERAPIES,...PROCEDURES].find(([canonical]) => canonical.toLowerCase() === term.toLowerCase())?.[1] || [term];
  return names.some(name => value.includes(name.toLowerCase()));
}

export function isNamedComparison(intent = {}) {
  return intent.question_type === 'comparison' && intent.interventions?.length && intent.comparators?.length;
}

export function mentionsBoth(text, intent) {
  return [...(intent.interventions || []), ...(intent.comparators || [])].every(term => mentions(text, term));
}

export function directComparisonEvidence(source, intent) {
  if (!isNamedComparison(intent)) return true;
  if (source.source_type === 'trial_registry') return false;
  const title = String(source.title || '');
  const abstract = String(source.abstract_or_summary || source.abstractText || '');
  // A fixed-combination study does not establish A versus B monotherapy.
  if (/fixed.?combination|combination of|combined|co.?delivery|additive|concomitant|in vitro|ex vivo|комбинац/i.test(title)) return false;
  const opposing = text => {
    const parts = text.split(/\s+(?:versus|vs\.?|compared (?:with|to))\s+/i);
    if (parts.length !== 2) return null;
    const leftA = intent.interventions.every(t=>mentions(parts[0],t));
    const rightB = intent.comparators.every(t=>mentions(parts[1],t));
    const leftB = intent.comparators.every(t=>mentions(parts[0],t));
    const rightA = intent.interventions.every(t=>mentions(parts[1],t));
    return (leftA && rightB && !leftB && !rightA) || (leftB && rightA && !leftA && !rightB);
  };
  if (mentionsBoth(title,intent) && /[\/+]/.test(title)) return false;
  if (opposing(title) === false) return false;
  if (mentionsBoth(title, intent)) return true;
  return abstract.split(/[.!?]/).some(sentence => mentionsBoth(sentence, intent) && !/[\/+]|fixed.?combination|combination of/i.test(sentence) && opposing(sentence) === true);
}
