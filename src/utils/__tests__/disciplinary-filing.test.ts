import { describe, it } from "node:test"
import assert from "node:assert"
import { generateDisciplinaryHtml, DisciplinaryPdfData } from "../hr/disciplinary-pdf-generator"

describe("Fegyelmi és Károkozási Határozatok (Mt. 56. §, 179. § & eaisyDocs)", () => {
  it("generateDisciplinaryHtml írásbeli figyelmeztetés (Mt. 56. §) esetén helyes jogi struktúrát generál", () => {
    const mockData: DisciplinaryPdfData = {
      id: "disc-uuid-001",
      decisionNumber: "FEGY-2026/001",
      employeeId: "emp-uuid-1111",
      employeeName: "Minta János",
      szuletesiHely: "Budapest",
      szuletesiDatum: "1988. május 20.",
      anyjaNeve: "Szabó Erzsébet",
      lakcim: "1061 Budapest, Andrássy út 12.",
      tajSzam: "987 654 321",
      munkakor: "Rendszeradminisztrátor",
      tipus: "figyelmeztetes",
      tipusLabel: "MUNKÁLTATÓI ÍRÁSBELI FIGYELMEZTETÉS",
      datum: "2026. október 1.",
      indoklas: "A munkavállaló a 2026. szeptember 28-i munkanapon a kötelező munkaidő kezdetét 90 perccel elmulasztotta, és előzetes értesítést nem adott.",
      atvetelDatuma: "2026. október 1.",
      iktatoszam: "HR/2026/00045/1",
      cegNev: "eaisyDocs Vállalati Rendszerek Zrt.",
      cegSzekhely: "1054 Budapest, Szabadság tér 7.",
      cegAdoszam: "12345678-2-41",
      cegCegjegyzekszam: "01-10-123456",
      cegKepviselo: "Ügyvezető Igazgató",
    }

    const html = generateDisciplinaryHtml(mockData)

    // Jogi fejlécek és hivatkozások
    assert.ok(html.includes("MUNKÁLTATÓI ÍRÁSBELI FIGYELMEZTETÉS"), "Tartalmaznia kell a figyelmeztetés címét")
    assert.ok(html.includes("2012. évi I. törvény (Mt.) 56. §"), "Tartalmaznia kell az Mt. 56. § hivatkozást")
    assert.ok(html.includes("írásbeli figyelmeztetésben részesíti"), "Tartalmaznia kell a rendelkező rész szankcióját")
    assert.ok(html.includes("HR/2026/00045/1"), "Tartalmaznia kell az eaisyDocs iktatószámot")
    assert.ok(html.includes("Megőrzési idő: 5 év (Mt. 286. §)"), "Tartalmaznia kell a megőrzési időt")

    // Kötelező 30 napos bírósági jogorvoslati tájékoztató (Mt. 285. §)
    assert.ok(html.includes("30 (harminc) napon belül"), "Tartalmaznia kell a 30 napos határidőt")
    assert.ok(html.includes("Törvényszék Munkaügyi Kollégiumához"), "Tartalmaznia kell az illetékes bíróság megnevezését")
    assert.ok(html.includes("Mt. 285. § (1) bek."), "Tartalmaznia kell a törvényi jogorvoslati szakaszt")

    // Érintett adatai és indoklás
    assert.ok(html.includes("Minta János"), "Tartalmaznia kell a munkavállaló nevét")
    assert.ok(html.includes("Rendszeradminisztrátor"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("90 perccel elmulasztotta"), "Tartalmaznia kell a tényállást")
  })

  it("generateDisciplinaryHtml kártérítés (Mt. 179. §) esetén tartalmazza a kárösszeget és halasztó hatályt", () => {
    const mockData: DisciplinaryPdfData = {
      id: "disc-uuid-002",
      decisionNumber: "FEGY-2026/002",
      employeeId: "emp-uuid-2222",
      employeeName: "Károkozó Károly",
      szuletesiHely: "Szeged",
      szuletesiDatum: "1995. augusztus 10.",
      anyjaNeve: "Kiss Mária",
      lakcim: "6720 Szeged, Tisza Lajos körút 4.",
      tajSzam: "111 222 333",
      munkakor: "Gépkocsivezető és raktáros",
      tipus: "karterites",
      tipusLabel: "KÁRTÉRÍTÉSI FIZETÉSI FELSZÓLÍTÁS ÉS HATÁROZAT",
      datum: "2026. október 1.",
      indoklas: "A munkavállaló tolatás során a céges gépjármű bal hátsó sárvédőjét gondatlanságból megrongálta.",
      karOsszeg: 120000,
      reszletfizetesLeiras: "Havi 30 000 Ft munkabérből történő levonással 4 részletben",
      atvetelDatuma: "2026. október 1.",
      iktatoszam: "HR/2026/00045/2",
      cegNev: "eaisyDocs Vállalati Rendszerek Zrt.",
      cegSzekhely: "1054 Budapest, Szabadság tér 7.",
      cegAdoszam: "12345678-2-41",
      cegCegjegyzekszam: "01-10-123456",
      cegKepviselo: "Ügyvezető Igazgató",
    }

    const html = generateDisciplinaryHtml(mockData)

    assert.ok(html.includes("KÁRTÉRÍTÉSI FIZETÉSI FELSZÓLÍTÁS"), "Tartalmaznia kell a kártérítési címet")
    assert.ok(html.includes("Mt.) 179. §"), "Tartalmaznia kell az Mt. 179. § jogalapot")
    assert.ok(html.includes((120000).toLocaleString("hu-HU") + " Ft"), "Tartalmaznia kell a kárösszeget")
    assert.ok(html.includes("Havi 30 000 Ft munkabérből történő levonással"), "Tartalmaznia kell a levonási ütemezést")
    assert.ok(html.includes("halasztó hatálya van"), "Tartalmaznia kell a perindítás halasztó hatályára vonatkozó tájékoztatást")
  })
})
