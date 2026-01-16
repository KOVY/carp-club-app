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

  // Hide the default header/footer/navigation for admin pages
  // Admin pages have their own layout with custom header
  const isAdminPage = pathname?.startsWith('/admin')

  if (isAdminPage) {
    // For admin pages, just render children without the landing page navigation
    return <>{children}</>
  }

  // For all other pages, render the full layout with header, footer, and navigation
  return (
    <>
      <HeaderWrapper />
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer className="hidden md:block" />
      <GlobalBottomNavigation />
    </>
  )
}
