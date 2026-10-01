import test from 'node:test'
import assert from 'node:assert'
import { 
  generateSafetyTrainingHtml, 
  generateSafetyTrainingPdf, 
  DEFAULT_SAFETY_TOPICS,
  TRAINING_TYPE_LABELS,
  type SafetyTrainingPdfData 
} from '../hr/safety-training-pdf-generator'

test('Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv (Mvt. 55. §, Ttv. 22. § & eaisyDocs)', async (t) => {
  const baseData: SafetyTrainingPdfData = {
    employeeName: "Teszt Elek",
    employeeId: "emp-123",
    munkakor: "Senior Szoftverfejlesztő",
    reszleg: "Fejlesztés",
    szuletesiDatum: "1990-05-12",
    szuletesiHely: "Budapest",
    anyjaNeve: "Kovács Katalin",
    lakcim: "1118 Budapest, Rétköz u. 12.",
    oktatasDatuma: "2026-10-01",
    oktatasTipusa: "elozetes_munkaba_allasi",
    oktatoNeve: "Nagy Dániel",
    oktatoBeosztasa: "Munkavédelmi és Tűzvédelmi Megbízott",
    cegNev: "ThinkAI Munkaügyi Kft.",
    cegSzekhely: "1138 Budapest, Váci út 140.",
    cegAdoszam: "27849120-2-41",
    cegKepviselo: "Nagy Dániel Ügyvezető"
  }

  await t.test('generateSafetyTrainingHtml tartalmazza a kötelező jogszabályi elemeket és adatokat', () => {
    const html = generateSafetyTrainingHtml(baseData)

    // Jogi hivatkozások megléte
    assert.ok(html.includes("1993. évi XCIII. törvény"), "Tartalmaznia kell a Munkavédelmi törvényt (Mvt.)")
    assert.ok(html.includes("55. §"), "Tartalmaznia kell az Mvt. 55. §-t")
    assert.ok(html.includes("1996. évi XXXI. törvény"), "Tartalmaznia kell a Tűzvédelmi törvényt (Ttv.)")
    assert.ok(html.includes("22. §"), "Tartalmaznia kell a Ttv. 22. §-t")
    assert.ok(html.includes("50/1999. EüM"), "Tartalmaznia kell a képernyős ergonómia rendeletet")

    // Felek és adatok megléte
    assert.ok(html.includes("Teszt Elek"), "Tartalmaznia kell a munkavállaló nevét")
    assert.ok(html.includes("Senior Szoftverfejlesztő"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("Nagy Dániel"), "Tartalmaznia kell az oktató nevét")
    assert.ok(html.includes("ThinkAI Munkaügyi Kft."), "Tartalmaznia kell a cég nevét")
    assert.ok(html.includes("Előzetes munkába állási oktatás"), "Tartalmaznia kell az oktatás típusát")

    // Irattári besorolás és megőrzés
    assert.ok(html.includes("3.4 • Munkavédelem (10 év)"), "Tartalmaznia kell a 3.4 tételt és a 10 év megőrzési időt")
    assert.ok(html.includes("TERVEZET - IKTATÁSRA VÁR"), "Iktatószám nélkül tervezetként kell megjelennie")
  })

  await t.test('iktatott állapotban helyes pecsétet és iktatószámot jelenít meg', () => {
    const filedData: SafetyTrainingPdfData = {
      ...baseData,
      iktatoszam: "HR/2026/00045/2"
    }

    const html = generateSafetyTrainingHtml(filedData)
    assert.ok(html.includes("IKTATVA: HR/2026/00045/2"), "Tartalmaznia kell a konkrét iktatószámot")
    assert.ok(html.includes("stamp-filed"), "stamp-filed CSS osztályt kell használnia")
  })

  await t.test('egyedi tematika és megjegyzés helyesen leképeződik a HTML-ben', () => {
    const customTopics = [
      "Elsősegélynyújtás defibrillátorral",
      "Kémiai anyagok biztonsági adatlapjai"
    ]
    const customData: SafetyTrainingPdfData = {
      ...baseData,
      tematika: customTopics,
      megjegyzes: "Laboratóriumi védőszemüveg kötelező."
    }

    const html = generateSafetyTrainingHtml(customData)
    assert.ok(html.includes("Elsősegélynyújtás defibrillátorral"))
    assert.ok(html.includes("Kémiai anyagok biztonsági adatlapjai"))
    assert.ok(html.includes("Laboratóriumi védőszemüveg kötelező."))
  })

  await t.test('generateSafetyTrainingPdf érvényes PDF buffert állít elő Puppeteerrel', async () => {
    const buffer = await generateSafetyTrainingPdf(baseData)
    assert.ok(Buffer.isBuffer(buffer), "Bufferként kell visszatérnie")
    assert.ok(buffer.length > 1000, "A PDF mérete legyen nagyobb 1 KB-nál")
    // Ellenőrizzük a PDF magic byte-okat (%PDF)
    const header = buffer.toString('utf8', 0, 4)
    assert.strictEqual(header, "%PDF", "A fájl kezdődjön %PDF aláírással")
  })
})
