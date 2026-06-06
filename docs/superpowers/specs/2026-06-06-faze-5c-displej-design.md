# Fáze 5c — Dashboard na velký displej („rozhlasový panel" závodu)

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-06
- **Status:** Design schválen, čeká na review spec
- **Předchozí:** Fáze 0–3c + 5a (design systém) + 5b (veřejná tvář) nasazeny.

---

## 1. Kontext

Závěrečný kus před předáním na testování. Pořadatel potřebuje **dashboard na velký displej** (TV / projektor / monitor u jezera) — „rozhlasový panel" závodu, který ukazuje živé pořadí, největší rybu a přivolání rozhodčího. Základ existuje: route `/zavod/[zavodId]/verejnost` (živé pořadí top 10, největší ryba, embargo, manuální refresh) + server actions `getLeaderboard`, `getNejvetsiRyby`, `getZpravy`. 5c postaví dedikovaný displej nad těmito daty.

Vizuální jazyk je dán (Hluboká voda, den/noc, glow utility z 5a/5b) — žádné nové brainstormování vizuálu.

## 2. Cíl a rozsah

**Ano:** Nová route `/zavod/[zavodId]/displej` — fullscreen panel pro velký displej, velké fonty čitelné z dálky, „plný panel" (vše na jedné obrazovce): hlavička (název/stav/odpočet/embargo/fullscreen), velké živé pořadí (medaile glow, vedoucí pulzuje), boční/spodní panel (největší ryba + nevyřízená přivolání read-only). Živá data přes **auto-refresh polling (~15 s)**. Téma den/noc (zdědí + přepínač). Znovupoužití existujících komponent a server actions.

**Ne:** realtime (polling stačí — žádná DB migrace `ulovky`), zápis dat z displeje, výběr závodu mimo URL param, počasí/QR (volitelné budoucí), redesign `/verejnost` (necháme jak je).

## 3. Architektura

### 3.1 Route a layout
- **Route:** `src/app/displej/[zavodId]/page.tsx` (klientská — polling + fullscreen). **MIMO** segment `/zavod/[zavodId]/` záměrně — ten má těžký vnořený layout (header + bottom nav + swipe), který na fullscreen displeji nechceme. URL je `/displej/<zavodId>`, pořadatel ji otevře na TV/projektoru.
- **Čistá plocha:** v `src/components/layout/RootLayoutClient.tsx` přidat výjimku `isDisplejPage = pathname?.startsWith('/displej')` → vrátit jen `{children}` (stejně jako admin/zavod/pozvanka), aby displej nedostal landing Header/Footer/BottomNavigation. Stránka si pak řídí celou plochu (`min-h-screen`), velké rozestupy.
- **Fullscreen:** tlačítko v hlavičce → `document.documentElement.requestFullscreen()` (s fallbackem, když API není). Stav fullscreen → skrýt přepínač/tlačítka pro čistý obraz (volitelně).

### 3.2 Sekce (plný panel, jedna obrazovka)
1. **Hlavička:** název závodu + místo; `StatusBadge` (příprava/probíhá/ukončen); **odpočet do konce** závodu (z `datum_end`, živě tikající `setInterval` 1 s); embargo indikátor (když aktivní); tlačítko fullscreen; `ThemeSwitcher` (den/noc).
2. **Hlavní plocha — živé pořadí:** velký leaderboard. Znovupoužít `LeaderboardTable` nebo nová `DisplejLeaderboard` (větší fonty/řádky, medaile `medal-glow-1`, vedoucí `animate-leader-pulse` + `halo-card`, váha hrdina `text-accent`). Zobrazit top N (kolik se vejde, ~8–12).
3. **Boční/spodní panel:**
   - **Největší ryba:** `CompactBiggestFish` (z `NejvetsiRybaCard`) nebo větší varianta — váha + tým + peg, zvýrazněná.
   - **Nevyřízená přivolání (read-only):** seznam `🔔 Peg X volá rozhodčího` (z `getZpravy` filtr `typ='privolani' && !vyrizeno`). Bez tlačítek (displej je read-only) — jen vizuální upozornění (akcentní karta, případně jemný puls). **POZOR — auth:** `getZpravy` vyžaduje přihlášení + účastníka závodu (vrací `UNAUTHORIZED`/`FORBIDDEN` jinak). Panel přivolání je proto **best-effort**: zobrazí se jen když `getZpravy` uspěje (displej spuštěn přihlášeným pořadatelem/rozhodčím na jeho zařízení). Když selže (nepřihlášený divák), panel se **tiše skryje** — pořadí a největší ryba fungují dál veřejně. Žádná nová action, žádná security změna.

