// ==================== Update log ====================
// Voeg hier nieuwe updates toe met een titel, datum, tijd en info.
// Belangrijk: de NIEUWSTE update moet BOVENAAN in de lijst staan.
//
// De tijd (bijv. '14:30') komt naast de datum te staan, in het kopje van de
// update — dus die is altijd zichtbaar, ook zonder de update uit te klappen.
//
// Voorbeeld van een nieuwe update (kopieer dit blokje en zet het bovenaan):
// {
//   title: 'Korte titel van de update',
//   date: '20-08-2026',
//   time: '14:30',
//   info: 'Iets langere uitleg over wat er precies is veranderd of toegevoegd.'
// },

const UPDATES = [
  {
    title: 'Verschillende talen!', 
    date: '06-09-2026', 
    time: '20:30', 
    info: 'Nog een allerlaatste mega update we hebben 2 grote nieuwe featurs toegevoegd ten eerste verschillende talen je kunt kiezen ui engels en duits alle tekst zal automatisch vertaald worden naar die taal die jij kiest behalve de dingen die jij zelf insteld in je restaurants ook de updates in de update log worden die taal gemaakt en zelfs de announcements of waarschuwingen die ik typ als er fouten in de taal zitten geef het dqan meteen door via de feedback dan zal ik het proberen te fixen doe hetzelfde als iets niet vertaald is ook heb ik nog toegevoegd dat ik nu een reden kan geven voor je verbanning of timeout zodat iedereen weet waarom hij verbannen is of een timeout heeft gekregen ik heb ook nog een paar geblokkeerde woorden toegevoegd en wat bugs gefixt ik zal vanaf nu wat minder updates gaan doen ik zal niet aankondigen als er een dag geen update komt tot de volgende update!'
  },    
  { 
    title: 'Achtergrond patronen', 
    date: '03-09-2026', 
    time: '21:15', 
    info: 'ik heb een paar dingen toegevoegd ten eerste kun je nu een custom naam voor je leden bij het restaurant instellen want nu werdt dat je username die je zelf had ingesteld ook kan de eigenaar bepalen of je het restaurant kan aanpassen of niet ook heb ik achtergrond patronen toegevoegd het zijn 10 patronen van eten en een paar andere dingen ik heb ook nog 10 achtergrond kleuren toegevoegd en 5 lettertypen ook heb ik nog een 2e standaard melding geluid toegevoegd je kunt nu kiezen tussen die 2 of je eigen geuploadde geluid er zijn ook nog een paar bugs gefixt tot morgen!'
  },       
  { 
    title: 'Mega update!', 
    date: '02-09-2026', 
    time: '20:45', 
    info: 'Dit is echt een mega update met veel grote toevoegingen zoals ten eerste heb ik toegevoegd dat je nu een username moet instellen als je voor het eerst online komt je kunt deze ook veranderen maar let op: als ik erachter kom dat dit niet je eigen naam is of dat je eigen naam erin zit dan krijg je een time out of wordt je gebanned want dit heb ik namelijk ook toegevoegd ik kan nu mensen bannen, een time out geven of een waarschuwing geven een timeout dat is tijdelijk dan kun je niks een ban is voor altijd als ik je niet unban je zou een klacht kunnen indienen en dan unban ik je misschien ik heb ook nog toegevoegd dat je nu berichten naar elkaar kunt sturen zoek de username typ een titel in en de tekst die je wilt sturen en stuur het bericht de berichten zijn te vinden bij de plek waar ook de announcements staan dus bij het belletje bovenin als laatste heb ik ook nog een aantal geblokkeerde woorden toegevoegd en verschillende versies ervan misschien komt er morgen nog een update maar dat weet ik nog niet misschien tot morgen!'
  },     
  {
    title: 'Geblokkeerde woorden', 
    date: '01-09-2026', 
    time: '20:30', 
    info: 'ik heb iets heel belangrijks toegevoegd namelijk..... blocked words oftoewel geblokkeerde woorden dit zal erg nodig zijn om ruzie en verbanningen te verkomen de blokkeerde woorden zijn onder andere scheld woorden enzo als ik toch zo een woorden zie maar dan anders getypt heb je een heeeeel groot probleem als je hiertegen een klacht hebt dan moet je contact met mij opnemen ik heb ook nog een paar andere dingen gefixt maar daar merken jullie niks van tot de volgende update!!'
  },     
  {
    title: 'Feedback en systeembeheer fix', 
    date: '31-08-2026', 
    time: '20:30', 
    info: 'ik heb ten eerste feedback toegevoegd je kunt nu feedback geven gebruik dit om bijv. bugs te melden en iedeen te geven voor het systeem ik kan deze feedback lezen in de sitebeheer en je kunt nu maar 2 restaurants maken (dat was al zo) maar je kunt er zoveel joinen als je wilt dit is nu ook onder categorien verdeelt en trouwens de feedback kun je maar eens in de 5 min verzenden omdat ik anders volgespammed zal worden dit was de update tot morgen!'
  },    
  {
    title: 'Grote Toevoeging in zelfservice systeem!', 
    date: '30-08-2026', 
    time: '20:30', 
    info: 'ik heb een paar veranderingen toegevoegd ten eerste heb ik services toegevoegd nu kun je bij de zelfservice om een service vragen die je aanmaakt in instellingen als je een service vraagt dan komt hij binnen bij de tafel waar jij hem bij gevraagd hebt er komt dan een 1tje bij de tafel te staan en dan kun je op een tab services klikken en dan kun je de gevraagde services zien en ze op gedaan zetten dan verdwijnt hij weer je kunt ook je gevraagde services zien en in welke fase ze zijn ook kun je nu bij zelfservice een tafel onselecteren dit is een kleine bugfix die ik heb doorgevoerd en ook nog een bugfix als je restaurant automatisch verwijdert wordt dan wordt er niet meer een nieuwe aangemaakt dit was de update en tot de volgende keer!'
  },    
  {
    title: 'Kleine update', 
    date: '29-08-2026', 
    time: '22:00', 
    info: 'ik heb toegevoegd dat je nu notities kunt maken je mag er max 20 hebben je kunt ze afvinken en daarna worden ze automatisch verwijdert de notities worden gedeeld met het hele restaurant en iedereen kan er een maken of avinken ook heb ik toegevoegd dat ik nu kan instellen dat je restaurant automatisch verwijdert wordt er zit nog een kleine bug in maar die wordt zo gefixt tot morgen!'
  },     
  {
    title: 'Middel grote update', 
    date: '27-08-2026', 
    time: '21:30', 
    info: 'ik heb toegeovegd dat je nu kunt kiezen of je een bestelling naar de keuken of de bar stuur ik heb dus ook een extra bar tab toegoevoegd waar je alle bestellingen voor de bar kunt zien ook heb ik toegevoegd dat ook zonder tafel kunt bestellen door op de bar te drukken bestellingen met dingen voor de keuken en voor de bar worden automatisch gesplitst btw ik heb ook nog wat bugfixes gedaan en morgen komt nog een andere bugfix met de counting bij de zelfservice!'
  }, 
  {
    title: 'Volledige phone support', 
    date: '27-08-2026', 
    time: '13:00', 
    info: 'ik heb toegevoegd dat je nu op de telefoon gewoon alles kunt zien zonder dat je helemaal naar links of rechts hoeft te scrollen en alles niet goed kunt zien ik heb ook nog een andere bugfix gedaan de volgende update komt binnenkort uit en zal wat kleiner zijn!'
  },    
  {
    title: 'Grote update met een aantal nieuwe dingen!', 
    date: '26-08-2026', 
    time: '20:45', 
    info: 'ik heb een paar nieuwe dingen toegevoegd waaronder categorien je kunt producten nu verdelen onder categorien en je kunt bepalen welke categorie bovenaan staat en welke onderaan ook kun je nu bij de historie zien hoeveel van elke categorie besteld is de categorie is heel makkelijk aan te klikken bij een product ook heb ik rollen toegevoegd de iegenaar kan rollen geven aan zijn medewerkers dit is ook te zien langs je naam bovenin ik heb ook toegevoegd dat je nu je eerder gekregen waarschuwingen terug kunt zien bij welk restaurant staat eronder en ook heb ik nog phone support toegevoegd bij de bestel plattegrond hij zal nu automatisch kleiner worden en als laatste heb ik de zelfservice ui wat kleiner gemaakt zodat er meer in het beeld past de volgende updates zullen wat kleiner zijn maar nog steeds goed tot dan!'
  },   
  { 
    title: 'Upload een eigen melding geluid!', 
    date: '25-08-2026', 
    time: '21:15', 
    info: 'ik heb een paar kleine nieuwe dingen toegevoegd ten eerste heb ik toegevoegd dat je je eigen melding geluid kunt uploaden voor als er een bestelling binnenkomt de max is 1 bestand en 400KB ik heb ook een geluidje toegevoegd dat zich afspeeld als je betaald hebt ik heb ook nog toegeovegd dat ik een announcement kan plaatsen wat hetzelfde eruit ziet ls een waarschuwing en als laatste heb ik flinke aanpassingen gedaan aan de stijl hij zal er nu stukken cooler uitzien denk aan mooie pop-ups van uis en mooiere stijl!'
  },     
  { 
    title: 'Zelfservice en andere nieuwe dingen', 
    date: '24-08-2026', 
    time: '20:45', 
    info: 'dit is de grootste update die ooit gedaan zal worden het zal verschillende nieuwe grote dingen bevatten zoals een zelfservice systeem dit werkt zo: mensen scannen een qr code die te zien is in instellingen mensen kiezen een tafel en kiezen de producten die ze willen bestellen met de opmerkingen bijv. ijsklontjes ze kunnen ook nog een extra getypte opmerking toevoegen ze sturen de bestelling naar de keuken daar gaat alles zoals normaal maar terwijl de bestelling gemaakt wordt kunnen de klanten bij verzonden bestellingen zien in welk stadium de bestelling is en hoeveel bestellingen er nog voor zijn voordat hij naar het nieuwe stadium gaat uiteundelijk wordt de bestelling naar de historie gestuurd en werkt het afrekenen hetzelfde ik heb ook toegevoegd dat ik bij systeem beheer je restaurant een waarschuwing kan geven als je restaurant niet helemaal op orde is ik heb ook nog de stijl flink geupgrade hij ziet er nu nog veel beter uit de volgende update zal kleiner zijn maar nog steeds net zo cool en hij komt binnenkort al uit!'
  },     
  {
    title: 'Kleine update met een paar verbeteringen',
    date: '24-08-2026',
    time: '11:45',
    info: 'ik heb een paar kleine dingen toegevoegd ten eerste kun je nu het lettertype veranderen je kunt kiezen uit 15 verschillende lettertypen ik heb ook mijn systeembeheer een beetje beter beveiligd ook kun je nu de tijd van de update release zien bij de update log natuurlijk zijn er ook ngo een paar bugfixes de volgende update zal de grootste ooit worden dus ben er zeker van dat je die ook uitcheckt als hij uit is!'
  },     
  {
    title: 'Systeem beheer en voorraad tab', 
    date: '24-08-2026', 
    time: '08:00',
    info: 'ik heb veel nieuwe dingen toegevoegd laten we beginnen bij de naamkleur aanpassen je kunt nu de naamkleur van je restaurant aanpassen en je moet jezelf nu een naam geven als je een retsaurant joint of maakt deze kleur kun je ook aanpassen ook heb ik toegevoegd dat je nu een restaurant makkelijk kunt verlaten in instellingen en als de eigenaar het restaurant verlaat wordt het hele restaurant verwijdert daarnaast heb ik ook toegevoegd dat je nu een bank horizontaal of verticaal kan zetten en ook heb ik toegevoegd dat ik als eigenaar elk retsaurant kan beheren, aanpassen en verwijderen als nodig ook kan ik hier andere kleine dingen in doen en als laatste (en de grootste) heb ik een nieuwe voorraad tab toegevoegd hier staan alle producten in en je kunt deze op uitverkocht zetten dan zijn ze niet meer te bestellen we hebben ook nog een paar bugfixes doorgevoerd de volgende update zal wat kleiner zijn maar zorg alsnog dat je die ook gaat uitchecken als hij uit is!'
  },    
  {
    title: 'Opmerkingen en nieuwe meubels',
    date: '22-08-2026',
    time: '20:00', 
    info: 'Ten eerste heb ik toegevoegd dat je zelf extra opmerkingen kunt toevoegen zoals extra saus je kunt hier ook een emoji voor kiezen en het werkt een beetje zoals het oude ijsklontjes systeem ook heb ik toegevoegd dat je nu extra meubels kunt toevoegen dit zijn de nieuwe meubels: Een bar, een keuken en een bank ook kun je de tafels andere vormen geven dit zijn de vormen: rond, vierkant en rechthoek ook heb ik nog 5 extra achtergrond kleuren toegeovegd de volgende update word heel groot en zal binnenkort uitkomen!'
  },
  {
    title: 'Kleine update met een paar veranderingen',
    date: '20-08-2026',
    time: '21:00', 
    info: 'Ik heb 2 nieuwe dingen toegevoegd: Ten eerste heb ik toegevoegd dat je nu kunt kiezen welke achtergrondkleur je wilt je kunt kiezen uit 25 kleuren! Ten tweede heb ik toegevoegd dat je de plattegrond groter dan 20x20 vierkantjes kunt maken er zijn ook nog een paar kleine bugfixes de volgende update komt binnenkort uit dit zal een hele grote zijn!'
  },
  {
    title: 'Grote Update met veel nieuwe features',
    date: '19-08-2026',
    time: '20:30', 
    info: 'Ten eerste heb ik toegevoegd dat je je leden kunt beheren en kunt kiezen in welke tabs je leden kunnen komen bijv bestellen en historie dan kunnen ze alleen in de historie ten tweede heb ik een update log toegevoegd waar je de updates kunt zien die we doen ten derde heb ik toegevoegd dat je leden kunt kicken en dan refresht de code automatisch en ten vierde heb ik gefixt dat je nu aan beide kanten een gebied kunt vergroten en ten vijfde heb ik de stijl een beetje verandert waardoor het er nu stukken cleaner uitziet ik heb ook nog een paar andere bugs gefixt de nieuwe update komt uit binnenkort over een paar dagen!'
  },
];

