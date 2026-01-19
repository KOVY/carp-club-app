-- GDPR Consent Migration
-- Migration: 012_gdpr_consent
-- Description: Add terms_accepted_at field to profiles for GDPR compliance

-- Add terms_accepted_at column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Add privacy_policy_version to track which version user agreed to
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT DEFAULT NULL;

-- Add index for queries filtering by consent
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted ON profiles(terms_accepted_at)
WHERE terms_accepted_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user accepted terms of service and privacy policy';
COMMENT ON COLUMN profiles.privacy_policy_version IS 'Version of privacy policy user agreed to (e.g., "2026-01-19")';
