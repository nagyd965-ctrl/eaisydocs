import { ContractParty, ContractTemplate, ContractType, ContractDraftResult } from "@/types/contract-templates"

export const DEFAULT_MEGBIZO_COMPANY: ContractParty = {
  nev: "eaisyDocs Szolgáltató Zrt.",
  szekhely: "1117 Budapest, Infopark sétány 1.",
  adoszam: "28491029-2-41",
  cegjegyzekszam: "01-10-149201",
  kepviselo: "Nagy Dániel Vezérigazgató",
  bankszamlaszam: "11705008-20491029-00000000 (OTP Bank)",
  email: "szerzodes@eaisydocs.hu",
  telefonszam: "+36 1 450 9000",
}

export const DEFAULT_CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "megbizasi-standard",
    type: "megbizasi",
    name: "Megbízási Szerződés",
    category: "Szolgáltatás & Megbízás",
    description: "Szoftverfejlesztési, tanácsadói, szakértői vagy alvállalkozói szolgáltatások hivatalos szerződése.",
    defaultTitle: "Megbízási Szerződés",
    promptPlaceholder: "pl. Szoftverfejlesztési megbízás heti 20 óra rendelkezésre állással, 15 napos fizetési határidővel és késedelmi kötbérrel...",
    examplePrompts: [
      "Szoftverfejlesztési és karbantartási feladatok ellátása heti 20 óra rendelkezésre állással, sprint alapú átadással, 15 napos átutalási határidővel és késedelmi kötbér kikötésével.",
      "Marketing és közösségi média kampánykezelési megbízás havi tartalomnaptár készítésével, heti teljesítményriportokkal és 30 napos felmondási idővel.",
      "Pénzügyi és adótanácsadói megbízás havi elszámolással, könyvvizsgálati felkészítéssel és havi zárások szakmai támogatásával."
    ],
    defaultClauses: [
      {
        title: "A szerződés tárgya",
        content: "Megbízott elvállalja, Megbízó pedig megbízza a Megbízottat a jelen szerződésben meghatározott szakmai feladatok és szolgáltatások szakszerű és határidőben történő ellátásával."
      },
      {
        title: "Megbízási díj és fizetési feltételek",
        content: "Felek megállapodnak, hogy Megbízottat a feladatok szerződésszerű ellátásáért megbízási díj illeti meg, amely a felek által kiállított teljesítésigazolás alapján, átutalással kerül kiegyenlítésre."
      },
      {
        title: "Felek jogai és kötelezettségei",
        content: "Megbízott köteles a rábízott ügyben a Megbízó érdekeinek és utasításainak elsődlegessége mellett, a szakmai szabályok legmagasabb szintű betartásával eljárni."
      },
      {
        title: "Titoktartás és szellemi tulajdon",
        content: "Felek megállapodnak, hogy a jogviszony fennállása alatt és annak megszűnését követően is szigorúan bizalmasan kezelnek minden tudomásukra jutott üzleti és technológiai titkot."
      },
      {
        title: "Hatály és felmondás",
        content: "Jelen szerződés a Felek kölcsönös aláírásának napján lép hatályba. Bármelyik Fél jogosult a szerződést 30 napos felmondási idővel írásban felmondani."
      },
      {
        title: "Záró rendelkezések",
        content: "A jelen szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv (2013. évi V. törvény) megbízási szerződésekre vonatkozó rendelkezései az irányadók."
      }
    ]
  },
  {
    id: "nda-standard",
    type: "nda",
    name: "Titoktartási Megállapodás (NDA)",
    category: "Jogi & Védelem",
    description: "Kétoldalú vagy egyoldalú üzleti, pénzügyi és technológiai titoktartási nyilatkozat kötbérrel.",
    defaultTitle: "Titoktartási Megállapodás (NDA)",
    promptPlaceholder: "pl. Kétoldalú titoktartási megállapodás közös projekt előkészítéséhez, forráskódok és pénzügyi adatok védelmére...",
    examplePrompts: [
      "Kétoldalú titoktartási megállapodás közös szoftveres projekt előkészítéséhez és üzleti tárgyalásokhoz, forráskódok, ügyféladatok és pénzügyi tervek szigorú védelmére.",
      "Egyoldalú titoktartási nyilatkozat alvállalkozó felé az átadott rendszerek, belső dokumentációk és ügyféladatok védelmére, azonnali felmondási joggal titoksértés esetén."
    ],
    defaultClauses: [
      {
        title: "A megállapodás célja és a bizalmas információk köre",
        content: "Jelen megállapodás célja a Felek közötti üzleti tárgyalások és együttműködés során átadott valamennyi pénzügyi, műszaki, fejlesztési és ügyféladat védelme."
      },
      {
        title: "Titoktartási kötelezettség",
        content: "A fogadó Fél vállalja, hogy a bizalmas információkat a legnagyobb gondossággal őrzi meg, azokat harmadik személy részére kizárólag a másik Fél előzetes írásbeli hozzájárulásával adja át."
      },
      {
        title: "Kötbér és kártérítés",
        content: "A titoktartási kötelezettség bármely megszegése esetén a vétkes Fél köteles a sérelmet szenvedett Fél részére azonnali kötbért megfizetni, a kötbért meghaladó kár érvényesítése mellett."
      },
      {
        title: "Időbeli hatály",
        content: "A titoktartási kötelezettség a megállapodás aláírásától számított 3 (három) évig marad érvényben, függetlenül az alapul fekvő üzleti tárgyalások kimenetelétől."
      },
      {
        title: "Irányadó jog és joghatóság",
        content: "Jelen megállapodásra a magyar jog az irányadó. A Felek vitás kérdéseiket békés úton kísérlik meg rendezni, ennek sikertelensége esetén a Megbízó székhelye szerinti bíróság illetékes."
      }
    ]
  },
  {
    id: "keretszerzodes-standard",
    type: "keretszerzodes",
    name: "Szolgáltatási Keretszerződés",
    category: "Keretmegállapodás",
    description: "Hosszú távú együttműködési feltételek, ahol a konkrét feladatok egyedi megrendelőkkel kerülnek lehívásra.",
    defaultTitle: "Szolgáltatási Keretszerződés",
    promptPlaceholder: "pl. IT üzemeltetési és tanácsadási keretszerződés, egyedi lehívásos megrendelőkkel, 4 órás SLA reakcióidővel...",
    examplePrompts: [
      "Informatikai üzemeltetési és fejlesztési keretszerződés eseti megrendelések alapján, 4 órás SLA reakcióidővel, 15 napos átutalási határidővel.",
      "Kereskedelmi és disztribúciós keretmegállapodás termékértékesítésre, egyedi megrendelőlapok alapján, negyedéves forgalmi bónuszrendszerrel."
    ],
    defaultClauses: [
      {
        title: "A keretszerződés célja és felépítése",
        content: "Jelen keretszerződés határozza meg a Felek közötti hosszú távú együttműködés általános feltételeit. A konkrét feladatok az e keretszerződés alapján kibocsátott egyedi Megrendelőkkel jönnek létre."
      },
      {
        title: "Megrendelések menete és elfogadása",
        content: "Megrendelő írásban küldi meg az eseti megrendelést, amelyet a Szolgáltató 2 munkanapon belül írásban visszaigazol vagy indoklással elutasít."
      },
      {
        title: "Díjazás, számlázás és fizetési feltételek",
        content: "A díjak az egyedi megrendelőkben kerülnek meghatározásra. A számlázás havi elszámolás vagy részteljesítés alapján, átutalással történik 15 napos fizetési határidővel."
      },
      {
        title: "Szavatosság és felelősségkorlátozás",
        content: "Szolgáltató szavatol azért, hogy az elvégzett szolgáltatás megfelel a szakmai elvárásoknak és a hatályos jogszabályoknak."
      },
      {
        title: "Hatály és felmondási szabályok",
        content: "A keretszerződés határozatlan időre jön létre. Bármelyik Fél jogosult 60 napos határidővel indoklás nélkül írásban felmondani, a már folyamatban lévő egyedi megrendelések lezárása mellett."
      }
    ]
  },
  {
    id: "teljesites-igazolas-standard",
    type: "teljesites_igazolas",
    name: "Teljesítésigazolási Jegyzőkönyv",
    category: "Pénzügyi & Igazolás",
    description: "Hivatalos átadás-átvételi és teljesítésigazolási jegyzőkönyv számla kiállításához és kifizetéshez.",
    defaultTitle: "Teljesítésigazolási Jegyzőkönyv",
    promptPlaceholder: "pl. Szoftverfejlesztési mérföldkő átadása, hivatkozással a megbízási szerződésre...",
    examplePrompts: [
      "Teljesítésigazolási jegyzőkönyv a havi szoftverfejlesztési sprint és kapcsolódó dokumentációk hiánytalan átadásáról és elfogadásáról.",
      "Vezetői és pénzügyi tanácsadás teljesítésigazolása a lezárt negyedéves audit feladatokról, elfogadott munkaidő-nyilvántartás alapján."
    ],
    defaultClauses: [
      {
        title: "A teljesítés tárgya és hivatkozás",
        content: "Megrendelő és Szolgáltató igazolják, hogy a hivatkozott szerződés alapján vállalt szolgáltatások és feladatok maradéktalanul, a szakmai specifikációnak megfelelően elvégzésre kerültek."
      },
      {
        title: "Átvétel és minőségi megfelelőség",
        content: "Megrendelő kijelenti, hogy a szolgáltatást átvizsgálta, az eredménytermékeket átvette, minőségi kifogással nem él, a teljesítést hibátlannak és elfogadottnak tekinti."
      },
      {
        title: "Számlázási engedély",
        content: "Jelen jegyzőkönyv aláírásával a Megrendelő kifejezetten hozzájárul a megbízási díjról szóló végszámla kiállításához és az összeg átutalásához."
      }
    ]
  },
  {
    id: "egyedi-standard",
    type: "egyedi",
    name: "Egyedi Üzleti Megállapodás",
    category: "Egyedi & Általános",
    description: "Tetszőleges üzleti konstrukció, megállapodás vagy nyilatkozat szabadszöveges AI instrukciók alapján.",
    defaultTitle: "Együttműködési Megállapodás",
    promptPlaceholder: "pl. Partneri megállapodás közös ügyfélakvizícióra és jutalékmegosztásra, kizárólagossággal...",
    examplePrompts: [
      "Partneri együttműködési megállapodás közös értékesítésre: jutalékos elszámolás minden sikeresen leszerződött új partner után, negyedéves elszámolási ciklussal.",
      "Kétoldalú megállapodás irodahasználatról és infrastruktúra megosztásáról, közös költségviseléssel és 30 napos felmondási idővel."
    ],
    defaultClauses: [
      {
        title: "A megállapodás preambuluma és célja",
        content: "Felek kinyilvánítják azon szándékukat, hogy gazdasági és szakmai tevékenységük összehangolásával közös üzleti sikerek elérésére törekednek."
      },
      {
        title: "A felek vállalásai",
        content: "Felek részletesen rögzik a jelen megállapodás keretében vállalt feladataikat, a felelősségmegosztást és a tervezett ütemtervet."
      },
      {
        title: "Pénzügyi elszámolás és megosztás",
        content: "A közös tevékenységből származó bevételek és költségek megosztása a jelen megállapodásban rögzített arányok és határidők szerint történik."
      },
      {
        title: "Záró rendelkezések",
        content: "Jelen megállapodás mindkét fél jóváhagyásával és aláírásával válik hatályossá."
      }
    ]
  }
]

