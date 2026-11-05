-- LIS Backstage · update-02: Dateien pro Song
-- Voraussetzung: update-01.sql ist gelaufen. Im SQL Editor komplett einfügen und "Run" klicken.
-- Darf mehrfach ausgeführt werden.

-- Dateien und Links pro Release: Master, Instrumental, Cover-Varianten, Lyrics, Fotos, Videos, Verträge ...
create table if not exists public.dateien (
  id          bigint generated always as identity primary key,
  release_id  bigint not null references public.releases(id) on delete cascade,
  art         text not null default 'sonstiges'
              check (art in ('master','instrumental','clean','stems','cover','lyrics','foto','video','vertrag','sonstiges')),
  name        text not null check (length(name) between 1 and 200),
  pfad        text,                        -- Pfad im Speicher "medien" (hochgeladene Datei)
  url         text check (url is null or url ~* '^https?://'),   -- oder ein Link (Drive, WeTransfer, ...)
  groesse     bigint,
  created_at  timestamptz not null default now(),
  check (pfad is not null or url is not null)
);
create index if not exists dateien_release_idx on public.dateien(release_id);

alter table public.dateien enable row level security;
drop policy if exists "label alles" on public.dateien;
create policy "label alles" on public.dateien for all to authenticated
  using (public.ist_label()) with check (public.ist_label());

revoke all on public.dateien from anon;
grant select, insert, update, delete on public.dateien to authenticated;
grant select, insert, update, delete on public.dateien to service_role;

-- Speicher: bis 50 MB pro Datei (Gratis-Maximum von Supabase), mehr Dateitypen (Audio, Video, ZIP)
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'audio/wav','audio/x-wav','audio/mpeg','audio/mp4','audio/flac','audio/x-flac','audio/aiff','audio/x-aiff',
      'video/mp4','video/quicktime',
      'application/pdf','application/zip','text/plain'
    ]
where id = 'medien';
