// Custom application types
// Re-export database types for convenience
export type {
  Database,
  DruhRyby,
  UserRole,
  StavPotvrzeni,
  StavZavodu,
  Profile,
  Soutez,
  Zavod,
  Sektor,
  Tym,
  ClenTymu,
  Ulovek,
  Potvrzeni,
  ZlutaKarta,
  ZlutaKartaPoznamka,
  AuditLog,
  ZavodRole,
  Pozvanka,
  Tables,
  InsertTables,
  UpdateTables,
} from '@/types/database.types';

import type { Tym, Ulovek, Profile } from '@/types/database.types';

// Extended types with relations
export interface TymWithRelations extends Tym {
  kapitan?: Profile;
  clenove?: ClenTymuWithUser[];
}

export interface ClenTymuWithUser {
  id: string;
  tym_id: string;
  user_id: string;
  role: 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak' | 'hlavni_admin';
  created_at: string;
  user?: Profile;
}

export interface UlovekWithRelations extends Ulovek {
  tym?: Tym;
  chytil?: Profile;
  potvrzeni?: PotvrzeniWithRelations[];
}

export interface PotvrzeniWithRelations {
  id: string;
  ulovek_id: string;
  potvrdil_user_id: string;
  potvrdil_tym_id: string;
  potvrzeno: boolean;
  poznamka: string | null;
  created_at: string;
  potvrdil_user?: Profile;
  potvrdil_tym?: Tym;
}

// Leaderboard entry type
export interface LeaderboardEntry {
  tym: TymWithRelations;
  skore: number;
  pocetRyb: number;
  top5Ryby: Ulovek[];
  zluteKarty: number;
  poradiCas: string;
  poradi: number;
}

// Generic action result type for server actions
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Scoring result type
export interface ScoringResult {
  skore: number;
  top5Ryby: Ulovek[];
  pocetRyb: number;
}

// Permission context type
export interface PermissionContext {
  userId: string;
  role: 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak' | 'hlavni_admin';
  tymId?: string;
  pegCislo?: number;
  zavodId: string;
}

// Input types for server actions
export interface SubmitUlovekInput {
  zavodId: string;
  vaha: number;
  druh: 'kapr' | 'amur';
  fotoFile: File;
  chytilClen?: string;
}

export interface PotvrzeniInput {
  ulovekId: string;
  potvrzeno: boolean;
  poznamka?: string;
}

export interface CreateZavodInput {
  nazev: string;
  misto?: string;
  datum_start: string;
  datum_end: string;
  embargo_od?: string;
  pravidla?: string;
  soutez_id?: string;
  min_vaha_kg?: number;
  top_n_ryb?: number;
  pocet_potvrzeni?: number;
  // Map coordinates
  map_lat?: number;
  map_lng?: number;
  map_location_name?: string;
}

export interface UpdateZavodInput {
  nazev?: string;
  misto?: string;
  datum_start?: string;
  datum_end?: string;
  embargo_od?: string | null;
  pravidla?: string;
  stav?: 'priprava' | 'probiha' | 'ukoncen';
  min_vaha_kg?: number;
  top_n_ryb?: number;
  pocet_potvrzeni?: number;
  // Map coordinates
  map_lat?: number | null;
  map_lng?: number | null;
  map_zoom?: number;
  map_location_name?: string | null;
}

// Map-related types
export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface PegMapData {
  pegCislo: number;
  lat: number;
  lng: number;
  tymId?: string;
  tymNazev?: string;
  tymBarva?: string;
}

export interface UpdateTymMapInput {
  tymId: string;
  peg_lat?: number | null;
  peg_lng?: number | null;
}

export interface CreateTymInput {
  zavodId: string;
  nazev: string;
  kapitanId: string;
  clenoveIds?: string[];
  barva?: string;
}

export interface ZlutaKartaInput {
  tymId: string;
  zavodId: string;
  duvod: string;
  stopkaHodin?: number | null; // délka stopky v hodinách (3 nebo 6), null = bez stopky
}

export interface CreateUserInput {
  email: string;
  jmeno: string;
  telefon?: string;
  zavodId: string;
  role: 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak' | 'hlavni_admin';
}

// Pozvánka input types
export interface CreatePozvankaInput {
  zavodId: string;
  tymId?: string;
  email: string;
  jmeno: string;
  telefon?: string;
  role?: 'zavodnik' | 'kapitan' | 'rozhodci';
  platnostDo?: string;
}

// Statistiky závodu
export interface ZavodStats {
  pocet_tymu: number;
  pocet_clenu: number;
  pocet_pozvanek: number;
  pocet_registrovanych: number;
  pocet_ulovku: number;
  pocet_potvrzenych: number;
  pocet_zlutych_karet: number;
}

// Přehled týmu pro admin
export interface TymOverview {
  tym_id: string;
  nazev: string;
  barva: string;
  peg_cislo: number | null;
  zaplaceno: boolean;
  pocet_clenu: number;
  pocet_pozvanek: number;
  pocet_registrovanych: number;
}

// Barvy týmů
export const TEAM_COLORS = [
  { name: 'Modrá', hex: '#3B82F6' },
  { name: 'Červená', hex: '#EF4444' },
  { name: 'Zelená', hex: '#22C55E' },
  { name: 'Oranžová', hex: '#F59E0B' },
  { name: 'Fialová', hex: '#8B5CF6' },
  { name: 'Růžová', hex: '#EC4899' },
  { name: 'Tyrkysová', hex: '#06B6D4' },
  { name: 'Žlutá', hex: '#EAB308' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Limetková', hex: '#84CC16' },
] as const;
