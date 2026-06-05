-- 017_rollback.sql — NOUZOVÝ návrat k chování před opravou 017.
-- (Obnoví širší přístup; používat jen pokud 017 něco rozbije.)

-- 3.3 obnovit plný SELECT na profiles pro anon/authenticated
REVOKE SELECT (id, jmeno, created_at, updated_at, terms_accepted_at, privacy_policy_version)
  ON profiles FROM anon, authenticated;
GRANT SELECT ON profiles TO anon, authenticated;

-- 3.2 obnovit EXECUTE pro PUBLIC
GRANT EXECUTE ON FUNCTION register_via_invitation(uuid) TO PUBLIC;
