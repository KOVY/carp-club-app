-- Carp Club ČR - System Admins
-- Migration: 010_system_admins
-- Description: Adds system_admins table for global admin access without requiring zavod_id
--
-- Problém: zavod_role vyžaduje zavod_id, ale hlavní admin potřebuje přístup BEZ závodu

-- ============================================
-- TABULKA PRO SYSTÉMOVÉ ADMINISTRÁTORY
-- ============================================

CREATE TABLE IF NOT EXISTS system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'hlavni_admin' CHECK (role IN ('hlavni_admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Index pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_system_admins_user ON system_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_system_admins_email ON system_admins(email);

-- ============================================
-- RLS POLITIKY
-- ============================================

ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;

-- Každý přihlášený uživatel může číst (pro kontrolu vlastní role)
CREATE POLICY "Authenticated can read system_admins" ON system_admins
  FOR SELECT TO authenticated
  USING (true);

-- Pouze super_admin může upravovat
CREATE POLICY "Super admin can manage system_admins" ON system_admins
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid() AND sa.role = 'super_admin'
    )
  );

-- ============================================
-- FUNKCE PRO KONTROLU SYSTÉMOVÉHO ADMINA
-- ============================================

CREATE OR REPLACE FUNCTION is_system_admin(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins
    WHERE user_id = COALESCE(p_user_id, auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_system_admin_role(p_user_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM system_admins
  WHERE user_id = COALESCE(p_user_id, auth.uid());

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROZŠÍŘENÍ EXISTUJÍCÍCH RLS POLITIK
-- ============================================

-- Systémový admin může číst všechny závody
DROP POLICY IF EXISTS "Public zavody are readable" ON zavody;
CREATE POLICY "Public or system admin can read zavody" ON zavody
  FOR SELECT TO authenticated
  USING (
    true  -- Závody jsou veřejné pro čtení
  );

-- Systémový admin může vytvářet závody
DROP POLICY IF EXISTS "Admin can insert zavody" ON zavody;
CREATE POLICY "Admin or system admin can insert zavody" ON zavody
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role
      WHERE user_id = auth.uid() AND role IN ('poradatel', 'hlavni_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

-- Systémový admin může upravovat závody
DROP POLICY IF EXISTS "Admin can update zavody" ON zavody;
CREATE POLICY "Admin or system admin can update zavody" ON zavody
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

-- Systémový admin může mazat závody
CREATE POLICY "System admin can delete zavody" ON zavody
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ROZŠÍŘENÍ POLITIK PRO TYMY
-- ============================================

DROP POLICY IF EXISTS "Admin can insert tymy" ON tymy;
CREATE POLICY "Admin or system admin can insert tymy" ON tymy
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can update tymy" ON tymy;
CREATE POLICY "Admin or system admin can update tymy" ON tymy
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can delete tymy" ON tymy;
CREATE POLICY "Admin or system admin can delete tymy" ON tymy
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ROZŠÍŘENÍ POLITIK PRO POZVANKY
-- ============================================

DROP POLICY IF EXISTS "Admin can read pozvanky" ON pozvanky;
CREATE POLICY "Admin or system admin can read pozvanky" ON pozvanky
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can insert pozvanky" ON pozvanky;
CREATE POLICY "Admin or system admin can insert pozvanky" ON pozvanky
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can update pozvanky" ON pozvanky;
CREATE POLICY "Admin or system admin can update pozvanky" ON pozvanky
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can delete pozvanky" ON pozvanky;
CREATE POLICY "Admin or system admin can delete pozvanky" ON pozvanky
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ROZŠÍŘENÍ POLITIK PRO CLENOVE_TYMU
-- ============================================

DROP POLICY IF EXISTS "Admin can manage clenove_tymu" ON clenove_tymu;
CREATE POLICY "Admin or system admin can manage clenove_tymu" ON clenove_tymu
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ROZŠÍŘENÍ POLITIK PRO ZAVOD_ROLE
-- ============================================

DROP POLICY IF EXISTS "Admin can insert zavod_role" ON zavod_role;
CREATE POLICY "Admin or system admin can insert zavod_role" ON zavod_role
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
    OR
    NOT EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id
    )
  );

DROP POLICY IF EXISTS "Admin can update zavod_role" ON zavod_role;
CREATE POLICY "Admin or system admin can update zavod_role" ON zavod_role
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can delete zavod_role" ON zavod_role;
CREATE POLICY "Admin or system admin can delete zavod_role" ON zavod_role
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
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
    )
  );
