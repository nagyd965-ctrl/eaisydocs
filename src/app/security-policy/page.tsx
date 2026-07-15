import { ArrowLeft, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function SecurityPolicyPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza a Beállításokhoz
        </Link>
      </div>

      <div className="bg-card border rounded-lg p-8 shadow-sm prose prose-slate dark:prose-invert max-w-none">
        <div className="flex items-center gap-3 mb-6 not-prose">
          <ShieldCheck className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold m-0">IT Biztonsági Szabályzat</h1>
        </div>

        <p className="lead text-muted-foreground">
          Az eaisyDocs Elektronikus Iratkezelő Rendszer Szállítói IT Biztonsági Szabályzata.
          Verzió: 1.0 | Utolsó frissítés: 2026. július
        </p>

        <hr className="my-8" />

        <h2>1. Bevezető rendelkezések</h2>
        <p>
          Jelen szabályzat célja, hogy rögzítse az eaisyDocs rendszerben tárolt üzleti és személyes adatok védelmének technikai és logikai kereteit. A rendszer tervezése és fejlesztése során a "Security by Design" és a legkisebb jogosultság (Principle of Least Privilege) elveit alkalmaztuk.
        </p>

        <h2>2. Hitelesítés és Jelszó Házirend</h2>
        <ul>
          <li><strong>Erős hitelesítés:</strong> A rendszerbe történő belépés kizárólag regisztrált e-mail cím és jelszó párosával lehetséges (Supabase Auth).</li>
          <li><strong>Jelszókövetelmények:</strong> A felhasználói jelszavaknak minimum 6 karakter hosszúságúnak kell lenniük. A jelszavak tárolása biztonságos, egyirányú titkosítással (Bcrypt hash) történik, visszafejtésük nem lehetséges.</li>
          <li><strong>Automatikus kijelentkeztetés (Session Timeout):</strong> Inaktivitás esetén a rendszer automatikusan megszakítja a munkamenetet. A határérték a rendszergazda által paraméterezhető (5, 15, 30 vagy 60 perc).</li>
        </ul>

        <h2>3. Jogosultságkezelés (RBAC és RLS)</h2>
        <p>
          A hozzáférés-szabályozás adatbázis szinten, Row Level Security (RLS) technológiával valósul meg. Az adatokhoz való hozzáférés két dimenzió metszeteként dől el:
        </p>
        <ol>
          <li>
            <strong>Szerepkörök (Role-Based Access Control):</strong>
            <ul>
              <li><code>rendszergazda</code>: Teljes hozzáférés a beállításokhoz és felhasználókhoz.</li>
              <li><code>iktato</code>: Iratok érkeztetése, iktatása és metaadatok szerkesztése.</li>
              <li><code>vezeto</code>: Ügyek szignálása, felelősök kijelölése, minden irat megtekintése.</li>
              <li><code>ugyintezo</code>: Csak a rászignált ügyiratok kezelése.</li>
              <li><code>betekinto</code>: Kizárólag olvasási jog (letöltés nélkül).</li>
              <li><code>auditor</code>: Olvasási jog az iratokra és az audit naplóra (esemeny_naplo).</li>
            </ul>
          </li>
          <li>
            <strong>Biztonsági Minősítés:</strong>
            <p>Minden felhasználó és minden dokumentum rendelkezik egy minősítési szinttel (Nyílt, Belső, Bizalmas, Szigorúan Bizalmas). A felhasználó csak azokat a dokumentumokat érheti el, amelyek minősítési szintje nem haladja meg az ő saját biztonsági minősítését.</p>
          </li>
        </ol>

        <h2>4. Naplózás és Nyomonkövethetőség (Audit Trail)</h2>
        <p>
          A rendszer minden kritikus műveletet (bejelentkezés, irat megtekintés, letöltés, módosítás, törlés) egy központosított <code>esemeny_naplo</code> táblában rögzít.
        </p>
        <ul>
          <li><strong>Append-only kialakítás:</strong> Az audit naplóhoz adatbázis szinten letiltottuk az <code>UPDATE</code> és <code>DELETE</code> jogosultságokat. A naplóbejegyzések utólagos módosítása még Rendszergazda jogosultsággal sem lehetséges.</li>
          <li>A napló rögzíti a pontos időbélyeget, a felhasználó azonosítóját, az IP címet és a művelet típusát.</li>
        </ul>

        <h2>5. Adatvédelem, Adattárolás és Integritás</h2>
        <p>
          A feltöltött fizikai fájlok (PDF, Word, stb.) védelme kiemelt prioritású.
        </p>
        <ul>
          <li><strong>Zárt tárolás:</strong> A fájlok a Supabase Storage privát vödreiben (private buckets) kapnak helyet. Publikus URL-en keresztül semmilyen dokumentum nem érhető el.</li>
          <li><strong>Lejáró tokenek:</strong> Letöltéskor vagy megtekintéskor a rendszer egy rövid életű (60 másodperces), titkosítással aláírt (signed) URL-t generál, amely a lejárati idő után automatikusan érvényét veszti.</li>
          <li><strong>Fájl integritás:</strong> Minden feltöltött állományról a rendszer azonnal kiszámít egy <code>SHA-256 hash</code> értéket (digitális ujjlenyomat), amelyet az adatbázisban tárol. Ez biztosítja a dokumentumok sértetlenségének és eredetiségének utólagos bizonyíthatóságát (non-repudiation).</li>
        </ul>

      </div>
    </div>
  )
}
