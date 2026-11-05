// Verbindung zu Supabase (Backstage unter /backstage und Demo-Formular).
// Werte aus Supabase → Project Settings → API: "Project URL" und "anon public" bzw. "publishable" Key.
// Beide Werte sind öffentlich gedacht; geschützt wird alles durch die Zugriffsregeln in der Datenbank.
// Solange sie leer sind, läuft die Website wie bisher und Backstage zeigt eine Einrichtungs-Hilfe.
window.LIS_CONFIG = {
  SUPABASE_URL: 'https://ukwlvsybubfybjiywhib.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_8CdeGacFDWS9VrXXl2Xmgg_9O6ZeJcm'
};
