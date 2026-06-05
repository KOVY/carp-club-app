-- 019_prihlasky.sql — samoobslužné hlášení na závod (Fáze 2). Pustit ručně.
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS pocet_pegu INT;

CREATE TABLE IF NOT EXISTS prihlasky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  kapitan_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nazev_tymu TEXT NOT NULL,
  clenove TEXT,
  stav TEXT NOT NULL DEFAULT 'prihlasen'
       CHECK (stav IN ('prihlasen','nahradnik','schvaleno','zruseno')),
  poradi_nahradnika INT,
  tym_id UUID REFERENCES tymy(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zavod_id, kapitan_user_id)
);
CREATE INDEX IF NOT EXISTS idx_prihlasky_zavod ON prihlasky(zavod_id);
CREATE INDEX IF NOT EXISTS idx_prihlasky_kapitan ON prihlasky(kapitan_user_id);

ALTER TABLE prihlasky ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prihlasky viewable by everyone" ON prihlasky FOR SELECT USING (true);
CREATE POLICY "User can insert own prihlaska" ON prihlasky
  FOR INSERT TO authenticated WITH CHECK (kapitan_user_id = auth.uid());
CREATE POLICY "User can update own prihlaska" ON prihlasky
  FOR UPDATE TO authenticated USING (kapitan_user_id = auth.uid());
