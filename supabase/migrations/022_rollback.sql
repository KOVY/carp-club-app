-- 022_rollback.sql
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS zpravy;
DROP TABLE IF EXISTS zpravy;
