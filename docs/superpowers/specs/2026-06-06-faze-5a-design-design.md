# Fáze 5a — Redesign „Hluboká voda": design systém + leaderboard

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-06
- **Status:** Design schválen, čeká na review spec
- **Předchozí:** Fáze 0–3c nasazeny.

---

## 1. Kontext

Aplikace funguje, ale vizuálně působí „z garáže". Cíl: posun na **top produkt s wow/halo efektem**, s respektem ke kontextu rybáře — **den u vody (ostré slunce → vysoký kontrast)** a **noc na mobilu (jemné na oči → halo glow)**. Schválený směr (visual companion): **A · Hluboká voda**. App už má přepínání témat `outdoor`/`night` (`ThemeProvider`) a glassmorphism (`GlassCard`) — stavíme na tom.

**Rozsah 5a** (zbytek později): vizuální jazyk (tokeny) + **leaderboard** jako vlajková obrazovka. Landing → 5b, dashboard na displej → 5c.

## 2. Cíl a rozsah

**Ano:** day/night design tokeny (paleta, typografie, efekty), aplikace na leaderboard (`LeaderboardTable`, `LigaTable`, stránka `sezona`). Zachování VŠÍ funkčnosti (data, řazení, diskvalifikace z 3a, embargo).
**Ne:** landing page (5b), dashboard na displej (5c), ostatní obrazovky, změna logiky/dat.

## 3. Vizuální jazyk „Hluboká voda"

### 3.1 Paleta — NIGHT (mobil, jemné na oči)
- Pozadí: hluboká modročerná, gradient `#04141f → #0a2233`
- Karty: tmavé poloprůhledné `rgba(255,255,255,0.05)` s tyrkysovým okrajem `rgba(56,189,248,0.35)` a **halo glow** `box-shadow: 0 0 28px rgba(56,189,248,0.22)`
- Akcent / úlovek (hrdina): **zlato-oranžová** `#fb923c` s `text-shadow: 0 0 14px rgba(251,146,60,.7)`
- Text: `#e8f4fb` (primární), `#7dd3fc`/`#64748b` (sekundární)
- Stavy: success `#22c55e`, destructive `#ef4444`, embargo skryté

### 3.2 Paleta — OUTDOOR (den, čitelné na slunci)
- Pozadí: světlé `#f8fafc`
- Karty: **pevné bílé** `#ffffff` se silným okrajem `2px solid #0c4a6e` (vedoucí) / `#cbd5e1` (ostatní), stín `0 6px 16px rgba(2,132,199,0.18)`. **Žádná průhlednost.**
- Akcent: oranžová `#c2410c`, tmavě modrá `#0c4a6e`
- Text: `#0c4a6e`/`#1e293b` (vysoký kontrast)

### 3.3 Typografie
- Sans (Inter nebo systémový stack), **velká tučná čísla** pro váhy (`kg`) a pořadí (hrdinové), výrazné display nadpisy.
- Hierarchie: název týmu silný, váha extra-bold + akcent, peg/ryby small muted.

### 3.4 Efekty
- **Halo glow** (radial gradient) za klíčovými prvky (night).
- **Zlatá záře** u vedoucího (🥇) a u úlovku.
- Jemné stíny (den), animace jen lehké (hover/transition, žádné rušivé).

## 4. Day/night tokeny

Rozšířit/sjednotit CSS proměnné v `src/app/globals.css` pro `outdoor` a `night` (existující `ThemeProvider` přepíná třídu na `<html>`/`<body>`). Komponenty čtou tokeny (tailwind `hsl(var(--...))` + nové proměnné pro halo/glow) → automatická adaptace bez podmínek v JSX. Doplnit tokeny: `--halo`, `--accent-glow`, `--card-border`, `--leader-glow`.

## 5. Leaderboard — vlajková loň

`src/components/zavod/LeaderboardTable.tsx`, `src/components/sezona/LigaTable.tsx`, stránka `src/app/sezona/page.tsx`:
- Karta týmu: medaile (🥇🥈🥉) se **zlatou září** u top 3, **váha jako hrdina** (velká, akcentní barva), peg + počet ryb sekundárně, barva týmu jako jemný akcent.
- Vedoucí tým zvýrazněný (silnější halo/okraj).
- Diskvalifikace ztlumeně (z 3a `entry.isDisqualified`), embargo skryje váhy.
- Den/noc varianty přes tokeny.
- Zachovat řazení, data, `prahKaret` (z 3b), všechny props.

## 6. Implementace

Použít **frontend-design skill** (specializovaný na polished UI) pro generování komponent/stylů, ať to není generické. Postup: tokeny → LeaderboardTable → LigaTable → sezona page. Zachovat existující rozhraní komponent (props), měnit jen vizuál/markup.

## 7. Testování
- `npm run build` zelený; existující testy (158) zelené (logika nezměněna).
- Day/night přepínání funguje (ThemeSwitcher), oba režimy čitelné.
- Vizuál ověří Dušan na produkci (mobil den/noc + desktop).
- Žádná regrese dat/řazení leaderboardu.

## 8. Rizika
- **Čitelnost na slunci** — outdoor režim MUSÍ být pevný vysoký kontrast (žádné glass/průhlednost); ověřit.
- **Nerozbít funkčnost** — leaderboard zobrazuje data, řazení, diskvalifikaci, embargo beze změny.
- **Konzistence tokenů** — komponenty mimo 5a (zatím staré) musí dál fungovat; tokeny přidávat, ne odebírat existující.
- **Velikost** — držet 5a na tokenech + leaderboardu; nerozšiřovat na další obrazovky.

## 9. Mimo rozsah (další fáze)
Landing page (5b), dashboard na velký displej (5c), redesign ostatních obrazovek (detail závodu, admin, formuláře), nové animace/ilustrace.
