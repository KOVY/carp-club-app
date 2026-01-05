'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronDown, Fish, Trophy, Users } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface HeroSectionProps {
  title?: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
}

export function HeroSection({
  title = 'Carp Club ČR',
  subtitle = 'Profesionální systém pro správu kaprařských závodů. Živé výsledky, snadné zadávání úlovků a potvrzování sousedními týmy.',
  ctaText = 'Vyzkoušet demo',
  ctaHref = '/zavod/demo',
}: HeroSectionProps) {
  const heroRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  // Parallax effect
  useEffect(() => {
    if (prefersReducedMotion) return

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [prefersReducedMotion])

  const parallaxOffset = prefersReducedMotion ? 0 : scrollY * 0.3

  return (
    <section
      ref={heroRef}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
    >
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 hero-gradient-animated"
        style={{
          transform: `translateY(${parallaxOffset}px)`,
        }}
      />
      
      {/* Decorative elements - water ripples */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] opacity-10"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            transform: `translateY(${parallaxOffset * 0.5}px)`,
          }}
        />
        <div 
          className="absolute -bottom-1/2 -right-1/4 w-[150%] h-[150%] opacity-10"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--secondary) / 0.3) 0%, transparent 70%)',
            transform: `translateY(${parallaxOffset * 0.2}px)`,
          }}
        />
      </div>

      {/* Floating icons - decorative */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Fish 
            className="absolute top-1/4 left-[10%] w-12 h-12 text-primary/20 animate-float-slow"
            style={{ animationDelay: '0s' }}
          />
          <Trophy 
            className="absolute top-1/3 right-[15%] w-10 h-10 text-accent/20 animate-float-slow"
            style={{ animationDelay: '1s' }}
          />
          <Users 
            className="absolute bottom-1/3 left-[20%] w-8 h-8 text-secondary/20 animate-float-slow"
            style={{ animationDelay: '2s' }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Fish className="w-4 h-4" />
            <span>Oficiální systém Carp Club ČR</span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
              {title}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              asChild 
              size="lg" 
              className="text-lg px-8 py-6 hover-glow hover-scale bg-accent hover:bg-accent/90"
            >
              <Link href={ctaHref}>
                <Trophy className="w-5 h-5 mr-2" />
                {ctaText}
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 hover-lift"
            >
              <Link href="#jak-to-funguje">
                Jak to funguje
              </Link>
            </Button>
          </div>

          {/* Stats preview */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">50+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Závodů</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">200+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Týmů</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">1000+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Úlovků</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-8 h-8 text-muted-foreground/50" />
      </div>
    </section>
  )
}
