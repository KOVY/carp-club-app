-- Carp Club ČR Admin Portal
-- Migration: 005b_admin_portal
-- Description: Admin portal features - team colors, invitations, role changes
--
-- PŘEDPOKLAD: Migrace 005a_add_hlavni_admin_enum již byla spuštěna a commitnuta!

-- ============================================
-- ROZŠÍŘENÍ PRO ADMIN PORTÁL
-- ============================================

-- 1. Přidat barvu týmu pro vizuální rozlišení
ALTER TABLE tymy ADD COLUMN IF NOT EXISTS barva VARCHAR(7) DEFAULT '#3B82F6';
-- Hex barvy: #EF4444 (červená), #22C55E (zelená), #3B82F6 (modrá),
--            #F59E0B (oranžová), #8B5CF6 (fialová), #EC4899 (růžová), atd.

-- ============================================
-- TABULKA PRO POZVÁNKY ZÁVODNÍKŮ
-- ============================================

CREATE TABLE IF NOT EXISTS pozvanky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  tym_id UUID REFERENCES tymy(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  jmeno VARCHAR(255) NOT NULL,
  telefon VARCHAR(50),
  role user_role NOT NULL DEFAULT 'zavodnik',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  platnost_do TIMESTAMPTZ NOT NULL,
  pouzita BOOLEAN DEFAULT false,
  registrovano_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_email_zavod UNIQUE (email, zavod_id)
);

-- Indexy pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_pozvanky_token ON pozvanky(token);
CREATE INDEX IF NOT EXISTS idx_pozvanky_zavod ON pozvanky(zavod_id);
CREATE INDEX IF NOT EXISTS idx_pozvanky_tym ON pozvanky(tym_id);
CREATE INDEX IF NOT EXISTS idx_pozvanky_email ON pozvanky(email);

-- ============================================
-- RLS POLITIKY PRO POZVÁNKY
-- ============================================

ALTER TABLE pozvanky ENABLE ROW LEVEL SECURITY;

-- Anonymní přístup pro ověření tokenu (bez přihlášení)
CREATE POLICY "Anon can verify token" ON pozvanky
  FOR SELECT TO anon
  USING (true);

-- Admin může číst všechny pozvánky svého závodu
CREATE POLICY "Admin can read pozvanky" ON pozvanky
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE zavod_id = pozvanky.zavod_id
        AND user_id = auth.uid()
        AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

-- Admin může vytvářet pozvánky
CREATE POLICY "Admin can insert pozvanky" ON pozvanky
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE zavod_id = pozvanky.zavod_id
        AND user_id = auth.uid()
        AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

-- Admin může upravovat pozvánky
CREATE POLICY "Admin can update pozvanky" ON pozvanky
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE zavod_id = pozvanky.zavod_id
        AND user_id = auth.uid()
        AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

-- Admin může mazat pozvánky
CREATE POLICY "Admin can delete pozvanky" ON pozvanky
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE zavod_id = pozvanky.zavod_id
        AND user_id = auth.uid()
        AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

-- ============================================
-- FUNKCE PRO REGISTRACI PŘES POZVÁNKU
-- ============================================

CREATE OR REPLACE FUNCTION register_via_invitation(p_token UUID)
RETURNS JSONB AS $$
DECLARE
  v_pozvanka RECORD;
  v_user_id UUID;
  v_existing_user_id UUID;
