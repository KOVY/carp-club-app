-- Migration 009: Force assign roles for ALL invitations
-- Purpose: Přiřadit role všem uživatelům kteří mají pozvánku (bez ohledu na registrovano_at)

-- ============================================
-- PŘIŘADIT ROLE PRO VŠECHNY POZVÁNKY
-- ============================================

-- 1. Přiřadit role v zavod_role pro VŠECHNY pozvánky kde existuje profil s emailem
INSERT INTO zavod_role (zavod_id, user_id, role)
SELECT DISTINCT
  p.zavod_id,
  pr.id as user_id,
  p.role
FROM pozvanky p
INNER JOIN profiles pr ON LOWER(pr.email) = LOWER(p.email)
WHERE p.zavod_id IS NOT NULL
ON CONFLICT (zavod_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

-- 2. Přiřadit členství v týmu pro všechny pozvánky s týmem
INSERT INTO clenove_tymu (tym_id, user_id, role)
SELECT DISTINCT
  p.tym_id,
  pr.id as user_id,
  p.role
FROM pozvanky p
INNER JOIN profiles pr ON LOWER(pr.email) = LOWER(p.email)
WHERE p.tym_id IS NOT NULL
ON CONFLICT (tym_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

-- 3. Nastavit kapitány týmů
UPDATE tymy t
SET kapitan_id = pr.id,
    updated_at = NOW()
FROM pozvanky p
INNER JOIN profiles pr ON LOWER(pr.email) = LOWER(p.email)
WHERE p.tym_id = t.id
  AND p.role = 'kapitan';

-- 4. Aktualizovat registrovano_at pro všechny pozvánky kde existuje profil
UPDATE pozvanky p
SET registrovano_at = COALESCE(p.registrovano_at, NOW())
FROM profiles pr
WHERE LOWER(pr.email) = LOWER(p.email)
  AND p.registrovano_at IS NULL;

-- ============================================
-- DIAGNOSTIKA - zkontrolovat výsledky
-- ============================================

-- Toto můžete spustit po migraci pro kontrolu:
-- SELECT
--   p.email,
--   p.jmeno,
--   p.role as pozvanka_role,
--   zr.role as zavod_role,
--   ct.role as tym_role
-- FROM pozvanky p
-- LEFT JOIN profiles pr ON LOWER(pr.email) = LOWER(p.email)
-- LEFT JOIN zavod_role zr ON zr.user_id = pr.id AND zr.zavod_id = p.zavod_id
-- LEFT JOIN clenove_tymu ct ON ct.user_id = pr.id AND ct.tym_id = p.tym_id;

COMMENT ON TABLE pozvanky IS 'Invitation tokens. Migration 009 forces role assignment for all invitations.';
