# Fáze 5b — Veřejná tvář (landing, navigační obal, demo náznaky): Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sjednotit veřejnou tvář Carp Clubu do jazyka „Hluboká voda" — tekuté sklo + halo menu, doladěná patička, slide-in hamburger, polished landing a náznak chatu/zvonečku v demu — bez zásahu do logiky/dat.

**Architecture:** Nejprve sdílené CSS efekty (téma-adaptivní přes tokeny z 5a: `--halo`, `--surface-glass`) jako reusable základ, pak jejich aplikace na navigační shell → landing → demo. Den = pevné/čitelné na slunci (efekty tlumené), noc = sklo + halo glow. Vše vizuální/UI, žádný zásah do actions/DB/auth.

**Tech Stack:** Next.js 15, React 19, TailwindCSS, CSS custom properties, frontend-design skill pro polished UI.

**Pořadí:** TS přes GitHub→Vercel. Push na main (Dušan ověří na produkci). Žádné screenshoty, žádná DB migrace.

---

## File Structure

| Soubor | Odpovědnost | Akce |
|--------|-------------|------|
| `src/app/globals.css` | sdílené efekty (glass-bar, glass-panel, nav-active, float) + oprava hero gradientu | Modify |
| `src/components/layout/Header.tsx` | sklo+halo lišta, scroll efekt, aktivní položka, plovoucí logo | Modify |
| `src/components/layout/MobileHeader.tsx` | stejný sklo+halo jazyk (landing mobil) | Modify |
| `src/components/layout/Footer.tsx` | desktop patička polish (halo lem) | Modify |
| `src/components/layout/RootLayoutClient.tsx` | mobilní tenký copyright nad spodní lištou | Modify |
| `src/components/layout/MobileMenu.tsx` | slide-in sklo panel (hamburger) | Modify |
| `src/components/landing/HeroSection.tsx` | halo za nadpisem, plovoucí ryby, čitelnost | Modify |
| `src/components/landing/*` + `src/app/page.tsx` | polish sekcí přes tokeny, halo akcenty | Modify |
| `src/lib/demo-data.ts` | `demoChat` mock data | Modify |
| `src/components/zavod/DemoChatPanel.tsx` | mock chat + živý náznak (zpráva + zvoneček) | Create |
| `src/app/zavod/demo/chat/page.tsx` | demo podstránka Chat | Create |
| `src/app/zavod/demo/layout.tsx` | položka „Chat" v navigaci | Modify |
| `src/app/zavod/demo/page.tsx` | teaser chatu na úvodu dema | Modify |

---

## Task 1: Sdílené efekty + oprava hero gradientu

**Files:** Modify `src/app/globals.css`

Cíl: vrstva 1 — reusable téma-adaptivní efekty. Den: pevné/bez záře (čitelnost na slunci, `--halo: transparent`, `--surface-glass: #ffffff`). Noc: sklo + halo. Plus oprava hero gradientu, který má natvrdo tmavé barvy (v noci mizí na tmavém pozadí).

- [ ] **Step 1: Oprava hero gradientu na tokeny**

V `src/app/globals.css` nahraď `.hero-gradient` (kolem :534-541) a `.hero-gradient-animated` (kolem :543-553). Aktuálně mají hardcoded `hsl(210 52% 24%)` a `hsl(174 62% 32%)`. Nahraď za téma-adaptivní tokeny:
```css
  .hero-gradient {
    background: linear-gradient(
      135deg,
      hsl(var(--background)) 0%,
      hsl(var(--primary) / 0.14) 50%,
      hsl(var(--accent) / 0.10) 100%
    );
  }

  .hero-gradient-animated {
    background: linear-gradient(
      135deg,
      hsl(var(--background)) 0%,
      hsl(var(--primary) / 0.12) 30%,
      hsl(var(--accent) / 0.08) 60%,
      hsl(var(--background)) 100%
    );
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
```
Důvod: `--primary`/`--accent` jsou v obou tématech viditelné na svém pozadí (den: tmavá modrá/oranžová na světlém; noc: tyrkys/oranžová na tmavém). Nízká alfa = jemný nádech, ne křiklavé.

- [ ] **Step 2: Přidat sdílené efektové utility**

