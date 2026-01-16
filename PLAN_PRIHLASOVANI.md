# Implementační plán: Zjednodušení přihlašování

## 🎯 Cíl
Zjednodušit přihlašovací systém na **dva jasné toky**:
1. **Admin/Pořadatel** - přihlášení přes `/admin/login`
2. **Závodník** - registrace/přihlášení přes email pozvánku

## 📊 Současný stav (PROBLÉMY)

### Problémy:
1. ❌ **Duplicitní navigace** - landing page header se zobrazuje i na admin a závod stránkách
2. ❌ **Zmatečné přihlašování** - příliš mnoho vstupních bodů
3. ❌ **"Neplatná pozvánka"** - když se použije stejný email 2x
4. ❌ **Pozvánka již použita** - `pouzita` flag se nastaví příliš brzy
5. ❌ **Demo závod v navigaci** - matoucí pro uživatele
6. ❌ **Přihlásit v menu** - zbytečné, když máme email pozvánky

### Současné tabulky v DB:
- `profiles` - uživatelské profily (jméno, email, telefon)
- `zavod_role` - role uživatele v konkrétním závodu
- `clenove_tymu` - členové týmu
- `pozvanky` - pozvánky s tokenem (problém: `pouzita` flag)

## ✅ Nový systém (ŘEŠENÍ)

### 1. DVA VSTUPY DO APLIKACE

#### A) **Admin přihlášení** (`/admin/login`)
- **Kdo:** Pořadatelé, hlavní admini
- **Kde:** `/admin/login` (hidden route, není nikde odkaz)
- **Jak:** Email + Magic link (klasické Supabase auth)
- **Po přihlášení:** `/admin` dashboard
- **Navigace:** Vlastní admin header (Fish + "Admin")

#### B) **Závodník registrace** (Email pozvánka)
- **Kdo:** Závodníci, kapitáni týmů
- **Kde:** Link v emailu `/pozvanka/[token]`
- **Jak:**
  1. Admin vytvoří pozvánku v admin panelu
  2. Email s linkem `/pozvanka/[token]` (long-lived, platný do konce závodu)
  3. Uživatel klikne na link
  4. Poprvé: Potvrdí registraci → Automatické přihlášení
  5. Podruhé (2. den): Stejný link → Automatické přihlášení
- **Po přihlášení:** `/zavod/[id]` (přehled závodu)
- **Navigace:** Závod header (Fish + "Carp Club ČR / {název závodu}")

### 2. ODSTRANIT

#### Odstranit z navigace:
- ❌ Demo závod odkazy
- ❌ Tlačítko "Přihlásit" v horní navigaci
- ❌ Tlačítko "Přihlásit" v mobilním menu
- ❌ Landing page header na `/zavod/*` stránkách

#### Odstranit ze soubor

ů:
- ❌ `/src/app/(auth)/login/page.tsx` (není potřeba)
- ❌ `/src/app/zavod/demo/*` (matoucí, nechat jen jako příklad)

### 3. OPRAVIT DB LOGIKU

#### Problém: `pouzita` flag v tabulce `pozvanky`
```sql
-- Současné chování (ŠPATNĚ):
pouzita = true  -- Nastaví se po prvním použití
                -- Druhý den: "Pozvánka již byla použita" ❌

-- Nové chování (SPRÁVNĚ):
pouzita = false  -- Zůstane false po celou dobu závodu
                 -- Můžete použít 100x až do platnost_do ✅
```

#### SQL migrace 007:
```sql
-- 1. Změnit význam pouzita flagu
COMMENT ON COLUMN pozvanky.pouzita IS 'DEPRECATED - use platnost_do instead. Token can be reused until expiry.';

-- 2. Povolit opakované použití tokenu
-- Odstranit kontrolu pouzita v RPC funkcích

-- 3. Validovat pouze platnost_do
-- Token je platný dokud: NOW() < platnost_do
```

### 4. OPRAVIT REGISTRAČNÍ FLOW

