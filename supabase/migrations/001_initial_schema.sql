-- Carp Club ČR Database Schema
-- Migration: 001_initial_schema
-- Description: Initial database schema with all tables, enums, indexes

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE druh_ryby AS ENUM ('kapr', 'amur');
CREATE TYPE user_role AS ENUM ('zavodnik', 'kapitan', 'rozhodci', 'poradatel', 'divak');
CREATE TYPE stav_potvrzeni AS ENUM ('ceka', 'potvrzeno', 'zamitnuto');

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  jmeno TEXT NOT NULL,
  telefon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Souteze (A, B)
CREATE TABLE souteze (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL, -- 'A' nebo 'B'
  rok INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zavody
CREATE TABLE zavody (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soutez_id UUID REFERENCES souteze(id),
  nazev TEXT NOT NULL,
  misto TEXT,
  datum_start TIMESTAMPTZ NOT NULL,
  datum_end TIMESTAMPTZ NOT NULL,
  embargo_od TIMESTAMPTZ, -- NULL = bez embarga
  pravidla TEXT,
  stav TEXT DEFAULT 'priprava', -- priprava, probiha, ukoncen
  pocet_potvrzeni INT DEFAULT 2, -- konfigurovatelný počet potřebných potvrzení
  min_vaha_kg DECIMAL(4,2) DEFAULT 5.0, -- minimální váha ryby
  top_n_ryb INT DEFAULT 5, -- počet nejlepších ryb pro skóre
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Sektory (optional)
CREATE TABLE sektory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  nazev TEXT NOT NULL, -- 'A', 'B', 'C'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tymy
CREATE TABLE tymy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  nazev TEXT NOT NULL,
  kapitan_id UUID NOT NULL REFERENCES profiles(id),
  peg_cislo INT,
  sektor_id UUID REFERENCES sektory(id),
  zaplaceno BOOLEAN DEFAULT FALSE,
  variabilni_symbol TEXT UNIQUE, -- pro QR platbu
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zavod_id, peg_cislo)
);

-- Clenove tymu
CREATE TABLE clenove_tymu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tym_id UUID NOT NULL REFERENCES tymy(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role user_role NOT NULL DEFAULT 'zavodnik',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tym_id, user_id)
);

-- Ulovky
CREATE TABLE ulovky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tym_id UUID NOT NULL REFERENCES tymy(id) ON DELETE CASCADE,
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  vaha DECIMAL(5,2) NOT NULL CHECK (vaha >= 5.0),
  druh druh_ryby NOT NULL,
  foto_url TEXT NOT NULL,
  chytil_user_id UUID REFERENCES profiles(id),
  cas TIMESTAMPTZ DEFAULT NOW(),
  stav stav_potvrzeni DEFAULT 'ceka',
  potvrzeno_rozhodcim BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Potvrzeni (od sousednich pegu)
CREATE TABLE potvrzeni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ulovek_id UUID NOT NULL REFERENCES ulovky(id) ON DELETE CASCADE,
  potvrdil_user_id UUID NOT NULL REFERENCES profiles(id),
  potvrdil_tym_id UUID NOT NULL REFERENCES tymy(id),
  potvrzeno BOOLEAN NOT NULL,
  poznamka TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ulovek_id, potvrdil_tym_id)
);

-- Zlute karty (APPEND-ONLY - nelze mazat ani upravovat)
CREATE TABLE zlute_karty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tym_id UUID NOT NULL REFERENCES tymy(id) ON DELETE CASCADE,
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  udelil_user_id UUID NOT NULL REFERENCES profiles(id),
  duvod TEXT NOT NULL,
  poznamka TEXT, -- pro dodatečné poznámky/opravy důvodu
  cas TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poznámky k žlutým kartám (pro opravy/doplnění bez mazání)
CREATE TABLE zlute_karty_poznamky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zluta_karta_id UUID NOT NULL REFERENCES zlute_karty(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES profiles(id),
  poznamka TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (APPEND-ONLY - pouze INSERT, žádné UPDATE/DELETE)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role v zavode (kdo ma jakou roli v konkretnim zavode)
CREATE TABLE zavod_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zavod_id UUID NOT NULL REFERENCES zavody(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zavod_id, user_id)
);


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_ulovky_zavod ON ulovky(zavod_id);
CREATE INDEX idx_ulovky_tym ON ulovky(tym_id);
CREATE INDEX idx_ulovky_stav ON ulovky(stav);
CREATE INDEX idx_tymy_zavod ON tymy(zavod_id);
CREATE INDEX idx_tymy_peg ON tymy(zavod_id, peg_cislo);
CREATE INDEX idx_potvrzeni_ulovek ON potvrzeni(ulovek_id);
CREATE INDEX idx_zlute_karty_tym ON zlute_karty(tym_id, zavod_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_clenove_tymu_user ON clenove_tymu(user_id);
CREATE INDEX idx_zavod_role_user ON zavod_role(user_id);
CREATE INDEX idx_zavod_role_zavod ON zavod_role(zavod_id);