/**
 * Segédfüggvény: természetes nyelvű prompt szövegéből kinyeri a megadott forint / deviza összeget
 * (pl. "1.000.000 Ft", "500.000 Ft", "650 000 Ft", "2 millió Ft", "50000 Ft").
 */
export function extractAmountFromPrompt(prompt?: string): number | undefined {
  if (!prompt) return undefined
  // 1. "X millió" keresése (pl. "1 millió Ft", "1.5 millió", "2 millió")
  const millionMatch = prompt.match(/(\d+(?:[.,]\d+)?)\s*(?:millió|milli[oó])\s*(?:ft|huf|forint)?/i)
  if (millionMatch) {
    const val = parseFloat(millionMatch[1].replace(",", "."))
    if (!isNaN(val)) return Math.round(val * 1000000)
  }
  // 2. Pontozott/szóközzel tagolt számok: pl. 1.000.000 vagy 650.000 vagy 50 000
  const numMatch = prompt.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{4,9})\s*(?:,-\s*)?(?:ft|huf|forint)/i)
  if (numMatch) {
    const cleanNum = numMatch[1].replace(/[.\s]/g, "")
    const val = parseInt(cleanNum, 10)
    if (!isNaN(val) && val > 0) return val
  }
  return undefined
}

/**
 * Heurisztikus, determinisztikus szerződésszöveg előállító fallback funkció
 * (Ha a Google GenAI LLM nem elérhető, vagy nincs internet/API kulcs).
 */
