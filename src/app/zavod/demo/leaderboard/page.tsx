"use client"

import { useState } from "react"
import { AlertCircle, Sparkles, CheckCircle, EyeOff, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LeaderboardTable } from "@/components/zavod/LeaderboardTable"
import { NejvetsiRybaCard } from "@/components/zavod/NejvetsiRybaCard"
import { DemoProtectedButton } from "@/components/zavod"
import { 
  demoLeaderboard, 
  getDemoBiggestFish,
  isDemoEmbargoActive 
} from "@/lib/demo-data"

/**
 * Demo Leaderboard Page
 * 
 * Displays demo leaderboard with static data.
 * Requirements: 5.1, 5.4, 5.6
 */
export default function DemoLeaderboardPage() {
  const leaderboard = demoLeaderboard
  const nejvetsiRyby = getDemoBiggestFish(10)
  const defaultEmbargoActive = isDemoEmbargoActive()
  
  // Local state to toggle embargo for demonstration (Requirement 5.6)
  const [embargoActive, setEmbargoActive] = useState(defaultEmbargoActive)

  return (
    <div className="space-y-6">
      {/* Demo Banner with Embargo Toggle */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-purple-700">Ukázkové pořadí</p>
          <p className="text-sm text-purple-600/80">
            Toto jsou demonstrační data. V reálném závodě se pořadí aktualizuje automaticky.
          </p>
        </div>
        {/* Embargo toggle for demonstration - Requirement 5.6 */}
        <Button
          variant={embargoActive ? "default" : "outline"}
          size="sm"
          onClick={() => setEmbargoActive(!embargoActive)}
          className="gap-2 flex-shrink-0"
        >
          {embargoActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {embargoActive ? "Embargo ON" : "Embargo OFF"}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pořadí</h1>
          <p className="text-muted-foreground">Aktuální pořadí týmů v závodě</p>
        </div>
      </div>

      {embargoActive && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Embargo je aktivní</p>
            <p className="text-sm opacity-90">Váhy úlovků jsou skryté. Plné výsledky budou zobrazeny po skončení závodu.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeaderboardTable 
            entries={leaderboard} 
            embargoActive={embargoActive} 
            showWeights={!embargoActive} 
            isLoading={false} 
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <NejvetsiRybaCard 
            ryby={nejvetsiRyby} 
            embargoActive={embargoActive} 
            showWeights={!embargoActive} 
            isLoading={false} 
            limit={10} 
          />
          
          {/* Demo confirmation card - Requirement 5.7 */}
          <Card className="border-dashed border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Potvrzování úlovků
              </CardTitle>
              <CardDescription>
                V reálném závodě zde potvrzujete úlovky sousedních týmů
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DemoProtectedButton
                actionDescription="potvrzení úlovků"
                variant="outline"
                className="w-full"
              >
                Zobrazit čekající úlovky
              </DemoProtectedButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
