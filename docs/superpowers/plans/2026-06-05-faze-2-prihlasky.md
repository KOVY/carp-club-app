# Fáze 2 — Samoobslužné hlášení na závod: Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Umožnit registrovanému rybáři přihlásit se na vypsaný závod (založit tým jako kapitán), s kapacitou pegů a náhradníky, a dát pořadateli správu přihlášek — inkrementem nad stávajícím modelem.

**Architecture:** Nová tabulka `prihlasky` + sloupec `zavody.pocet_pegu`. Logika kapacity v čisté funkci (vitest TDD). Server actions v novém `prihlasky.actions.ts` (rybářské RLS, pořadatelské přes service role + scope check). UI: CTA na detailu závodu + pořadatelská stránka `/admin/[zavodId]/prihlasky`. `tymy`, scoring, leaderboard, pozvánky netknuté; schválení volá existující `createTym`.

**Tech Stack:** Next.js 15, TypeScript, Supabase (RLS), vitest 4.

**Pořadí nasazení:** Migrace 019 (Dušan ručně) — aditivní. TS přes GitHub→Vercel. DB je po úklidu čistá (0 závodů).

---

## File Structure

| Soubor | Odpovědnost | Akce |
|--------|-------------|------|
| `supabase/migrations/019_prihlasky.sql` + `_rollback.sql` | `pocet_pegu` + tabulka `prihlasky` + RLS | Create |
| `src/lib/errors.ts` | Přidat `NOT_FOUND`, `CAPACITY_FULL`, `ALREADY_REGISTERED` | Modify |
| `src/lib/prihlasky-logic.ts` + `__tests__/` | Čistá logika kapacity/náhradníků | Create |
| `src/lib/types.ts` | Typ `Prihlaska`, `PrihlaskaStav` | Modify |
| `src/actions/prihlasky.actions.ts` | Všechny přihláškové actions + scope helper | Create |
| `src/components/zavod/PrihlasitButton.tsx` | CTA „Přihlásit na závod" | Create |
| `src/app/zavod/[zavodId]/page.tsx` | Vložit `PrihlasitButton` do headeru | Modify |
| `src/app/admin/[zavodId]/prihlasky/page.tsx` | Pořadatelská správa přihlášek | Create |
| `src/app/admin/[zavodId]/page.tsx` | Odkaz „Přihlášky" do rozcestníku | Modify |

---

## Task 1: Migrace 019 — `pocet_pegu` + `prihlasky` + RLS

**Files:** Create `supabase/migrations/019_prihlasky.sql`, `supabase/migrations/019_rollback.sql`

- [ ] **Step 1: Migrace**

```sql
-- 019_prihlasky.sql — samoobslužné hlášení na závod (Fáze 2). Pustit ručně.
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS pocet_pegu INT;

CREATE TABLE IF NOT EXISTS prihlasky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  kapitan_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nazev_tymu TEXT NOT NULL,
  clenove TEXT,
  stav TEXT NOT NULL DEFAULT 'prihlasen'
       CHECK (stav IN ('prihlasen','nahradnik','schvaleno','zruseno')),
  poradi_nahradnika INT,
  tym_id UUID REFERENCES tymy(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zavod_id, kapitan_user_id)
);
CREATE INDEX IF NOT EXISTS idx_prihlasky_zavod ON prihlasky(zavod_id);
CREATE INDEX IF NOT EXISTS idx_prihlasky_kapitan ON prihlasky(kapitan_user_id);

ALTER TABLE prihlasky ENABLE ROW LEVEL SECURITY;
-- Čtení veřejné (jen nazev_tymu/jména/stav — žádné PII)
CREATE POLICY "Prihlasky viewable by everyone" ON prihlasky FOR SELECT USING (true);
-- Vložení jen sám za sebe
CREATE POLICY "User can insert own prihlaska" ON prihlasky
  FOR INSERT TO authenticated WITH CHECK (kapitan_user_id = auth.uid());
-- Update vlastníkem (zrušení své); pořadatelské změny jdou přes service role
CREATE POLICY "User can update own prihlaska" ON prihlasky
  FOR UPDATE TO authenticated USING (kapitan_user_id = auth.uid());
```

