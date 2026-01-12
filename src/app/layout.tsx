import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { HeaderWrapper } from '@/components/layout/HeaderWrapper'
import { Footer } from '@/components/layout/Footer'
import { GlobalBottomNavigation } from '@/components/layout/GlobalBottomNavigation'
import { ThemeProvider } from '@/components/providers'
import { OfflineIndicator } from '@/components/common'

const inter = Inter({ subsets: ['latin', 'latin-ext'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0D9488' },
    { media: '(prefers-color-scheme: dark)', color: '#0D9488' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'Carp Club ČR - Kaprařské závody online',
    template: '%s | Carp Club ČR',
  },
  description: 'Oficiální aplikace pro kaprařské závody v České republice. Živé výsledky, leaderboard, správa týmů a potvrzování úlovků v reálném čase.',
  keywords: [
    'kaprařské závody',
    'carp fishing',
    'rybářské závody',
    'kapr',
    'amur',
    'závody',
    'leaderboard',
    'Česká republika',
    'Carp Club',
    'rybáři',
  ],
  authors: [{ name: 'Carp Club ČR' }],
  creator: 'Carp Club ČR',
  publisher: 'Carp Club ČR',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://carpclub.app'),
  alternates: {
    canonical: '/',
    languages: {
      'cs-CZ': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: 'https://carpclub.app',
    siteName: 'Carp Club ČR',
    title: 'Carp Club ČR - Kaprařské závody online',
    description: 'Oficiální aplikace pro kaprařské závody v České republice. Živé výsledky, leaderboard a správa závodů.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Carp Club ČR - Kaprařské závody',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carp Club ČR - Kaprařské závody online',
    description: 'Oficiální aplikace pro kaprařské závody v České republice.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
  category: 'sports',
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
