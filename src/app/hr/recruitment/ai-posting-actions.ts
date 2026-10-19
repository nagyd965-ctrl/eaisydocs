"use server"

import { createClient } from "@/utils/supabase/server"

export interface GenerateJobPostingInput {
  cim: string
  munkakorNev?: string
  instructions?: string
}

export interface GenerateJobPostingResult {
  success: boolean
  rovid_leiras?: string
  reszletes_leiras?: string
  error?: string
}

/**
 * AI Álláshirdetés Generáló Akció (Google Gemini 2.5 Flash)
 * A megadott pozíciónév, belső munkakör és opcionális kulcsszavak alapján
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
  const userInstructions = input.instructions?.trim() || ""

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    // Intelligens sablon fallback, ha nincs beállítva API kulcs
    return {
      success: true,
      rovid_leiras: `Csatlakozz csapatunkhoz mint ${cim}! Keresünk egy motivált, önálló és szakmailag igényes kollégát modern munkakörnyezetbe.`,
      reszletes_leiras: `<h3>Rólunk</h3>
<p>Dinamikusan növekvő vállalatunk elkötelezett az innovatív és emberközpontú megoldások iránt. Célunk, hogy a legkorszerűbb eszközökkel támogassuk ügyfeleinket és munkatársaink szakmai kiteljesedését.</p>

<h3>Főbb feladatok és felelősségek</h3>
<ul>
  <li>A(z) <strong>${munkakor}</strong> szakterülethez kapcsolódó feladatok önálló és magas színvonalú ellátása.</li>
  <li>Együttműködés a belső csapatokkal, fejlesztési javaslatok kidolgozása.</li>
  <li>Folyamatok nyomon követése és rendszeres státuszriportok készítése.</li>
</ul>

<h3>Elvárások</h3>
<ul>
  <li>Szakirányú végzettség vagy releváns szakmai tapasztalat.</li>
  <li>Megbízható, precíz és önálló munkavégzés.</li>
  <li>Kiváló problémamegoldó és kommunikációs készség.</li>
</ul>

<h3>Amit kínálunk</h3>
<ul>
  <li>Versenyképes juttatási csomag és fix juttatások.</li>
  <li>Rugalmas munkaidő és hibrid munkavégzési lehetőség.</li>
  <li>Támogató, összetartó csapat és szakmai fejlődési lehetőség.</li>
</ul>`,
    }
  }

  try {
    const { GoogleGenAI } = await import("@google/genai")
    const ai = new GoogleGenAI({ apiKey })

    const prompt = `Te egy élvonalbeli, professzionális magyar HR szakértő és toborzási szövegíró vagy az eaisyHR rendszerben.
Feladatod egy professzionális, rendkívül vonzó, piacképes és modern magyar nyelvű álláshirdetés készítése.

POZÍCIÓ ADATAI:
- Hirdetés nyilvános megnevezése: "${cim}"
- Belső munkakör / szakterület: "${munkakor}"
${userInstructions ? `- Felhasználó specifikus elvárásai / kulcsszavai: "${userInstructions}"` : ""}

KÖVETELMÉNYEK:
Válaszolj KIZÁRÓLAG érvényes JSON formátumban:
{
  "rovid_leiras": "1-2 mondatos, figyelemfelkeltő, frappáns kedvcsináló a kártyás listázáshoz (max. 180 karakter, ne legyen közhelyes).",
  "reszletes_leiras": "Strukturált, professzionális leírás tiszta HTML formátumban (h3, h4, p, ul, li, strong, blockquote tagekkel)."
}

A "reszletes_leiras" kötelező tartalmi blokkjai:
1. <h3>Rólunk / A csapatról</h3>: Inspiráló, dinamikus bemutatás, miért jó nálunk dolgozni.
2. <h3>Főbb feladatok</h3>: 4-6 konkrét, jól megfogalmazott bullet point (<ul><li>).
3. <h3>Szakmai elvárások</h3>: 4-6 pont a szükséges tudásról, tapasztalatról, készségekről (ha a felhasználó adott kulcsszavakat, ezeket kötelezően építsd be).
4. <h3>Előnyt jelent</h3>: 2-3 releváns plusz kompetencia vagy tapasztalat.
5. <h3>Amit kínálunk</h3>: Juttatási csomag, rugalmasság / home office lehetőség, modern technológiák, szakmai képzések, összetartó kultúra.

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
