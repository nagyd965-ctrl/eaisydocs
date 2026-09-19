import { SupabaseClient } from "@supabase/supabase-js"

export interface AntecedentMatchResult {
  ugyirat_id: string | null
  iktatoszam: string | null
  ugyszam: string | null
  targy: string | null
  statusz: string | null
  szervezeti_egyseg_nev: string | null
  confidence_score: number // 0 - 100
  recommendation_type: "alszam_csatolas" | "megfontolando_csatolas" | "uj_ugy_nyitasa"
  indoklas: string
  reszletek: string[]
  irat_count: number
}

const HUNGARIAN_STOPWORDS = new Set([
  "a", "az", "egy", "és", "vagy", "hogy", "nem", "de", "is", "ha", "mint", "sem",
  "kft", "zrt", "bt", "nyrt", "ev", "kft.", "zrt.", "bt.", "nyrt.", "e.v.",
  "ügyében", "tárgyú", "számú", "száma", "kapcsolatos", "miatt", "felé", "által",
  "alatt", "alapján", "szerint", "vonatkozó", "iránt", "kelt", "sz", "sz.", "nr"
])

function stemHungarian(word: string): string {
  let w = normalize(word)
  // Remove common Hungarian inflectional suffixes if word is long enough
  const suffixes = [
    "val", "vel", "ban", "ben", "nak", "nek", "hoz", "hez", "höz",
    "rol", "rol", "tol", "tol", "bol", "bol", "nal", "nel",
    "val", "vel", "on", "en", "on", "re", "ra", "ba", "be",
    "uk", "uk", "unk", "tok", "tek", "tok", "om", "em", "om",
    "od", "ed", "od", "ja", "je", "uk", "ik", "ak", "ek",
    "asi", "esi", "as", "es", "os", "i"
  ]
  for (const s of suffixes) {
    if (w.length > s.length + 3 && w.endsWith(s)) {
      w = w.slice(0, -s.length)
      break
    }
  }
  return w
}

function tokenize(text: string): Set<string> {
  if (!text) return new Set()
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 1 && !HUNGARIAN_STOPWORDS.has(w))
  )
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export interface CandidateDossier {
  id: string
  iktatoszam: string
  statusz: string
  szervezeti_egyseg?: { id?: string; nev?: string } | null
  ugy?: { id?: string; ugyszam?: string; targy?: string; statusz?: string } | null
  irat?: Array<{
    id: string
    targy?: string | null
    alszam?: number | null
    kuldo_partner_id?: string | null
    partner?: { id?: string; nev?: string } | null
  }> | null
}

export interface TargetIratInput {
  id?: string
  targy: string
  leiras?: string | null
  kuldo_partner_id?: string | null
  partner_nev?: string | null
  erkeztetoszam?: string | null
  kulso_hivatkozas_id?: string | null
}

/**
 * Pure deterministic matching calculation between a target document and candidate dossiers.
 */
