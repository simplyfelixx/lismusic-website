-- LIS Music Backstage · update-01: Grundgerüst
-- Im Supabase-Dashboard unter "SQL Editor" komplett einfügen und "Run" klicken.
-- Darf mehrfach ausgeführt werden (legt nur an, was fehlt).
--
-- Zugriff: Nur Personen aus der Tabelle "team" mit Rolle "label" sehen etwas,
-- und nur nach Anmeldung mit Zwei-Faktor-Code (aal2).
-- Die Rolle "artist" ist vorbereitet (Artist-Login), hat aber noch keine Rechte.

-- ---------- Team ----------
create table if not exists public.team (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  rolle      text not null default 'label' check (rolle in ('label','artist')),
  artist_id  bigint,
  created_at timestamptz not null default now()
);

-- true, wenn die angemeldete Person zum Label gehört und mit 2FA angemeldet ist
create or replace function public.ist_label() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt()->>'aal') = 'aal2', false)
     and exists (select 1 from public.team t where t.user_id = auth.uid() and t.rolle = 'label')
$$;
revoke all on function public.ist_label() from public;
grant execute on function public.ist_label() to authenticated;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- Artists ----------
create table if not exists public.artists (
  id          bigint generated always as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name        text not null check (length(name) between 1 and 120),
  genre       text not null default '',
  bio         text not null default '',
  foto        text,                       -- Pfad im Speicher "medien"
  links       jsonb not null default '{}'::jsonb,  -- {"spotify": "...", "instagram": "...", ...}
  oeffentlich boolean not null default false,       -- auf lismusic.de zeigen
  sortierung  integer not null default 0,
  status      text not null default 'demo'
              check (status in ('demo','gehoert','gespraech','vertrag','signed','pausiert','absage')),
  -- intern (geht nie auf die Website)
  buerg_name  text not null default '',
  email       text not null default '',
  tel         text not null default '',
  notizen     text not null default '',
  wv          date,                       -- Wiedervorlage
  log         jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Releases ----------
create table if not exists public.releases (
  id           bigint generated always as identity primary key,
  artist_id    bigint references public.artists(id) on delete set null,
  titel        text not null check (length(titel) between 1 and 200),
  typ          text not null default 'Single' check (typ in ('Single','EP','Album')),
  datum        date,                      -- Release-Tag
  datum_text   text not null default '',  -- statt Datum anzeigen, z. B. "2027"
  cover        text,                      -- Pfad im Speicher "medien"
  links        jsonb not null default '{}'::jsonb,  -- {"spotify": "...", "presave": "...", ...}
  isrc         text not null default '',
  upc          text not null default '',
  status       text not null default 'planung'
               check (status in ('planung','produktion','fertig','eingereicht','veroeffentlicht')),
  oeffentlich  boolean not null default false,
  notizen      text not null default '',
  log          jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists releases_artist_idx on public.releases(artist_id);

-- ---------- Aufgaben (Checkliste pro Release, oder frei) ----------
create table if not exists public.aufgaben (
  id          bigint generated always as identity primary key,
  release_id  bigint references public.releases(id) on delete cascade,
  artist_id   bigint references public.artists(id) on delete cascade,
  bereich     text not null default 'sonstiges'
              check (bereich in ('track','cover','metadaten','rechte','werbung','social','sonstiges')),
  titel       text not null check (length(titel) between 1 and 300),
  tage        integer,                    -- Abstand zum Release-Tag (z. B. -28), für Neuberechnung
  faellig     date,
  erledigt    boolean not null default false,
  erledigt_am timestamptz,
  sortierung  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists aufgaben_release_idx on public.aufgaben(release_id);
create index if not exists aufgaben_faellig_idx on public.aufgaben(faellig) where not erledigt;

-- ---------- Content-Plan (TikTok, Reels, YouTube …) ----------
create table if not exists public.content (
  id          bigint generated always as identity primary key,
  release_id  bigint references public.releases(id) on delete cascade,
  artist_id   bigint references public.artists(id) on delete cascade,
  plattform   text not null default 'tiktok' check (plattform in ('tiktok','instagram','youtube','sonstiges')),
  idee        text not null check (length(idee) between 1 and 500),
  datum       date,
  status      text not null default 'idee' check (status in ('idee','gedreht','geplant','gepostet')),
  link        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- News ----------
create table if not exists public.news (
  id          bigint generated always as identity primary key,
  datum       date not null default current_date,
  titel       text not null check (length(titel) between 1 and 200),
  kategorie   text not null default 'Label',
  text        text not null default '',
  oeffentlich boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Demos (vom Formular auf lismusic.de) ----------
create table if not exists public.demos (
  id          bigint generated always as identity primary key,
  artist      text not null check (length(artist) between 1 and 120),
  email       text not null check (length(email) between 3 and 200),
  genre       text not null default '' check (length(genre) <= 60),
  link        text not null check (length(link) between 8 and 500 and link ~* '^https?://'),
  nachricht   text not null default '' check (length(nachricht) <= 3000),
  status      text not null default 'neu' check (status in ('neu','gehoert','abgelehnt','uebernommen')),
  bewertung   integer check (bewertung between 1 and 5),
  notiz       text not null default '',
  artist_id   bigint references public.artists(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- Protokoll der Veröffentlichungen ----------
create table if not exists public.veroeffentlichungen (
  id         bigint generated always as identity primary key,
  zeit       timestamptz not null default now(),
  user_id    uuid default auth.uid(),
  commit_sha text,
  hinweis    text not null default ''
);

-- updated_at automatisch setzen
do $$ declare t text; begin
  foreach t in array array['artists','releases','aufgaben','content','news'] loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s', t);
    execute format('create trigger %1$s_touch before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- Zugriffsregeln ----------
do $$ declare t text; begin
  foreach t in array array['team','artists','releases','aufgaben','content','news','demos','veroeffentlichungen'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "label alles" on public.%I', t);
  end loop;
  -- Label (mit 2FA) darf in diesen Tabellen alles
  foreach t in array array['artists','releases','aufgaben','content','news','demos'] loop
    execute format('create policy "label alles" on public.%I for all to authenticated using (public.ist_label()) with check (public.ist_label())', t);
  end loop;
end $$;

-- Team: Label sieht das Team, jede Person sieht den eigenen Eintrag. Ändern nur per SQL-Editor.
drop policy if exists "team lesen" on public.team;
create policy "team lesen" on public.team for select to authenticated
  using (user_id = auth.uid() or public.ist_label());

-- Veröffentlichungen: Label darf lesen (geschrieben wird von der Server-Funktion)
drop policy if exists "label lesen" on public.veroeffentlichungen;
create policy "label lesen" on public.veroeffentlichungen for select to authenticated using (public.ist_label());

-- Rechte auf Tabellenebene (zusätzlich zu den Zeilenregeln): Gäste dürfen nur Demos eintragen
revoke all on public.team, public.artists, public.releases, public.aufgaben, public.content, public.news, public.demos, public.veroeffentlichungen from anon;
grant select, insert, update, delete on public.artists, public.releases, public.aufgaben, public.content, public.news, public.demos to authenticated;
grant select on public.team, public.veroeffentlichungen to authenticated;

-- Die Server-Funktion (service_role) braucht ebenfalls ausdrückliche Rechte, falls "Automatically expose new tables" aus ist
grant select on public.artists, public.releases, public.news to service_role;
grant select, insert, update, delete on public.team, public.artists, public.releases, public.aufgaben, public.content, public.news, public.demos, public.veroeffentlichungen to service_role;
grant usage on all sequences in schema public to service_role;

-- Demo-Formular: jeder darf eine neue Demo EINTRAGEN, aber nichts lesen oder ändern
drop policy if exists "demo eintragen" on public.demos;
create policy "demo eintragen" on public.demos for insert to anon
  with check (status = 'neu' and bewertung is null and artist_id is null and notiz = '');
grant insert (artist, email, genre, link, nachricht) on public.demos to anon;

-- ---------- Speicher für Bilder und Dateien (privat) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medien', 'medien', false, 15728640,
        array['image/jpeg','image/png','image/webp','audio/wav','audio/x-wav','audio/mpeg','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "label medien lesen" on storage.objects;
drop policy if exists "label medien schreiben" on storage.objects;
drop policy if exists "label medien aendern" on storage.objects;
drop policy if exists "label medien loeschen" on storage.objects;
create policy "label medien lesen" on storage.objects for select to authenticated
  using (bucket_id = 'medien' and public.ist_label());
create policy "label medien schreiben" on storage.objects for insert to authenticated
  with check (bucket_id = 'medien' and public.ist_label());
create policy "label medien aendern" on storage.objects for update to authenticated
  using (bucket_id = 'medien' and public.ist_label());
create policy "label medien loeschen" on storage.objects for delete to authenticated
  using (bucket_id = 'medien' and public.ist_label());

-- ---------- Startdaten: die heutigen Platzhalter der Website ----------
insert into public.artists (slug, name, genre, oeffentlich, sortierung, status)
select * from (values
  ('artist-eins','Artist Eins','Rap',true,1,'signed'),
  ('artist-zwei','Artist Zwei','R&B',true,2,'signed'),
  ('artist-drei','Artist Drei','Pop',true,3,'signed'),
  ('artist-vier','Artist Vier','Rap',true,4,'signed')
) v(slug,name,genre,oeffentlich,sortierung,status)
where not exists (select 1 from public.artists);

insert into public.releases (artist_id, titel, typ, datum, datum_text, oeffentlich, status)
select a.id, v.titel, v.typ, v.datum::date, v.datum_text, true, 'planung' from (values
  ('artist-eins','Songtitel','Single','2026-12-01',''),
  ('artist-zwei','EP-Titel','EP',null,'2027'),
  ('artist-drei','Songtitel','Single',null,'2027')
) v(slug,titel,typ,datum,datum_text) join public.artists a on a.slug = v.slug
where not exists (select 1 from public.releases);

insert into public.news (datum, titel, kategorie)
select * from (values
  ('2026-11-20'::date,'Erste Single kommt am 01.12.','Release'),
  ('2026-11-04'::date,'LIS Music ist gestartet','Label'),
  ('2026-11-01'::date,'Wir suchen neue Artists','Demo')
) v(datum,titel,kategorie)
where not exists (select 1 from public.news);
