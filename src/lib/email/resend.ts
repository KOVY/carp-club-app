import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Email sender address - use your verified domain or Resend's default
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Carp Club <onboarding@resend.dev>'

interface SendInvitationEmailParams {
  to: string
  jmeno: string
  zavodNazev: string
  zavodMisto?: string | null
  zavodDatumStart: string
  zavodDatumEnd: string
  tymNazev?: string | null
  role: string
  inviteLink: string
}

export async function sendInvitationEmail({
  to,
  jmeno,
  zavodNazev,
  zavodMisto,
  zavodDatumStart,
  zavodDatumEnd,
  tymNazev,
  role,
  inviteLink,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  // Skip if no API key configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send')
    return { success: true }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start)
    }
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const roleText = role === 'kapitan' ? 'Kapitán týmu' : role === 'rozhodci' ? 'Rozhodčí' : 'Závodník'

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Pozvánka na závod: ${zavodNazev}`,
      html: `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Carp Club</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Pozvánka na rybářský závod</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px;">Dobrý den, ${jmeno}!</h2>
              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Byli jste pozváni k účasti na rybářském závodě. Níže najdete všechny podrobnosti.
              </p>

              <!-- Event Details -->
              <table role="presentation" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 16px; color: #18181b; font-size: 18px; font-weight: 600;">${zavodNazev}</h3>

                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 4px 0; color: #71717a; font-size: 14px; width: 100px;">Termín:</td>
                        <td style="padding: 4px 0; color: #18181b; font-size: 14px; font-weight: 500;">${formatDateRange(zavodDatumStart, zavodDatumEnd)}</td>
                      </tr>
                      ${zavodMisto ? `
                      <tr>
                        <td style="padding: 4px 0; color: #71717a; font-size: 14px;">Místo:</td>
                        <td style="padding: 4px 0; color: #18181b; font-size: 14px; font-weight: 500;">${zavodMisto}</td>
                      </tr>
                      ` : ''}
                      ${tymNazev ? `
                      <tr>
                        <td style="padding: 4px 0; color: #71717a; font-size: 14px;">Tým:</td>
                        <td style="padding: 4px 0; color: #18181b; font-size: 14px; font-weight: 500;">${tymNazev}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 4px 0; color: #71717a; font-size: 14px;">Vaše role:</td>
                        <td style="padding: 4px 0; color: #18181b; font-size: 14px; font-weight: 500;">${roleText}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px;">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Potvrdit registraci
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #71717a; font-size: 13px; line-height: 1.5;">
                Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:<br>
                <a href="${inviteLink}" style="color: #0d9488; word-break: break-all;">${inviteLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 20px 32px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                Tento email byl odeslán automaticky systémem Carp Club.<br>
                Pokud jste tuto pozvánku neočekávali, můžete ji ignorovat.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send invitation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
