# Email šablony pro Supabase

Tyto HTML šablony je třeba vložit do Supabase Dashboard.

## Jak nastavit

1. Jdi na [Supabase Dashboard](https://supabase.com/dashboard)
2. Vyber svůj projekt
3. Jdi do **Authentication** → **Email Templates**

## Šablony

### 1. Magic Link (`magic-link.html`)
- **Použití:** Confirm signup, Magic Link
- **Subject:** `Přihlášení do Carp Club ČR`
- Zkopíruj obsah souboru `magic-link.html`

### 2. Invite (`invite.html`)
- **Použití:** Invite user
- **Subject:** `Pozvánka do kaprařského závodu - Carp Club ČR`
- Zkopíruj obsah souboru `invite.html`

### 3. Confirm Signup (`confirm-signup.html`)
- **Použití:** Confirm signup (pokud používáš)
- **Subject:** `Potvrďte svůj email - Carp Club ČR`
- Zkopíruj obsah souboru `confirm-signup.html`

### 4. Reset Password (`reset-password.html`)
- **Použití:** Reset password
- **Subject:** `Reset hesla - Carp Club ČR`
- Zkopíruj obsah souboru `reset-password.html`

## Proměnné

Supabase automaticky nahrazuje tyto proměnné:
- `{{ .ConfirmationURL }}` - odkaz pro potvrzení
- `{{ .Token }}` - token (pokud potřebuješ)
- `{{ .TokenHash }}` - hash tokenu
- `{{ .SiteURL }}` - URL tvé aplikace

## Nastavení Site URL

V **Authentication** → **URL Configuration**:
- **Site URL:** `https://carpclub.app`
- **Redirect URLs:**
  - `https://carpclub.app/**`
  - `http://localhost:3000/**` (pro vývoj)

## Testování

1. Nastav šablony v Supabase
2. Pošli si testovací email (např. přes reset hesla)
3. Zkontroluj, že email vypadá správně
