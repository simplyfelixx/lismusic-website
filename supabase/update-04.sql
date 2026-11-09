-- Update 04: Platzhalter-News entfernen, nur "LIS Music ist gestartet" bleibt.
-- Im Supabase SQL Editor ausführen. Danach in Backstage einmal "Veröffentlichen".
delete from public.news
where titel in ('Erste Single kommt am 01.12.', 'Wir suchen neue Artists');
