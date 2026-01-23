-- Carp Club ČR Database Schema
-- Migration: 015_map_coordinates
-- Description: Add GPS coordinates for map display

-- ============================================
-- ADD MAP COORDINATES TO ZAVODY
-- ============================================

-- Center coordinates for the competition location (lake)
ALTER TABLE zavody
  ADD COLUMN IF NOT EXISTS map_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS map_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS map_zoom INT DEFAULT 15,
  ADD COLUMN IF NOT EXISTS map_location_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN zavody.map_lat IS 'GPS latitude of competition center (lake)';
COMMENT ON COLUMN zavody.map_lng IS 'GPS longitude of competition center (lake)';
COMMENT ON COLUMN zavody.map_zoom IS 'Default zoom level for map display';
COMMENT ON COLUMN zavody.map_location_name IS 'Human-readable location name';

-- ============================================
-- ADD GPS COORDINATES TO TYMY (PEGS)
-- ============================================

-- Each team/peg can have GPS coordinates
ALTER TABLE tymy
  ADD COLUMN IF NOT EXISTS peg_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS peg_lng DECIMAL(11, 8);

-- Add comment for documentation
COMMENT ON COLUMN tymy.peg_lat IS 'GPS latitude of the peg location';
COMMENT ON COLUMN tymy.peg_lng IS 'GPS longitude of the peg location';

-- ============================================
-- ADD COLOR TO TYMY (for map markers)
-- ============================================

ALTER TABLE tymy
  ADD COLUMN IF NOT EXISTS barva TEXT DEFAULT '#3B82F6';

COMMENT ON COLUMN tymy.barva IS 'Team color for UI display and map markers (hex code)';
