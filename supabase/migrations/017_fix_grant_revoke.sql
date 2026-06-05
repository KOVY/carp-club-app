-- 017_fix_grant_revoke.sql
-- Oprava migrace 016: dva REVOKE byly neúčinné kvůli PostgreSQL GRANT pravidlům.
-- Probe (scripts/security-probe.ts) po 016 ukázal, že profiles PII a register_via_invitation
-- jsou stále přístupné anonymně. Příčiny:
--   1) profiles: column-level REVOKE SELECT(email,telefon) NEMÁ efekt, dokud má role
--      table-level GRANT SELECT (Supabase ho dává defaultně). Nutno: REVOKE celé tabulky
--      + GRANT jen na povolené sloupce.
--   2) register_via_invitation: funkce má defaultní EXECUTE pro PUBLIC; REVOKE od anon/
--      authenticated nestačí, protože PUBLIC grant zůstává. Nutno REVOKE FROM PUBLIC.

-- 3.3 (oprava) profiles: skutečně skrýt email/telefon přes column-level GRANT
REVOKE SELECT ON profiles FROM anon, authenticated;
GRANT SELECT (id, jmeno, created_at, updated_at, terms_accepted_at, privacy_policy_version)
  ON profiles TO anon, authenticated;
-- service_role si ponechává plný SELECT (server actions čtou vlastní/cizí PII přes service role)

-- 3.2 (oprava) register_via_invitation: odebrat i implicitní PUBLIC EXECUTE
REVOKE EXECUTE ON FUNCTION register_via_invitation(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION register_via_invitation(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION register_via_invitation(uuid) TO service_role;
