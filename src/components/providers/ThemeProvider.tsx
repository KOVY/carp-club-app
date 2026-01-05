'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type ThemeMode = 'outdoor' | 'night'

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'theme-preference'

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'outdoor' || stored === 'night') {
      return stored
    }
  } catch {
    // localStorage might be unavailable
  }
  return null
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeMode
}

export function ThemeProvider({ children, defaultTheme = 'outdoor' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  // Initialize theme on mount - read from localStorage
  useEffect(() => {
    const storedTheme = getStoredTheme()
    const initialTheme = storedTheme ?? defaultTheme
    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [defaultTheme])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {
      // localStorage might be unavailable
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'outdoor' ? 'night' : 'outdoor'
    setTheme(newTheme)
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
