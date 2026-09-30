import { GoogleGenAI } from "@google/genai"

export type EmailCategory =
  | "official_document"       // Számla, szerződés, hivatalos levél, határozat, igazolás
  | "business_inquiry"        // Valós üzleti megkeresés, árajánlatkérés, partner kommunikáció
  | "marketing_newsletter"    // Hírlevél, promóció, reklám, leiratkozási linkkel ellátott levél
  | "automated_notification"  // Rendszerüzenet, kézbesítési hiba (bounce), no-reply automata
  | "spam"                    // Kéretlen spam, adathalászat, kaszinó, csalás

export interface EmailClassificationInput {
  from: string
  senderName?: string | null
  subject: string
  bodyText: string
  attachmentNames?: string[]
}

export interface EmailClassificationResult {
  isRelevant: boolean
  category: EmailCategory
  confidence: number
  reason: string
  suggestedAction: "intake" | "ignore" | "quarantine"
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: FAST RULE-BASED HEURISTICS (0ms, 100% determinisztikus)
// ─────────────────────────────────────────────────────────────────────────────

const INVOICE_ATTACHMENT_PATTERNS = [
  /sz[aá]mla/i,
  /invoice/i,
  /rechnung/i,
  /szerz[oőóö]d[eé]s/i,
  /contract/i,
  /meg[aá]llapod[aá]s/i,
  /teljes[ií]t[eé]s/i,
  /hat[aá]rozat/i,
  /jegyz[oőóö]k[oö]nyv/i,
  /bizonylat/i,
]

const BOUNCE_PATTERNS = [
  /mailer-daemon/i,
  /postmaster@/i,
  /delivery status notification/i,
  /undelivered mail/i,
  /failure notice/i,
  /mail delivery subsystem/i,
]

const SPAM_PATTERNS = [
  /won\s+\d+\s*(usdt|btc|usd|eur|\$)/i,
  /crypto\s*casino/i,
  /free\s*spins/i,
  /bitcoin\s*jackpot/i,
  /claim\s*your\s*reward/i,
  /viagra|cialis/i,
  /wire\s*transfer\s*lottery/i,
  /online\s*kaszin[oó]/i,
]

const NEWSLETTER_PATTERNS = [
  /leiratkoz[aá]s/i,
  /unsubscribe/i,
  /h[ií]rlev[eé]lr[oő]l\s*val[oó]/i,
  /csak\s*ma!.*kedvezm[eé]ny/i,
  /akci[oó]s\s*web[aá]ruh[aá]z/i,
  /marketing\s*aj[aá]nlat/i,
  /iratkozzon\s*le/i,
]

export async function classifyIncomingEmail(
  input: EmailClassificationInput
): Promise<EmailClassificationResult> {
  const { from, senderName, subject, bodyText, attachmentNames = [] } = input
  const fullText = `${subject} ${bodyText}`
  const fullSender = `${senderName || ""} ${from}`.trim()

  // 1. Prioritás: Hivatalos melléklet megléte (számla, szerződés PDF)
  const hasInvoiceAttachment = attachmentNames.some((att) =>
    INVOICE_ATTACHMENT_PATTERNS.some((pattern) => pattern.test(att))
  )
  if (hasInvoiceAttachment) {
    return {
      isRelevant: true,
      category: "official_document",
      confidence: 0.98,
      reason: "Hivatalos dokumentumot (számla / szerződés) azonosító melléklet csatolva.",
      suggestedAction: "intake",
    }
  }

  // 2. Kézbesítési hibák / Rendszerüzenetek (Bounce)
  const isBounce = BOUNCE_PATTERNS.some(
    (p) => p.test(fullSender) || p.test(subject)
  )
  if (isBounce) {
    return {
      isRelevant: false,
      category: "automated_notification",
      confidence: 0.99,
      reason: "Kézbesítési hibaértesítő vagy kézbesítő démon (bounce) üzenet.",
      suggestedAction: "ignore",
    }
  }

  // 3. Egyértelmű kéretlen spam / kaszinó / csalás
  const isSpam = SPAM_PATTERNS.some((p) => p.test(fullText) || p.test(fullSender))
  if (isSpam && attachmentNames.length === 0) {
    return {
      isRelevant: false,
      category: "spam",
      confidence: 0.95,
      reason: "Kéretlen spam, szerencsejáték vagy adathalász megkeresés.",
      suggestedAction: "ignore",
    }
  }

  // 4. Hírlevél / Promóció
  const isNewsletter = NEWSLETTER_PATTERNS.some((p) => p.test(fullText))
  if (isNewsletter && attachmentNames.length === 0) {
    return {
      isRelevant: false,
      category: "marketing_newsletter",
      confidence: 0.92,
      reason: "Marketing jellegű promóció vagy leiratkozási linket tartalmazó hírlevél.",
      suggestedAction: "ignore",
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 2: GEMINI 2.5 FLASH AI OSZTÁLYOZÁS (Kétértelmű levelek esetén)
  // ─────────────────────────────────────────────────────────────────────────
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    // Fail-open: Ha nincs API kulcs, hivatalos üzleti levélként kezeljük (nem veszhet el irat)
    return {
      isRelevant: true,
      category: "business_inquiry",
      confidence: 0.5,
      reason: "Tartalék szabály: API kulcs nélkül minden üzleti levél engedélyezett (fail-open).",
      suggestedAction: "intake",
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const prompt = `Te egy hivatalos magyar iratkezelő rendszer (eaisyDocs) beérkező e-mail szűrője vagy.
Döntsd el, hogy az alábbi e-mail releváns, hivatalos üzleti irat-e (szerződés, számla, megkeresés, partneri egyeztetés), amit iktatni/érkeztetni kell, VAGY kéretlen spam, automata hírlevél, reklám, amit ki kell szűrni.

E-mail adatai:
- Feladó: "${fullSender}"
- Tárgy: "${subject}"
- Szöveg kivonat (max 500 karakter): "${bodyText.slice(0, 500)}"
- Csatolt fájlok: ${attachmentNames.length > 0 ? attachmentNames.join(", ") : "Nincs csatolmány"}

Válaszolj szigorúan az alábbi JSON formátumban:
{
  "isRelevant": true vagy false,
  "category": "official_document" | "business_inquiry" | "marketing_newsletter" | "automated_notification" | "spam",
  "confidence": 0.0 és 1.0 közötti szám,
  "reason": "Rövid, 1 mondatos magyar indoklás",
  "suggestedAction": "intake" | "ignore"
}`

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
      },
    })

    const parsedText = response.text?.trim() || ""
    if (parsedText) {
      const data = JSON.parse(parsedText)
      return {
        isRelevant: Boolean(data.isRelevant),
        category: data.category || "business_inquiry",
        confidence: typeof data.confidence === "number" ? data.confidence : 0.8,
        reason: data.reason || "AI osztályozás alapján",
        suggestedAction: data.suggestedAction || (data.isRelevant ? "intake" : "ignore"),
      }
    }
  } catch (aiErr) {
    console.warn("[EmailSpamFilter] Gemini hiba, átállás tartalék biztonsági módra (fail-open):", aiErr)
  }

  // Biztonsági alapértelmezés (fail-open)
  return {
    isRelevant: true,
    category: "business_inquiry",
    confidence: 0.6,
    reason: "Tartalék szabály: Kétséges esetben a beérkező irat nem kerül elutasításra.",
    suggestedAction: "intake",
  }
}
