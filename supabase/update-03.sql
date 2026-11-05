-- LIS Backstage · update-03: Bibliothek (Beats und Texte)
-- Voraussetzung: update-01.sql und update-02.sql sind gelaufen. Im SQL Editor komplett einfügen und "Run" klicken.
-- Darf mehrfach ausgeführt werden.

create table if not exists public.bibliothek (
  id          bigint generated always as identity primary key,
  typ         text not null check (typ in ('beat','text')),
  titel       text not null check (length(titel) between 1 and 200),
  url         text check (url is null or url ~* '^https?://'),   -- Link zu YouTube, SoundCloud, Spotify, Bandcamp
  pfad        text,                                               -- Pfad im Speicher "medien" (hochgeladene Datei)
  dateiname   text,
  groesse     bigint,
  bpm         integer check (bpm is null or bpm between 30 and 300),
  tonart      text not null default '' check (length(tonart) <= 20),
  tags        text not null default '' check (length(tags) <= 200),
  inhalt      text not null default '' check (length(inhalt) <= 100000),   -- geschriebener Text
  notizen     text not null default '' check (length(notizen) <= 5000),
  artist_id   bigint references public.artists(id) on delete set null,
  release_id  bigint references public.releases(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists bibliothek_artist_idx on public.bibliothek(artist_id);
create index if not exists bibliothek_release_idx on public.bibliothek(release_id);

drop trigger if exists bibliothek_touch on public.bibliothek;
create trigger bibliothek_touch before update on public.bibliothek
  for each row execute function public.touch_updated_at();

alter table public.bibliothek enable row level security;
drop policy if exists "label alles" on public.bibliothek;
create policy "label alles" on public.bibliothek for all to authenticated
  using (public.ist_label()) with check (public.ist_label());

revoke all on public.bibliothek from anon;
grant select, insert, update, delete on public.bibliothek to authenticated;
grant select, insert, update, delete on public.bibliothek to service_role;

-- Speicher: zusätzlich Word-Dokumente für Texte
update storage.buckets
set allowed_mime_types = (
  select array(select distinct unnest(coalesce(allowed_mime_types, '{}'::text[]) || array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword','text/markdown','audio/ogg','audio/webm'
  ]))
)
where id = 'medien';
