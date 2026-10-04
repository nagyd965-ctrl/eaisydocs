import { ReplyTemplate, ReplyCategoryDefinition } from "@/types/reply-templates"

export const REPLY_CATEGORIES: ReplyCategoryDefinition[] = [
  {
    id: "hivatalos",
    nev: "Hivatalos válasz",
    shortLabel: "Hivatalos",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
  },
  {
    id: "penzugy",
    nev: "Pénzügy / Számla",
    shortLabel: "Pénzügy",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "tajekoztatas",
    nev: "Tájékoztatás",
    shortLabel: "Tájékoztatás",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    id: "hianypotlas",
    nev: "Hiánypótlás",
    shortLabel: "Hiánypótlás",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    id: "szerzodes",
    nev: "Szerződés / Jogi",
    shortLabel: "Szerződés",
    badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  {
    id: "egyedi",
    nev: "Egyedi / Egyéb",
    shortLabel: "Egyéb",
    badgeClass: "border-border/60 bg-muted text-muted-foreground",
  },
]

export const DEFAULT_REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: "hivatalos_valasz",
    nev: "Hivatalos válaszlevél",
    kategoria: "hivatalos",
    targy: "Hivatalos válaszlevél",
    description: "Formális válaszlevél bejövő iratra vagy hivatalos megkeresésre.",
    tartalom: `Tisztelt Partnerünk!

Hivatkozással a fenti tárgyú levelükre és megkeresésükre az alábbiakról tájékoztatjuk:

[Ide írja a hivatalos érdemi választ és megállapításokat...]

Kérjük szíves visszajelzésüket.

Üdvözlettel,
eaisyDocs ügyintézés`,
    isCustom: false,
  },
  {
    id: "tajekoztatas",
    nev: "Tájékoztató levél",
    kategoria: "tajekoztatas",
    targy: "Tájékoztatás ügyintézés folyamatáról",
    description: "Általános tájékoztató kimenő irat az eljárás állásáról.",
    tartalom: `Tisztelt Címzett!

Ezúton szeretnénk tájékoztatni, hogy az ügyintézés a beérkezett dokumentumok alapján folyamatban van.

[Tájékoztatás részletei és várható ügyintézési határidő...]

Megértésüket és együttműködésüket köszönjük.

Üdvözlettel,
eaisyDocs ügyintézés`,
    isCustom: false,
  },
  {
    id: "hianypotlas",
    nev: "Hiánypótlási felhívás",
    kategoria: "hianypotlas",
    targy: "Hiánypótlási felhívás határidővel",
    description: "Hiányzó dokumentumok vagy mellékletek bekérése határidővel.",
    tartalom: `Tisztelt Partnerünk!

A beérkezett irat felülvizsgálata során megállapítottuk, hogy az érdemi ügyintézéshez az alábbi dokumentumok pótlása szükséges:

1. [Hiányzó dokumentum 1 megnevezése]
2. [Hiányzó dokumentum 2 megnevezése]

Kérjük, hogy a hiányzó iratokat a kézhezvételtől számított 8 munkanapon belül szíveskedjenek megküldeni.

Együttműködésüket köszönjük.

Üdvözlettel,
eaisyDocs ügyintézés`,
    isCustom: false,
  },
  {
    id: "befogadas",
    nev: "Számla / Irat befogadási igazolás",
    kategoria: "penzugy",
    targy: "Dokumentum / Számla befogadási igazolás",
    description: "Dokumentum vagy bejövő számla befogadásának hivatalos visszaigazolása.",
    tartalom: `Tisztelt Partnerünk!

Ezúton igazoljuk, hogy a hivatkozott számlát / megkeresést nyilvántartásunkba vettük. Az alaki és tartalmi ellenőrzés, valamint a pénzügyi teljesítés előkészítése folyamatban van.

Amennyiben további adategyeztetés szükséges, munkatársunk felveszi Önökkel a kapcsolatot.

Üdvözlettel,
Pénzügyi osztály`,
    isCustom: false,
  },
  {
    id: "penzugy_reklamacio",
    nev: "Számlareklamáció és egyeztetés",
    kategoria: "penzugy",
    targy: "Számlareklamáció és egyeztetési kérelem",
    description: "Számla összegszerű vagy tartalmi vitatása, jóváírás vagy javítás kérése.",
    tartalom: `Tisztelt Partnerünk!

Tájékoztatjuk, hogy a fenti hivatkozási számú számla feldolgozása során az alábbi eltérést tapasztaltuk:

[Eltérés vagy reklamáció pontos leírása: összegbeli vagy mennyiségi különbség...]

Kérjük, hogy a számla javítását, stornózását vagy helyesbítő számla kiállítását elvégezni szíveskedjenek.

Várjuk szíves visszajelzésüket.

Üdvözlettel,
Pénzügyi osztály`,
    isCustom: false,
  },
  {
    id: "szerzodes_alairas",
    nev: "Szerződéstervezet megküldése",
    kategoria: "szerzodes",
    targy: "Szerződéstervezet felülvizsgálatra és aláírásra",
    description: "Kétoldalú megállapodás vagy melléklet továbbítása partner felé aláírásra.",
    tartalom: `Tisztelt Partnerünk!

Mellékelten továbbítjuk az egyeztetések alapján elkészített szerződéstervezetet felülvizsgálatra és cégszerű aláírásra.

Kérjük, hogy az aláírt példányt postai úton vagy minősített elektronikus aláírással (AVDH / e-szignó) ellátva részünkre visszajuttatni szíveskedjenek.

Kérdés esetén készséggel állunk rendelkezésre.

Üdvözlettel,
Jogi és szerződéskezelési csoport`,
    isCustom: false,
  },
  {
    id: "egyedi",
    nev: "Egyedi kimenő irat",
    kategoria: "egyedi",
    targy: "Hivatalos kimenő irat",
    description: "Szabadon szerkeszthető egyedi szövegezésű válaszlevél.",
    tartalom: `Tisztelt Címzett!

[Ide írja az egyedi válaszlevél szövegét...]

Üdvözlettel,
eaisyDocs`,
    isCustom: false,
  },
]
