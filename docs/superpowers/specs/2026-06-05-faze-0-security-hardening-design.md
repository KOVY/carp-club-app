# Fáze 0 — Bezpečnostní hotfix (Security Hardening)

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-05
- **Větev:** `feat/faze-0-security-hardening`
- **Status:** Design schválen, čeká na review spec
- **Autoři:** Dušan + Claude

---

## 1. Kontext

Audit (3 paralelní agenti, 2026-06-05) odhalil ~36 nálezů. Aplikace je **živá na carpclub.app**, takže kritické díry jsou zneužitelné okamžitě. Tato fáze řeší **úzký výběr** děr, které jsou (a) exploitovatelné teď a (b) jejichž oprava **přežije** pozdější přestavbu datového modelu (Fáze 2 — globální týmy / `TeamRegistration`).

**Stav prostředí:** žádný závod momentálně neběží, žádný aktivní provoz → lze bezpečně testovat proti živé DB i založit testovací data.

## 2. Princip a hranice

- **Cíl:** "zastavit krvácení", ne kompletní RLS redesign.
- **Co přežije Fázi 2:** ochrana PII a pozvánkových tokenů, zákaz anonymní eskalace, validace uploadu, scoping oprávnění na konkrétní závod, odstranění PII z logů. Tyto entity (profily, pozvánky, role) existují i v novém modelu.
- **Co se vědomě odkládá:** veřejné čtení soutěžních dat (`zavody`, `tymy`, `ulovky`, leaderboard) — to je z principu veřejné a přehodnotí se s novým modelem.

## 3. Rozsah — co opravíme

### DB migrace `016_security_hardening.sql` (pouští Dušan ručně v Supabase SQL editoru)

**3.1 `pozvanky` — zrušit anonymní čtení tokenů**
- Stav: `CREATE POLICY "Anon can verify token" ON pozvanky FOR SELECT TO anon USING (true)` (`005b:50-52`).
- Dopad díry: kdokoli s veřejným anon klíčem stáhne `token` + `email` + `telefon` + `jmeno` všech pozvaných.
- Oprava: `DROP POLICY "Anon can verify token" ON pozvanky;`
- Bezpečné, protože ověření tokenu běží výhradně server-side přes service role (`verifyPozvanka` v `pozvanka.actions.ts`). **Ověřit při implementaci:** žádná klientská cesta nečte `pozvanky` přes anon/authenticated klienta.

**3.2 `register_via_invitation` — zákaz anonymního volání**
- Stav: `SECURITY DEFINER` funkce (`005b:126`), volaná z `pozvanka.actions.ts:~804` přes uživatelský/anon klient. Lze ji volat anonymně se znalostí tokenu → přiřazení rolí/členství cizímu účtu (únos účtu v kombinaci s 3.1).
- Oprava: `REVOKE EXECUTE ON FUNCTION register_via_invitation(uuid) FROM anon, authenticated; GRANT EXECUTE ... TO service_role;`
- App: volání v `pozvanka.actions.ts` přepnout na **admin (service role) klienta**, po předchozím `auth.getUser()` ověření.

**3.3 `profiles` — skrýt email a telefon, zachovat veřejná jména**
- Stav: `CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true)` (`002:27-28`). Sloupce `jmeno`, `email`, `telefon`.
- Dopad díry: hromadný únik kontaktních PII (GDPR).
- **Omezení:** appka veřejně zobrazuje `jmeno` (leaderboard, týmy, potvrzení), takže `jmeno` musí zůstat čitelné. RLS je row-level, ne column-level.
- Oprava (volba dle ověření, jak app čte vlastní profil — rozhodne se v implementaci, kritérium = **nulová regrese zobrazení jmen**):
  - **Varianta A (preferovaná):** column-level privileges — `REVOKE SELECT (email, telefon) ON profiles FROM anon, authenticated;` Vlastní email/telefon se pak čte přes server action se service role nebo přes `get_my_profile()` RPC (`SECURITY DEFINER`).
  - **Varianta B:** veřejný view `profiles_public (id, jmeno)` + zúžení RLS na vlastní řádek + adminy; app přepne čtení cizích jmen na view.
- **Test:** anon dotaz na `profiles` nesmí vrátit `email`/`telefon`; leaderboard/týmy/profil musí dál fungovat.

**3.4 `system_admins` — zrušit veřejné čtení**
- Stav: `"Anon can read system_admins" USING (true)` (`010:32`) + `"Authenticated can read system_admins" USING (true)` (`010:36`). Enumerace privilegovaných účtů (email + UUID).
- Oprava: `DROP` obě SELECT politiky; ponechat `"Super admin can manage"`.
- **Závislost:** `checkAdminAccess()` (`hlavni-admin.actions.ts:46-50`) čte `system_admins` přes authenticated klienta → po zúžení by admin „zmizel". Náprava: nahradit přímý SELECT voláním **`is_system_admin()` / `get_system_admin_role()` RPC** (existují, `010:54,64`, `SECURITY DEFINER`). Projít všechna místa, kde se `system_admins` čte klientsky.

### TS opravy (přes GitHub → Vercel, jeden ucelený commit/PR)

