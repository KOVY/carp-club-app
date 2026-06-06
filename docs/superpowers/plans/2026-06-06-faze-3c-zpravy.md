# Fáze 3c — Zprávy + přivolání + zvoneček: Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat chat uvnitř závodu a přivolání rozhodčího (🔔) jako jeden systém zpráv s realtime „zvonečkem" na dashboardu rozhodčího.

**Architecture:** Tabulka `zpravy` (typ `chat`/`privolani`) + RLS + realtime publikace. Server actions pro odeslání/přivolání/vyřízení. Client komponenta `ChatPanel` na detailu závodu (realtime přes `useZavodChat`). Realtime subscription na admin dashboardu → pípnutí + seznam nevyřízených přivolání.

**Tech Stack:** Next.js 15, TypeScript, Supabase (Postgres + Realtime), vitest 4.

**Pořadí nasazení:** Migrace 022 (Dušan ručně — vč. `ALTER PUBLICATION`). TS přes GitHub→Vercel.

---

## File Structure

| Soubor | Odpovědnost | Akce |
|--------|-------------|------|
| `supabase/migrations/022_zpravy.sql` + `_rollback.sql` | tabulka zpravy + RLS + realtime publikace | Create |
| `src/lib/types.ts` | typ `Zprava` | Modify |
| `src/actions/zpravy.actions.ts` | odeslat/přivolat/getZpravy/vyřídit | Create |
| `src/hooks/useZavodChat.ts` | realtime subscription na zpravy | Create |
| `src/components/zavod/ChatPanel.tsx` | chat UI + 🔔 přivolání | Create |
| `src/app/zavod/[zavodId]/page.tsx` | vložit `<ChatPanel>` | Modify |
| `src/components/zavod/PrivolaniPanel.tsx` | zvoneček + seznam nevyřízených (admin) | Create |
| `src/app/zavod/[zavodId]/admin/page.tsx` | vložit `<PrivolaniPanel>` | Modify |

---

## Task 1: Migrace 022 — tabulka zpravy + RLS + realtime

**Files:** Create `supabase/migrations/022_zpravy.sql`, `supabase/migrations/022_rollback.sql`

- [ ] **Step 1: Migrace**

```sql
-- 022_zpravy.sql — Fáze 3c: chat + přivolání. Pustit ručně.
CREATE TABLE IF NOT EXISTS zpravy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  autor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  typ TEXT NOT NULL DEFAULT 'chat' CHECK (typ IN ('chat','privolani')),
  text TEXT,
  peg_cislo INT,
  vyrizeno BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zpravy_zavod ON zpravy(zavod_id, created_at);

ALTER TABLE zpravy ENABLE ROW LEVEL SECURITY;
-- Čtení: přihlášení (chat závodu není citlivý; realtime přes anon klíč vyžaduje SELECT)
CREATE POLICY "Zpravy viewable by authenticated" ON zpravy FOR SELECT TO authenticated USING (true);
-- Vložení: jen sám za sebe (autor)
CREATE POLICY "User can insert own zprava" ON zpravy
  FOR INSERT TO authenticated WITH CHECK (autor_user_id = auth.uid());
-- UPDATE (vyrizeno) jen přes service role (rozhodčí action) — žádná klientská UPDATE policy.

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE zpravy;
```

- [ ] **Step 2: Rollback**

```sql
-- 022_rollback.sql
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS zpravy;
DROP TABLE IF EXISTS zpravy;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/022_zpravy.sql supabase/migrations/022_rollback.sql
git commit -m "feat(zpravy): migrace 022 — tabulka zpravy + RLS + realtime publikace"
```

---

## Task 2: Typ `Zprava`

**Files:** Modify `src/lib/types.ts`

- [ ] **Step 1:** Přidej k doménovým typům:
```typescript
export interface Zprava {
  id: string;
  zavod_id: string;
  autor_user_id: string;
  typ: 'chat' | 'privolani';
  text: string | null;
  peg_cislo: number | null;
  vyrizeno: boolean;
  created_at: string;
  autor_jmeno?: string;  // doplněné z joinu profiles
}
```

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/lib/types.ts
git commit -m "feat(zpravy): typ Zprava"
```

---

## Task 3: Server actions

**Files:** Create `src/actions/zpravy.actions.ts`

- [ ] **Step 1: Soubor**

```typescript
'use server'
// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { isSystemAdmin } from '@/lib/constants'
import type { ActionResult, Zprava } from '@/lib/types'