#### Současný flow (PROBLÉM):
```
1. Klik na pozvánku → /pozvanka/[token]
2. Potvrzení registrace → pouzita = true ❌
3. Druhý den → "Pozvánka již použita" ❌
```

#### Nový flow (ŘEŠENÍ):
```
1. Klik na pozvánku → /pozvanka/[token]
2. Kontrola platnosti: NOW() < platnost_do?
3. ANO:
   - Existuje uživatel?
     - ANO: Vygeneruj magic link → Automatické přihlášení
     - NE: Vytvoř účet → Automatické přihlášení
   - Redirect na /zavod/[id]
4. NE:
   - Zobraz: "Pozvánka vypršela (konec závodu)"
```

#### Úprava `register_via_invitation` RPC:
```sql
CREATE OR REPLACE FUNCTION register_via_invitation(p_token UUID)
RETURNS JSON AS $$
DECLARE
  v_pozvanka pozvanky%ROWTYPE;
  v_user_id UUID;
BEGIN
  -- 1. Najít pozvánku
  SELECT * INTO v_pozvanka
  FROM pozvanky
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pozvánka nenalezena');
  END IF;

  -- 2. Kontrola platnosti (MÍSTO pouzita flagu)
  IF NOW() > v_pozvanka.platnost_do THEN
    RETURN json_build_object('success', false, 'error', 'Platnost pozvánky vypršela');
  END IF;

  -- 3. Zkontrolovat, jestli uživatel existuje
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = v_pozvanka.email;

  IF v_user_id IS NULL THEN
    -- Uživatel neexistuje → needs_signup
    RETURN json_build_object(
      'success', true,
      'needs_signup', true,
      'email', v_pozvanka.email,
      'jmeno', v_pozvanka.jmeno,
      'zavod_id', v_pozvanka.zavod_id,
      'tym_id', v_pozvanka.tym_id
    );
  END IF;

  -- 4. Uživatel existuje → přiřadit role (pokud ještě nemá)
  INSERT INTO zavod_role (zavod_id, user_id, role)
  VALUES (v_pozvanka.zavod_id, v_user_id, v_pozvanka.role)
  ON CONFLICT (zavod_id, user_id) DO NOTHING;

  IF v_pozvanka.tym_id IS NOT NULL THEN
    INSERT INTO clenove_tymu (tym_id, user_id, role)
    VALUES (v_pozvanka.tym_id, v_user_id, v_pozvanka.role)
    ON CONFLICT (tym_id, user_id) DO NOTHING;
  END IF;

  -- 5. Vrátit úspěch (NEMĚNIT pouzita flag!)
  RETURN json_build_object(
    'success', true,
    'needs_signup', false,
    'user_id', v_user_id,
    'email', v_pozvanka.email,
    'zavod_id', v_pozvanka.zavod_id,
    'tym_id', v_pozvanka.tym_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. OPRAVIT UI KOMPONENTY

#### A) Navigace pro veřejnost (landing page)
**Soubor:** `src/components/layout/Header.tsx`
```tsx
// Zobrazit:
- Logo "Carp Club ČR"
- Odkazy: Domů, Archiv závodu, O aplikaci
- ODSTRANIT: Přihlásit tlačítko
```

#### B) Navigace pro závod
**Soubor:** `src/app/zavod/[zavodId]/layout.tsx`
```tsx
// Zobrazit pouze pro přihlášené závodníky:
- Přehled
- Přidat úlovek (role: zavodnik, kapitan, rozhodci, poradatel)
- Pořadí
- Galerie
- Pravidla
- Potvrzení (role: kapitan, rozhodci, poradatel)
- Nastavení (role: poradatel)

// ODSTRANIT:
- Demo závod odkazy
- Veřejný přehled (zbytečné, je to stejné jako Přehled)
```

#### C) Spodní navigace (mobile)
**Soubor:** `src/components/layout/GlobalBottomNavigation.tsx`
```tsx
// ODSTRANIT celý komponent nebo nechat pouze:
- Domů (/)
- Archiv (/archiv)