Do `src/app/globals.css`, do existujícího `@layer components` bloku landing sekce (hned za `.page-gradient`, kolem :561), přidej:
```css
  /* Fáze 5b — tekuté sklo lišty (header) */
  .glass-bar {
    background: var(--surface-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid hsl(var(--border) / 0.6);
    transition: box-shadow 0.25s ease, background 0.25s ease;
  }
  /* při scrollu: v noci tyrkysový halo lem, ve dne (--halo transparent) jen jemný stín */
  .glass-bar-scrolled {
    box-shadow: 0 4px 24px var(--halo), 0 6px 16px -8px rgba(0, 0, 0, 0.18);
  }

  /* Fáze 5b — slide-in sklo panel (hamburger menu) */
  .glass-panel {
    background: var(--surface-glass);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-left: 1px solid hsl(var(--primary) / 0.4);
    box-shadow: -8px 0 32px var(--halo), -8px 0 24px -12px rgba(0, 0, 0, 0.3);
  }

  /* Fáze 5b — svítící tečka aktivní nav položky (akcent, ve dne plná barva) */
  .nav-active-dot {
    position: relative;
  }
  .nav-active-dot::after {
    content: "";
    position: absolute;
    bottom: 1px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 9999px;
    background: hsl(var(--primary));
    box-shadow: 0 0 8px hsl(var(--primary) / 0.8);
  }
```
Pozn.: `.animate-float-slow` + `@keyframes float-slow` UŽ existují (kolem :617-630) s `prefers-reduced-motion` vypnutím — pro plovoucí ryby je využijeme, neduplikuj.

- [ ] **Step 3: Build**

Run: `cd /home/kovy/carp-club-app && npm run build`
Expected: build projde.

- [ ] **Step 4: Commit**

```bash
cd /home/kovy/carp-club-app && git add src/app/globals.css && git commit -m "feat(design): 5b sdílené efekty (glass-bar/panel, nav-dot) + oprava hero gradientu na tokeny"
```

---

## Task 2: Horní menu — tekuté sklo + halo

**Files:** Modify `src/components/layout/Header.tsx`, `src/components/layout/MobileHeader.tsx`

**Použij frontend-design skill.** Cíl: lišta z tekutého skla, při scrollu se rozsvítí halo lem; aktivní položka svítí; logo ryba lehce pluje. Den: pevné/čitelné (tokeny zajistí). Zachovej VŠECHNU logiku (`isScrolled`, `floating`, `isActive`, user menu, `MobileMenu` props, role).

- [ ] **Step 1: Header lišta na sklo+halo** (`Header.tsx`, `<header>` className kolem :95-104)
  - Nahraď stávající `bg-background/95 backdrop-blur...` třídy za `.glass-bar` + podmíněně `.glass-bar-scrolled` když `isScrolled`. Zachovej `sticky z-50 w-full transition-all`, `floating` větev (`top-4 mx-4 rounded-2xl border shadow-lg`) i `top-0 border-b`.
  - Příklad: `className={cn("sticky z-50 w-full transition-all duration-200 glass-bar", isScrolled && "glass-bar-scrolled", floating ? "top-4 mx-4 rounded-2xl border" : "top-0")}`.

- [ ] **Step 2: Aktivní nav položka svítí** (desktop nav kolem :120-135)
  - Aktivní položka (`isActive(item)`) dostane `nav-active-dot` (svítící tečka) navíc k `text-primary bg-primary/10`. Neaktivní beze změny.

- [ ] **Step 3: Plovoucí logo ryba** (logo `<Fish>` kolem :113)
  - Přidej `animate-float-slow` na ikonu `<Fish>` (jemné plování; respektuje reduced-motion automaticky). Volitelně menší amplituda — pokud `float-slow` působí příliš, obal do `<span className="animate-float-slow inline-block">`.

- [ ] **Step 4: MobileHeader stejný jazyk** (`MobileHeader.tsx`)
  - MobileHeader má vlastní `isScrolled` (scroll efekt). Aplikuj stejně: `.glass-bar` + `.glass-bar-scrolled` na jeho `<header>`/wrapper. Zachovej logiku (logo, ThemeSwitcher, hamburger).

- [ ] **Step 5: Den/noc + build + commit**
  - Ověř logikou, že v outdoor (den) `--surface-glass: #ffffff` → lišta pevná bílá, `--halo: transparent` → scrolled bez záře (čitelnost na slunci). Žádné nové hardcoded barvy — vše tokeny.

Run: `cd /home/kovy/carp-club-app && npm run build && npm test`
```bash
git add src/components/layout/Header.tsx src/components/layout/MobileHeader.tsx && git commit -m "feat(design): horní menu — tekuté sklo + halo lem + plovoucí logo"
```

---

