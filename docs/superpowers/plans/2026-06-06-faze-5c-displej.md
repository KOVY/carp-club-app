# Fáze 5c — Dashboard na velký displej: Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Postavit fullscreen dashboard `/displej/[zavodId]` pro velký displej u jezera — živé pořadí, největší ryba, přivolání rozhodčího, odpočet — s auto-refresh pollingem a vizuálem Hluboká voda.

**Architecture:** Nová route MIMO `/zavod/[zavodId]/` (kvůli čisté ploše bez appkové navigace), výjimka v RootLayoutClient. Klientská stránka pollinguje existující read server actions (`getLeaderboard`, `getNejvetsiRyby`, `getZpravy`) každých ~15 s + tikající odpočet 1 s. Znovupoužití komponent z 5a (LeaderboardTable s glow, CompactBiggestFish). Čistě čtení, žádná migrace.

**Tech Stack:** Next.js 15 (App Router, client component), React 19, TailwindCSS, existující server actions + komponenty.

**Pořadí:** TS přes GitHub→Vercel. Push na main (Dušan/Tomáš ověří na produkci). Žádné screenshoty, žádná DB migrace.

---

## File Structure

| Soubor | Odpovědnost | Akce |
|--------|-------------|------|
| `src/components/layout/RootLayoutClient.tsx` | výjimka `/displej` → čistá plocha | Modify |
| `src/app/displej/[zavodId]/page.tsx` | dashboard: data polling, odpočet, fullscreen, skládá sekce | Create |
| `src/components/zavod/DisplejPrivolani.tsx` | read-only panel nevyřízených přivolání (best-effort) | Create |

Znovupoužití: `getLeaderboard`/`getNejvetsiRyby` (`@/actions/leaderboard.actions`), `getZpravy` (`@/actions/zpravy.actions`), `LeaderboardTable`/`CompactLeaderboard` + `CompactBiggestFish` (`@/components/zavod`), `StatusBadge`, `GlassCard`, `ThemeSwitcher`, `createClient` (`@/lib/supabase/client`).

---

## Task 1: Route + čistá plocha + datová kostra (polling + odpočet)

**Files:** Modify `src/components/layout/RootLayoutClient.tsx`, Create `src/app/displej/[zavodId]/page.tsx`

Cíl: funkční kostra — displej se otevře na čisté ploše, načte data, pollinguje, tiká odpočet. Vizuál hrubý (doladí Task 2).

- [ ] **Step 1: Výjimka v RootLayoutClient**

V `src/components/layout/RootLayoutClient.tsx` přidej k existujícím flagům (kolem :17-20) `isDisplejPage` a zahrň ho do early-return podmínky (kolem :23):
```tsx
  const isAdminPage = pathname?.startsWith('/admin')
  const isZavodPage = pathname?.startsWith('/zavod/')
  const isPozvankaPage = pathname?.startsWith('/pozvanka/')
  const isDisplejPage = pathname?.startsWith('/displej')
  const isLandingPage = pathname === '/'

  // Admin, Zavod, Pozvanka a Displej mají vlastní/čistý layout
  if (isAdminPage || isZavodPage || isPozvankaPage || isDisplejPage) {
    return <>{children}</>
  }
```

- [ ] **Step 2: Dashboard stránka — kostra s daty**

