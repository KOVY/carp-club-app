'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { prihlasitNaZavod } from '@/actions/prihlasky.actions'
import { useToast } from '@/hooks/use-toast'

export function PrihlasitButton({ zavodId }: { zavodId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [nazevTymu, setNazevTymu] = useState('')
  const [clenove, setClenove] = useState('')
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      const r = await prihlasitNaZavod(zavodId, { nazevTymu, clenove })
      if (!r.success) { toast({ title: 'Chyba', description: r.error?.message, variant: 'destructive' }); return }
      toast({
        title: r.data?.stav === 'nahradnik' ? 'Jsi náhradník' : 'Přihlášen!',
        description: r.data?.stav === 'nahradnik' ? 'Kapacita je plná, jsi na čekací listině.' : 'Přihláška odeslána, čeká na schválení pořadatelem.',
      })
      setOpen(false); router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Přihlásit na závod</Button>
  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-card w-full sm:w-80">
      <input className="border rounded px-3 py-2 bg-background" placeholder="Název týmu" value={nazevTymu} onChange={e => setNazevTymu(e.target.value)} />
      <textarea className="border rounded px-3 py-2 bg-background" placeholder="Členové týmu (jména)" rows={3} value={clenove} onChange={e => setClenove(e.target.value)} />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={isPending || !nazevTymu.trim()}>Odeslat přihlášku</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
      </div>
    </div>
  )
}