export function calculateAntecedentMatch(
  target: TargetIratInput,
  candidates: CandidateDossier[]
): AntecedentMatchResult {
  if (!candidates || candidates.length === 0) {
    return {
      ugyirat_id: null,
      iktatoszam: null,
      ugyszam: null,
      targy: null,
      statusz: null,
      szervezeti_egyseg_nev: null,
      confidence_score: 0,
      recommendation_type: "uj_ugy_nyitasa",
      indoklas: "Nem található egyetlen meglévő ügyirat sem a rendszerben. Új ügy nyitása javasolt.",
      reszletek: ["Nincsenek korábbi nyitott vagy lezárt ügyiratok."],
      irat_count: 0
    }
  }

  const targetTokens = tokenize(target.targy + " " + (target.leiras || ""))
  const targetNormTargy = normalize(target.targy || "")
  const targetNormPartner = target.partner_nev ? normalize(target.partner_nev) : ""
  const targetFullText = (target.targy + " " + (target.leiras || "") + " " + (target.kulso_hivatkozas_id || "")).toLowerCase()

  let bestMatch: CandidateDossier | null = null
  let highestScore = 0
  let bestDetails: string[] = []

  for (const dossier of candidates) {
    let score = 0
    const details: string[] = []

    const dossierIktatoszam = (dossier.iktatoszam || "").trim()
    const dossierUgyszam = dossier.ugy?.ugyszam || ""
    const dossierTargy = dossier.ugy?.targy || ""
    const dossierIratok = dossier.irat || []

    // 1. DIRECT REFERENCE MATCH (max 40 pts)
    if (dossierIktatoszam && targetFullText.includes(dossierIktatoszam.toLowerCase())) {
      score += 40
      details.push(`Közvetlen iktatószám hivatkozás található a szövegben: "${dossierIktatoszam}" (+40%)`)
    } else if (dossierUgyszam && targetFullText.includes(dossierUgyszam.toLowerCase())) {
      score += 35
      details.push(`Közvetlen ügyszám hivatkozás található a szövegben: "${dossierUgyszam}" (+35%)`)
    }

    // 2. PARTNER MATCH (max 45 pts)
    let partnerMatched = false
    let dossierPartnerCount = 0

    for (const dIrat of dossierIratok) {
      if (target.kuldo_partner_id && dIrat.kuldo_partner_id && target.kuldo_partner_id === dIrat.kuldo_partner_id) {
        partnerMatched = true
        dossierPartnerCount++
      } else if (targetNormPartner && dIrat.partner?.nev) {
        const normDossierPartner = normalize(dIrat.partner.nev)
        if (normDossierPartner === targetNormPartner) {
          partnerMatched = true
          dossierPartnerCount++
        } else if (
          (normDossierPartner.length > 3 && targetNormPartner.includes(normDossierPartner)) ||
          (targetNormPartner.length > 3 && normDossierPartner.includes(targetNormPartner))
        ) {
          partnerMatched = true
          dossierPartnerCount++
        }
      }
    }

    if (partnerMatched) {
      // Partner egyezés alap pontját csökkentjük: az email feladó és a dokumentum kibocsátója
      // nem feltétlenül azonos, ezért partner egyezés önmagában csak 20 pontot ér.
      // Tárgyegészéssel együtt éri el a magas konfidenciát.
      const partnerBonus = Math.min(5, dossierPartnerCount * 2)
      score += 20 + partnerBonus
      details.push(`Azonos küldő partner (${target.partner_nev || "megfelelés"}), az ügyiratban már ${dossierPartnerCount} kapcsolódó irat szerepel (+${20 + partnerBonus}%)`)
    }

    // 3. SUBJECT & TOKEN SIMILARITY (max 30 pts)
    let candidateAllText = dossierTargy
    for (const dIrat of dossierIratok) {
      if (dIrat.targy) candidateAllText += " " + dIrat.targy
    }

    const candidateTokens = tokenize(candidateAllText)
    const candidateStems = new Set(Array.from(candidateTokens).map(stemHungarian))

    if (targetTokens.size > 0 && candidateTokens.size > 0) {
      const matchedTokens = new Set<string>()
      for (const t of targetTokens) {
        const tStem = stemHungarian(t)
        if (candidateTokens.has(t) || candidateStems.has(tStem)) {
          matchedTokens.add(t)
        } else {
          for (const c of candidateTokens) {
            if (t.length >= 5 && c.length >= 5 && (t.startsWith(c.slice(0, 5)) || c.startsWith(t.slice(0, 5)))) {
              matchedTokens.add(t)
              break
            }
          }
        }
      }

      const overlapRatio = matchedTokens.size / Math.min(targetTokens.size, candidateTokens.size)
      if (matchedTokens.size > 0) {
        const matchedWords = Array.from(matchedTokens).slice(0, 4).join(", ")
        if (overlapRatio >= 0.35) {
          score += 25
          details.push(`Jelentős tárgyi kulcsszó-átfedés (${Math.round(overlapRatio * 100)}%): [${matchedWords}] (+25%)`)
        } else if (overlapRatio >= 0.18) {
          score += 15
          details.push(`Közepes tárgyi kulcsszó-átfedés (${Math.round(overlapRatio * 100)}%): [${matchedWords}] (+15%)`)
        } else {
          score += 8
          details.push(`Részleges kulcsszó-átfedés: [${matchedWords}] (+8%)`)
        }
      }
    }

    // Direct normalized subject substring match bonus
    const normDossierTargy = normalize(dossierTargy)
    if (normDossierTargy && targetNormTargy) {
      if (targetNormTargy === normDossierTargy) {
        score += 10
        details.push(`Megegyező ügyirattárgy (+10%)`)
      } else if (targetNormTargy.includes(normDossierTargy) || normDossierTargy.includes(targetNormTargy)) {
        score += 5
        details.push(`Részben átfedő ügyirattárgy (+5%)`)
      }
    }

    // 4. STATUS CONTEXT (max 5 pts)
    const isOpen = ["iktatva", "szignalt", "ugyintezes_alatt", "folyamatban"].includes(dossier.statusz)
    if (isOpen && score > 30) {
      score += 5
      details.push("Az ügyirat jelenleg nyitott, folyamatban lévő eljárás (+5%)")
    } else if (!isOpen && score > 30) {
      details.push("Megjegyzés: Az ügyirat jelenleg lezárt/irattározott, de előzményként új alszám nyitható hozzá.")
    }

    const finalScore = Math.min(100, Math.round(score))
    if (finalScore > highestScore) {
      highestScore = finalScore
      bestMatch = dossier
      bestDetails = details
    }
  }

  // Értékelési küszöb: legalább 45 pont kell az ajánláshoz
  // (megakadályozza, hogy csak partner-egyezés alapján ajánljon rendszer)
  if (!bestMatch || highestScore < 45) {
    const partnerInfo = target.partner_nev ? `a(z) "${target.partner_nev}" partnerhez` : "ehhez a témához"
    return {
      ugyirat_id: null,
      iktatoszam: null,
      ugyszam: null,
      targy: null,
      statusz: null,
      szervezeti_egyseg_nev: null,
      confidence_score: highestScore,
      recommendation_type: "uj_ugy_nyitasa",
      indoklas: `Új téma javaslat (${highestScore}% egyezés): Nem található korábbi nyitott vagy lezárt ügyirat ${partnerInfo}. Duplikáció nem áll fenn, új ügy nyitása javasolt.`,
      reszletek: bestDetails.length > 0 ? bestDetails : ["Nem található egyező partner vagy releváns kulcszó-átfedés."],
      irat_count: 0
    }
  }

  const isHighMatch = highestScore >= 60
  const recommendation_type: AntecedentMatchResult["recommendation_type"] = isHighMatch ? "alszam_csatolas" : "megfontolando_csatolas"
  const dossierTargy = bestMatch.ugy?.targy || bestMatch.iktatoszam
  const isOpen = ["iktatva", "szignalt", "ugyintezes_alatt", "folyamatban"].includes(bestMatch.statusz)
  const statusStr = isOpen ? "nyitott" : "lezárt"

  const indoklas = isHighMatch
    ? `Magas valószínűségű egyezés (${highestScore}%): A beérkező irat a(z) ${bestMatch.iktatoszam} (${statusStr}) ügyirathoz kapcsolódik („${dossierTargy}”). Alszámként történő csatolás javasolt a duplikáció elkerülésére.`
    : `Közepes valószínűségű egyezés (${highestScore}%): Lehetséges előzmény-kapcsolat a(z) ${bestMatch.iktatoszam} ügyirattal. Ellenőrzés és csatolás javasolt.`

  return {
    ugyirat_id: bestMatch.id,
    iktatoszam: bestMatch.iktatoszam,
    ugyszam: bestMatch.ugy?.ugyszam || null,
    targy: dossierTargy,
    statusz: bestMatch.statusz,
    szervezeti_egyseg_nev: bestMatch.szervezeti_egyseg?.nev || null,
    confidence_score: highestScore,
    recommendation_type,
    indoklas,
    reszletek: bestDetails,
    irat_count: (bestMatch.irat || []).length
  }
}

