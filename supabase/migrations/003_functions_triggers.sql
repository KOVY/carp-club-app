-- Carp Club ČR Functions and Triggers
-- Migration: 003_functions_triggers
-- Description: PostgreSQL functions and triggers for business logic

-- ============================================
-- PREVENT AUDIT MODIFICATION (APPEND-ONLY)
-- ============================================

-- Function to prevent UPDATE and DELETE on append-only tables
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log je append-only. UPDATE a DELETE nejsou povoleny.';
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent UPDATE on audit_log
CREATE TRIGGER prevent_audit_update
BEFORE UPDATE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Trigger to prevent DELETE on audit_log
CREATE TRIGGER prevent_audit_delete
BEFORE DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Trigger to prevent UPDATE on zlute_karty
CREATE TRIGGER prevent_zluta_karta_update
BEFORE UPDATE ON zlute_karty
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Trigger to prevent DELETE on zlute_karty
CREATE TRIGGER prevent_zluta_karta_delete
BEFORE DELETE ON zlute_karty
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ============================================
-- AUDIT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to key tables
CREATE TRIGGER audit_ulovky 
AFTER INSERT OR UPDATE OR DELETE ON ulovky
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_potvrzeni 
AFTER INSERT OR UPDATE OR DELETE ON potvrzeni
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_zlute_karty 
AFTER INSERT ON zlute_karty
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_zavody 
AFTER INSERT OR UPDATE OR DELETE ON zavody
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_tymy 
AFTER INSERT OR UPDATE OR DELETE ON tymy
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();


-- ============================================
-- CHECK ULOVEK CONFIRMATION TRIGGER
-- ============================================

-- Function to check and update ulovek confirmation status
CREATE OR REPLACE FUNCTION check_ulovek_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  ulovek_tym_peg INT;
  zavod_id_val UUID;
  required_confirmations INT;
  current_confirmations INT;
  max_peg INT;
  min_peg INT;
  is_confirmed_by_rozhodci BOOLEAN;
BEGIN
  -- Check if this is a positive confirmation
  IF NOT NEW.potvrzeno THEN
    RETURN NEW;
  END IF;

  -- Get peg of the ulovek's team and zavod_id
  SELECT t.peg_cislo, u.zavod_id, u.potvrzeno_rozhodcim 
  INTO ulovek_tym_peg, zavod_id_val, is_confirmed_by_rozhodci
  FROM ulovky u
  JOIN tymy t ON t.id = u.tym_id
  WHERE u.id = NEW.ulovek_id;
  
  -- If already confirmed by rozhodci, no need to check further
  IF is_confirmed_by_rozhodci THEN
    RETURN NEW;
  END IF;

  -- Check if the confirmer is rozhodci/poradatel
  IF EXISTS (
    SELECT 1 FROM zavod_role zr
    WHERE zr.zavod_id = zavod_id_val 
      AND zr.user_id = NEW.potvrdil_user_id 
      AND zr.role IN ('rozhodci', 'poradatel')
  ) THEN
    -- Rozhodci confirmation - immediately confirm the ulovek
    UPDATE ulovky 
    SET stav = 'potvrzeno', 
        potvrzeno_rozhodcim = true,
        updated_at = NOW()
    WHERE id = NEW.ulovek_id;
    RETURN NEW;
  END IF;
  
  -- Get min and max peg in the zavod
  SELECT MIN(peg_cislo), MAX(peg_cislo) INTO min_peg, max_peg
  FROM tymy WHERE zavod_id = zavod_id_val AND peg_cislo IS NOT NULL;
  
  -- Determine required confirmations (edge pegs = 1, others = 2)
  IF ulovek_tym_peg = min_peg OR ulovek_tym_peg = max_peg THEN
    required_confirmations := 1;
  ELSE
    required_confirmations := 2;
  END IF;
  
  -- Count current positive confirmations from neighbors
  SELECT COUNT(*) INTO current_confirmations
  FROM potvrzeni p
  JOIN tymy t ON t.id = p.potvrdil_tym_id
  JOIN tymy ut ON ut.id = (SELECT tym_id FROM ulovky WHERE id = NEW.ulovek_id)
  WHERE p.ulovek_id = NEW.ulovek_id 
    AND p.potvrzeno = true
    AND ABS(t.peg_cislo - ut.peg_cislo) = 1;
  
  -- If we have enough confirmations, update the ulovek
  IF current_confirmations >= required_confirmations THEN
    UPDATE ulovky 
    SET stav = 'potvrzeno', updated_at = NOW()
    WHERE id = NEW.ulovek_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check confirmation after insert
