# Checkpoint 7: Úlovky fungují

## Overview

This checkpoint verifies that the Úlovky (catches) functionality is working correctly:
1. ✅ Validation works (weight >= 5kg, photo required, time window)
2. ⚠️ Photo storage needs setup
3. ✅ RLS policies work

## Verification Results

### 1. Validation ✅

| Check | Status | Details |
|-------|--------|---------|
| Weight >= 5kg | ✅ | Database CHECK constraint + server action validation |
| Photo required | ✅ | Database NOT NULL constraint + server action validation |
| Fish type enum | ✅ | Database enum (kapr/amur) + server action validation |
| Time window | ✅ | Server action validates against zavod dates |
| Initial state | ✅ | Default stav='ceka' in schema + server action |

### 2. Storage ⚠️ Needs Setup

The storage bucket `ulovky-photos` needs to be created in Supabase.

**Setup Instructions:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Enter bucket name: `ulovky-photos`
6. Check **Public bucket** (for photo URLs to work)
7. Click **Create bucket**

**Storage Policies (optional but recommended):**

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ulovky-photos');

-- Allow public read access
CREATE POLICY "Public read access for photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ulovky-photos');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ulovky-photos' AND auth.uid()::text = (storage.foldername(name))[2]);
```

### 3. RLS Policies ✅

| Policy | Status | Details |
|--------|--------|---------|
| SELECT (everyone) | ✅ | Anonymous users can read ulovky |
| INSERT (kapitan) | ✅ | Only team kapitans can insert for their team |
| INSERT (rozhodci/poradatel) | ✅ | Referees and organizers can insert |
| UPDATE (rozhodci/poradatel) | ✅ | Only referees and organizers can update |
| Anonymous INSERT blocked | ✅ | RLS correctly rejects anonymous inserts |

### 4. Server Actions ✅

| Action | Status | Validations |
|--------|--------|-------------|
| submitUlovek | ✅ | Auth, weight, fish type, photo, zavod, time window, team membership |
| getUlovkyByZavod | ✅ | Embargo handling, weight hiding, relations |
| getUlovkyKPotvrzeni | ✅ | Neighbor peg filtering, self-confirmation prevention |

## How to Run Verification

```bash
npx tsx scripts/verify-ulovky-checkpoint.ts
```

## Manual Testing Steps

1. **Create test data in Supabase:**
   ```sql
   -- Create a test zavod (active)
   INSERT INTO zavody (nazev, datum_start, datum_end, stav)
   VALUES ('Test Závod', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '24 hours', 'probiha')
   RETURNING id;
   
   -- Create a test team (use the zavod_id from above)
   INSERT INTO tymy (zavod_id, nazev, kapitan_id, peg_cislo)
   VALUES ('<zavod_id>', 'Test Tým', '<your_user_id>', 1)
   RETURNING id;
   
   -- Add yourself as kapitan
   INSERT INTO clenove_tymu (tym_id, user_id, role)
   VALUES ('<tym_id>', '<your_user_id>', 'kapitan');
   ```

2. **Test via UI:**
   - Log in as the kapitan
   - Navigate to the závod
   - Try submitting an úlovek with:
     - Weight: 10.5 kg
     - Type: kapr
     - Photo: any image file
   - Verify the record appears in the database with stav='ceka'
   - Verify the photo appears in Storage

3. **Test validation errors:**
   - Try weight < 5kg → should show "Minimální váha ryby je 5 kg"
   - Try without photo → should show "Fotografie je povinná"
   - Try outside time window → should show "Závod neprobíhá"

## Next Steps

Once the storage bucket is created and all checks pass:
1. Mark Task 7 as complete
2. Proceed to Task 8: Server Actions - Potvrzování

## Troubleshooting

### Storage bucket not found
- Create the bucket manually in Supabase Dashboard
- Ensure the bucket is named exactly `ulovky-photos`
- Make sure it's set to public

### RLS policy errors
- Verify migrations 002_rls_policies.sql was applied
- Check policies in Supabase Dashboard > Authentication > Policies

### Validation not working
- Verify migrations 001_initial_schema.sql was applied
- Check constraints on ulovky table in Supabase Dashboard
