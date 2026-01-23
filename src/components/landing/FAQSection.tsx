'use client'

import { useRef } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface FAQItem {
  id: string
  question: string
  answer: string
}

const faqItems: FAQItem[] = [
  {
    id: 'jak-prihlasit',
    question: 'Jak se přihlásím do závodu?',
    answer:
      'Pořadatel vám pošle pozvánku emailem. Stačí kliknout na odkaz v emailu a budete automaticky přihlášeni do systému i do konkrétního závodu. Žádná složitá registrace není potřeba.',
  },
  {
    id: 'je-zdarma',
    question: 'Je systém zdarma?',
    answer:
      'Pro závodníky a týmy je používání systému zcela zdarma. Pořadatelé závodů si mohou vybrat z různých tarifů podle velikosti a počtu závodů.',
  },
  {
    id: 'offline',
    question: 'Funguje aplikace i offline?',
    answer:
      'Ano! Aplikace je navržena jako PWA (Progressive Web App). Můžete ji nainstalovat na telefon a základní funkce fungují i bez připojení. Úlovky zadané offline se synchronizují, jakmile se znovu připojíte.',
  },
  {
    id: 'potvrzovani',
    question: 'Jak funguje potvrzování úlovků?',
    answer:
      'Po zadání úlovku vás systém automaticky požádá sousední pegy o potvrzení. Kapitáni sousedních týmů dostanou notifikaci a mohou váš úlovek potvrdit jedním kliknutím. Po 2 potvrzeních je úlovek oficiálně uznán.',
  },
  {
    id: 'embargo',
    question: 'Co je to embargo?',
    answer:
      'Embargo je časové období, během kterého jsou váhy úlovků skryté pro všechny účastníky. Vidíte pouze pořadí, ale ne konkrétní váhy. Tím se zachovává napětí až do konce závodu. Rozhodčí váhy vidí vždy.',
  },
  {
    id: 'zlute-karty',
    question: 'Jak fungují žluté karty?',
    answer:
      'Rozhodčí může udělit žlutou kartu za porušení pravidel. První žlutá karta je varování a může obsahovat "stopku" - období, kdy tým nemůže zadávat úlovky. Druhá žlutá karta znamená diskvalifikaci.',
  },
  {
    id: 'foto',
    question: 'Musím ke každému úlovku nahrát fotku?',
    answer:
      'Ano, fotodokumentace je povinná součást každého úlovku. Fotka slouží jako důkaz a zároveň se objeví v galerii závodu. Můžete ji pořídit přímo v aplikaci nebo nahrát z galerie telefonu.',
  },
  {
    id: 'podpora',
    question: 'Kam se obrátit v případě problémů?',
    answer:
      'Během závodu kontaktujte rozhodčího nebo pořadatele. Pro technické problémy s aplikací můžete využít kontaktní formulář nebo napsat na podporu. Snažíme se odpovídat co nejrychleji.',
  },
]

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.1 })

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 relative"
    >
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div
          className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-500 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            <span>Často kladené dotazy</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Máte otázky? Máme odpovědi
          </h2>
          <p className="text-muted-foreground">
            Nejčastější dotazy od závodníků a organizátorů
          </p>
        </div>

        {/* FAQ Accordion */}
        <div
          className={`max-w-3xl mx-auto transition-all duration-500 ease-out delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="bg-surface/50 border border-border/50 rounded-lg px-6 data-[state=open]:bg-surface/80 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-medium text-foreground pr-4">
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
