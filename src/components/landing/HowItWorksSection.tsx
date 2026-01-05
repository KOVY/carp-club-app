'use client'

import { useRef } from 'react'
import { 
  UserPlus, 
  Fish, 
  CheckCircle, 
  Trophy,
  ArrowRight
} from 'lucide-react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Step {
  number: number
  icon: React.ReactNode
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: 1,
    icon: <UserPlus className="w-6 h-6" />,
    title: 'Registrace týmu',
    description: 'Kapitán zaregistruje tým do závodu. Obdrží přidělený peg a přístupové údaje.',
  },
  {
    number: 2,
    icon: <Fish className="w-6 h-6" />,
    title: 'Zadání úlovku',
    description: 'Po chycení ryby zadáte váhu, druh a nahrajete fotku. Trvá to pár sekund.',
  },
  {
    number: 3,
    icon: <CheckCircle className="w-6 h-6" />,
    title: 'Potvrzení sousedy',
    description: 'Sousední pegy potvrdí váš úlovek. Bez nutnosti chodícího rozhodčího.',
  },
  {
    number: 4,
    icon: <Trophy className="w-6 h-6" />,
    title: 'Živé výsledky',
    description: 'Sledujte aktuální pořadí v reálném čase. Výsledky se aktualizují automaticky.',
  },
]

function StepCard({ step, index, isVisible }: { step: Step; index: number; isVisible: boolean }) {
  const isLast = index === steps.length - 1

  return (
    <div 
      className={`relative flex flex-col items-center transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Step number circle */}
      <div className="relative z-10 w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
        {step.icon}
      </div>

      {/* Step number badge */}
      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center z-20">
        {step.number}
      </div>

      {/* Content */}
      <div className="mt-6 text-center max-w-xs">
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Connector arrow (not on last item) */}
      {!isLast && (
        <div className="hidden lg:block absolute top-8 left-[calc(100%+1rem)] w-[calc(100%-2rem)]">
          <div className="flex items-center justify-center">
            <div className="flex-1 h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
            <ArrowRight className="w-5 h-5 text-primary/50 mx-2" />
            <div className="flex-1 h-0.5 bg-gradient-to-r from-primary/20 to-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.1 })

  return (
    <section 
      ref={sectionRef}
      id="jak-to-funguje"
      className="py-20 md:py-32 relative scroll-mt-20"
    >
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div 
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-500 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Jak to funguje
          </h2>
          <p className="text-muted-foreground text-lg">
            Jednoduchý proces od registrace až po finální výsledky. Vše zvládnete přímo u vody.
          </p>
        </div>

        {/* Steps - horizontal on desktop, vertical on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {steps.map((step, index) => (
            <StepCard 
              key={step.number} 
              step={step} 
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* Mobile vertical connector */}
        <div className="lg:hidden absolute left-1/2 top-[200px] bottom-[200px] w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-primary/10 -translate-x-1/2 -z-10" />
      </div>
    </section>
  )
}