async function checkZavodAdminAccess(zavodId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSystemAdmin(user.id)) return user.id
  const { data: isSys } = await (supabase as any).rpc('is_system_admin', { p_user_id: user.id })
  if (isSys === true) return user.id
  const { data: roles } = await supabase.from('zavod_role').select('role')
    .eq('zavod_id', zavodId).eq('user_id', user.id).in('role', ['poradatel', 'hlavni_admin', 'rozhodci'])
  return (roles && roles.length > 0) ? user.id : null
}

/** Odeslat chatovou zprávu do závodu. */
export async function odeslatZpravu(input: { zavodId: string; text: string }): Promise<ActionResult<{ zpravaId: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    if (!input.text?.trim()) return { success: false, error: { code: ErrorCodes.INVALID_INPUT, message: 'Prázdná zpráva' } }
    const adminClient = createAdminClient()
    const { data, error } = await (adminClient.from('zpravy') as any).insert({
      zavod_id: input.zavodId, autor_user_id: user.id, typ: 'chat', text: input.text.trim(),
    }).select('id').single()
    if (error) return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } }
    return { success: true, data: { zpravaId: data.id } }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Přivolat rozhodčího — vloží zprávu typu privolani s pegem uživatele. */
export async function privolatRozhodciho(zavodId: string): Promise<ActionResult<{ zpravaId: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    // peg uživatele v závodě (přes clenove_tymu + tymy)
    const { data: teams } = await adminClient.from('tymy').select('id, peg_cislo').eq('zavod_id', zavodId)
    const teamIds = (teams ?? []).map((t: any) => t.id)
    let peg: number | null = null
    if (teamIds.length > 0) {
      const { data: membership } = await adminClient.from('clenove_tymu').select('tym_id').eq('user_id', user.id).in('tym_id', teamIds).maybeSingle()
      if (membership) peg = (teams as any[]).find(t => t.id === (membership as any).tym_id)?.peg_cislo ?? null
    }
    const { data, error } = await (adminClient.from('zpravy') as any).insert({
      zavod_id: zavodId, autor_user_id: user.id, typ: 'privolani', peg_cislo: peg, vyrizeno: false,
    }).select('id').single()
    if (error) return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } }
    return { success: true, data: { zpravaId: data.id } }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Načíst zprávy závodu (s jménem autora). */
export async function getZpravy(zavodId: string): Promise<ActionResult<Zprava[]>> {
  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient.from('zpravy')
      .select('*, autor:profiles!zpravy_autor_user_id_fkey(jmeno)')
      .eq('zavod_id', zavodId).order('created_at', { ascending: true }).limit(200)
    const zpravy = (data ?? []).map((z: any) => ({ ...z, autor_jmeno: z.autor?.jmeno ?? 'Neznámý' }))
    return { success: true, data: zpravy as Zprava[] }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Rozhodčí: vyřídit přivolání. */
export async function vyriditPrivolani(zpravaId: string): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient()
    const { data: z } = await adminClient.from('zpravy').select('zavod_id').eq('id', zpravaId).single()
    if (!z) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: ErrorMessages[ErrorCodes.NOT_FOUND] } }
    const userId = await checkZavodAdminAccess((z as any).zavod_id)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    await (adminClient.from('zpravy') as any).update({ vyrizeno: true }).eq('id', zpravaId)
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}
```
Ověř, že `ErrorCodes.NOT_FOUND` existuje (přidán ve Fázi 2). `zpravy_autor_user_id_fkey` je název FK (Postgres ho generuje jako `<table>_<column>_fkey`) — ověř/uprav dle skutečného názvu (nebo použij explicitní join).

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/actions/zpravy.actions.ts
git commit -m "feat(zpravy): server actions chat + přivolání + vyřízení"
```

---

## Task 4: Realtime hook `useZavodChat`

**Files:** Create `src/hooks/useZavodChat.ts`

- [ ] **Step 1:** Vzor: `src/hooks/useRealtimeUlovky.ts`. Hook subscribuje `zpravy` (filtr `zavod_id`), drží pole zpráv, na INSERT přidá zprávu.

```typescript
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getZpravy } from '@/actions/zpravy.actions'
import type { Zprava } from '@/lib/types'

export function useZavodChat(zavodId: string) {
  const [zpravy, setZpravy] = useState<Zprava[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<RealtimeChannel | null>(null)

  const reload = useCallback(async () => {
    const r = await getZpravy(zavodId)
    if (r.success) setZpravy(r.data!)
  }, [zavodId])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!zavodId) return
    const supabase = supabaseRef.current
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`zpravy-${zavodId}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'zpravy', filter: `zavod_id=eq.${zavodId}` },
        () => { reload() })  // po INSERT reload (doplní jméno autora joinem)
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))
    channelRef.current = channel
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null } }
  }, [zavodId, reload])

  return { zpravy, isConnected, reload }
}
```

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/hooks/useZavodChat.ts
git commit -m "feat(zpravy): realtime hook useZavodChat"
```

