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
-- ŽÁDNÉ policies pro anon/authenticated → výchozí DENY (RLS bez policy nepustí nikoho
-- kromě service role). Veškerý přístup (čtení i zápis) jde přes service role v
-- src/actions/prihlasky.actions.ts s vlastní autorizační logikou (vlastnictví přihlášky
-- u rybáře / scope pořadatele konkrétního závodu). Tím je z klientského klíče znemožněno:
--   • self-schválení (změna stav→'schvaleno' nebo tym_id přímým UPDATE),
--   • insert-time escalation (vložení cizí nebo rovnou schválené přihlášky),
--   • únik PII (jména členů v 'clenove' nejsou veřejně čitelná přes anon klíč).
