import Link from "next/link"
import { Fish, Shield, FileText, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={cn("relative border-t bg-muted/50", className)}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Fish className="h-5 w-5 text-primary" />
              <span className="font-semibold">Carp Club ČR</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Oficiální aplikace pro správu kaprařských závodů.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Navigace</h4>
            <nav className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <Link href="/#zavody" className="hover:text-foreground transition-colors">
                Aktuální závody
              </Link>
              <Link href="/archiv" className="hover:text-foreground transition-colors">
                Archiv závodů
              </Link>
              <Link href="/kalendar" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Kalendář závodů
              </Link>
            </nav>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Právní informace</h4>
            <nav className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <Link href="/ochrana-osobnich-udaju" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Ochrana osobních údajů
              </Link>
              <Link href="/podminky-uziti" className="hover:text-foreground transition-colors flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Podmínky užití
              </Link>
            </nav>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Kontakt</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Carp Club ČR</p>
              <a href="mailto:prorybolov@gmail.com" className="hover:text-foreground transition-colors">
                prorybolov@gmail.com
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {currentYear} Carp Club ČR. Všechna práva vyhrazena.</p>
        </div>
      </div>
    </footer>
  )
}
