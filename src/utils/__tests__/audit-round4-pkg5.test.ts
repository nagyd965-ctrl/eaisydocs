import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

describe("4. koros audit — 5. CSOMAG (21-25. pont) verifikacios tesztek", () => {
  it("21. pont (J-17): verifyCronAuth timingSafeEqual fejlec-hitelesites mind a 4 cron vegpontban", () => {
    const cronAuthPath = path.join(process.cwd(), "src/utils/cron-auth.ts")
    assert.ok(fs.existsSync(cronAuthPath), "src/utils/cron-auth.ts fajlnak leteznie kell")
    const cronAuthSrc = fs.readFileSync(cronAuthPath, "utf8")
    assert.ok(
      cronAuthSrc.includes("timingSafeEqual") &&
        cronAuthSrc.includes("export function verifyCronAuth"),
      "A verifyCronAuth fugvenynek crypto.timingSafeEqual ellenorzest kell hasznalnia"
    )

    const cronRoutes = [
      "src/app/api/cron/nightly/route.ts",
      "src/app/api/cron/morning/route.ts",
      "src/app/api/cron/imap/route.ts",
      "src/app/api/cron/gdpr-anonymize/route.ts",
    ]
    for (const rel of cronRoutes) {
      const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8")
      assert.ok(
        src.includes("verifyCronAuth(request)"),
        `A(z) ${rel} vegpontnak a kozos verifyCronAuth(request) ellenorzot kell hasznalnia`
      )
      assert.ok(
        !src.includes("searchParams.get('secret')") &&
          !src.includes('searchParams.get("secret")'),
        `A(z) ${rel} vegpont nem fogadhat el URL query (?secret=...) alapu cron titkot`
      )
    }
  })

  it("22. pont (J-16): ejszakai cron (nightly) mar lejart teteleinek 7 napos deduplikacioja", () => {
    const nightlyPath = path.join(process.cwd(), "src/app/api/cron/nightly/route.ts")
    const src = fs.readFileSync(nightlyPath, "utf8")

    assert.ok(
      src.includes("wasRecentlyNotified") && src.includes("sevenDaysAgoIso"),
      "A nightly cronnak 7 napos deduplikacios segedfuggvenyt (wasRecentlyNotified) kell alkalmaznia a mar lejart tetelekre"
    )
  })

  it("23. pont (J-18): sendEmailWithAttachment ceg-specifikus hitelesitese es nightly cron dinamikus feladoja", () => {
    const mailerPath = path.join(process.cwd(), "src/utils/mailer.ts")
    const mailerSrc = fs.readFileSync(mailerPath, "utf8")

    const attachFnStart = mailerSrc.indexOf("export async function sendEmailWithAttachment")
    assert.ok(attachFnStart !== -1, "sendEmailWithAttachment megtalalhato")
    const attachFnBlock = mailerSrc.slice(attachFnStart)
    assert.ok(
      attachFnBlock.includes("loadCompanyCredentialRow"),
      "A sendEmailWithAttachment fugvenynek be kell toltenie a ceg sajat e-mail hitelesito adatait (loadCompanyCredentialRow)"
    )

    const nightlyPath = path.join(process.cwd(), "src/app/api/cron/nightly/route.ts")
    const nightlySrc = fs.readFileSync(nightlyPath, "utf8")
    assert.ok(
      !nightlySrc.includes('senderEmail: "eaisyhr@thinkai.hu"'),
      "A nightly cron nem tartalmazhatja begetve a senderEmail: \"eaisyhr@thinkai.hu\" erteket"
    )
  })

  it("24. pont (J-19): IMAP PDF-rendereles kulso kepek blokkolasa (setRequestInterception) es csatolmanynev-sorszamozas", () => {
    const imapPath = path.join(process.cwd(), "src/utils/imap-service.ts")
    const src = fs.readFileSync(imapPath, "utf8")

    assert.ok(
      src.includes("setRequestInterception(true)"),
      "Az imap-service.ts Puppeteer PDF generalasanak be kell kapcsolnia a setRequestInterception(true) vedelmet"
    )
    assert.ok(
      src.includes("`${iratId}/${attIndex}_${sanitizedFileName}`"),
      "Az imap-service.ts csatolmany-feltoltesenek sorszammal ellatott utvonalat kell hasznalnia az utkozesek elkerulesere"
    )
  })

  it("25. pont (J-15): IMAP e-mail erkeztetes Message-ID duplikacio-ellenorzese es uzenetenkenti Seen jelolese", () => {
    const imapPath = path.join(process.cwd(), "src/utils/imap-service.ts")
    const src = fs.readFileSync(imapPath, "utf8")

    assert.ok(
      src.includes("kulso_forras: 'imap'") && src.includes("kulso_hivatkozas_id"),
      "Az imap-service.ts-nek el kell mentenie es ellenoriznie kell a kulso_forras: 'imap' + kulso_hivatkozas_id (Message-ID) mezoket"
    )
    assert.ok(
      src.includes("await client.messageFlagsAdd(String(message.seq), ['\\\\Seen'])") ||
        src.includes('await client.messageFlagsAdd(String(message.seq), ["\\\\Seen"])'),
      "Az imap-service.ts-nek minden sikeresen feldolgozott e-mailt azonnal \\Seen jelzovel kell megjelolnie a cikluson belul"
    )
  })
})
