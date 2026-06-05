-- 020_pravidla_fix.sql — Fáze 3a: nastavitelná pravidla + oprava off-by-one. Pustit ručně.

-- Config per závod (nastavitelné prahy/hodiny)
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS diskvalifikace_pocet_karet INT DEFAULT 3;
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS stopka_hodiny_1_karta INT DEFAULT 3;
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS stopka_hodiny_2_karta INT DEFAULT 6;

-- Oprava triggeru: počítat VČETNĚ vkládané karty (nove_cislo = COUNT + 1),
-- prahy/hodiny z configu závodu.
CREATE OR REPLACE FUNCTION check_yellow_cards_2026()
RETURNS TRIGGER AS $$
DECLARE
  card_count INT;     -- počet karet PŘED vložením
  nove_cislo INT;     -- pořadí vkládané karty (od 1)
  last_catch_id UUID;
  v_prah INT;
  v_stopka_1 INT;
  v_stopka_2 INT;
BEGIN
  SELECT COUNT(*) INTO card_count
  FROM zlute_karty WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;
  nove_cislo := card_count + 1;
  NEW.cislo_karty := nove_cislo;

  SELECT COALESCE(diskvalifikace_pocet_karet, 3),
         COALESCE(stopka_hodiny_1_karta, 3),
         COALESCE(stopka_hodiny_2_karta, 6)
  INTO v_prah, v_stopka_1, v_stopka_2
  FROM zavody WHERE id = NEW.zavod_id;
  v_prah := COALESCE(v_prah, 3);
  v_stopka_1 := COALESCE(v_stopka_1, 3);
  v_stopka_2 := COALESCE(v_stopka_2, 6);

  IF nove_cislo >= v_prah THEN
    UPDATE ulovky SET stav = 'zamitnuto', updated_at = NOW()
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;
    NEW.stopka_do := NULL;
  ELSIF nove_cislo = 2 THEN
    UPDATE ulovky SET stav = 'zamitnuto', updated_at = NOW()
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;
    IF NEW.stopka_do IS NULL THEN NEW.stopka_do := NOW() + (v_stopka_2 || ' hours')::INTERVAL; END IF;
  ELSIF nove_cislo = 1 THEN
    SELECT id INTO last_catch_id FROM ulovky
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id AND stav IN ('potvrzeno','ceka')
    ORDER BY cas DESC LIMIT 1;
    IF last_catch_id IS NOT NULL THEN
      UPDATE ulovky SET stav = 'zamitnuto', updated_at = NOW() WHERE id = last_catch_id;
      NEW.odebrana_ryba_id := last_catch_id;
    END IF;
    IF NEW.stopka_do IS NULL THEN NEW.stopka_do := NOW() + (v_stopka_1 || ' hours')::INTERVAL; END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Úklid: odpojená stará funkce z migrace 003 (trigger už byl dropnut v 014)
DROP FUNCTION IF EXISTS check_yellow_cards();
