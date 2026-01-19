import Link from "next/link"
import { ArrowLeft, Shield, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Ochrana osobních údajů | Carp Club ČR",
  description: "Zásady ochrany osobních údajů aplikace Carp Club ČR",
}

export default function OchranaOsobnichUdajuPage() {
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
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Ochrana osobních údajů</h1>
        </div>
        <p className="text-muted-foreground">
          Poslední aktualizace: {new Date().toLocaleDateString("cs-CZ")}
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Správce osobních údajů</h2>
          <p className="text-muted-foreground leading-relaxed">
            Správcem osobních údajů je <strong>Carp Club ČR</strong>. Pro jakékoli dotazy
            ohledně zpracování vašich osobních údajů nás kontaktujte na emailu{" "}
            <a href="mailto:prorybolov@gmail.com" className="text-primary hover:underline">
              prorybolov@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Jaké údaje sbíráme</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            V rámci aplikace Carp Club ČR sbíráme následující osobní údaje:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <strong>Identifikační údaje:</strong> jméno a příjmení
            </li>
            <li>
              <strong>Kontaktní údaje:</strong> emailová adresa, telefonní číslo (volitelně)
            </li>
            <li>
              <strong>Údaje o účasti:</strong> členství v týmu, účast na závodech,
              zaznamenané úlovky včetně váhy ryb
            </li>
            <li>
              <strong>Fotografie:</strong> fotky úlovků nahrané do aplikace
            </li>
            <li>
              <strong>Technické údaje:</strong> čas přihlášení, IP adresa
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Účel zpracování</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Vaše osobní údaje zpracováváme pro následující účely:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <strong>Správa účtu:</strong> registrace a přihlašování do aplikace
            </li>
            <li>
              <strong>Organizace závodů:</strong> evidence účastníků, týmů a jejich členů
            </li>
            <li>
              <strong>Evidence výsledků:</strong> zaznamenávání úlovků, výpočet bodování,
              zobrazení leaderboardu
            </li>
            <li>
              <strong>Komunikace:</strong> zasílání pozvánek do závodů, notifikace o změnách
            </li>
            <li>
              <strong>Galerie:</strong> zobrazení fotografií úlovků účastníkům závodu
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Právní základ zpracování</h2>
          <p className="text-muted-foreground leading-relaxed">
            Zpracování osobních údajů provádíme na základě:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
            <li>
              <strong>Souhlas (čl. 6 odst. 1 písm. a) GDPR):</strong> při registraci do aplikace
            </li>
            <li>
              <strong>Plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR):</strong> pro zajištění
              služeb spojených s účastí na závodech
            </li>
            <li>
              <strong>Oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR):</strong> pro vedení
              statistik a zlepšování služeb
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Doba uchování údajů</h2>
          <p className="text-muted-foreground leading-relaxed">
            Vaše osobní údaje uchováváme po dobu:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
            <li>
              <strong>Účet uživatele:</strong> po celou dobu existence účtu, nejdéle 3 roky od
              posledního přihlášení
            </li>
            <li>
              <strong>Údaje o závodech:</strong> 5 let od ukončení závodu pro účely archivace
              a statistik
            </li>
            <li>
              <strong>Fotografie:</strong> po dobu existence účtu nebo do odvolání souhlasu
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Vaše práva</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            V souvislosti se zpracováním osobních údajů máte následující práva:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <strong>Právo na přístup:</strong> můžete požádat o kopii vašich osobních údajů
            </li>
            <li>
              <strong>Právo na opravu:</strong> můžete požádat o opravu nepřesných údajů
            </li>
            <li>
              <strong>Právo na výmaz:</strong> můžete požádat o smazání vašich údajů
              (&quot;právo být zapomenut&quot;)
            </li>
            <li>
              <strong>Právo na omezení zpracování:</strong> můžete požádat o omezení
              zpracování v určitých případech
            </li>
            <li>
              <strong>Právo na přenositelnost:</strong> můžete požádat o export vašich
              údajů ve strojově čitelném formátu
            </li>
            <li>
              <strong>Právo odvolat souhlas:</strong> pokud zpracování probíhá na základě
              souhlasu, můžete jej kdykoli odvolat
            </li>
            <li>
              <strong>Právo podat stížnost:</strong> máte právo podat stížnost u Úřadu
              pro ochranu osobních údajů (ÚOOÚ)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Sdílení údajů</h2>
          <p className="text-muted-foreground leading-relaxed">
            Vaše osobní údaje nesdílíme s třetími stranami s výjimkou:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
            <li>
              <strong>Ostatní účastníci závodu:</strong> vidí vaše jméno a výsledky v rámci
              leaderboardu a galerie
            </li>
            <li>
              <strong>Poskytovatelé služeb:</strong> využíváme služby Supabase pro ukládání
              dat a Resend pro zasílání emailů
            </li>
            <li>
              <strong>Právní požadavky:</strong> v případě zákonné povinnosti
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Zabezpečení údajů</h2>
          <p className="text-muted-foreground leading-relaxed">
            Přijímáme vhodná technická a organizační opatření k ochraně vašich osobních
            údajů před neoprávněným přístupem, změnou, zveřejněním nebo zničením.
            Využíváme šifrované připojení (HTTPS), bezpečné ukládání hesel a přísně
            kontrolovaný přístup k databázi.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Kontakt</h2>
          <p className="text-muted-foreground leading-relaxed">
            Pro uplatnění vašich práv nebo jakékoli dotazy ohledně zpracování osobních
            údajů nás kontaktujte na:
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
