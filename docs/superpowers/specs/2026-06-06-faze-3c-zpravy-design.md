# Fáze 3c — Zprávy + přivolání rozhodčího + zvoneček

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-06
- **Status:** Design schválen, čeká na review spec
- **Předchozí:** Fáze 0/1/2/3a/3b nasazeny.

---

## 1. Kontext

Realtime infrastruktura v kódu existuje (`useRealtimeNotifications`/`useRealtimeUlovky` přes Supabase Realtime), ale je nezapojená („mrtvý kód"). Žádná chat ani notifikační entita v DB neexistuje. Rozhodnutí (Dušan): **jeden systém zpráv uvnitř závodu** (cesta A) — chat i přivolání rozhodčího jsou typy téže zprávy. Přivolání se zobrazí kompaktně ikonou 🔔 + číslo pegu (ne dlouhý text) a u rozhodčího „pípne".

## 2. Cíl a rozsah

**Ano:** tabulka `zpravy` (chat + přivolání), chat UI uvnitř závodu, přivolání tlačítkem 🔔 (peg auto), vyřízení přivolání rozhodčím, realtime „zvoneček" pro rozhodčího + živý chat.
**Ne (→ Fáze 4):** skupiny v chatu, soukromé zprávy, mazání, push notifikace mimo aplikaci.

## 3. Datový model (migrace 022)

```sql
CREATE TABLE zpravy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  autor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  typ TEXT NOT NULL DEFAULT 'chat' CHECK (typ IN ('chat','privolani')),
  text TEXT,                 -- u chatu
  peg_cislo INT,             -- u přivolání
  vyrizeno BOOLEAN DEFAULT FALSE,  -- u přivolání: rozhodčí odbavil
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_zpravy_zavod ON zpravy(zavod_id, created_at);

ALTER TABLE zpravy ENABLE ROW LEVEL SECURITY;
-- Čtení: přihlášení (chat závodu není citlivý; filtr zavod_id je v dotazu/subscription).
-- Realtime vyžaduje klientský SELECT, proto USING(true) pro authenticated.
CREATE POLICY "Zpravy viewable by authenticated" ON zpravy FOR SELECT TO authenticated USING (true);
-- Vložení: jen sám za sebe
CREATE POLICY "User can insert own zprava" ON zpravy
  FOR INSERT TO authenticated WITH CHECK (autor_user_id = auth.uid());
-- UPDATE (vyrizeno) jen přes service role (rozhodčí action) — žádná klientská UPDATE policy.

-- Realtime publikace
ALTER PUBLICATION supabase_realtime ADD TABLE zpravy;
```
Pozn.: zúžení SELECT na účastníky závodu (RLS join na `zavod_role`/`clenove_tymu`) je možné později; pro 3c chat není tajný a realtime to zjednodušuje.

## 4. Chat uvnitř závodu

- Komponenta `ZavodChat` na stránce závodu (`/zavod/[zavodId]`, sekce nebo záložka). Seznam zpráv (autor + text + čas) + input + odeslat.
- Píše/vidí kdokoli přihlášený v závodě.
- Server actions (`src/actions/zpravy.actions.ts`): `poslatZpravu(zavodId, text)`, `getZpravy(zavodId)`.
- Realtime: subscription na `zpravy` (filtr `zavod_id`) → nové zprávy naživo (oživit/rozšířit `useRealtimeNotifications` nebo nový hook `useZavodChat`).

## 5. Přivolání rozhodčího (🔔)

- Tlačítko 🔔 „Přivolat rozhodčího" u rybáře (na detailu závodu i u zadání úlovku — před/po úlovku). Číslo pegu se doplní automaticky z týmu uživatele (`clenove_tymu`/`tymy.peg_cislo`).
- Action `privolatRozhodciho(zavodId)` → vloží zprávu `typ='privolani'`, `peg_cislo` z týmu, `vyrizeno=false`.
- V chatu se přivolání renderuje zvýrazněně: `🔔 Peg {peg_cislo}` + čas (barevná bublina). Vyřízené ztlumeně.
- Action `vyriditPrivolani(zpravaId)` (rozhodčí/pořadatel, service role + scope) → `vyrizeno=true`.

## 6. Zvoneček (realtime notifikace rozhodčímu)

- Na dashboardu rozhodčího/pořadatele (`/zavod/[zavodId]/admin`) oživit realtime: subscription na `zpravy` INSERT s `typ='privolani'` → **zvukové pípnutí + vizuální zvýraznění** (toast/badge „🔔 Přivolání — Peg X"). Seznam nevyřízených přivolání s tlačítkem „Vyřídit".
- Využít existující `useRealtimeNotifications` vzor (rozšířit o kanál `zpravy`), nebo nový `usePrivolani` hook.
- Zvuk: krátký beep (Web Audio API nebo `<audio>`), respektovat, že nemusí být povolen (fallback jen vizuál).

## 7. Co zůstává / NE
Existující potvrzování/pravidla beze změny. Skupiny, soukromé zprávy, push mimo app, mazání → mimo 3c.

## 8. Testování
- Actions (`poslatZpravu`, `privolatRozhodciho`, `vyriditPrivolani`) — vlastnictví/scope (vitest kde čistá logika; jinak E2E přes service role).
- RLS probe (vzor Fáze 0/2): anon nemůže INSERT zprávu; authenticated vloží jen vlastní (`autor_user_id`); vyřízení jen přes service role.
- E2E: vložit přivolání → objeví se v zpravy s peg; vyřídit → vyrizeno=true.
- Realtime ověřit manuálně (dvě okna / Dušan v UI).

## 9. Rizika
- **Realtime publikace** — `ALTER PUBLICATION supabase_realtime ADD TABLE zpravy` nutné (jinak subscription nic nedostane). Ověřit, že projekt má `supabase_realtime` publikaci (default ano).
- **RLS + realtime** — klientský SELECT musí projít (USING(true) pro authenticated); ověřit, že realtime události dorazí.
- **Zvuk v prohlížeči** — autoplay policy; fallback na vizuál.
- **Peg auto** — uživatel bez pegu (před losováním) → přivolání bez pegu (NULL) nebo s textem „bez pegu"; ošetřit.

## 10. Mimo rozsah (Fáze 4)
Skupiny chatu, soukromé zprávy, push notifikace (FCM/web push) mimo aplikaci, sezónní rozesílky.
