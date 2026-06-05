'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword } from '@/actions/auth.actions'

export default function ResetHeslaPage() {
  const router = useRouter()
  const [heslo, setHeslo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const r = await updatePassword(heslo)
      if (r.success) {
        setDone(true)
        setTimeout(() => router.push('/login'), 1500)
      } else {
        setError(r.error?.message || 'Nepodařilo se změnit heslo')
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
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nové heslo</h1>
        <p className="text-gray-600 mt-2">Zadejte své nové heslo.</p>
      </div>

      {/* Success message */}
      {done && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            Heslo změněno, přesměrováváme na přihlášení...
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Form */}
      {!done && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="heslo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nové heslo
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

          <button
            type="submit"
            disabled={isPending || !heslo}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Měním heslo...
              </span>
            ) : (
              'Změnit heslo'
            )}
          </button>
        </form>
      )}
    </div>
  )
}
