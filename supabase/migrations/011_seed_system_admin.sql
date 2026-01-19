-- Carp Club ČR - Seed System Admin
-- Migration: 011_seed_system_admin
-- Description: Add prorybolov@gmail.com as system admin

-- Přidat hlavního admina (prorybolov@gmail.com)
-- Tento SQL se pokusí najít uživatele podle emailu a přidat ho jako system admina

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Najdi uživatele podle emailu
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'prorybolov@gmail.com';

  -- Pokud uživatel existuje, přidej ho jako system admina
  IF v_user_id IS NOT NULL THEN
    INSERT INTO system_admins (user_id, email, role)
    VALUES (v_user_id, 'prorybolov@gmail.com', 'hlavni_admin')
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'System admin added: prorybolov@gmail.com (user_id: %)', v_user_id;
  ELSE
    RAISE WARNING 'User prorybolov@gmail.com not found in auth.users. Please run this migration after user signs up.';
  END IF;
END $$;