---

## Task 5: ChatPanel + vložení do detailu závodu

**Files:** Create `src/components/zavod/ChatPanel.tsx`, Modify `src/app/zavod/[zavodId]/page.tsx`

- [ ] **Step 1: `ChatPanel.tsx`**

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useZavodChat } from '@/hooks/useZavodChat'
import { odeslatZpravu, privolatRozhodciho } from '@/actions/zpravy.actions'

export function ChatPanel({ zavodId, canPrivolat }: { zavodId: string; canPrivolat: boolean }) {
  const { toast } = useToast()
  const { zpravy } = useZavodChat(zavodId)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()

  const poslat = () => {
    if (!text.trim()) return
    startTransition(async () => {
      const r = await odeslatZpravu({ zavodId, text })
      if (!r.success) { toast({ title: 'Chyba', description: r.error?.message, variant: 'destructive' }); return }
      setText('')
    })
  }
  const privolat = () => {
    startTransition(async () => {
      const r = await privolatRozhodciho(zavodId)
      toast(r.success ? { title: '🔔 Rozhodčí přivolán' } : { title: 'Chyba', description: r.error?.message, variant: 'destructive' })
    })
  }

  return (
    // JSX: nadpis "Chat závodu"; tlačítko 🔔 "Přivolat rozhodčího" (jen když canPrivolat);
    // seznam zpráv (zpravy.map): pokud typ==='privolani' → zvýrazněná bublina "🔔 Peg {peg_cislo}"
    //   (+ ztlumená když vyrizeno), jinak "{autor_jmeno}: {text}" + čas;
    // dole input + tlačítko Odeslat (disabled při isPending).
    // Styl dle existujících GlassCard komponent.
  )
}
```
JSX doplň dle vzoru existujících komponent (`PotvrzeniList.tsx`/`GlassCard`). Přivolání renderuj zvýrazněně (barevná bublina s 🔔 a `peg_cislo`), vyřízené ztlumeně.

- [ ] **Step 2: Vložit do `src/app/zavod/[zavodId]/page.tsx`**

Import `ChatPanel`. Za sekci „Informace o závodě"/„Map and Rules" (kolem :457-467) přidej, jen pro přihlášené:
```tsx
{user && (
  <ChatPanel zavodId={zavodId} canPrivolat={userTeam !== null || userRole !== null} />
)}
```
(`canPrivolat` = uživatel je v závodě — má tým nebo roli. Pokud chceš povolit všem přihlášeným, dej `true`.)

- [ ] **Step 3: Build + commit**

Run: `npm run build`
```bash
git add src/components/zavod/ChatPanel.tsx "src/app/zavod/[zavodId]/page.tsx"
git commit -m "feat(zpravy): ChatPanel s přivoláním na detailu závodu"
```

---

## Task 6: Zvoneček na admin dashboardu

**Files:** Create `src/components/zavod/PrivolaniPanel.tsx`, Modify `src/app/zavod/[zavodId]/admin/page.tsx`

- [ ] **Step 1: `PrivolaniPanel.tsx`** — realtime subscription na `zpravy` (typ privolani), pípnutí + seznam nevyřízených + Vyřídit.

```typescript
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getZpravy, vyriditPrivolani } from '@/actions/zpravy.actions'
import type { Zprava } from '@/lib/types'

