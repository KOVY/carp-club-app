# Fáze 3b — Kontrola libovolným týmem: Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Umožnit potvrzení úlovku kterýmkoli týmem (ne jen sousedním pegem), s počtem potvrzení nastavitelným per závod, a dotáhnout úklid hardcode prahu diskvalifikace v UI.

**Architecture:** Migrace 021 přepíše trigger `check_ulovek_confirmation` (počítá hlasy od libovolného jiného týmu, práh = `zavody.pocet_potvrzeni`). Aplikační oprávnění + dotazy + badge přestanou filtrovat na sousední peg. UI prahy diskvalifikace se napojí na config.

**Tech Stack:** Next.js 15, TypeScript, Supabase (PL/pgSQL trigger), vitest 4.

**Pořadí nasazení:** Migrace 021 (Dušan ručně). TS přes GitHub→Vercel. DB čistá.

---

## File Structure

| Soubor | Odpovědnost | Akce |
|--------|-------------|------|
| `supabase/migrations/021_kontrola_libovolny_tym.sql` + `_rollback.sql` | přepis triggeru potvrzování | Create |
| `src/lib/permissions.ts` | `canConfirmUlovek` — libovolný tým | Modify |
| `src/lib/__tests__/permissions-confirm.test.ts` | TDD | Create |
| `src/actions/potvrzeni.actions.ts` | `getPendingPotvrzeni` — bez peg filtru | Modify |
| `src/hooks/usePendingConfirmations.ts` | badge — bez peg filtru | Modify |
| `src/components/zavod/PotvrzeniList.tsx` | text „ostatních týmů" | Modify |
| `src/components/zavod/LeaderboardTable.tsx`, `src/components/sezona/LigaTable.tsx`, `src/app/zavod/[zavodId]/admin/page.tsx`, `src/components/zavod/ZlutaKartaDialog.tsx` | práh diskvalifikace z configu | Modify |

---

## Task 1: Migrace 021 — přepis triggeru potvrzování

**Files:** Create `supabase/migrations/021_kontrola_libovolny_tym.sql`, `supabase/migrations/021_rollback.sql`

- [ ] **Step 1: Migrace** (přesný obsah)

```sql
-- 021_kontrola_libovolny_tym.sql — Fáze 3b: potvrzení libovolným týmem. Pustit ručně.
-- Trigger nově počítá hlasy od JAKÉHOKOLI jiného týmu (ne jen sousedního pegu),
-- práh = zavody.pocet_potvrzeni (default 2). UNIQUE(ulovek_id, potvrdil_tym_id) drží 1 hlas/tým.
CREATE OR REPLACE FUNCTION check_ulovek_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  ulovek_tym_id UUID;
  zavod_id_val UUID;
  required_confirmations INT;
  current_confirmations INT;
  is_confirmed_by_rozhodci BOOLEAN;
BEGIN
  IF NOT NEW.potvrzeno THEN RETURN NEW; END IF;

  SELECT u.tym_id, u.zavod_id, u.potvrzeno_rozhodcim
  INTO ulovek_tym_id, zavod_id_val, is_confirmed_by_rozhodci
  FROM ulovky u WHERE u.id = NEW.ulovek_id;

  IF is_confirmed_by_rozhodci THEN RETURN NEW; END IF;

  -- rozhodčí/pořadatel → okamžité potvrzení
  IF EXISTS (
    SELECT 1 FROM zavod_role zr
    WHERE zr.zavod_id = zavod_id_val AND zr.user_id = NEW.potvrdil_user_id
      AND zr.role IN ('rozhodci','poradatel')
  ) THEN
    UPDATE ulovky SET stav='potvrzeno', potvrzeno_rozhodcim=true, updated_at=NOW() WHERE id = NEW.ulovek_id;
    RETURN NEW;
  END IF;

  -- práh z configu závodu (nastavitelný)
  SELECT COALESCE(pocet_potvrzeni, 2) INTO required_confirmations FROM zavody WHERE id = zavod_id_val;
  required_confirmations := COALESCE(required_confirmations, 2);

  -- počítat kladná potvrzení od LIBOVOLNÉHO jiného týmu (ne vlastní)
  SELECT COUNT(*) INTO current_confirmations
  FROM potvrzeni p
  WHERE p.ulovek_id = NEW.ulovek_id
    AND p.potvrzeno = true
    AND p.potvrdil_tym_id != ulovek_tym_id;

  IF current_confirmations >= required_confirmations THEN
    UPDATE ulovky SET stav='potvrzeno', updated_at=NOW() WHERE id = NEW.ulovek_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Rollback** (obnoví peg-based trigger z 003 — viz `003_functions_triggers.sql:87-160`)

```sql
-- 021_rollback.sql — obnovení peg-based potvrzování (edge=1, ostatní=2, jen sousedi).
CREATE OR REPLACE FUNCTION check_ulovek_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  ulovek_tym_peg INT; zavod_id_val UUID; required_confirmations INT;
  current_confirmations INT; max_peg INT; min_peg INT; is_confirmed_by_rozhodci BOOLEAN;
