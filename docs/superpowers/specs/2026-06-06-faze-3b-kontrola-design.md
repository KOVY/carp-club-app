# Fáze 3b — Kontrola úlovku libovolným týmem + úklid prahů

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-06
- **Status:** Design schválen, čeká na review spec
- **Předchozí:** Fáze 0/1/2/3a nasazeny.

---

## 1. Kontext

Dnes úlovek čekající na potvrzení smí potvrdit jen kapitán **sousedního pegu** (±1); trigger počítá jen hlasy sousedů a práh je hardcoded (1 edge / 2 ostatní). Dušan rozhodl (z reálných pravidel): kontrolu má dělat **kterýkoli tým**, ne jen soused. Zároveň dotáhneme úklid z 3a — 11 míst v UI pořád hardcoduje práh diskvalifikace `>= 2` místo configu.

## 2. Cíl a rozsah

**Ano:** potvrzení libovolným týmem (kromě vlastního), počet potvrzení nastavitelný (`zavody.pocet_potvrzeni`, default 2), úklid hardcode prahu diskvalifikace.
**Ne (→ 3c):** přivolání rozhodčího, chat, realtime „zvoneček".

## 3. Kontrola libovolným týmem

### 3.1 Oprávnění — `src/lib/permissions.ts:38-51` (`canConfirmUlovek`)
Kapitán smí potvrdit úlovek libovolného týmu (peg už nehraje roli). Vlastní tým řeší self-confirmation guard v action (zůstává). Úprava: větev `kapitan` vrací `true` (bez peg ±1 podmínky). Rozhodčí/pořadatel beze změny (`true`).

### 3.2 Co kapitán vidí — `src/actions/potvrzeni.actions.ts:471-493` (`getPendingPotvrzeni`)
Odebrat filtr `pegDiff === 1` → kapitán vidí čekající úlovky **všech ostatních týmů** (kromě svého, kromě už potvrzených svým týmem).

### 3.3 DB trigger — `supabase/migrations/021` (přepis `check_ulovek_confirmation`)
- Počítat potvrzení od **libovolného** týmu (odebrat `ABS(t.peg_cislo - ut.peg_cislo) = 1`), jen `potvrdil_tym_id != ulovek.tym_id` (ne vlastní) a `potvrzeno = true`.
- Práh = `zavody.pocet_potvrzeni` (default 2) místo hardcode 1/2. Načíst z `zavody` (COALESCE fallback 2).
- Při dosažení prahu → `stav = 'potvrzeno'`.

### 3.4 Badge — `src/hooks/usePendingConfirmations.ts:157-179`
Odebrat `pegDiff === 1` → počítá úlovky všech ostatních týmů.

### 3.5 Text — `src/components/zavod/PotvrzeniList.tsx:65-67`
„Úlovky od sousedních týmů" → „Úlovky ostatních týmů čekající na potvrzení".

### 3.6 (volitelně) `useRealtimeNotifications.ts:61-97` — `isNeighborPeg`
Mrtvý kód (nezapojený), ale pro konzistenci: rozšířit toast na úlovky všech týmů. Pokud by to zvětšovalo rozsah, ponechat na 3c (kde se realtime oživuje).

## 4. Počet potvrzení nastavitelný

`zavody.pocet_potvrzeni` (sloupec existuje, `001:46`, default 2) — trigger ho začne používat (3.3). Žádná migrace sloupce, jen logika triggeru. UI „X / 2" (`admin/page.tsx:352`) napojit na `pocet_potvrzeni` (předat z action, nebo nechat dynamicky dle `potvrzeni.length`).

## 5. Úklid prahů diskvalifikace (11 míst)

Hardcode `zluteKarty >= 2` → napojit na `zavody.diskvalifikace_pocet_karet` (z configu, z 3a). Místa:
- `LeaderboardTable.tsx` (:222,343,349,406,442 — barvy/opacity; DQ logika už používá `entry.isDisqualified` z 3a) → přidat prop `prahKaret` nebo použít `entry.isDisqualified` i pro barvu.
- `LigaTable.tsx` (:45,154) — sezónní liga.
- `admin/[zavodId]/page.tsx:437` — badge „Diskvalifikován".
- `ZlutaKartaDialog.tsx` (:88,99,272) — text/badge „2. žlutá karta".
Práh protáhnout z dat (action vrací práh, nebo prop). Kde komponenta nemá přístup k závodu, předat práh jako prop.

## 6. Co zůstává
Rozhodčí/pořadatel okamžité potvrzení; self-confirmation guard (vlastní tým ne); NULL peg guard z 3a (tým bez pegu → jen rozhodčí); UNIQUE(ulovek_id, potvrdil_tym_id) (1 hlas/tým).

## 7. Testování
- `canConfirmUlovek` (kapitán libovolného týmu → true; vlastní tým řeší action) → vitest TDD.
- Trigger E2E: dva NEsousední týmy potvrdí úlovek → `stav='potvrzeno'` při dosažení `pocet_potvrzeni`.
- Regrese: rozhodčí potvrzení funguje; self-confirmation odmítnuto; diskvalifikační badge sedí s prahem.

## 8. Rizika
- **Trigger čte `pocet_potvrzeni`** — ověřit sloupec existuje (001:46, ano).
- **View úklid napříč komponentami** — protažení prahu; ověřit, že komponenty mají k prahu přístup (prop/entry).
- **Self-confirmation v triggeru** — zajistit `potvrdil_tym_id != ulovek.tym_id` v počítání (jinak by si tým mohl potvrdit sám přes vložení potvrzeni — ale action self-guard to blokuje; trigger pro jistotu taky).

## 9. Mimo rozsah (Fáze 3c)
Přivolání rozhodčího (entita + UI před/po úlovku), oživení realtime notifikací (zvoneček po vložení fotky, číslo pegu), chat uvnitř závodu.
