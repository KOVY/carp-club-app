# Fáze 0 — Bezpečnostní hotfix: Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zavřít kritické bezpečnostní díry živé aplikace Carp Club ČR (únik tokenů/PII, anonymní eskalace, cross-závod manipulace, nevalidovaný upload) bez regrese, tak aby opravy přežily pozdější přestavbu modelu.

**Architecture:** Dvě nasaditelné vrstvy. (1) **TS opravy** přes GitHub→Vercel — zpětně kompatibilní, nasadit PRVNÍ. (2) **DB migrace `016`** (DROP/REVOKE politik) — pustí Dušan ručně v Supabase SQL editoru AŽ PO deploy TS, aby se nikdo „neodřízl". Ověření přes `scripts/security-probe.ts` (anon RLS probe) a vitest pro čistou validační logiku.

**Tech Stack:** Next.js 15, TypeScript, Supabase (Postgres + RLS), `@supabase/supabase-js`, vitest 4, tsx.

**Klíčové pořadí:** Task 1 (probe baseline) → Tasky 2–8 (TS opravy, deploy) → Task 9 (migrace, pouští Dušan) → Task 10 (probe PASS + regrese).

---

## File Structure

| Soubor | Odpovědnost | Akce |
|--------|-------------|------|
| `scripts/security-probe.ts` | Anon RLS probe — ověří, že PII/tokeny/admini nejsou čitelní | Create |
| `src/lib/validators/foto.ts` | Čistá validace nahrávané fotky (MIME, velikost) | Create |
| `src/lib/validators/__tests__/foto.test.ts` | Vitest pro `validateFotoFile` | Create |
| `vitest.config.ts` | Minimální vitest config (node env) | Create |
| `src/actions/pozvanka.actions.ts` | `register_via_invitation` přes admin klienta | Modify |
| `src/actions/hlavni-admin.actions.ts` | `is_system_admin()` RPC + `checkAdminAccessForZavod` scope | Modify |
| `src/actions/auth.actions.ts` | Čtení vlastního profilu (telefon) přes admin klienta | Modify |
| `src/app/zavod/[zavodId]/page.tsx` | Čtení vlastního profilu (telefon) přes admin klienta | Modify |
| `src/actions/leaderboard.actions.ts` | Odstranit `email` z joinu kapitána | Modify |
| `src/actions/tym.actions.ts` | Zúžit `select('*')` cizích profilů na nepII sloupce | Modify |
| `src/lib/constants.ts` | `SYSTEM_ADMIN_IDS` z env | Modify |
| `src/lib/supabase/middleware.ts`, `components/auth/AuthCallbackHandler.tsx`, `app/admin/layout.tsx` | Odstranit PII/token z `console.log` | Modify |
| `supabase/migrations/016_security_hardening.sql` | RLS DROP/REVOKE + GRANT | Create |
| `supabase/migrations/016_rollback.sql` | Inverzní migrace | Create |

---

## Task 1: Probe skript — baseline (ukáže současné díry)

**Files:**
- Create: `scripts/security-probe.ts`

- [ ] **Step 1: Napsat probe skript**

