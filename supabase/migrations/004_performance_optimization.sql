-- Carp Club ČR Performance Optimization
-- Migration: 004_performance_optimization
-- Description: Additional indexes and query optimizations for better performance

-- ============================================
-- ADDITIONAL INDEXES FOR COMMON QUERY PATTERNS
-- ============================================

-- Index for filtering ulovky by stav (used in getUlovkyKPotvrzeni, getPendingPotvrzeni)
-- Composite index for common query pattern: zavod_id + stav
CREATE INDEX IF NOT EXISTS idx_ulovky_zavod_stav ON ulovky(zavod_id, stav);

-- Index for filtering confirmed ulovky with weight ordering (used in leaderboard, getNejvetsiRyby)
-- Partial index for only confirmed catches - more efficient for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_ulovky_confirmed_vaha ON ulovky(zavod_id, vaha DESC) 
  WHERE stav = 'potvrzeno';

-- Index for team score calculation - confirmed catches per team
CREATE INDEX IF NOT EXISTS idx_ulovky_tym_confirmed ON ulovky(tym_id, vaha DESC) 
  WHERE stav = 'potvrzeno';

-- Index for ulovky time ordering (used in getUlovkyByZavod, gallery)
CREATE INDEX IF NOT EXISTS idx_ulovky_zavod_cas ON ulovky(zavod_id, cas DESC);

-- Index for potvrzeni lookup by user (used in getPendingPotvrzeni)
CREATE INDEX IF NOT EXISTS idx_potvrzeni_user ON potvrzeni(potvrdil_user_id);

-- Index for potvrzeni lookup by team (used in confirmation checks)
CREATE INDEX IF NOT EXISTS idx_potvrzeni_tym ON potvrzeni(potvrdil_tym_id);

-- Index for clenove_tymu role lookup (used in permission checks)
CREATE INDEX IF NOT EXISTS idx_clenove_tymu_role ON clenove_tymu(tym_id, role);

-- Index for zavod_role combined lookup (used in permission checks)
CREATE INDEX IF NOT EXISTS idx_zavod_role_combined ON zavod_role(zavod_id, user_id, role);

-- Index for zlute_karty count queries (used in leaderboard)
CREATE INDEX IF NOT EXISTS idx_zlute_karty_zavod ON zlute_karty(zavod_id);

-- Index for audit_log time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- Index for profiles email lookup (used in auth)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Index for tymy kapitan lookup (used in team queries)
CREATE INDEX IF NOT EXISTS idx_tymy_kapitan ON tymy(kapitan_id);

-- Index for sektory zavod lookup
CREATE INDEX IF NOT EXISTS idx_sektory_zavod ON sektory(zavod_id);

-- ============================================
-- OPTIMIZED LEADERBOARD FUNCTION
-- ============================================

-- Drop and recreate the leaderboard function with optimizations
DROP FUNCTION IF EXISTS get_leaderboard(UUID);

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
  WITH team_scores AS (
    -- Calculate scores for all teams in one pass
    SELECT 
      t.id as team_id,
      t.nazev as team_nazev,
      t.peg_cislo as team_peg,
      COALESCE(
        (SELECT SUM(sub.vaha)
         FROM (
           SELECT vaha
           FROM ulovky u
           WHERE u.tym_id = t.id 
             AND u.stav = 'potvrzeno'
             AND u.vaha >= 5.0
           ORDER BY u.vaha DESC
           LIMIT 5
         ) sub
        ), 0
      )::DECIMAL as team_skore,
      COALESCE(
        (SELECT COUNT(*)
         FROM (
           SELECT 1
           FROM ulovky u
           WHERE u.tym_id = t.id 
             AND u.stav = 'potvrzeno'
             AND u.vaha >= 5.0
           ORDER BY u.vaha DESC
           LIMIT 5
         ) sub
        ), 0
      )::INT as team_pocet_ryb,
      (SELECT MAX(u.cas) 
       FROM ulovky u 
       WHERE u.tym_id = t.id 
         AND u.stav = 'potvrzeno'
      ) as team_posledni_ulovek
    FROM tymy t
    WHERE t.zavod_id = p_zavod_id
  ),
  yellow_cards AS (
    -- Count yellow cards per team in one pass
    SELECT 
      zk.tym_id,
      COUNT(*) as card_count
    FROM zlute_karty zk
    WHERE zk.zavod_id = p_zavod_id
    GROUP BY zk.tym_id
  )
  SELECT 
    ts.team_id as tym_id,
    ts.team_nazev as tym_nazev,
    ts.team_peg as peg_cislo,
    ts.team_skore as skore,
    ts.team_pocet_ryb as pocet_ryb,
    COALESCE(yc.card_count, 0) as zlute_karty_count,
    ts.team_posledni_ulovek as posledni_ulovek
  FROM team_scores ts
  LEFT JOIN yellow_cards yc ON yc.tym_id = ts.team_id
  ORDER BY 
    ts.team_skore DESC,
    ts.team_posledni_ulovek ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- OPTIMIZED TEAM SCORE FUNCTION
