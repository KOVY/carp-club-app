-- Migration 007: Fix repeatable invitations
-- Purpose: Allow závodníci to use the same invitation link multiple times
-- Problem: Currently after first use, "Pozvánka již byla použita"
-- Solution: Remove pouzita flag check, validate only platnost_do

-- ============================================
-- OPRAVIT REGISTER_VIA_INVITATION
-- ============================================

CREATE OR REPLACE FUNCTION register_via_invitation(p_token UUID)
RETURNS JSONB AS $$
DECLARE
  v_pozvanka RECORD;
  v_user_id UUID;
  v_existing_user_id UUID;
BEGIN
  -- 1. Najít pozvánku
  SELECT * INTO v_pozvanka
  FROM pozvanky
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pozvánka nenalezena');
  END IF;

  -- 2. POUZE kontrola platnosti (ODSTRANIT kontrolu pouzita!)
  IF v_pozvanka.platnost_do < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Platnost pozvánky vypršela');
  END IF;

  -- 3. Zkontrolovat, jestli uživatel již existuje
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = v_pozvanka.email;

  IF v_existing_user_id IS NOT NULL THEN
    -- Uživatel existuje → aktualizovat profil
    v_user_id := v_existing_user_id;

    UPDATE profiles
    SET jmeno = v_pozvanka.jmeno,
        telefon = COALESCE(v_pozvanka.telefon, telefon),
        updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    -- Uživatel neexistuje → potřebuje signup
    RETURN jsonb_build_object(
      'success', true,
      'needs_signup', true,
      'email', v_pozvanka.email,
      'jmeno', v_pozvanka.jmeno,
      'telefon', v_pozvanka.telefon,
      'zavod_id', v_pozvanka.zavod_id,
      'tym_id', v_pozvanka.tym_id,
      'role', v_pozvanka.role,
      'pozvanka_id', v_pozvanka.id
    );
  END IF;

  -- 4. Přiřadit role (použít ON CONFLICT pro idempotenci)
  INSERT INTO zavod_role (zavod_id, user_id, role)
  VALUES (v_pozvanka.zavod_id, v_user_id, v_pozvanka.role)
  ON CONFLICT (zavod_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- 5. Přidat do týmu (pokud existuje)
  IF v_pozvanka.tym_id IS NOT NULL THEN
    INSERT INTO clenove_tymu (tym_id, user_id, role)
    VALUES (v_pozvanka.tym_id, v_user_id, v_pozvanka.role)
    ON CONFLICT (tym_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    IF v_pozvanka.role = 'kapitan' THEN
      UPDATE tymy SET kapitan_id = v_user_id, updated_at = NOW() WHERE id = v_pozvanka.tym_id;
    END IF;
  END IF;

  -- 6. NEMĚNIT pouzita flag! (Nechat pro statistiku, ale nevalidovat)
  -- Pouze aktualizovat registrovano_at při prvním použití
  UPDATE pozvanky
  SET registrovano_at = COALESCE(registrovano_at, NOW())
  WHERE id = v_pozvanka.id;

  -- 7. Vrátit úspěch
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'zavod_id', v_pozvanka.zavod_id,
    'tym_id', v_pozvanka.tym_id,
    'email', v_pozvanka.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- OPRAVIT COMPLETE_INVITATION_REGISTRATION
-- ============================================

CREATE OR REPLACE FUNCTION complete_invitation_registration(
  p_pozvanka_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_pozvanka RECORD;
BEGIN
  -- 1. Najít pozvánku
  SELECT * INTO v_pozvanka
  FROM pozvanky
  WHERE id = p_pozvanka_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pozvánka nenalezena');
  END IF;

  -- 2. POUZE kontrola platnosti (ODSTRANIT kontrolu pouzita!)
  IF v_pozvanka.platnost_do < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Platnost pozvánky vypršela');
  END IF;

  -- 3. Vytvořit/aktualizovat profil
  INSERT INTO profiles (id, email, jmeno, telefon)
  VALUES (p_user_id, v_pozvanka.email, v_pozvanka.jmeno, v_pozvanka.telefon)
  ON CONFLICT (id) DO UPDATE SET
    jmeno = EXCLUDED.jmeno,
    telefon = COALESCE(EXCLUDED.telefon, profiles.telefon),
    updated_at = NOW();

  -- 4. Přiřadit role
  INSERT INTO zavod_role (zavod_id, user_id, role)
  VALUES (v_pozvanka.zavod_id, p_user_id, v_pozvanka.role)
  ON CONFLICT (zavod_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- 5. Přidat do týmu
  IF v_pozvanka.tym_id IS NOT NULL THEN
    INSERT INTO clenove_tymu (tym_id, user_id, role)
    VALUES (v_pozvanka.tym_id, p_user_id, v_pozvanka.role)
    ON CONFLICT (tym_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    IF v_pozvanka.role = 'kapitan' THEN
      UPDATE tymy SET kapitan_id = p_user_id, updated_at = NOW() WHERE id = v_pozvanka.tym_id;
    END IF;
  END IF;

  -- 6. NEMĚNIT pouzita flag! (Pouze aktualizovat registrovano_at)
  UPDATE pozvanky
  SET registrovano_at = COALESCE(registrovano_at, NOW())
  WHERE id = p_pozvanka_id;

  -- 7. Vrátit úspěch
  RETURN jsonb_build_object(
    'success', true,
    'zavod_id', v_pozvanka.zavod_id,
    'tym_id', v_pozvanka.tym_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- KOMENTÁŘE PRO BUDOUCNOST
-- ============================================

COMMENT ON COLUMN pozvanky.pouzita IS 'DEPRECATED - Not used for validation anymore. Use platnost_do instead. Token can be reused until expiry.';
COMMENT ON COLUMN pozvanky.registrovano_at IS 'Timestamp of first successful registration. Updated only once.';

-- ============================================
-- POZNÁMKA
-- ============================================
-- Po této migraci:
-- ✅ Token lze použít opakovaně (2. den, 3. den, ...)
-- ✅ Validuje se pouze platnost_do
-- ✅ pouzita flag zůstává pro statistiku, ale neblokuje
-- ✅ registrovano_at se nastaví pouze jednou (první registrace)