// NEZOOBRAZOVAT na:
- /admin/* (má vlastní navigaci)
- /zavod/* (má vlastní spodní navigaci)
```

### 6. EMAIL TEMPLATE

**Současný email:**
```
Předmět: Pozvánka na závod {název}
Link: https://carpclub.app/pozvanka/[token]

Tělo:
Vítejte na závodech!
Jste pozváni do rybářského závodu {název}.
[Potvrdit registraci]
```

**✅ SPRÁVNĚ** - Toto je v pořádku, necháme.

### 7. VEŘEJNÝ PŘÍSTUP

#### Kdo vidí co BEZ přihlášení:
- `/` - Landing page (veřejné)
- `/archiv` - Archiv závodů (veřejné)
- `/zavod/[id]/verejnost` - Veřejný leaderboard (read-only, bez interakce)

#### Kdo potřebuje přihlášení:
- `/zavod/[id]` - Přehled (redirect na `/verejnost` pokud není přihlášen)
- `/zavod/[id]/ulovky` - Přidat úlovek (pouze přihlášení)
- `/zavod/[id]/admin` - Potvrzení (pouze přihlášení s rolí)

## 📝 Implementační kroky

### FÁZE 1: DB migrace (PRIORITA 1)
- [ ] Vytvořit migraci 007: Opravit `register_via_invitation` RPC
- [ ] Přidat komentář k `pouzita` sloupci (DEPRECATED)
- [ ] Testovat opakované použití tokenu

### FÁZE 2: Backend (PRIORITA 2)
- [ ] Odstranit kontrolu `pouzita` z `registerViaInvitation`
- [ ] Upravit `createPozvanka` - neměnit `pouzita` flag
- [ ] Testovat flow: Pozvánka → Registrace → 2. den → Přihlášení

### FÁZE 3: Frontend - Navigace (PRIORITA 3)
- [ ] Odstranit "Přihlásit" tlačítko z hlavního header
- [ ] Upravit `RootLayoutClient` - nezobrazovat header na `/zavod/*`
- [ ] Odstranit odkazy na demo závod
- [ ] Upravit spodní navigaci - nezobrazovat na `/zavod/*`

### FÁZE 4: Frontend - Závod stránky (PRIORITA 4)
- [ ] Ověřit, že navigace v `/zavod/[id]/layout.tsx` je správná
- [ ] Odstranit "Veřejný přehled" z navigace (zbytečné)
- [ ] Přidat redirect na `/verejnost` pokud není přihlášen

### FÁZE 5: Testování (PRIORITA 5)
- [ ] Test 1: Admin přihlášení → dashboard
- [ ] Test 2: Nová pozvánka → Email → Registrace → Přihlášení
- [ ] Test 3: 2. den → Stejný link → Automatické přihlášení
- [ ] Test 4: Po expiraci → "Platnost vypršela"
- [ ] Test 5: Veřejný přístup na `/verejnost`

## 🎨 Finální struktura

```
┌─────────────────────────────────────┐
│  VEŘEJNÝ PŘÍSTUP                    │
│  - / (landing page)                 │
│  - /archiv (archiv závodů)          │
│  - /zavod/[id]/verejnost (readonly) │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ADMIN PŘÍSTUP (/admin/*)           │
│  - Vstup: /admin/login (hidden)     │
│  - Email + Magic link               │
│  - Dashboard, Správa závodů         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ZÁVODNÍK PŘÍSTUP (/zavod/[id]/*)   │
│  - Vstup: Email pozvánka            │
│  - Link: /pozvanka/[token]          │
│  - Opakované použití: ANO ✅        │
│  - Přidat úlovek, Pořadí, Galerie   │
└─────────────────────────────────────┘
```

## 🔑 Klíčové změny

1. **Token je opakovatelný** - Můžete použít 100x až do `platnost_do`
2. **Bez duplicitní navigace** - Každá sekce má vlastní header
3. **Jednoduchý vstup** - Admin = `/admin/login`, Závodník = Email
4. **Veřejný přístup** - `/verejnost` pro divákč
