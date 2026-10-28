"use server"

import { createClient } from "@/utils/supabase/server"

export interface GenerateJobPostingInput {
  cim: string
  munkakorNev?: string
  reszlegNev?: string
  munkavegzesModja?: string
  foglalkoztatasTipusa?: string
  tapasztalatiSzint?: string
  helyszin?: string
  bersavMin?: number | null
  bersavMax?: number | null
  bersavPublikus?: boolean
  jelentkezesiHatarido?: string | null
  instructions?: string
  cegNev?: string
  cegCim?: string
}

export interface GenerateJobPostingResult {
  success: boolean
  rovid_leiras?: string
  reszletes_leiras?: string
  error?: string
}

/**
 * AI Álláshirdetés Generáló Akció (Google Gemini 2.5 Flash)
 * Az 1. és 2. lépésben megadott pozíciónév, belső munkakör, részleg, munkavégzési mód,
 * tapasztalati szint, helyszín, bérsáv és opcionális kulcsszavak alapján
 * professzionális, piacképes magyar nyelvű hirdetést állít össze.
 */
export async function generateJobPostingWithAiAction(
  input: GenerateJobPostingInput
): Promise<GenerateJobPostingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs érvényes bejelentkezett munkamenet." }
  }

  const cim = input.cim?.trim()
  if (!cim) {
    return { success: false, error: "Kérlek, add meg a hirdetés nyilvános címét a generáláshoz!" }
  }

  const munkakor = input.munkakorNev?.trim() || cim
  const reszleg = input.reszlegNev?.trim() || ""
  const munkavegzesModja = input.munkavegzesModja?.trim() || ""
  const foglalkoztatasTipusa = input.foglalkoztatasTipusa?.trim() || ""
  const tapasztalatiSzint = input.tapasztalatiSzint?.trim() || ""
  const userInstructions = input.instructions?.trim() || ""
  const cegNev = input.cegNev?.trim() || ""
  const cegCim = input.helyszin?.trim() || input.cegCim?.trim() || ""

  const formatForint = (val?: number | null) =>
    typeof val === "number" && val > 0
      ? new Intl.NumberFormat("hu-HU").format(val) + " Ft / hó"
      : null

  const minSalaryStr = formatForint(input.bersavMin)
  const maxSalaryStr = formatForint(input.bersavMax)
  const salaryRangeText =
    input.bersavPublikus && (minSalaryStr || maxSalaryStr)
      ? minSalaryStr && maxSalaryStr
        ? `Bruttó ${minSalaryStr} – ${maxSalaryStr}`
        : minSalaryStr
        ? `Bruttó ${minSalaryStr}-tól`
        : `Bruttó ${maxSalaryStr}-ig`
      : ""

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    // Intelligens sablon fallback, ha nincs beállítva API kulcs
    const companyIntro = cegNev
      ? `A(z) <strong>${cegNev}</strong>${reszleg ? ` (${reszleg})` : ""} csapataként elkötelezettek vagyunk az innovatív és emberközpontú megoldások iránt. Célunk, hogy a legkorszerűbb eszközökkel támogassuk ügyfeleinket és munkatársaink szakmai kiteljesedését.`
      : `Dinamikusan növekvő vállalatunk elkötelezett az innovatív és emberközpontú megoldások iránt. Célunk, hogy a legkorszerűbb eszközökkel támogassuk ügyfeleinket és munkatársaink szakmai kiteljesedését.`

    const paramsItems: string[] = []
    if (tapasztalatiSzint) paramsItems.push(`<li><strong>Tapasztalati szint:</strong> ${tapasztalatiSzint}</li>`)
    if (foglalkoztatasTipusa) paramsItems.push(`<li><strong>Foglalkoztatás jellege:</strong> ${foglalkoztatasTipusa}</li>`)
    if (munkavegzesModja) paramsItems.push(`<li><strong>Munkavégzés módja:</strong> ${munkavegzesModja}</li>`)
    if (salaryRangeText) paramsItems.push(`<li><strong>Publikus bérsáv:</strong> ${salaryRangeText}</li>`)

    const locationSection = cegCim
      ? `\n\n<h3>Munkavégzés helye és keretei</h3>\n<p>${cegCim}${munkavegzesModja ? ` (${munkavegzesModja})` : ""}.</p>${paramsItems.length > 0 ? `\n<ul>\n  ${paramsItems.join("\n  ")}\n</ul>` : ""}`
      : ""

    const customExpectation = userInstructions
      ? `\n  <li>Specifikus elvárások: ${userInstructions}</li>`
      : ""

    return {
      success: true,
      rovid_leiras: `Csatlakozz csapatunkhoz${cegNev ? ` a(z) ${cegNev}-nél` : ""} mint ${cim}${tapasztalatiSzint ? ` (${tapasztalatiSzint})` : ""}! ${munkavegzesModja ? `${munkavegzesModja}, ` : ""}szakmailag igényes feladatok és támogató környezet vár.`,
      reszletes_leiras: `<h3>Rólunk / A vállalatról</h3>
<p>${companyIntro}</p>

<h3>Főbb feladatok és felelősségek</h3>
<ul>
  <li>A(z) <strong>${munkakor}</strong> szakterülethez kapcsolódó feladatok önálló és magas színvonalú ellátása${reszleg ? ` a(z) ${reszleg} területén` : ""}.</li>
  <li>Együttműködés a belső szakmai csapatokkal, fejlesztési és hatékonyságnövelési javaslatok kidolgozása.</li>
  <li>Folyamatok nyomon követése, szakmai sztenderdek betartása és rendszeres státuszriportok készítése.</li>
</ul>

<h3>Elvárások</h3>
<ul>
  <li>Szakirányú végzettség vagy releváns (${tapasztalatiSzint || "szakmai"}) tapasztalat.</li>
  <li>Megbízható, precíz és önálló munkavégzés.</li>
  <li>Kiváló problémamegoldó és kommunikációs készség.</li>${customExpectation}
</ul>

<h3>Amit kínálunk</h3>
<ul>
  <li>${salaryRangeText ? `Transzparens javadalmazási sáv (${salaryRangeText}) és teljesítményalapú megbecsülés.` : "Versenyképes juttatási csomag és szakmai megbecsülés."}</li>
  <li>${munkavegzesModja ? `${munkavegzesModja} és` : "Rugalmas"} kiszámítható munkaidő (${foglalkoztatasTipusa || "teljes munkaidő"}).</li>
  <li>Támogató, összetartó csapat és folyamatos szakmai fejlődési lehetőség.</li>
</ul>${locationSection}`,
    }
  }

  try {
    const { GoogleGenAI } = await import("@google/genai")
    const ai = new GoogleGenAI({ apiKey })

    const prompt = `Te egy élvonalbeli, professzionális magyar HR szakértő és toborzási szövegíró vagy az eaisyHR rendszerben.
Feladatod egy professzionális, rendkívül vonzó, piacképes és modern magyar nyelvű álláshirdetés készítése a megadott strukturált paraméterek alapján.

SZERVEZET ÉS POZÍCIÓ STRUKTURÁLT ADATAI:
- Hirdetés nyilvános megnevezése: "${cim}"
- Belső munkakör / szakterület: "${munkakor}"
${reszleg ? `- Részleg / Csapat: "${reszleg}"` : ""}
${cegNev ? `- Hirdető vállalat / munkáltató neve: "${cegNev}"` : ""}
${tapasztalatiSzint ? `- Elvárt tapasztalati szint (Seniority): "${tapasztalatiSzint}"` : ""}
${foglalkoztatasTipusa ? `- Foglalkoztatás jellege: "${foglalkoztatasTipusa}"` : ""}
${munkavegzesModja ? `- Munkavégzés módja: "${munkavegzesModja}"` : ""}
${cegCim ? `- Munkavégzés helyszíne (iroda / város): "${cegCim}"` : ""}
${salaryRangeText ? `- Publikus bruttó alapbér sáv (EU 2023/970 transzparencia): "${salaryRangeText}"` : ""}
${input.jelentkezesiHatarido ? `- Jelentkezési határidő: "${input.jelentkezesiHatarido}"` : ""}
${userInstructions ? `- Felhasználó specifikus elvárásai / kulcsszavai: "${userInstructions}"` : ""}

KÖVETELMÉNYEK:
Válaszolj KIZÁRÓLAG érvényes JSON formátumban:
{
  "rovid_leiras": "1-2 mondatos, figyelemfelkeltő, frappáns kedvcsináló a kártyás listázáshoz (max. 180 karakter, ne legyen közhelyes${cegNev ? `, említheted a céget: ${cegNev}` : ""}).",
  "reszletes_leiras": "Strukturált, professzionális leírás tiszta HTML formátumban (h3, h4, p, ul, li, strong, blockquote tagekkel)."
}

A "reszletes_leiras" kötelező tartalmi blokkjai:
1. <h3>Rólunk / A vállalatról</h3>: Inspiráló, dinamikus bemutatás${cegNev ? ` (említsd név szerint a(z) ${cegNev} vállalatot${reszleg ? ` és a(z) ${reszleg} csapatot` : ""}, annak innovatív és emberközpontú értékeit)` : ""}, miért nagyszerű nálunk dolgozni.
2. <h3>Főbb feladatok</h3>: 4-6 konkrét, a(z) "${tapasztalatiSzint || "meghirdetett"}" szinthez és "${munkakor}" munkakörhöz illeszkedő, jól megfogalmazott bullet point (<ul><li>).
3. <h3>Szakmai elvárások</h3>: 4-6 pont a szükséges tudásról, tapasztalatról, készségekről (ha a felhasználó adott kulcsszavakat, ezeket kötelezően építsd be).
4. <h3>Előnyt jelent</h3>: 2-3 releváns plusz kompetencia vagy tapasztalat.
5. <h3>Amit kínálunk</h3>: Juttatási csomag${salaryRangeText ? ` (említsd meg a transzparens bruttó bérsávot: ${salaryRangeText})` : ""}, munkavégzési keretek (${munkavegzesModja || "rugalmas munkavégzés"}, ${foglalkoztatasTipusa || "teljes munkaidő"}), modern technológiák, szakmai képzések, összetartó kultúra.
${cegCim ? `6. <h3>Munkavégzés helye</h3>: ${cegCim} (${munkavegzesModja || "modern irodai környezet"}).` : ""}

Formázási szabályok:
- Csak tiszta HTML tageket használj a "reszletes_leiras" mezőben (h3, h4, p, ul, li, strong, em).
- Kerüld az elcsépelt frázisokat (pl. "fiatalos csapat", "versenyképes fizetés"), helyette írj lendületes, emberközeli, modern és hiteles szöveget!
- NE tegyél markdown kódblokkot (pl. \`\`\`json) a válasz köré, csak a nyers JSON szöveget add vissza.`

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    })

    if (!res.text) {
      throw new Error("Az AI nem adott vissza szöveges választ.")
    }

    const cleanJson = res.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
    const parsed = JSON.parse(cleanJson)

    if (!parsed || !parsed.reszletes_leiras) {
      throw new Error("Érvénytelen JSON struktúra érkezett az AI-tól.")
    }

    return {
      success: true,
      rovid_leiras: parsed.rovid_leiras?.trim() || "",
      reszletes_leiras: parsed.reszletes_leiras?.trim() || "",
    }
  } catch (err: unknown) {
    console.error("AI álláshirdetés generálási hiba:", err)
    const msg = err instanceof Error ? err.message : "Váratlan hiba történt az AI generálás során."
    return {
      success: false,
      error: msg,
    }
  }
}
