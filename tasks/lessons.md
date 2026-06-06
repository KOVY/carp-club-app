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
