# Fáze 5a — Hluboká voda: design systém + leaderboard: Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zavést vizuální jazyk „Hluboká voda" (den světlé/kontrastní, noc tmavé/halo) a aplikovat ho na leaderboard jako vlajkovou obrazovku, bez ztráty funkčnosti.

**Architecture:** Témata jdou přes `data-theme` na `<html>` (`outdoor`/`night`), tokeny jsou DUPLIKOVANÉ v `globals.css` i `tailwind.config.ts` (plugin addBase) — měnit OBĚ místa. 5a **srovná témata dle schváleného mockupu** (outdoor = DEN světlé/kontrastní, night = NOC tmavé/halo), přidá glow utility a redesignuje leaderboard. Komponenty čtou tokeny → adaptují se. Respektujeme pravidlo „glow na kontejnerech/akcentech, data čitelná".

**Tech Stack:** Next.js 15, TailwindCSS, CSS custom properties, frontend-design skill pro polished UI.

**Pořadí:** TS přes GitHub→Vercel (žádná DB migrace). Vizuál ověří Dušan na produkci (mobil den/noc + desktop).

---

## File Structure

| Soubor | Odpovědnost | Akce |
|--------|-------------|------|
| `src/app/globals.css` | tokeny témat (outdoor=den, night=noc) + glow CSS třídy | Modify |
| `tailwind.config.ts` | tokeny (addBase, sync s globals) + boxShadow/keyframes glow | Modify |
| `src/components/zavod/LeaderboardTable.tsx` | medaile zář + váha hrdina, den/noc | Modify |
| `src/components/sezona/LigaTable.tsx` | totéž pro sezónní ligu | Modify |
| `src/app/sezona/page.tsx` | header polish + ThemeSwitcher + stats | Modify |

---

## Task 1: Tokeny témat — outdoor = DEN (světlé), night = NOC (tmavé)

**Files:** Modify `src/app/globals.css`, `tailwind.config.ts`

Cíl: srovnat témata dle schváleného mockupu. **outdoor** = den u vody (světlé, vysoký kontrast, žádná průhlednost), **night** = noc na mobilu (tmavé, halo). Tokeny jsou na DVOU místech — uprav obě konzistentně.

- [ ] **Step 1: `globals.css` — přepsat palety**

V `:root, :root[data-theme="outdoor"]` (kolem :30-83) nastav DEN (světlé):
```css
  --primary: 201 84% 24%;        /* #0c4a6e tmavě modrá */
  --primary-foreground: 0 0% 100%;
  --accent: 21 90% 41%;          /* #c2410c oranžová */
  --accent-foreground: 0 0% 100%;
  --background: 210 40% 98%;     /* #f8fafc */
  --foreground: 201 84% 24%;     /* #0c4a6e */
  --surface: 0 0% 100%;          /* bílá */
  --surface-glass: #ffffff;      /* DEN: bez průhlednosti */
  --card: 0 0% 100%;
  --card-foreground: 201 84% 24%;
  --border: 201 84% 24%;         /* silný modrý okraj */
  --muted: 210 40% 96%;
  --muted-foreground: 215 25% 35%;
  --ring: 201 84% 24%;
```
V `:root[data-theme="night"]` (kolem :90-140) nastav NOC (tmavé halo):
```css
  --primary: 199 90% 60%;        /* #38bdf8 tyrkys */
  --primary-foreground: 201 100% 6%;
  --accent: 27 96% 61%;          /* #fb923c zlato-oranžová */
  --accent-foreground: 201 100% 6%;
  --background: 201 72% 7%;      /* #04141f */
  --foreground: 202 70% 95%;     /* #e8f4fb */
  --surface: 201 50% 12%;
  --surface-glass: rgba(255,255,255,0.05);
  --card: 201 50% 12%;
  --card-foreground: 202 70% 95%;
  --border: 199 60% 30%;
  --muted: 201 40% 16%;
  --muted-foreground: 200 30% 60%;
  --ring: 199 90% 60%;
```
A uprav tvrdé `!important` pozadí (kolem :154-164):
```css
html[data-theme="outdoor"], html[data-theme="outdoor"] body { background-color:#f8fafc !important; color:#0c4a6e !important; }
html[data-theme="night"], html[data-theme="night"] body { background-color:#04141f !important; color:#e8f4fb !important; }
```
Přidej glow tokeny do obou témat: `--halo: rgba(56,189,248,0.22);` (night) / `--halo: transparent;` (outdoor); `--leader-glow: ...` (night zlatá / outdoor jen barva).

- [ ] **Step 2: `tailwind.config.ts` — synchronizovat addBase tokeny**

