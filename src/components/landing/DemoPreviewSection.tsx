'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { DataDisplay } from '@/components/ui/DataDisplay'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Trophy, ArrowRight, Fish, MapPin, Calendar } from 'lucide-react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { demoLeaderboard, demoZavod } from '@/lib/demo-data'

export function DemoPreviewSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.1 })

  // Take top 5 teams for preview
  const topTeams = demoLeaderboard.slice(0, 5)

  return (
    <section 
      ref={sectionRef}
      className="py-20 md:py-32 relative bg-gradient-to-b from-transparent via-surface/50 to-transparent"
    >
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div 
          className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-500 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <Fish className="w-4 h-4" />
            <span>Živá ukázka</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Podívejte se jak to funguje
          </h2>
          <p className="text-muted-foreground text-lg">
            Prohlédněte si demo závod s ukázkovými daty. Vyzkoušejte si všechny funkce bez registrace.
          </p>
        </div>

        {/* Demo preview card */}
        <div 
          className={`max-w-4xl mx-auto transition-all duration-700 ease-out delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <GlassCard className="overflow-hidden">
            {/* Demo header */}
            <div className="p-6 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">{demoZavod.nazev}</h3>
                    <StatusBadge status="pending">Demo</StatusBadge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {demoZavod.misto}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Probíhá
                    </span>
                  </div>
                </div>
                <Button asChild className="hover-scale bg-accent hover:bg-accent/90">
                  <Link href="/zavod/demo">
                    Vstoupit do demo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Leaderboard preview */}
            <div className="p-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Aktuální pořadí
              </h4>
              
              <div className="space-y-3">
                {topTeams.map((entry, index) => (
                  <div 
                    key={entry.tym.id}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${
                      index === 0 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    style={{ 
                      transitionDelay: `${index * 100}ms`,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateX(0)' : 'translateX(-20px)'
                    }}
                  >
                    {/* Position */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 
                        ? 'bg-primary text-primary-foreground' 
                        : index === 1 
                          ? 'bg-muted-foreground/20 text-foreground'
                          : index === 2
                            ? 'bg-amber-500/20 text-amber-600'
                            : 'bg-muted text-muted-foreground'
                    }`}>
                      {entry.poradi}
                    </div>

                    {/* Team info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{entry.tym.nazev}</div>
                      <div className="text-xs text-muted-foreground">
                        Peg {entry.tym.peg_cislo} • {entry.pocetRyb} ryb
                      </div>
                    </div>

                    {/* Score */}
                    <DataDisplay 
                      value={`${entry.skore.toFixed(1)} kg`}
                      size="sm"
                    />
                  </div>
                ))}
              </div>

              {/* View more link */}
              <div className="mt-6 text-center">
                <Button asChild variant="ghost" size="sm" className="hover-underline">
                  <Link href="/zavod/demo/leaderboard">
                    Zobrazit kompletní leaderboard
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}
