# LIS Backstage einrichten

Backstage läuft unter **lismusic.de/backstage**. Dort pflegt ihr Artists, Releases mit Checkliste, den Content-Plan (TikTok & Co.), News und Demos. Mit **Website → Jetzt veröffentlichen** landen Artists, Releases und News auf lismusic.de.

So hängt es zusammen:

- **Supabase** (Datenbank in Frankfurt) speichert alles und regelt den Login mit Zwei-Faktor-Code.
- **Veröffentlichen** schreibt nur die öffentlichen Inhalte als `data/site.json` und die Bilder nach `media/` in dieses Repo. Netlify stellt das in ca. 1 Minute live.
- Interne Daten (Kontakte, Notizen, Demos, Aufgaben) bleiben nur in Supabase. Dieses Repo ist öffentlich, deshalb kommt dort nichts Internes hin.

Einmalig ca. 30 Minuten. Reihenfolge einhalten.

## 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) mit der neuen E-Mail registrieren.
2. **New project**: Name `lismusic`, Region **Central EU (Frankfurt)**, ein starkes Datenbank-Passwort (in den Passwort-Manager).
3. Beim Anlegen unter **Security**: **Enable Data API** an, **Automatically expose new tables** aus, **Enable automatic RLS** an. Die SQL-Datei vergibt die nötigen Rechte selbst und schaltet die Zugriffsregeln ein.
4. **Authentication → Sign In / Providers**: „Allow new users to sign up“ **ausschalten**. Nur ihr legt Accounts an.
5. **Authentication → Multi-Factor**: TOTP (Authenticator App) muss aktiv sein (ist es normalerweise).

## 2. Datenbank einrichten

1. **SQL Editor → New query**, den kompletten Inhalt von `supabase/update-01.sql` einfügen, **Run**.
2. Es legt alle Tabellen, die Zugriffsregeln, den Bilder-Speicher und die heutigen Platzhalter von der Website an. Die Datei darf man mehrfach ausführen.

**Danach gleich `supabase/update-02.sql` ausführen** (Dateien pro Song: Master, Instrumental, Cover-Varianten, Lyrics, Links). Ohne diese Datei zeigt Backstage bei den Songs nur einen Hinweis statt der Datei-Ablage.

Spätere Änderungen kommen als `update-03.sql` … und werden genauso ausgeführt.

## 3. Accounts für Felix und Lasse

1. **Authentication → Users → Add user → Create new user**: E-Mail und Passwort, „Auto Confirm User“ anhaken. Für beide.
2. Im **SQL Editor** beide ins Team eintragen (E-Mails anpassen):

```sql
insert into public.team (user_id, name)
select id, case email when 'felix@lismusic.de' then 'Felix' else 'Lasse' end
from auth.users where email in ('felix@lismusic.de', 'lasse@lismusic.de')
on conflict (user_id) do nothing;
```

Wer nicht in `team` steht, sieht in Backstage nichts, auch wenn er sich anmelden kann.

## 4. Backstage mit Supabase verbinden

In **Project Settings → API** stehen die **Project URL** und der **anon / publishable key**. Beide in `config.js` eintragen (oder Claude schicken, der trägt sie ein). Diese beiden Werte sind öffentlich gedacht, geschützt wird alles durch die Regeln in der Datenbank. Den **service_role / secret key** niemals in `config.js` oder irgendwo ins Repo schreiben.

Danach `lismusic.de/backstage` öffnen, anmelden und den QR-Code mit einer Authenticator-App scannen (Google Authenticator, 2FAS, 1Password …). Ab dann fragt das Cockpit bei jeder Anmeldung den 6-stelligen Code ab.

Tipp fürs Handy: `lismusic.de/backstage` im Browser öffnen → Teilen → „Zum Home-Bildschirm“.

## 5. Knopf „Veröffentlichen“ einrichten

1. **GitHub-Token erstellen**: [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
   - Name `lis-backstage-veroeffentlichen`, Ablauf 1 Jahr (Erinnerung in den Kalender)
   - Repository access: **Only select repositories → lismusic-website**
   - Permissions → Repository → **Contents: Read and write**
2. In Supabase **Edge Functions → Secrets**: `GITHUB_TOKEN` = der Token.
3. **Edge Functions → Deploy a new function → Via Editor**: Name `veroeffentlichen`, den Inhalt von `supabase/functions/veroeffentlichen/index.ts` einfügen, **Deploy**.
   (Alternativ mit der Supabase-CLI: `supabase functions deploy veroeffentlichen`.)

Die Commits laufen unter dem Autor `simplyfelixx`, damit Netlify sie baut. Andere Werte lassen sich mit den Secrets `COMMIT_NAME` und `COMMIT_EMAIL` setzen.

## 6. Backups

Die Datenbank wird 2× täglich gesichert, verschlüsselt, und 14 Tage aufbewahrt. Weil dieses Repo öffentlich ist, liegen die Backups in einem eigenen **privaten** Repo.

1. Auf GitHub ein neues **privates** Repo `lismusic-backups` anlegen (leer).
2. Zweiten Fine-grained Token wie oben erstellen, aber nur für **lismusic-backups**, Contents: Read and write.
3. In **lismusic-website → Settings → Secrets and variables → Actions** vier Secrets anlegen:
   - `SUPABASE_URL`: die Project URL
   - `SUPABASE_SERVICE_KEY`: der **service_role / secret key** aus Supabase (bleibt nur hier geheim)
   - `BACKUP_PASSWORD`: ein langes Passwort (in den Passwort-Manager, ohne kein Wiederherstellen)
   - `BACKUP_REPO_TOKEN`: der zweite Token
4. Unter **Actions → Backstage-Backup → Run workflow** einmal testen.

Das Backup hält nebenbei das Supabase-Gratisprojekt aktiv (Supabase pausiert Gratisprojekte nach 7 Tagen ohne Aktivität). Die Website selbst ist davon nicht betroffen, sie liest nur `data/site.json`.

Wiederherstellen: Backup-Datei aus dem Branch `backups` laden und entschlüsseln mit
`gpg -d lis-backstage-backup-….json.gpg > backup.json`.

Hochgeladene Bilder liegen im Supabase-Speicher `medien`. Die veröffentlichten Bilder liegen zusätzlich in diesem Repo unter `media/`.

## 7. Demo-Formular

Demos von lismusic.de landen weiter per Netlify Forms im Postfach **und** zusätzlich in Backstage unter **Demos**, sobald `config.js` ausgefüllt ist. Gäste dürfen dort nur eintragen, nicht lesen.

## Was wo liegt

| Datei | Wofür |
|-|-|
| `backstage/index.html` | Backstage |
| `config.js` | Supabase-Adresse und öffentlicher Schlüssel |
| `data/site.json`, `media/` | Was auf der Website steht (schreibt Backstage, nicht von Hand ändern) |
| `supabase/update-NN.sql` | Datenbank-Änderungen, der Reihe nach ausführen (01, dann 02) |
| `supabase/functions/veroeffentlichen/` | Server-Funktion für den Knopf „Veröffentlichen“ |
| `.github/workflows/backup.yml` | Automatische Backups |