V pluginu addBase (kolem :189-257) nastav stejné hodnoty tokenů pro `:root` (outdoor=den) a `:root[data-theme="night"]` (noc) jako v globals.css. Hodnoty MUSÍ sedět s globals.css (jinak nekonzistence).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build projde. Vizuálně: appka je teď ve výchozím stavu (outdoor) SVĚTLÁ, po přepnutí na night TMAVÁ.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "feat(design): témata Hluboká voda — outdoor=den světlé, night=noc tmavé"
```

---

## Task 2: Glow/halo utility

**Files:** Modify `tailwind.config.ts`, `src/app/globals.css`

- [ ] **Step 1: `tailwind.config.ts` — boxShadow + keyframes**

Do `theme.extend` přidej (klíč `boxShadow` chybí):
```ts
      boxShadow: {
        'halo': '0 0 28px var(--halo)',
        'leader': '0 0 24px rgba(251,146,60,0.45)',
        'glow-teal': '0 0 20px rgba(56,189,248,0.35)',
      },
```
A do `keyframes`/`animation` přidej jemnou pulzaci pro vedoucího (volitelně použít):
```ts
      keyframes: { 'leader-pulse': { '0%,100%': { boxShadow: '0 0 18px rgba(251,146,60,0.35)' }, '50%': { boxShadow: '0 0 28px rgba(251,146,60,0.6)' } } },
      animation: { 'leader-pulse': 'leader-pulse 2.5s ease-in-out infinite' },
