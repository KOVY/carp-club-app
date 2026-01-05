-- Carp Club ČR RLS Policies
-- Migration: 002_rls_policies
-- Description: Row Level Security policies for all tables

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE souteze ENABLE ROW LEVEL SECURITY;
ALTER TABLE zavody ENABLE ROW LEVEL SECURITY;
ALTER TABLE sektory ENABLE ROW LEVEL SECURITY;
ALTER TABLE tymy ENABLE ROW LEVEL SECURITY;
ALTER TABLE clenove_tymu ENABLE ROW LEVEL SECURITY;
ALTER TABLE ulovky ENABLE ROW LEVEL SECURITY;
ALTER TABLE potvrzeni ENABLE ROW LEVEL SECURITY;
ALTER TABLE zlute_karty ENABLE ROW LEVEL SECURITY;
ALTER TABLE zlute_karty_poznamky ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE zavod_role ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Everyone can read profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- SOUTEZE POLICIES
-- ============================================

-- Everyone can read souteze
CREATE POLICY "Souteze are viewable by everyone" ON souteze
  FOR SELECT USING (true);

-- Only service role can manage souteze (admin only)
CREATE POLICY "Service role can manage souteze" ON souteze
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================
-- ZAVODY POLICIES
-- ============================================

-- Everyone can read zavody
CREATE POLICY "Zavody are viewable by everyone" ON zavody
  FOR SELECT USING (true);

-- Only poradatel can insert zavody
CREATE POLICY "Only poradatel can insert zavody" ON zavody
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role 
      WHERE user_id = auth.uid() AND role = 'poradatel'
    )
  );

-- Only poradatel of this zavod can update it
CREATE POLICY "Only poradatel can update zavody" ON zavody
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM zavod_role 
      WHERE zavod_id = zavody.id AND user_id = auth.uid() AND role = 'poradatel'
    )
  );

-- ============================================
-- SEKTORY POLICIES
-- ============================================

-- Everyone can read sektory
CREATE POLICY "Sektory are viewable by everyone" ON sektory
  FOR SELECT USING (true);

-- Only poradatel can manage sektory
CREATE POLICY "Only poradatel can manage sektory" ON sektory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM zavod_role 
      WHERE zavod_id = sektory.zavod_id AND user_id = auth.uid() AND role = 'poradatel'
    )
  );

-- ============================================
-- TYMY POLICIES
-- ============================================

-- Everyone can read tymy
CREATE POLICY "Tymy are viewable by everyone" ON tymy
  FOR SELECT USING (true);

-- Only poradatel can insert tymy
CREATE POLICY "Only poradatel can insert tymy" ON tymy
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role 
      WHERE zavod_id = tymy.zavod_id AND user_id = auth.uid() AND role = 'poradatel'
    )
  );

-- Only poradatel can update tymy
CREATE POLICY "Only poradatel can update tymy" ON tymy
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM zavod_role 
      WHERE zavod_id = tymy.zavod_id AND user_id = auth.uid() AND role = 'poradatel'
    )
  );

-- Only poradatel can delete tymy
CREATE POLICY "Only poradatel can delete tymy" ON tymy
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM zavod_role 
      WHERE zavod_id = tymy.zavod_id AND user_id = auth.uid() AND role = 'poradatel'
    )
  );


-- ============================================
-- CLENOVE_TYMU POLICIES
-- ============================================

-- Everyone can read clenove_tymu
CREATE POLICY "Clenove_tymu are viewable by everyone" ON clenove_tymu
  FOR SELECT USING (true);

-- Only poradatel can manage clenove_tymu
CREATE POLICY "Only poradatel can manage clenove_tymu" ON clenove_tymu
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tymy t
      JOIN zavod_role zr ON zr.zavod_id = t.zavod_id
      WHERE t.id = clenove_tymu.tym_id 
        AND zr.user_id = auth.uid() 
        AND zr.role = 'poradatel'
    )
  );

-- ============================================
-- ULOVKY POLICIES
-- ============================================

-- Everyone can read ulovky
CREATE POLICY "Ulovky are viewable by everyone" ON ulovky
  FOR SELECT USING (true);

-- Kapitan can insert ulovky for own tym
CREATE POLICY "Kapitan can insert ulovky for own tym" ON ulovky
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tymy t
      JOIN clenove_tymu ct ON ct.tym_id = t.id
      WHERE t.id = ulovky.tym_id 
        AND ct.user_id = auth.uid() 
        AND ct.role = 'kapitan'
    )
    OR
    -- Rozhodci/poradatel can also insert
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = ulovky.zavod_id 
        AND zr.user_id = auth.uid() 
        AND zr.role IN ('rozhodci', 'poradatel')
    )
  );

