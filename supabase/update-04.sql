-- LIS Backstage · update-04: Bildgröße bei Dateien (für die Cover-Prüfung)
-- Voraussetzung: update-02.sql ist gelaufen. Im SQL Editor komplett einfügen und "Run" klicken.
-- Darf mehrfach ausgeführt werden. Ohne diese Datei läuft alles, nur die Cover-Größe wird nicht geprüft.

alter table public.dateien add column if not exists breite integer;
alter table public.dateien add column if not exists hoehe integer;
