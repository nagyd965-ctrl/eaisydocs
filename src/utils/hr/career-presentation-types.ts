/**
 * eaisyHR Többcéges AI Vállalati Prezentáció („Cégünkről” / Employer Branding Deck)
 * Típusdefiníciók és kurált vizuális fotótémák
 */

export type PresentationVisualThemeId =
  | "tech_ai"
  | "creative_design"
  | "fleet_logistics"
  | "corporate_modern"

export interface PresentationBriefingInput {
  industry: string
  foundedYear: string
  teamSize: string
  workModel: string
  missionInput: string
  cultureInput: string
  perksInput: string
  visualTheme: PresentationVisualThemeId
}

export interface PresentationStatItem {
  label: string
  value: string
  sub: string
}

export interface PresentationValueCard {
  title: string
  description: string
}

export interface PresentationGalleryCaption {
  title: string
  subtitle: string
  imageUrl: string
}

export interface PresentationPerkCategory {
  category: string
  items: string[]
}

export interface CompanyCareerPresentation {
  published: boolean
  updatedAt: string
  briefing: PresentationBriefingInput
  heroSlide: {
    badgeText: string
    headline: string
    subheadline: string
    missionStatement: string
    coverImageUrl: string
    stats: PresentationStatItem[]
  }
  cultureSlide: {
    sectionTitle: string
    sectionSubtitle: string
    storyParagraph: string
    featureImageUrl: string
    values: PresentationValueCard[]
  }
  environmentSlide: {
    sectionTitle: string
    sectionSubtitle: string
    workflowDescription: string
    techAndTools: string[]
    gallery: PresentationGalleryCaption[]
  }
  perksSlide: {
    sectionTitle: string
    sectionSubtitle: string
    perkCategories: PresentationPerkCategory[]
  }
  closingSlide: {
    headline: string
    leadershipMessage: string
    leaderName: string
    leaderRole: string
    callToActionText: string
  }
}

export interface VisualThemePreset {
  id: PresentationVisualThemeId
  label: string
  description: string
  coverImageUrl: string
  featureImageUrl: string
  gallery: PresentationGalleryCaption[]
}

export const PRESENTATION_VISUAL_THEMES: Record<
  PresentationVisualThemeId,
  VisualThemePreset
> = {
  tech_ai: {
    id: "tech_ai",
    label: "Modern Tech & AI Iroda",
    description:
      "Letisztult technológiai munkatér, fejlesztői kollaboráció és modern architektúra.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    featureImageUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      {
        title: "Kollaboratív közösségi terek",
        subtitle: "Közös terméktervezés és architektúra-workshopok",
        imageUrl:
          "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80",
      },
      {
        title: "Fókuszált egyéni munkaállomások",
        subtitle: "Ergonomikus környezet és prémium hardverpark",
        imageUrl:
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80",
      },
      {
        title: "Csapatmegbeszélések és tudásmegosztás",
        subtitle: "Heti szakmai demók és nyílt visszajelzési kultúra",
        imageUrl:
          "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80",
      },
    ],
  },
  creative_design: {
    id: "creative_design",
    label: "Kreatív Stúdió & Termékdesign",
    description:
      "Inspiráló alkotói tér, UX/UI műhelymunka és világos skandináv belső terek.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80",
    featureImageUrl:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      {
        title: "Design System & Prototípus műhely",
        subtitle: "Felhasználóközpontú tervezés a koncepciótól a megvalósításig",
        imageUrl:
          "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1000&q=80",
      },
      {
        title: "Inspiráló közösségi zóna",
        subtitle: "Kötetlen ötletelés és kreatív feltöltődés",
        imageUrl:
          "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1000&q=80",
      },
      {
        title: "Agilis csapatmunka",
        subtitle: "Szoros együttműködés a termékmenedzsmenttel és a fejlesztőkkel",
        imageUrl:
          "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80",
      },
    ],
  },
  fleet_logistics: {
    id: "fleet_logistics",
    label: "Üzleti Operáció, Mobilitás & Flottakezelés",
    description:
      "Dinamikus vállalati központ, flottamenedzsment és ügyfélközpontú operáció.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
    featureImageUrl:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      {
        title: "Operatív irányítóközpont",
        subtitle: "Valós idejű flottafelügyelet és ügyféltámogatás",
        imageUrl:
          "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=80",
      },
      {
        title: "Vállalati tárgyalók és ügyfélkapcsolat",
        subtitle: "Hosszú távú B2B partnerségek építése",
        imageUrl:
          "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1000&q=80",
      },
      {
        title: "Támogató csapategység",
        subtitle: "Megbízható háttér és átlátható folyamatok",
        imageUrl:
          "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1000&q=80",
      },
    ],
  },
  corporate_modern: {
    id: "corporate_modern",
    label: "Prémium Vállalati & Pénzügyi Központ",
    description:
      "Korszerű A-kategóriás irodaházi környezet, stabilitás és strukturált karrierút.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
    featureImageUrl:
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      {
        title: "A-kategóriás budapesti irodakörnyezet",
        subtitle: "Panorámás munkaterek és csendes fókuszszobák",
        imageUrl:
          "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1000&q=80",
      },
      {
        title: "Szakmai mentorálás és fejlődés",
        subtitle: "Tervezhető előrelépés és belső képzési programok",
        imageUrl:
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80",
      },
      {
        title: "Közösségi események",
        subtitle: "Rendszeres csapatépítők és szakmai konferenciák",
        imageUrl:
          "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1000&q=80",
      },
    ],
  },
}