/**
 * Asynchronously query Supabase and compute the antecedent suggestion for a given irat.
 */
export async function findAntecedentSuggestion(
  iratId: string,
  supabase: SupabaseClient
): Promise<AntecedentMatchResult> {
  // 1. Fetch the target irat
  const { data: targetIrat, error: iratErr } = await supabase
    .from("irat")
    .select(`
      id,
      targy,
      leiras,
      kuldo_partner_id,
      erkeztetoszam,
      kulso_hivatkozas_id,
      partner ( id, nev )
    `)
    .eq("id", iratId)
    .single()

  if (iratErr || !targetIrat) {
    return {
      ugyirat_id: null,
      iktatoszam: null,
      ugyszam: null,
      targy: null,
      statusz: null,
      szervezeti_egyseg_nev: null,
      confidence_score: 0,
      recommendation_type: "uj_ugy_nyitasa",
      indoklas: "A beérkező irat nem található az adatbázisban.",
      reszletek: [],
      irat_count: 0
    }
  }

  // 2. Query all open and closed dossiers
  const { data: rawDossiers, error: dossierErr } = await supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      szervezeti_egyseg ( id, nev ),
      ugy ( id, ugyszam, targy, statusz ),
      irat (
        id,
        targy,
        alszam,
        kuldo_partner_id,
        partner ( id, nev )
      )
    `)
    .order("iktatas_datuma", { ascending: false })
    .limit(150)

  if (dossierErr || !rawDossiers) {
    return {
      ugyirat_id: null,
      iktatoszam: null,
      ugyszam: null,
      targy: null,
      statusz: null,
      szervezeti_egyseg_nev: null,
      confidence_score: 0,
      recommendation_type: "uj_ugy_nyitasa",
      indoklas: "Nem sikerült lekérni a meglévő ügyiratokat.",
      reszletek: [],
      irat_count: 0
    }
  }

  const partnerData = targetIrat.partner as any
  const targetInput: TargetIratInput = {
    id: targetIrat.id,
    targy: targetIrat.targy || "",
    leiras: targetIrat.leiras,
    kuldo_partner_id: targetIrat.kuldo_partner_id,
    partner_nev: partnerData?.nev || null,
    erkeztetoszam: targetIrat.erkeztetoszam,
    kulso_hivatkozas_id: targetIrat.kulso_hivatkozas_id
  }

  const candidateDossiers: CandidateDossier[] = rawDossiers.map((d: any) => ({
    id: d.id,
    iktatoszam: d.iktatoszam,
    statusz: d.statusz,
    szervezeti_egyseg: Array.isArray(d.szervezeti_egyseg) ? d.szervezeti_egyseg[0] : d.szervezeti_egyseg,
    ugy: Array.isArray(d.ugy) ? d.ugy[0] : d.ugy,
    irat: d.irat || []
  }))

  return calculateAntecedentMatch(targetInput, candidateDossiers)
}