## Task 3: Patička — desktop polish + mobilní copyright

**Files:** Modify `src/components/layout/Footer.tsx`, `src/components/layout/RootLayoutClient.tsx`

- [ ] **Step 1: Desktop patička polish** (`Footer.tsx`)
  - Přidej jemný horní halo lem: na `<footer>` (kolem :13) přidej třídu pro horní lem — `border-t` zachovej, přidej `style` nebo utility pro tyrkysový gradient lem. Konkrétně: obal obsah do wrapperu s horním pseudo-lemem, nebo přidej na `<footer>`:
    ```tsx
    <footer className={cn("relative border-t bg-muted/50", className)}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    ```
  - Barvy nadpisů sloupců nech přes tokeny (`text-foreground`/`text-muted-foreground`), `text-primary` u loga. Zachovej obsah (4 sloupce, odkazy, kontakt, copyright).

- [ ] **Step 2: Mobilní tenký copyright** (`RootLayoutClient.tsx`)
  - Dnes je `<Footer className="hidden md:block" />` (kolem :52). Pod něj (před `<GlobalBottomNavigation />`) přidej mobilní-only tenký copyright:
    ```tsx
    <div className="md:hidden text-center text-xs text-muted-foreground py-4 border-t">
      © {new Date().getFullYear()} Carp Club ČR
    </div>
    ```
  - Pozn.: `<main>` má `pb-16 md:pb-0`, takže copyright se vykreslí nad fixed spodní lištou (na stránkách, kde lišta je). Na landing (spodní lišta skrytá) bude copyright na konci stránky — to je OK.

- [ ] **Step 3: Build + commit**

Run: `cd /home/kovy/carp-club-app && npm run build`
```bash
git add src/components/layout/Footer.tsx src/components/layout/RootLayoutClient.tsx && git commit -m "feat(design): patička — desktop halo lem + mobilní copyright"
```

---

## Task 4: Hamburger — slide-in sklo panel

**Files:** Modify `src/components/layout/MobileMenu.tsx`

**Použij frontend-design skill.** Cíl: slide-in panel z pravé v tekutém skle + halo lem, velké položky s ikonami, nahoře profil, dole přepínač dne/noci + odhlásit. Zachovej VŠECHNY props (`open`, `onClose`, `user`, `onSignOut`), položky a role-aware logiku.

