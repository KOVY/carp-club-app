# Fáze 5b — „Veřejná tvář": landing, navigační obal, demo náznaky

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-06
- **Status:** Design schválen, čeká na review spec
- **Předchozí:** Fáze 0–3c + 5a (design systém „Hluboká voda" + leaderboard) nasazeny.

---

## 1. Kontext

Po Fázi 5a (témata den/noc „Hluboká voda" + leaderboard) je čas dotáhnout **veřejnou tvář** aplikace — to, co návštěvník vidí jako první. Landing je už obsahově bohatý (9 sekcí), navigační obal i demo stojí na design tokenech z 5a. Jde tedy o **polish, efekty a sjednocení do Hluboké vody** + jeden nový kousek (náznak chatu/zvonečku v demu), ne o přestavbu od nuly.

**Schválený přístup:** nejprve sdílené efekty (CSS utility + sdílené styly) jako znovupoužitelný základ, pak jejich aplikace na shell → landing → demo. DRY, stejně jako tokeny v 5a.

**Klíčový princip (z 5a):** den = pevné/kontrastní/čitelné na slunci (efekty tlumené), noc = sklo + halo glow, jemné na oči. Efekty řízené tokeny (`--halo` transparent ve dne), aby se nemuselo větvit v JSX.

## 2. Cíl a rozsah

**Ano:** (A) landing polish do Hluboké vody (9 sekcí + oprava hero gradientu), (B) navigační obal (horní menu efekt „tekuté sklo + halo", patička desktop bohatá / mobil jen copyright, hamburger slide-in sklo), (C) náznak chatu + zvonečku v demu (živý mock). Sdílené efekty jako reusable utility.

**Ne:** změna logiky/dat/auth, redesign app obrazovek mimo veřejnou tvář (detail závodu, admin, formuláře, ulovky — to případně dál), reálný chat v demu (jen mock), dashboard na velký displej (to je 5c).

## 3. Schválené vizuální volby

| Oblast | Volba |
|--------|-------|
| Horní menu | **Tekuté sklo + halo** — poloprůhledná lišta s blur, při scrollu se rozsvítí tyrkysový halo lem; aktivní položka svítící tečka/podtržení; logo ryba lehce „pluje". Den: pevná bílá, silný okraj, bez záře. |
| Patička desktop | Bohatá 4 sloupce (logo+popis, Závody, Právní, Kontakt) + jemný horní halo lem. |
| Patička mobil | **Jen tenký řádek** `© {rok} Carp Club ČR` nad spodní lištou (žádná velká patička). |
| Hamburger / mobilní menu | **Slide-in sklo** z pravé — sklo panel s blur + halo lem, velké položky s ikonami, nahoře profil, dole přepínač dne/noci + odhlásit. |
| Demo chat/zvoneček | **Živý náznak** — mock chat, po ~3 s přiteče nová zpráva + zvoneček jednou pípne (WebAudio) + zableskne. Tlačítka → login dialog. Nová položka „Chat" v demu + teaser na úvodu. |
| Hero landingu | **Evoluce dneška** — oprava gradientu do Hluboké vody, halo za nadpisem, plovoucí ryby, čitelný claim den/noc. |

## 4. Architektura

### 4.1 Vrstva 1 — sdílené efekty (postavit první)
CSS utility v `src/app/globals.css` (+ případně `tailwind.config.ts`), všechny **téma-adaptivní přes tokeny** (`--halo`, `--surface-glass` z 5a):
- **`.glass-bar`** — tekuté sklo pro lišty: `background: var(--surface-glass)`, `backdrop-filter: blur(...)`, jemný okraj. Den: `--surface-glass` je `#ffffff` (pevné) → čitelné na slunci; noc: poloprůhledné s blur.
- **`.glass-bar-scrolled`** (nebo modifikátor) — přidá `box-shadow` halo lem (`0 4px 24px var(--halo)` + spodní 1px tyrkysový lem). Ve dne `--halo: transparent` → bez záře, jen jemný stín/okraj.
- **`.float-fish`** — jemná plovoucí keyframes animace (translateY +/- pár px, pomalá), s `@media (prefers-reduced-motion: reduce)` vypnutím. (Pozn.: v `globals.css` už existuje `animate-float-slow` — sjednotit/využít, ne duplikovat.)
- **`.glass-panel`** — sdílený styl pro slide-in menu (sklo + halo lem na levém okraji).
- **`.halo-underline` / `.nav-active-dot`** — svítící tečka/podtržení aktivní položky (akcentní, ve dne plná barva).

### 4.2 Vrstva 2 — aplikace
Pořadí: Header/MobileHeader → Footer (+mobil) → MobileMenu → Landing (hero + sekce) → Demo chat.

## 5. Komponenty a soubory

| Soubor | Akce | Co |
|--------|------|-----|
| `src/app/globals.css` | Modify | Vrstva 1: `.glass-bar(-scrolled)`, `.glass-panel`, `.float-fish`/sjednotit float, nav-active; **oprava `.hero-gradient-animated`** (hardcoded `hsl(210 52% 24%)`, `hsl(174 62% 32%)` → tokeny `--primary`/`--secondary`). |
| `tailwind.config.ts` | Modify (dle potřeby) | keyframes/animation pro float/halo puls, pokud nejsou. |
| `src/components/layout/Header.tsx` | Modify | `.glass-bar` + scroll halo lem (využít `isScrolled`), aktivní položka svítící, logo `.float-fish`. Tokeny. |
| `src/components/layout/HeaderWrapper.tsx` | Modify (dle potřeby) | floating mód doladit (sklo pilulka volitelně), beze změny logiky. |
| `src/components/layout/MobileHeader.tsx` | Modify | stejný sklo+halo jazyk při scrollu (má `isScrolled`). |
| `src/components/layout/Footer.tsx` | Modify | desktop patička polish (halo lem, tokeny); přidat **mobilní mini-verzi** (jen `© rok …`) — dnes je `hidden md:block`, přidat zobrazení tenkého copyrightu na mobilu. |
| `src/components/layout/RootLayoutClient.tsx` | Modify (dle potřeby) | zajistit render mobilního copyrightu nad spodní lištou (např. Footer dostane variantu/prop, nebo malý prvek v shellu). |
| `src/components/layout/MobileMenu.tsx` | Modify | `.glass-panel` slide-in (sklo+halo), velké položky s ikonami, profil nahoře, přepínač+odhlásit dole. Zachovat položky/role-aware logiku. |
| `src/components/landing/HeroSection.tsx` | Modify | halo za nadpisem, plovoucí ryby (`.float-fish`), čitelnost den/noc; využít opravený gradient. |
| `src/components/landing/*` (Features, SocialProof, DemoPreview, HowItWorks, Organizers, FAQ) | Modify | polish přes tokeny, jemné halo akcenty na kartách; oprava hardcoded `amber-500/20` v `DemoPreviewSection`. Zachovat obsah/data. |
| `src/app/page.tsx` | Modify (dle potřeby) | ZavodCard kontrast přes tokeny, sekce wrappery polish. Logika `getZavody()` beze změny. |
| `src/lib/demo-data.ts` | Modify | přidat `demoChat` (mock zprávy + 1 přivolání), případně helper. |
| `src/components/zavod/DemoChatPanel.tsx` | **Create** | mock chat: seznam zpráv + přivolání, „živý náznak" (setTimeout přidá zprávu + WebAudio pípnutí + zablesknutí), tlačítka → `DemoProtectedButton` (login dialog). Tokeny + sklo/halo. |
| `src/app/zavod/demo/chat/page.tsx` | **Create** | nová demo podstránka s `DemoChatPanel`. |
| `src/app/zavod/demo/layout.tsx` | Modify | přidat položku „Chat" do desktop nav i spodní lišty (DemoBottomNav). |
| `src/app/zavod/demo/page.tsx` | Modify | malý teaser chatu/zvonečku (odkaz na /zavod/demo/chat). |

## 6. „Živý náznak" demo chatu — chování

- `DemoChatPanel` je klientská komponenta, **bez Supabase/auth/realtime**.
- Data z `demoChat` (mock): 2–3 chat zprávy + 1 přivolání (`🔔 Peg 3`, nové).
- Po mountu `setTimeout` (~3 s) přidá jednu novou zprávu do seznamu a:
  - přehraje krátké WebAudio pípnutí (880 Hz, ~0.2 s; try/catch fallback bez zvuku — stejný vzor jako reálný `PrivolaniPanel`),
  - jemně „zableskne" zvoneček (CSS animace/halo puls).
- Respektovat `prefers-reduced-motion` (bez blikání) a nezvučet opakovaně/agresivně (jednorázově).
- Tlačítka „Přivolat rozhodčího" a „Odeslat" jsou `DemoProtectedButton` → otevřou login dialog (žádná akce do DB).

## 7. Bezpečnost a data

- **Čistě prezentační/UI fáze.** Žádný zásah do `src/actions/**`, `src/lib/` (kromě `demo-data.ts` = mock konstanty), `supabase/**`, auth. Žádná DB migrace.
- Reálné `ChatPanel`, `PrivolaniPanel`, `useZavodChat`, `zpravy.actions.ts` (Fáze 3c) zůstávají **netknuté**.
- Demo zůstává 100% izolované od DB (jako dnes).

## 8. Testování

- `npm run build` zelený; existující testy (157) zelené (logika nezměněna).
- Den i noc čitelné na všech veřejných obrazovkách: header (scroll efekt), patička (desktop + mobil copyright), hamburger, landing (hero + sekce), demo chat. **Outdoor = žádná průhlednost na datech/textech, vysoký kontrast** (čitelnost na slunci).
- Hero gradient po opravě funguje v obou tématech (žádné tmavé-na-tmavém v noci).
- Demo chat „živý náznak" funguje (zpráva přiteče, zvoneček pípne jednou), tlačítka vedou na login.
- Vizuální ověření screenshoty (den/noc, mobil/desktop) + Dušan na produkci.

## 9. Rizika

- **Čitelnost na slunci** — sklo/halo MUSÍ být ve dne tlumené (přes `--halo: transparent`, `--surface-glass: #ffffff`); ověřit u headeru a hamburgeru, že ve dne nejsou průhledné/nečitelné.
- **Nerozbít navigaci** — Header/MobileMenu/BottomNavigation mají role-aware logiku a podmíněný render (RootLayoutClient/GlobalBottomNavigation); měnit jen vizuál, zachovat položky, role, podmínky zobrazení.
- **Mobilní patička vs spodní lišta** — mobilní copyright nesmí kolidovat se `fixed` spodní lištou (padding/safe-area); umístit nad ni.
- **Demo zvuk** — WebAudio jen na klientu, jednorázově, s fallbackem; neobtěžovat (respektovat reduced-motion, žádné opakování).
- **Velikost** — držet 5b na veřejné tváři; nerozšiřovat na app obrazovky (detail závodu, admin) — to je mimo rozsah.

## 10. Mimo rozsah (další fáze)

Dashboard na velký displej (5c — tam zapojit `animate-leader-pulse`/`shadow-halo`), redesign app obrazovek (detail závodu, admin, ulovky, formuláře), reálný chat v demu, Fáze 4 (notifikace/email rozesílky).