- [ ] **Step 2: Rollback**

```sql
-- 019_rollback.sql
DROP TABLE IF EXISTS prihlasky;
ALTER TABLE zavody DROP COLUMN IF EXISTS pocet_pegu;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/019_prihlasky.sql supabase/migrations/019_rollback.sql
git commit -m "feat(prihlasky): migrace 019 — pocet_pegu + tabulka prihlasky + RLS"
```

---

## Task 2: Rozšířit ErrorCodes

**Files:** Modify `src/lib/errors.ts`

- [ ] **Step 1: Přidat kódy**

V `src/lib/errors.ts` do objektu `ErrorCodes` (kolem :23-53) přidej do sekce Business:
```typescript
  NOT_FOUND: 'NOT_FOUND',
  CAPACITY_FULL: 'CAPACITY_FULL',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',
```
A do `ErrorMessages` (kolem :60-90) odpovídající české zprávy:
```typescript
  [ErrorCodes.NOT_FOUND]: 'Záznam nenalezen',
  [ErrorCodes.CAPACITY_FULL]: 'Kapacita závodu je naplněná',
  [ErrorCodes.ALREADY_REGISTERED]: 'Na tento závod už jsi přihlášený',
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build projde.

- [ ] **Step 3: Commit**

```bash
git add src/lib/errors.ts
git commit -m "feat(prihlasky): error kódy NOT_FOUND/CAPACITY_FULL/ALREADY_REGISTERED"
```

---

## Task 3: Čistá logika kapacity (TDD)

**Files:** Create `src/lib/prihlasky-logic.ts`, `src/lib/__tests__/prihlasky-logic.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// src/lib/__tests__/prihlasky-logic.test.ts
import { describe, it, expect } from 'vitest'
import { resolvePrihlaskaStav } from '../prihlasky-logic'

describe('resolvePrihlaskaStav', () => {
  it('volná kapacita → prihlasen', () => {
    expect(resolvePrihlaskaStav(5, 20, 0)).toEqual({ stav: 'prihlasen', poradi: null })
  })
  it('pocet_pegu null (neomezeno) → prihlasen', () => {
    expect(resolvePrihlaskaStav(99, null, 0)).toEqual({ stav: 'prihlasen', poradi: null })
  })
  it('plná kapacita → nahradnik, pořadí max+1', () => {
    expect(resolvePrihlaskaStav(20, 20, 2)).toEqual({ stav: 'nahradnik', poradi: 3 })
  })
  it('první náhradník dostane pořadí 1', () => {
    expect(resolvePrihlaskaStav(20, 20, 0)).toEqual({ stav: 'nahradnik', poradi: 1 })
  })
})
```

- [ ] **Step 2: Run — fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../prihlasky-logic'`.

- [ ] **Step 3: Implementace**

```typescript
// src/lib/prihlasky-logic.ts
export type PrihlaskaStav = 'prihlasen' | 'nahradnik' | 'schvaleno' | 'zruseno'

/** Rozhodne stav nové přihlášky podle obsazenosti a kapacity. */
export function resolvePrihlaskaStav(
  obsazenost: number,
  pocetPegu: number | null,
  maxPoradiNahradnika: number,
): { stav: 'prihlasen' | 'nahradnik'; poradi: number | null } {
  if (pocetPegu === null || obsazenost < pocetPegu) {
    return { stav: 'prihlasen', poradi: null }
  }
  return { stav: 'nahradnik', poradi: maxPoradiNahradnika + 1 }
}
```

- [ ] **Step 4: Run — pass**

Run: `npm test`
Expected: PASS (4 nové testy).

- [ ] **Step 5: Commit**

```bash
git add src/lib/prihlasky-logic.ts src/lib/__tests__/prihlasky-logic.test.ts
git commit -m "feat(prihlasky): logika kapacity a náhradníků (TDD)"
```

