// Dit is de enige plek waar je iets hoeft aan te passen om een item
// toe te voegen, te hernoemen, of te verwijderen.
//
// key    -> interne naam, gebruikt in de database (verander deze niet meer
//           nadat je bestellingen hebt geplaatst, anders raken oude/lopende
//           bestellingen de tel kwijt)
// label  -> de naam die klant en keuken op het scherm zien
// emoji  -> icoontje voor op de knop (mag leeg zijn: "")
//
// Voorbeeld om zelf een item toe te voegen:
// { key: 'fanta', label: 'Fanta', emoji: '🍊' },

const PRODUCTS = [
  { key: 'aardbeienvlaai',      label: 'Aardbeien Vlaai',        emoji: '🍓' },
  { key: 'kersenbastognevlaai', label: 'Kersen Bastogne Vlaai',  emoji: '🥧' },
  { key: 'americancookies',     label: 'American Cookies',       emoji: '🍪' },
  { key: 'koffie',      label: 'Koffie',          emoji: '☕' },
  { key: 'cappuccino',  label: 'Cappuccino',      emoji: '☕' },
  { key: 'cola',        label: 'Cola Zero',       emoji: '🥤' },
  { key: 'fantalemon',  label: 'Fanta Lemon',     emoji: '🍋' },
  { key: 'icetea',      label: 'Ice Tea Green',   emoji: '🧊' },
  { key: 'sparood',     label: 'Spa Rood',        emoji: '💧' },
  { key: 'water',       label: 'Water',           emoji: '🚰' },
  { key: 'ranja',       label: 'Ranja',           emoji: '🧃' },
  { key: 'martinitonic', label: 'Martini Tonic',  emoji: '🍸' },
  { key: 'rose',      label: 'Rosé',            emoji: '🍷' },
  { key: 'wittewijn', label: 'Witte Wijn',      emoji: '🥂' },
  { key: 'radler',    label: 'Radler 0.0%',     emoji: '🍺' },
  { key: 'weizner',   label: 'Weizner',         emoji: '🍺' },
  { key: 'hertogjan', label: 'Hertog Jan Bier', emoji: '🍻' },
  { key: 'chips',     label: 'Chips',           emoji: '🍟' },
  { key: 'nootjes',   label: 'Nootjes',         emoji: '🥜' },
  { key: 'worstjeskaasjes', label: 'Worstjes/Kaasjes', emoji: '🧀' },
  { key: 'crackertjes',     label: 'Crackertjes',      emoji: '🍘' },
  { key: 'groenten',        label: 'Groenten',         emoji: '🥕' }
];

// IJsklontjes is geen apart te bestellen item (geen +/- knop), maar wordt
// wel meegenomen in de voorraad van de keuken, en bepaalt of de
// "met/zonder ijs"-keuze bij de onderstaande drankjes beschikbaar is.
const EXTRA_STOCK_ITEMS = [
  { key: 'ijsklontjes', label: 'IJsklontjes', emoji: '🧊' }
];

// Bij deze drankjes verschijnt de keuze "met/zonder ijsklontjes" zodra
// je er minstens 1 van bestelt.
const ICE_OPTION_KEYS = ['cola', 'fantalemon', 'water', 'sparood', 'icetea', 'martinitonic', 'ranja'];
