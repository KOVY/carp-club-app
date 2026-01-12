# Carp Club CR - Kaprarské závody online

Oficiální aplikace pro kaprařské závody v České republice.

**Live:** https://carpclub.app

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui komponenty
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Hosting:** Vercel
- **Repository:** https://github.com/KOVY/carp-club-app

## Struktura projektu

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login)
│   ├── admin/             # Admin portál pro pořadatele
│   │   ├── [zavodId]/     # Správa konkrétního závodu
│   │   │   ├── tymy/      # Správa týmů
│   │   │   └── rozhodci/  # Správa rozhodčích
│   │   └── zavody/        # Seznam a vytváření závodů
│   ├── archiv/            # Archiv ukončených závodů
│   ├── pozvanka/[token]/  # Registrace přes magic link
│   └── zavod/             # Závody
│       ├── demo/          # Demo závod
│       └── [zavodId]/     # Detail závodu
│           ├── admin/     # Admin panel závodu
│           ├── galerie/   # Galerie úlovků
│           ├── leaderboard/ # Živé pořadí
│           ├── pravidla/  # Pravidla závodu
│           ├── ulovky/    # Zadávání úlovků
│           └── verejnost/ # Veřejný přehled
├── actions/               # Server Actions
│   ├── auth.actions.ts
│   ├── hlavni-admin.actions.ts
│   ├── pozvanka.actions.ts
│   ├── tym.actions.ts
│   └── zavod.actions.ts
├── components/
│   ├── common/            # Obecné komponenty
│   ├── landing/           # Landing page komponenty
│   ├── layout/            # Layout (Header, Footer, Navigation)
│   ├── providers/         # Context providers
│   ├── ui/                # shadcn/ui komponenty
│   └── zavod/             # Závod-specifické komponenty
├── hooks/                 # Custom React hooks
├── lib/
│   ├── supabase/          # Supabase klient
│   └── utils.ts           # Utility funkce
└── types/                 # TypeScript typy
```

## Databáze (Supabase)

### Hlavní tabulky
- `zavody` - Závody s datumy, pravidly, stavem
- `tymy` - Týmy s barvou, peg číslem, kapitánem
- `clenove_tymu` - Členové týmů (1-4 na tým)
- `ulovky` - Úlovky s váhou, fotkou, potvrzením
- `potvrzeni` - Potvrzení úlovků od sousedních pegů/rozhodčích
- `zlute_karty` - Žluté karty za porušení pravidel
- `zavod_role` - Role uživatelů v závodech
- `profiles` - Uživatelské profily
- `pozvanky` - Pozvánky pro magic link registraci

### Role uživatelů
- `hlavni_admin` - Může spravovat všechny závody
- `poradatel` - Pořadatel konkrétního závodu
- `rozhodci` - Rozhodčí (může potvrzovat úlovky okamžitě)
- `kapitan` - Kapitán týmu
- `zavodnik` - Člen týmu
- `divak` - Pouze prohlížení

### Migrace
```
supabase/migrations/
├── 001_initial.sql           # Základní schéma
├── 002_pridat_potvrzeni.sql  # Potvrzení úlovků
├── 003_rozhodci.sql          # Role rozhodčího
├── 004_auth_profily.sql      # Auth a profily
├── 005a_add_hlavni_admin_enum.sql  # Enum hlavni_admin
└── 005b_admin_portal.sql     # Admin portál (pozvanky, barva týmu)
```

## Klíčové funkce

### Pro závodníky
- Zadávání úlovků s povinnou fotkou
- Živý leaderboard s embargovým režimem
- Potvrzování úlovků sousedních pegů
- Přihlášení přes magic link

### Pro pořadatele (Admin)
- Vytváření závodů na celou sezónu
- Registrace týmů s barevným rozlišením
- Přidávání členů a posílání magic linků
- Správa rozhodčích
- Dashboard s přehledem

### Pro rozhodčí
- Okamžité potvrzení úlovků
- Zamítnutí neplatných úlovků
- Udělování žlutých karet

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Unsplash (pro obrázky)
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=
```

## Vývoj

```bash
# Instalace
npm install

# Spuštění dev serveru
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## SEO a AI

- `/sitemap.xml` - Dynamický sitemap pro Google
- `/robots.txt` - Pravidla pro crawlery
- `/llms.txt` - Informace pro AI systémy
- `/.well-known/ai-plugin.json` - AI plugin manifest
- OG image pro sociální sítě

## Email šablony

HTML šablony pro Supabase Auth jsou v `supabase/email-templates/`:
- `magic-link.html` - Přihlašovací magic link
- `invite.html` - Pozvánka do závodu
- `confirm-signup.html` - Potvrzení registrace
- `reset-password.html` - Reset hesla

## TODO / Plánované funkce

- [ ] PWA offline mode
- [ ] Push notifikace
- [ ] Export výsledků do PDF
- [ ] Statistiky závodníků
- [ ] Integrace s rybářskými svazy

## Kontakt

- Web: https://carpclub.app
- GitHub: https://github.com/KOVY/carp-club-app
