# Fáze 3a — Zpevnit pravidla: Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opravit 5 bugů pravidlové vrstvy (žluté karty off-by-one, leaderboard diskvalifikace, stopka server-side, zamítnutí, NULL peg) a sjednotit pravidla 2026 do jednoho nastavitelného zdroje pravdy.

**Architecture:** Migrace 020 přidá config per závod a opraví trigger žlutých karet (počítá včetně vkládané karty, prahy/hodiny z configu). Leaderboard vynuluje skóre diskvalifikovaných (čistá funkce TDD). Stopka se vynutí v `submitUlovek` přes existující RPC. Drobné opravy autorizace potvrzování.

**Tech Stack:** Next.js 15, TypeScript, Supabase (PL/pgSQL triggery), vitest 4.

**Pořadí nasazení:** Migrace 020 (Dušan ručně) — config sloupce + trigger v JEDNÉ migraci. TS přes GitHub→Vercel. DB čistá (0 závodů).

---

## File Structure

| Soubor | Odpovědnost | Akce |
|--------|-------------|------|
| `supabase/migrations/020_pravidla_fix.sql` + `_rollback.sql` | config sloupce + oprava triggeru + drop staré funkce | Create |
| `src/lib/errors.ts` | `STOPKA_ACTIVE` | Modify |
| `src/lib/scoring.ts` (nebo nový `src/lib/disqualifikace.ts`) | `applyDisqualifikace` čistá funkce | Modify/Create |
| `src/lib/__tests__/disqualifikace.test.ts` | TDD | Create |
| `src/actions/ulovky.actions.ts` | stopka server-side v `submitUlovek` | Modify |
| `src/actions/leaderboard.actions.ts` | vynulování skóre + řazení diskvalifikovaných | Modify |
| `src/components/zavod/LeaderboardTable.tsx` | práh diskvalifikace z dat (ne hardcode) | Modify |
| `src/actions/potvrzeni.actions.ts` | NULL peg guard | Modify |
| `src/components/zavod/PotvrzeniList.tsx` | odebrat mrtvé „Zamítnout" | Modify |

---

## Task 1: Migrace 020 — config + oprava triggeru žlutých karet

**Files:** Create `supabase/migrations/020_pravidla_fix.sql`, `supabase/migrations/020_rollback.sql`

- [ ] **Step 1: Migrace**

```sql
-- 020_pravidla_fix.sql — Fáze 3a: nastavitelná pravidla + oprava off-by-one. Pustit ručně.

-- Config per závod (nastavitelné prahy/hodiny)
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS diskvalifikace_pocet_karet INT DEFAULT 3;
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS stopka_hodiny_1_karta INT DEFAULT 3;
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS stopka_hodiny_2_karta INT DEFAULT 6;

-- Oprava triggeru: počítat VČETNĚ vkládané karty (nove_cislo = COUNT + 1),
-- prahy/hodiny z configu závodu.
CREATE OR REPLACE FUNCTION check_yellow_cards_2026()
RETURNS TRIGGER AS $$
DECLARE
  card_count INT;     -- počet karet PŘED vložením
  nove_cislo INT;     -- pořadí vkládané karty (od 1)
  last_catch_id UUID;
  v_prah INT;
  v_stopka_1 INT;
  v_stopka_2 INT;
BEGIN
  SELECT COUNT(*) INTO card_count
  FROM zlute_karty WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;
  nove_cislo := card_count + 1;
  NEW.cislo_karty := nove_cislo;

  SELECT COALESCE(diskvalifikace_pocet_karet, 3),
         COALESCE(stopka_hodiny_1_karta, 3),
         COALESCE(stopka_hodiny_2_karta, 6)
  INTO v_prah, v_stopka_1, v_stopka_2
  FROM zavody WHERE id = NEW.zavod_id;
  v_prah := COALESCE(v_prah, 3);
  v_stopka_1 := COALESCE(v_stopka_1, 3);
  v_stopka_2 := COALESCE(v_stopka_2, 6);

  IF nove_cislo >= v_prah THEN
    -- diskvalifikace: anulovat všechny ryby, žádná stopka
    UPDATE ulovky SET stav = 'zamitnuto', updated_at = NOW()
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;
    NEW.stopka_do := NULL;
  ELSIF nove_cislo = 2 THEN
    -- anulovat všechny ryby + stopka 2
    UPDATE ulovky SET stav = 'zamitnuto', updated_at = NOW()
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id;
    IF NEW.stopka_do IS NULL THEN NEW.stopka_do := NOW() + (v_stopka_2 || ' hours')::INTERVAL; END IF;
  ELSIF nove_cislo = 1 THEN
    -- odebrání poslední ryby + stopka 1
    SELECT id INTO last_catch_id FROM ulovky
    WHERE tym_id = NEW.tym_id AND zavod_id = NEW.zavod_id AND stav IN ('potvrzeno','ceka')
    ORDER BY cas DESC LIMIT 1;
    IF last_catch_id IS NOT NULL THEN
      UPDATE ulovky SET stav = 'zamitnuto', updated_at = NOW() WHERE id = last_catch_id;
      NEW.odebrana_ryba_id := last_catch_id;
    END IF;
    IF NEW.stopka_do IS NULL THEN NEW.stopka_do := NOW() + (v_stopka_1 || ' hours')::INTERVAL; END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Úklid: odpojená stará funkce z migrace 003 (trigger už byl dropnut v 014)
DROP FUNCTION IF EXISTS check_yellow_cards();
```

