"use client"

import { usePathname } from 'next/navigation'
import { HeaderWrapper } from './HeaderWrapper'
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
  const isLandingPage = pathname === '/'

  // Admin and Zavod pages have their own custom layouts
  if (isAdminPage || isZavodPage || isPozvankaPage) {
    return <>{children}</>
  }

  // For public pages (landing, archiv), render the full layout
  // On landing page, hide header on mobile to avoid duplicate navigation (BottomNav has login)
  return (
    <>
      {/* Header: hidden on mobile for landing page (has HeroSection + BottomNav) */}
      <div className={isLandingPage ? 'hidden md:block' : ''}>
        <HeaderWrapper />
      </div>
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer className="hidden md:block" />
      <GlobalBottomNavigation />
    </>
  )
}