---

## Task 4: Typ `Prihlaska`

**Files:** Modify `src/lib/types.ts`

- [ ] **Step 1: Přidat typ**

Do `src/lib/types.ts` přidej (k ostatním doménovým typům):
```typescript
export interface Prihlaska {
  id: string;
  zavod_id: string;
  kapitan_user_id: string;
  nazev_tymu: string;
  clenove: string | null;
  stav: 'prihlasen' | 'nahradnik' | 'schvaleno' | 'zruseno';
  poradi_nahradnika: number | null;
  tym_id: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Build + commit**

Run: `npm run build` (projde)
```bash
git add src/lib/types.ts
git commit -m "feat(prihlasky): typ Prihlaska"
```

---

## Task 5: Server actions — rybářské + scope helper

**Files:** Create `src/actions/prihlasky.actions.ts`

- [ ] **Step 1: Vytvořit soubor s rybářskými actions**

```typescript
'use server'
// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { isSystemAdmin } from '@/lib/constants'
import { resolvePrihlaskaStav } from '@/lib/prihlasky-logic'
import type { ActionResult, Prihlaska } from '@/lib/types'

/** Scope check: vrací userId pořadatele/admina daného závodu, jinak null. (vzor tym.actions.ts) */
async function checkZavodAdminAccess(zavodId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSystemAdmin(user.id)) return user.id
  const { data: isSys } = await (supabase as any).rpc('is_system_admin', { p_user_id: user.id })
  if (isSys === true) return user.id
  const { data: roles } = await supabase.from('zavod_role').select('role')
    .eq('zavod_id', zavodId).eq('user_id', user.id).in('role', ['poradatel', 'hlavni_admin'])
  return (roles && roles.length > 0) ? user.id : null
}

/** Rybář se přihlásí na závod (založí tým jako kapitán). */
export async function prihlasitNaZavod(
  zavodId: string, input: { nazevTymu: string; clenove?: string },
): Promise<ActionResult<{ prihlaskaId: string; stav: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    if (!input.nazevTymu?.trim()) return { success: false, error: { code: ErrorCodes.INVALID_INPUT, message: 'Zadej název týmu' } }

    const adminClient = createAdminClient()
    // kapacita + obsazenost + max pořadí náhradníka
    const { data: zavod } = await adminClient.from('zavody').select('pocet_pegu').eq('id', zavodId).single()
    if (!zavod) return { success: false, error: { code: ErrorCodes.ZAVOD_NOT_FOUND, message: ErrorMessages[ErrorCodes.ZAVOD_NOT_FOUND] } }
    const { count: obsazenost } = await adminClient.from('prihlasky').select('id', { count: 'exact', head: true })
      .eq('zavod_id', zavodId).in('stav', ['prihlasen', 'schvaleno'])
    const { data: nahr } = await adminClient.from('prihlasky').select('poradi_nahradnika')
      .eq('zavod_id', zavodId).eq('stav', 'nahradnik').order('poradi_nahradnika', { ascending: false }).limit(1)
    const maxPoradi = (nahr?.[0]?.poradi_nahradnika as number) ?? 0
    const { stav, poradi } = resolvePrihlaskaStav(obsazenost ?? 0, (zavod as any).pocet_pegu ?? null, maxPoradi)

    const { data: created, error } = await (adminClient.from('prihlasky') as any).insert({
      zavod_id: zavodId, kapitan_user_id: user.id, nazev_tymu: input.nazevTymu.trim(),
      clenove: input.clenove?.trim() || null, stav, poradi_nahradnika: poradi,
    }).select('id').single()
    if (error) {
      if (error.code === '23505') return { success: false, error: { code: ErrorCodes.ALREADY_REGISTERED, message: ErrorMessages[ErrorCodes.ALREADY_REGISTERED] } }
      return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } }
    }
    return { success: true, data: { prihlaskaId: created.id, stav } }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Rybář zruší svou přihlášku; pokud byl přihlášen, první náhradník postoupí. */