```typescript
// scripts/security-probe.ts
// Bezpečnostní probe: simuluje útočníka s veřejným ANON klíčem.
// Ověřuje, že citlivá data NEJSOU čitelná. Spouštět PŘED a PO migraci 016.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const anonClient = createClient(url, anon)

type Result = { name: string; pass: boolean; detail: string }
const results: Result[] = []

function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail })
}

async function main() {
  // Probe 1: pozvanky — tokeny a kontakty NESMÍ být čitelné anonymně
  {
    const { data, error } = await anonClient.from('pozvanky').select('token, email, telefon').limit(5)
    const leaked = (data?.length ?? 0) > 0
    record('pozvanky anon SELECT', !leaked, leaked ? `LEAK: ${data!.length} řádků (token/email)` : `OK (${error?.message ?? 'prázdno'})`)
  }
  // Probe 2: profiles — email/telefon NESMÍ být čitelné anonymně
  {
    const { data, error } = await anonClient.from('profiles').select('email, telefon').limit(5)
    const leaked = (data ?? []).some(r => (r as any).email || (r as any).telefon)
    record('profiles anon email/telefon', !leaked, leaked ? `LEAK: PII viditelné` : `OK (${error?.message ?? 'bez PII'})`)
  }
  // Probe 3: system_admins — NESMÍ být čitelné anonymně
  {
    const { data, error } = await anonClient.from('system_admins').select('*').limit(5)
    const leaked = (data?.length ?? 0) > 0
    record('system_admins anon SELECT', !leaked, leaked ? `LEAK: ${data!.length} adminů` : `OK (${error?.message ?? 'prázdno'})`)
  }
  // Probe 4: register_via_invitation — NESMÍ jít volat anonymně
  {
    const { error } = await anonClient.rpc('register_via_invitation' as any, { p_token: '00000000-0000-0000-0000-000000000000' })
    const denied = !!error && /permission|denied|not.*exist|function/i.test(error.message)
    record('register_via_invitation anon EXECUTE', denied, denied ? `OK (odmítnuto: ${error!.message})` : `LEAK: funkce volatelná anonymně`)
  }

  console.log('\n=== SECURITY PROBE ===')
  for (const r of results) console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'}  ${r.name}  — ${r.detail}`)
  const failed = results.filter(r => !r.pass).length
  console.log(`\n${failed === 0 ? '✅ Všechny probe prošly' : `❌ ${failed} probe selhalo`}`)
  process.exit(failed === 0 ? 0 : 1)
}
main()
```

- [ ] **Step 2: Spustit baseline (očekává se SELHÁNÍ — díry jsou otevřené)**

Run: `npx tsx scripts/security-probe.ts`
Expected: **FAIL** u probe 1–4 (LEAK) — tím je potvrzeno, že díry reálně existují na produkci.

- [ ] **Step 3: Commit**

```bash
git add scripts/security-probe.ts
git commit -m "test(security): anon RLS probe skript (baseline ukazuje díry)"
```

---

## Task 2: `register_via_invitation` přes admin klienta (app část 3.2)

**Files:**
- Modify: `src/actions/pozvanka.actions.ts:~804`

- [ ] **Step 1: Přepnout RPC volání z RLS klienta na admin klienta**

V `registerViaInvitation` se admin klient (`adminClient`) už vytváří hned vedle. Změň volání RPC tak, aby šlo přes `adminClient` (service role), ne přes `supabase` (RLS). Najdi:

```typescript
    // Zavolat DB funkci
    const { data, error } = await (supabase
      .rpc as any)('register_via_invitation', { p_token: token })
```

Nahraď za:

```typescript
    // Zavolat DB funkci přes service role (anon/authenticated EXECUTE bude odebrán migrací 016)
    const { data, error } = await (adminClient
      .rpc as any)('register_via_invitation', { p_token: token })
```

- [ ] **Step 2: Ověřit, že se nikde jinde nevolá přes RLS klienta**

Run: `grep -rn "register_via_invitation" src/`
Expected: jediné volání je to upravené v `pozvanka.actions.ts` (přes `adminClient`). Pokud je další, přepnout stejně.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build projde (žádná typová chyba).

- [ ] **Step 4: Commit**

```bash
git add src/actions/pozvanka.actions.ts
git commit -m "fix(security): register_via_invitation volat přes service role"
```

---

## Task 3: `system_admins` přes RPC + cross-závod scope (app 3.4 + 3.5)

**Files:**
- Modify: `src/actions/hlavni-admin.actions.ts:32-71` a volající funkce

- [ ] **Step 1: `checkAdminAccess` — číst system_admins přes RPC místo přímého SELECT**

Najdi v `checkAdminAccess` (`:45-55`):

```typescript
  // Nejprve zkontroluj system_admins (globální admin)
  const { data: systemAdmin } = await supabase
    .from('system_admins')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (systemAdmin) {
    // Systémový admin má plná práva
    return { userId: user.id, isHlavniAdmin: true }
  }