- [ ] **Step 1: Panel na sklo** — kontejner panelu (slide-in `<div>`) dostane `.glass-panel` místo plného `bg-background`. Zachovej slide-in animaci (`translate-x-full` → `translate-x-0`) a overlay.
- [ ] **Step 2: Velké položky + ikony** — nav položky větší (touch-friendly, `text-base`/`py-3`), s ikonami, aktivní položka `text-primary`. Nahoře sekce profilu (avatar/jméno nebo „Přihlásit se"). Dole `<ThemeSwitcher />` (pokud tam není) + odhlásit (`onSignOut`).
- [ ] **Step 3: Den/noc + build** — outdoor: `.glass-panel` = pevná bílá (`--surface-glass: #ffffff`), bez halo; noc: sklo + tyrkysová záře. Tokeny, žádné hardcoded.

Run: `cd /home/kovy/carp-club-app && npm run build && npm test`
```bash
git add src/components/layout/MobileMenu.tsx && git commit -m "feat(design): hamburger — slide-in sklo panel + halo"
```

---

## Task 5: Landing hero — Hluboká voda

**Files:** Modify `src/components/landing/HeroSection.tsx`

**Použij frontend-design skill.** Cíl: hero do Hluboké vody (evoluce, ne přestavba). Hero už používá `.hero-gradient-animated` (opravený v Task 1), parallax, `animate-float-slow`, gradient text. Zachovej obsah (claim, CTA desktop/mobil, stats, badge).

- [ ] **Step 1: Halo za nadpisem** — za hlavní `<h1>` přidej jemný radial halo (např. absolutně pozicovaný `<div>` s `bg-[radial-gradient(...)]` přes `hsl(var(--primary)/...)` nebo využij `shadow-halo` z 5a na obalu). Ve dne `--halo` transparent → bez efektu (čitelnost). Číslo/claim musí zůstat ostře čitelný.
- [ ] **Step 2: Plovoucí ryby** — dekorativní ikony ryb (Fish) s `animate-float-slow` (různé delay/pozice), jemně, za obsahem (nízká opacita), respektuje reduced-motion.
- [ ] **Step 3: Čitelnost den/noc** — gradient text `from-foreground ... to-primary` ověř v obou tématech; CTA tlačítka přes tokeny (`bg-accent`/`text-accent-foreground` primární, `outline` sekundární). Žádné nové hardcoded barvy.

Run: `cd /home/kovy/carp-club-app && npm run build`
```bash
git add src/components/landing/HeroSection.tsx && git commit -m "feat(design): landing hero — halo + plovoucí ryby (Hluboká voda)"
```

---

## Task 6: Landing ostatní sekce — polish

**Files:** Modify `src/components/landing/FeaturesSection.tsx`, `SocialProofSection.tsx`, `DemoPreviewSection.tsx`, `HowItWorksSection.tsx`, `OrganizersSection.tsx`, `FAQSection.tsx`, `src/app/page.tsx`

**Použij frontend-design skill.** Cíl: sjednotit 8 sekcí + ZavodCard do Hluboké vody. Polish přes tokeny + jemné halo akcenty, NE přestavba. Zachovej VŠECHEN obsah, data (`getZavody()`), props, accordion logiku.

- [ ] **Step 1: Karty halo akcent** — GlassCard sekce (Features, SocialProof testimonials, Organizers, DemoPreview) dostanou jemný halo/hover (`hover:shadow-halo` z 5a nebo `.halo-card`); ve dne tlumené. Drž obsah.
- [ ] **Step 2: Oprava hardcoded barvy** — v `DemoPreviewSection.tsx` nahraď hardcoded `amber-500/20` (top-3 styling, kolem :102-110) za tokeny/medailové barvy konzistentní s leaderboardem (yellow/gray/amber jako v 5a). 
- [ ] **Step 3: ZavodCard kontrast** (`src/app/page.tsx`) — ZavodCard a sekce wrappery přes tokeny (`bg-card border-border`), status badge ověř kontrast den/noc. Footer CTA sekce (kolem :204-226) přes tokeny.
- [ ] **Step 4: Konzistence** — všechny sekce čtou tokeny; žádný tmavý-na-tmavém/světlý-na-světlém v žádném tématu.

Run: `cd /home/kovy/carp-club-app && npm run build`
```bash
git add src/components/landing src/app/page.tsx && git commit -m "feat(design): landing sekce — sjednocení do Hluboké vody + oprava hardcoded barev"
```

---

## Task 7: Demo chat — data + DemoChatPanel (živý náznak)

**Files:** Modify `src/lib/demo-data.ts`, Create `src/components/zavod/DemoChatPanel.tsx`

- [ ] **Step 1: Mock data `demoChat`** v `src/lib/demo-data.ts` (přidej na konec souboru):
```ts
import type { Zprava } from "@/lib/types"

/** Mock chat zprávy pro demo (živý náznak chatu + přivolání rozhodčího) */
export const demoChat: Zprava[] = [
  {
    id: "demo-chat-1",
    zavod_id: DEMO_ZAVOD_ID,
    autor_user_id: "demo-user-1",
    typ: "chat",
    text: "Ahoj lidi, startujeme závod! 🎣",
    peg_cislo: null,
    vyrizeno: false,
    created_at: "2024-06-15T06:15:00Z",
    autor_jmeno: "Jan Novák",
  },
  {
    id: "demo-chat-2",
    zavod_id: DEMO_ZAVOD_ID,
    autor_user_id: "demo-user-3",
    typ: "privolani",
    text: null,
    peg_cislo: 3,
    vyrizeno: false,
    created_at: "2024-06-15T09:45:00Z",
    autor_jmeno: "Petr Svoboda",
  },
  {
    id: "demo-chat-3",
    zavod_id: DEMO_ZAVOD_ID,
    autor_user_id: "demo-user-2",
    typ: "chat",
    text: "Máme rybu, krásný kapr 8,4 kg! 💪",
    peg_cislo: null,
    vyrizeno: false,
    created_at: "2024-06-15T10:05:00Z",
    autor_jmeno: "Tomáš Dvořák",
  },
]

/** Zpráva, která „přiteče" v živém náznaku po pár vteřinách */
export const demoChatIncoming: Zprava = {
  id: "demo-chat-live",
  zavod_id: DEMO_ZAVOD_ID,
  autor_user_id: "demo-user-4",
  typ: "chat",
  text: "Pozor, blíží se rozhodčí k pegu 5 👀",
  peg_cislo: null,
  vyrizeno: false,
  created_at: "2024-06-15T10:12:00Z",
  autor_jmeno: "Martin Černý",
}
```
Pozn.: ověř, že `DEMO_ZAVOD_ID` je v souboru exportovaný a typ `Zprava` má pole `id/zavod_id/autor_user_id/typ/text/peg_cislo/vyrizeno/created_at/autor_jmeno` (viz `src/lib/types.ts`). Pokud `Zprava` některé pole nemá/má navíc povinné, uprav objekty tak, aby seděly s typem.

- [ ] **Step 2: Komponenta `DemoChatPanel`** — Create `src/components/zavod/DemoChatPanel.tsx`:

Vychází z markupu `ChatPanel.tsx` (GlassCard + seznam zpráv + input), ale BEZ realtime/auth. „Živý náznak": po ~3 s přiteče `demoChatIncoming`, zvoneček jednou pípne (WebAudio, vzor z `PrivolaniPanel.tsx`) a zableskne. Tlačítka → login dialog přes `DemoProtectedButton`.

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, Send, Bell } from "lucide-react"
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard"
import { DemoProtectedButton } from "@/components/zavod"
import { demoChat, demoChatIncoming } from "@/lib/demo-data"
import { cn } from "@/lib/utils"
import type { Zprava } from "@/lib/types"

