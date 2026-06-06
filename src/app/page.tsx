import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Trophy, Clock, Archive } from 'lucide-react'
import {
  HeroSection,
  FeaturesSection,
  DemoPreviewSection,
  HowItWorksSection,
  SocialProofSection,
  FAQSection,
  OrganizersSection,
} from '@/components/landing'
import type { Zavod, Soutez } from '@/lib/types'

interface ZavodWithSoutez extends Zavod {
  souteze?: Soutez | null
}

async function getZavody(): Promise<{ aktualni: ZavodWithSoutez[]; archiv: ZavodWithSoutez[] }> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Fetch all competitions with their soutez info
  const { data: zavody, error } = await supabase
    .from('zavody')
    .select(`
      *,
      souteze (*)
    `)
    .order('datum_start', { ascending: false })

  if (error || !zavody) {
    console.error('Error fetching zavody:', error)
    return { aktualni: [], archiv: [] }
  }

  const zavodList = zavody as ZavodWithSoutez[]

  // Split into current/upcoming and archived
  const aktualni = zavodList.filter(z => 
    z.stav !== 'ukoncen' || new Date(z.datum_end) >= new Date(now)
  )
  const archiv = zavodList.filter(z => 
    z.stav === 'ukoncen' && new Date(z.datum_end) < new Date(now)
  ).slice(0, 3) // Show only last 3 archived

  return { aktualni, archiv }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  if (startDate.toDateString() === endDate.toDateString()) {
    return formatDate(start)
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`
}

function getStavBadge(stav: string): { text: string; className: string } {
  switch (stav) {
    case 'probiha':
      return { text: 'Probíhá', className: 'bg-success/15 text-success' }
    case 'priprava':
      return { text: 'Příprava', className: 'bg-warning/15 text-warning' }
    case 'ukoncen':
      return { text: 'Ukončen', className: 'bg-muted text-muted-foreground' }
    default:
      return { text: stav, className: 'bg-muted text-muted-foreground' }
  }
}

function ZavodCard({ zavod, isArchive = false }: { zavod: ZavodWithSoutez; isArchive?: boolean }) {
  const stavBadge = getStavBadge(zavod.stav)
  
  return (
    <Card className="hover-lift bg-card border-border transition-shadow duration-300 hover:shadow-halo">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-foreground">{zavod.nazev}</CardTitle>
            {zavod.souteze && (
              <CardDescription className="text-muted-foreground">
                Soutěž {zavod.souteze.nazev} {zavod.souteze.rok}
              </CardDescription>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stavBadge.className}`}>
            {stavBadge.text}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDateRange(zavod.datum_start, zavod.datum_end)}</span>
        </div>

        {zavod.misto && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{zavod.misto}</span>
          </div>
        )}

        {zavod.embargo_od && !isArchive && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Embargo od {formatDate(zavod.embargo_od)}</span>
          </div>
        )}

        <div className="pt-2 flex gap-2">
          <Button asChild variant={isArchive ? "outline" : "default"} size="sm" className="flex-1 hover-scale">
            <Link href={`/zavod/${zavod.id}/leaderboard`}>
              <Trophy className="h-4 w-4 mr-2" />
              {isArchive ? 'Zobrazit výsledky' : 'Sledovat live'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function Home() {
  const { aktualni, archiv } = await getZavody()

  return (
    <div className="min-h-screen landing-page">
      {/* Hero Section - Marketing wow effect */}
      <HeroSection />

      {/* Social Proof - Trust building */}
      <SocialProofSection />

      {/* Current competitions - PRIORITY: show immediately after hero */}
      {aktualni.length > 0 && (
        <section id="zavody" className="py-12 md:py-20 container mx-auto px-4 scroll-mt-20">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-xl md:text-3xl font-bold text-foreground">
              Aktuální závody
            </h2>
          </div>

          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {aktualni.map((zavod) => (
              <ZavodCard key={zavod.id} zavod={zavod} />
            ))}
          </div>
        </section>
      )}

      {/* Features Section */}
      <FeaturesSection />

      {/* Demo Preview Section */}
      <DemoPreviewSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* For Organizers Section - B2B targeting */}
      <OrganizersSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Archive preview - if any exist */}
      {archiv.length > 0 && (
        <section className="py-12 md:py-20 container mx-auto px-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-xl md:text-3xl font-bold text-foreground">
              Archiv závodů
            </h2>
            <Button asChild variant="ghost" size="sm" className="hover-underline">
              <Link href="/archiv">
                <Archive className="h-4 w-4 mr-2" />
                Zobrazit vše
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {archiv.map((zavod) => (
              <ZavodCard key={zavod.id} zavod={zavod} isArchive />
            ))}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="py-20 md:py-32 text-center border-t border-border/50">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Připraveni začít?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Vyzkoušejte si demo závod nebo se přihlaste a začněte používat systém pro vaše závody.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="hover-glow hover-scale bg-accent hover:bg-accent/90">
              <Link href="/zavod/demo">
                <Trophy className="w-5 h-5 mr-2" />
                Vyzkoušet demo
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="hover-lift">
              <Link href="/login">
                Přihlásit se
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
