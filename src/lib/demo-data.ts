/**
 * Demo Data for Carp Club ČR
 * 
 * Static mock data for demo závod presentation without authentication.
 * Requirements: 5.1, 5.4
 */

import type { 
  Zavod, 
  Tym, 
  Profile, 
  LeaderboardEntry, 
  UlovekWithRelations,
  TymWithRelations,
  PotvrzeniWithRelations
} from '@/lib/types'

// Demo závod ID constant
export const DEMO_ZAVOD_ID = 'demo'

// Demo profiles (team members)
export const demoProfiles: Profile[] = [
  {
    id: 'demo-user-1',
    email: 'jan.novak@demo.cz',
    jmeno: 'Jan Novák',
    telefon: '+420 123 456 789',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-user-2',
    email: 'petr.svoboda@demo.cz',
    jmeno: 'Petr Svoboda',
    telefon: '+420 234 567 890',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-user-3',
    email: 'martin.dvorak@demo.cz',
    jmeno: 'Martin Dvořák',
    telefon: '+420 345 678 901',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-user-4',
    email: 'tomas.kral@demo.cz',
    jmeno: 'Tomáš Král',
    telefon: '+420 456 789 012',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-user-5',
    email: 'david.horak@demo.cz',
    jmeno: 'David Horák',
    telefon: '+420 567 890 123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-user-6',
    email: 'lukas.marek@demo.cz',
    jmeno: 'Lukáš Marek',
    telefon: '+420 678 901 234',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Demo teams
export const demoTymy: TymWithRelations[] = [
  {
    id: 'demo-tym-1',
    zavod_id: DEMO_ZAVOD_ID,
    nazev: 'Kapří Lovci',
    kapitan_id: 'demo-user-1',
    peg_cislo: 1,
    sektor_id: null,
    zaplaceno: true,
    variabilni_symbol: 'VS001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    kapitan: demoProfiles[0],
  },
  {
    id: 'demo-tym-2',
    zavod_id: DEMO_ZAVOD_ID,
    nazev: 'Rybářský Spolek Morava',
    kapitan_id: 'demo-user-2',
    peg_cislo: 2,
    sektor_id: null,
    zaplaceno: true,
    variabilni_symbol: 'VS002',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    kapitan: demoProfiles[1],
  },
  {
    id: 'demo-tym-3',
    zavod_id: DEMO_ZAVOD_ID,
    nazev: 'Zlatí Kapři',
    kapitan_id: 'demo-user-3',
    peg_cislo: 3,
    sektor_id: null,
    zaplaceno: true,
    variabilni_symbol: 'VS003',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    kapitan: demoProfiles[2],
  },
  {
    id: 'demo-tym-4',
    zavod_id: DEMO_ZAVOD_ID,
    nazev: 'Noční Rybáři',
    kapitan_id: 'demo-user-4',
    peg_cislo: 4,
    sektor_id: null,
    zaplaceno: true,
    variabilni_symbol: 'VS004',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    kapitan: demoProfiles[3],
  },
  {
    id: 'demo-tym-5',
    zavod_id: DEMO_ZAVOD_ID,
    nazev: 'Jezero Team',
    kapitan_id: 'demo-user-5',
    peg_cislo: 5,
    sektor_id: null,
    zaplaceno: true,
    variabilni_symbol: 'VS005',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    kapitan: demoProfiles[4],
  },
  {
    id: 'demo-tym-6',
    zavod_id: DEMO_ZAVOD_ID,
    nazev: 'Carp Masters',
    kapitan_id: 'demo-user-6',
    peg_cislo: 6,
    sektor_id: null,
    zaplaceno: true,
    variabilni_symbol: 'VS006',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    kapitan: demoProfiles[5],
  },
]


// Demo úlovky with various states (potvrzeno, ceka, embargo)
// Using carp fishing images from Pixabay (free to use)
export const demoUlovky: UlovekWithRelations[] = [
  // Tým 1 - Kapří Lovci (5 confirmed catches)
  {
    id: 'demo-ulovek-1',
    tym_id: 'demo-tym-1',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 18.5,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2016/11/29/04/17/carp-1867346_1280.jpg',
    chytil_user_id: 'demo-user-1',
    cas: '2024-06-15T08:30:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T08:30:00Z',
    updated_at: '2024-06-15T08:35:00Z',
    tym: demoTymy[0],
    chytil: demoProfiles[0],
  },
  {
    id: 'demo-ulovek-2',
    tym_id: 'demo-tym-1',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 15.2,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2017/08/06/12/06/carp-2591722_1280.jpg',
    chytil_user_id: 'demo-user-1',
    cas: '2024-06-15T12:15:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T12:15:00Z',
    updated_at: '2024-06-15T12:20:00Z',
    tym: demoTymy[0],
    chytil: demoProfiles[0],
  },
  {
    id: 'demo-ulovek-3',
    tym_id: 'demo-tym-1',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 12.8,
    druh: 'amur',
    foto_url: 'https://cdn.pixabay.com/photo/2020/05/17/19/51/grass-carp-5182924_1280.jpg',
    chytil_user_id: 'demo-user-1',
    cas: '2024-06-15T16:45:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T16:45:00Z',
    updated_at: '2024-06-15T16:50:00Z',
    tym: demoTymy[0],
    chytil: demoProfiles[0],
  },
  {
    id: 'demo-ulovek-4',
    tym_id: 'demo-tym-1',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 10.5,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2016/11/29/04/17/carp-1867347_1280.jpg',
    chytil_user_id: 'demo-user-1',
    cas: '2024-06-15T20:30:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T20:30:00Z',
    updated_at: '2024-06-15T20:35:00Z',
    tym: demoTymy[0],
    chytil: demoProfiles[0],
  },
  {
    id: 'demo-ulovek-5',
    tym_id: 'demo-tym-1',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 8.9,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2018/08/12/16/59/carp-3601852_1280.jpg',
    chytil_user_id: 'demo-user-1',
    cas: '2024-06-16T06:00:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-16T06:00:00Z',
    updated_at: '2024-06-16T06:05:00Z',
    tym: demoTymy[0],
    chytil: demoProfiles[0],
  },
  // Tým 2 - Rybářský Spolek Morava (4 confirmed catches)
  {
    id: 'demo-ulovek-6',
    tym_id: 'demo-tym-2',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 22.3,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2019/07/16/18/24/carp-4342346_1280.jpg',
    chytil_user_id: 'demo-user-2',
    cas: '2024-06-15T10:00:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:05:00Z',
    tym: demoTymy[1],
    chytil: demoProfiles[1],
  },
  {
    id: 'demo-ulovek-7',
    tym_id: 'demo-tym-2',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 14.7,
    druh: 'amur',
    foto_url: 'https://cdn.pixabay.com/photo/2020/06/09/02/14/grass-carp-5276289_1280.jpg',
    chytil_user_id: 'demo-user-2',
    cas: '2024-06-15T14:30:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T14:30:00Z',
    updated_at: '2024-06-15T14:35:00Z',
    tym: demoTymy[1],
    chytil: demoProfiles[1],
  },
  {
    id: 'demo-ulovek-8',
    tym_id: 'demo-tym-2',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 11.2,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2017/05/14/21/57/carp-2313638_1280.jpg',
    chytil_user_id: 'demo-user-2',
    cas: '2024-06-15T18:45:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T18:45:00Z',
    updated_at: '2024-06-15T18:50:00Z',
    tym: demoTymy[1],
    chytil: demoProfiles[1],
  },
  {
    id: 'demo-ulovek-9',
    tym_id: 'demo-tym-2',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 9.8,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2016/11/29/04/17/carp-1867348_1280.jpg',
    chytil_user_id: 'demo-user-2',
    cas: '2024-06-16T04:15:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-16T04:15:00Z',
    updated_at: '2024-06-16T04:20:00Z',
    tym: demoTymy[1],
    chytil: demoProfiles[1],
  },
  // Tým 3 - Zlatí Kapři (3 confirmed catches)
  {
    id: 'demo-ulovek-10',
    tym_id: 'demo-tym-3',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 16.4,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2018/04/25/09/26/carp-3349551_1280.jpg',
    chytil_user_id: 'demo-user-3',
    cas: '2024-06-15T09:30:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T09:30:00Z',
    updated_at: '2024-06-15T09:35:00Z',
    tym: demoTymy[2],
    chytil: demoProfiles[2],
  },
  {
    id: 'demo-ulovek-11',
    tym_id: 'demo-tym-3',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 13.1,
    druh: 'amur',
    foto_url: 'https://cdn.pixabay.com/photo/2020/05/17/19/51/grass-carp-5182925_1280.jpg',
    chytil_user_id: 'demo-user-3',
    cas: '2024-06-15T15:00:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T15:00:00Z',
    updated_at: '2024-06-15T15:05:00Z',
    tym: demoTymy[2],
    chytil: demoProfiles[2],
  },
  {
    id: 'demo-ulovek-12',
    tym_id: 'demo-tym-3',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 10.9,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2019/07/16/18/24/carp-4342347_1280.jpg',
    chytil_user_id: 'demo-user-3',
    cas: '2024-06-15T22:00:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T22:00:00Z',
    updated_at: '2024-06-15T22:05:00Z',
    tym: demoTymy[2],
    chytil: demoProfiles[2],
  },
  // Tým 4 - Noční Rybáři (2 confirmed, 1 pending)
  {
    id: 'demo-ulovek-13',
    tym_id: 'demo-tym-4',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 19.7,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2018/08/12/16/59/carp-3601851_1280.jpg',
    chytil_user_id: 'demo-user-4',
    cas: '2024-06-15T23:30:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T23:30:00Z',
    updated_at: '2024-06-15T23:35:00Z',
    tym: demoTymy[3],
    chytil: demoProfiles[3],
  },
  {
    id: 'demo-ulovek-14',
    tym_id: 'demo-tym-4',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 12.3,
    druh: 'amur',
    foto_url: 'https://cdn.pixabay.com/photo/2020/05/17/19/51/grass-carp-5182926_1280.jpg',
    chytil_user_id: 'demo-user-4',
    cas: '2024-06-16T02:00:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-16T02:00:00Z',
    updated_at: '2024-06-16T02:05:00Z',
    tym: demoTymy[3],
    chytil: demoProfiles[3],
  },
  // Pending catch - waiting for confirmation
  {
    id: 'demo-ulovek-15',
    tym_id: 'demo-tym-4',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 14.8,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2017/08/06/12/06/carp-2591721_1280.jpg',
    chytil_user_id: 'demo-user-4',
    cas: '2024-06-16T07:30:00Z',
    stav: 'ceka',
    potvrzeno_rozhodcim: false,
    created_at: '2024-06-16T07:30:00Z',
    updated_at: '2024-06-16T07:30:00Z',
    tym: demoTymy[3],
    chytil: demoProfiles[3],
    potvrzeni: [
      {
        id: 'demo-potvrzeni-1',
        ulovek_id: 'demo-ulovek-15',
        potvrdil_user_id: 'demo-user-3',
        potvrdil_tym_id: 'demo-tym-3',
        potvrzeno: true,
        poznamka: null,
        created_at: '2024-06-16T07:35:00Z',
        potvrdil_user: demoProfiles[2],
        potvrdil_tym: demoTymy[2],
      },
    ],
  },
  // Tým 5 - Jezero Team (2 confirmed catches)
  {
    id: 'demo-ulovek-16',
    tym_id: 'demo-tym-5',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 11.6,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2016/11/29/04/17/carp-1867349_1280.jpg',
    chytil_user_id: 'demo-user-5',
    cas: '2024-06-15T11:00:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T11:00:00Z',
    updated_at: '2024-06-15T11:05:00Z',
    tym: demoTymy[4],
    chytil: demoProfiles[4],
  },
  {
    id: 'demo-ulovek-17',
    tym_id: 'demo-tym-5',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 8.4,
    druh: 'amur',
    foto_url: 'https://cdn.pixabay.com/photo/2020/06/09/02/14/grass-carp-5276290_1280.jpg',
    chytil_user_id: 'demo-user-5',
    cas: '2024-06-15T17:30:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T17:30:00Z',
    updated_at: '2024-06-15T17:35:00Z',
    tym: demoTymy[4],
    chytil: demoProfiles[4],
  },
  // Tým 6 - Carp Masters (1 confirmed, 1 pending)
  {
    id: 'demo-ulovek-18',
    tym_id: 'demo-tym-6',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 17.2,
    druh: 'kapr',
    foto_url: 'https://cdn.pixabay.com/photo/2018/04/25/09/26/carp-3349552_1280.jpg',
    chytil_user_id: 'demo-user-6',
    cas: '2024-06-15T13:45:00Z',
    stav: 'potvrzeno',
    potvrzeno_rozhodcim: true,
    created_at: '2024-06-15T13:45:00Z',
    updated_at: '2024-06-15T13:50:00Z',
    tym: demoTymy[5],
    chytil: demoProfiles[5],
  },
  // Another pending catch
  {
    id: 'demo-ulovek-19',
    tym_id: 'demo-tym-6',
    zavod_id: DEMO_ZAVOD_ID,
    vaha: 13.5,
    druh: 'amur',
    foto_url: 'https://cdn.pixabay.com/photo/2020/05/17/19/51/grass-carp-5182927_1280.jpg',
    chytil_user_id: 'demo-user-6',
    cas: '2024-06-16T08:00:00Z',
    stav: 'ceka',
    potvrzeno_rozhodcim: false,
    created_at: '2024-06-16T08:00:00Z',
    updated_at: '2024-06-16T08:00:00Z',
    tym: demoTymy[5],
    chytil: demoProfiles[5],
    potvrzeni: [],
  },
]


// Demo závod configuration
export const demoZavod: Zavod = {
  id: DEMO_ZAVOD_ID,
  soutez_id: null,
  nazev: 'Ukázkový Závod Carp Club ČR',
  misto: 'Jezero Lhota, Středočeský kraj',
  datum_start: '2024-06-15T06:00:00Z',
  datum_end: '2024-06-16T12:00:00Z',
  embargo_od: '2024-06-16T10:00:00Z', // Embargo starts 2 hours before end
  pravidla: `# Pravidla závodu

## Obecná pravidla
1. Závod trvá 30 hodin
2. Každý tým má přidělený peg
3. Povolené druhy ryb: kapr, amur
4. Minimální váha úlovku: 5 kg

## Bodování
- Počítá se součet 5 nejtěžších ryb
- Žlutá karta = -10% ze skóre
- 2 žluté karty = diskvalifikace

## Potvrzování úlovků
- Každý úlovek musí být potvrzen sousedními pegy
- Úlovek musí být vyfocen s váhou
- Rozhodčí má právo úlovek zamítnout

## Embargo
- 2 hodiny před koncem závodu
- Váhy úlovků jsou skryté
- Výsledky se zobrazí po skončení`,
  stav: 'probiha',
  pocet_potvrzeni: 2,
  min_vaha_kg: 5,
  top_n_ryb: 5,
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-06-15T06:00:00Z',
}

// Calculate leaderboard from demo data
function calculateDemoLeaderboard(): LeaderboardEntry[] {
  const teamScores = demoTymy.map(tym => {
    // Get confirmed catches for this team
    const teamCatches = demoUlovky.filter(
      u => u.tym_id === tym.id && u.stav === 'potvrzeno'
    )
    
    // Sort by weight descending and take top 5
    const sortedCatches = [...teamCatches].sort((a, b) => b.vaha - a.vaha)
    const top5 = sortedCatches.slice(0, 5)
    
    // Calculate total score
    const skore = top5.reduce((sum, u) => sum + u.vaha, 0)
    
    // Get earliest catch time for tiebreaker
    const earliestCatch = teamCatches.length > 0
      ? teamCatches.reduce((earliest, u) => 
          new Date(u.cas) < new Date(earliest.cas) ? u : earliest
        )
      : null
    
    return {
      tym,
      skore,
      pocetRyb: teamCatches.length,
      top5Ryby: top5,
      zluteKarty: 0, // No yellow cards in demo
      poradiCas: earliestCatch?.cas || '',
      poradi: 0, // Will be set after sorting
    }
  })
  
  // Sort by score descending, then by earliest catch time
  teamScores.sort((a, b) => {
    if (b.skore !== a.skore) return b.skore - a.skore
    if (!a.poradiCas) return 1
    if (!b.poradiCas) return -1
    return new Date(a.poradiCas).getTime() - new Date(b.poradiCas).getTime()
  })
  
  // Assign positions
  return teamScores.map((entry, index) => ({
    ...entry,
    poradi: index + 1,
  }))
}

export const demoLeaderboard: LeaderboardEntry[] = calculateDemoLeaderboard()

// Get biggest fish from demo data
export function getDemoBiggestFish(limit: number = 10): UlovekWithRelations[] {
  return demoUlovky
    .filter(u => u.stav === 'potvrzeno')
    .sort((a, b) => b.vaha - a.vaha)
    .slice(0, limit)
}

// Get pending catches for demo (for potvrzeni UI demonstration)
export function getDemoPendingUlovky(): UlovekWithRelations[] {
  return demoUlovky.filter(u => u.stav === 'ceka')
}

// Get confirmed catches for gallery
export function getDemoConfirmedUlovky(): UlovekWithRelations[] {
  return demoUlovky.filter(u => u.stav === 'potvrzeno')
}

// Check if demo embargo is active (for demonstration purposes)
// This can be toggled to show embargo state in the demo
let demoEmbargoOverride: boolean | null = null

export function isDemoEmbargoActive(): boolean {
  // If override is set, use it
  if (demoEmbargoOverride !== null) {
    return demoEmbargoOverride
  }
  // Default: show embargo as inactive to demonstrate normal state
  return false
}

// Function to toggle embargo state for demonstration
export function setDemoEmbargoActive(active: boolean): void {
  demoEmbargoOverride = active
}

// Helper to check if a zavod ID is the demo
export function isDemoZavod(zavodId: string): boolean {
  return zavodId === DEMO_ZAVOD_ID
}
