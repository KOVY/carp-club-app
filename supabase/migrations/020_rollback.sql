-- 020_rollback.sql — odebere config sloupce (opravená logika triggeru má COALESCE fallback 3/3/6).
ALTER TABLE zavody DROP COLUMN IF EXISTS diskvalifikace_pocet_karet;
ALTER TABLE zavody DROP COLUMN IF EXISTS stopka_hodiny_1_karta;
ALTER TABLE zavody DROP COLUMN IF EXISTS stopka_hodiny_2_karta;