BEGIN
  SELECT * INTO v_pozvanka
  FROM pozvanky
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pozvánka nenalezena');
  END IF;

  IF v_pozvanka.pouzita THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pozvánka již byla použita');
  END IF;

  IF v_pozvanka.platnost_do < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Platnost pozvánky vypršela');
  END IF;

  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = v_pozvanka.email;

  IF v_existing_user_id IS NOT NULL THEN
    v_user_id := v_existing_user_id;

    UPDATE profiles
    SET jmeno = v_pozvanka.jmeno,
        telefon = COALESCE(v_pozvanka.telefon, telefon),
        updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
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

  INSERT INTO zavod_role (zavod_id, user_id, role)
  VALUES (v_pozvanka.zavod_id, v_user_id, v_pozvanka.role)
  ON CONFLICT (zavod_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  IF v_pozvanka.tym_id IS NOT NULL THEN
    INSERT INTO clenove_tymu (tym_id, user_id, role)
    VALUES (v_pozvanka.tym_id, v_user_id, v_pozvanka.role)
    ON CONFLICT (tym_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    IF v_pozvanka.role = 'kapitan' THEN
      UPDATE tymy SET kapitan_id = v_user_id, updated_at = NOW() WHERE id = v_pozvanka.tym_id;
    END IF;
  END IF;

  UPDATE pozvanky
  SET pouzita = true, registrovano_at = NOW()
  WHERE id = v_pozvanka.id;

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
-- FUNKCE PRO DOKONČENÍ REGISTRACE
-- ============================================

CREATE OR REPLACE FUNCTION complete_invitation_registration(
  p_pozvanka_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_pozvanka RECORD;
BEGIN
  SELECT * INTO v_pozvanka
  FROM pozvanky
  WHERE id = p_pozvanka_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pozvánka nenalezena');
  END IF;

  IF v_pozvanka.pouzita THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pozvánka již byla použita');
  END IF;

  INSERT INTO profiles (id, email, jmeno, telefon)
  VALUES (p_user_id, v_pozvanka.email, v_pozvanka.jmeno, v_pozvanka.telefon)
  ON CONFLICT (id) DO UPDATE SET
    jmeno = EXCLUDED.jmeno,
    telefon = COALESCE(EXCLUDED.telefon, profiles.telefon),
    updated_at = NOW();

  INSERT INTO zavod_role (zavod_id, user_id, role)
  VALUES (v_pozvanka.zavod_id, p_user_id, v_pozvanka.role)
  ON CONFLICT (zavod_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  IF v_pozvanka.tym_id IS NOT NULL THEN
    INSERT INTO clenove_tymu (tym_id, user_id, role)
    VALUES (v_pozvanka.tym_id, p_user_id, v_pozvanka.role)
    ON CONFLICT (tym_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    IF v_pozvanka.role = 'kapitan' THEN
      UPDATE tymy SET kapitan_id = p_user_id, updated_at = NOW() WHERE id = v_pozvanka.tym_id;
    END IF;
  END IF;

  UPDATE pozvanky
  SET pouzita = true, registrovano_at = NOW()
  WHERE id = v_pozvanka.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'zavod_id', v_pozvanka.zavod_id,
    'tym_id', v_pozvanka.tym_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROZŠÍŘENÍ RLS PRO HLAVNÍHO ADMINA
-- ============================================

DROP POLICY IF EXISTS "Only poradatel can insert zavody" ON zavody;
CREATE POLICY "Admin can insert zavody" ON zavody
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role IN ('poradatel', 'hlavni_admin')
    )
  );

DROP POLICY IF EXISTS "Only poradatel can update zavody" ON zavody;
CREATE POLICY "Admin can update zavody" ON zavody
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE zavod_id = zavody.id
        AND user_id = auth.uid()
        AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

-- ============================================
-- OPRAVA: JAKÝKOLIV ČLEN TÝMU MŮŽE ZADÁVAT ÚLOVKY
-- ============================================

DROP POLICY IF EXISTS "Kapitan can insert ulovky for own tym" ON ulovky;
CREATE POLICY "Team member can insert ulovky for own tym" ON ulovky
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clenove_tymu ct
      WHERE ct.tym_id = ulovky.tym_id
        AND ct.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = ulovky.zavod_id
        AND zr.user_id = auth.uid()
        AND zr.role IN ('rozhodci', 'poradatel', 'hlavni_admin')
    )
  );

-- ============================================
-- OPRAVA: JAKÝKOLIV ČLEN SOUSEDNÍHO TÝMU MŮŽE POTVRZOVAT
-- ============================================

DROP POLICY IF EXISTS "Sousedni pegy or rozhodci can insert potvrzeni" ON potvrzeni;
CREATE POLICY "Neighbor team member or rozhodci can insert potvrzeni" ON potvrzeni
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role zr
      JOIN ulovky u ON u.id = potvrzeni.ulovek_id
      WHERE zr.zavod_id = u.zavod_id
        AND zr.user_id = auth.uid()
        AND zr.role IN ('rozhodci', 'poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM ulovky u
      JOIN tymy ut ON ut.id = u.tym_id
      JOIN tymy mt ON mt.zavod_id = ut.zavod_id
      JOIN clenove_tymu ct ON ct.tym_id = mt.id
      WHERE u.id = potvrzeni.ulovek_id
        AND ct.user_id = auth.uid()
        AND ABS(mt.peg_cislo - ut.peg_cislo) = 1
        AND mt.id != ut.id
    )
  );

-- ============================================
-- ROZŠÍŘENÍ POLITIK PRO TYMY
-- ============================================

