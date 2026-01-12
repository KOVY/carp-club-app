// Supabase database types - generated from schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types
export type DruhRyby = 'kapr' | 'amur'
export type UserRole = 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak' | 'hlavni_admin'
export type StavPotvrzeni = 'ceka' | 'potvrzeno' | 'zamitnuto'
export type StavZavodu = 'priprava' | 'probiha' | 'ukoncen'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          jmeno: string
          telefon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          jmeno: string
          telefon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          jmeno?: string
          telefon?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      souteze: {
        Row: {
          id: string
          nazev: string
          rok: number
          created_at: string
        }
        Insert: {
          id?: string
          nazev: string
          rok: number
          created_at?: string
        }
        Update: {
          id?: string
          nazev?: string
          rok?: number
          created_at?: string
        }
      }
      zavody: {
        Row: {
          id: string
          soutez_id: string | null
          nazev: string
          misto: string | null
          datum_start: string
          datum_end: string
          embargo_od: string | null
          pravidla: string | null
          stav: string
          pocet_potvrzeni: number
          min_vaha_kg: number
          top_n_ryb: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          soutez_id?: string | null
          nazev: string
          misto?: string | null
          datum_start: string
          datum_end: string
          embargo_od?: string | null
          pravidla?: string | null
          stav?: string
          pocet_potvrzeni?: number
          min_vaha_kg?: number
          top_n_ryb?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          soutez_id?: string | null
          nazev?: string
          misto?: string | null
          datum_start?: string
          datum_end?: string
          embargo_od?: string | null
          pravidla?: string | null
          stav?: string
          pocet_potvrzeni?: number
          min_vaha_kg?: number
          top_n_ryb?: number
          created_at?: string
          updated_at?: string
        }
      }
      sektory: {
        Row: {
          id: string
          zavod_id: string
          nazev: string
          created_at: string
        }
        Insert: {
          id?: string
          zavod_id: string
          nazev: string
          created_at?: string
        }
        Update: {
          id?: string
          zavod_id?: string
          nazev?: string
          created_at?: string
        }
      }
      tymy: {
        Row: {
          id: string
          zavod_id: string
          nazev: string
          kapitan_id: string
          peg_cislo: number | null
          sektor_id: string | null
          zaplaceno: boolean
          variabilni_symbol: string | null
          barva: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          zavod_id: string
          nazev: string
          kapitan_id: string
          peg_cislo?: number | null
          sektor_id?: string | null
          zaplaceno?: boolean
          variabilni_symbol?: string | null
          barva?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          zavod_id?: string
          nazev?: string
          kapitan_id?: string
          peg_cislo?: number | null
          sektor_id?: string | null
          zaplaceno?: boolean
          variabilni_symbol?: string | null
          barva?: string
          created_at?: string
          updated_at?: string
        }
      }
      clenove_tymu: {
        Row: {
          id: string
          tym_id: string
          user_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          tym_id: string
          user_id: string
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          tym_id?: string
          user_id?: string
          role?: UserRole
          created_at?: string
        }
      }
      ulovky: {
        Row: {
          id: string
          tym_id: string
          zavod_id: string
          vaha: number
          druh: DruhRyby
          foto_url: string
          chytil_user_id: string | null
          cas: string
          stav: StavPotvrzeni
          potvrzeno_rozhodcim: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tym_id: string
          zavod_id: string
          vaha: number
          druh: DruhRyby
          foto_url: string
          chytil_user_id?: string | null
          cas?: string
          stav?: StavPotvrzeni
          potvrzeno_rozhodcim?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tym_id?: string
          zavod_id?: string
          vaha?: number
          druh?: DruhRyby
          foto_url?: string
          chytil_user_id?: string | null
          cas?: string
          stav?: StavPotvrzeni
          potvrzeno_rozhodcim?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      potvrzeni: {
        Row: {
          id: string
          ulovek_id: string
          potvrdil_user_id: string
          potvrdil_tym_id: string
          potvrzeno: boolean
          poznamka: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ulovek_id: string
          potvrdil_user_id: string
          potvrdil_tym_id: string
          potvrzeno: boolean
          poznamka?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ulovek_id?: string
          potvrdil_user_id?: string
          potvrdil_tym_id?: string
          potvrzeno?: boolean
          poznamka?: string | null
          created_at?: string
        }
      }
      zlute_karty: {
        Row: {
          id: string
          tym_id: string
          zavod_id: string
          udelil_user_id: string
          duvod: string
          poznamka: string | null
          cas: string
          created_at: string
        }
        Insert: {
          id?: string
          tym_id: string
          zavod_id: string
          udelil_user_id: string
          duvod: string
          poznamka?: string | null
          cas?: string
          created_at?: string
        }
        Update: {
          id?: string
          tym_id?: string
          zavod_id?: string
          udelil_user_id?: string
          duvod?: string
          poznamka?: string | null
          cas?: string
          created_at?: string
        }
      }
      zlute_karty_poznamky: {
        Row: {
          id: string
          zluta_karta_id: string
          autor_id: string
          poznamka: string
          created_at: string
        }
        Insert: {
          id?: string
          zluta_karta_id: string
          autor_id: string
          poznamka: string
          created_at?: string
        }
        Update: {
          id?: string
          zluta_karta_id?: string
          autor_id?: string
          poznamka?: string
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_data: Json | null
          new_data: Json | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          created_at?: string
        }
      }
      zavod_role: {
        Row: {
          id: string
          zavod_id: string
          user_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          zavod_id: string
          user_id: string
          role: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          zavod_id?: string
          user_id?: string
          role?: UserRole
          created_at?: string
        }
      }
      pozvanky: {
        Row: {
          id: string
          zavod_id: string
          tym_id: string | null
          email: string
          jmeno: string
          telefon: string | null
          role: UserRole
          token: string
          platnost_do: string
          pouzita: boolean
          registrovano_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          zavod_id: string
          tym_id?: string | null
          email: string
          jmeno: string
          telefon?: string | null
          role?: UserRole
          token?: string
          platnost_do: string
          pouzita?: boolean
          registrovano_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          zavod_id?: string
          tym_id?: string | null
          email?: string
          jmeno?: string
          telefon?: string | null
          role?: UserRole
          token?: string
          platnost_do?: string
          pouzita?: boolean
          registrovano_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_tym_score: {
        Args: { p_tym_id: string }
        Returns: { skore: number; pocet_ryb: number }[]
      }
      register_via_invitation: {
        Args: { p_token: string }
        Returns: Json
      }
      complete_invitation_registration: {
        Args: { p_pozvanka_id: string; p_user_id: string }
        Returns: Json
      }
      get_zavod_stats: {
        Args: { p_zavod_id: string }
        Returns: Json
      }
      get_tymy_overview: {
        Args: { p_zavod_id: string }
        Returns: {
          tym_id: string
          nazev: string
          barva: string
          peg_cislo: number | null
          zaplaceno: boolean
          pocet_clenu: number
          pocet_pozvanek: number
          pocet_registrovanych: number
        }[]
      }
    }
    Enums: {
      druh_ryby: DruhRyby
      user_role: UserRole
      stav_potvrzeni: StavPotvrzeni
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience type aliases
export type Profile = Tables<'profiles'>
export type Soutez = Tables<'souteze'>
export type Zavod = Tables<'zavody'>
export type Sektor = Tables<'sektory'>
export type Tym = Tables<'tymy'>
export type ClenTymu = Tables<'clenove_tymu'>
export type Ulovek = Tables<'ulovky'>
export type Potvrzeni = Tables<'potvrzeni'>
export type ZlutaKarta = Tables<'zlute_karty'>
export type ZlutaKartaPoznamka = Tables<'zlute_karty_poznamky'>
export type AuditLog = Tables<'audit_log'>
export type ZavodRole = Tables<'zavod_role'>
export type Pozvanka = Tables<'pozvanky'>
