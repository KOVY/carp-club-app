'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/providers'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ThemeSwitcherProps {
  className?: string
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, toggleTheme, mounted } = useTheme()
  
  // Prevent hydration mismatch - render placeholder until mounted
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('relative overflow-hidden', className)}
        disabled
      >
        <Sun className="h-5 w-5 opacity-50" />
      </Button>
    )
  }
  
  // outdoor = tmavé pozadí (den, slunce) -> zobrazit ikonu slunce
  // night = světlé pozadí (noc) -> zobrazit ikonu měsíce
  const isOutdoor = theme === 'outdoor'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        'relative overflow-hidden',
        'transition-all duration-200 ease-out',
        className
      )}
      aria-label={isOutdoor ? 'Přepnout na noční režim' : 'Přepnout na denní režim'}
      title={isOutdoor ? 'Noční režim (světlé pozadí)' : 'Denní režim (tmavé pozadí)'}
    >
      {/* Sun icon - visible in outdoor (dark background) mode */}
      <Sun 
        className={cn(
          'h-5 w-5 absolute transition-all duration-200 ease-out',
          isOutdoor 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0'
        )}
      />
      
      {/* Moon icon - visible in night (light background) mode */}
      <Moon 
        className={cn(
          'h-5 w-5 absolute transition-all duration-200 ease-out',
          isOutdoor 
            ? '-rotate-90 scale-0 opacity-0' 
            : 'rotate-0 scale-100 opacity-100'
        )}
      />
      
      <span className="sr-only">
        {isOutdoor ? 'Přepnout na noční režim' : 'Přepnout na denní režim'}
      </span>
    </Button>
  )
}
