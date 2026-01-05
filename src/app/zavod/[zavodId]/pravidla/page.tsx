import { notFound } from "next/navigation"
import { FileText, AlertCircle } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Zavod } from "@/lib/types"

interface PravidlaPageProps {
  params: Promise<{ zavodId: string }>
}

export default async function PravidlaPage({ params }: PravidlaPageProps) {
  const { zavodId } = await params
  const supabase = await createClient()

  // Fetch zavod data with pravidla
  const { data: zavod, error } = await supabase
    .from('zavody')
    .select('id, nazev, pravidla')
    .eq('id', zavodId)
    .single()

  if (error || !zavod) {
    notFound()
  }

  const zavodData = zavod as Pick<Zavod, 'id' | 'nazev' | 'pravidla'>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Pravidla závodu
        </h1>
        <p className="text-muted-foreground mt-1">
          {zavodData.nazev}
        </p>
      </div>

      {/* Rules content */}
      <Card>
        <CardHeader>
          <CardTitle>Pravidla a podmínky</CardTitle>
          <CardDescription>
            Pravidla platná pro tento závod
          </CardDescription>
        </CardHeader>
        <CardContent>
          {zavodData.pravidla ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {zavodData.pravidla}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Pravidla nejsou k dispozici</h3>
              <p className="text-muted-foreground max-w-md">
                Pro tento závod zatím nebyla nastavena žádná pravidla. 
                Kontaktujte pořadatele pro více informací.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