export function PrivolaniPanel({ zavodId }: { zavodId: string }) {
  const { toast } = useToast()
  const [privolani, setPrivolani] = useState<Zprava[]>([])
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<RealtimeChannel | null>(null)

  const reload = useCallback(async () => {
    const r = await getZpravy(zavodId)
    if (r.success) setPrivolani(r.data!.filter(z => z.typ === 'privolani' && !z.vyrizeno))
  }, [zavodId])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    const supabase = supabaseRef.current
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`privolani-${zavodId}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'zpravy', filter: `zavod_id=eq.${zavodId}` },
        (payload: any) => {
          if (payload.new?.typ === 'privolani') {
            toast({ title: '🔔 Přivolání rozhodčího', description: `Peg ${payload.new.peg_cislo ?? '?'}` })
            try { const a = new AudioContext(); const o = a.createOscillator(); o.frequency.value = 880; o.connect(a.destination); o.start(); o.stop(a.currentTime + 0.2) } catch {}
            reload()
          }
        })
      .subscribe()
    channelRef.current = channel
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null } }
  }, [zavodId, reload, toast])

  const vyridit = async (id: string) => {
    const r = await vyriditPrivolani(id)
    if (r.success) reload()
    else toast({ title: 'Chyba', description: r.error?.message, variant: 'destructive' })
  }

  if (privolani.length === 0) return null
  return (
    // JSX: GlassCard "🔔 Přivolání rozhodčího" se seznamem: "Peg {peg_cislo}" + tlačítko "Vyřídit" (vyridit(z.id)).
    // Zvýrazněné (destructive/warning). Styl dle admin/page.tsx GlassCard.
  )
}
```
JSX doplň dle vzoru `admin/page.tsx` GlassCard sekcí.

- [ ] **Step 2: Vložit do `src/app/zavod/[zavodId]/admin/page.tsx`**

Import `PrivolaniPanel`. Mezi Stats Cards a „Úlovky čekající na potvrzení" (kolem :304-307) přidej `<PrivolaniPanel zavodId={zavodId} />`.

- [ ] **Step 3: Build + commit**

Run: `npm run build`
```bash
git add src/components/zavod/PrivolaniPanel.tsx "src/app/zavod/[zavodId]/admin/page.tsx"
git commit -m "feat(zpravy): zvoneček přivolání na dashboardu rozhodčího"
```

---

## Task 7: CHECKPOINT — build/test + review + push

**Files:** žádné (verifikace)

- [ ] **Step 1:** `npm run build && npm test` — vše zelené.
- [ ] **Step 2:** Finální review (controller dispatchne review na `git diff main..HEAD`: RLS zpravy default-deny-ish pattern, autor_user_id z auth ne z inputu, vyřízení jen rozhodčí scope, peg auto z membership, realtime subscription cleanup, žádné PII v zprávách/joinu).
- [ ] **Step 3:** `git push -u origin feat/faze-3c-zpravy`. Migraci 022 pustí Dušan po deployi.

---

## Task 8: E2E + regrese + merge

**Files:** žádné (verifikace)

- [ ] **Step 1: E2E skript (service role)** — po migraci 022: test závod + tým (peg 7) + user. `privolatRozhodciho` (simuluj insert přes action logiku / přímý insert s peg) → ověř zprávu typ=privolani, peg=7, vyrizeno=false. `vyriditPrivolani` → vyrizeno=true. `odeslatZpravu` → typ=chat. `getZpravy` vrátí obojí s autor_jmeno. Cleanup (smazat závod CASCADE).
- [ ] **Step 2: RLS probe (vzor Fáze 2):** anon nemůže INSERT do zpravy; authenticated by vložil jen vlastní (autor=uid) — ověř, že anon INSERT selže.
- [ ] **Step 3: Realtime** — ověří Dušan v UI (dvě okna: rybář přivolá → rozhodčímu pípne; chat zpráva se objeví naživo).
- [ ] **Step 4: Regrese:** detail závodu se renderuje s chatem; admin dashboard s přivoláním; build+test zelené.
- [ ] **Step 5: Merge + paměť**

```bash
git checkout main && git merge --ff-only feat/faze-3c-zpravy && git push origin main
```
Aktualizovat `~/.claude/.../memory/carp_club_app.md` — Fáze 3c nasazena.

---

## Self-Review

**Spec coverage:** §3 model+migrace+RLS+realtime → T1; §4 chat → T3(actions)+T4(hook)+T5(UI); §5 přivolání → T3+T5; §6 zvoneček → T6; typ → T2; §8 testy → T8. **Pokryto.**

**Placeholder scan:** Migrace, actions, hooky doslova. ChatPanel/PrivolaniPanel mají doslovné handlery + realtime + datový tok; JSX odkazuje na konkrétní vzor (GlassCard/PotvrzeniList) — ne „TODO".

**Type consistency:** `Zprava` (typ/text/peg_cislo/vyrizeno/autor_jmeno), `odeslatZpravu({zavodId,text})`, `privolatRozhodciho(zavodId)`, `getZpravy(zavodId)→Zprava[]`, `vyriditPrivolani(zpravaId)`, `useZavodChat(zavodId)→{zpravy,isConnected,reload}` konzistentní napříč T2–T6.

**Předpoklady k ověření:** FK název `zpravy_autor_user_id_fkey` (T3 join — ověřit/upravit); `ALTER PUBLICATION supabase_realtime` že existuje (default ano); `userTeam`/`userRole` dostupné v page.tsx (potvrzeno průzkumem); AudioContext autoplay (try/catch fallback).
