# Fáze 1 — Trvalý účet (email + heslo + Google OAuth)

- **Projekt:** Carp Club ČR (`carp-club-app`)
- **Datum:** 2026-06-05
- **Status:** Design schválen, čeká na review spec
- **Autoři:** Dušan + Claude
- **Předchozí:** Fáze 0 (security hardening) nasazena. Viz roadmapa v `~/.claude/.../memory/carp_club_app.md`.

---

## 1. Kontext

Aplikace je dnes **čistě pozvánková** — účty zakládá pořadatel (admin-create přes service role), uživatel se sám nezaregistruje. Vstupy: `/admin/login` (heslo), `/login` (OTP, jen existující účty, `shouldCreateUser:false`), `/pozvanka/[token]` (magic-link). **Žádný self-signup, žádný OAuth, žádný DB trigger na profil.**

Projekt se **předává** a Dušan smaže všechny stávající Auth users → **čistý start**, žádná migrace účtů.

## 2. Cíl a záměr

Vytvořit **trvalý uživatelský účet** jako základ celé platformy (varianta „B" — rybář se registruje sám). Registrace vytvoří účet + profil; roli v konkrétním závodě dál uděluje **pozvánka** (Fáze 1) nebo samoobslužné hlášení (Fáze 2). „Login navždy" = perzistentní session.

**Ano (Fáze 1):** registrace email+heslo + Google, vznik profilu, trvalá session, GDPR souhlas, reset hesla, jeden auth vstup. Pozvánkový systém zůstává.
**Ne (navazuje):** samoobslužné hlášení na závod s kapacitou pegů a náhradníky 1.–3. → **Fáze 2**; sezónní rozesílky na emaily → **Fáze 4**.

## 3. UI vstupy

| Route | Obsah | Pozn. |
|-------|-------|-------|
| `/login` | email+heslo, `[Google]`, odkazy *Registrace* + *Zapomenuté heslo* | **Jeden vstup pro všechny** (rybáři i admini). Po loginu redirect dle role: admin/pořadatel → `/admin`, jinak hlavní stránka. |
| `/registrace` | jméno + email + heslo, `[Google]`, ☑ GDPR souhlas | Bez ověřovacího emailu → po `signUp` **rovnou session → dovnitř**. GDPR checkbox povinný i před Google tlačítkem. |
| `/zapomenute-heslo` | email → odešle reset odkaz | `resetPasswordForEmail` |
| `/reset-hesla` | nové heslo (po kliknutí na odkaz z emailu) | `updateUser({ password })` po recovery session |
| `/admin/login` | **zrušit** → redirect na `/login` | sjednocení vstupů |
| `/login` OTP-kód | **zrušit** (nahrazuje heslo) | pozvánkový magic-link zůstává (jiný mechanismus) |

## 4. Server actions (`src/actions/auth.actions.ts`)

- `signUpWithPassword({ jmeno, email, heslo, termsAccepted })` — `supabase.auth.signUp({ email, password, options: { data: { jmeno, terms_accepted: true } } })`. GDPR uloží trigger/handler. Vrací session (bez confirm).
- `signInWithGoogle()` — `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback' } })`.
- `requestPasswordReset(email)` — `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<origin>/reset-hesla' })`.
- `updatePassword(newPassword)` — `supabase.auth.updateUser({ password })` (v recovery session).
- Stávající `signInWithPassword`, `signOut` zůstávají. `generateLoginCode`/`verifyLoginCode` (OTP) se z UI odpojí (lze ponechat nevyužité nebo odstranit — implementační detail plánu).

## 5. Vznik profilu — DB trigger `handle_new_user` ⭐

Klíčová mezera: dnes profil zakládá jen pořadatel; self-registrovaný uživatel by zůstal bez profilu (porušení NOT NULL `jmeno`/`email`). Řešení = standardní Supabase trigger.

Nová migrace `018_handle_new_user.sql`:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, jmeno, terms_accepted_at, privacy_policy_version)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'jmeno',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    CASE WHEN (NEW.raw_user_meta_data->>'terms_accepted') = 'true'
         THEN NOW() ELSE NULL END,
    CASE WHEN (NEW.raw_user_meta_data->>'terms_accepted') = 'true'
         THEN to_char(NOW(), 'YYYY-MM-DD') ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
