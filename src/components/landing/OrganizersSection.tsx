'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import {
  Settings,
  BarChart3,
  Users,
  Bell,
  FileSpreadsheet,
  Shield,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

const organizerFeatures: Feature[] = [
  {
    icon: <Settings className="w-5 h-5" />,
    title: 'Kompletní správa závodu',
    description: 'Nastavení pravidel, embargo, časový harmonogram',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Správa týmů a pegů',
    description: 'Registrace, losování pozic, správa členů',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Živé statistiky',
    description: 'Přehledy v reálném čase, grafy, analýzy',
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: 'Notifikace a oznámení',
    description: 'Hromadné zprávy všem účastníkům',
  },
  {
    icon: <FileSpreadsheet className="w-5 h-5" />,
    title: 'Export výsledků',
    description: 'PDF protokoly, Excel tabulky, statistiky',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Žluté karty a disciplína',
    description: 'Systém varování, stopky, diskvalifikace',
  },
]

const benefits: string[] = [
  'Žádné papírování během závodu',
  'Automatické výpočty a pořadí',
  'Férové podmínky pro všechny',
  'Historie všech závodů',
  'Technická podpora 24/7',
]

export function OrganizersSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.1 })

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 -z-10" />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Content */}
          <div
            className={`transition-all duration-500 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Settings className="w-4 h-4" />
              <span>Pro organizátory</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pořádáte kaprařské závody?
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Přestaňte řešit papíry a ruční sčítání. Carp Club ČR vám poskytne
              kompletní nástroje pro profesionální organizaci závodů.
            </p>

            {/* Benefits list */}
            <ul className="space-y-3 mb-8">
              {benefits.map((benefit, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-foreground"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="hover-glow hover-scale bg-accent hover:bg-accent/90"
              >
                <Link href="/kontakt">
                  Kontaktujte nás
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="hover-lift"
              >
                <Link href="/zavod/demo">
                  Prohlédnout demo
                </Link>
              </Button>
            </div>
          </div>

          {/* Right column - Features grid */}
          <div
            className={`transition-all duration-500 ease-out delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {organizerFeatures.map((feature, index) => (
                <GlassCard
                  key={index}
                  className="p-5 hover-lift cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