export async function zrusitPrihlasku(prihlaskaId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    const { data: p } = await adminClient.from('prihlasky').select('*').eq('id', prihlaskaId).single()
    if (!p) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: ErrorMessages[ErrorCodes.NOT_FOUND] } }
    if ((p as any).kapitan_user_id !== user.id) return { success: false, error: { code: ErrorCodes.FORBIDDEN, message: ErrorMessages[ErrorCodes.FORBIDDEN] } }
    await (adminClient.from('prihlasky') as any).update({ stav: 'zruseno', updated_at: new Date().toISOString() }).eq('id', prihlaskaId)
    if ((p as any).stav === 'prihlasen') await promoteNahradnik(adminClient, (p as any).zavod_id)
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Interní: posune prvního náhradníka na přihlášeného a přečísluje zbytek. */
async function promoteNahradnik(adminClient: any, zavodId: string): Promise<void> {
  const { data: first } = await adminClient.from('prihlasky').select('id')
    .eq('zavod_id', zavodId).eq('stav', 'nahradnik').order('poradi_nahradnika', { ascending: true }).limit(1)
  if (!first || first.length === 0) return
  await adminClient.from('prihlasky').update({ stav: 'prihlasen', poradi_nahradnika: null }).eq('id', first[0].id)
  // přečíslovat zbylé náhradníky (−1)
  const { data: rest } = await adminClient.from('prihlasky').select('id, poradi_nahradnika')
    .eq('zavod_id', zavodId).eq('stav', 'nahradnik').order('poradi_nahradnika', { ascending: true })
  for (const r of rest ?? []) await adminClient.from('prihlasky').update({ poradi_nahradnika: r.poradi_nahradnika - 1 }).eq('id', r.id)
}

/** Rybář: moje přihlášky. */
export async function getMojePrihlasky(): Promise<ActionResult<Prihlaska[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: true, data: [] }
    const adminClient = createAdminClient()
    const { data } = await adminClient.from('prihlasky').select('*').eq('kapitan_user_id', user.id).neq('stav', 'zruseno')
    return { success: true, data: (data ?? []) as Prihlaska[] }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build projde.

- [ ] **Step 3: Commit**

```bash
git add src/actions/prihlasky.actions.ts
git commit -m "feat(prihlasky): rybářské actions (přihlásit/zrušit/moje) + scope helper"
```

---

## Task 6: Server actions — pořadatelské

**Files:** Modify `src/actions/prihlasky.actions.ts`

- [ ] **Step 1: Přidat pořadatelské actions**

Přidej do `prihlasky.actions.ts` (import `createTym` z admin actions na začátek souboru: `import { createTym } from '@/actions/admin.actions'`):

