# Fáze 3a — Zpevnit pravidla (žluté karty, stopka, diskvalifikace)

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-05
- **Status:** Design schválen, čeká na review spec
- **Předchozí:** Fáze 0/1/2 nasazeny.

---

## 1. Kontext

Audit potvrdil 5 bugů v pravidlové vrstvě, která je roztříštěná mezi DB triggery / aplikaci / UI se **dvěma neslučitelnými zdroji pravdy** o diskvalifikaci (off-by-one trigger `pravidla_2026` z migrace 014 vs. aplikační `zluteKarty >= 2`, které nevynuluje skóre). Rozhodnutí (Dušan): **zachovat systém „pravidla 2026"** (3-kartový progresivní postih), opravit ho, sjednotit na jeden zdroj pravdy a udělat prahy/hodiny **nastavitelné per závod** s defaulty.

## 2. Cíl a rozsah

**Ano (3a):** config prahů/hodin per závod, oprava 5 bugů, jeden zdroj pravdy o diskvalifikaci, server-side vynucení stopky, úklid odpojené staré funkce.
**Ne (→ Fáze 3b):** přivolání rozhodčího, kontrola úlovku libovolným týmem (předělání potvrzování). Plné UI pro editaci prahů (defaulty fungují i bez editoru).

## 3. Config — nastavitelnost per závod (migrace 020)

```sql
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS diskvalifikace_pocet_karet INT DEFAULT 3;
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS stopka_hodiny_1_karta INT DEFAULT 3;
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS stopka_hodiny_2_karta INT DEFAULT 6;
```
Pravidlo 2026 (default): 1. karta → odebrání poslední ryby + stopka 3 h; 2. karta → anulace všech ryb + stopka 6 h; 3. karta (= `diskvalifikace_pocet_karet`) → diskvalifikace.

## 4. Oprava bugů

### 4.1 Žluté karty off-by-one (migrace 020 — oprava `check_yellow_cards_2026`)
Trigger je `BEFORE INSERT` a počítá `COUNT(*)` PŘED vložením → posun o 1. Oprava: pořadí vkládané karty = `COUNT(*) + 1`. Načíst config z `zavody` (prahy/hodiny). Logika dle `nove_cislo = COUNT + 1`:
- `nove_cislo = 1` → odebrat poslední rybu týmu + `stopka_do = NOW() + stopka_hodiny_1_karta h`
- `nove_cislo = 2` → anulovat všechny ryby (`stav='zamitnuto'`) + `stopka_do = NOW() + stopka_hodiny_2_karta h`
- `nove_cislo >= diskvalifikace_pocet_karet` → diskvalifikace (anulace všech ryb)
- `NEW.cislo_karty := COUNT + 1` (správné číslování od 1)

Migrace také `DROP FUNCTION IF EXISTS check_yellow_cards()` (odpojená stará funkce z 003).

### 4.2 Leaderboard vynuluje skóre při diskvalifikaci
Čistá funkce `applyDisqualifikace(skore, pocetKaret, prah): number` (vrací 0 při `pocetKaret >= prah`, jinak `skore`) — TDD. V `leaderboard.actions.ts` načíst `zavody.diskvalifikace_pocet_karet`, aplikovat na `skore`, a diskvalifikované řadit **na konec** (úprava `sortLeaderboard` nebo přidat `isDisqualified` do řazení). `LeaderboardTable.tsx` zobrazí 0 + „diskvalifikováno".

### 4.3 Stopka server-side (`ulovky.actions.ts` — `submitUlovek`)
Před vložením úlovku zavolat RPC `tym_has_active_stopka(tymId, zavodId)` (existuje, 014:181) → pokud `true`, vrátit chybu (nový `ErrorCodes.STOPKA_ACTIVE` „Tým má aktivní stopku, nelze zadat úlovek"). Doplnit i do `ulovky` RLS politiky není nutné (server action stačí), ale ověřit.

### 4.4 Zamítnutí sousedem (UI + action)
V 3a: odebrat nefunkční „Zamítnout" tlačítko z `PotvrzeniList.tsx` (kapitán jen potvrzuje). V `potvrditUlovek` (`potvrzeni.actions.ts`) přijímat jen kladné potvrzení od kapitána (zamítnutí řeší rozhodčí/pořadatel přes samostatnou větev, která už existuje). Plné předělání (kontrola libovolným týmem) → 3b.

### 4.5 NULL peg guard (`potvrzeni.actions.ts:178`)
Změnit podmínku: když `ulovekTymPeg === null` a volající NENÍ rozhodčí/pořadatel → odmítnout (`NOT_NEIGHBOR_PEG`). Tj. tým bez přiděleného pegu může potvrdit jen rozhodčí.

## 5. Jeden zdroj pravdy

Práh diskvalifikace = `zavody.diskvalifikace_pocet_karet` (default 3). Používá ho: DB trigger (4.1), leaderboard (4.2), UI badge. `LeaderboardTable.tsx:164` `isDisqualified` napojit na stejný práh (předat z action, ne hardcode `>= 2`).

## 6. Testování
- `applyDisqualifikace` → vitest TDD.
- Off-by-one: skript se service role — vytvořit test závod+tým, vložit 1/2/3 karty, ověřit `cislo_karty` (1,2,3) + postihy (stopka_do, anulované ryby, diskvalifikace) + leaderboard skóre = 0 při prahu.
- Stopka: skript — udělit kartu se stopkou, zkusit `submitUlovek` → odmítnuto.
- Regrese: běžné zadání/potvrzení úlovku bez karet funguje.

## 7. Rizika
- **Trigger čte config z zavody** — ověřit, že `zavody` má sloupce (migrace 020 je přidá před úpravou triggeru, v jedné migraci, ve správném pořadí).
- **Stará data** — čistý stav DB (0 závodů), takže žádná migrace existujících karet.
- **Leaderboard řazení** — diskvalifikovaní na konec nesmí rozbít embargo logiku (skóre 0 už při embargu existuje).

## 8. Mimo rozsah (Fáze 3b)
Přivolání rozhodčího (před/po úlovku), kontrola úlovku libovolným týmem (předělání systému potvrzování), notifikace.
