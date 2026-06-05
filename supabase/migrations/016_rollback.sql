-- 016_rollback.sql — NOUZOVÝ návrat k původním (děravým) politikám.
-- Spustit jen pokud migrace 016 způsobí problém a je potřeba okamžitě obnovit původní chování.

-- 3.1 obnovit anonymní čtení pozvánek
CREATE POLICY "Anon can verify token" ON pozvanky FOR SELECT TO anon USING (true);

-- 3.2 obnovit EXECUTE pro anon/authenticated
GRANT EXECUTE ON FUNCTION register_via_invitation(uuid) TO anon, authenticated;

-- 3.3 obnovit SELECT na email/telefon
GRANT SELECT (email, telefon) ON profiles TO anon, authenticated;

-- 3.4 obnovit veřejné/authenticated čtení system_admins
CREATE POLICY "Anon can read system_admins" ON system_admins FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read system_admins" ON system_admins FOR SELECT TO authenticated USING (true);