```

Nahraď za (RPC `is_system_admin()` je `SECURITY DEFINER`, obchází RLS, existuje v migraci 010):

```typescript
  // Systémový admin přes SECURITY DEFINER RPC (po migraci 016 už není přímý SELECT povolen)
  const { data: isSysAdmin } = await supabase.rpc('is_system_admin' as any, { p_user_id: user.id })
  if (isSysAdmin === true) {
    return { userId: user.id, isHlavniAdmin: true }
  }
```

- [ ] **Step 2: Najít všechna další klientská čtení `system_admins`**

Run: `grep -rn "from('system_admins')" src/`
Expected: vypíše místa. Každé čtené přes RLS klienta (`server.ts`/`client.ts`) přepnout na `rpc('is_system_admin')` nebo na `createAdminClient()`. Místa přes `createAdminClient()` nech být (service role).

- [ ] **Step 3: Přidat `checkAdminAccessForZavod` (scope na konkrétní závod)**

Hned za `checkAdminAccess` přidej:

```typescript
/**
 * Kontrola oprávnění pro KONKRÉTNÍ závod (brání cross-závod eskalaci).
 * System/hlavní admin projde vždy; pořadatel jen pro daný zavod_id.
 */
async function checkAdminAccessForZavod(zavodId: string): Promise<{ userId: string; isHlavniAdmin: boolean } | null> {
  const base = await checkAdminAccess()
  if (!base) return null
  if (base.isHlavniAdmin) return base // system/hlavni admin má globální právo

  const supabase = await createClient()
  const { data: roles } = await supabase
    .from('zavod_role')
    .select('role')
    .eq('user_id', base.userId)
    .eq('zavod_id', zavodId)
    .in('role', ['hlavni_admin', 'poradatel'])

  if (!roles || roles.length === 0) return null
  return base
}
```

- [ ] **Step 4: Použít scope check ve funkcích nad úlovky/závodem**

Ve funkcích `getZavodDetail`, `getPendingUlovkyAdmin`, `confirmUlovekAdmin`, `rejectUlovekAdmin`:
- Tam, kde funkce dostává `zavodId` přímo (`getZavodDetail`, `getPendingUlovkyAdmin`): nahraď `checkAdminAccess()` za `checkAdminAccessForZavod(zavodId)`.
- Tam, kde funkce dostává jen `ulovekId` (`confirmUlovekAdmin`, `rejectUlovekAdmin`): nejdřív načti `zavod_id` úlovku přes `adminClient`, pak ověř scope. Vzor pro `confirmUlovekAdmin`:

```typescript
  const adminClient = createAdminClient()
  const { data: ulovek } = await adminClient.from('ulovky').select('zavod_id').eq('id', ulovekId).single()
  if (!ulovek) {
    return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: 'Úlovek nenalezen' } }
  }
  const access = await checkAdminAccessForZavod((ulovek as any).zavod_id)
  if (!access) {
    return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
  }
```

(Nahrazuje původní `const access = await checkAdminAccess()` na začátku těchto funkcí.)

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build projde.

- [ ] **Step 6: Commit**

```bash
git add src/actions/hlavni-admin.actions.ts
git commit -m "fix(security): system_admins přes RPC + cross-závod scope check"
```

---

## Task 4: Skrýt email/telefon z cizích čtení (app část 3.3)

**Files:**
- Modify: `src/actions/auth.actions.ts:257`, `src/app/zavod/[zavodId]/page.tsx:79`, `src/actions/leaderboard.actions.ts:105`, `src/actions/tym.actions.ts:224`

Po migraci 016 nebude `email`/`telefon` čitelný přes anon/authenticated (RLS klient). Tato místa proto musí být přepnuta dřív, než migrace proběhne.

- [ ] **Step 1: `auth.actions.ts` — vlastní `telefon` přes admin klienta**

Najdi (`:257-261`):

```typescript
  const { data: profile } = await supabase
    .from('profiles')
    .select('jmeno, telefon')
    .eq('id', user.id)
    .single()