BEGIN
  IF NOT NEW.potvrzeno THEN RETURN NEW; END IF;
  SELECT t.peg_cislo, u.zavod_id, u.potvrzeno_rozhodcim INTO ulovek_tym_peg, zavod_id_val, is_confirmed_by_rozhodci
  FROM ulovky u JOIN tymy t ON t.id = u.tym_id WHERE u.id = NEW.ulovek_id;
  IF is_confirmed_by_rozhodci THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM zavod_role zr WHERE zr.zavod_id = zavod_id_val AND zr.user_id = NEW.potvrdil_user_id AND zr.role IN ('rozhodci','poradatel')) THEN
    UPDATE ulovky SET stav='potvrzeno', potvrzeno_rozhodcim=true, updated_at=NOW() WHERE id = NEW.ulovek_id; RETURN NEW;
  END IF;
  SELECT MIN(peg_cislo), MAX(peg_cislo) INTO min_peg, max_peg FROM tymy WHERE zavod_id = zavod_id_val AND peg_cislo IS NOT NULL;
  IF ulovek_tym_peg = min_peg OR ulovek_tym_peg = max_peg THEN required_confirmations := 1; ELSE required_confirmations := 2; END IF;
  SELECT COUNT(*) INTO current_confirmations FROM potvrzeni p JOIN tymy t ON t.id = p.potvrdil_tym_id
    JOIN tymy ut ON ut.id = (SELECT tym_id FROM ulovky WHERE id = NEW.ulovek_id)
    WHERE p.ulovek_id = NEW.ulovek_id AND p.potvrzeno = true AND ABS(t.peg_cislo - ut.peg_cislo) = 1;
  IF current_confirmations >= required_confirmations THEN UPDATE ulovky SET stav='potvrzeno', updated_at=NOW() WHERE id = NEW.ulovek_id; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/021_kontrola_libovolny_tym.sql supabase/migrations/021_rollback.sql
git commit -m "feat(kontrola): migrace 021 — potvrzení libovolným týmem, práh z pocet_potvrzeni"
```

---

## Task 2: `canConfirmUlovek` — libovolný tým (TDD)

**Files:** Modify `src/lib/permissions.ts`, Create `src/lib/__tests__/permissions-confirm.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// src/lib/__tests__/permissions-confirm.test.ts
import { describe, it, expect } from 'vitest'
import { canConfirmUlovek } from '../permissions'

const ctx = (role: string, peg?: number) => ({ role, pegCislo: peg } as any)

describe('canConfirmUlovek (libovolný tým)', () => {
  it('rozhodčí může vždy', () => { expect(canConfirmUlovek(ctx('rozhodci'), 5)).toBe(true) })
  it('pořadatel může vždy', () => { expect(canConfirmUlovek(ctx('poradatel'), 5)).toBe(true) })
  it('kapitán může potvrdit nesousední peg (libovolný tým)', () => { expect(canConfirmUlovek(ctx('kapitan', 1), 9)).toBe(true) })
  it('kapitán může potvrdit sousední peg', () => { expect(canConfirmUlovek(ctx('kapitan', 4), 5)).toBe(true) })
  it('závodník nemůže', () => { expect(canConfirmUlovek(ctx('zavodnik', 4), 5)).toBe(false) })
})
```

- [ ] **Step 2: Run — fail** (`npm test` — kapitán nesousední dnes vrací false)

- [ ] **Step 3: Implementace** — uprav `canConfirmUlovek` (`permissions.ts:38-51`):

```typescript
export function canConfirmUlovek(ctx: PermissionContext, ulovekTymPeg: number): boolean {
  if (ctx.role === 'rozhodci' || ctx.role === 'poradatel') {
    return true;
  }
  // Fáze 3b: kapitán smí potvrdit úlovek libovolného týmu (ne jen sousedního pegu).
  // Vlastní tým řeší self-confirmation guard v potvrditUlovek action.
  if (ctx.role === 'kapitan') {
    return true;
  }
  return false;
}
```
(Parametr `ulovekTymPeg` ponech v signatuře kvůli volajícím — jen se už nepoužívá pro peg porovnání.)

- [ ] **Step 4: Run — pass** (`npm test`, 5 nových testů)

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts src/lib/__tests__/permissions-confirm.test.ts
git commit -m "feat(kontrola): canConfirmUlovek povolí kapitánovi libovolný tým (TDD)"
```

