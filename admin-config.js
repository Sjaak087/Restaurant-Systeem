// ==================== Restaurantbeheer instellingen ====================
// Pas hieronder het wachtwoord aan waarmee jij (als beheerder) kunt inloggen
// bij "Restaurant beheer" onderaan het startscherm. Met dit wachtwoord kun je
// ALLE restaurants zien, bewerken en verwijderen, dus kies iets unieks.
const ADMIN_PASSWORD = 'Damkau!735';

// Aantal keer dat iemand het wachtwoord fout mag invoeren voordat het
// inlogscherm tijdelijk wordt geblokkeerd.
const ADMIN_MAX_POGINGEN = 3;

// Hoe lang (in minuten) het inloggen geblokkeerd is nadat het wachtwoord
// ADMIN_MAX_POGINGEN keer achter elkaar fout is ingevoerd.
const ADMIN_LOCKOUT_MINUTEN = 2;
