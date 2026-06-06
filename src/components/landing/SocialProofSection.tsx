'use client'

import { useRef } from 'react'
import { Star, Quote } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Testimonial {
  id: string
  name: string
  role: string
  organization: string
  quote: string
  rating: number
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Martin Novák',
    role: 'Hlavní rozhodčí',
    organization: 'Carp Masters ČR',
    quote: 'Systém nám ušetřil hodiny práce. Už žádné papírování a ruční sčítání. Výsledky máme okamžitě.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Petr Svoboda',
    role: 'Kapitán týmu',
    organization: 'Team Moravia',
    quote: 'Konečně můžeme sledovat výsledky v reálném čase. Potvrzování úlovků sousedy je geniální nápad.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Jan Dvořák',
    role: 'Pořadatel',
    organization: 'Rybářský svaz Vysočina',
    quote: 'Přehledné, jednoduché a spolehlivé. Závodníci si systém rychle osvojili.',
    rating: 5,
  },
]

interface StatItem {
  value: string
  label: string
}

const stats: StatItem[] = [
  { value: '50+', label: 'Závodů' },
  { value: '200+', label: 'Týmů' },
  { value: '1000+', label: 'Úlovků' },
  { value: '99%', label: 'Spokojených' },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

function TestimonialCard({ testimonial, index, isVisible }: {
  testimonial: Testimonial
  index: number
  isVisible: boolean
}) {
  return (
    <div
      className={`transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <GlassCard className="h-full p-6 hover-lift cursor-pointer transition-shadow duration-300 hover:shadow-halo">
        <div className="flex flex-col h-full">
          {/* Quote icon */}
          <Quote className="w-8 h-8 text-primary/30 mb-4" />

          {/* Quote text */}
          <blockquote className="flex-1 text-foreground/90 leading-relaxed mb-6">
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>

          {/* Author info */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-foreground">
                {testimonial.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {testimonial.role}
              </div>
              <div className="text-sm text-primary font-medium">
                {testimonial.organization}
              </div>
            </div>
            <StarRating rating={testimonial.rating} />
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

export function SocialProofSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.1 })

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 relative bg-gradient-to-b from-transparent via-surface/30 to-transparent"
    >
      <div className="container mx-auto px-4">
        {/* Stats row */}
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-16 transition-all duration-500 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div
          className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-500 ease-out delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
            Důvěřují nám organizátoři po celé ČR
          </h2>
          <p className="text-muted-foreground">
            Přečtěte si, co říkají ti, kteří systém už používají
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