---

## Task 3: `getPendingPotvrzeni` — bez peg filtru

**Files:** Modify `src/actions/potvrzeni.actions.ts`

- [ ] **Step 1:** Přečti `getPendingPotvrzeni` (kolem :460-500). Najdi filtr `pegDiff === 1` (kolem :471-493), který omezuje, které úlovky kapitán vidí na sousední pegy. Odeber peg-diff podmínku tak, aby kapitán viděl čekající úlovky **všech ostatních týmů** (kromě svého — ponech podmínku „není vlastní tým" a „ještě nepotvrdil"). Pokud je tam i kontrola, že úlovek je `stav==='ceka'`, ponech ji.

Konkrétně: smaž blok, který počítá `pegDiff` a filtruje `pegDiff === 1`; ponech filtr „úlovek nepatří mému týmu" a „můj tým ho ještě nepotvrdil". Zachovej zbytek funkce (řazení, návratový tvar).

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/actions/potvrzeni.actions.ts
git commit -m "feat(kontrola): getPendingPotvrzeni ukazuje úlovky všech ostatních týmů"
```

---

## Task 4: `usePendingConfirmations` — bez peg filtru

**Files:** Modify `src/hooks/usePendingConfirmations.ts`

- [ ] **Step 1:** Přečti hook, najdi filtr `pegDiff === 1` (kolem :157-179) při počítání čekajících potvrzení pro badge. Odeber peg-diff podmínku → počítá úlovky všech ostatních týmů (kromě vlastního, které kapitán ještě nepotvrdil). Zachovej zbytek (subscription, refetch).

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/hooks/usePendingConfirmations.ts
git commit -m "feat(kontrola): badge počítá čekající potvrzení všech týmů"
```

---

## Task 5: Texty „ostatních týmů"

**Files:** Modify `src/components/zavod/PotvrzeniList.tsx`

- [ ] **Step 1:** Najdi text (`:65-67`) „Úlovky od sousedních týmů čekající na vaše potvrzení" → nahraď „Úlovky ostatních týmů čekající na vaše potvrzení". Grep i další texty se „soused" v komponentě a uprav na obecné.

- [ ] **Step 2: Build + commit**

Run: `npm run build`
```bash
git add src/components/zavod/PotvrzeniList.tsx
git commit -m "feat(kontrola): text potvrzování ostatních týmů (ne sousedních)"
```

---

## Task 6: Úklid prahu diskvalifikace v UI (z 3a)

**Files:** Modify `LeaderboardTable.tsx`, `LigaTable.tsx`, `admin/[zavodId]/page.tsx`, `ZlutaKartaDialog.tsx`

Cíl: nahradit hardcode `zluteKarty >= 2` / `count >= 2` napojením na práh diskvalifikace. Vzor: komponenta dostane práh jako prop `prahKaret: number` (default 3), nebo použije už existující `entry.isDisqualified` (z 3a) tam, kde jde o diskvalifikaci.

- [ ] **Step 1: `LeaderboardTable.tsx`** — DQ logika (opacity, řazení) už používá `entry.isDisqualified` (z 3a). Hardcode `zluteKarty >= 2` na řádcích 222/343/349/406/442 nahraď: kde jde o DQ (opacity ř. 406/442) → `entry.isDisqualified`; kde jde o barvu ikony žluté karty (222/343/349) → ponech vizuál, ale použij prop `prahKaret` (přidej do props, default 3): `zluteKarty >= prahKaret`. Rodič (kde se `<LeaderboardTable>` renderuje) předá `prahKaret` z dat závodu (`diskvalifikace_pocet_karet`), pokud je k dispozici; jinak default 3.

