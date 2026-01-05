import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { HeaderWrapper } from '@/components/layout/HeaderWrapper'
import { Footer } from '@/components/layout/Footer'
import { GlobalBottomNavigation } from '@/components/layout/GlobalBottomNavigation'
import { ThemeProvider } from '@/components/providers'
import { OfflineIndicator } from '@/components/common'

const inter = Inter({ subsets: ['latin', 'latin-ext'] })

export const metadata: Metadata = {
  title: 'Carp Club ČR - Závody',
  description: 'Aplikace pro správu kaprařských závodů Carp Club ČR',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" data-theme="outdoor" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col theme-transition bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="outdoor">
          <OfflineIndicator position="top" showRetry />
          <HeaderWrapper />
          <main className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
          <Footer className="hidden md:block" />
          <GlobalBottomNavigation />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
