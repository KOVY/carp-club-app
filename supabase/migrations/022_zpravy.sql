-- 022_zpravy.sql — Fáze 3c: chat + přivolání. Pustit ručně.
CREATE TABLE IF NOT EXISTS zpravy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  autor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  typ TEXT NOT NULL DEFAULT 'chat' CHECK (typ IN ('chat','privolani')),
  text TEXT,
  peg_cislo INT,
  vyrizeno BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zpravy_zavod ON zpravy(zavod_id, created_at);

ALTER TABLE zpravy ENABLE ROW LEVEL SECURITY;
-- Čtení: přihlášení (chat závodu není citlivý; realtime přes anon klíč vyžaduje SELECT)
CREATE POLICY "Zpravy viewable by authenticated" ON zpravy FOR SELECT TO authenticated USING (true);
-- Vložení: jen sám za sebe (autor)
CREATE POLICY "User can insert own zprava" ON zpravy
  FOR INSERT TO authenticated WITH CHECK (autor_user_id = auth.uid());
-- UPDATE (vyrizeno) jen přes service role (rozhodčí action) — žádná klientská UPDATE policy.

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE zpravy;