**3.5 Cross-závod privilege escalation**
- Stav: `checkAdminAccess()` (`hlavni-admin.actions.ts:32-71`) vrací úspěch, pokud je uživatel pořadatel **jakéhokoli** závodu (čtení `zavod_role` bez `zavod_id`, `:58-62`). `confirmUlovekAdmin`/`rejectUlovekAdmin`/`getZavodDetail`/`getPendingUlovkyAdmin` přijímají jen ID a neověřují příslušnost úlovku k závodu, který volající spravuje.
- Oprava: nová `checkAdminAccessForZavod(zavodId)` — system/hlavní admin projde vždy; pořadatel jen pokud má `poradatel`/`hlavni_admin` roli **pro daný `zavod_id`**. Funkce nad úlovky načtou `zavod_id` z úlovku a ověří scope. `checkAdminAccess()` (bez zavodId) ponechat jen pro skutečně globální operace.

**3.6 Server-side validace uploadu fotky**
- Stav: `submitUlovek` (`ulovky.actions.ts`) kontroluje jen `size === 0`; MIME ani max velikost ne, přípona z klientského názvu.
- Oprava: allowlist MIME (`image/jpeg|png|webp`), max velikost (např. 10 MB), přípona odvozená z ověřeného MIME. (SVG zakázat / nepovolit inline servírování.)

**3.7 Hardcoded system admin do env**
- Stav: `SYSTEM_ADMIN_IDS = ['adfa3aa5-…' /* email */]` v `src/lib/constants.ts`.
- Oprava: přesun do server-only env proměnné (Vercel env), bez emailu v komentáři. Ověřovat primárně přes tabulku/RPC `is_system_admin()`.

**3.8 Odstranit PII/token z console.log**
- Místa: `lib/supabase/middleware.ts`, `components/auth/AuthCallbackHandler.tsx`, `actions/pozvanka.actions.ts`, `app/admin/layout.tsx` aj. (loguje userId, emaily, tokeny).
- Oprava: odstranit/maskovat citlivé logy; ponechat `console.error` pro skutečné chyby. (Plný úklid 97 logů a `@ts-nocheck` je mimo rozsah — řeší se průřezově při dotyku souborů.)

**3.9 (bonus, již hotovo) Oprava statistik dashboardu**
- `hlavni-admin.actions.ts`: `.eq('potvrzeno', true)` (neexistující sloupec) → `.eq('stav', 'potvrzeno')`; `.eq('pouzita', true)` (deprecated po migr. 007) → `.not('registrovano_at', 'is', null)`. **Stav: opraveno v pracovním stromu.**

## 4. Mimo rozsah (a kam to patří)

| Téma | Kam |
|------|-----|
| Žluté karty off-by-one (migr. 014), leaderboard nevynuluje skóre při diskvalifikaci | Fáze 3 — pravidla |
| Stopka / zamítnutí úlovku nevynucené server-side | Fáze 3 — pravidla |
| Veřejný storage bucket → signed URLs | Fáze 3 (spolu s embargem) |
| Úplné odstranění 97× `console.log` a 8× `@ts-nocheck` | průřezově, postupně |
| Globální týmy / `TeamRegistration` / `Peg` jako entita | Fáze 2 — model |
| Email + Google OAuth | Fáze 1 — auth |

## 5. Plán nasazení

1. SQL migrace `016_security_hardening.sql` — Dušan projde a **pustí ručně** v Supabase SQL editoru.
2. TS opravy — lokálně, testy musí projít, pak **push na GitHub** → Vercel auto-deploy ucelené fáze.
3. Pořadí: nejdřív DB migrace (s odpovídajícími app úpravami 3.2/3.4 ve stejném nasazení), aby se nikdo „neodřízl".

## 6. Testovací plán

Založit testovací závod + účty (závodník, kapitán, pořadatel závodu A, pořadatel závodu B, system admin). Před/po každé opravě ověřit:

- **3.1/3.3/3.4:** přímý dotaz **anon klíčem** na `pozvanky`, `profiles` (email/telefon), `system_admins` → musí vrátit prázdno / chybu. Veřejná `jmena` na leaderboardu fungují.
- **3.2:** volání `register_via_invitation` anon klíčem → odmítnuto; legitimní registrace přes pozvánku (server) funguje.
- **3.5:** pořadatel závodu A volá `confirmUlovekAdmin` na úlovek závodu B → odmítnuto; na vlastní závod → projde.
- **3.6:** upload ne-obrázku / přerostlého souboru přes server action → odmítnuto.
- **Regrese:** přihlášení admin/pořadatel/závodník, leaderboard, zadání + potvrzení úlovku, admin dashboard statistiky.
- Nástroje: Playwright (UI flow) + skript s anon klíčem (RLS probe) + `npm run build` + `npm run test`.

## 7. Rizika a rollback

- **Regrese zobrazení jmen** (3.3) — největší riziko; mitigace = kritérium „nulová regrese", varianta A/B se volí až po ověření čtení profilu, kryto testy.
- **Odříznutí admina** (3.4) — mitigace = přepnout na `is_system_admin()` RPC ve stejném nasazení.
- **Rollback DB:** migrace `016` je čistě DROP/REVOKE/CREATE POLICY — připraví se inverzní `016_rollback.sql` (znovuvytvoření původních politik) pro případ nouze.
- **Rollback TS:** revert commitu na Vercelu (instant rollback na předchozí deployment).

## 8. Definition of Done

- [ ] `016_security_hardening.sql` + `016_rollback.sql` zverzované, projité Dušanem, spuštěné na produkci.
- [ ] TS opravy 3.2, 3.4–3.8 implementované, `build` + `test` zelené.
- [ ] Testovací plán (sekce 6) projit, žádná regrese.
- [ ] Anon RLS probe potvrzuje, že PII a tokeny už nejsou čitelné.
- [ ] Push na GitHub, Vercel deploy ucelené fáze ověřen.
