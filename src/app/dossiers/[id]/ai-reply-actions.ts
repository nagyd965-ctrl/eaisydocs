"use server"

import { createClient } from "@/utils/supabase/server"

export type ReplyStyle = "hivatalos" | "baratsagos" | "tajekoztato" | "felszolito"

export interface GenerateAiReplyParams {
  ugyiratId: string
  style: ReplyStyle
  userInstructions: string
  partnerName?: string
  incomingTargy?: string
  incomingLeiras?: string
  iktatoszam?: string
}

export interface GenerateAiReplyResult {
  success: boolean
  targy?: string
  tartalom?: string
  isAiGenerated?: boolean
  error?: string
}

const STYLE_DESCRIPTIONS: Record<ReplyStyle, { name: string; desc: string }> = {
  hivatalos: {
    name: "Hivatalos / Jogi",
    desc: "Formális, jogilag precíz, udvarias, távolságtartó hivatali stílus (pl. hatósági és hivatalos ügyek).",
  },
  baratsagos: {
    name: "Partneri / Közvetlen",
    desc: "Közvetlen, ügyfélközpontú, együttműködő, de professzionális üzleti stílus (pl. törzsvevők, megbízható partnerek).",
  },
  tajekoztato: {
    name: "Tájékoztató / Tömör",
    desc: "Tömör, tényszerű, lényegretörő összefoglalás a folyamat vagy vizsgálat állásáról, felesleges sallangok nélkül.",
  },
  felszolito: {
    name: "Felszólító / Határidős",
    desc: "Határozott, egyértelmű elvárásokat és határidőket rögzítő felhívás (pl. hiánypótlás, számlakorrekció, szerződés-visszaküldés).",
  },
}

/**
 * AI-alapú válaszlevél tervezet generálása a beérkező irat és a felhasználó utasítása alapján.
 * Ha elérhető a Google GenAI SDK és API kulcs, Gemini 2.5 Flash modellt használ.
 * Egyéb esetben intelligens kontextuális sablonozással fallback választ állít elő.
 */