- [ ] **Step 2: Rollback**

```sql
-- 020_rollback.sql — vrátí původní (off-by-one) trigger a odebere config sloupce.
-- (Pozn.: obnovuje chování PŘED 3a; používat jen v nouzi.)
ALTER TABLE zavody DROP COLUMN IF EXISTS diskvalifikace_pocet_karet;
ALTER TABLE zavody DROP COLUMN IF EXISTS stopka_hodiny_1_karta;
ALTER TABLE zavody DROP COLUMN IF EXISTS stopka_hodiny_2_karta;
-- Trigger funkci necháváme opravenou (rollback configu, ne logiky) — opravená logika
-- nezávisí na sloupcích (má COALESCE fallback 3/3/6).
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/020_pravidla_fix.sql supabase/migrations/020_rollback.sql
git commit -m "feat(pravidla): migrace 020 — nastavitelné prahy + oprava off-by-one žlutých karet"
```

---

## Task 2: ErrorCode STOPKA_ACTIVE

**Files:** Modify `src/lib/errors.ts`

- [ ] **Step 1:** Do `ErrorCodes` přidej `STOPKA_ACTIVE: 'STOPKA_ACTIVE',` a do `ErrorMessages`: `[ErrorCodes.STOPKA_ACTIVE]: 'Tým má aktivní stopku, úlovek nelze zadat',`.

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/lib/errors.ts
git commit -m "feat(pravidla): error kód STOPKA_ACTIVE"
```

---

## Task 3: Čistá funkce `applyDisqualifikace` (TDD)

**Files:** Create `src/lib/disqualifikace.ts`, `src/lib/__tests__/disqualifikace.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// src/lib/__tests__/disqualifikace.test.ts
import { describe, it, expect } from 'vitest'
import { applyDisqualifikace, jeDiskvalifikovan } from '../disqualifikace'

describe('jeDiskvalifikovan', () => {
  it('méně karet než práh → false', () => { expect(jeDiskvalifikovan(2, 3)).toBe(false) })
  it('karet >= práh → true', () => { expect(jeDiskvalifikovan(3, 3)).toBe(true) })
  it('práh 2 → true při 2 kartách', () => { expect(jeDiskvalifikovan(2, 2)).toBe(true) })
})
describe('applyDisqualifikace', () => {
  it('nediskvalifikovaný → skóre beze změny', () => { expect(applyDisqualifikace(42.5, 1, 3)).toBe(42.5) })
  it('diskvalifikovaný → skóre 0', () => { expect(applyDisqualifikace(42.5, 3, 3)).toBe(0) })
})
```

- [ ] **Step 2: Run — fail** (`npm test` → `Cannot find module '../disqualifikace'`)

- [ ] **Step 3: Implementace**

```typescript
// src/lib/disqualifikace.ts
/** Tým je diskvalifikovaný, když má počet žlutých karet >= práh závodu. */
export function jeDiskvalifikovan(pocetKaret: number, prah: number): boolean {
  return pocetKaret >= prah
}
/** Diskvalifikovaný tým má skóre 0. */
export function applyDisqualifikace(skore: number, pocetKaret: number, prah: number): number {
  return jeDiskvalifikovan(pocetKaret, prah) ? 0 : skore
}
```

- [ ] **Step 4: Run — pass** (`npm test`, 5 nových testů)

- [ ] **Step 5: Commit**

```bash
git add src/lib/disqualifikace.ts src/lib/__tests__/disqualifikace.test.ts
git commit -m "feat(pravidla): logika diskvalifikace (TDD)"
```

---

## Task 4: Stopka server-side v `submitUlovek`

**Files:** Modify `src/actions/ulovky.actions.ts`

- [ ] **Step 1:** V `submitUlovek` PŘED insertem úlovku (po ověření členství/oprávnění, kolem :351, ale PŘED storage uploadem) přidej kontrolu aktivní stopky přes existující RPC `tym_has_active_stopka`. Najdi místo, kde je už k dispozici `tymId`/`membershipData.tym_id` a `zavodId`, a `adminClient`/`supabase`. Vlož:
```typescript
  // Pravidla 2026: tým s aktivní stopkou nesmí zadat úlovek (server-side vynucení)
  const { data: maStopku } = await (adminClient as any).rpc('tym_has_active_stopka', {
    p_tym_id: membershipData.tym_id, p_zavod_id: zavodId,
  })
  if (maStopku === true) {
    return { success: false, error: { code: ErrorCodes.STOPKA_ACTIVE, message: ErrorMessages[ErrorCodes.STOPKA_ACTIVE] } }
  }