Create `src/app/displej/[zavodId]/page.tsx`. Vychází ze vzoru `src/app/zavod/[zavodId]/verejnost/page.tsx` (fetch zavod přes supabase client, `getLeaderboard`, `getNejvetsiRyby`), ale s pollingem a odpočtem:
```tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { Trophy, Fish, MapPin, Maximize, Minimize } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { CompactLeaderboard, CompactBiggestFish } from "@/components/zavod"
import { createClient } from "@/lib/supabase/client"
import { getLeaderboard, getNejvetsiRyby } from "@/actions/leaderboard.actions"
import type { Zavod, LeaderboardEntry, UlovekWithRelations } from "@/lib/types"

const REFRESH_MS = 15000

export default function DisplejPage() {
  const params = useParams()
  const zavodId = params.zavodId as string

  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [biggestFish, setBiggestFish] = useState<UlovekWithRelations | null>(null)
  const [embargoActive, setEmbargoActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: zavodData, error: zavodError } = await supabase
        .from("zavody").select("*").eq("id", zavodId).single()
      if (zavodError || !zavodData) {
        setError("Závod nebyl nalezen")
        return
      }
      setZavod(zavodData as Zavod)

      const lb = await getLeaderboard(zavodId)
      if (lb.success && lb.data) {
        setLeaderboard(lb.data.leaderboard)
        setEmbargoActive(lb.data.embargoActive)
      }
      const bf = await getNejvetsiRyby(zavodId, 1)
      if (bf.success && bf.data) setBiggestFish(bf.data.ryby[0] || null)
      setError(null)
    } catch (err) {
      console.error("Displej fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [zavodId])

  // Initial + polling
  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchData])

  // Tikající hodiny pro odpočet
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Fullscreen stav
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  // Odpočet do konce závodu
  const odpocet = (() => {
    if (!zavod?.datum_end) return null
    const endMs = new Date(zavod.datum_end).getTime()
    const diff = endMs - now
    if (diff <= 0) return "Závod ukončen"
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    const s = Math.floor((diff % 60_000) / 1000)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  })()

  const getStavText = (stav?: string) =>
    stav === "probiha" ? "Probíhá" : stav === "priprava" ? "Příprava" : stav === "ukoncen" ? "Ukončen" : (stav ?? "")

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-2xl text-muted-foreground">
        Načítání…
      </div>
    )
  }
  if (error || !zavod) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-2xl text-destructive">
        {error || "Závod nebyl nalezen"}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 lg:p-10">
      {/* Hlavička */}
      <header className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold">{zavod.nazev}</h1>
          {zavod.misto && (
            <p className="text-muted-foreground flex items-center gap-2 mt-2 text-lg">
              <MapPin className="h-5 w-5" /> {zavod.misto}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            status={zavod.stav === "probiha" ? "confirmed" : zavod.stav === "priprava" ? "pending" : "embargo"}
            size="md"
          >
            {getStavText(zavod.stav)}
          </StatusBadge>
          {odpocet && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Do konce</p>
              <p className="text-2xl font-mono font-bold tabular-nums">{odpocet}</p>
            </div>
          )}
          <ThemeSwitcher />
          <Button variant="outline" size="icon" onClick={toggleFullscreen} aria-label="Celá obrazovka">
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {embargoActive && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-lg">
          Embargo aktivní — váhy jsou skryté
        </div>
      )}

      {/* Hlavní mřížka */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Trophy className="h-6 w-6 text-accent" /> Pořadí
          </h2>
          <CompactLeaderboard entries={leaderboard} embargoActive={embargoActive} limit={10} />
        </section>
        <aside className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
              <Fish className="h-6 w-6 text-accent" /> Největší ryba
            </h2>
            <CompactBiggestFish fish={biggestFish} embargoActive={embargoActive} />
          </div>
          {/* Sem přijde DisplejPrivolani v Task 3 */}
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build**

Run: `cd /home/kovy/carp-club-app && npm run build`
Expected: build projde, route `/displej/[zavodId]` se vygeneruje. Ověř, že `CompactLeaderboard`/`CompactBiggestFish` props sedí (entries/embargoActive/limit, resp. fish/embargoActive — viz `verejnost/page.tsx`). Pokud `Zavod` typ nemá `datum_end`/`misto`/`stav`, uprav přístupy dle skutečného typu.

- [ ] **Step 4: Commit**

```bash
cd /home/kovy/carp-club-app && git add src/components/layout/RootLayoutClient.tsx "src/app/displej/[zavodId]/page.tsx" && git commit -m "feat(displej): route /displej/[zavodId] + data polling + odpočet + fullscreen"
```

---

## Task 2: Vizuál displeje — Hluboká voda, velké, wow

**Files:** Modify `src/app/displej/[zavodId]/page.tsx`

**Použij frontend-design skill.** Cíl: z kostry udělat parádní „rozhlasový panel" čitelný z dálky. Zachovej VŠECHNU logiku z Task 1 (polling, odpočet, fullscreen, fetch, props).

- [ ] **Step 1: Velké pořadí s wow** — leaderboard musí být čitelný z dálky a mít wow. Buď:
  - (a) nahraď `CompactLeaderboard` za `LeaderboardTable` (`entries`, `embargoActive`, `showWeights={!embargoActive}`, `prahKaret`) — má z 5a medaile glow, vedoucí `halo-card`/pulz, váha hrdina — a obal do wrapperu se zvětšením fontů (`text-lg`+), NEBO
  - (b) ponech `CompactLeaderboard` a zvětši přes wrapper.
  Cíl: top týmy velké, medaile zlatá zář, **vedoucí pulzuje** (`animate-leader-pulse`), váhy v `text-accent` velké. Drž čitelnost (žádný glow na číslech).
- [ ] **Step 2: Největší ryba velká** — `CompactBiggestFish` ve větším kontejneru (GlassCard/halo-card), váha jako hero (`text-4xl text-accent`), tým + peg. 
- [ ] **Step 3: Hlavička polish** — název velký, odpočet výrazný (akcentní když < 1 h?), stav badge, fullscreen + ThemeSwitcher. Vše tokeny.
- [ ] **Step 4: Hluboká voda** — wow zapnuto (glow/halo/pulz), pozadí může mít jemný `hero-gradient`-like nádech (volitelně). Den: kontrastní/čitelné; noc: halo/jemné. Tokeny, žádné nové hardcoded barvy (kromě medailových/stavových).

- [ ] **Step 5: Build + commit**

Run: `cd /home/kovy/carp-club-app && npm run build && npm test`
```bash
git add "src/app/displej/[zavodId]/page.tsx" && git commit -m "feat(displej): vizuál Hluboká voda — velké pořadí, medaile glow, vedoucí pulzuje"
```

---

## Task 3: Read-only přivolání rozhodčího (best-effort)

**Files:** Create `src/components/zavod/DisplejPrivolani.tsx`, Modify `src/app/displej/[zavodId]/page.tsx`

Cíl: na displeji ukázat nevyřízená přivolání. `getZpravy` vyžaduje přihlášení + účastníka (vrací UNAUTHORIZED/FORBIDDEN jinak) → panel je **best-effort**: zobrazí se jen když uspěje, jinak se tiše skryje.

- [ ] **Step 1: Komponenta `DisplejPrivolani`** — Create `src/components/zavod/DisplejPrivolani.tsx`:
```tsx
"use client"

