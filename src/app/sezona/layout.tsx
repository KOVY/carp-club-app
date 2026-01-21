import type { Metadata } from "next"
import { AKTUALNI_SEZONA } from "@/lib/sezona-config"

export const metadata: Metadata = {
  title: `${AKTUALNI_SEZONA.nazev} - Průběžné pořadí | Carp Club ČR`,
  description: `Sledujte průběžné pořadí Kaprařské Ligy ${AKTUALNI_SEZONA.rok}. Liga A a Liga B - kdo postupuje a kdo sestupuje?`,
  openGraph: {
    title: `${AKTUALNI_SEZONA.nazev} - Průběžné pořadí`,
    description: `Sledujte průběžné pořadí Kaprařské Ligy ${AKTUALNI_SEZONA.rok}. Liga A a Liga B - kdo postupuje a kdo sestupuje?`,
    type: "website",
    siteName: "Carp Club ČR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${AKTUALNI_SEZONA.nazev} - Průběžné pořadí`,
    description: `Sledujte průběžné pořadí Kaprařské Ligy ${AKTUALNI_SEZONA.rok}`,
  },
}

export default function SezonaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