DROP POLICY IF EXISTS "Only poradatel can insert tymy" ON tymy;
CREATE POLICY "Admin can insert tymy" ON tymy
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE zavod_id = tymy.zavod_id
        AND user_id = auth.uid()
        AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

DROP POLICY IF EXISTS "Only poradatel can update tymy" ON tymy;
CREATE POLICY "Admin can update tymy" ON tymy
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE zavod_id = tymy.zavod_id
        AND user_id = auth.uid()
        AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

DROP POLICY IF EXISTS "Only poradatel can delete tymy" ON tymy;
CREATE POLICY "Admin can delete tymy" ON tymy
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE zavod_id = tymy.zavod_id
        AND user_id = auth.uid()
        AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

-- ============================================
-- ROZŠÍŘENÍ POLITIK PRO CLENOVE_TYMU
-- ============================================

DROP POLICY IF EXISTS "Only poradatel can manage clenove_tymu" ON clenove_tymu;
CREATE POLICY "Admin can manage clenove_tymu" ON clenove_tymu
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tymy t
      JOIN zavod_role zr ON zr.zavod_id = t.zavod_id
      WHERE t.id = clenove_tymu.tym_id
        AND zr.user_id = auth.uid()
        AND zr.role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role = 'hlavni_admin'
    )
  );

-- ============================================
-- ROZŠÍŘENÍ POLITIK PRO ZAVOD_ROLE
-- ============================================

DROP POLICY IF EXISTS "Only poradatel can insert zavod_role" ON zavod_role;
CREATE POLICY "Admin can insert zavod_role" ON zavod_role
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id
        AND zr.user_id = auth.uid()
        AND zr.role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.user_id = auth.uid() AND zr.role = 'hlavni_admin'
    )
    OR
    NOT EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id
    )
  );

DROP POLICY IF EXISTS "Only poradatel can update zavod_role" ON zavod_role;
CREATE POLICY "Admin can update zavod_role" ON zavod_role
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id
        AND zr.user_id = auth.uid()
        AND zr.role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.user_id = auth.uid() AND zr.role = 'hlavni_admin'
    )
  );

DROP POLICY IF EXISTS "Only poradatel can delete zavod_role" ON zavod_role;
CREATE POLICY "Admin can delete zavod_role" ON zavod_role
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id
        AND zr.user_id = auth.uid()
        AND zr.role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.user_id = auth.uid() AND zr.role = 'hlavni_admin'
    )
  );

-- ============================================
-- HELPER FUNKCE PRO ADMIN PORTÁL
-- ============================================

CREATE OR REPLACE FUNCTION get_zavod_stats(p_zavod_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pocet_tymu', (SELECT COUNT(*) FROM tymy WHERE zavod_id = p_zavod_id),
    'pocet_clenu', (SELECT COUNT(*) FROM clenove_tymu ct JOIN tymy t ON t.id = ct.tym_id WHERE t.zavod_id = p_zavod_id),
    'pocet_pozvanek', (SELECT COUNT(*) FROM pozvanky WHERE zavod_id = p_zavod_id),
    'pocet_registrovanych', (SELECT COUNT(*) FROM pozvanky WHERE zavod_id = p_zavod_id AND pouzita = true),
    'pocet_ulovku', (SELECT COUNT(*) FROM ulovky WHERE zavod_id = p_zavod_id),
    'pocet_potvrzenych', (SELECT COUNT(*) FROM ulovky WHERE zavod_id = p_zavod_id AND stav = 'potvrzeno'),
    'pocet_zlutych_karet', (SELECT COUNT(*) FROM zlute_karty WHERE zavod_id = p_zavod_id)
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_tymy_overview(p_zavod_id UUID)
RETURNS TABLE (
  tym_id UUID,
  nazev TEXT,
  barva VARCHAR(7),
  peg_cislo INT,
  zaplaceno BOOLEAN,
  pocet_clenu BIGINT,
  pocet_pozvanek BIGINT,
  pocet_registrovanych BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as tym_id,
    t.nazev,
    t.barva,
    t.peg_cislo,
    t.zaplaceno,
    (SELECT COUNT(*) FROM clenove_tymu ct WHERE ct.tym_id = t.id) as pocet_clenu,
    (SELECT COUNT(*) FROM pozvanky p WHERE p.tym_id = t.id) as pocet_pozvanek,
    (SELECT COUNT(*) FROM pozvanky p WHERE p.tym_id = t.id AND p.pouzita = true) as pocet_registrovanych
  FROM tymy t
  WHERE t.zavod_id = p_zavod_id
  ORDER BY t.peg_cislo NULLS LAST, t.nazev;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