- [ ] **Step 2: `LigaTable.tsx`** (:45,154) — přidej prop `prahKaret = 3`, nahraď `>= 2` za `>= prahKaret`.

- [ ] **Step 3: `admin/[zavodId]/page.tsx:437`** — badge „Diskvalifikován" při `yellowCardCount >= 2`. Stránka načítá detail závodu — použij `zavodData.diskvalifikace_pocet_karet ?? 3` místo `2`.

- [ ] **Step 4: `ZlutaKartaDialog.tsx`** (:88,99,272) — dialog uděluje kartu konkrétnímu závodu. Pokud má přístup k `diskvalifikace_pocet_karet` (přes prop/závod), použij ho; jinak přidej prop `prahKaret = 3` a nahraď `>= 2`. Texty „2. žlutá karta = diskvalifikace" zobecni na „{prahKaret}. žlutá karta".

- [ ] **Step 5: Build + commit**

Run: `npm run build && npm test`
```bash
git add src/components/zavod/LeaderboardTable.tsx src/components/sezona/LigaTable.tsx "src/app/zavod/[zavodId]/page.tsx" src/components/zavod/ZlutaKartaDialog.tsx
git commit -m "fix(kontrola): napojit UI prahy diskvalifikace na config (úklid z 3a)"
```
(Pozn.: cesty souborů přizpůsob skutečným — admin badge je v `src/app/zavod/[zavodId]/admin/page.tsx`. Commitni soubory, které jsi reálně změnil.)

---

## Task 7: CHECKPOINT — build/test + review + push

**Files:** žádné (verifikace)

- [ ] **Step 1:** `npm run build && npm test` — vše zelené.
- [ ] **Step 2:** Finální review (controller dispatchne review na `git diff main..HEAD`: trigger počítá libovolný tým + práh z configu + ne vlastní tým; canConfirmUlovek; self-confirmation guard v action zachován; žádná regrese rozhodčího potvrzení; UI prahy z configu).
- [ ] **Step 3:** `git push -u origin feat/faze-3b-kontrola`. Migraci 021 pustí Dušan po deployi.

---

## Task 8: E2E + regrese + merge

**Files:** žádné (verifikace)

- [ ] **Step 1: E2E skript (service role)** — po migraci 021: test závod (`pocet_potvrzeni` default 2) + 3 týmy s NEsousedními pegy (1, 5, 9) + úlovek týmu A (peg 1, stav `ceka`). Vlož potvrzení od týmu B (peg 5, `potvrzeno=true`) → úlovek stále `ceka` (1 z 2). Vlož potvrzení od týmu C (peg 9) → úlovek `potvrzeno` (2 z 2, NEsousedi!). Ověř, že self-potvrzení (tým A potvrdí svůj) se nezapočítá. Cleanup.
- [ ] **Step 2: Regrese:** rozhodčí potvrdí úlovek → okamžitě `potvrzeno`. Self-confirmation guard v `potvrditUlovek` action odmítne vlastní tým. NULL peg guard z 3a funguje.
- [ ] **Step 3: Merge + paměť**

```bash
git checkout main && git merge --ff-only feat/faze-3b-kontrola && git push origin main
```
Aktualizovat `~/.claude/.../memory/carp_club_app.md` — Fáze 3b nasazena.

---

## Self-Review

**Spec coverage:** §3.1 oprávnění → T2; §3.2 getPending → T3; §3.3 trigger → T1; §3.4 badge → T4; §3.5 text → T5; §4 počet potvrzení (pocet_potvrzeni) → T1; §5 úklid prahů → T6; §7 testy → T2/T8. **Pokryto.** (§3.6 useRealtimeNotifications — mrtvý kód, odloženo na 3c dle spec.)

**Placeholder scan:** Trigger doslova, canConfirmUlovek doslova, test doslova. Task 3/4/6 mají „najdi a odeber peg filtr" s konkrétní lokací + popisem co zachovat — ne „TODO".

**Type consistency:** `canConfirmUlovek(ctx, ulovekTymPeg)` signatura zachována, `pocet_potvrzeni`, `prahKaret`, `entry.isDisqualified` (z 3a) konzistentní.

**Předpoklady k ověření:** přesné řádky peg filtru v `getPendingPotvrzeni`/`usePendingConfirmations` (kroky mají lokaci + popis); zda komponenty mají přístup k `diskvalifikace_pocet_karet` (jinak prop default 3).
