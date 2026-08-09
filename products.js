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
  { key: 'cola',      label: 'Cola Zero',       emoji: '🥤' },
  { key: 'vlaai',     label: 'Vlaai',           emoji: '🥧' },
  { key: 'koffie',    label: 'Koffie',          emoji: '☕' },
  { key: 'sparood',   label: 'Spa Rood',        emoji: '💧' },
  { key: 'icetea',    label: 'Ice Tea Green',   emoji: '🧊' },
  { key: 'water',     label: 'Water',           emoji: '🚰' },
  { key: 'rose',      label: 'Rosé',            emoji: '🍷' },
  { key: 'wittewijn', label: 'Witte Wijn',      emoji: '🥂' },
  { key: 'weizner',   label: 'Weizner',         emoji: '🍺' },
  { key: 'hertogjan', label: 'Hertog Jan Bier', emoji: '🍻' }
];
