import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email/resend'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Open-redirect ochrana: povol jen interní (same-origin) cesty, nikdy //host ani /\host
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\') ? rawNext : '/'
  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Uvítací e-mail pro NOVÉHO uživatele (první OAuth registrace).
      // Detekce: účet vznikl před < 60 s + příznak welcome_email_sent (idempotence
      // proti dvojímu callbacku). Selhání e-mailu NESMÍ změnit redirect.
      try {
        const user = data?.user
        const jeNovy = user?.created_at
          && Date.now() - new Date(user.created_at).getTime() < 60_000
        if (user && jeNovy) {
          const adminClient = createAdminClient()
          const { data: profil } = await (adminClient.from('profiles') as any)
            .select('jmeno, welcome_email_sent').eq('id', user.id).single() as
            { data: { jmeno: string | null; welcome_email_sent: boolean } | null }
          if (profil && !profil.welcome_email_sent && user.email) {
            const r = await sendWelcomeEmail({
              to: user.email,
              jmeno: profil.jmeno || user.email.split('@')[0],
            })
            if (r.success) {
              await (adminClient.from('profiles') as any)
                .update({ welcome_email_sent: true }).eq('id', user.id)
            }
          }
        }
      } catch (e) {
        console.error('[auth/callback] welcome email:', e)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
