"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Fish, 
  Trophy, 
  Image as ImageIcon, 
  FileText, 
  Menu,
  X,
  CheckCircle,
  Sparkles,
  Plus,
  Clock
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { DemoLoginPromptProvider, DemoProtectedButton } from "@/components/zavod"
import { cn } from "@/lib/utils"
import { demoZavod, DEMO_ZAVOD_ID } from "@/lib/demo-data"

interface DemoLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

/**
 * Demo Závod Layout
 * 
 * Special layout for demo závod that uses static data instead of Supabase.
 * Requirements: 5.3, 5.5
 */
export default function DemoLayout({ children }: DemoLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { href: `/zavod/${DEMO_ZAVOD_ID}`, label: "Přehled", icon: <Fish className="h-4 w-4" /> },
    { href: `/zavod/${DEMO_ZAVOD_ID}/leaderboard`, label: "Pořadí", icon: <Trophy className="h-4 w-4" /> },
    { href: `/zavod/${DEMO_ZAVOD_ID}/potvrzeni`, label: "Potvrzení", icon: <Clock className="h-4 w-4" /> },
    { href: `/zavod/${DEMO_ZAVOD_ID}/galerie`, label: "Galerie", icon: <ImageIcon className="h-4 w-4" /> },
    { href: `/zavod/${DEMO_ZAVOD_ID}/pravidla`, label: "Pravidla", icon: <FileText className="h-4 w-4" /> },
  ]

  return (
    <DemoLoginPromptProvider>
      <div className="min-h-screen bg-background pb-16 md:pb-0 app-ui">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Fish className="h-6 w-6 text-primary" />
              <span className="font-bold hidden sm:inline-block">Carp Club ČR</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium truncate max-w-[200px]">{demoZavod.nazev}</span>
            
            {/* Demo badge - Requirement 5.5 */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Sparkles className="h-3 w-3" />
              Demo
            </span>
            
            {/* Status badge */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Probíhá
            </span>
          </div>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-1 ml-auto">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Theme switcher and mobile menu button */}
          <div className="flex items-center gap-2 ml-auto md:ml-4">
            <ThemeSwitcher />
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 bg-background border-b shadow-lg p-4 space-y-2">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
            
            {/* Login CTA */}
            <div className="pt-4 border-t mt-4">
              <Link href="/login">
                <Button className="w-full">
                  Přihlásit se
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container py-6">
        {children}
      </main>

      {/* Demo Bottom Navigation for Mobile */}
      <DemoBottomNav pathname={pathname} />
    </div>
    </DemoLoginPromptProvider>
  )
}

// Simple bottom navigation for demo with protected action
function DemoBottomNav({ pathname }: { pathname: string }) {
  const items = [
    { href: `/zavod/${DEMO_ZAVOD_ID}`, label: "Info", icon: Fish },
    { href: `/zavod/${DEMO_ZAVOD_ID}/leaderboard`, label: "Live", icon: Trophy },
    // "Add catch" is a protected action - handled separately
    { href: `/zavod/${DEMO_ZAVOD_ID}/potvrzeni`, label: "Potvrdit", icon: Clock },
    { href: `/zavod/${DEMO_ZAVOD_ID}/galerie`, label: "Foto", icon: ImageIcon },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {/* First two nav items */}
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 flex-1 max-w-[72px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Protected "Add catch" button - Requirement 5.7 */}
        <DemoProtectedButton
          actionDescription="přidání úlovku"
          variant="default"
          className="flex flex-col items-center justify-center h-12 w-12 rounded-full -mt-3 shadow-lg bg-accent hover:bg-accent/90"
        >
          <Plus className="h-5 w-5" />
        </DemoProtectedButton>

        {/* Last two nav items */}
        {items.slice(2).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 flex-1 max-w-[72px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
