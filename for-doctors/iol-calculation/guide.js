function revealClinicalCase() {
  const id = window.location.hash.slice(1);
  const target = document.getElementById(id);
  const card = target?.closest('details.iol-case');
  if (card) card.open = true;
}

revealClinicalCase();
window.addEventListener('hashchange', revealClinicalCase);