// ==================== Weergave (niet nodig om aan te passen) ====================
function getUpdatesForLanguage() {
  const lang = localStorage.getItem('appLanguage') || 'nl';
  if (lang === 'en' && Array.isArray(window.UPDATES_EN)) return window.UPDATES_EN;
  if (lang === 'de' && Array.isArray(window.UPDATES_DE) && window.UPDATES_DE_READY) return window.UPDATES_DE;
  return UPDATES;
}

function renderUpdatesList() {
  const list = document.getElementById('updates-list');
  if (!list) return;
  const updates = getUpdatesForLanguage();
  if (updates.length === 0) {
    list.innerHTML = localStorage.getItem('appLanguage') === 'de' ? '<div class="empty-msg">Noch keine Updates.</div>' : (localStorage.getItem('appLanguage') === 'en' ? '<div class="empty-msg">No updates yet.</div>' : '<div class="empty-msg">Nog geen updates.</div>');
    return;
  }
  list.innerHTML = '';
  updates.forEach(u => {
    const item = document.createElement('div');
    item.className = 'update-item';
    item.innerHTML = `
      <button type="button" class="update-item-head">
        <span class="update-item-title">${escapeHtmlUpdates(u.title)}</span>
        <span class="update-item-right">
          <span class="update-item-date">${escapeHtmlUpdates(u.date)}${u.time ? ' · ' + escapeHtmlUpdates(u.time) : ''}</span>
          <span class="update-item-arrow">▾</span>
        </span>
      </button>
      <div class="update-item-info">${escapeHtmlUpdates(u.info)}</div>
    `;
    item.querySelector('.update-item-head').addEventListener('click', () => item.classList.toggle('open'));
    list.appendChild(item);
  });
}

function escapeHtmlUpdates(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function loadUpdateLanguage(){
  const lang=localStorage.getItem('appLanguage')||'nl';
  if(lang==='en'){
    const script=document.createElement('script'); script.src='updates-en.js?v='+Date.now(); script.onload=renderUpdatesList; document.head.appendChild(script);
  } else if(lang==='de'){
    const en=document.createElement('script'); en.src='updates-en.js?v='+Date.now();
    en.onload=()=>{ const de=document.createElement('script'); de.src='updates-de.js?v='+Date.now(); de.onload=()=>{ if(window.UPDATES_DE_READY) renderUpdatesList(); }; document.head.appendChild(de); window.addEventListener('updates-de-ready',renderUpdatesList,{once:true}); };
    document.head.appendChild(en);
  } else renderUpdatesList();
}

loadUpdateLanguage();
window.addEventListener('updates-de-ready',()=>{if(localStorage.getItem('appLanguage')==='de')renderUpdatesList();});

// Gebruikt de openModal-functie die al door landing.js / restaurant.js is gedefinieerd.
const btnUpdates = document.getElementById('btn-updates');
if (btnUpdates) {
  btnUpdates.addEventListener('click', () => openModal('modal-updates'));
}
