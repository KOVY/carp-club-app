# Carp Club ČR - Kontextový dokument pro Claude

## O projektu

**Carp Club ČR** je webová aplikace pro správu kaprařských závodů. Umožňuje živé sledování výsledků, zadávání a potvrzování úlovků, správu týmů a komplexní administraci závodů.

### Technologie

- **Framework**: Next.js 14+ (App Router)
- **Jazyk**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui komponenty
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **PWA**: Service Worker pro offline podporu

## Struktura projektu

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth layout (login, register)
│   ├── admin/             # Admin rozhraní
│   │   └── [zavodId]/     # Správa konkrétního závodu
│   │       ├── tymy/      # Správa týmů
│   │       └── ulovky/    # Správa úlovků
│   ├── zavod/             # Závodní rozhraní
│   │   ├── [zavodId]/     # Konkrétní závod
│   │   │   ├── ulovky/    # Zadávání úlovků
│   │   │   ├── leaderboard/
│   │   │   └── galerie/
│   │   └── demo/          # Demo závod
│   └── page.tsx           # Landing page
├── actions/               # Server Actions
│   ├── admin.actions.ts   # Admin operace (žluté karty, embargo)
│   ├── hlavni-admin.actions.ts  # Hlavní admin (schvalování úlovků)
│   ├── tym.actions.ts     # Týmy (CRUD, losování pegů)
│   ├── ulovky.actions.ts  # Úlovky (zadávání, potvrzování)
│   └── potvrzeni.actions.ts
├── components/
│   ├── layout/            # Layout komponenty (Header, Footer, Navigation)
│   ├── zavod/             # Závodní komponenty
│   │   ├── UlovekForm.tsx
│   │   ├── LeaderboardTable.tsx
│   │   ├── ZlutaKartaDialog.tsx
│   │   └── StopkaCountdown.tsx
│   ├── landing/           # Landing page sekce
│   └── ui/                # shadcn/ui komponenty
├── lib/
│   ├── supabase/          # Supabase client (server/admin/client)
│   ├── types.ts           # TypeScript typy
│   ├── permissions.ts     # Oprávnění podle rolí
│   └── errors.ts          # Error handling
└── hooks/                 # Custom React hooks
```

## Klíčové koncepty

### Role uživatelů

| Role | Popis | Oprávnění |
|------|-------|-----------|
| `zavodnik` | Člen týmu | Zadávat úlovky |
| `kapitan` | Vedoucí týmu | + Potvrzovat úlovky sousedů |
| `rozhodci` | Rozhodčí | + Okamžité potvrzení, žluté karty |
| `poradatel` | Pořadatel | + Plná správa závodu |
| `hlavni_admin` | Systémový admin | Správa všech závodů |

### Systém potvrzování úlovků

1. Tým zadá úlovek (váha >= 5kg, foto povinné)
2. Stav = `ceka`
3. Sousední pegy (kapitáni) potvrdí úlovek
4. Po 2 potvrzeních → stav = `potvrzeno`
5. Rozhodčí může potvrdit okamžitě

### Žluté karty a stopka

- 1 žlutá karta = varování (volitelně se stopkou 3-6 hodin)
- 2 žluté karty = diskvalifikace (trigger v DB vynuluje body)
- Stopka = tým nemůže zadávat úlovky po stanovenou dobu

### Embargo

- `embargo_od` čas v tabulce `zavody`
- Během embarga jsou váhy úlovků skryté
- Rozhodčí vidí váhy i během embarga

## Databázové schéma (důležité tabulky)

```sql
-- Závody
zavody (id, nazev, datum_start, datum_end, embargo_od, stav, ...)

-- Týmy
tymy (id, zavod_id, nazev, kapitan_id, peg_cislo, zaplaceno, ...)

-- Členové týmu
clenove_tymu (id, tym_id, user_id, role)

-- Úlovky
ulovky (id, tym_id, zavod_id, vaha, druh, foto_url, stav, ...)

-- Potvrzení
potvrzeni (id, ulovek_id, potvrdil_user_id, potvrdil_tym_id, potvrzeno)

-- Žluté karty
zlute_karty (id, tym_id, zavod_id, duvod, stopka_do, ...)

-- Role v závodě
zavod_role (id, zavod_id, user_id, role)
```

## Navigace

### Landing page (mobil)
- Header skrytý na mobilu (jen desktop)
- BottomNavigation: Domů, Archiv, Demo, [Admin], Přihlásit/Účet

### Závod (mobil)
- Vlastní layout s header + BottomNavigation
- Navigace: Domů, Pořadí, Přidat, Potvrzení, Profil

### Admin
- Vlastní layout s levým sidebar menu

## Důležité soubory

- `src/actions/admin.actions.ts` - Žluté karty, stopka, embargo
- `src/actions/hlavni-admin.actions.ts` - Schvalování úlovků adminem
- `src/components/zavod/ZlutaKartaDialog.tsx` - Dialog pro žluté karty
- `src/components/zavod/StopkaCountdown.tsx` - Odpočet stopky
- `src/app/zavod/[zavodId]/ulovky/page.tsx` - Stránka úlovků

## Supabase

### Migrace
```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_rls_policies.sql
├── 003_functions_triggers.sql
├── ...
└── 013_yellow_card_stopka.sql  # Stopka pro žluté karty
```

### RLS (Row Level Security)
- Aktivní na všech tabulkách
- Admin operace používají `createAdminClient()` pro bypass RLS

## Časté úkoly

### Přidání nové server action
1. Vytvořit v `src/actions/`
2. Použít `'use server'` directive
3. Ověřit oprávnění pomocí `permissions.ts`
4. Vrátit `ActionResult<T>`

### Přidání nové komponenty závodu
1. Vytvořit v `src/components/zavod/`
2. Exportovat z `src/components/zavod/index.ts`

### Databázová změna
1. Vytvořit migraci v `supabase/migrations/`
2. Spustit `supabase migration up`

## Poznámky pro vývoj

- **Čeština**: Všechna UI a komentáře v češtině
- **Typy**: Striktní TypeScript, definice v `src/lib/types.ts`
- **Chyby**: Používat `ErrorCodes` a `ErrorMessages` z `src/lib/errors.ts`
- **Server Actions**: Preferovat před API routes
- **RLS bypass**: Používat `createAdminClient()` pro admin operace