### 3.3 Data flow (polling)
- `useEffect` + `setInterval(REFRESH_MS)` (≈15000) → paralelně `getLeaderboard(zavodId)`, `getNejvetsiRyby(zavodId, 1)`, `getZpravy(zavodId)` (filtr nevyřízená přivolání). První načtení hned (loading skeleton).
- Odpočet do konce: samostatný `setInterval(1000)` přepočítá zbývající čas z `datum_end` (klientský čas).
- Embargo: `getLeaderboard`/`getNejvetsiRyby` už vrací `embargoActive` a skrývají váhy — displej to respektuje (váhy skryté během embarga).
- Cleanup obou intervalů na unmount.

### 3.4 Vizuál
- **Wow ZAPNUTO** (na rozdíl od `.app-ui` clean): displej smí mít glow/animace (medaile září, vedoucí pulzuje, halo). Velké fonty (`text-4xl`+ pro váhy/pořadí), vysoký kontrast.
- **Den/noc:** zdědí `data-theme` (ThemeProvider). Večer u vody = noční (tmavé + halo, jemné na oči); na slunci = outdoor (světlé, kontrastní, čitelné). Přepínač v hlavičce.
- Tokeny z 5a/5b — žádné nové hardcoded barvy (kromě medailových/stavových konvencí).

## 4. Komponenty a soubory

| Soubor | Akce | Co |
|--------|------|-----|
| `src/app/displej/[zavodId]/page.tsx` | Create | klientská stránka: polling, odpočet, fullscreen, skládá sekce |
| `src/components/layout/RootLayoutClient.tsx` | Modify | výjimka `isDisplejPage` → čistá plocha (jen children) |
| `src/components/zavod/DisplejPrivolani.tsx` | Create | read-only panel nevyřízených přivolání (best-effort, bez vyřídit tlačítek) |
| (znovupoužití) `CompactLeaderboard`/`LeaderboardTable`, `CompactBiggestFish` | — | leaderboard + největší ryba (velikost přes wrapper/prop) |
| (znovupoužití) `getLeaderboard`, `getNejvetsiRyby`, `getZpravy` | — | data (existující actions) |
| (znovupoužití) `StatusBadge`, `GlassCard`, `ThemeSwitcher` | — | hlavička, kontejnery, přepínač |

Pozn.: preferovat znovupoužití existujících komponent s úpravou velikosti přes prop/wrapper před duplikací. Nové komponenty jen tam, kde se chování liší (read-only přivolání, velké rozložení).

## 5. Bezpečnost a data

- **Čistě čtení.** Displej volá jen existující read server actions (`getLeaderboard`, `getNejvetsiRyby`, `getZpravy`), které respektují embargo a oprávnění. Žádný zápis, žádná nová action.
- **Žádná DB migrace** (polling, ne realtime).
- Veřejně čitelné (jako `/verejnost`) — bez přihlášení. Embargo skrývá váhy pro veřejnost (rozhodčí výjimka řeší existující logika dle session).
- Žádný zásah do business logiky, schématu, auth.

## 6. Testování

- `npm run build` zelený; existující testy (157) zelené (logika nezměněna — displej jen čte).
- Polling funguje (data se obnoví ~15 s), odpočet tiká, cleanup intervalů (žádný memory leak).
- Embargo: během embarga váhy skryté i na displeji.
- Fullscreen tlačítko funguje (s fallbackem).
- Den i noc čitelné na velkém displeji (noc halo/jemné, den kontrastní).
- Smoke produkce: `/zavod/<id>/displej` vrací 200. Vizuál ověří Dušan/Tomáš na produkci (skutečný displej).

## 7. Rizika

- **Čitelnost z dálky** — fonty musí být velké, vysoký kontrast; ověřit na skutečném displeji.
- **Polling zátěž** — 15 s interval × 3 actions je únosné; nenastavovat příliš agresivně. Cleanup intervalů povinný.
- **Odpočet po konci** — když `datum_end` v minulosti, zobrazit „Závod ukončen" místo záporného času.
- **Prázdné stavy** — žádné týmy/ryby/přivolání → elegantní prázdný stav, ne rozbití.
- **Embargo** — nesmí na displeji prosáknout váhy během embarga (spoléhá na `embargoActive` z actions — ověřit).
- **Velikost** — držet 5c na displeji; nerozšiřovat na realtime/počasí/QR (budoucí).

## 8. Mimo rozsah (další fáze / volitelné)

Realtime leaderboard (migrace `ulovky` do publication), počasí, QR kód pro diváky na živé sledování, rotace více závodů na jednom displeji, auto-výběr běžícího závodu bez URL param, ovládání displeje na dálku.