```typescript
/** Pořadatel: seznam přihlášek závodu (přihlášení + náhradníci). */
export async function getPrihlaskyZavodu(zavodId: string): Promise<ActionResult<Prihlaska[]>> {
  try {
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    const { data } = await adminClient.from('prihlasky').select('*').eq('zavod_id', zavodId)
      .neq('stav', 'zruseno').order('created_at', { ascending: true })
    return { success: true, data: (data ?? []) as Prihlaska[] }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Pořadatel: schválí přihlášku → vytvoří tým. */
export async function schvalitPrihlasku(prihlaskaId: string): Promise<ActionResult<{ tymId: string }>> {
  try {
    const adminClient = createAdminClient()
    const { data: p } = await adminClient.from('prihlasky').select('*').eq('id', prihlaskaId).single()
    if (!p) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: ErrorMessages[ErrorCodes.NOT_FOUND] } }
    const userId = await checkZavodAdminAccess((p as any).zavod_id)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    // vytvořit tým přes existující action (založí i kapitána do clenove_tymu + VS)
    const res = await createTym({ zavodId: (p as any).zavod_id, nazev: (p as any).nazev_tymu, kapitanId: (p as any).kapitan_user_id })
    if (!res.success) return res as any
    await (adminClient.from('prihlasky') as any).update({ stav: 'schvaleno', tym_id: res.data!.tymId, updated_at: new Date().toISOString() }).eq('id', prihlaskaId)
    return { success: true, data: { tymId: res.data!.tymId } }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Pořadatel: odhlásí přihlášku; náhradník postoupí. */
export async function odebratPrihlasku(prihlaskaId: string): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient()
    const { data: p } = await adminClient.from('prihlasky').select('*').eq('id', prihlaskaId).single()
    if (!p) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: ErrorMessages[ErrorCodes.NOT_FOUND] } }
    const userId = await checkZavodAdminAccess((p as any).zavod_id)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    await (adminClient.from('prihlasky') as any).update({ stav: 'zruseno', updated_at: new Date().toISOString() }).eq('id', prihlaskaId)
    if ((p as any).stav === 'prihlasen') await promoteNahradnik(adminClient, (p as any).zavod_id)
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Pořadatel: nastaví počet pegů (kapacitu) závodu. */
export async function nastavitPocetPegu(zavodId: string, pocet: number | null): Promise<ActionResult> {
  try {
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    await (adminClient.from('zavody') as any).update({ pocet_pegu: pocet }).eq('id', zavodId)
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build projde (ověř, že `createTym` import z `admin.actions` nezpůsobí cyklický import — pokud ano, zkopíruj volání přes dynamický import `const { createTym } = await import('@/actions/admin.actions')` uvnitř funkce).

- [ ] **Step 3: Commit**

```bash
git add src/actions/prihlasky.actions.ts
git commit -m "feat(prihlasky): pořadatelské actions (seznam/schválit/odhlásit/pegy)"
```

---

## Task 7: CTA „Přihlásit na závod" pro rybáře

**Files:** Create `src/components/zavod/PrihlasitButton.tsx`, Modify `src/app/zavod/[zavodId]/page.tsx`

- [ ] **Step 1: Komponenta `PrihlasitButton`**

`'use client'`. Tlačítko otevře jednoduchý dialog/formulář (název týmu + členové) a zavolá `prihlasitNaZavod`. Vzor stylu: `src/components/zavod/AddCatchButton.tsx`.

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { prihlasitNaZavod } from '@/actions/prihlasky.actions'
import { useToast } from '@/hooks/use-toast'

export function PrihlasitButton({ zavodId }: { zavodId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [nazevTymu, setNazevTymu] = useState('')
  const [clenove, setClenove] = useState('')
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      const r = await prihlasitNaZavod(zavodId, { nazevTymu, clenove })
      if (!r.success) { toast({ title: 'Chyba', description: r.error?.message, variant: 'destructive' }); return }
      toast({ title: r.data?.stav === 'nahradnik' ? 'Jsi náhradník' : 'Přihlášen!', description: r.data?.stav === 'nahradnik' ? 'Kapacita je plná, jsi na čekací listině.' : 'Přihláška odeslána, čeká na schválení pořadatelem.' })
      setOpen(false); router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Přihlásit na závod</Button>
  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-card">
      <input className="border rounded px-3 py-2" placeholder="Název týmu" value={nazevTymu} onChange={e => setNazevTymu(e.target.value)} />
      <textarea className="border rounded px-3 py-2" placeholder="Členové týmu (jména)" value={clenove} onChange={e => setClenove(e.target.value)} />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={isPending || !nazevTymu.trim()}>Odeslat přihlášku</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vložit do detailu závodu**

V `src/app/zavod/[zavodId]/page.tsx` (Server Component) — import `PrihlasitButton`. Do headeru (kolem :215-232, vedle `<AddCatchButton>`) přidej podmíněné zobrazení: jen když je `user` přihlášený, `userRole === null` (ještě není v závodě) a `zavodData.stav === 'priprava'`:
```tsx
{user && userRole === null && zavodData.stav === 'priprava' && (
  <PrihlasitButton zavodId={zavodId} />
)}
```
(Hodnoty `user`, `userRole`, `zavodData.stav` jsou v komponentě už načtené — viz `:72`, `:98`, `zavodData`.)

- [ ] **Step 3: Build + commit**

Run: `npm run build` (projde)
```bash
git add src/components/zavod/PrihlasitButton.tsx "src/app/zavod/[zavodId]/page.tsx"
git commit -m "feat(prihlasky): CTA Přihlásit na závod na detailu závodu"
```

---

## Task 8: Pořadatelská stránka přihlášek + nastavení pegů

**Files:** Create `src/app/admin/[zavodId]/prihlasky/page.tsx`, Modify `src/app/admin/[zavodId]/page.tsx`

- [ ] **Step 1: Stránka `/admin/[zavodId]/prihlasky`**

`'use client'`, vzor `src/app/admin/[zavodId]/tymy/page.tsx` (struktura: `use(params)`, `useEffect` načte data, header s `<ArrowLeft>`, seznam). Obsah:
- Nahoře input „Počet pegů" + tlačítko „Uložit" → `nastavitPocetPegu(zavodId, pocet)`.
- Načti `getPrihlaskyZavodu(zavodId)`; rozděl na přihlášené (`stav==='prihlasen'||'schvaleno'`) a náhradníky (`stav==='nahradnik'`, seřazené dle `poradi_nahradnika`).
- Pro každou přihlášku karta: název týmu, členové, stav badge; tlačítka **Schválit** (`schvalitPrihlasku`, jen pokud ještě není schváleno) a **Odhlásit** (`odebratPrihlasku`).
- Po každé akci znovu načti seznam + toast.

```typescript
'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { getPrihlaskyZavodu, schvalitPrihlasku, odebratPrihlasku, nastavitPocetPegu } from '@/actions/prihlasky.actions'
import type { Prihlaska } from '@/lib/types'

