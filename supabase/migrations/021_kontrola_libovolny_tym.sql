-- 021_kontrola_libovolny_tym.sql — Fáze 3b: potvrzení libovolným týmem. Pustit ručně.
-- Trigger nově počítá hlasy od JAKÉHOKOLI jiného týmu (ne jen sousedního pegu),
-- práh = zavody.pocet_potvrzeni (default 2). UNIQUE(ulovek_id, potvrdil_tym_id) drží 1 hlas/tým.
CREATE OR REPLACE FUNCTION check_ulovek_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  ulovek_tym_id UUID;
  zavod_id_val UUID;
  required_confirmations INT;
  current_confirmations INT;
  is_confirmed_by_rozhodci BOOLEAN;
BEGIN
  IF NOT NEW.potvrzeno THEN RETURN NEW; END IF;

  SELECT u.tym_id, u.zavod_id, u.potvrzeno_rozhodcim
  INTO ulovek_tym_id, zavod_id_val, is_confirmed_by_rozhodci
  FROM ulovky u WHERE u.id = NEW.ulovek_id;

  IF is_confirmed_by_rozhodci THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM zavod_role zr
    WHERE zr.zavod_id = zavod_id_val AND zr.user_id = NEW.potvrdil_user_id
      AND zr.role IN ('rozhodci','poradatel')
  ) THEN
    UPDATE ulovky SET stav='potvrzeno', potvrzeno_rozhodcim=true, updated_at=NOW() WHERE id = NEW.ulovek_id;
    RETURN NEW;
  END IF;

  SELECT COALESCE(pocet_potvrzeni, 2) INTO required_confirmations FROM zavody WHERE id = zavod_id_val;
  required_confirmations := COALESCE(required_confirmations, 2);

  SELECT COUNT(*) INTO current_confirmations
  FROM potvrzeni p
  WHERE p.ulovek_id = NEW.ulovek_id
    AND p.potvrzeno = true
    AND p.potvrdil_tym_id != ulovek_tym_id;

  IF current_confirmations >= required_confirmations THEN
    UPDATE ulovky SET stav='potvrzeno', updated_at=NOW() WHERE id = NEW.ulovek_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