```

Nahraď za (čtení vlastního PII přes service role, jako už dělá `ulovky.actions.ts`):

```typescript
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('jmeno, telefon')
    .eq('id', user.id)
    .single()
```

Ujisti se, že `import { createAdminClient } from '@/lib/supabase/admin'` je v souboru (přidej, pokud chybí).

- [ ] **Step 2: `zavod/[zavodId]/page.tsx` — vlastní `telefon` přes admin klienta**

Stejná transformace pro blok (`:79-83`) čtoucí `jmeno, telefon` vlastního uživatele — přepnout z `supabase` (server klient) na `createAdminClient()`. Přidat import, pokud chybí.

- [ ] **Step 3: `leaderboard.actions.ts` — odstranit `email` z joinu kapitána**

Najdi (`:105`):

```typescript
      kapitan:profiles!tymy_kapitan_id_fkey(id, jmeno, email)
```

Nahraď za (email kapitána se na leaderboardu nezobrazuje — odstranění je čistě zlepšení):

```typescript
      kapitan:profiles!tymy_kapitan_id_fkey(id, jmeno)
```

Pokud se `kapitan.email` níže v souboru používá, odstraň jeho použití (grep `kapitan.email` / `.email` v okolí).

- [ ] **Step 4: `tym.actions.ts` — zúžit `select('*')` cizích profilů**

Najdi čtení profilu kapitána (`:223-227`, `select('*')` přes `adminClient`) a join členů `user:profiles(*)`. Zúžit na sloupce reálně potřebné pro UI. Pokud UI potřebuje kontakt pro kapitána/pořadatele týmu, ponech `email, telefon` jen tam; jinak:

```typescript
  const { data: kapitan } = await adminClient
    .from('profiles')
    .select('id, jmeno')
    .eq('id', tym.kapitan_id)
    .single()
```

(Vědomé rozhodnutí: kontakty členů týmu nevracet klientovi, dokud to UI nepotřebuje — YAGNI.)

- [ ] **Step 5: Build + grep kontrola**

Run: `npm run build && grep -rn "profiles')\?.*select('\*')" src/actions/`
Expected: build projde; žádný nechtěný `select('*')` na profiles mimo zdůvodněná místa.

- [ ] **Step 6: Commit**

```bash
git add src/actions/auth.actions.ts src/app/zavod/[zavodId]/page.tsx src/actions/leaderboard.actions.ts src/actions/tym.actions.ts
git commit -m "fix(security): skrýt email/telefon z cizích a RLS čtení profilů"
```

---

## Task 5: Validace uploadu fotky (3.6) — TDD

**Files:**
- Create: `vitest.config.ts`, `src/lib/validators/foto.ts`, `src/lib/validators/__tests__/foto.test.ts`
- Modify: `src/actions/ulovky.actions.ts:210`

- [ ] **Step 1: Minimální vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

- [ ] **Step 2: Napsat failing test**

```typescript
// src/lib/validators/__tests__/foto.test.ts
import { describe, it, expect } from 'vitest'
import { validateFotoFile, MAX_FOTO_BYTES, ALLOWED_FOTO_MIME } from '../foto'

function fakeFile(type: string, size: number, name = 'x'): File {
  return { type, size, name } as unknown as File
}

