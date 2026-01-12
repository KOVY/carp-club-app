"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Fish, Users, Calendar, MapPin, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { verifyPozvanka, registerViaInvitation } from "@/actions/pozvanka.actions"

interface PozvankaInfo {
  id: string
  jmeno: string
  email: string
  role: string
  pouzita: boolean
  platnost_do: string
  zavod: {
    id: string
    nazev: string
    misto: string | null
    datum_start: string
    datum_end: string
  }
  tym: {
    id: string
    nazev: string
    barva: string
  } | null
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default function PozvankaPage({ params }: PageProps) {
  const { token } = use(params)
  const router = useRouter()
  const [pozvanka, setPozvanka] = useState<PozvankaInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const verify = async () => {
      const result = await verifyPozvanka(token)
      if (result.success && result.data) {
        setPozvanka(result.data)
      } else {
        setError(result.error?.message || 'Neplatná pozvánka')
      }
      setIsLoading(false)
    }

    verify()
  }, [token])

  const handleRegister = async () => {
    setIsRegistering(true)
    setError(null)

    const result = await registerViaInvitation(token)

    if (result.success && result.data) {
      setSuccess(true)
      // Redirect po krátké chvíli
      setTimeout(() => {
        router.push(`/zavod/${result.data.zavodId}`)
      }, 2000)
    } else {
      setError(result.error?.message || 'Nepodařilo se dokončit registraci')
      setIsRegistering(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start)
    }

    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const isExpired = pozvanka && new Date(pozvanka.platnost_do) < new Date()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ověřuji pozvánku...</p>
        </div>
      </div>
    )
  }

  if (error && !pozvanka) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Neplatná pozvánka</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/">
              <Button>Zpět na hlavní stránku</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Registrace dokončena!</h2>
            <p className="text-muted-foreground mb-4">
              Vítejte v závodu, {pozvanka?.jmeno}!
            </p>
            <p className="text-sm text-muted-foreground">
              Přesměrování na stránku závodu...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!pozvanka) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Fish className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Vítejte na závodech!</CardTitle>
          <CardDescription>
            Byli jste pozváni do rybářského závodu
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Informace o pozvánce */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Jméno</p>
              <p className="font-semibold text-lg">{pozvanka.jmeno}</p>
            </div>

            {pozvanka.tym && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Tým</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: pozvanka.tym.barva }}
                  />
                  <p className="font-semibold">{pozvanka.tym.nazev}</p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Závod</p>
              <p className="font-semibold">{pozvanka.zavod.nazev}</p>
              {pozvanka.zavod.misto && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {pozvanka.zavod.misto}
                </p>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                {formatDateRange(pozvanka.zavod.datum_start, pozvanka.zavod.datum_end)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-semibold">
                {pozvanka.role === 'kapitan' ? 'Kapitán týmu' :
                 pozvanka.role === 'rozhodci' ? 'Rozhodčí' : 'Závodník'}
              </p>
            </div>
          </div>

          {/* Stav pozvánky */}
          {pozvanka.pouzita ? (
            <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-lg text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2" />
              <p className="font-semibold">Již registrováno</p>
              <p className="text-sm mt-1">Tato pozvánka již byla použita.</p>
              <Link href={`/zavod/${pozvanka.zavod.id}`} className="block mt-4">
                <Button variant="outline" className="w-full">
                  Přejít na závod
                </Button>
              </Link>
            </div>
          ) : isExpired ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              <p className="font-semibold">Pozvánka vypršela</p>
              <p className="text-sm mt-1">
                Platnost pozvánky skončila {formatDate(pozvanka.platnost_do)}.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleRegister}
                disabled={isRegistering}
                className="w-full h-12 text-lg"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Registruji...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Potvrdit registraci
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Kliknutím na tlačítko potvrdíte svou účast v závodu a budete automaticky přihlášeni.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
