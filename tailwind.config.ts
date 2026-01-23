import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  darkMode: ["class", '[data-theme="night"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			error: {
  				DEFAULT: 'hsl(var(--error))',
  				foreground: 'hsl(var(--error-foreground))'
  			},
  			embargo: {
  				DEFAULT: 'hsl(var(--embargo))',
  				foreground: 'hsl(var(--embargo-foreground))'
  			},
  			surface: {
  				DEFAULT: 'hsl(var(--surface))',
  				glass: 'var(--surface-glass)'
  			},
  			'text-primary': 'hsl(var(--text-primary))',
  			'text-secondary': 'hsl(var(--text-secondary))',
  			'text-muted': 'hsl(var(--text-muted))'
  		},
  		borderRadius: {
  			sm: 'var(--radius-sm)',
  			md: 'var(--radius-md)',
  			lg: 'var(--radius-lg)',
  			full: 'var(--radius-full)'
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'Fira Code',
  				'monospace'
  			]
  		},
  		transitionTimingFunction: {
  			'ease-out-custom': 'cubic-bezier(0.16, 1, 0.3, 1)',
  			'ease-in-out-custom': 'cubic-bezier(0.65, 0, 0.35, 1)'
  		},
  		transitionDuration: {
  			fast: '150ms',
  			normal: '200ms',
  			slow: '300ms'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'fade-in-up': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'pulse-skeleton': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.5' }
  			},
  			'page-enter': {
  				from: { opacity: '0' },
  				to: { opacity: '1' }
  			},
  			'page-exit': {
  				from: { opacity: '1' },
  				to: { opacity: '0' }
  			},
  			'toast-enter': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(100%) scale(0.95)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0) scale(1)'
  				}
  			},
  			'toast-exit': {
  				from: {
  					opacity: '1',
  					transform: 'translateX(0)'
  				},
  				to: {
  					opacity: '0',
  					transform: 'translateX(100%)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in-up': 'fade-in-up 0.3s var(--ease-out)',
  			'pulse-skeleton': 'pulse-skeleton 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'page-enter': 'page-enter 200ms var(--ease-out)',
  			'page-exit': 'page-exit 200ms var(--ease-out)',
  			'toast-enter': 'toast-enter 200ms var(--ease-out)',
  			'toast-exit': 'toast-exit 150ms var(--ease-out)'
  		},
  		backdropBlur: {
  			xs: '4px'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    plugin(function({ addBase }) {
      addBase({
        ':root': {
          '--radius-sm': '4px',
          '--radius-md': '8px',
          '--radius-lg': '12px',
          '--radius-full': '9999px',
          '--ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
          '--ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
          '--duration-fast': '150ms',
          '--duration-normal': '200ms',
          '--duration-slow': '300ms',
          // Outdoor theme (default) - dark background
          '--primary': '174 62% 32%',
          '--primary-foreground': '0 0% 100%',
          '--secondary': '213 52% 24%',
          '--secondary-foreground': '0 0% 100%',
          '--accent': '25 95% 53%',
          '--accent-foreground': '0 0% 100%',
          '--background': '222 47% 11%',
          '--foreground': '210 40% 98%',
          '--surface': '217 33% 17%',
          '--surface-glass': 'rgba(30, 41, 59, 0.8)',
          '--card': '217 33% 17%',
          '--card-foreground': '210 40% 98%',
          '--popover': '217 33% 17%',
          '--popover-foreground': '210 40% 98%',
          '--muted': '217 33% 17%',
          '--muted-foreground': '215 20% 65%',
          '--text-primary': '210 40% 98%',
          '--text-secondary': '215 20% 80%',
          '--text-muted': '215 16% 60%',
          '--success': '142 71% 45%',
          '--success-foreground': '0 0% 100%',
          '--warning': '38 92% 50%',
          '--warning-foreground': '0 0% 0%',
          '--error': '0 84% 60%',
          '--error-foreground': '0 0% 100%',
          '--destructive': '0 84% 60%',
          '--destructive-foreground': '0 0% 100%',
          '--embargo': '215 16% 47%',
          '--embargo-foreground': '0 0% 100%',
          '--border': '217 19% 27%',
          '--input': '217 19% 27%',
          '--ring': '174 62% 32%',
          '--radius': '0.5rem',
        },
        ':root[data-theme="night"]': {
          '--primary': '174 58% 40%',
          '--primary-foreground': '174 100% 6%',
          '--secondary': '217 91% 60%',
          '--secondary-foreground': '0 0% 100%',
          '--accent': '27 96% 61%',
          '--accent-foreground': '0 0% 0%',
          '--background': '210 40% 98%',
          '--foreground': '222 47% 11%',
          '--surface': '0 0% 100%',
          '--surface-glass': 'rgba(255, 255, 255, 0.8)',
          '--card': '0 0% 100%',
          '--card-foreground': '222 47% 11%',
          '--popover': '0 0% 100%',
          '--popover-foreground': '222 47% 11%',
          '--muted': '210 40% 96%',
          '--muted-foreground': '215 16% 47%',
          '--text-primary': '222 47% 11%',
          '--text-secondary': '215 19% 35%',
          '--text-muted': '215 16% 60%',
          '--success': '142 76% 36%',
          '--success-foreground': '0 0% 100%',
          '--warning': '32 95% 44%',
          '--warning-foreground': '0 0% 0%',
          '--error': '0 72% 51%',
          '--error-foreground': '0 0% 100%',
          '--destructive': '0 72% 51%',
          '--destructive-foreground': '0 0% 100%',
          '--embargo': '220 9% 65%',
          '--embargo-foreground': '0 0% 0%',
          '--border': '214 32% 91%',
          '--input': '214 32% 91%',
          '--ring': '174 58% 40%',
        },
      })
    }),
  ],
}

export default config
