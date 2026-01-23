-- Carp Club ČR - Pravidla 2026
-- Migration: 014_pravidla_2026
-- Description: Aktualizace pravidel pro rok 2026
--              - 7 nejlepších ryb místo 5
--              - Upravená logika žlutých karet

-- ============================================
-- ZMĚNA: 7 nejlepších ryb pro skóre
-- ============================================

-- Změna defaultní hodnoty pro nové závody
ALTER TABLE zavody ALTER COLUMN top_n_ryb SET DEFAULT 7;

-- Aktualizace existujících závodů (které mají stále 5)
-- UPDATE zavody SET top_n_ryb = 7 WHERE top_n_ryb = 5;

-- Přepsání funkce calculate_tym_score pro 7 ryb
CREATE OR REPLACE FUNCTION calculate_tym_score(p_tym_id UUID)
RETURNS TABLE(skore DECIMAL, pocet_ryb INT) AS $$
DECLARE
  zavod_top_n INT;
  zavod_min_vaha DECIMAL;
BEGIN
  -- Získat nastavení závodu pro tento tým
  SELECT z.top_n_ryb, z.min_vaha_kg INTO zavod_top_n, zavod_min_vaha
  FROM zavody z
  JOIN tymy t ON t.zavod_id = z.id
  WHERE t.id = p_tym_id;

  -- Fallback na default hodnoty
  IF zavod_top_n IS NULL THEN
    zavod_top_n := 7;
  END IF;

  IF zavod_min_vaha IS NULL THEN
    zavod_min_vaha := 5.0;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(vaha), 0)::DECIMAL as skore,
    COUNT(*)::INT as pocet_ryb
  FROM (
    SELECT vaha
    FROM ulovky
    WHERE tym_id = p_tym_id
      AND stav = 'potvrzeno'
      AND vaha >= zavod_min_vaha
    ORDER BY vaha DESC
    LIMIT zavod_top_n
  ) top_n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ZMĚNA: Žluté karty podle pravidel 2026
-- ============================================

-- Přidání sloupce pro stopku (doba kdy tým nemůže zadávat úlovky)
-- Pokud ještě neexistuje (přidáno v 013_yellow_card_stopka.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zlute_karty' AND column_name = 'stopka_do'
  ) THEN
    ALTER TABLE zlute_karty ADD COLUMN stopka_do TIMESTAMPTZ;
  END IF;
END $$;

-- Přidání sloupce pro číslo karty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zlute_karty' AND column_name = 'cislo_karty'
  ) THEN
    ALTER TABLE zlute_karty ADD COLUMN cislo_karty INT;
  END IF;
END $$;

-- Přidání sloupce pro odebranou rybu (při 1. kartě)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zlute_karty' AND column_name = 'odebrana_ryba_id'
  ) THEN
    ALTER TABLE zlute_karty ADD COLUMN odebrana_ryba_id UUID REFERENCES ulovky(id);
  END IF;
END $$;

-- Přepsání triggeru pro žluté karty podle pravidel 2026
-- 1. karta: odebrání poslední ryby + stop 3h
-- 2. karta: anulování všech ryb + stop 6h
-- 3. karta: diskvalifikace

CREATE OR REPLACE FUNCTION check_yellow_cards_2026()
RETURNS TRIGGER AS $$
DECLARE
  card_count INT;
  last_catch_id UUID;
BEGIN
  -- Spočítej žluté karty pro tento tým v tomto závodě
  SELECT COUNT(*) INTO card_count
  FROM zlute_karty
  WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;

  -- Nastav číslo karty
  NEW.cislo_karty := card_count;

  -- Logika podle počtu karet
  IF card_count = 1 THEN
    -- 1. žlutá karta: odebrání poslední ulovené ryby + stop 3 hodiny

    -- Najdi poslední potvrzený/čekající úlovek
    SELECT id INTO last_catch_id
    FROM ulovky
    WHERE tym_id = NEW.tym_id
      AND zavod_id = NEW.zavod_id
      AND stav IN ('potvrzeno', 'ceka')
    ORDER BY cas DESC
    LIMIT 1;

    -- Odeber poslední rybu (označ jako zamítnutou)
    IF last_catch_id IS NOT NULL THEN
      UPDATE ulovky
      SET stav = 'zamitnuto', updated_at = NOW()
      WHERE id = last_catch_id;

      NEW.odebrana_ryba_id := last_catch_id;
    END IF;

    -- Stopka 3 hodiny (pokud není nastavena jiná hodnota)
    IF NEW.stopka_do IS NULL THEN
      NEW.stopka_do := NOW() + INTERVAL '3 hours';
    END IF;

  ELSIF card_count = 2 THEN
    -- 2. žlutá karta: anulování VŠECH ryb + stop 6 hodin

    UPDATE ulovky
    SET stav = 'zamitnuto', updated_at = NOW()
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;

    -- Stopka 6 hodin
    IF NEW.stopka_do IS NULL THEN
      NEW.stopka_do := NOW() + INTERVAL '6 hours';
    END IF;

  ELSIF card_count >= 3 THEN
    -- 3. žlutá karta: diskvalifikace
    -- Všechny úlovky již byly anulovány při 2. kartě
    -- Tým by měl být označen jako diskvalifikovaný

    UPDATE ulovky
    SET stav = 'zamitnuto', updated_at = NOW()
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;

    -- Žádná další stopka - tým je diskvalifikován
    NEW.stopka_do := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Odstranění starého triggeru pokud existuje
DROP TRIGGER IF EXISTS trigger_check_yellow_cards ON zlute_karty;

-- Vytvoření nového triggeru s BEFORE INSERT (aby mohl modifikovat NEW)
CREATE TRIGGER trigger_check_yellow_cards_2026
BEFORE INSERT ON zlute_karty
FOR EACH ROW
EXECUTE FUNCTION check_yellow_cards_2026();

-- ============================================
-- FUNKCE: Kontrola zda tým má aktivní stopku
-- ============================================

CREATE OR REPLACE FUNCTION tym_has_active_stopka(p_tym_id UUID, p_zavod_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM zlute_karty
    WHERE tym_id = p_tym_id
      AND zavod_id = p_zavod_id
      AND stopka_do IS NOT NULL
      AND stopka_do > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNKCE: Získat čas konce stopky týmu
-- ============================================

CREATE OR REPLACE FUNCTION get_tym_stopka_end(p_tym_id UUID, p_zavod_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  stopka_time TIMESTAMPTZ;
BEGIN
  SELECT MAX(stopka_do) INTO stopka_time
  FROM zlute_karty
  WHERE tym_id = p_tym_id
    AND zavod_id = p_zavod_id
    AND stopka_do IS NOT NULL
    AND stopka_do > NOW();

  RETURN stopka_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