-- ============================================

-- Drop and recreate with better performance
DROP FUNCTION IF EXISTS calculate_tym_score(UUID);

CREATE OR REPLACE FUNCTION calculate_tym_score(p_tym_id UUID)
RETURNS TABLE(skore DECIMAL, pocet_ryb INT) AS $$
BEGIN
  RETURN QUERY
  WITH top5 AS (
    SELECT vaha
    FROM ulovky
    WHERE tym_id = p_tym_id 
      AND stav = 'potvrzeno'
      AND vaha >= 5.0
    ORDER BY vaha DESC
    LIMIT 5
  )
  SELECT 
    COALESCE(SUM(vaha), 0)::DECIMAL as skore,
    COUNT(*)::INT as pocet_ryb
  FROM top5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MATERIALIZED VIEW FOR LEADERBOARD (OPTIONAL)
-- ============================================

-- Create a materialized view for leaderboard that can be refreshed
-- This is useful for high-traffic scenarios
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard AS
SELECT 
  t.zavod_id,
  t.id as tym_id,
  t.nazev as tym_nazev,
  t.peg_cislo,
  COALESCE(
    (SELECT SUM(sub.vaha)
     FROM (
       SELECT vaha
       FROM ulovky u
       WHERE u.tym_id = t.id 
         AND u.stav = 'potvrzeno'
         AND u.vaha >= 5.0
       ORDER BY u.vaha DESC
       LIMIT 5
     ) sub
    ), 0
  )::DECIMAL as skore,
  COALESCE(
    (SELECT COUNT(*)
     FROM (
       SELECT 1
       FROM ulovky u
       WHERE u.tym_id = t.id 
         AND u.stav = 'potvrzeno'
         AND u.vaha >= 5.0
       ORDER BY u.vaha DESC
       LIMIT 5
     ) sub
    ), 0
  )::INT as pocet_ryb,
  (SELECT COUNT(*) FROM zlute_karty zk WHERE zk.tym_id = t.id AND zk.zavod_id = t.zavod_id) as zlute_karty_count,
  (SELECT MAX(u.cas) FROM ulovky u WHERE u.tym_id = t.id AND u.stav = 'potvrzeno') as posledni_ulovek
FROM tymy t;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_pk ON mv_leaderboard(zavod_id, tym_id);
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_skore ON mv_leaderboard(zavod_id, skore DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_leaderboard_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

-- Update statistics for query planner optimization
ANALYZE profiles;
ANALYZE zavody;
ANALYZE tymy;
ANALYZE clenove_tymu;
ANALYZE ulovky;
ANALYZE potvrzeni;
ANALYZE zlute_karty;
ANALYZE zavod_role;
ANALYZE audit_log;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX idx_ulovky_zavod_stav IS 'Optimizes queries filtering by zavod and confirmation status';
COMMENT ON INDEX idx_ulovky_confirmed_vaha IS 'Partial index for leaderboard queries - only confirmed catches';
COMMENT ON INDEX idx_ulovky_tym_confirmed IS 'Optimizes team score calculation queries';
COMMENT ON INDEX idx_ulovky_zavod_cas IS 'Optimizes time-ordered catch listings';
COMMENT ON INDEX idx_potvrzeni_user IS 'Optimizes confirmation lookup by user';
COMMENT ON INDEX idx_potvrzeni_tym IS 'Optimizes confirmation lookup by team';
COMMENT ON INDEX idx_clenove_tymu_role IS 'Optimizes role-based permission checks';
COMMENT ON INDEX idx_zavod_role_combined IS 'Optimizes combined permission lookups';
COMMENT ON INDEX idx_zlute_karty_zavod IS 'Optimizes yellow card count queries';
COMMENT ON INDEX idx_audit_log_created IS 'Optimizes time-based audit log queries';
COMMENT ON INDEX idx_profiles_email IS 'Optimizes email-based user lookups';
COMMENT ON INDEX idx_tymy_kapitan IS 'Optimizes captain-based team lookups';
COMMENT ON INDEX idx_sektory_zavod IS 'Optimizes sector lookups by competition';

COMMENT ON MATERIALIZED VIEW mv_leaderboard IS 'Pre-computed leaderboard for high-traffic scenarios. Refresh with refresh_leaderboard_mv()';
COMMENT ON FUNCTION refresh_leaderboard_mv() IS 'Refreshes the leaderboard materialized view concurrently';