```
Použij skutečný název proměnné pro tým ID v té funkci (z průzkumu `membershipData.tym_id`; ověř v kódu) a existující `adminClient`. Pokud `adminClient` v té části ještě není vytvořený, použij ten, který se používá pro upload níže, nebo vytvoř `createAdminClient()`.

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/actions/ulovky.actions.ts
git commit -m "fix(pravidla): stopka vynucená server-side v submitUlovek"
```

---

## Task 5: Leaderboard — vynulování skóre + řazení diskvalifikovaných

**Files:** Modify `src/actions/leaderboard.actions.ts`, `src/components/zavod/LeaderboardTable.tsx`

- [ ] **Step 1:** V `leaderboard.actions.ts` (kolem :166-197) načti práh diskvalifikace ze závodu. Najdi, kde se načítá `zavod` (detail) — přidej do selectu `diskvalifikace_pocet_karet`. Importuj `applyDisqualifikace, jeDiskvalifikovan` z `@/lib/disqualifikace`. V mapování entry (kolem :188) uprav `skore`:
```typescript
      const prah = (zavodData?.diskvalifikace_pocet_karet as number) ?? 3
      const skoreRaw = canSeeWeights ? scoringResult.skore : 0
      const skore = applyDisqualifikace(skoreRaw, zluteKartyCount, prah)
      const isDisqualified = jeDiskvalifikovan(zluteKartyCount, prah)
```
A do návratového objektu přidej `isDisqualified`. (Pokud `LeaderboardEntry` typ nemá `isDisqualified`, přidej ho do typu v `types.ts`.)

- [ ] **Step 2:** Řazení — diskvalifikované na konec. Najdi `sortLeaderboard` (`scoring.ts:56-75`) nebo místo řazení v action. Uprav komparátor: diskvalifikovaní (`isDisqualified === true`) vždy za nediskvalifikovanými, jinak podle `skore` desc / `poradiCas`. Pokud `sortLeaderboard` nemá přístup k `isDisqualified`, prováděj řazení v action po výpočtu:
```typescript
  leaderboardEntries.sort((a, b) => {
    if (a.isDisqualified !== b.isDisqualified) return a.isDisqualified ? 1 : -1
    if (b.skore !== a.skore) return b.skore - a.skore
    return (a.poradiCas ?? 0) - (b.poradiCas ?? 0)
  })
```

- [ ] **Step 3:** `LeaderboardTable.tsx:164` — nahraď hardcode `const isDisqualified = zluteKarty >= 2` za hodnotu z entry: `const isDisqualified = entry.isDisqualified ?? false`. Zobraz skóre 0 + štítek „Diskvalifikováno" u takového řádku.

- [ ] **Step 4: Build + commit**

Run: `npm run build && npm test`
```bash
git add src/actions/leaderboard.actions.ts src/components/zavod/LeaderboardTable.tsx src/lib/types.ts
git commit -m "fix(pravidla): leaderboard vynuluje skóre diskvalifikovaných + řadí na konec"
```

---

## Task 6: NULL peg guard v potvrzování

**Files:** Modify `src/actions/potvrzeni.actions.ts`

