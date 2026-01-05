# Checkpoint 11: Leaderboard Verification

## Status: ✅ PASSED

**Date:** January 2, 2026

## Verified Functionality

### 1. Score Calculation Correctness (Requirements 5.1, 5.2, 5.3, 5.4)

| Test | Status | Requirement |
|------|--------|-------------|
| Empty array returns score 0 | ✅ | - |
| Only confirmed catches are counted | ✅ | 5.1 |
| Only fish >= 5kg are counted | ✅ | 5.3 |
| Top 5 heaviest fish are summed | ✅ | 5.1 |
| Less than 5 fish - all are counted | ✅ | 5.2 |
| Both kapr and amur count equally | ✅ | 5.4 |

**Implementation:** `src/lib/scoring.ts` - `calculateTymScore()` function

### 2. Embargo Visibility Rules (Requirements 5.7, 6.2, 6.3)

| Test | Status | Requirement |
|------|--------|-------------|
| No embargo - all roles can see weights | ✅ | 5.7 |
| Embargo active - divak cannot see weights | ✅ | 6.2 |
| Embargo active - zavodnik cannot see weights | ✅ | 6.2 |
| Embargo active - kapitan cannot see weights | ✅ | 6.2 |
| Embargo active - rozhodci CAN see weights | ✅ | 6.3 |
| Embargo active - poradatel CAN see weights | ✅ | 6.3 |
| Embargo detection - before embargo_od | ✅ | 6.1 |
| Embargo detection - during embargo period | ✅ | 6.1 |
| Embargo detection - after datum_end | ✅ | 6.1 |
| Embargo detection - null embargo_od means no embargo | ✅ | 6.1 |

**Implementation:** 
- `src/actions/leaderboard.actions.ts` - `getLeaderboard()` and `getNejvetsiRyby()` functions
- `src/lib/permissions.ts` - `canViewFullLeaderboard()` function

### 3. Tie-Breaking Functionality (Requirement 5.5)

| Test | Status | Requirement |
|------|--------|-------------|
| Higher score ranks higher | ✅ | 5.5 |
| Same score - earlier time ranks higher | ✅ | 5.5 |
| Poradi (rank) is assigned correctly | ✅ | 5.5 |
| getPoradiCas returns latest updated_at from top5 | ✅ | 5.5 |
| getPoradiCas returns epoch for empty array | ✅ | 5.5 |
| Multiple teams with same score sorted by time | ✅ | 5.5 |

**Implementation:** `src/lib/scoring.ts` - `sortLeaderboard()` and `getPoradiCas()` functions

## Test Results

```
Total tests: 22
Passed: 22
Failed: 0
```

## Files Verified

- `src/lib/scoring.ts` - Scoring calculation module
- `src/lib/permissions.ts` - Permission checks including embargo visibility
- `src/actions/leaderboard.actions.ts` - Server actions for leaderboard
- `src/lib/__tests__/scoring.test.ts` - Unit tests for scoring (7 tests passing)

## Verification Script

Run the checkpoint verification:
```bash
npx tsx scripts/verify-leaderboard-checkpoint.ts
```

Run the unit tests:
```bash
npx vitest run src/lib/__tests__/scoring.test.ts
```

## Notes

- Scoring is calculated on-the-fly when leaderboard is requested
- The `calculate_tym_score()` PostgreSQL function is available for DB-level verification
- Embargo logic correctly hides weights for non-privileged users during embargo period
- Tie-breaking uses the confirmation time (updated_at) of the last counted fish
