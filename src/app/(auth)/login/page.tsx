'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithPassword, signInWithGoogle, resolveLandingPath } from '@/actions/auth.actions'
import { safeReturnTo } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const returnTo = safeReturnTo(searchParams.get('returnTo'), '/')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await signInWithPassword(email, password)
      if (!result.success) {
        setError(result.error?.message || 'Přihlášení se nezdařilo')
        return
      }
      toast({ title: 'Vítej zpět 👋', description: 'Přihlášení proběhlo úspěšně.' })
      let dest = returnTo
      if (returnTo === '/') {
        const landing = await resolveLandingPath()
        if (landing.success) dest = landing.data!.path
      }
      router.push(dest)
      router.refresh()
    })
  }

  const handleGoogle = () => {
    startTransition(async () => {
      const result = await signInWithGoogle(returnTo)
      if (result.success && result.data?.url) {
        window.location.href = result.data.url
      } else {
        setError(result.error?.message || 'Přihlášení přes Google selhalo')
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Přihlášení</h1>
        <p className="text-gray-600 mt-2">Zadejte svůj email a heslo pro přihlášení.</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Email + password form */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Heslo
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isPending}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-[16px]"
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/zapomenute-heslo"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Zapomenuté heslo?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isPending || !email || !password}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Přihlašuji...
            </span>
          ) : (
            'Přihlásit se'
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
        {isPending ? 'Přihlašuji...' : 'Přihlásit přes Google'}
      </button>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center space-y-3">
        <p className="text-sm text-gray-600">
          Nemáš účet?{' '}
          <Link href={returnTo && returnTo !== '/' ? `/registrace?returnTo=${encodeURIComponent(returnTo)}` : '/registrace'} className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
            Zaregistruj se
          </Link>
        </p>
      </div>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
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
