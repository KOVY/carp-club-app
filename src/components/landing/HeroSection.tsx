'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronDown, Fish, Trophy, Users } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// Konfigurace plovoucích ryb — různé pozice, zpoždění, velikosti
const FLOATING_FISH = [
  { top: '18%', left: '7%',  size: 'w-14 h-14', delay: '0s',   rotate: '0deg'    },
  { top: '28%', left: '88%', size: 'w-10 h-10', delay: '1.4s', rotate: '180deg'  },
  { top: '55%', left: '4%',  size: 'w-8  h-8',  delay: '2.8s', rotate: '15deg'   },
  { top: '65%', left: '82%', size: 'w-12 h-12', delay: '0.7s', rotate: '-10deg'  },
  { top: '80%', left: '18%', size: 'w-7  h-7',  delay: '3.5s', rotate: '5deg'    },
  { top: '15%', left: '55%', size: 'w-6  h-6',  delay: '2.1s', rotate: '-5deg'   },
] as const

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
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/hero-banner.png')`,
          transform: `translateY(${parallaxOffset}px) scale(1.1)`,
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background/90" />

      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 hero-gradient-animated opacity-60"
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

      {/* Plovoucí ryby — dekorativní, za obsahem, respektují reduced-motion */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0" aria-hidden="true">
        {FLOATING_FISH.map((fish, i) => (
          <Fish
            key={i}
            className={`absolute ${fish.size} text-primary/[0.12] ${!prefersReducedMotion ? 'animate-float-slow' : ''}`}
            style={{
              top: fish.top,
              left: fish.left,
              animationDelay: fish.delay,
              transform: `rotate(${fish.rotate})`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Fish className="w-4 h-4" />
            <span>Oficiální systém Carp Club ČR</span>
          </div>

          {/* Main headline — obaleno relative wrapper pro halo efekt */}
          <div className="relative inline-block w-full">
            {/*
              Halo za nadpisem:
              - Ve dne (--halo: transparent): radial-gradient přes hsl(var(--primary)/0.07)
                → velmi jemný, neviditelný glow → nenarušuje čitelnost na slunci
              - V noci (--halo: rgba(56,189,248,0.22)): box-shadow halo-card → tyrkysová záře
              POZOR: efekt je ZA textem (z-index -1), text zůstává ostře čitelný v obou tématech
            */}
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[130%] -mx-8 rounded-full halo-card pointer-events-none -z-10"
              style={{
                background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.07) 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />
            <h1 className="relative text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>

          {/* CTA buttons - Desktop */}
          <div className="hidden sm:flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="text-lg px-8 py-6 hover-glow hover-scale bg-accent text-accent-foreground hover:bg-accent/90"
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

          {/* Mobile CTA buttons - larger touch targets */}
          <div className="sm:hidden flex flex-col gap-3 pt-6 w-full max-w-xs mx-auto">
            <Button
              asChild
              size="lg"
              className="w-full text-lg py-6 hover-glow bg-accent text-accent-foreground hover:bg-accent/90"
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
              className="w-full text-lg py-6"
            >
              <Link href="/login">
                <Users className="w-5 h-5 mr-2" />
                Mám účet
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="w-full"
            >
              <Link href="#jak-to-funguje">
                Jak to funguje
              </Link>
            </Button>
          </div>

          {/* Info box - jak se dostat do systému */}
          <div className="sm:hidden mt-6 p-4 rounded-lg bg-muted/50 border border-border/50 text-left max-w-xs mx-auto">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Jak se přihlásit?</strong><br />
              Pořadatel vám pošle pozvánku emailem. Kliknutím na odkaz v emailu se automaticky přihlásíte do závodu.
            </p>
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
