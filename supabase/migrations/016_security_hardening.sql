-- 016_security_hardening.sql
-- Fáze 0 bezpečnostní hotfix. Pustit AŽ PO nasazení TS změn (větev feat/faze-0-security-hardening),
-- jinak se odřízne admin / vlastní telefon / registrace. Zpětně kompatibilní s nasazeným TS.

-- 3.1 pozvanky: zrušit anonymní čtení tokenů
-- (ověření tokenu běží server-side přes service role ve verifyPozvanka)
DROP POLICY IF EXISTS "Anon can verify token" ON pozvanky;

-- 3.2 register_via_invitation: jen service role
-- (app volá tuto funkci přes adminClient / service role)
REVOKE EXECUTE ON FUNCTION register_via_invitation(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION register_via_invitation(uuid) TO service_role;

-- 3.3 profiles: skrýt email a telefon (jmeno zůstává veřejné kvůli leaderboardu/týmům)
-- (server actions čtou vlastní i potřebné cizí PII přes service role)
REVOKE SELECT (email, telefon) ON profiles FROM anon, authenticated;

-- 3.4 system_admins: zrušit veřejné/authenticated čtení
-- (čte se přes is_system_admin() SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "Anon can read system_admins" ON system_admins;
DROP POLICY IF EXISTS "Authenticated can read system_admins" ON system_admins;
