// Dit is de enige plek waar je iets hoeft aan te passen om een item
// toe te voegen, te hernoemen, of te verwijderen.
//
// key      -> interne naam, gebruikt in de database (verander deze niet meer
//             nadat je bestellingen hebt geplaatst, anders raken oude/lopende
//             bestellingen de tel kwijt)
// label    -> de naam die klant en keuken op het scherm zien
// emoji    -> icoontje voor op de knop (mag leeg zijn: "")
// category -> moet overeenkomen met een key uit CATEGORIES hieronder.
//             Bepaalt in welk menu-blok het product staat én hoe het
//             wordt meegeteld in het verbruiksoverzicht bij de historie.
//
// Voorbeeld om zelf een item toe te voegen:
// { key: 'fanta', label: 'Fanta', emoji: '🍊', category: 'fris' },

const CATEGORIES = [
  { key: 'vlaai',     label: 'Vlaai & Gebak' },
  { key: 'warm',      label: 'Warme dranken' },
  { key: 'fris',      label: 'Frisdrank' },
  { key: 'cocktails', label: 'Cocktails' },
  { key: 'bierwijn',  label: 'Bier & Wijn' },
  { key: 'snacks',    label: 'Snacks' },
  { key: 'fruit',     label: 'Fruit' }
];

const PRODUCTS = [
  { key: 'aardbeienvlaai',      label: 'Aardbeien Vlaai',        emoji: '🍓', category: 'vlaai' },
  { key: 'kersenbastognevlaai', label: 'Kersen Bastogne Vlaai',  emoji: '🥧', category: 'vlaai' },
  { key: 'americancookies',     label: 'American Cookies',       emoji: '🍪', category: 'vlaai' },

  { key: 'koffie',     label: 'Koffie',     emoji: '☕', category: 'warm' },
  { key: 'cappuccino', label: 'Cappuccino', emoji: '☕', category: 'warm' },

  { key: 'cola',       label: 'Cola Zero',     emoji: '🥤', category: 'fris' },
  { key: 'fantalemon', label: 'Fanta Lemon',   emoji: '🍋', category: 'fris' },
  { key: 'icetea',     label: 'Ice Tea Green', emoji: '🧊', category: 'fris' },
  { key: 'sparood',    label: 'Spa Rood',      emoji: '💧', category: 'fris' },
  { key: 'water',      label: 'Water',         emoji: '🚰', category: 'fris' },
  { key: 'ranja',      label: 'Ranja',         emoji: '🧃', category: 'fris' },

  { key: 'martinitonic', label: 'Martini Tonic', emoji: '🍸', category: 'cocktails' },

  { key: 'rose',      label: 'Rosé',            emoji: '🍷', category: 'bierwijn' },
  { key: 'wittewijn', label: 'Witte Wijn',      emoji: '🥂', category: 'bierwijn' },
  { key: 'radler',    label: 'Radler 0.0%',     emoji: '🍺', category: 'bierwijn' },
  { key: 'weizner',   label: 'Weizner',         emoji: '🍺', category: 'bierwijn' },
  { key: 'hertogjan', label: 'Hertog Jan Bier', emoji: '🍻', category: 'bierwijn' },
  { key: 'desparados', label: 'Desparados Bier', emoji: '🍺', category: 'bierwijn' }, 
  
  { key: 'groenten',        label: 'Groenten',         emoji: '🥕', category: 'snacks' },
  { key: 'crackertjes',     label: 'Crackertjes',      emoji: '🍘', category: 'snacks' },
  { key: 'worstjeskaasjes', label: 'Worstjes/Kaasjes', emoji: '🧀', category: 'snacks' },
  { key: 'nootjes',         label: 'Nootjes',          emoji: '🥜', category: 'snacks' },
  { key: 'chips',           label: 'Chips',            emoji: '🍟', category: 'snacks' },

  { key: 'fruit', label: 'Fruit', emoji: '🍇', category: 'snacks' }
];

// IJsklontjes is geen apart te bestellen item (geen +/- knop), maar wordt
// wel meegenomen in de voorraad van de keuken, en bepaalt of de
// "met/zonder ijs"-keuze bij de onderstaande drankjes beschikbaar is.
const EXTRA_STOCK_ITEMS = [
  { key: 'ijsklontjes', label: 'IJsklontjes', emoji: '🧊' }
];

// Bij deze drankjes verschijnt de keuze "met/zonder ijsklontjes" zodra
// je er minstens 1 van bestelt. Fruit staat hier bewust niet bij.
const ICE_OPTION_KEYS = ['cola', 'fantalemon', 'water', 'sparood', 'icetea', 'martinitonic', 'ranja'];
