-- Migration: Long-lived invitation tokens
-- Purpose: Allow invitation tokens to remain valid until the end of the zavod
-- This replaces the short-lived magic links with custom long-lived tokens

-- The pozvanky table already has:
-- - token (UUID, unique)
-- - platnost_do (timestamp)
-- These are sufficient for long-lived tokens

-- Update existing pozvánky to have platnost_do = zavod end date + 1 day
UPDATE pozvanky p
SET platnost_do = (
  SELECT z.datum_end + INTERVAL '1 day'
  FROM zavody z
  WHERE z.id = p.zavod_id
)
WHERE p.platnost_do < (
  SELECT z.datum_end + INTERVAL '1 day'
  FROM zavody z
  WHERE z.id = p.zavod_id
);

-- Add a check constraint to ensure platnost_do is reasonable
ALTER TABLE pozvanky
DROP CONSTRAINT IF EXISTS check_platnost_reasonable;

ALTER TABLE pozvanky
ADD CONSTRAINT check_platnost_reasonable
CHECK (platnost_do > created_at AND platnost_do < created_at + INTERVAL '365 days');

-- Comment on the design
COMMENT ON COLUMN pozvanky.token IS 'Long-lived invitation token valid until platnost_do (typically end of zavod + 1 day)';
COMMENT ON COLUMN pozvanky.platnost_do IS 'Token expiration - should be set to zavod end date + buffer time';
