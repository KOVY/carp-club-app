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
  role: 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak';
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
  role: 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak';
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
}

export interface UpdateZavodInput {
  nazev?: string;
  misto?: string;
  datum_start?: string;
  datum_end?: string;
  embargo_od?: string | null;
  pravidla?: string;
  stav?: 'priprava' | 'probiha' | 'ukoncen';
}

export interface CreateTymInput {
  zavodId: string;
  nazev: string;
  kapitanId: string;
  clenoveIds?: string[];
}

export interface ZlutaKartaInput {
  tymId: string;
  zavodId: string;
  duvod: string;
}

export interface CreateUserInput {
  email: string;
  jmeno: string;
  telefon?: string;
  zavodId: string;
  role: 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak';
}