- Funguje pro **email i Google** (jméno z metadata signUp / z Google profilu, fallback z emailu).
- Idempotentní (`ON CONFLICT DO NOTHING`) — kompatibilní s pořadatelovým admin-create (ten profil upsertuje dál, trigger nepřekáží).

## 6. Google OAuth — callback route

Dnešní `AuthCallbackHandler` umí jen implicit hash flow a je navázaný na `/zavod/[zavodId]`. OAuth code flow potřebuje vlastní route.

Nový **`src/app/auth/callback/route.ts`** (Route Handler):
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
```
- `/auth/callback` přidat do **public routes** v `src/middleware.ts`.
- `signInWithOAuth` používá PKCE code flow (`@supabase/ssr` server klient).

## 7. Session „navždy"

Supabase default = krátký access token (1 h) + auto-refresh přes refresh token → uživatel zůstává přihlášený dlouhodobě. Browser klient má `persistSession: true` (default), SSR drží session v cookies (`@supabase/ssr`, už zapojeno). **Zrušit nevyužitou `SESSION_TIMEOUT_HOURS = 24`** v `constants.ts` (jde proti záměru).

## 8. GDPR souhlas

Povinný checkbox na `/registrace` (i před Google tlačítkem). Předá se do `signUp` metadata (`terms_accepted: true`) → trigger nastaví `terms_accepted_at` + `privacy_policy_version`. Pro Google: checkbox musí být zaškrtnutý před přesměrováním na Google (uloží se přes metadata nebo dovyplní po callbacku — viz plán). Odkazy na `/podminky-uziti`, `/ochrana-osobnich-udaju`.

## 9. Default role

Nový účet bez `zavod_role`/členství = `divák` (existující default). Vidí veřejné závody + svůj profil. Role v závodě jen přes pozvánku (Fáze 1) / hlášení (Fáze 2).

## 10. Supabase dashboard — konfigurace (akce Dušana, mimo kód)

1. **Smazat všechny Auth users** (čistý start) — pozor na FK na `tymy.kapitan_id`; případně pročistit testovací týmy/závody.
2. **Vypnout „Confirm email"** (Authentication → Sign In / Providers → Email → Confirm email OFF).
3. **Custom SMTP = Resend** (`smtp.resend.com:465`, user `resend`, pass = Resend API key, sender `noreply@carpclub.app`). Doména ověřená (SPF/DKIM).
4. **Google provider** zapnout (Client ID/Secret z Google Cloud Console) + redirect URL `https://carpclub.app/auth/callback` (+ localhost pro dev).
5. **Email šablony** Reset Password a Magic Link sladit s `supabase/email-templates/`.

## 11. Testování

- Trigger: vznik auth usera → automaticky profil (jméno z metadata).
- Registrace email+heslo → rovnou přihlášen → profil existuje → vidí veřejné závody.
- Login email+heslo. Reset hesla (request → email → nové heslo → login).
- Google OAuth (manuální, po konfiguraci provideru) → callback → session → profil.
- **Regrese:** pozvánkový flow (`createPozvanka` → `/pozvanka/[token]`) pořád funguje; admin login přes `/login` funguje a redirectuje na `/admin`.

## 12. Rizika

- **Google config dependency** — OAuth nelze otestovat bez provideru v Supabase + Google Cloud credentials (Dušanova akce).
- **Bez email ověření** → možné překlepnuté adresy; akceptováno (míň tření), připomínka ověření až ve Fázi 4.
- **Mazání users vs FK** — čistý start může vyžadovat pročištění závislých dat (týmy/závody).
- **GDPR u Google** — souhlas se sbírá před OAuth redirectem; plán dořeší přesný mechanismus uložení.

## 13. Mimo rozsah (navazující fáze)

- **Fáze 2:** samoobslužné hlášení na závod — pořadatel vypíše závod + počet pegů (kapacita); rybář se hlásí sám do naplnění; pak náhradník 1./2./3. (waitlist); pořadatel spravuje (schválí, přesune, odhlásí). Globální týmy + `TeamRegistration` + `Peg` entita.
- **Fáze 4:** sezónní rozesílky (termínovka, price money, sponzoři) na emaily registrovaných + ověření emailu.
