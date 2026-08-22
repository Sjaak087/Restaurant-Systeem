// ==================== Update log ====================
// Voeg hier nieuwe updates toe met een titel, datum en info.
// Belangrijk: de NIEUWSTE update moet BOVENAAN in de lijst staan.
//
// Voorbeeld van een nieuwe update (kopieer dit blokje en zet het bovenaan):
// {
//   title: 'Korte titel van de update',
//   date: '20-08-2026',
//   info: 'Iets langere uitleg over wat er precies is veranderd of toegevoegd.'
// },

const UPDATES = [
 {
    title: 'Opmerkingen en nieuwe meubels', 
    date: '22-08-2026', 
    info: 'Ten eerste heb ik toegevoegd dat je zelf extra opmerkingen kunt toevoegen zoals extra saus je kunt hier ook een emoji voor kiezen en het werkt een beetje zoals het oude ijsklontjes systeem ook heb ik toegevoegd dat je nu extra meubels kunt toevoegen dit zijn de nieuwe meubels: Een bar, een keuken en een bank ook kun je de tafels andere vormen geven dit zijn de vormen: rond, vierkant en rechthoek ook heb ik nog 5 extra achtergrond kleuren toegeovegd de volgende update word heel groot en zal binnenkort uitkomen!'
 }, 
 {
    title: 'Kleine update met een paar veranderingen', 
    date: '20-08-2026', 
    info: 'Ik heb 2 nieuwe dingen toegevoegd: Ten eerste heb ik toegevoegd dat je nu kunt kiezen welke achtergrondkleur je wilt je kunt kiezen uit 25 kleuren! Ten tweede heb ik toegevoegd dat je de plattegrond groter dan 20x20 vierkantjes kunt maken er zijn ook nog een paar kleine bugfixes de volgende update komt binnenkort uit dit zal een hele grote zijn!'
  }, 
  {
    title: 'Grote Update met veel nieuwe features',
    date: '19-08-2026',
    info: 'Ten eerste heb ik toegevoegd dat je je leden kunt beheren en kunt kiezen in welke tabs je leden kunnen komen bijv bestellen en historie dan kunnen ze alleen in de historie ten tweede heb ik een update log toegevoegd waar je de updates kunt zien die we doen ten derde heb ik toegevoegd dat je leden kunt kicken en dan refresht de code automatisch en ten vierde heb ik gefixt dat je nu aan beide kanten een gebied kunt vergroten en ten vijfde heb ik de stijl een beetje verandert waardoor het er nu stukken cleaner uitziet ik heb ook nog een paar andere bugs gefixt de nieuwe update komt uit binnenkort over een paar dagen!'
  },
];

// ==================== Weergave (niet nodig om aan te passen) ====================
function renderUpdatesList() {
  const list = document.getElementById('updates-list');
  if (!list) return;

  if (UPDATES.length === 0) {
    list.innerHTML = '<div class="empty-msg">Nog geen updates.</div>';
    return;
  }

  list.innerHTML = '';
  UPDATES.forEach(u => {
    const item = document.createElement('div');
    item.className = 'update-item';
    item.innerHTML = `
      <button type="button" class="update-item-head">
        <span class="update-item-title">${escapeHtmlUpdates(u.title)}</span>
        <span class="update-item-right">
          <span class="update-item-date">${escapeHtmlUpdates(u.date)}</span>
          <span class="update-item-arrow">▾</span>
        </span>
      </button>
      <div class="update-item-info">${escapeHtmlUpdates(u.info)}</div>
    `;
    item.querySelector('.update-item-head').addEventListener('click', () => {
      item.classList.toggle('open');
    });
    list.appendChild(item);
  });
}

function escapeHtmlUpdates(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

renderUpdatesList();

// Gebruikt de openModal-functie die al door landing.js / restaurant.js is gedefinieerd.
const btnUpdates = document.getElementById('btn-updates');
if (btnUpdates) {
  btnUpdates.addEventListener('click', () => openModal('modal-updates'));
}
