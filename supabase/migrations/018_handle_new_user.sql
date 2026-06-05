-- 018_handle_new_user.sql
-- Po vzniku auth usera (email signup i Google OAuth) automaticky založí profil.
-- Idempotentní (ON CONFLICT DO NOTHING) — nekoliduje s pořadatelovým admin-create upsertem.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, jmeno, terms_accepted_at, privacy_policy_version)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'jmeno', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(NEW.email, '@', 1)
    ),
    CASE WHEN (NEW.raw_user_meta_data->>'terms_accepted') = 'true' THEN NOW() ELSE NULL END,
    CASE WHEN (NEW.raw_user_meta_data->>'terms_accepted') = 'true' THEN to_char(NOW(), 'YYYY-MM-DD') ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
