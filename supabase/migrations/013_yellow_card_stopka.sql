-- Migration: 013_yellow_card_stopka
-- Description: Add stopka (penalty time-out) field to yellow cards
-- When a yellow card is issued, the team cannot submit catches until stopka_do time

-- Add stopka_do column to zlute_karty table
ALTER TABLE zlute_karty
ADD COLUMN IF NOT EXISTS stopka_do TIMESTAMPTZ;

-- Add index for efficient stopka queries
CREATE INDEX IF NOT EXISTS idx_zlute_karty_stopka
ON zlute_karty(tym_id, zavod_id, stopka_do)
WHERE stopka_do IS NOT NULL;

-- Comment explaining the column
COMMENT ON COLUMN zlute_karty.stopka_do IS 'Time until which the team cannot submit catches (penalty timeout). NULL means no stopka.';
