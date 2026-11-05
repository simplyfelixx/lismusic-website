// Verbindung zu Supabase (Cockpit unter /admin und Demo-Formular).
// Werte aus Supabase → Project Settings → API: "Project URL" und "anon public" bzw. "publishable" Key.
// Beide Werte sind öffentlich gedacht; geschützt wird alles durch die Zugriffsregeln in der Datenbank.
// Solange sie leer sind, läuft die Website wie bisher und das Cockpit zeigt eine Einrichtungs-Hilfe.
window.LIS_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};
