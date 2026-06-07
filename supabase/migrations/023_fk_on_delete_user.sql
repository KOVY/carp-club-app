-- 023_fk_on_delete_user.sql
-- Umožní mazání uživatelů (profiles / auth.users) bez blokace FK.
-- Strategie: zachovat historické výsledky závodů → SET NULL;
--            čistě osobní vazby (členství, role) → CASCADE.
-- Kontext: DELETE uživatele selhával na tymy_kapitan_id_fkey (NO ACTION).

BEGIN;

-- 1) tymy.kapitan_id: NOT NULL → nullable, NO ACTION → SET NULL
--    Tým a jeho výsledky zůstávají i po smazání účtu kapitána.
ALTER TABLE public.tymy ALTER COLUMN kapitan_id DROP NOT NULL;
ALTER TABLE public.tymy DROP CONSTRAINT tymy_kapitan_id_fkey;
ALTER TABLE public.tymy
  ADD CONSTRAINT tymy_kapitan_id_fkey
  FOREIGN KEY (kapitan_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2) clenove_tymu.user_id → CASCADE (členství bez osoby nedává smysl)
ALTER TABLE public.clenove_tymu DROP CONSTRAINT clenove_tymu_user_id_fkey;
ALTER TABLE public.clenove_tymu
  ADD CONSTRAINT clenove_tymu_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3) ulovky.chytil_user_id → SET NULL (úlovek patří týmu, zůstává)
ALTER TABLE public.ulovky DROP CONSTRAINT ulovky_chytil_user_id_fkey;
ALTER TABLE public.ulovky
  ADD CONSTRAINT ulovky_chytil_user_id_fkey
  FOREIGN KEY (chytil_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4) potvrzeni.potvrdil_user_id: NOT NULL → nullable, SET NULL (audit zachovat)
ALTER TABLE public.potvrzeni ALTER COLUMN potvrdil_user_id DROP NOT NULL;
ALTER TABLE public.potvrzeni DROP CONSTRAINT potvrzeni_potvrdil_user_id_fkey;
ALTER TABLE public.potvrzeni
  ADD CONSTRAINT potvrzeni_potvrdil_user_id_fkey
  FOREIGN KEY (potvrdil_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5) zlute_karty.udelil_user_id: NOT NULL → nullable, SET NULL (karta platí týmu)
ALTER TABLE public.zlute_karty ALTER COLUMN udelil_user_id DROP NOT NULL;
ALTER TABLE public.zlute_karty DROP CONSTRAINT zlute_karty_udelil_user_id_fkey;
ALTER TABLE public.zlute_karty
  ADD CONSTRAINT zlute_karty_udelil_user_id_fkey
  FOREIGN KEY (udelil_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6) zlute_karty_poznamky.autor_id: NOT NULL → nullable, SET NULL
ALTER TABLE public.zlute_karty_poznamky ALTER COLUMN autor_id DROP NOT NULL;
ALTER TABLE public.zlute_karty_poznamky DROP CONSTRAINT zlute_karty_poznamky_autor_id_fkey;
ALTER TABLE public.zlute_karty_poznamky
  ADD CONSTRAINT zlute_karty_poznamky_autor_id_fkey
  FOREIGN KEY (autor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 7) zavod_role.user_id → CASCADE (čistá vazba role–uživatel)
ALTER TABLE public.zavod_role DROP CONSTRAINT zavod_role_user_id_fkey;
ALTER TABLE public.zavod_role
  ADD CONSTRAINT zavod_role_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8) audit_log.user_id → SET NULL (audit trail zachovat)
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_user_id_fkey;
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 9) system_admins.created_by → SET NULL (kdo admina založil je jen audit)
ALTER TABLE public.system_admins DROP CONSTRAINT system_admins_created_by_fkey;
ALTER TABLE public.system_admins
  ADD CONSTRAINT system_admins_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 10) Idempotence uvítacího e-mailu (Google OAuth callback může přijít vícekrát)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN NOT NULL DEFAULT false;

COMMIT;
