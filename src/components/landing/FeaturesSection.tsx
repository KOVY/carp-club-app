'use client'

import { useRef } from 'react'
import { 
  Trophy, 
  Clock, 
  Users, 
  Camera, 
  Shield, 
  Smartphone,
  type LucideIcon 
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useScrollAnimation } from '@/hooks'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Trophy,
    title: 'Živé výsledky',
    description: 'Sledujte pořadí v reálném čase. Automatické aktualizace bez nutnosti obnovovat stránku.',
  },
  {
    icon: Clock,
    title: 'Rychlé zadávání',
    description: 'Úlovek zadáte během pár sekund přímo u vody. Optimalizováno pro mobilní zařízení.',
  },
  {
    icon: Users,
    title: 'Potvrzení sousedy',
    description: 'Sousední týmy potvrzují úlovky. Bez nutnosti chodícího rozhodčího.',
  },
  {
    icon: Camera,
    title: 'Fotodokumentace',
    description: 'Každý úlovek s fotkou. Galerie všech chycených ryb během závodu.',
  },
  {
    icon: Shield,
    title: 'Embargo systém',
    description: 'Automatické skrytí výsledků během embargo období. Férové podmínky pro všechny.',
  },
  {
    icon: Smartphone,
    title: 'Mobilní aplikace',
    description: 'Plně responzivní design. Funguje na jakémkoliv zařízení s prohlížečem.',
  },
]

interface FeatureCardProps {
  feature: Feature
  index: number
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isVisible = useScrollAnimation(cardRef, { threshold: 0.2 })

  const Icon = feature.icon

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-500 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <GlassCard className="h-full p-6 hover-lift transition-shadow duration-300 hover:shadow-halo">
        <div className="flex flex-col items-start gap-4">
          {/* Icon */}
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Icon className="w-6 h-6" />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.1 })

  return (
    <section 
      ref={sectionRef}
      className="py-20 md:py-32 relative"
    >
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div 
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-500 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Vše co potřebujete pro závod
          </h2>
          <p className="text-muted-foreground text-lg">
            Kompletní systém pro správu kaprařských závodů. Od registrace týmů až po finální výsledky.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