export function generateFallbackContractText(params: {
  title: string
  contractType: ContractType
  template: ContractTemplate
  megbizo: ContractParty
  megbizott: ContractParty
  prompt: string
  effectiveDate?: string
  feeAmount?: number
  currency?: string
  validityMonths?: number
}): ContractDraftResult {
  const dateStr = params.effectiveDate || new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
  const effectiveAmount = params.feeAmount ?? extractAmountFromPrompt(params.prompt)
  const sections: { number: number; title: string; paragraphs: string[] }[] = []

  let sectionIdx = 1

  // Fejezet 1: Felek és Preambulum
  sections.push({
    number: sectionIdx++,
    title: "A SZERZŐDŐ FELEK",
    paragraphs: [
      `amely létrejött egyrészről a(z) ${params.megbizo.nev} (székhely: ${params.megbizo.szekhely}, cégjegyzékszám: ${params.megbizo.cegjegyzekszam || "–"}, adószám: ${params.megbizo.adoszam || params.megbizo.kulfoldi_adoszam || "–"}, képviseli: ${params.megbizo.kepviselo || "ügyvezető"}), mint Megbízó (a továbbiakban: "Megbízó"),`,
      `másrészről a(z) ${params.megbizott.nev} (székhely: ${params.megbizott.szekhely || "székhelye megegyezik a nyilvántartottal"}, cégjegyzékszám: ${params.megbizott.cegjegyzekszam || "–"}, adószám: ${params.megbizott.adoszam || params.megbizott.kulfoldi_adoszam || "–"}, képviseli: ${params.megbizott.kepviselo || "törvényes képviselője"}), mint Megbízott (a továbbiakban: "Megbízott")`,
      `között, együttesen mint "Felek" az alulírott napon és helyen, az alábbi feltételek szerint:`
    ]
  })

  // Fejezet 2: A szerződés tárgya és egyedi feltételei (a promptból integrálva)
  const promptSummary = params.prompt.trim() || "A Felek kölcsönös megállapodása szerinti szakmai szolgáltatások nyújtása."

  if (params.contractType === "nda") {
    sections.push({
      number: sectionIdx++,
      title: "A MEGÁLLAPODÁS TÁRGYA ÉS A BIZALMAS INFORMÁCIÓK",
      paragraphs: [
        `1.1. Jelen megállapodás célja a Felek közötti üzleti tárgyalások és együttműködés során megosztott bizalmas adatok védelme:`,
        `"${promptSummary}"`,
        `1.2. Bizalmas információnak minősül valamennyi műszaki, pénzügyi, forráskód- és üzleti adat, amelyet a Felek írásban vagy szóban egymás rendelkezésére bocsátanak.`
      ]
    })

    sections.push({
      number: sectionIdx++,
      title: "TITOKTARTÁSI KÖTELEZETTSÉG",
      paragraphs: [
        `2.1. A Felek kötelezettséget vállalnak arra, hogy a tudomásukra jutott bizalmas információkat a legnagyobb gondossággal őrzik meg, azokat illetéktelen harmadik személy részére nem teszik hozzáférhetővé.`,
        `2.2. A Felek a bizalmas információkat kizárólag a jelen megállapodásban rögzített együttműködés céljára jogosultak felhasználni.`
      ]
    })

    const kotberText = effectiveAmount
      ? `${effectiveAmount.toLocaleString("hu-HU")} ${params.currency || "HUF"}`
      : "1.000.000 HUF"
    sections.push({
      number: sectionIdx++,
      title: "SZERZŐDÉSES KÖTBÉR ÉS FELELŐSSÉG",
      paragraphs: [
        `3.1. Felek kifejezetten megállapodnak, hogy a titoktartási kötelezettség bármely megsértése vagy bizalmas információ jogosulatlan átadása esetén a jogsértő Fél azonnali, ${kotberText} összegű szerződéses kötbért köteles megfizetni a sérelmet szenvedett Fél részére.`,
        `3.2. A kötbér megfizetése nem zárja ki a kötbért meghaladó kár érvényesítését a Polgári Törvénykönyv szabályai szerint.`
      ]
    })

    const ndaValidity = params.validityMonths ? `${params.validityMonths} hónapos` : "36 hónapos"
    sections.push({
      number: sectionIdx++,
      title: "HATÁLY ÉS ZÁRÓ RENDELKEZÉSEK",
      paragraphs: [
        `4.1. Jelen megállapodás a Felek általi aláírás napján, ${dateStr} napján lép hatályba, és határozott, ${ndaValidity} időtartamra érvényes.`,
        `4.2. A jelen megállapodásban nem szabályozott kérdésekben a Polgári Törvénykönyv (2013. évi V. törvény) hatályos rendelkezései az irányadók.`
      ]
    })
  } else if (params.contractType === "teljesites_igazolas") {
    sections.push({
      number: sectionIdx++,
      title: "AZ ÁTADOTT TELJESÍTÉS TÁRGYA",
      paragraphs: [
        `1.1. Felek igazolják, hogy az alábbi feladatok maradéktalanul és hibátlan minőségben elvégzésre és átadásra kerültek:`,
        `"${promptSummary}"`,
        `1.2. Megrendelő a munkát átvizsgálta, minőségi vagy formai kifogást nem emel, a teljesítést elfogadottnak nyilvánítja.`
      ]
    })

    const certText = effectiveAmount
      ? `nettó ${effectiveAmount.toLocaleString("hu-HU")} ${params.currency || "HUF"}`
      : "a szerződésben rögzített összeg"
    sections.push({
      number: sectionIdx++,
      title: "PÉNZÜGYI JÓVÁHAGYÁS ÉS SZÁMLÁZÁS",
      paragraphs: [
        `2.1. Megrendelő hozzájárul a fenti teljesítés ellenértékeként kiállítandó, ${certText} összegű végszámla kibocsátásához.`,
        `2.2. A számla kiegyenlítése átutalással történik 15 (tizenöt) naptári napos fizetési határidővel.`
      ]
    })

    sections.push({
      number: sectionIdx++,
      title: "ZÁRÓ RENDELKEZÉSEK",
      paragraphs: [
        `3.1. Jelen jegyzőkönyv ${dateStr} napján kelt, és a Felek kölcsönös aláírásával válik teljessé.`
      ]
    })
  } else {
    // megbizasi, keretszerzodes, egyedi
    sections.push({
      number: sectionIdx++,
      title: "A SZERZŐDÉS TÁRGYA ÉS RENDELKEZÉSEI",
      paragraphs: [
        `1.1. Megbízó ezennel megbízza a Megbízottat, Megbízott pedig elvállalja az alábbi szakmai feladatok szakszerű és határidőben történő ellátását:`,
        `"${promptSummary}"`,
        `1.2. Megbízott kijelenti és szavatolja, hogy a feladatok ellátásához szükséges szakmai kapacitással és jogosultságokkal rendelkezik.`
      ]
    })

    const feeText = effectiveAmount
      ? `, melynek összege nettó ${effectiveAmount.toLocaleString("hu-HU")} ${params.currency || "HUF"}`
      : ""
    sections.push({
      number: sectionIdx++,
      title: "DÍJAZÁS ÉS FIZETÉSI FELTÉTELEK",
      paragraphs: [
        `2.1. Felek rögzítik, hogy a Megbízottat a szerződésszerű teljesítésért megbízási díj illeti meg${feeText}.`,
        `2.2. A megbízási díj kifizetése a Megbízott által kibocsátott számla ellenében, a Megbízó bankszámlájáról indított átutalással történik 15 naptári napos fizetési határidővel.`,
        `2.3. A számla kiállításának előfeltétele a Megbízó által aláírt hivatalos teljesítésigazolás megléte.`
      ]
    })

    sections.push({
      number: sectionIdx++,
      title: "TITOKTARTÁS ÉS SZELLEMI TULAJDON",
      paragraphs: [
        `3.1. Felek rögzítik, hogy a jogviszony során tudomásukra jutott információk üzleti titoknak minősülnek, és azokat bizalmasan kezelik.`,
        `3.2. A jelen szerződés keretében létrehozott eredménytermékek szerzői vagyoni jogai a díj megfizetésével a Megbízóra szállnak át.`
      ]
    })

    const validityText = params.validityMonths
      ? `, és határozott, ${params.validityMonths} hónapos időtartamra szól`
      : ", és határozatlan időtartamra szól"
    sections.push({
      number: sectionIdx++,
      title: "HATÁLY ÉS ZÁRÓ RENDELKEZÉSEK",
      paragraphs: [
        `4.1. Jelen szerződés a Felek kölcsönös aláírásának napján, ${dateStr} napján lép hatályba${validityText}.`,
        `4.2. A jelen szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv (2013. évi V. törvény) hatályos rendelkezései az irányadók.`
      ]
    })
  }

  // Teljes folyó szöveg felépítése
  const fullTextParts: string[] = []
  fullTextParts.push(`\n${params.title.toUpperCase()}\n`)
  for (const s of sections) {
    fullTextParts.push(`\n${s.number}. ${s.title}\n`)
    for (const p of s.paragraphs) {
      fullTextParts.push(p + "\n")
    }
  }

  return {
    title: params.title,
    contractType: params.contractType,
    megbizo: params.megbizo,
    megbizott: params.megbizott,
    sections,
    fullText: fullTextParts.join("\n"),
    estimatedPages: Math.max(1, Math.ceil(fullTextParts.join("\n").length / 1800)),
    generatedAt: new Date().toISOString()
  }
}