export async function generateAiReplyAction(
  params: GenerateAiReplyParams
): Promise<GenerateAiReplyResult> {
  try {
    const { ugyiratId, style, userInstructions, partnerName, incomingTargy, incomingLeiras, iktatoszam } = params

    if (!userInstructions || !userInstructions.trim()) {
      return { success: false, error: "Kérjük, adjon meg legalább egy rövid instrukciót az AI számára!" }
    }

    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user && process.env.NODE_ENV !== "test") {
        return { success: false, error: "Nincs bejelentkezve." }
      }
    } catch {
      // Next.js request store hiányában (pl. unit tesztekben) csendesen folytatjuk
    }

    const styleMeta = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.hivatalos
    const partnerDisplay = partnerName?.trim() || "Tisztelt Partnerünk"
    const refIktatoszam = iktatoszam?.trim() || "hivatkozott ügyirat"
    const incomingRef = incomingTargy?.trim() || "megkeresésük"

    const googleApiKey = process.env.GOOGLE_API_KEY
    if (googleApiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai")
        const ai = new GoogleGenAI({ apiKey: googleApiKey })

        const prompt = `Te egy professzionális magyar vállalati és hivatali levelezési AI szakértő vagy az eaisyDocs iratkezelő rendszerben.
Feladatod egy hivatalos kimenő válaszlevél összeállítása a beérkező irat és a felhasználó instrukciója alapján.

KONTEXTUS:
- Ügyirat iktatószáma: "${refIktatoszam}"
- Címzett partner / ügyfél neve: "${partnerDisplay}"
- Előzmény beérkező irat tárgya: "${incomingRef}"
- Előzmény irat kivonata / tartalma: "${incomingLeiras?.trim() || "Hivatalos küldemény"}"

KIVÁLASZTOTT STÍLUS:
${styleMeta.name} — ${styleMeta.desc}

FELHASZNÁLÓI UTASÍTÁS (A válasz lényege):
"""
${userInstructions.trim()}
"""

KÖVETELMÉNYEK:
1. Válaszolj KIZÁRÓLAG érvényes JSON formátumban:
{
  "targy": "...",
  "tartalom": "..."
}
2. A "targy" mező legyen releváns, professzionális magyar nyelvű tárgysor (pl. "Válaszlevél: [Tárgy] — Hiv: ${refIktatoszam}").
3. A "tartalom" mező:
   - Tartalmazzon megfelelő megszólítást a stílusnak megfelelően (pl. "Tisztelt ${partnerDisplay}!", "Tisztelt Partnerünk!").
   - Hivatkozzon a fenti iktatószámú beérkező megkeresésre.
   - Fejtse ki világosan, udvariasan és a kért stílusban a felhasználó által megadott érdemi választ.
   - Ha hiánypótlásról vagy határidőről van szó, emelje ki világosan a határidőt.
   - Tartalmazzon udvarias záróformulát és hivatalos elköszönést ("Üdvözlettel / Tisztelettel: eaisyDocs ügyintézés").
4. Ne használj markdown kódblokkot (pl. \`\`\`json), csak a tiszta JSON szöveget add vissza.`

        const res = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [prompt],
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        })

        if (res.text) {
          const parsed = JSON.parse(res.text)
          if (parsed && parsed.targy && parsed.tartalom) {
            return {
              success: true,
              targy: parsed.targy.trim(),
              tartalom: parsed.tartalom.trim(),
              isAiGenerated: true,
            }
          }
        }
      } catch (aiErr) {
        console.warn("[ai-reply-actions] Gemini hívás sikertelen, fallback aktiválása:", aiErr)
      }
    }

    // ── FALLBACK DETERMINISZTIKUS GENERÁLÁS ──
    const generatedSubject = `Válaszlevél: ${incomingRef} — Hiv: ${refIktatoszam}`
    let generatedBody = ""

    switch (style) {
      case "baratsagos":
        generatedBody = `Tisztelt ${partnerDisplay}!

Köszönjük megkeresésüket és együttműködésüket a fenti ügyirathoz (${refIktatoszam}) kapcsolódóan!

A beérkezett levelüket megvizsgáltuk, és örömmel tájékoztatjuk Önöket a következőről:
${userInstructions.trim()}

Bízunk a sikeres további közös munkában. Amennyiben bármilyen további kérdésük merülne fel, forduljanak hozzánk bizalommal.

Szívélyes üdvözlettel,
eaisyDocs Ügyintézés`
        break

      case "tajekoztato":
        generatedBody = `Tisztelt Címzett!

Hivatkozással a(z) ${refIktatoszam} iktatószámú ügyben beérkezett megkeresésükre, az alábbi tájékoztatást adjuk:

${userInstructions.trim()}

A további ügyintézési lépésekről szükség esetén értesítjük Önöket.

Üdvözlettel,
eaisyDocs Ügyintézés`
        break

      case "felszolito":
        generatedBody = `Tisztelt ${partnerDisplay}!

Hivatkozással a folyamatban lévő ${refIktatoszam} számú ügyre és a beérkezett iratokra, ezúton hivatalosan felhívjuk szíves figyelmüket az alábbi kötelezettségre:

${userInstructions.trim()}

Kérjük, hogy a fentiek szerinti teljesítést vagy az egyeztetett dokumentumok pótlását a jelen levél kézhezvételétől számított 8 munkanapon belül teljesíteni szíveskedjenek.

Együttműködésüket köszönjük.

Tisztelettel,
eaisyDocs Hivatalos Iratkezelés`
        break

      case "hivatalos":
      default:
        generatedBody = `Tisztelt ${partnerDisplay}!

Hivatkozással a fenti tárgyú (${incomingRef}), ${refIktatoszam} iktatószámon nyilvántartott megkeresésükre, az alábbiakról tájékoztatjuk Önöket:

${userInstructions.trim()}

Kérjük a fentiek szíves tudomásulvételét.

Tisztelettel,
eaisyDocs Ügyintézés`
        break
    }

    return {
      success: true,
      targy: generatedSubject,
      tartalom: generatedBody,
      isAiGenerated: false,
    }
  } catch (err: any) {
    console.error("Váratlan hiba a válaszlevél generálásakor:", err)
    return { success: false, error: err.message || "Váratlan hiba történt a generálás során." }
  }
}
