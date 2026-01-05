# Performance Optimization - Carp Club ČR

## Overview

This document describes the performance optimizations implemented for the Carp Club ČR application database.

## Indexes Added

### Existing Indexes (from initial schema)
- `idx_ulovky_zavod` - ulovky(zavod_id)
- `idx_ulovky_tym` - ulovky(tym_id)
- `idx_ulovky_stav` - ulovky(stav)
- `idx_tymy_zavod` - tymy(zavod_id)
- `idx_tymy_peg` - tymy(zavod_id, peg_cislo)
- `idx_potvrzeni_ulovek` - potvrzeni(ulovek_id)
- `idx_zlute_karty_tym` - zlute_karty(tym_id, zavod_id)
- `idx_audit_log_table` - audit_log(table_name, record_id)
- `idx_clenove_tymu_user` - clenove_tymu(user_id)
- `idx_zavod_role_user` - zavod_role(user_id)
- `idx_zavod_role_zavod` - zavod_role(zavod_id)

### New Indexes (migration 004)

| Index Name | Table | Columns | Purpose |
|------------|-------|---------|---------|
| `idx_ulovky_zavod_stav` | ulovky | (zavod_id, stav) | Composite index for filtering catches by competition and status |
| `idx_ulovky_confirmed_vaha` | ulovky | (zavod_id, vaha DESC) WHERE stav='potvrzeno' | Partial index for leaderboard queries |
| `idx_ulovky_tym_confirmed` | ulovky | (tym_id, vaha DESC) WHERE stav='potvrzeno' | Team score calculation optimization |
| `idx_ulovky_zavod_cas` | ulovky | (zavod_id, cas DESC) | Time-ordered catch listings |
| `idx_potvrzeni_user` | potvrzeni | (potvrdil_user_id) | Confirmation lookup by user |
| `idx_potvrzeni_tym` | potvrzeni | (potvrdil_tym_id) | Confirmation lookup by team |
| `idx_clenove_tymu_role` | clenove_tymu | (tym_id, role) | Role-based permission checks |
| `idx_zavod_role_combined` | zavod_role | (zavod_id, user_id, role) | Combined permission lookups |
| `idx_zlute_karty_zavod` | zlute_karty | (zavod_id) | Yellow card count queries |
| `idx_audit_log_created` | audit_log | (created_at DESC) | Time-based audit log queries |
| `idx_profiles_email` | profiles | (email) | Email-based user lookups |
| `idx_tymy_kapitan` | tymy | (kapitan_id) | Captain-based team lookups |
| `idx_sektory_zavod` | sektory | (zavod_id) | Sector lookups by competition |

## Query Optimizations

### Leaderboard Function
The `get_leaderboard()` function was optimized using:
- CTEs (Common Table Expressions) for better query planning
- Single-pass aggregation for team scores
- Separate CTE for yellow card counts to avoid N+1 queries

### Team Score Function
The `calculate_tym_score()` function was optimized using:
- CTE for cleaner query structure
- Efficient LIMIT clause for top 5 fish selection

## Materialized View

A materialized view `mv_leaderboard` was created for high-traffic scenarios:

```sql
-- Refresh the materialized view
SELECT refresh_leaderboard_mv();
```

Benefits:
- Pre-computed leaderboard data
- Concurrent refresh support (no blocking)
- Indexed for fast lookups

Usage considerations:
- Use for read-heavy workloads
- Refresh after batch updates
- Real-time data still uses the function

## Query Patterns Optimized

### 1. Get Pending Confirmations
```sql
-- Before: Sequential scans on ulovky and potvrzeni
-- After: Uses idx_ulovky_zavod_stav and idx_potvrzeni_user
SELECT * FROM ulovky 
WHERE zavod_id = ? AND stav = 'ceka'
```

### 2. Leaderboard Calculation
```sql
-- Before: Multiple subqueries per team
-- After: Single CTE-based query with partial indexes
SELECT * FROM get_leaderboard(zavod_id)
```

### 3. Permission Checks
```sql
-- Before: Multiple index lookups
-- After: Single composite index lookup
SELECT role FROM zavod_role 
WHERE zavod_id = ? AND user_id = ?
```

### 4. Top Fish Query
```sql
-- Before: Full table scan with sort
-- After: Uses idx_ulovky_confirmed_vaha partial index
SELECT * FROM ulovky 
WHERE zavod_id = ? AND stav = 'potvrzeno'
ORDER BY vaha DESC LIMIT 10
```

## Statistics Update

The migration includes `ANALYZE` commands for all tables to ensure the query planner has up-to-date statistics.

## Recommendations

1. **Regular ANALYZE**: Run `ANALYZE` periodically on high-write tables
2. **Monitor slow queries**: Use `pg_stat_statements` extension
3. **Index maintenance**: Run `REINDEX` during low-traffic periods
4. **Materialized view refresh**: Schedule during off-peak hours

## Migration File

All optimizations are in: `supabase/migrations/004_performance_optimization.sql`