-- Only rozhodci/poradatel can update ulovky
CREATE POLICY "Only rozhodci can update ulovky" ON ulovky
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = ulovky.zavod_id 
        AND zr.user_id = auth.uid() 
        AND zr.role IN ('rozhodci', 'poradatel')
    )
  );


-- ============================================
-- POTVRZENI POLICIES
-- ============================================

-- Everyone can read potvrzeni
CREATE POLICY "Potvrzeni are viewable by everyone" ON potvrzeni
  FOR SELECT USING (true);

-- Sousedni pegy or rozhodci can insert potvrzeni
CREATE POLICY "Sousedni pegy or rozhodci can insert potvrzeni" ON potvrzeni
  FOR INSERT WITH CHECK (
    -- Je rozhodci nebo poradatel
    EXISTS (
      SELECT 1 FROM zavod_role zr
      JOIN ulovky u ON u.id = potvrzeni.ulovek_id
      WHERE zr.zavod_id = u.zavod_id 
        AND zr.user_id = auth.uid() 
        AND zr.role IN ('rozhodci', 'poradatel')
    )
    OR
    -- Je kapitan sousedniho pegu (a ne vlastniho tymu)
    EXISTS (
      SELECT 1 FROM ulovky u
      JOIN tymy ut ON ut.id = u.tym_id
      JOIN tymy mt ON mt.zavod_id = ut.zavod_id
      JOIN clenove_tymu ct ON ct.tym_id = mt.id
      WHERE u.id = potvrzeni.ulovek_id
        AND ct.user_id = auth.uid()
        AND ct.role = 'kapitan'
        AND ABS(mt.peg_cislo - ut.peg_cislo) = 1
        AND mt.id != ut.id  -- Prevent self-confirmation
    )
  );

-- ============================================
-- ZLUTE_KARTY POLICIES
-- ============================================

-- Everyone can read zlute_karty
CREATE POLICY "Zlute_karty are viewable by everyone" ON zlute_karty
  FOR SELECT USING (true);

-- Only rozhodci/poradatel can insert zlute_karty
CREATE POLICY "Only rozhodci can insert zlute_karty" ON zlute_karty
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role 
      WHERE zavod_id = zlute_karty.zavod_id 
        AND user_id = auth.uid() 
        AND role IN ('rozhodci', 'poradatel')
    )
  );

-- No UPDATE or DELETE allowed (handled by triggers)

-- ============================================
-- ZLUTE_KARTY_POZNAMKY POLICIES
-- ============================================

-- Everyone can read poznamky
CREATE POLICY "Zlute_karty_poznamky are viewable by everyone" ON zlute_karty_poznamky
  FOR SELECT USING (true);

-- Only rozhodci/poradatel can insert poznamky
CREATE POLICY "Only rozhodci can insert zlute_karty_poznamky" ON zlute_karty_poznamky
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM zlute_karty zk
      JOIN zavod_role zr ON zr.zavod_id = zk.zavod_id
      WHERE zk.id = zlute_karty_poznamky.zluta_karta_id
        AND zr.user_id = auth.uid() 
        AND zr.role IN ('rozhodci', 'poradatel')
    )
  );


-- ============================================
-- AUDIT_LOG POLICIES
-- ============================================

-- Only rozhodci/poradatel can read audit_log
CREATE POLICY "Only rozhodci can read audit_log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM zavod_role 
      WHERE user_id = auth.uid() 
        AND role IN ('rozhodci', 'poradatel')
    )
  );

-- Audit log is insert-only via triggers, no direct insert allowed
-- (triggers use SECURITY DEFINER)

-- ============================================
-- ZAVOD_ROLE POLICIES
-- ============================================

-- Everyone can read zavod_role
CREATE POLICY "Zavod_role are viewable by everyone" ON zavod_role
  FOR SELECT USING (true);

-- Only poradatel can manage zavod_role
CREATE POLICY "Only poradatel can insert zavod_role" ON zavod_role
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id 
        AND zr.user_id = auth.uid() 
        AND zr.role = 'poradatel'
    )
    OR
    -- Allow first poradatel to be created (bootstrap)
    NOT EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id
    )
  );

-- Only poradatel can update zavod_role
CREATE POLICY "Only poradatel can update zavod_role" ON zavod_role
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id 
        AND zr.user_id = auth.uid() 
        AND zr.role = 'poradatel'
    )
  );

-- Only poradatel can delete zavod_role
CREATE POLICY "Only poradatel can delete zavod_role" ON zavod_role
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM zavod_role zr
      WHERE zr.zavod_id = zavod_role.zavod_id 
        AND zr.user_id = auth.uid() 
        AND zr.role = 'poradatel'
    )
  );