CREATE TRIGGER trigger_check_confirmation
AFTER INSERT ON potvrzeni
FOR EACH ROW
EXECUTE FUNCTION check_ulovek_confirmation();


-- ============================================
-- CALCULATE TYM SCORE FUNCTION
-- ============================================

-- Function to calculate team score (sum of top 5 heaviest confirmed fish)
CREATE OR REPLACE FUNCTION calculate_tym_score(p_tym_id UUID)
RETURNS TABLE(skore DECIMAL, pocet_ryb INT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(vaha), 0)::DECIMAL as skore,
    COUNT(*)::INT as pocet_ryb
  FROM (
    SELECT vaha
    FROM ulovky
    WHERE tym_id = p_tym_id 
      AND stav = 'potvrzeno'
      AND vaha >= 5.0
    ORDER BY vaha DESC
    LIMIT 5
  ) top5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CHECK YELLOW CARDS TRIGGER
-- ============================================

-- Function to check yellow cards and disqualify team if 2+ cards
CREATE OR REPLACE FUNCTION check_yellow_cards()
RETURNS TRIGGER AS $$
DECLARE
  card_count INT;
BEGIN
  -- Count yellow cards for this team in this zavod
  SELECT COUNT(*) INTO card_count
  FROM zlute_karty
  WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;
  
  -- If this is the second card (or more), disqualify the team
  -- by marking all their ulovky as rejected
  IF card_count >= 2 THEN
    UPDATE ulovky 
    SET stav = 'zamitnuto', updated_at = NOW()
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check yellow cards after insert
CREATE TRIGGER trigger_check_yellow_cards
AFTER INSERT ON zlute_karty
FOR EACH ROW
EXECUTE FUNCTION check_yellow_cards();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zavody_updated_at
BEFORE UPDATE ON zavody
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tymy_updated_at
BEFORE UPDATE ON tymy
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ulovky_updated_at
BEFORE UPDATE ON ulovky
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get leaderboard for a zavod
CREATE OR REPLACE FUNCTION get_leaderboard(p_zavod_id UUID)
RETURNS TABLE(
  tym_id UUID,
  tym_nazev TEXT,
  peg_cislo INT,
  skore DECIMAL,
  pocet_ryb INT,
  zlute_karty_count BIGINT,
  posledni_ulovek TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tym_id,
    t.nazev as tym_nazev,
    t.peg_cislo,
    COALESCE(s.skore, 0) as skore,
    COALESCE(s.pocet_ryb, 0) as pocet_ryb,
    (SELECT COUNT(*) FROM zlute_karty zk WHERE zk.tym_id = t.id AND zk.zavod_id = p_zavod_id) as zlute_karty_count,
    (SELECT MAX(u.cas) FROM ulovky u WHERE u.tym_id = t.id AND u.stav = 'potvrzeno') as posledni_ulovek
  FROM tymy t
  LEFT JOIN LATERAL calculate_tym_score(t.id) s ON true
  WHERE t.zavod_id = p_zavod_id
  ORDER BY 
    COALESCE(s.skore, 0) DESC,
    (SELECT MAX(u.cas) FROM ulovky u WHERE u.tym_id = t.id AND u.stav = 'potvrzeno') ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if embargo is active for a zavod
CREATE OR REPLACE FUNCTION is_embargo_active(p_zavod_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  embargo_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
BEGIN
  SELECT embargo_od, datum_end INTO embargo_time, end_time
  FROM zavody WHERE id = p_zavod_id;
  
  -- No embargo set
  IF embargo_time IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Embargo is active if current time is between embargo_od and datum_end
  RETURN NOW() >= embargo_time AND NOW() <= end_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate ulovek time window
CREATE OR REPLACE FUNCTION validate_ulovek_time(p_zavod_id UUID, p_cas TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
BEGIN
  SELECT datum_start, datum_end INTO start_time, end_time
  FROM zavody WHERE id = p_zavod_id;
  
  RETURN p_cas >= start_time AND p_cas <= end_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
