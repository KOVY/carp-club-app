"use client"

import { useState } from "react"
import { 
  FileText, 
  Sparkles, 
  Clock,
  AlertTriangle,
  Fish,
  Trophy,
  Users,
  Scale,
  Eye,
  EyeOff
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { demoZavod, isDemoEmbargoActive } from "@/lib/demo-data"

/**
 * Demo Pravidla (Rules) Page
 * 
 * Displays demo competition rules with embargo state demonstration.
 * Requirements: 5.6 - Demonstrate embargo stav ukázka
 */
export default function DemoPravidlaPage() {
  const defaultEmbargoActive = isDemoEmbargoActive()
  
  // Local state to toggle embargo for demonstration (Requirement 5.6)
  const [embargoActive, setEmbargoActive] = useState(defaultEmbargoActive)
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Demo Banner with Embargo Toggle */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-purple-700">Ukázková pravidla</p>
          <p className="text-sm text-purple-600/80">
            Toto jsou demonstrační pravidla závodu. Každý reálný závod má vlastní specifická pravidla.
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
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Pravidla závodu
          </h1>
          <p className="text-muted-foreground">{demoZavod.nazev}</p>
        </div>
      </div>

      {/* Embargo Status Card - Requirement 5.6 */}
      <Card className={embargoActive 
        ? "border-amber-500/50 bg-amber-500/10" 
        : "border-blue-500/20 bg-blue-500/5"
      }>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${embargoActive ? "text-amber-600" : "text-blue-600"}`} />
            Embargo
            <StatusBadge status={embargoActive ? "embargo" : "pending"}>
              {embargoActive ? "Aktivní" : "Naplánováno"}
            </StatusBadge>
          </CardTitle>
          <CardDescription>
            Období, kdy jsou váhy úlovků skryté
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Začátek embarga</p>
              <p className="text-lg font-semibold">
                {demoZavod.embargo_od 
                  ? `${formatDate(demoZavod.embargo_od)} v ${formatTime(demoZavod.embargo_od)}`
                  : "Není nastaveno"
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Konec závodu</p>
              <p className="text-lg font-semibold">
                {formatDate(demoZavod.datum_end)} v {formatTime(demoZavod.datum_end)}
              </p>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${embargoActive ? "bg-amber-500/20" : "bg-blue-500/10"}`}>
            <p className={`text-sm ${embargoActive ? "text-amber-700" : "text-blue-700"}`}>
              {embargoActive ? (
                <>
                  <strong>Embargo je aktivní!</strong> Váhy všech úlovků jsou nyní skryté. 
                  Pořadí týmů je zobrazeno pouze podle počtu ryb. Plné výsledky budou 
                  zveřejněny po skončení závodu.
                </>
              ) : (
                <>
                  Embargo začne 2 hodiny před koncem závodu. Během embarga budou váhy 
                  úlovků skryté, aby se zachovalo napětí do posledních minut soutěže.
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Competition Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Časový harmonogram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Začátek závodu</span>
              <span className="font-medium">
                {formatDate(demoZavod.datum_start)} v {formatTime(demoZavod.datum_start)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Konec závodu</span>
              <span className="font-medium">
                {formatDate(demoZavod.datum_end)} v {formatTime(demoZavod.datum_end)}
              </span>
            </div>
            {demoZavod.embargo_od && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Začátek embarga</span>
                <span className="font-medium text-amber-600">
                  {formatDate(demoZavod.embargo_od)} v {formatTime(demoZavod.embargo_od)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Bodování
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Počítané ryby</span>
              <span className="font-medium">Top {demoZavod.top_n_ryb} nejtěžších</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minimální váha</span>
              <span className="font-medium">{demoZavod.min_vaha_kg} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Potřebná potvrzení</span>
              <span className="font-medium">{demoZavod.pocet_potvrzeni}x od sousedů</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Povolené druhy ryb
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-2xl">🐟</span>
              <span className="font-medium">Kapr</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="text-2xl">🐠</span>
              <span className="font-medium">Amur</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Žluté karty
          </CardTitle>
          <CardDescription>
            Penalizace za porušení pravidel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700">1 žlutá karta</p>
              <p className="text-sm text-amber-600">-10% z celkového skóre</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-700">2 žluté karty</p>
              <p className="text-sm text-red-600">Diskvalifikace z celého závodu</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Potvrzování úlovků
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <ul className="space-y-2 text-muted-foreground">
            <li>Každý úlovek musí být potvrzen sousedními pegy</li>
            <li>Úlovek musí být vyfocen s váhou viditelnou na displeji</li>
            <li>Fotografie musí být pořízena před puštěním ryby</li>
            <li>Rozhodčí má právo úlovek zamítnout při podezření na podvod</li>
            <li>Zamítnutý úlovek lze reklamovat u hlavního rozhodčího</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
