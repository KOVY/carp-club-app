-- 021_rollback.sql — obnovení peg-based potvrzování (edge=1, ostatní=2, jen sousedi).
CREATE OR REPLACE FUNCTION check_ulovek_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  ulovek_tym_peg INT; zavod_id_val UUID; required_confirmations INT;
  current_confirmations INT; max_peg INT; min_peg INT; is_confirmed_by_rozhodci BOOLEAN;
BEGIN
  IF NOT NEW.potvrzeno THEN RETURN NEW; END IF;
  SELECT t.peg_cislo, u.zavod_id, u.potvrzeno_rozhodcim INTO ulovek_tym_peg, zavod_id_val, is_confirmed_by_rozhodci
  FROM ulovky u JOIN tymy t ON t.id = u.tym_id WHERE u.id = NEW.ulovek_id;
  IF is_confirmed_by_rozhodci THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM zavod_role zr WHERE zr.zavod_id = zavod_id_val AND zr.user_id = NEW.potvrdil_user_id AND zr.role IN ('rozhodci','poradatel')) THEN
    UPDATE ulovky SET stav='potvrzeno', potvrzeno_rozhodcim=true, updated_at=NOW() WHERE id = NEW.ulovek_id; RETURN NEW;
  END IF;
  SELECT MIN(peg_cislo), MAX(peg_cislo) INTO min_peg, max_peg FROM tymy WHERE zavod_id = zavod_id_val AND peg_cislo IS NOT NULL;
  IF ulovek_tym_peg = min_peg OR ulovek_tym_peg = max_peg THEN required_confirmations := 1; ELSE required_confirmations := 2; END IF;
  SELECT COUNT(*) INTO current_confirmations FROM potvrzeni p JOIN tymy t ON t.id = p.potvrdil_tym_id
    JOIN tymy ut ON ut.id = (SELECT tym_id FROM ulovky WHERE id = NEW.ulovek_id)
    WHERE p.ulovek_id = NEW.ulovek_id AND p.potvrzeno = true AND ABS(t.peg_cislo - ut.peg_cislo) = 1;
  IF current_confirmations >= required_confirmations THEN UPDATE ulovky SET stav='potvrzeno', updated_at=NOW() WHERE id = NEW.ulovek_id; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
