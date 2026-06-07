import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Email sender address - use your verified domain or Resend's default
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Carp Club <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://carpclub.app'

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

/** Řádek detailu (label + hodnota); prázdné hodnoty se vynechají. */
function detailRow(label: string, value?: string | null): string {
  if (!value) return ''
  return `
                      <tr>
                        <td style="padding: 4px 0; color: #71717a; font-size: 14px; width: 100px;">${label}</td>
                        <td style="padding: 4px 0; color: #18181b; font-size: 14px; font-weight: 500;">${value}</td>
                      </tr>`
}

/** Šedý box s názvem závodu a tabulkou detailů. */
function zavodDetailsBox(zavodNazev: string, rowsHtml: string): string {
  return `
              <table role="presentation" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 16px; color: #18181b; font-size: 18px; font-weight: 600;">${zavodNazev}</h3>
                    <table role="presentation" style="width: 100%;">${rowsHtml}
                    </table>
                  </td>
                </tr>
              </table>`
}

/** Sdílený layout všech e-mailů: teal hlavička, obsah, volitelné CTA, patička. */
function emailLayout(opts: {
  subtitle: string
  bodyHtml: string
  ctaText?: string
  ctaHref?: string
  footerNote?: string
}): string {
  const cta = opts.ctaText && opts.ctaHref ? `
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px;">
                    <a href="${opts.ctaHref}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      ${opts.ctaText}
                    </a>
                  </td>
                </tr>
              </table>` : ''

  return `
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
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${opts.subtitle}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${opts.bodyHtml}
              ${cta}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 20px 32px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                Tento email byl odeslán automaticky systémem Carp Club.<br>
                ${opts.footerNote ?? 'Pokud jste tento email neočekávali, můžete ho ignorovat.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
}

/** Interní: odešle e-mail přes Resend; bez API klíče se odeslání přeskočí (dev). */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send')
    return { success: true }
  }
  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to: [to], subject, html })
    if (error) {
      console.error(`Failed to send email "${subject}":`, error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    console.error(`Error sending email "${subject}":`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

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
  const roleText = role === 'kapitan' ? 'Kapitán týmu' : role === 'rozhodci' ? 'Rozhodčí' : 'Závodník'

  const bodyHtml = `
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px;">Dobrý den, ${jmeno}!</h2>
              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Byli jste pozváni k účasti na rybářském závodě. Níže najdete všechny podrobnosti.
              </p>
              ${zavodDetailsBox(zavodNazev, [
                detailRow('Termín:', formatDateRange(zavodDatumStart, zavodDatumEnd)),
                detailRow('Místo:', zavodMisto),
                detailRow('Tým:', tymNazev),
                detailRow('Vaše role:', roleText),
              ].join(''))}`

  const html = emailLayout({
    subtitle: 'Pozvánka na rybářský závod',
    bodyHtml: `${bodyHtml}
              <p style="margin: 24px 0 0; color: #71717a; font-size: 13px; line-height: 1.5;">
                Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:<br>
                <a href="${inviteLink}" style="color: #0d9488; word-break: break-all;">${inviteLink}</a>
              </p>`,
    ctaText: 'Potvrdit registraci',
    ctaHref: inviteLink,
    footerNote: 'Pokud jste tuto pozvánku neočekávali, můžete ji ignorovat.',
  })

  return sendEmail(to, `Pozvánka na závod: ${zavodNazev}`, html)
}

/** Uvítací e-mail po registraci — potvrzuje, že účet je aktivní. */
export async function sendWelcomeEmail({
  to,
  jmeno,
}: {
  to: string
  jmeno: string
}): Promise<{ success: boolean; error?: string }> {
  const html = emailLayout({
    subtitle: 'Vítej v komunitě kaprařů',
    bodyHtml: `
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px;">Ahoj, ${jmeno}!</h2>
              <p style="margin: 0 0 16px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Tvůj účet v Carp Club ČR je <strong>aktivní</strong> — žádné další potvrzení není potřeba.
                Přihlašuješ se e-mailem <strong>${to}</strong>.
              </p>
              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Co dál? Prohlédni si vypsané závody a přihlas svůj tým — stačí pár kliknutí.
              </p>`,
    ctaText: 'Otevřít Carp Club',
    ctaHref: APP_URL,
  })

  return sendEmail(to, 'Vítej v Carp Club ČR — tvůj účet je aktivní', html)
}

export type PrihlaskaEmailVarianta =
  | { typ: 'prijata' }
  | { typ: 'nahradnik'; poradi: number }
  | { typ: 'povysen' }

/** E-mail kapitánovi o stavu přihlášky na závod (přijata / náhradník / povýšen). */
export async function sendPrihlaskaEmail({
  to,
  jmeno,
  zavodNazev,
  zavodMisto,
  zavodDatumStart,
  zavodDatumEnd,
  tymNazev,
  varianta,
}: {
  to: string
  jmeno: string
  zavodNazev: string
  zavodMisto?: string | null
  zavodDatumStart: string
  zavodDatumEnd: string
  tymNazev?: string | null
  varianta: PrihlaskaEmailVarianta
}): Promise<{ success: boolean; error?: string }> {
  let subject: string
  let intro: string
  if (varianta.typ === 'prijata') {
    subject = `Přihláška přijata: ${zavodNazev}`
    intro = `Tvoje přihláška na závod byla <strong>přijata</strong>${tymNazev ? ` a tým <strong>${tymNazev}</strong> byl vytvořen` : ''}. Těšíme se na tebe u vody!`
  } else if (varianta.typ === 'nahradnik') {
    subject = `Jsi náhradník č. ${varianta.poradi}: ${zavodNazev}`
    intro = `Kapacita závodu je momentálně plná — jsi <strong>náhradník č. ${varianta.poradi}</strong>. Jakmile se uvolní místo, automaticky postoupíš a dáme ti vědět e-mailem.`
  } else {
    subject = `Postoupil jsi z náhradníků: ${zavodNazev}`
    intro = `Uvolnilo se místo — <strong>postoupil jsi z náhradníků</strong>${tymNazev ? ` a tým <strong>${tymNazev}</strong> byl vytvořen` : ''}. Jsi v závodě!`
  }

  const html = emailLayout({
    subtitle: 'Přihláška na závod',
    bodyHtml: `
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px;">Ahoj, ${jmeno}!</h2>
              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                ${intro}
              </p>
              ${zavodDetailsBox(zavodNazev, [
                detailRow('Termín:', formatDateRange(zavodDatumStart, zavodDatumEnd)),
                detailRow('Místo:', zavodMisto),
                detailRow('Tým:', tymNazev),
              ].join(''))}`,
    ctaText: 'Otevřít Carp Club',
    ctaHref: APP_URL,
  })

  return sendEmail(to, subject, html)
}