export default function PrihlaskyPage({ params }: { params: Promise<{ zavodId: string }> }) {
  const { zavodId } = use(params)
  const { toast } = useToast()
  const [prihlasky, setPrihlasky] = useState<Prihlaska[]>([])
  const [pegy, setPegy] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const r = await getPrihlaskyZavodu(zavodId)
    if (r.success) setPrihlasky(r.data!)
    setLoading(false)
  }
  useEffect(() => { load() }, [zavodId])

  const schvalit = async (id: string) => {
    const r = await schvalitPrihlasku(id)
    toast(r.success ? { title: 'Schváleno', description: 'Tým byl vytvořen.' } : { title: 'Chyba', description: r.error?.message, variant: 'destructive' })
    if (r.success) load()
  }
  const odhlasit = async (id: string) => {
    const r = await odebratPrihlasku(id)
    toast(r.success ? { title: 'Odhlášeno' } : { title: 'Chyba', description: r.error?.message, variant: 'destructive' })
    if (r.success) load()
  }
  const ulozitPegy = async () => {
    const r = await nastavitPocetPegu(zavodId, pegy ? parseInt(pegy, 10) : null)
    toast(r.success ? { title: 'Počet pegů uložen' } : { title: 'Chyba', description: r.error?.message, variant: 'destructive' })
  }

  // JSX: header s ArrowLeft zpět na /admin/[zavodId], input pegy + Uložit,
  // seznam přihlášených (stav prihlasen/schvaleno) a náhradníků (nahradnik dle poradi),
  // u každé karty Schválit (pokud stav!=='schvaleno') + Odhlásit. Empty state když prázdné.
  // Styl/komponenty dle vzoru admin/[zavodId]/tymy/page.tsx.
}
```
JSX doplň dle vzoru `admin/[zavodId]/tymy/page.tsx` (karty, header, empty state). Náhradníky zobraz s `poradi_nahradnika` („Náhradník č. {poradi}").

- [ ] **Step 2: Odkaz v rozcestníku**

V `src/app/admin/[zavodId]/page.tsx` (kolem :356, vedle odkazu „Správa týmů") přidej:
```tsx
<Link href={`/admin/${zavodId}/prihlasky`} className="block">
  <Button variant="outline" className="w-full justify-start gap-2">
    <Users className="h-4 w-4" />
    Přihlášky
  </Button>
