import { Suspense } from "react"
import { notFound } from "next/navigation"
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Fish,
  Trophy,
  AlertTriangle,
  UserCircle
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { DataDisplay } from "@/components/ui/DataDisplay"
import { SkeletonLoader } from "@/components/ui/SkeletonLoader"
import { CompactLeaderboard, CompactBiggestFish, AddCatchButton, MapaPravidla } from "@/components/zavod"
import { getLeaderboard, getNejvetsiRyby } from "@/actions/leaderboard.actions"
import type { Zavod, UserRole } from "@/lib/types"

// Extended Zavod type with map fields
interface ZavodWithMap extends Zavod {
  map_lat?: number | null
  map_lng?: number | null
  map_zoom?: number | null
  map_location_name?: string | null
}

// Team type with peg coordinates
interface TymWithPeg {
  id: string
  nazev: string
  barva: string | null
  peg_cislo: number | null
  peg_lat: number | null
  peg_lng: number | null
}

interface ZavodPageProps {
  params: Promise<{ zavodId: string }>
}

export default async function ZavodPage({ params }: ZavodPageProps) {
  const { zavodId } = await params
  const supabase = await createClient()

  // Fetch zavod data
  const { data: zavod, error } = await supabase
    .from('zavody')
    .select('*')
    .eq('id', zavodId)
    .single()

  if (error || !zavod) {
    notFound()
  }

  const zavodData = zavod as ZavodWithMap

  // Fetch all teams with peg coordinates for the map
  const { data: allTeams } = await supabase
    .from('tymy')
    .select('id, nazev, barva, peg_cislo, peg_lat, peg_lng')
    .eq('zavod_id', zavodId)
    .order('peg_cislo', { ascending: true })

  const tymyForMap = (allTeams || []) as TymWithPeg[]

  // Fetch current user and their info
  const { data: { user } } = await supabase.auth.getUser()

  let userProfile: { jmeno: string; telefon: string | null } | null = null
  let userRole: UserRole | null = null
  let userTeam: { id: string; nazev: string; barva: string; peg_cislo: number | null } | null = null

  if (user) {
    // Fetch user profile (adminClient — telefon skryto RLS po migraci 016)
    const adminClient = createAdminClient()
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('jmeno, telefon')
      .eq('id', user.id)
      .single()

    if (profileData) {
      userProfile = profileData as { jmeno: string; telefon: string | null }
    }

    // Fetch user role in this zavod
    const { data: roleData } = await supabase
      .from('zavod_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('zavod_id', zavodId)
      .single()
    userRole = (roleData as { role: UserRole } | null)?.role || null

    // Fetch user's team in this zavod (via clenove_tymu)
    // First get all teams in this zavod
    const { data: zavodTeams } = await supabase
      .from('tymy')
      .select('id')
      .eq('zavod_id', zavodId)

    if (zavodTeams && zavodTeams.length > 0) {
      const teamIds = (zavodTeams as { id: string }[]).map(t => t.id)

      // Check if user is member of any team in this zavod
      const { data: membershipData } = await supabase
        .from('clenove_tymu')
        .select('tym_id')
        .eq('user_id', user.id)
        .in('tym_id', teamIds)
        .single()

      if (membershipData) {
        const membership = membershipData as { tym_id: string }
        // Get team details
        const { data: teamData } = await supabase
          .from('tymy')
          .select('id, nazev, barva, peg_cislo')
          .eq('id', membership.tym_id)
          .single()

        if (teamData) {
          userTeam = teamData as { id: string; nazev: string; barva: string; peg_cislo: number | null }
        }
      }
    }
  }

  // Fetch teams count
  const { count: teamsCount } = await supabase
    .from('tymy')
    .select('*', { count: 'exact', head: true })
    .eq('zavod_id', zavodId)

  // Fetch confirmed catches count
  const { count: catchesCount } = await supabase
    .from('ulovky')
    .select('*', { count: 'exact', head: true })
    .eq('zavod_id', zavodId)
    .eq('stav', 'potvrzeno')

  // Fetch leaderboard
  const leaderboardResult = await getLeaderboard(zavodId)
  const leaderboard = leaderboardResult.success ? leaderboardResult.data?.leaderboard || [] : []
  const embargoActive = leaderboardResult.success ? leaderboardResult.data?.embargoActive || false : false

  // Fetch biggest fish
  const biggestFishResult = await getNejvetsiRyby(zavodId, 1)
  const biggestFish = biggestFishResult.success ? biggestFishResult.data?.ryby[0] || null : null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStavText = (stav: string) => {
    switch (stav) {
      case 'priprava':
        return 'Příprava'
      case 'probiha':
        return 'Probíhá'
      case 'ukoncen':
        return 'Ukončen'
      default:
        return stav
    }
  }

  const getRoleText = (role: UserRole) => {
    switch (role) {
      case 'hlavni_admin':
        return 'Hlavní Admin'
      case 'poradatel':
        return 'Pořadatel'
      case 'rozhodci':
        return 'Rozhodčí'
      case 'kapitan':
        return 'Kapitán'
      case 'zavodnik':
        return 'Závodník'
      case 'divak':
        return 'Divák'
      default:
        return role
    }
  }

  const isEmbargoActive = () => {
    if (!zavodData.embargo_od) return false
    const now = new Date()
    const embargoStart = new Date(zavodData.embargo_od)
    const zavodEnd = new Date(zavodData.datum_end)
    return now >= embargoStart && now <= zavodEnd
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Catch button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{zavodData.nazev}</h1>
          {zavodData.misto && (
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4" />
              {zavodData.misto}
            </p>
          )}
        </div>
        {/* Add Catch Button - always visible for logged in users with role */}
        <AddCatchButton
          zavodId={zavodId}
          zavodStav={zavodData.stav}
          serverUserRole={userRole}
        />
      </div>

      {/* User Welcome Card - for logged in users */}
      {user && (
        <GlassCard className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <GlassCardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar with team color */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  style={{ backgroundColor: userTeam?.barva || 'hsl(var(--primary))' }}
                >
                  {userProfile?.jmeno
                    ? userProfile.jmeno
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : <UserCircle className="h-8 w-8" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {userProfile?.jmeno || user.email?.split('@')[0] || 'Uživatel'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {userRole && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-xs">
                        {getRoleText(userRole)}
                      </span>
                    )}
                    {userTeam && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: userTeam.barva }}
                        />
                        <span>{userTeam.nazev}</span>
                        {userTeam.peg_cislo && (
                          <span className="text-muted-foreground">• Peg {userTeam.peg_cislo}</span>
                        )}
                      </span>
                    )}
                    {!userRole && !userTeam && (
                      <span className="text-muted-foreground">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick action - Add catch (client-side to handle hash token auth) */}
              <AddCatchButton
                zavodId={zavodId}
                zavodStav={zavodData.stav}
                serverUserRole={userRole}
              />
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Stav závodu</GlassCardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay value={getStavText(zavodData.stav)} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(zavodData.datum_start)} - {formatDate(zavodData.datum_end)}
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Týmy</GlassCardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay value={teamsCount || 0} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              registrovaných týmů
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Úlovky</GlassCardTitle>
            <Fish className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay value={catchesCount || 0} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              potvrzených úlovků
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Embargo</GlassCardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay 
              value={isEmbargoActive() ? "Aktivní" : zavodData.embargo_od ? "Naplánováno" : "Vypnuto"} 
              size="lg"
              status={isEmbargoActive() ? "pending" : undefined}
            />
            {zavodData.embargo_od && (
              <p className="text-xs text-muted-foreground mt-1">
                od {formatTime(zavodData.embargo_od)}
              </p>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard preview */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Aktuální pořadí
            </GlassCardTitle>
            <GlassCardDescription>
              Top 5 týmů v závodě
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <Suspense fallback={<SkeletonLoader variant="table-row" count={5} />}>
              <CompactLeaderboard 
                entries={leaderboard} 
                embargoActive={embargoActive}
                limit={5}
              />
            </Suspense>
          </GlassCardContent>
        </GlassCard>

        {/* Biggest fish preview */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Fish className="h-5 w-5" />
              Největší ryba
            </GlassCardTitle>
            <GlassCardDescription>
              Aktuálně největší úlovek
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <Suspense fallback={<SkeletonLoader variant="card" height={80} />}>
              <CompactBiggestFish 
                fish={biggestFish} 
                embargoActive={embargoActive}
              />
            </Suspense>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Competition info */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informace o závodě
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-1">Začátek</h4>
              <p className="text-muted-foreground">
                {formatDate(zavodData.datum_start)} v {formatTime(zavodData.datum_start)}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Konec</h4>
              <p className="text-muted-foreground">
                {formatDate(zavodData.datum_end)} v {formatTime(zavodData.datum_end)}
              </p>
            </div>
            {zavodData.embargo_od && (
              <div>
                <h4 className="font-medium mb-1">Embargo od</h4>
                <p className="text-muted-foreground">
                  {formatDate(zavodData.embargo_od)} v {formatTime(zavodData.embargo_od)}
                </p>
              </div>
            )}
            {zavodData.misto && (
              <div>
                <h4 className="font-medium mb-1">Místo</h4>
                <p className="text-muted-foreground">{zavodData.misto}</p>
              </div>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Map and Rules - show if map is configured or rules exist */}
      {(zavodData.map_lat || zavodData.pravidla) && (
        <MapaPravidla
          zavod={zavodData}
          tymy={tymyForMap}
          userTymId={userTeam?.id}
          userPegCislo={userTeam?.peg_cislo}
        />
      )}
    </div>
  )
}