import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Zprava } from "@/lib/types"

export function DisplejPrivolani({ privolani }: { privolani: Zprava[] }) {
  if (privolani.length === 0) return null
  return (
    <div>
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-accent">
        <Bell className="h-6 w-6 animate-leader-pulse" /> Přivolání rozhodčího
      </h2>
      <ul className="space-y-2">
        {privolani.map((z) => (
          <li
            key={z.id}
            className={cn(
              "rounded-xl border px-4 py-3 text-xl font-bold",
              "bg-accent/10 border-accent/40 text-accent"
            )}
          >
            🔔 Peg {z.peg_cislo ?? "?"} volá rozhodčího
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Zapojit do displeje (best-effort polling)** — v `src/app/displej/[zavodId]/page.tsx`:
  - Import: `import { getZpravy } from "@/actions/zpravy.actions"` a `import { DisplejPrivolani } from "@/components/zavod/DisplejPrivolani"` a typ `Zprava`.
  - Přidej stav: `const [privolani, setPrivolani] = useState<Zprava[]>([])`.
  - V `fetchData` na konec (do `try`) přidej best-effort načtení (selhání NESMÍ shodit zbytek):
    ```tsx
    try {
      const zp = await getZpravy(zavodId)
      if (zp.success && zp.data) {
        setPrivolani(zp.data.filter((z) => z.typ === "privolani" && !z.vyrizeno))
      } else {
        setPrivolani([])
      }
    } catch {
      setPrivolani([])
    }
    ```
  - V `aside` (kde je komentář `{/* Sem přijde DisplejPrivolani */}`) vlož `<DisplejPrivolani privolani={privolani} />`.

- [ ] **Step 3: Build + commit**

Run: `cd /home/kovy/carp-club-app && npm run build`
```bash
git add src/components/zavod/DisplejPrivolani.tsx "src/app/displej/[zavodId]/page.tsx" && git commit -m "feat(displej): read-only panel přivolání rozhodčího (best-effort)"
```

---

## Task 4: CHECKPOINT — build/test + review + push na main

**Files:** žádné (verifikace)

- [ ] **Step 1:** `cd /home/kovy/carp-club-app && npm run build && npm test` — vše zelené (logika nezměněna, 157 testů).
- [ ] **Step 2:** Finální review (controller dispatchne review na `git diff main..HEAD`): čistá plocha (RootLayoutClient výjimka), polling + cleanup intervalů (žádný leak), odpočet (ukončený závod → „Závod ukončen"), embargo respektováno (váhy skryté), přivolání best-effort (selhání getZpravy nerozbije displej), čistě čtení (žádný zápis/migrace), tokeny/čitelnost den/noc.
- [ ] **Step 3:** Merge + push na main:
```bash
cd /home/kovy/carp-club-app && git checkout main && git merge --ff-only feat/faze-5c-displej && git push origin main
```
- [ ] **Step 4:** Smoke produkce po deployi: `/displej/<id>` vrací 200 (vezmi reálné zavodId, nebo ověř že route existuje — neexistující závod = „Závod nebyl nalezen", ale HTTP 200). Aktualizovat paměť — Fáze 5c nasazena.

---

## Self-Review

**Spec coverage:** §3.1 route+čistá plocha → T1; §3.2 sekce (hlavička/pořadí/ryba/přivolání) → T1 kostra + T2 vizuál + T3 přivolání; §3.3 polling+odpočet → T1; §3.4 vizuál Hluboká voda → T2; §5 bezpečnost (čtení, best-effort přivolání) → T3 + T4 review. **Pokryto.**

**Placeholder scan:** T1/T3 mají plný kód. T2 (vizuál) má konkrétní cíle + frontend-design (iterace záměrná, jako 5a/5b). Žádné „TODO".

**Type consistency:** `getLeaderboard` → `{ leaderboard, embargoActive }`; `getNejvetsiRyby(id, limit)` → `{ ryby, embargoActive }`; `getZpravy` → `Zprava[]` (gated). `CompactLeaderboard` props (`entries`/`embargoActive`/`limit`) a `CompactBiggestFish` (`fish`/`embargoActive`) dle `verejnost/page.tsx`. `DisplejPrivolani` prop `privolani: Zprava[]`. `Zprava` má `typ`/`peg_cislo`/`vyrizeno`/`id`. `animate-leader-pulse` z 5a.

**Předpoklady k ověření:** `Zavod` typ má `datum_end`/`misto`/`stav`/`nazev` (ověřit v T1, jinak upravit); `StatusBadge` status hodnoty `confirmed`/`pending`/`embargo` (dle verejnost vzoru); `CompactLeaderboard`/`CompactBiggestFish` exportované z `@/components/zavod`.