```

- [ ] **Step 2: `globals.css` — CSS třída pro medaili (akcent, ne data)**

```css
@layer components {
  .medal-glow-1 { box-shadow: 0 0 18px rgba(251,191,36,0.55); }   /* zlatá zář pro 🥇 */
  .halo-card { box-shadow: 0 0 28px var(--halo); }                 /* night: glow; outdoor: --halo transparent → bez efektu */
}
```
Pozn.: `--halo` je v outdoor `transparent`, takže `halo-card` v denním režimu efekt nevykreslí (čitelnost na slunci).

- [ ] **Step 3: Build + commit**

Run: `npm run build`
```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "feat(design): glow/halo utility (medaile zář, karta halo)"
```

---

## Task 3: Leaderboard — medaile zář + váha hrdina

**Files:** Modify `src/components/zavod/LeaderboardTable.tsx`

**Použij frontend-design skill** pro polished výsledek. Cíl: vlajková obrazovka „wow". Zachovej VŠECHNY props (`entries`, `embargoActive`, `showWeights`, `isLoading`, `prahKaret`), logiku (řazení, `isDisqualified`, embargo), `AnimatedScore`.

- [ ] **Step 1: Medaile se zlatou září** (mobil `:171-204`, desktop `:263-294`)
  - Kruh medaile vedoucího (🥇, pozice 1) dostane třídu `medal-glow-1` (zlatá zář) — akcent, ne data.
  - Top 3 zachovat barvy (yellow/gray/amber), zvýraznit kruh.
  - Render `<Medal>` ponech, jen vizuálně doladit (velikost, barva přes tokeny).

- [ ] **Step 2: Váha jako hrdina** (mobil `:242-249`, desktop `:329-336`)
  - Váha: větší (`text-xl`/`text-2xl`), extra-bold, barva `text-accent` (oranžová/zlatá z tokenů). **Žádný glow na číslech** (čitelnost) — jen velikost + barva + váha fontu. `kg` malé muted.
  - Vedoucí (pozice 1) může mít váhu v `text-accent` výrazněji.

- [ ] **Step 3: Karta vedoucího** — řádek pozice 1 dostane `halo-card` (night glow, outdoor bez efektu) + silnější okraj `border-primary`.

- [ ] **Step 4: Den/noc** — všechny barvy přes tokeny (`text-foreground`, `bg-card`, `border-border`, `text-accent`), žádné nové hardcoded. GlassCard kontejner zůstává (kontejner smí glow). Ověř, že v outdoor (den) je vše pevné a kontrastní (žádná průhlednost na datech).

- [ ] **Step 5: Build + commit**

Run: `npm run build && npm test`
```bash
git add src/components/zavod/LeaderboardTable.tsx
git commit -m "feat(design): leaderboard — medaile zář + váha hrdina + halo vedoucí"
```

---

## Task 4: LigaTable (sezóna) — stejný jazyk

**Files:** Modify `src/components/sezona/LigaTable.tsx`

**Použij frontend-design skill.** Aplikuj stejný jazyk jako Task 3, zachovej props (`entries`, `liga`, `barva`, `embargoActive`, `showWeights`, zóny, `prahKaret`) a logiku zón (postup/sestup).

- [ ] **Step 1:** Medaile (kruh `:112-118`) — vedoucí `medal-glow-1`, top 3 barvy zachovat.
- [ ] **Step 2:** Váha (`:170-178`) — `text-xl` extra-bold `text-accent`, `kg` muted. Bez glow na číslech.
- [ ] **Step 3:** Řádek vedoucího `halo-card` + silný okraj. Zóny (postup zelená / sestup červená) zachovat, jen doladit přes tokeny.
- [ ] **Step 4:** Den/noc přes tokeny.
- [ ] **Step 5: Build + commit**

Run: `npm run build`
```bash
git add src/components/sezona/LigaTable.tsx
git commit -m "feat(design): sezónní liga — Hluboká voda jazyk"
```

---

## Task 5: Stránka sezóna — polish + ThemeSwitcher

**Files:** Modify `src/app/sezona/page.tsx`

- [ ] **Step 1:** Header (`:79-111`) — doplnit `<ThemeSwitcher />` (import z `@/components/ui/ThemeSwitcher`) vedle Share/Refresh (dnes tam chybí — uživatel nemá jak přepnout den/noc na této stránce). Vizuálně doladit header (Trophy + název sezóny, čistý, přes tokeny).
- [ ] **Step 2:** Stats grid (`:254` okolí) — 3 karty (Týmů/Úlovků/kg) doladit: větší čísla (hrdinové), `bg-card` + jemný okraj, akcentní barva u „kg celkem". Použij frontend-design pro polish.
- [ ] **Step 3:** Liga taby — aktivní tab zvýraznit barvou ligy (už má), doladit kontrast.
- [ ] **Step 4: Build + commit**

Run: `npm run build`
```bash
git add "src/app/sezona/page.tsx"
git commit -m "feat(design): sezóna — header s přepínačem dne/noci + stats polish"
```

---

## Task 6: CHECKPOINT — build/test + review + push

**Files:** žádné (verifikace)

- [ ] **Step 1:** `npm run build && npm test` — vše zelené (logika nezměněna, 158).
- [ ] **Step 2:** Finální review (controller dispatchne review na `git diff main..HEAD`: tokeny sync globals↔tailwind, day=outdoor světlé/night=tmavé, leaderboard zachoval props/logiku/embargo/diskvalifikaci, glow jen na akcentech ne na datech, žádné hardcoded barvy mimo tokeny).
- [ ] **Step 3:** `git push -u origin feat/faze-5a-design`. Žádná migrace.

---

## Task 7: Vizuální ověření (Dušan) + merge

**Files:** žádné

- [ ] **Step 1: Smoke produkce** — po deployi: `/sezona`, `/` vrací 200; přepnutí dne/noci funguje (ThemeSwitcher).
- [ ] **Step 2: Vizuální ověření Dušanem** — mobil DEN (světlé, čitelné na slunci), mobil NOC (tmavé halo), desktop. Leaderboard medaile/váha/vedoucí.
- [ ] **Step 3: Regrese** — leaderboard data, řazení, diskvalifikace, embargo fungují; ostatní obrazovky (zatím staré) se nerozbily (čtou tokeny → adaptují; hardcoded barvy ověřit, že nejsou nečitelné).
- [ ] **Step 4: Merge + paměť**

```bash
git checkout main && git merge --ff-only feat/faze-5a-design && git push origin main
```
Aktualizovat paměť — Fáze 5a nasazena.

---

## Self-Review

**Spec coverage:** §3 vizuální jazyk → T1/T2; §4 day/night tokeny → T1; §5 leaderboard → T3/T4/T5; §6 frontend-design → T3-T5; §7 testy → T6/T7. **Pokryto** + navíc srovnání témat (zjištěno v exploru, T1).

**Placeholder scan:** Tokeny doslova (hex/hsl). Komponenty (T3-T5) mají konkrétní zásahové body (soubor:řádek z exploru) + cíle + frontend-design — vizuální iterace je záměrná, ne „TODO".

**Type consistency:** Props komponent zachovány (`entries`, `prahKaret`, `embargoActive`...). Třídy `medal-glow-1`, `halo-card`, boxShadow `halo`/`leader` konzistentní napříč T2-T5. Témata `outdoor`/`night` přes `data-theme` (ThemeProvider beze změny).

**Předpoklady k ověření:** tokeny synchronizovat na OBOU místech (globals.css + tailwind addBase); ostatní obrazovky (mimo 5a) po prohození témat ověřit na čitelnost (hardcoded barvy); `--halo` transparent v outdoor zajistí čitelnost na slunci.