export function DemoChatPanel() {
  const [zpravy, setZpravy] = useState<Zprava[]>(demoChat)
  const [bellFlash, setBellFlash] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  // Živý náznak: po ~3s přiteče nová zpráva + zvoneček pípne + zableskne
  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    const t = setTimeout(() => {
      setZpravy((prev) => [...prev, demoChatIncoming])
      // zvuk (jednorázově, fallback bez zvuku)
      try {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext
        const a = new AudioCtx()
        const o = a.createOscillator()
        o.frequency.value = 880
        o.connect(a.destination)
        o.start()
        o.stop(a.currentTime + 0.2)
      } catch {
        // zvuk nepodporován — ignoruj
      }
      if (!prefersReduced) {
        setBellFlash(true)
        setTimeout(() => setBellFlash(false), 1200)
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [zpravy])

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Závodní chat
          <Bell
            className={cn(
              "ml-auto h-5 w-5 text-accent transition-all",
              bellFlash && "animate-leader-pulse scale-110"
            )}
          />
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-3">
        <DemoProtectedButton
          actionDescription="přivolání rozhodčího"
          variant="outline"
          className="w-full border-accent/50 text-accent hover:bg-accent/10"
        >
          <Bell className="h-4 w-4 mr-2" />
          Přivolat rozhodčího
        </DemoProtectedButton>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {zpravy.map((z) =>
            z.typ === "privolani" ? (
              <div
                key={z.id}
                className="rounded-lg border px-3 py-2 text-sm bg-accent/10 border-accent/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-accent">
                    🔔 Přivolání — Peg {z.peg_cislo ?? "?"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(z.created_at)}
                  </span>
                </div>
              </div>
            ) : (
              <div key={z.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{z.autor_jmeno}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(z.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground break-words">{z.text}</p>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Napište zprávu…"
            readOnly
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <DemoProtectedButton actionDescription="odeslání zprávy" size="icon" aria-label="Odeslat">
            <Send className="h-4 w-4" />
          </DemoProtectedButton>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
```
Pozn.: `DemoProtectedButton` musí být uvnitř `DemoLoginPromptProvider` — demo layout ho poskytuje (`layout.tsx:55`), takže `/zavod/demo/chat` je uvnitř. `animate-leader-pulse` je z 5a (tailwind). Pokud `DemoProtectedButton` nepřijímá `aria-label`, vynech ho.

- [ ] **Step 3: Build + commit**

Run: `cd /home/kovy/carp-club-app && npm run build && npm test`
```bash
git add src/lib/demo-data.ts src/components/zavod/DemoChatPanel.tsx && git commit -m "feat(demo): chat data + DemoChatPanel (živý náznak chatu + zvonečku)"
```

---

## Task 8: Demo chat — route + navigace + teaser

**Files:** Create `src/app/zavod/demo/chat/page.tsx`, Modify `src/app/zavod/demo/layout.tsx`, `src/app/zavod/demo/page.tsx`

- [ ] **Step 1: Demo chat podstránka** — Create `src/app/zavod/demo/chat/page.tsx`:
```tsx
"use client"

import { DemoChatPanel } from "@/components/zavod/DemoChatPanel"

export default function DemoChatPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">💬 Závodní chat</h1>
        <p className="text-sm text-muted-foreground">
          Týmy komunikují a přivolávají rozhodčího. V reálném závodě běží živě — tady je ukázka.
        </p>
      </div>
      <DemoChatPanel />
    </div>
  )
}
```

- [ ] **Step 2: Položka „Chat" v demo navigaci** (`src/app/zavod/demo/layout.tsx`)
  - Do `navItems` pole (kolem :46-52) přidej za „Pravidla" (nebo za „Galerie"):
    ```tsx
    { href: `/zavod/${DEMO_ZAVOD_ID}/chat`, label: "Chat", icon: <MessageCircle className="h-4 w-4" /> },
    ```
  - Přidej import `MessageCircle` do `lucide-react` importu (kolem :6-18). Tím se Chat zobrazí v desktop nav i v mobilním dropdown menu (oba mapují `navItems`). DemoBottomNav (5 položek) nech beze změny.

- [ ] **Step 3: Teaser na úvodu dema** (`src/app/zavod/demo/page.tsx`)
  - Přidej malou kartu/odkaz na `/zavod/demo/chat` s náznakem („💬 Závodní chat + 🔔 přivolání rozhodčího — podívej se"). Použij `Link` na `/zavod/${DEMO_ZAVOD_ID}/chat`, styl přes tokeny (GlassCard nebo `bg-card border-border`). Umísti k ostatním sekcím přehledu.

- [ ] **Step 4: Build + commit**

Run: `cd /home/kovy/carp-club-app && npm run build`
```bash
git add "src/app/zavod/demo/chat/page.tsx" "src/app/zavod/demo/layout.tsx" "src/app/zavod/demo/page.tsx" && git commit -m "feat(demo): chat podstránka + položka v navigaci + teaser na úvodu"
```

---

## Task 9: CHECKPOINT — build/test + review + push na main

**Files:** žádné (verifikace)

- [ ] **Step 1:** `cd /home/kovy/carp-club-app && npm run build && npm test` — vše zelené (logika nezměněna, 157 testů).
- [ ] **Step 2:** Finální review (controller dispatchne review na `git diff main..HEAD`): efekty téma-adaptivní (den čitelné na slunci — `--surface-glass`/`--halo` zajišťují tlumení), navigace zachovala logiku/role/podmíněný render, landing zachoval obsah/data, demo chat čistě UI (žádný zásah do actions/DB/auth, demo izolované), hero gradient opraven (čitelný v noci), žádné nové hardcoded barvy mimo záměrné výjimky.
- [ ] **Step 3:** Merge + push na main (Dušan ověří na produkci, bez screenshotů):
```bash
cd /home/kovy/carp-club-app && git checkout main && git merge --ff-only feat/faze-5b-verejna-tvar && git push origin main
```
- [ ] **Step 4:** Smoke produkce po deployi: `/`, `/zavod/demo`, `/zavod/demo/chat`, `/sezona` vrací 200. Aktualizovat paměť — Fáze 5b nasazena.

---

## Self-Review

**Spec coverage:** §3 horní menu → T1/T2; patička → T1(efekt)/T3; hamburger → T1/T4; demo chat → T7/T8; hero → T1/T5; landing sekce → T6. §4.1 sdílené efekty → T1. §6 živý náznak → T7. §7 bezpečnost → T9 review. **Pokryto.**

**Placeholder scan:** CSS hodnoty a demo chat kód doslova. Vizuální tasky (T2/T4/T5/T6) mají konkrétní zásahové body (soubor:řádek z exploru) + cíle + frontend-design — vizuální iterace je záměrná (jako 5a), ne „TODO".

**Type consistency:** `demoChat`/`demoChatIncoming` typu `Zprava` (ověřit pole proti `types.ts` v T7 Step 1). `DemoChatPanel` bez props. `DemoProtectedButton` props (`actionDescription`, `variant`, `size`, `className`) dle `DemoLoginPrompt.tsx`. Třídy `glass-bar`/`glass-bar-scrolled`/`glass-panel`/`nav-active-dot` z T1 použité v T2/T4. `animate-float-slow` (existující), `animate-leader-pulse`/`shadow-halo`/`.halo-card` (z 5a).

**Předpoklady k ověření:** `Zprava` typ pole (T7); `DEMO_ZAVOD_ID` export v demo-data; `DemoProtectedButton` přijímá `aria-label` (jinak vynechat); v outdoor jsou efekty tlumené (`--halo: transparent`, `--surface-glass: #ffffff`) → čitelnost na slunci u headeru i hamburgeru.
