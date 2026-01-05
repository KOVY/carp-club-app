# Database Checkpoint - Verification Guide

## Overview

This document provides a checklist for verifying that the Carp Club ČR database is properly set up after completing tasks 1.1-1.5.

## Prerequisites

Before running verification:
1. Supabase project is created and configured
2. Environment variables are set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
3. All migrations have been applied to Supabase

## Verification Checklist

### 1. Tables Exist

Run this SQL in Supabase SQL Editor to verify all tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected tables:
- [ ] `audit_log`
- [ ] `clenove_tymu`
- [ ] `potvrzeni`
- [ ] `profiles`
- [ ] `sektory`
- [ ] `souteze`
- [ ] `tymy`
- [ ] `ulovky`
- [ ] `zavod_role`
- [ ] `zavody`
- [ ] `zlute_karty`
- [ ] `zlute_karty_poznamky`

### 2. RLS Policies Enabled

Run this SQL to verify RLS is enabled on all tables:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should have `rowsecurity = true`.

### 3. RLS Policies Defined

Run this SQL to list all policies:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected policies per table:
- `profiles`: viewable by everyone, users can update own
- `zavody`: viewable by everyone, only poradatel can insert/update
- `tymy`: viewable by everyone, only poradatel can manage
- `ulovky`: viewable by everyone, kapitan can insert for own team
- `potvrzeni`: viewable by everyone, sousedni pegy or rozhodci can insert
- `zlute_karty`: viewable by everyone, only rozhodci can insert
- `audit_log`: only rozhodci/poradatel can read

### 4. Triggers Exist

Run this SQL to verify triggers:

```sql
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

Expected triggers:
- [ ] `audit_log`: `prevent_audit_update`, `prevent_audit_delete`
- [ ] `zlute_karty`: `prevent_zluta_karta_update`, `prevent_zluta_karta_delete`, `audit_zlute_karty`, `trigger_check_yellow_cards`
- [ ] `ulovky`: `audit_ulovky`, `update_ulovky_updated_at`
- [ ] `potvrzeni`: `audit_potvrzeni`, `trigger_check_confirmation`
- [ ] `zavody`: `audit_zavody`, `update_zavody_updated_at`
- [ ] `tymy`: `audit_tymy`, `update_tymy_updated_at`
- [ ] `profiles`: `update_profiles_updated_at`

### 5. Functions Exist

Run this SQL to verify functions:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

Expected functions:
- [ ] `audit_trigger_func`
- [ ] `calculate_tym_score`
- [ ] `check_ulovek_confirmation`
- [ ] `check_yellow_cards`
- [ ] `get_leaderboard`
- [ ] `is_embargo_active`
- [ ] `prevent_audit_modification`
- [ ] `update_updated_at_column`
- [ ] `validate_ulovek_time`

### 6. Test Trigger Functionality

#### Test append-only audit_log:

```sql
-- This should fail with error
UPDATE audit_log SET action = 'TEST' WHERE id = gen_random_uuid();
-- Expected: "Audit log je append-only. UPDATE a DELETE nejsou povoleny."
```

#### Test append-only zlute_karty:

```sql
-- This should fail with error (if any records exist)
UPDATE zlute_karty SET duvod = 'TEST' WHERE id = gen_random_uuid();
-- Expected: "Audit log je append-only. UPDATE a DELETE nejsou povoleny."
```

#### Test calculate_tym_score function:

```sql
-- Should return 0 score for non-existent team
SELECT * FROM calculate_tym_score('00000000-0000-0000-0000-000000000000');
-- Expected: skore = 0, pocet_ryb = 0
```

## Automated Verification

You can also run the verification script:

```bash
# Install tsx if not already installed
npm install -D tsx

# Run verification script
npx tsx scripts/verify-database.ts
```

## Troubleshooting

### Tables not found
- Ensure migration `001_initial_schema.sql` has been applied
- Check Supabase dashboard > Database > Tables

### RLS not enabled
- Ensure migration `002_rls_policies.sql` has been applied
- Check Supabase dashboard > Authentication > Policies

### Triggers not working
- Ensure migration `003_functions_triggers.sql` has been applied
- Check Supabase dashboard > Database > Functions

### Connection issues
- Verify environment variables are correct
- Check Supabase project is running
- Verify API keys are valid

## Next Steps

Once all checks pass:
1. Mark Task 2 as complete
2. Proceed to Task 3: TypeScript typy a základní moduly
