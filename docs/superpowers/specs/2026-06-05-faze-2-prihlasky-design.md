# Fáze 2 — Samoobslužné hlášení na závod (přihlášky)

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-05
- **Status:** Design schválen, čeká na review spec
- **Autoři:** Dušan + Claude
- **Předchozí:** Fáze 0 (security) + Fáze 1 (auth) nasazeny. DB čistá (0 závodů po úklidu testovacích dat).

---

## 1. Kontext a princip

Dnes se tým do závodu dostane jen přes pořadatele (admin-create / pozvánka). Fáze 2 přidá **samoobslužné hlášení**: registrovaný rybář (z Fáze 1) se sám přihlásí na vypsaný závod. Realizováno jako **inkrement nad stávajícím modelem** — tabulka `tymy`, scoring, leaderboard, RLS i pozvánky zůstávají **netknuté**. Přihlášky jsou nová vrstva nad nimi.

**Klíčové rozhodnutí (z brainstormingu):** hlásí se **jednotlivec, který tím zakládá tým a stává se kapitánem**. Tým nemusí existovat předem — vzniká až schválením přihlášky. Globální týmy napříč sezónami jsou vědomě odloženy (ortogonální feature).

## 2. Cíl a rozsah

**Ano:** kapacita závodu (počet pegů), samo-přihlášení rybáře (zakládá tým, píše členy jako jména), automatické řazení přihlášen/náhradník, pořadatelská správa (schválit/odhlásit), postup náhradníka.
**Ne (navazuje):** globální týmy, automatické platby, notifikace náhradníkům (→ Fáze 4), pohodlné UI „udělej uživatele pořadatelem".

## 3. Datový model

### 3.1 `zavody` + kapacita
```sql
ALTER TABLE zavody ADD COLUMN IF NOT EXISTS pocet_pegu INT;
-- NULL = neomezeno / nevypsáno; >0 = kapacita pro samo-přihlášení
```

### 3.2 Nová tabulka `prihlasky` (migrace 019)
```sql
CREATE TABLE prihlasky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  kapitan_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nazev_tymu TEXT NOT NULL,
  clenove TEXT,                      -- jména členů jako volný text (bez účtů)
  stav TEXT NOT NULL DEFAULT 'prihlasen'
       CHECK (stav IN ('prihlasen','nahradnik','schvaleno','zruseno')),
  poradi_nahradnika INT,             -- 1,2,3… jen když stav='nahradnik'
  tym_id UUID REFERENCES tymy(id) ON DELETE SET NULL,  -- vyplní se po schválení
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zavod_id, kapitan_user_id)  -- jeden účet = jedna přihláška na závod
);
CREATE INDEX idx_prihlasky_zavod ON prihlasky(zavod_id);
CREATE INDEX idx_prihlasky_kapitan ON prihlasky(kapitan_user_id);
```

### 3.3 RLS politiky (poučeno z Fáze 0 — granularita od začátku)
```sql
ALTER TABLE prihlasky ENABLE ROW LEVEL SECURITY;

-- Čtení: vlastník své, kdokoli veřejně (jen pro zobrazení obsazenosti — obsahuje jen
-- nazev_tymu/jmena, žádné PII). Pořadatel/admin přes server actions (service role).
CREATE POLICY "Prihlasky viewable by everyone" ON prihlasky FOR SELECT USING (true);

-- Vložení: jen přihlášený uživatel sám za sebe
CREATE POLICY "User can insert own prihlaska" ON prihlasky
  FOR INSERT TO authenticated WITH CHECK (kapitan_user_id = auth.uid());

-- Update/Delete vlastníkem (zrušit svou) — ostatní změny stavu jdou přes service role
CREATE POLICY "User can update own prihlaska" ON prihlasky
  FOR UPDATE TO authenticated USING (kapitan_user_id = auth.uid());
```
Pozn.: schválení/odhlášení pořadatelem a postup náhradníka běží **server-side přes service role** po `checkZavodAdminAccess` (vzor z Fáze 0 — scope na konkrétní `zavod_id`).

## 4. Lifecycle přihlášky

```
                  prihlasitNaZavod
   (nový)  ─────────────────────────►  prihlasen   (je volno)
                                   └─►  nahradnik   (plno, pořadí N)

   prihlasen ──schvalitPrihlasku──►  schvaleno  (+ vznikne tým)
   prihlasen ──zrusit/odebrat────►  zruseno    (→ 1. náhradník postoupí na prihlasen)
   nahradnik ──(volno se uvolní)─►  prihlasen  (automaticky)
   nahradnik ──zrusit/odebrat────►  zruseno    (→ přečíslovat zbylé náhradníky)
```

## 5. Kapacita a náhradníci — přesná logika

