"use client"

import { usePathname } from "next/navigation"
import { BottomNavigationWrapper } from "./BottomNavigationWrapper"

/**
 * Global BottomNavigation component that shows on non-závod pages.
 * The závod layout has its own BottomNavigation with context-aware items.
 */
export function GlobalBottomNavigation() {
  const pathname = usePathname()

  // Don't show on závod pages (they have their own navigation)
  if (pathname.startsWith('/zavod/')) {
    return null
  }

  // Don't show on login page
  if (pathname === '/login') {
    return null
  }

  // Don't show on landing page - it has its own hero + CTA
  if (pathname === '/') {
    return null
  }

  return <BottomNavigationWrapper />
}

export default GlobalBottomNavigation
