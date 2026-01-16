-- Migration 008: Fix invitation role assignment
-- Purpose: Retroactively assign roles for users who registered via invitation but didn't get roles
-- Problem: register_via_invitation doesn't assign roles properly for existing users
-- Solution: Create a migration to assign missing roles based on pozvanky table

-- ============================================
-- PŘIŘADIT CHYBĚJÍCÍ ROLE PRO EXISTUJÍCÍ POZVÁNKY
-- ============================================

-- Pro všechny pozvánky které mají registrovano_at (byly použity),
-- ale uživatel nemá přiřazenou roli v zavod_role

INSERT INTO zavod_role (zavod_id, user_id, role)
SELECT DISTINCT
  p.zavod_id,
  pr.id as user_id,
  p.role
FROM pozvanky p
INNER JOIN profiles pr ON pr.email = p.email
LEFT JOIN zavod_role zr ON zr.zavod_id = p.zavod_id AND zr.user_id = pr.id
WHERE p.registrovano_at IS NOT NULL  -- Pozvánka byla použita
  AND zr.id IS NULL                   -- Ale role není přiřazena
ON CONFLICT (zavod_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

-- Pro všechny pozvánky s týmem, přiřadit členství v týmu
INSERT INTO clenove_tymu (tym_id, user_id, role)
SELECT DISTINCT
  p.tym_id,
  pr.id as user_id,
  p.role
FROM pozvanky p
INNER JOIN profiles pr ON pr.email = p.email
LEFT JOIN clenove_tymu ct ON ct.tym_id = p.tym_id AND ct.user_id = pr.id
WHERE p.registrovano_at IS NOT NULL  -- Pozvánka byla použita
  AND p.tym_id IS NOT NULL            -- Má přiřazený tým
  AND ct.id IS NULL                   -- Ale členství není přiřazeno
ON CONFLICT (tym_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

-- Aktualizovat kapitány týmů
UPDATE tymy t
SET kapitan_id = pr.id,
    updated_at = NOW()
FROM pozvanky p
INNER JOIN profiles pr ON pr.email = p.email
WHERE p.tym_id = t.id
  AND p.role = 'kapitan'
  AND p.registrovano_at IS NOT NULL
  AND (t.kapitan_id IS NULL OR t.kapitan_id != pr.id);

-- ============================================
-- POZNÁMKY
-- ============================================

-- Po této migraci:
-- ✅ Všichni uživatelé s registrovano_at dostanou role
-- ✅ Kapitáni budou správně nastaveni v týmech
-- ✅ Opakované spuštění migrace je bezpečné (ON CONFLICT)

COMMENT ON TABLE pozvanky IS 'Invitation tokens for competitors. Role assignment is done via migration 008 for existing invitations.';