- [ ] **Step 1:** Najdi blok kolem :167-186 (self-confirmation + neighbor peg guard). Aktuálně neighbor check běží jen `if (ulovekTymPeg !== null && ...)`. Uprav tak, aby tým s `peg_cislo === null` mohl potvrdit JEN rozhodčí/pořadatel:
```typescript
    // Tým bez přiděleného pegu může potvrdit jen rozhodčí/pořadatel (jinak by ho potvrdil kdokoli)
    const jeRozhodci = permissionCtx.role === 'rozhodci' || permissionCtx.role === 'poradatel' || permissionCtx.role === 'hlavni_admin'
    if (ulovekTymPeg === null && !jeRozhodci) {
      return { success: false, error: { code: ErrorCodes.NOT_NEIGHBOR_PEG, message: ErrorMessages[ErrorCodes.NOT_NEIGHBOR_PEG] } }
    }
    if (ulovekTymPeg !== null && !canConfirmUlovek(permissionCtx, ulovekTymPeg)) {
      return { success: false, error: { code: ErrorCodes.NOT_NEIGHBOR_PEG, message: ErrorMessages[ErrorCodes.NOT_NEIGHBOR_PEG] } }
    }
```
Ověř skutečné názvy `permissionCtx.role` a hodnoty rolí v souboru (z `permissions.ts`). Použij existující `ErrorCodes.NOT_NEIGHBOR_PEG`.

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/actions/potvrzeni.actions.ts
git commit -m "fix(pravidla): potvrzení týmu bez pegu jen rozhodčím (NULL peg díra)"
```

---

## Task 7: Odebrat mrtvé „Zamítnout" kapitánovi

**Files:** Modify `src/components/zavod/PotvrzeniList.tsx`

- [ ] **Step 1:** Najdi tlačítko/akci „Zamítnout" pro kapitána (posílá `potvrzeno=false` přes `potvrditUlovek`). Protože trigger negativní hlasy ignoruje (mrtvá funkce), odeber toto tlačítko z UI kapitána. Ponech „Potvrdit". Rozhraní rozhodčího (zamítnutí) zůstává beze změny. (Grep: `Zamítnout` / `potvrzeno: false` / `potvrzeno={false}` v komponentě.)

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/components/zavod/PotvrzeniList.tsx
git commit -m "fix(pravidla): odebrat nefunkční zamítnutí kapitánem (řeší rozhodčí)"
```

---

## Task 8: CHECKPOINT — build/test + review + push

**Files:** žádné (verifikace)

- [ ] **Step 1:** `npm run build && npm test` — vše zelené.
- [ ] **Step 2:** Finální review (controller dispatchne review na `git diff main..HEAD`: off-by-one trigger korektní, diskvalifikace konzistentní napříč DB/leaderboard/UI, stopka server-side, NULL peg, žádná regrese scoringu).
- [ ] **Step 3:** `git push -u origin feat/faze-3a-pravidla`. Migraci 020 pustí Dušan po deployi.

---

## Task 9: E2E + regrese + merge

**Files:** žádné (verifikace)

- [ ] **Step 1: E2E skript (vzor předchozích fází, service role)** — po migraci 020: vytvořit test závod (defaulty 3/3/6) + tým + 3 potvrzené ryby. Udělit kartu 1 → ověřit `cislo_karty=1`, poslední ryba `zamitnuto`, `stopka_do` ~3h. Karta 2 → `cislo_karty=2`, všechny ryby `zamitnuto`, stopka ~6h. Karta 3 → `cislo_karty=3`, diskvalifikace. Ověřit `tym_has_active_stopka` vrací true během stopky. Cleanup.
- [ ] **Step 2:** Stopka server-side: udělit kartu se stopkou, zkusit insert úlovku přes `submitUlovek` (nebo přímý test logiky) → odmítnuto `STOPKA_ACTIVE`.
- [ ] **Step 3:** Leaderboard: tým s 3 kartami má skóre 0 a je na konci.
- [ ] **Step 4: Regrese:** běžné zadání + potvrzení úlovku bez karet funguje; embargo (skóre 0) nerozbité.
- [ ] **Step 5: Merge + paměť**

```bash
git checkout main && git merge --ff-only feat/faze-3a-pravidla && git push origin main
```
Aktualizovat `~/.claude/.../memory/carp_club_app.md` — Fáze 3a nasazena.

---

## Self-Review

**Spec coverage:** §3 config → T1; §4.1 off-by-one → T1; §4.2 leaderboard → T3+T5; §4.3 stopka → T2+T4; §4.4 zamítnutí → T7; §4.5 NULL peg → T6; §5 zdroj pravdy → T1+T5 (práh z configu); §6 testy → T3/T9. **Pokryto.**

**Placeholder scan:** Migrace + applyDisqualifikace + guard kód doslovné. Místa „najdi blok a uprav" mají konkrétní before/after kód + ověřovací pokyn (skutečné názvy proměnných), ne „TODO".

**Type consistency:** `applyDisqualifikace(skore, pocetKaret, prah)`, `jeDiskvalifikovan(pocetKaret, prah)`, `isDisqualified`, `diskvalifikace_pocet_karet`, `STOPKA_ACTIVE`, `tym_has_active_stopka(p_tym_id, p_zavod_id)` konzistentní napříč T1–T9.

**Předpoklady k ověření za běhu:** přesné názvy proměnných v `submitUlovek` (tym ID), `permissionCtx.role` hodnoty, umístění řazení (sortLeaderboard vs action), tlačítko „Zamítnout" v PotvrzeniList — kroky obsahují ověřovací pokyn.
