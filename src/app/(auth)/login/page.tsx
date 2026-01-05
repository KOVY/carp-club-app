'use client'

/**
 * Login Page
 * Requirement 9.1: Login via one-time code sent to email
 */

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { generateLoginCode, verifyLoginCode } from '@/actions/auth.actions'

type LoginStep = 'email' | 'code'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'
  
  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    startTransition(async () => {
      const result = await generateLoginCode(email)
      
      if (result.success) {
        setMessage(result.data?.message || 'Kód byl odeslán')
        setStep('code')
      } else {
        setError(result.error?.message || 'Nastala chyba')
      }
    })
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await verifyLoginCode(email, code)
      
      if (result.success) {
        router.push(returnTo)
        router.refresh()
      } else {
        setError(result.error?.message || 'Neplatný kód')
      }
    })
  }

  const handleBackToEmail = () => {
    setStep('email')
    setCode('')
    setError(null)
    setMessage(null)
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <svg 
            className="w-8 h-8 text-blue-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Carp Club ČR</h1>
        <p className="text-gray-600 mt-2">
          {step === 'email' 
            ? 'Přihlaste se pomocí emailu' 
            : 'Zadejte kód z emailu'}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success message */}
      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{message}</p>
        </div>
      )}

      {/* Email form */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.cz"
              required
              disabled={isPending}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-[16px]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !email}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Odesílám...
              </span>
            ) : (
              'Odeslat přihlašovací kód'
            )}
          </button>
        </form>
      )}

      {/* Code verification form */}
      {step === 'code' && (
        <form onSubmit={handleCodeSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="code" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Přihlašovací kód
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              required
              disabled={isPending}
              autoComplete="one-time-code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-center text-2xl tracking-widest"
            />
            <p className="mt-2 text-sm text-gray-500">
              Kód byl odeslán na {email}
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending || !code}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Ověřuji...
              </span>
            ) : (
              'Přihlásit se'
            )}
          </button>

          <button
            type="button"
            onClick={handleBackToEmail}
            disabled={isPending}
            className="w-full py-2 px-4 text-gray-600 font-medium hover:text-gray-900 focus:outline-none disabled:cursor-not-allowed transition-colors"
          >
            ← Zpět na zadání emailu
          </button>
        </form>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Nemáte účet? Kontaktujte pořadatele závodu.
        </p>
      </div>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse" />
      </div>
      <div className="space-y-6">
        <div>
          <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse" />
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-12 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
