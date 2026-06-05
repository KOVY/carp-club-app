'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { zrusitPrihlasku } from '@/actions/prihlasky.actions'
import { useToast } from '@/hooks/use-toast'
import type { Prihlaska } from '@/lib/types'

export function StavPrihlaskyCard({ prihlaska }: { prihlaska: Prihlaska }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const label =
    prihlaska.stav === 'schvaleno' ? '✅ Přihláška schválena'
    : prihlaska.stav === 'prihlasen' ? '✅ Jsi přihlášen (čeká na schválení)'
    : prihlaska.stav === 'nahradnik' ? `⏳ Jsi náhradník č. ${prihlaska.poradi_nahradnika}`
    : prihlaska.stav

  const zrusit = () => {
    startTransition(async () => {
      const r = await zrusitPrihlasku(prihlaska.id)
      toast(
        r.success
          ? { title: 'Přihláška zrušena' }
          : { title: 'Chyba', description: r.error?.message, variant: 'destructive' }
      )
      if (r.success) router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-card">
      <div className="font-medium">{label}</div>
      <div className="text-sm text-muted-foreground">Tým: {prihlaska.nazev_tymu}</div>
      {prihlaska.stav !== 'schvaleno' && (
        <Button variant="outline" size="sm" onClick={zrusit} disabled={isPending}>
          Zrušit přihlášku
        </Button>
      )}
    </div>
  )
}
