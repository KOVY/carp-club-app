-- 019_rollback.sql
DROP TABLE IF EXISTS prihlasky;
ALTER TABLE zavody DROP COLUMN IF EXISTS pocet_pegu;