</Link>
```
(`Users` ikona už je importovaná v souboru z rozcestníku.)

- [ ] **Step 3: Build + commit**

Run: `npm run build` (projde, `/admin/[zavodId]/prihlasky` ve výpisu)
```bash
git add "src/app/admin/[zavodId]/prihlasky/page.tsx" "src/app/admin/[zavodId]/page.tsx"
git commit -m "feat(prihlasky): pořadatelská správa přihlášek + počet pegů"
```

---

## Task 9: CHECKPOINT — build/test + finální review + push

**Files:** žádné (verifikace)

- [ ] **Step 1: Build + test + lint**

Run: `npm run build && npm test`
Expected: build OK, testy zelené (logika kapacity).

- [ ] **Step 2: Finální review** (controller dispatchne review subagenta na `git diff main..HEAD`: RLS prihlasky, scope check v pořadatelských actions, cyklický import createTym, logika náhradníků).

- [ ] **Step 3: Push**

```bash
git push -u origin feat/faze-2-prihlasky
```
Migraci 019 pustí Dušan po deployi.

---

## Task 10: E2E + regrese + merge

**Files:** žádné (verifikace)

- [ ] **Step 1: Po migraci 019 — E2E skript (vzor Fáze 1):** registrovaný user `prihlasitNaZavod` do volného závodu → `prihlasen`; naplnit kapacitu → další `nahradnik`; `zrusitPrihlasku` přihlášeného → náhradník postoupí; `schvalitPrihlasku` → vznikne tým (`tymy` řádek + `clenove_tymu` kapitán). Cleanup test dat.

- [ ] **Step 2: RLS probe (vzor Fáze 0):** anon nemůže INSERT do `prihlasky`; uživatel nemůže měnit cizí přihlášku přes RLS klienta; pořadatel závodu A neschválí přihlášku závodu B.

- [ ] **Step 3: Regrese:** stávající `createTym`/pozvánky/leaderboard fungují; detail závodu zobrazí „Přihlásit" jen přihlášenému bez role ve stavu `priprava`.

- [ ] **Step 4: Merge + paměť**

```bash
git checkout main && git merge --ff-only feat/faze-2-prihlasky && git push origin main
```
Aktualizovat `~/.claude/.../memory/carp_club_app.md` — Fáze 2 nasazena.

---

## Self-Review

**Spec coverage:** §3.1 pocet_pegu → T1; §3.2 prihlasky → T1; §3.3 RLS → T1; §4 lifecycle → T5/T6; §5 logika → T3 (+ promoteNahradnik v T5); §6 actions → T5/T6; §7 UI → T7/T8; §8 most createTym → T6; §9 testování → T3/T9/T10; ErrorCodes → T2; typy → T4. **Pokryto.**

**Placeholder scan:** Server actions, migrace, logika, helper = doslovný kód. UI JSX u T7 doslovně; T8 stránka má doslovné handlery + datový tok + odkaz na vzor pro JSX render (karty) — konkrétní vzor, ne „TODO".

**Type consistency:** `resolvePrihlaskaStav(obsazenost, pocetPegu, maxPoradi)→{stav,poradi}`, `Prihlaska`, `prihlasitNaZavod(zavodId,{nazevTymu,clenove})→{prihlaskaId,stav}`, `checkZavodAdminAccess→userId|null`, `createTym({zavodId,nazev,kapitanId})` konzistentní napříč T3–T8. ErrorCodes z T2 použité v T5/T6.

**Předpoklady k ověření za běhu:** cyklický import `createTym` (T6 Step 2 — fallback dynamický import); `user`/`userRole`/`zavodData.stav` dostupné v `zavod/[zavodId]/page.tsx` (potvrzeno průzkumem :72/:98); PostgREST chybový kód `23505` pro UNIQUE violation.
