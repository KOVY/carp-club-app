import { Suspense } from "react"
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Fish,
  Trophy,
  AlertTriangle,
  Sparkles,
  Plus
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CompactLeaderboard, CompactBiggestFish, DemoProtectedButton } from "@/components/zavod"
import { Loading } from "@/components/common/Loading"
import { 
  demoZavod, 
  demoTymy, 
  demoLeaderboard, 
  getDemoBiggestFish,
  getDemoConfirmedUlovky,
  isDemoEmbargoActive 
} from "@/lib/demo-data"

/**
 * Demo Závod Page
 * 
 * Displays demo závod with static data for presentation.
 * Requirements: 5.1, 5.3, 5.4, 5.5
 */
export default function DemoZavodPage() {
  const zavod = demoZavod
  const teamsCount = demoTymy.length
  const confirmedCatches = getDemoConfirmedUlovky()
  const catchesCount = confirmedCatches.length
  const leaderboard = demoLeaderboard
  const embargoActive = isDemoEmbargoActive()
  const biggestFish = getDemoBiggestFish(1)[0] || null

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

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-purple-700">Toto je ukázkový závod</p>
          <p className="text-sm text-purple-600/80">
            Prohlédněte si, jak aplikace funguje. Data jsou statická a slouží pouze pro demonstraci.
          </p>
        </div>
      </div>

      {/* Quick Actions - Protected actions with login prompt (Requirement 5.7) */}
      <Card className="border-dashed border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Rychlé akce
          </CardTitle>
          <CardDescription>
            Vyzkoušejte si, jak funguje přidávání úlovků
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <DemoProtectedButton
              actionDescription="přidání úlovku"
              className="gap-2"
            >
              <Fish className="h-4 w-4" />
              Přidat úlovek
            </DemoProtectedButton>
            <DemoProtectedButton
              actionDescription="potvrzení úlovku"
              variant="outline"
              className="gap-2"
            >
              Potvrdit úlovek
            </DemoProtectedButton>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{zavod.nazev}</h1>
        {zavod.misto && (
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <MapPin className="h-4 w-4" />
            {zavod.misto}
          </p>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stav závodu</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Probíhá</div>
            <p className="text-xs text-muted-foreground">
              {formatDate(zavod.datum_start)} - {formatDate(zavod.datum_end)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Týmy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamsCount}</div>
            <p className="text-xs text-muted-foreground">
              registrovaných týmů
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Úlovky</CardTitle>
            <Fish className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{catchesCount}</div>
            <p className="text-xs text-muted-foreground">
              potvrzených úlovků
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embargo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {embargoActive ? "Aktivní" : "Naplánováno"}
            </div>
            {zavod.embargo_od && (
              <p className="text-xs text-muted-foreground">
                od {formatTime(zavod.embargo_od)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Aktuální pořadí
            </CardTitle>
            <CardDescription>
              Top 5 týmů v závodě
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Loading />}>
              <CompactLeaderboard 
                entries={leaderboard} 
                embargoActive={embargoActive}
                limit={5}
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Biggest fish preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fish className="h-5 w-5" />
              Největší ryba
            </CardTitle>
            <CardDescription>
              Aktuálně největší úlovek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Loading />}>
              <CompactBiggestFish 
                fish={biggestFish} 
                embargoActive={embargoActive}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Competition info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informace o závodě
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-1">Začátek</h4>
              <p className="text-muted-foreground">
                {formatDate(zavod.datum_start)} v {formatTime(zavod.datum_start)}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Konec</h4>
              <p className="text-muted-foreground">
                {formatDate(zavod.datum_end)} v {formatTime(zavod.datum_end)}
              </p>
            </div>
            {zavod.embargo_od && (
              <div>
                <h4 className="font-medium mb-1">Embargo od</h4>
                <p className="text-muted-foreground">
                  {formatDate(zavod.embargo_od)} v {formatTime(zavod.embargo_od)}
                </p>
              </div>
            )}
            {zavod.misto && (
              <div>
                <h4 className="font-medium mb-1">Místo</h4>
                <p className="text-muted-foreground">{zavod.misto}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
