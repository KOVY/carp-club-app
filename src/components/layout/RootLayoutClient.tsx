"use client"

import { usePathname } from 'next/navigation'
import { HeaderWrapper } from './HeaderWrapper'
import { MobileHeader } from './MobileHeader'
import { Footer } from './Footer'
import { GlobalBottomNavigation } from './GlobalBottomNavigation'

interface RootLayoutClientProps {
  children: React.ReactNode
}

export function RootLayoutClient({ children }: RootLayoutClientProps) {
  const pathname = usePathname()

  // Hide the default header/footer/navigation for pages that have their own layout
  const isAdminPage = pathname?.startsWith('/admin')
  const isZavodPage = pathname?.startsWith('/zavod/')
  const isPozvankaPage = pathname?.startsWith('/pozvanka/')
  const isDisplejPage = pathname?.startsWith('/displej')
  const isLandingPage = pathname === '/'

  // Admin, Zavod, Pozvanka a Displej mají vlastní/čistý layout
  if (isAdminPage || isZavodPage || isPozvankaPage || isDisplejPage) {
    return <>{children}</>
  }

  // For public pages (landing, archiv), render the full layout
  return (
    <>
      {/* Desktop: Floating header with spacing */}
      <div className="hidden md:block">
        <HeaderWrapper floating />
      </div>

      {/* Mobile landing: Minimal header with hamburger menu */}
      {isLandingPage && (
        <div className="md:hidden">
          <MobileHeader />
        </div>
      )}

      {/* Mobile other pages: Full header */}
      {!isLandingPage && (
        <div className="md:hidden">
          <HeaderWrapper />
        </div>
      )}

      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer className="hidden md:block" />
      <div className="md:hidden text-center text-xs text-muted-foreground py-4 border-t mb-16 md:mb-0">
        © {new Date().getFullYear()} Carp Club ČR
      </div>
      <GlobalBottomNavigation />
    </>
  )
}
