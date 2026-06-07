'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUpWithPassword, signInWithGoogle, resolveLandingPath } from '@/actions/auth.actions'
import { safeReturnTo } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

function RegistraceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const returnTo = safeReturnTo(searchParams.get('returnTo'))
  const [jmeno, setJmeno] = useState('')
  const [email, setEmail] = useState('')
  const [heslo, setHeslo] = useState('')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const r = await signUpWithPassword({ jmeno, email, heslo, termsAccepted: terms })
      if (!r.success) {
        setError(r.error?.message || 'Registrace selhala')
        return
      }
      toast({
        title: 'Účet vytvořen 🎉',
        description: `Jsi přihlášen jako ${jmeno.trim()}. Potvrzení jsme poslali na ${email.trim()}.`,
      })
      if (returnTo) {
        router.push(returnTo)
      } else {
        const landing = await resolveLandingPath()
        router.push(landing.success ? landing.data!.path : '/')
      }
      router.refresh()
    })
  }

  const handleGoogle = () => {
    if (!terms) {
      setError('Musíš souhlasit s podmínkami')
      return
    }
    startTransition(async () => {
      const r = await signInWithGoogle(returnTo || '/')
      if (r.success && r.data?.url) {
        window.location.href = r.data.url
      } else {
        setError(r.error?.message || 'Google registrace selhala')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
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
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Registrace</h1>
        <p className="text-gray-600 mt-2">Vytvořte si účet a připojte se do Carp Club ČR.</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Registrační formulář */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="jmeno"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Jméno a příjmení
          </label>
          <input
            id="jmeno"
            type="text"
            autoComplete="name"
            value={jmeno}
            onChange={(e) => setJmeno(e.target.value)}
            placeholder="Jan Novák"
            required
            disabled={isPending}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-[16px]"
          />
        </div>

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

        <div>
          <label
            htmlFor="heslo"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Heslo
          </label>
          <input
            id="heslo"
            type="password"
            autoComplete="new-password"
            value={heslo}
            onChange={(e) => setHeslo(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isPending}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-[16px]"
          />
        </div>

        {/* GDPR checkbox */}
        <div className="flex items-start gap-3">
          <input
            id="terms"
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            required
            disabled={isPending}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
          />
          <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
            Souhlasím s{' '}
            <Link href="/podminky-uziti" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              podmínkami užití
            </Link>
            {' '}a{' '}
            <Link href="/ochrana-osobnich-udaju" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              ochranou osobních údajů
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending || !jmeno || !email || !heslo || !terms}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Registruji...
            </span>
          ) : (
            'Zaregistrovat se'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-4 text-sm text-gray-400">nebo</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isPending}
        className="w-full py-3 px-4 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {isPending ? 'Registruji...' : 'Registrovat přes Google'}
      </button>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600">
          Máš účet?{' '}
          <Link href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'} className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
            Přihlas se
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegistracePage() {
  return (
    <Suspense fallback={null}>
      <RegistraceForm />
    </Suspense>
  )
}
