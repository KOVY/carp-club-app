'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, CheckCircle, UserX, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  getPrihlaskyZavodu,
  schvalitPrihlasku,
  odebratPrihlasku,
  nastavitPocetPegu,
} from '@/actions/prihlasky.actions'
import type { Prihlaska } from '@/lib/types'

interface PageProps {
  params: Promise<{ zavodId: string }>
}

export default function PrihlaskyPage({ params }: PageProps) {
  const { zavodId } = use(params)
  const { toast } = useToast()
  const [prihlasky, setPrihlasky] = useState<Prihlaska[]>([])
  const [pegy, setPegy] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const r = await getPrihlaskyZavodu(zavodId)
    if (r.success) setPrihlasky(r.data!)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [zavodId])

  const schvalit = async (id: string) => {
    setActionLoading(id + '-schvalit')
    const r = await schvalitPrihlasku(id)
    toast(
      r.success
        ? { title: 'Schváleno', description: 'Tým byl vytvořen.' }
        : { title: 'Chyba', description: r.error?.message, variant: 'destructive' },
    )
    if (r.success) await load()
    setActionLoading(null)
  }

  const odhlasit = async (id: string) => {
    setActionLoading(id + '-odhlasit')
    const r = await odebratPrihlasku(id)
    toast(
      r.success
        ? { title: 'Odhlášeno', description: 'Přihláška byla odebrána.' }
        : { title: 'Chyba', description: r.error?.message, variant: 'destructive' },
    )
    if (r.success) await load()
    setActionLoading(null)
  }

  const ulozitPegy = async () => {
    const r = await nastavitPocetPegu(zavodId, pegy ? parseInt(pegy, 10) : null)
    toast(
      r.success
        ? { title: 'Počet pegů uložen' }
        : { title: 'Chyba', description: r.error?.message, variant: 'destructive' },
    )
  }

  const prihlaseni = prihlasky.filter(
    (p) => p.stav === 'prihlasen' || p.stav === 'schvaleno',
  )
  const nahradnici = prihlasky
    .filter((p) => p.stav === 'nahradnik')
    .sort((a, b) => (a.poradi_nahradnika ?? 0) - (b.poradi_nahradnika ?? 0))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/${zavodId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Přihlášky</h1>
          <p className="text-muted-foreground mt-1">
            {prihlaseni.length} přihlášených · {nahradnici.length} náhradníků
          </p>
        </div>
      </div>

      {/* Nastavení počtu pegů */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Kapacita závodu (počet pegů)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-xs">
            <Input
              type="number"
              min={1}
              value={pegy}
              onChange={(e) => setPegy(e.target.value)}
              placeholder="Počet pegů (prázdné = neomezeno)"
            />
            <Button onClick={ulozitPegy} variant="outline">
              Uložit
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pokud je počet pegů nastaven, přihlášky nad limit jdou automaticky jako náhradníci.
          </p>
        </CardContent>
      </Card>

      {/* Empty state */}
      {prihlasky.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Zatím žádné přihlášky</h3>
          <p className="text-muted-foreground">
            Žádní závodníci se zatím nepřihlásili na tento závod.
          </p>
        </Card>
      )}

      {/* Přihlášení */}
      {prihlaseni.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Přihlášení
            <Badge variant="secondary">{prihlaseni.length}</Badge>
          </h2>
          {prihlaseni.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{p.nazev_tymu}</h3>
                      {p.stav === 'schvaleno' ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Schváleno
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-400">
                          Přihlášen
                        </Badge>
                      )}
                    </div>
                    {p.clenove && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        Členové: {p.clenove}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.stav !== 'schvaleno' && (
                      <Button
                        size="sm"
                        onClick={() => schvalit(p.id)}
                        disabled={actionLoading === p.id + '-schvalit'}
                        className="gap-1"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Schválit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => odhlasit(p.id)}
                      disabled={actionLoading === p.id + '-odhlasit'}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Odhlásit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Náhradníci */}
      {nahradnici.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Náhradníci
            <Badge variant="outline" className="text-orange-600 border-orange-400">
              {nahradnici.length}
            </Badge>
          </h2>
          {nahradnici.map((p) => (
            <Card key={p.id} className="border-orange-200 bg-orange-50/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{p.nazev_tymu}</h3>
                      <Badge
                        variant="outline"
                        className="text-orange-700 border-orange-400 bg-orange-50"
                      >
                        Náhradník č. {p.poradi_nahradnika}
                      </Badge>
                    </div>
                    {p.clenove && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        Členové: {p.clenove}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => schvalit(p.id)}
                      disabled={actionLoading === p.id + '-schvalit'}
                      className="gap-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Schválit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => odhlasit(p.id)}
                      disabled={actionLoading === p.id + '-odhlasit'}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Odhlásit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
