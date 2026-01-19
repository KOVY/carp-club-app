import Link from "next/link"
import { ArrowLeft, FileText, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Podmínky užití | Carp Club ČR",
  description: "Podmínky užití aplikace Carp Club ČR",
}

export default function PodminkyUzitiPage() {
  return (
    <div className="container max-w-4xl py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na hlavní stránku
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Podmínky užití</h1>
        </div>
        <p className="text-muted-foreground">
          Poslední aktualizace: {new Date().toLocaleDateString("cs-CZ")}
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Úvodní ustanovení</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tyto podmínky užití upravují práva a povinnosti uživatelů webové aplikace
            Carp Club ČR (dále jen &quot;aplikace&quot;), provozované organizací Carp Club ČR.
            Používáním aplikace souhlasíte s těmito podmínkami.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Registrace a účet</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              Pro plné využití aplikace je nutná registrace prostřednictvím pozvánky
              od organizátora závodu.
            </li>
            <li>
              Uživatel je povinen uvést pravdivé a aktuální údaje.
            </li>
            <li>
              Každý uživatel smí mít pouze jeden účet.
            </li>
            <li>
              Uživatel je odpovědný za zachování důvěrnosti svého přihlášení.
            </li>
            <li>
              Administrátor má právo účet pozastavit nebo zrušit při porušení pravidel.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Účel aplikace</h2>
          <p className="text-muted-foreground leading-relaxed">
            Aplikace slouží k:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
            <li>Organizaci a správě kaprařských závodů</li>
            <li>Evidenci týmů a jejich členů</li>
            <li>Zaznamenávání a potvrzování úlovků</li>
            <li>Zobrazení živých výsledků a leaderboardu</li>
            <li>Sdílení fotografií úlovků v galerii</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Pravidla chování</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Při používání aplikace je zakázáno:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Zadávat nepravdivé údaje o úlovcích</li>
            <li>Nahrávat nevhodný nebo urážlivý obsah</li>
            <li>Pokoušet se o neoprávněný přístup k účtům jiných uživatelů</li>
            <li>Narušovat funkčnost aplikace</li>
            <li>Používat aplikaci k jakékoli nezákonné činnosti</li>
            <li>Šířit spam nebo nevyžádanou reklamu</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Obsah nahraný uživateli</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Uživatel je plně odpovědný za veškerý obsah, který do aplikace nahraje
            (fotografie, texty, data o úlovcích).
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <strong>Fotografie úlovků:</strong> Nahráním fotografie uživatel potvrzuje,
              že je autorem fotografie nebo má právo ji použít, a uděluje Carp Club ČR
              nevýhradní licenci k jejímu zobrazení v rámci aplikace.
            </li>
            <li>
              <strong>Údaje o úlovcích:</strong> Uživatel je povinen zadávat pravdivé
              údaje. Záměrné zadávání nepravdivých dat může vést k vyloučení ze závodu
              a zablokování účtu.
            </li>
            <li>
              Provozovatel si vyhrazuje právo odstranit jakýkoli obsah, který porušuje
              tyto podmínky.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Autorská práva</h2>
          <p className="text-muted-foreground leading-relaxed">
            Aplikace a její obsah (design, loga, texty, kód) jsou chráněny autorským
            právem. Bez předchozího písemného souhlasu je zakázáno:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
            <li>Kopírovat nebo reprodukovat obsah aplikace</li>
            <li>Modifikovat nebo vytvářet odvozená díla</li>
            <li>Distribuovat nebo veřejně šířit obsah aplikace</li>
            <li>Používat ochranné známky bez povolení</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Odpovědnost a záruky</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              Aplikace je poskytována &quot;tak, jak je&quot; bez jakýchkoli záruk.
            </li>
            <li>
              Provozovatel neručí za nepřetržitou dostupnost aplikace ani za ztrátu dat.
            </li>
            <li>
              Provozovatel nenese odpovědnost za škody vzniklé v důsledku použití aplikace.
            </li>
            <li>
              Uživatel používá aplikaci na vlastní riziko.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Ochrana osobních údajů</h2>
          <p className="text-muted-foreground leading-relaxed">
            Zpracování osobních údajů se řídí našimi{" "}
            <Link
              href="/ochrana-osobnich-udaju"
              className="text-primary hover:underline"
            >
              Zásadami ochrany osobních údajů
            </Link>
            , které jsou nedílnou součástí těchto podmínek.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Změny podmínek</h2>
          <p className="text-muted-foreground leading-relaxed">
            Provozovatel si vyhrazuje právo tyto podmínky kdykoli změnit. O významných
            změnách budou uživatelé informováni prostřednictvím aplikace nebo emailem.
            Pokračování v používání aplikace po změně podmínek znamená souhlas s novým
            zněním.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Ukončení užívání</h2>
          <p className="text-muted-foreground leading-relaxed">
            Uživatel může kdykoli přestat aplikaci používat. Pro smazání účtu
            kontaktujte administrátora na emailu{" "}
            <a
              href="mailto:prorybolov@gmail.com"
              className="text-primary hover:underline"
            >
              prorybolov@gmail.com
            </a>
            . Provozovatel si vyhrazuje právo ukončit poskytování služby nebo
            zablokovat přístup uživateli při porušení podmínek.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Rozhodné právo</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tyto podmínky se řídí právním řádem České republiky. Případné spory
            budou řešeny příslušnými soudy České republiky.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Kontakt</h2>
          <p className="text-muted-foreground leading-relaxed">
            V případě dotazů k těmto podmínkám nás kontaktujte na:
          </p>
          <div className="mt-4 p-4 bg-muted rounded-lg flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <a
              href="mailto:prorybolov@gmail.com"
              className="text-primary hover:underline font-medium"
            >
              prorybolov@gmail.com
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