describe('validateFotoFile', () => {
  it('přijme validní jpeg', () => {
    expect(validateFotoFile(fakeFile('image/jpeg', 1000))).toEqual({ ok: true })
  })
  it('odmítne chybějící soubor', () => {
    expect(validateFotoFile(null).ok).toBe(false)
  })
  it('odmítne prázdný soubor', () => {
    expect(validateFotoFile(fakeFile('image/jpeg', 0)).ok).toBe(false)
  })
  it('odmítne nepovolený MIME (svg)', () => {
    const r = validateFotoFile(fakeFile('image/svg+xml', 1000))
    expect(r.ok).toBe(false)
  })
  it('odmítne přerostlý soubor', () => {
    expect(validateFotoFile(fakeFile('image/png', MAX_FOTO_BYTES + 1)).ok).toBe(false)
  })
  it('má povolené tři MIME typy', () => {
    expect(ALLOWED_FOTO_MIME).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})
```

- [ ] **Step 3: Spustit — musí selhat**

Run: `npm test`
Expected: FAIL — `Cannot find module '../foto'`.

- [ ] **Step 4: Implementovat validátor**

```typescript
// src/lib/validators/foto.ts
export const ALLOWED_FOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FOTO_BYTES = 10 * 1024 * 1024 // 10 MB
export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
}

export type FotoValidation = { ok: true } | { ok: false; reason: string }

export function validateFotoFile(file: File | null | undefined): FotoValidation {
  if (!file || file.size === 0) return { ok: false, reason: 'Chybí fotka úlovku' }
  if (!(ALLOWED_FOTO_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'Nepovolený formát (jen JPEG, PNG, WebP)' }
  }
  if (file.size > MAX_FOTO_BYTES) return { ok: false, reason: 'Fotka je příliš velká (max 10 MB)' }
  return { ok: true }
}
```

- [ ] **Step 5: Spustit — musí projít**

Run: `npm test`
Expected: PASS (6 testů).

- [ ] **Step 6: Použít validátor v `submitUlovek` + bezpečná přípona**

V `ulovky.actions.ts` nahraď blok kontroly fotky (`:210-219`, jen `size === 0`) za:

```typescript
  // Requirement 3.5/3.6: Foto povinné + validace MIME a velikosti
  const fotoCheck = validateFotoFile(fotoFile)
  if (!fotoCheck.ok) {
    return {
      success: false,
      error: { code: ErrorCodes.MISSING_PHOTO, message: fotoCheck.reason },
    }
  }
```

A přípona souboru (`:364`) z ověřeného MIME, ne z klientského názvu:

```typescript
  const fileExt = EXT_BY_MIME[fotoFile.type] ?? 'jpg'
```

Přidej import: `import { validateFotoFile, EXT_BY_MIME } from '@/lib/validators/foto'`.

- [ ] **Step 7: Build + test**

Run: `npm run build && npm test`
Expected: build projde, testy zelené.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts src/lib/validators/ src/actions/ulovky.actions.ts
git commit -m "feat(security): validace MIME a velikosti fotky úlovku (TDD)"
```

---

## Task 6: System admin do env (3.7)

**Files:**
- Modify: `src/lib/constants.ts:8-17`

- [ ] **Step 1: Ověřit, kde se `isSystemAdmin` volá (server vs klient)**

Run: `grep -rn "isSystemAdmin\|SYSTEM_ADMIN_IDS" src/`
Expected: seznam míst. Pokud VŠECHNA volání jsou v server kódu (actions, server komponenty), env bez `NEXT_PUBLIC_` stačí. Pokud je volání v `'use client'` souboru, použij místo toho `is_system_admin()` RPC (Task 3) a env řešení vynech pro to místo.

- [ ] **Step 2: Číst ID z env**

Nahraď `src/lib/constants.ts:8-17`:

```typescript
/**
 * System admin user IDs — ze server-only env proměnné SYSTEM_ADMIN_IDS
 * (comma-separated UUID). Fallback prázdné pole.
 */
export const SYSTEM_ADMIN_IDS: readonly string[] = (process.env.SYSTEM_ADMIN_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/**
 * Check if a user ID is a system admin
 */
export function isSystemAdmin(userId: string): boolean {
  return SYSTEM_ADMIN_IDS.includes(userId)
}
```

- [ ] **Step 3: Doplnit env**

Přidat do `.env.local` (lokálně) i do Vercel env (Production + Preview):
```
SYSTEM_ADMIN_IDS=adfa3aa5-9e63-4a0b-8dac-f1f5911bcf25
```
(Hodnotu vzít z původního `constants.ts`. Vercel env nastaví Dušan v dashboardu nebo přes `vercel env add`.)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build projde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts
git commit -m "fix(security): system admin ID ze server-only env"
```

---

## Task 7: Odstranit PII/token z console.log (3.8)

**Files:**
- Modify: `src/lib/supabase/middleware.ts`, `src/components/auth/AuthCallbackHandler.tsx`, `src/actions/pozvanka.actions.ts`, `src/app/admin/layout.tsx`

- [ ] **Step 1: Najít citlivé logy**

Run: `grep -rnE "console\.(log|debug|info)" src/lib/supabase/middleware.ts src/components/auth/AuthCallbackHandler.tsx src/actions/pozvanka.actions.ts src/app/admin/layout.tsx`
Expected: seznam řádků logujících `userId`, `email`, `token`, session detaily.

- [ ] **Step 2: Odstranit/maskovat**

Pro každý nalezený řádek: pokud loguje userId/email/token/session → smaž ho. Pokud jde o skutečnou chybovou cestu, nahraď za `console.error('<kontext bez PII>')`. Nezaváděj žádný logovací helper (YAGNI) — jen odstranění.

- [ ] **Step 3: Ověřit, že nezůstaly PII logy v těchto souborech**

Run: `grep -rnE "console\.(log|debug|info).*(token|email|userId|user\.id|session)" src/lib/supabase/middleware.ts src/components/auth/AuthCallbackHandler.tsx src/actions/pozvanka.actions.ts src/app/admin/layout.tsx`
Expected: prázdný výstup.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build projde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/middleware.ts src/components/auth/AuthCallbackHandler.tsx src/actions/pozvanka.actions.ts src/app/admin/layout.tsx
git commit -m "fix(security): odstranit PII a tokeny z console.log"
```

---

## Task 8: Regrese TS vrstvy před nasazením

**Files:** žádné (verifikace)

- [ ] **Step 1: Build + testy + lint**

Run: `npm run build && npm test && npm run lint`
Expected: vše zelené (lint smí mít předchozí warningy, ne nové chyby).

- [ ] **Step 2: Smoke přes Playwright (dev server běží na :3002)**

Spusť `npx tsx` jednorázový průchod nebo Playwright skript z `/tmp/carp-audit/walk_public.py` znovu a ověř: home/archiv/sezona/kalendar/admin-login = 200, žádné nové console errory. (Auth flow se reálně ověří až po deploy + migraci v Tasku 10.)

- [ ] **Step 3: Push větve a otevřít PR (deploy preview)**

```bash
git push -u origin feat/faze-0-security-hardening
gh pr create --title "Fáze 0: bezpečnostní hotfix" --body "RLS hardening + cross-závod scope + upload validace + PII z logů. Migraci 016 pustit AŽ po merge/deploy."
```
Expected: Vercel vytvoří preview deployment. **TS vrstva je nasazena (zpětně kompatibilní), migrace ještě NE.**

---

## Task 9: DB migrace 016 (pouští Dušan ručně — AŽ PO deploy TS)

**Files:**
- Create: `supabase/migrations/016_security_hardening.sql`, `supabase/migrations/016_rollback.sql`

- [ ] **Step 1: Napsat migraci**

```sql
-- 016_security_hardening.sql
-- Fáze 0 bezpečnostní hotfix. Pustit AŽ PO nasazení TS změn (Tasky 2–7),
-- jinak se odřízne admin / vlastní telefon / registrace.

-- 3.1 pozvanky: zrušit anonymní čtení tokenů
DROP POLICY IF EXISTS "Anon can verify token" ON pozvanky;

-- 3.2 register_via_invitation: jen service role
REVOKE EXECUTE ON FUNCTION register_via_invitation(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION register_via_invitation(uuid) TO service_role;

-- 3.3 profiles: skrýt email a telefon (jmeno zůstává veřejné kvůli leaderboardu)
REVOKE SELECT (email, telefon) ON profiles FROM anon, authenticated;
-- service_role si ponechává plný SELECT (server actions čtou vlastní PII přes service role)

-- 3.4 system_admins: zrušit veřejné/authenticated čtení (čte se přes is_system_admin() RPC)
DROP POLICY IF EXISTS "Anon can read system_admins" ON system_admins;
DROP POLICY IF EXISTS "Authenticated can read system_admins" ON system_admins;
```

- [ ] **Step 2: Napsat rollback**

```sql
-- 016_rollback.sql — NOUZOVÝ návrat k původním (děravým) politikám
CREATE POLICY "Anon can verify token" ON pozvanky FOR SELECT TO anon USING (true);
GRANT EXECUTE ON FUNCTION register_via_invitation(uuid) TO anon, authenticated;
GRANT SELECT (email, telefon) ON profiles TO anon, authenticated;
CREATE POLICY "Anon can read system_admins" ON system_admins FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read system_admins" ON system_admins FOR SELECT TO authenticated USING (true);
```

- [ ] **Step 3: Commit obou souborů**

```bash
git add supabase/migrations/016_security_hardening.sql supabase/migrations/016_rollback.sql
git commit -m "feat(security): migrace 016 — RLS hardening + rollback"
```

- [ ] **Step 4: Dušan pustí migraci v Supabase SQL editoru**

Po deploy TS (Task 8) Dušan zkopíruje obsah `016_security_hardening.sql` do Supabase → SQL Editor → Run. Ověří „Success".

---

## Task 10: Verifikace po migraci

**Files:** žádné (verifikace)

- [ ] **Step 1: Probe musí nyní PROJÍT**

Run: `npx tsx scripts/security-probe.ts`
Expected: **✅ Všechny probe prošly** (pozvanky/profiles/system_admins/register — vše odepřeno anon klíči).

- [ ] **Step 2: Regrese reálných flow přes Playwright / ručně proti deployi**

Ověř na deployi (nebo lokálně po migraci): (a) přihlášení system admin → dashboard funguje (RPC cesta), (b) pořadatel závodu A NEpotvrdí úlovek závodu B (scope), (c) registrace přes pozvánku funguje (server/service role), (d) leaderboard zobrazuje jména týmů/kapitánů, (e) zadání úlovku s validní fotkou projde, s ne-obrázkem je odmítnuto.

- [ ] **Step 3: Merge PR → produkční deploy**

```bash
gh pr merge --squash
```
Expected: Vercel nasadí na produkci. Fáze 0 hotová.

- [ ] **Step 4: Aktualizovat paměť**

Zapsat do `~/.claude/.../memory/carp_club_app.md`, že Fáze 0 (security hotfix) je nasazena, s datem.

---

## Self-Review

**Spec coverage:** 3.1→T9, 3.2→T2+T9, 3.3→T4+T9, 3.4→T3+T9, 3.5→T3, 3.6→T5, 3.7→T6, 3.8→T7, 3.9→už hotovo (statistiky). Testovací plán (spec §6)→T1+T10. Rollback (spec §7)→T9. Nasazovací pořadí (spec §5)→architektura + T8/T9. **Vše pokryto.**

**Placeholder scan:** Bez TBD/„handle errors". Kód doslovný. Místa „grep a oprav stejně" mají konkrétní vzor a očekávaný výstup.

**Type consistency:** `validateFotoFile`/`MAX_FOTO_BYTES`/`ALLOWED_FOTO_MIME`/`EXT_BY_MIME` konzistentní mezi T5 testem, validátorem a `ulovky.actions.ts`. `checkAdminAccessForZavod` definováno v T3, použito v T3. `is_system_admin` RPC použito v T3.

**Známé předpoklady k ověření za běhu (ne placeholdery):** přesné okolní řádky v `pozvanka.actions.ts`/`tym.actions.ts`/`page.tsx` se od citací mohly posunout — kroky obsahují grep/„najdi a nahraď" vzor; `is_system_admin(p_user_id)` signatura ověřit v migraci 010 (Task 3 Step 1).