/**
 * Alapértelmezett (sablon) prezentáció létrehozása egy adott céghez, ha még nincs generálva
 */
export function buildDefaultCompanyPresentation(
  companyName: string,
  companyAddress?: string | null,
  themeId: PresentationVisualThemeId = "tech_ai"
): CompanyCareerPresentation {
  const theme =
    PRESENTATION_VISUAL_THEMES[themeId] || PRESENTATION_VISUAL_THEMES.tech_ai
  const locationShort = companyAddress
    ? companyAddress.split(",")[0].trim()
    : "Budapest"

  return {
    published: true,
    updatedAt: new Date().toISOString(),
    briefing: {
      industry: "Mesterséges intelligencia & Vállalati digitalizáció",
      foundedYear: "2021",
      teamSize: "25–50 fő",
      workModel: "Hibrid (heti 2–3 nap home office)",
      missionInput:
        "Intelligens, papírmentes dokumentumkezelő és HR ökoszisztémát építünk, amely leveszi az adminisztrációs terhet a vállalatok válláról.",
      cultureInput:
        "Lapos hierarchia, önálló döntéshozatal, modern technológiai stack, nyílt szakmai visszajelzések és emberközpontú munkarend.",
      perksInput:
        "Versenyképes alapbér, SZÉP-kártya és cafeteria keret, prémium munkaeszközök, szakmai képzési büdzsé, rugalmas munkaidő.",
      visualTheme: themeId,
    },
    heroSlide: {
      badgeText: `${companyName} — Vállalati Bemutatkozó`,
      headline: `A jövő vállalati munkafolyamatait építjük a(z) ${companyName} csapatával`,
      subheadline:
        "Olyan szakembereket keresünk, akik szeretnek maradandót alkotni, értékelik a szakmai autonómiát és a modern, átlátható munkakultúrát.",
      missionStatement:
        "Küldetésünk, hogy a legkorszerűbb digitális és mesterséges intelligencia alapú megoldásokkal egyszerűsítsük a vállalatok mindennapi működését — miközben olyan munkahelyet teremtünk, ahol minden csapattagunk hosszú távon fejlődhet.",
      coverImageUrl: theme.coverImageUrl,
      stats: [
        {
          label: "Alapítás éve",
          value: "2021",
          sub: "Stabil, növekvő háttér",
        },
        {
          label: "Csapatméret",
          value: "25–50 fő",
          sub: "Közvetlen, agilis szervezet",
        },
        {
          label: "Központi iroda",
          value: locationShort,
          sub: companyAddress || "Korszerű irodai környezet",
        },
        {
          label: "Munkarend",
          value: "Hibrid",
          sub: "Rugalmas otthoni munkavégzés",
        },
      ],
    },
    cultureSlide: {
      sectionTitle: "Kultúránk és alapértékeink",
      sectionSubtitle:
        "Nem hiszünk a mikromenedzsmentben — a bizalomra, a szakmai igényességre és az egymást támogató csapatmunkára építünk.",
      storyParagraph: `A(z) ${companyName} közösségében mindenki véleménye számít. Kis létszámú, nagy hatású szakmai csapatokban dolgozunk, ahol az ötletek nem vesznek el a bürokráciában: amit ma megtervezünk, az holnap már valós ügyfelek ezreinek segít.`,
      featureImageUrl: theme.featureImageUrl,
      values: [
        {
          title: "Szakmai autonómia és tulajdonosi szemlélet",
          description:
            "Bízunk a csapattagjaink szakértelmében: önállóan alakíthatod a feladataidat, és valódi ráhatásod van a termék és a folyamatok fejlődésére.",
        },
        {
          title: "Minőség a mennyiség felett",
          description:
            "Büszkék vagyunk az általunk kiadott munkára — legyen szó szoftverarchitektúráról, ügyfélkiszolgálásról vagy belső működésről.",
        },
        {
          title: "Nyílt kommunikáció és transzparencia",
          description:
            "Átlátható célok, egyenes visszajelzések és publikus bérsávok mentén dolgozunk, felesleges vállalati politika nélkül.",
        },
        {
          title: "Fenntartható tempó és munka-magánélet egyensúly",
          description:
            "Hosszú távra tervezünk: tiszteljük a szabadidődet, rugalmas törzsidőt és hibrid munkavégzést biztosítunk.",
        },
      ],
    },
    environmentSlide: {
      sectionTitle: "Munkakörnyezet, Eszközök & Mindennapok",
      sectionSubtitle:
        "Minden feltételt biztosítunk ahhoz, hogy a legjobb formádat hozhasd — akár az irodában, akár otthonról dolgozol.",
      workflowDescription:
        "Korszerű digitális eszközparkkal, strukturált onboarding folyamattal és dedikált mentorral várunk az első naptól kezdve.",
      techAndTools: [
        "Prémium laptop és nagy felbontású külső monitorok",
        "Modern felhőalapú kollaborációs és projektmenedzsment eszközök",
        "Strukturált 30–60–90 napos beléptetési (Onboarding) program",
        "Rendszeres belső szakmai workshopok és tudásmegosztó alkalmak",
      ],
      gallery: theme.gallery,
    },
    perksSlide: {
      sectionTitle: "Juttatási csomag és fejlődési lehetőségek",
      sectionSubtitle:
        "A versenyképes alapbéren felül átfogó juttatási és szakmai támogató csomaggal gondoskodunk a csapatunkról.",
      perkCategories: [
        {
          category: "Pénzügyi megbecsülés & Cafeteria",
          items: [
            "Transzparens, rendszeresen felülvizsgált alapbérsávok",
            "Éves cafeteria és SZÉP-kártya keret",
            "Munkavállalói ajánlási bónuszprogram",
          ],
        },
        {
          category: "Rugalmasság & Munkakörnyezet",
          items: [
            "Hibrid munkavégzés (heti 2–3 nap home office lehetőség)",
            "Rugalmas munkakezdés a családbarát működésért",
            "Kiváló megközelíthetőségű, modern iroda",
          ],
        },
        {
          category: "Szakmai fejlődés & Egészség",
          items: [
            "Éves egyéni képzési, tanfolyam- és konferenciakeret",
            "Teljes körű foglalkozás-egészségügyi és prevenciós háttér",
            "Tervezhető egyéni fejlődési terv (IDP) és karrierút",
          ],
        },
      ],
    },
    closingSlide: {
      headline: `Találd meg a helyed a(z) ${companyName} csapatában!`,
      leadershipMessage:
        "Hiszünk abban, hogy egy vállalat pontosan annyira erős, amennyire a benne dolgozó emberek jól érzik magukat és fejlődni tudnak. Ha szeretnél egy támogató, szakmailag igényes közösség tagja lenni, várjuk a jelentkezésedet!",
      leaderName: "HR & Vezetői Csapat",
      leaderRole: companyName,
      callToActionText: "Tekintsd meg nyitott pozícióinkat vagy jelentkezz a Talent Poolba!",
    },
  }
}
