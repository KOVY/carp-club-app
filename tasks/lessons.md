# Lessons — Carp Club ČR

## Formát
### [YYYY-MM-DD] Kategorie: Název
**Problém** / **Příčina** / **Řešení** / **Pravidlo**

---

### [2026-06-06] ARCH: Role se čte výhradně ze `zavod_role`, ne z `clenove_tymu`
**Problém**: Auto-vytvořený kapitán (samoobslužná přihláška → tým) by neviděl tlačítko „Přidat úlovek".
**Příčina**: `AddCatchButton.tsx` i detail závodu (`zavod/[zavodId]/page.tsx`) určují roli **jen** dotazem na `zavod_role`. `createTym` ale kapitána zapisuje pouze do `clenove_tymu`. Pozvánkový flow fungoval jen proto, že RPC `register_via_invitation` (migrace 007) kapitánovi navíc vkládal `zavod_role`. Žádný DB trigger `clenove_tymu → zavod_role` neexistuje.
**Řešení**: `vytvoritTymProPrihlasku` (v `prihlasky.actions.ts`) zapisuje kapitánovi i `zavod_role` (role `kapitan`, upsert ignoreDuplicates).
**Pravidlo**: Kdykoli vzniká člen s rolí, která má dávat oprávnění v UI, zapiš roli do `zavod_role`. Nespoléhej na `clenove_tymu` pro oprávnění. Pozn.: stejnou mezeru má pravděpodobně i admin `createTym` — kapitáni vytvoření pořadatelem nemají `zavod_role`.

### [2026-06-06] ARCH: Samoobsluha přihlašování — model „kapitán = jediný účet týmu"
**Problém/Kontext**: Přechod z e-mailových pozvánek na samoobslužnou registraci.
**Příčina**: Pozvánkový systém zakládal účet každému členovi; nový model `prihlasitNaZavod` bere členy jen jako text (`prihlasky.clenove`).
**Řešení**: Závodník se zaregistruje sám (email+heslo/Google), přihlásí se na závod jako kapitán, ostatní členy vypíše jako jména. Úlovky zadává kapitán (+ rozhodčí/pořadatel). Přihlášky se přijímají automaticky do `pocet_pegu`, nad kapacitu náhradníci. Rozhodčí = přiřazení role registrovanému uživateli (`rozhodci.actions.ts`), bez e-mailu.
**Pravidlo**: Pokud bude potřeba, aby i řadoví členové měli účty a zadávali úlovky, je to samostatná iterace (rozšířit přihlášku o e-maily členů + zakládání účtů). Pozvánkový kód (`pozvanka.actions.ts`, `/pozvanka/[token]`, tabulka `pozvanky`) zatím leží neodkázaný — fyzické smazání až po ověření na produkci.

### [2026-06-07] BUG: „Nepřišel mi registrační e-mail" — autoconfirm + zapomenuté heslo
**Problém**: Uživatel (Tomáš, honza.tap@seznam.cz) hlásil, že po registraci nedostal e-mail a nemůže se přihlásit.
**Příčina**: Dvě nezávislé věci: (1) Supabase má zapnutý autoconfirm → potvrzovací e-maily se vůbec negenerují (SMTP/Resend s tím nesouvisí, je funkční — ověřeno testovacím /recover, 200 OK bez SMTP chyb). (2) Uživatel se ráno úspěšně zaregistroval i přihlásil, odpoledne ale zkoušel špatné heslo (3× `Invalid login credentials` v auth lozích) a domníval se, že registrace neproběhla.
**Řešení**: Poslat uživatele na /zapomenute-heslo (reset e-maily fungují). Diagnostika: auth logy přes Supabase MCP `get_logs(service=auth)` + `auth.users` (`email_confirmed_at` = `created_at` a `confirmation_sent_at IS NULL` ⇒ autoconfirm).
**Pravidlo**: Uživatelé očekávají e-mail jako potvrzení registrace — bez něj si myslí, že se nic nestalo. Chybí welcome e-mail po registraci a potvrzení přihlášky na závod (Resend infra už existuje v `src/lib/email/resend.ts`). Při hlášce „nemohu se přihlásit" vždy nejdřív auth logy, ne konfigurace SMTP.

### [2026-06-07] BUG: Mazání uživatele selhává na FK `tymy_kapitan_id_fkey` (VYŘEŠENO)
**Problém**: Smazání uživatele (Supabase dashboard, service_role) vrací `500: Database error deleting user`.
**Příčina**: 9 FK na `profiles(id)` bez `ON DELETE` pravidla (NO ACTION): tymy.kapitan_id, clenove_tymu, ulovky.chytil_user_id, potvrzeni, zlute_karty, zlute_karty_poznamky, zavod_role, audit_log, system_admins.created_by.
**Řešení**: Migrace `023_fk_on_delete_user.sql` — schválená sémantika „zachovat výsledky": SET NULL (tým/úlovky/karty zůstávají, vazba na osobu se anonymizuje) + CASCADE u čistě osobních vazeb (clenove_tymu, zavod_role). `tymy.kapitan_id` je nově nullable → kód musí počítat s `kapitan_id = NULL` (guard v `getTymDetail`, typ v `database.types.ts`). Ověřeno ostrým DELETE testovacího uživatele s týmem.
**Pravidlo**: Při zakládání FK vždy explicitně určit ON DELETE pravidlo. U historických/výsledkových dat SET NULL, u členství CASCADE.

### [2026-06-07] ARCH: Žluté karty jsou append-only — blokují mazání závodů
**Problém/Kontext**: `DELETE FROM zavody` (i kaskádový) selže s hláškou „Audit log je append-only", pokud závod má žluté karty.
**Příčina**: Trigger `prevent_zluta_karta_delete` (003_functions_triggers.sql) sdílí funkci `prevent_audit_modification()` s audit_logem — záměrná ochrana, ale zavádějící hláška. Navíc `potvrzeni.potvrdil_tym_id → tymy` a `zlute_karty.odebrana_ryba_id → ulovky` jsou NO ACTION, takže mazání závodu vyžaduje pořadí: potvrzeni → zlute_karty → ulovky → tymy → zavody.
**Řešení**: Jednorázový úklid testovacích dat s Dušanem schváleným dočasným `DISABLE TRIGGER` v transakci (hned zase ENABLE).
**Pravidlo**: `deleteZavod` v `hlavni-admin.actions.ts` na závodech se žlutými kartami nebo potvrzeními SELŽE — až bude mazání závodů potřeba v UI, musí řešit pořadí mazání + politiku pro žluté karty.

### [2026-06-07] PATTERN: E-maily přes Resend — sdílený layout + fire-and-forget
**Kontext**: Welcome e-mail po registraci, potvrzení přihlášky na závod (prijata/nahradnik/povysen).
**Řešení**: `src/lib/email/resend.ts` — `emailLayout()` (teal hlavička/patička) + `sendEmail()` helper (guard na chybějící RESEND_API_KEY); `sendWelcomeEmail`, `sendPrihlaskaEmail`, `sendInvitationEmail`. Volání vždy `await` v try/catch (serverless utne fire-and-forget bez await), selhání e-mailu NIKDY nesmí rozbít akci. Idempotence OAuth welcome: `profiles.welcome_email_sent` flag + okno 60 s od `created_at`.
**Pravidlo**: Nový e-mail = nová tenká funkce nad `emailLayout`/`sendEmail`, ne kopie HTML. V server actions e-mail volat až PO úspěchu hlavní operace.