- **Obsazenost** = `COUNT(prihlasky WHERE zavod_id=X AND stav IN ('prihlasen','schvaleno'))`.
- **Volno** = `pocet_pegu - obsazenost` (pokud `pocet_pegu` je NULL → považuj za neomezeno, vždy `prihlasen`).
- **Nová přihláška:** `volno > 0` → `prihlasen`; jinak `nahradnik` s `poradi_nahradnika = (MAX poradi mezi náhradníky závodu) + 1` (nebo 1).
- **Uvolnění místa** (přihlášený/schválený → zruseno/odebrán): najdi náhradníka s nejnižším `poradi_nahradnika` → nastav `prihlasen`, ostatním náhradníkům sniž `poradi` o 1.
- **Concurrency (known limitation):** dva současné pokusy o poslední peg mohou oba projít jako `prihlasen`. Mitigace: `UNIQUE(zavod_id, kapitan_user_id)` brání duplicitě téhož usera; hraniční přeplnění řeší **pořadatel ručně** (má vždy poslední slovo). Plná atomicita by vyžadovala DB RPC — mimo rozsah Fáze 2 (zdokumentováno, ne skryto).

## 6. Server actions (`src/actions/prihlasky.actions.ts`)

| Action | Kdo | Co dělá |
|--------|-----|---------|
| `prihlasitNaZavod(zavodId, {nazevTymu, clenove})` | přihlášený rybář | vytvoří přihlášku, určí prihlasen/nahradnik dle kapacity |
| `zrusitPrihlasku(prihlaskaId)` | vlastník | stav='zruseno'; pokud byl prihlasen → náhradník postoupí |
| `getMojePrihlasky()` | rybář | seznam vlastních přihlášek + stav |
| `getPrihlaskyZavodu(zavodId)` | pořadatel | přihlášení + náhradníci v pořadí (přes service role + scope check) |
| `schvalitPrihlasku(prihlaskaId)` | pořadatel | vytvoří tým přes `createTym`, nastaví `tym_id`, stav='schvaleno' |
| `odebratPrihlasku(prihlaskaId)` | pořadatel | stav='zruseno'; náhradník postoupí |
| `nastavitPocetPegu(zavodId, pocet)` | pořadatel | `zavody.pocet_pegu` |

Všechny pořadatelské actions ověří oprávnění přes `checkZavodAdminAccess(zavodId)` (scope na daný závod, vzor Fáze 0). `ActionResult<T>` jako zbytek codebase.

## 7. UI

**Rybář** (na detailu vypsaného závodu, `/zavod/[zavodId]` nebo veřejný náhled):
- Tlačítko **„Přihlásit na závod"** (jen pro přihlášené; jinak odkaz na `/login`).
- Formulář: název týmu + textové pole „členové" (jména).
- Po přihlášení indikátor stavu: „✅ Jsi přihlášen" / „⏳ Jsi náhradník č. 2".
- Zobrazení obsazenosti: „Obsazeno 18/20 pegů".

**Pořadatel** (admin sekce závodu):
- Nastavení **počtu pegů** u závodu.
- Seznam přihlášek: přihlášení (s názvem týmu, kapitánem, členy) + náhradníci v pořadí.
- Akce **Schválit** (→ vznikne tým) / **Odhlásit**.

## 8. Most na stávající model

Schválení (`schvalitPrihlasku`) zavolá **existující `createTym`** (`admin.actions.ts`): kapitán = `kapitan_user_id`, název = `nazev_tymu`. Vrácené `tym.id` se uloží do `prihlasky.tym_id`. Jména členů zůstávají v `prihlasky.clenove` (informativně); člen s vlastním účtem se přidá později přes **pozvánkový systém** (beze změny). Pegy se přidělují jako dnes (`losujPegy`) — přihlášky řeší KDO je v závodě, ne přidělení pegu.

## 9. Testování

- **Logika kapacity/náhradníků** (čistá funkce `resolvePrihlaskaStav(obsazenost, pocetPegu, maxPoradi)`) → vitest TDD.
- **Flow:** přihlášení do volného závodu → prihlasen; do plného → nahradnik; zrušení přihlášeného → náhradník postoupí; schválení → vznikne tým.
- **RLS probe** (vzor Fáze 0): anon nemůže vložit cizí přihlášku; uživatel nevidí/nemění cizí přihlášku přes RLS klienta; pořadatel závodu A neschválí přihlášku závodu B.
- **Regrese:** stávající tvorba týmů/pozvánky/scoring beze změny.

## 10. Rizika

- **Concurrency na posledním pegu** (viz §5) — pořadatel doladí; zdokumentováno.
- **Schválení vytváří tým** — ověřit, že `createTym` nevyžaduje pole, která přihláška nemá (název + kapitán stačí; ověří plán).
- **Čistý stav DB** — `pocet_pegu` u stávajících závodů NULL (neomezeno) než ho pořadatel nastaví; samo-přihlášení dává smysl až s vyplněnou kapacitou (UI to ošetří).

## 11. Mimo rozsah (navazuje)

- **Fáze 4:** notifikace náhradníkům (postup, uvolněné místo), sezónní rozesílky.
- Globální týmy napříč sezónami, automatické platby, atomické RPC pro kapacitu.
- UI pro povýšení uživatele na pořadatele (samostatný kousek).
