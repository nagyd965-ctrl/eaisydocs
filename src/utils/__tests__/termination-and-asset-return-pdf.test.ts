import { describe, it } from "node:test"
import assert from "node:assert"
import { 
  generateTerminationHtml, 
  generateTerminationPdfBuffer 
} from "../hr/termination-pdf-generator"
import { 
  type TerminationPdfData, 
  DEFAULT_COMPANY_DETAILS 
} from "../hr/termination-constants"
import { 
  generateAssetReturnHtml, 
  generateAssetReturnPdfBuffer,
  type AssetReturnPdfData
} from "../hr/asset-return-pdf-generator"

describe("Munkaviszony Megszüntetés és Eszköz Leszámolás PDF Generátor (Mt. 64–85. §, Mt. 179. §)", () => {
  const mockTerminationData: TerminationPdfData = {
    employeeName: "Kovács Péter",
    employeeId: "emp-101",
    offboardingId: "off-001",
    szuletesiHely: "Debrecen",
    szuletesiDatum: "1988-11-20",
    anyjaNeve: "Szabó Erzsébet",
    lakcim: "4028 Debrecen, Kassai út 26.",
    adoazonosito: "8392019283",
    tajSzam: "048 291 823",
    munkakor: "Senior Rendszermérnök",
    reszleg: "IT és Üzemeltetés",
    megszunesModja: "kozos_megegyezes",
    megszunesDatuma: "2026-10-31",
    utolsoMunkanap: "2026-10-15",
    felmentesiIdoNap: 15,
    megvaltottSzabadsagNap: 6,
    vegkielegitesOsszeg: 1200000,
    indoklas: "Közös megegyezés szerinti átszervezés miatti távozás.",
    cegAdatok: DEFAULT_COMPANY_DETAILS,
    iktatoszam: "HR/2026/000089/1"
  }

  const mockAssetReturnData: AssetReturnPdfData = {
    employeeName: "Kovács Péter",
    employeeId: "emp-101",
    offboardingId: "off-001",
    munkakor: "Senior Rendszermérnök",
    reszleg: "IT és Üzemeltetés",
    szuletesiHely: "Debrecen",
    szuletesiDatum: "1988-11-20",
    anyjaNeve: "Szabó Erzsébet",
    lakcim: "4028 Debrecen, Kassai út 26.",
    adoazonosito: "8392019283",
    tajSzam: "048 291 823",
    visszavetelDatuma: "2026-10-15",
    cegAdatok: DEFAULT_COMPANY_DETAILS,
    items: [
      {
        megnevezes: "MacBook Pro 16 M3 Max",
        eszkoz_kategoria: "it",
        gyari_szam: "C02XYZ12345",
        tartozekok: "Töltő, USB-C kábel",
        visszavetel_allapot: "ep",
        visszavetel_megjegyzes: "Kitűnő állapotban leadva"
      },
      {
        megnevezes: "iPhone 15 Pro",
        eszkoz_kategoria: "telekom",
        gyari_szam: "IMEI-35928109283",
        tartozekok: "SIM tálca, tok",
        visszavetel_allapot: "normal_kopas",
        visszavetel_megjegyzes: "Finom karcok a hátlapon"
      },
      {
        megnevezes: "Irodai Belépőkártya",
        eszkoz_kategoria: "iroda",
        gyari_szam: "RFID-9812",
        tartozekok: "Nyakpánt",
        visszavetel_allapot: "ep",
        visszavetel_megjegyzes: null
      }
    ],
    fizetendoKarteritesOsszeg: 0,
    vagyoniElszamolasNyilatkozat: "Minden fizikai és virtuális eszköz, token visszavétele megtörtént.",
    iktatoszam: "HR/2026/000089/2"
  }

  describe("Munkaviszony megszüntetés megállapodás (Mt. 64–85. §)", () => {
    it("generateTerminationHtml tartalmazza a felek adatait, összegeket és a jogi záradékot", () => {
      const html = generateTerminationHtml(mockTerminationData)

      assert.ok(html.includes("Kovács Péter"), "Tartalmaznia kell a munkavállaló nevét")
      assert.ok(html.includes("MEGÁLLAPODÁS MUNKAVISZONY KÖZÖS MEGEGYEZÉSSEL"), "Cím tartalmazza a közös megegyezést")
      assert.ok(/1[\s\u00a0]200[\s\u00a0]000\s*Ft/.test(html), "Végkielégítés összege formázva")
      assert.ok(html.includes("6 munkanap"), "Megváltott szabadság napok száma")
      assert.ok(html.includes("15 nap"), "Felmentési idő napok száma")
      assert.ok(html.includes("Senior Rendszermérnök"), "Munkakör szerepel benne")
      assert.ok(html.includes("HR/2026/000089/1"), "Iktatószám megjelenítése")
      assert.ok(html.includes("Irattári tétel: 1.2 (50 év megőrzés)"), "eaisyDocs 1.2 irattári tétel hivatkozás")
    })

    it("munkáltatói felmondás esetén jogorvoslati tájékoztatást (Mt. 287. §) tartalmaz", () => {
      const dismissalData: TerminationPdfData = {
        ...mockTerminationData,
        megszunesModja: "munkaltatoi_felmondas",
        indoklas: "Munkáltató működésével összefüggő átszervezés (Mt. 66. § (2)).",
        iktatoszam: null
      }

      const html = generateTerminationHtml(dismissalData)
      assert.ok(html.includes("MUNKÁLTATÓI FELMONDÁS"), "Cím felmondásra vált")
      assert.ok(html.includes("Jogorvoslati tájékoztatás"), "Tartalmaznia kell jogorvoslati tájékoztatást")
      assert.ok(html.includes("Mt. 287. §"), "Hivatkozás az Mt. 287. §-ra")
      assert.ok(html.includes("harminc (30) napon belül"), "30 napos keresetindítási határidő")
      assert.ok(html.includes("Tervezet"), "Nem iktatott állapotban tervezet jelvény van")
    })

    it("generateTerminationPdfBuffer valós PDF buffert hoz létre Puppeteerrel", async () => {
      const buffer = await generateTerminationPdfBuffer(mockTerminationData)

      assert.ok(buffer instanceof Buffer, "Buffer típusú eredmény")
      assert.ok(buffer.length > 2000, "A PDF mérete meghaladja a 2 KB-ot")
      assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF", "PDF fejléccel rendelkezik")
    })
  })

  describe("Eszköz visszavételi és vagyoni elszámoló lap (Mt. 179. §, Mt. 80. §)", () => {
    it("generateAssetReturnHtml tételesen listázza a leadott eszközöket és állapotukat", () => {
      const html = generateAssetReturnHtml(mockAssetReturnData)

      assert.ok(html.includes("Kovács Péter"), "Munkavállaló neve")
      assert.ok(html.includes("ESZKÖZ VISSZAVÉTELI ÉS VAGYONI LESZÁMOLÓ LAP"), "Hivatalos dokumentum cím")
      assert.ok(html.includes("MacBook Pro 16 M3 Max"), "Hardver eszköz megnevezése")
      assert.ok(html.includes("C02XYZ12345"), "Gyári szám")
      assert.ok(html.includes("Ép / Hibátlan"), "Állapot címke")
      assert.ok(html.includes("Rendeltetésszerűen kopott"), "Kopás állapot címke")
      assert.ok(html.includes("RFID-9812"), "Irodai kártya azonosító")
      assert.ok(html.includes("HR/2026/000089/2"), "Hivatalos eaisyDocs iktatószám")
      assert.ok(html.includes("Irattári tétel: 1.4"), "eaisyDocs 1.4 irattári tétel")
      assert.ok(html.includes("Teljes Vagyoni és Eszközbeli Tartozásmentesség"), "Nullás igazolás fejléc")
      assert.ok(html.includes("hiánytalanul elszámolt"), "Elszámolás megerősítése")
    })

    it("kártérítési kötelezettség esetén megjeleníti a levonandó összeget", () => {
      const damageData: AssetReturnPdfData = {
        ...mockAssetReturnData,
        fizetendoKarteritesOsszeg: 45000,
        items: [
          {
            megnevezes: "Céges Mobiltelefon",
            eszkoz_kategoria: "telekom",
            visszavetel_allapot: "serult",
            visszavetel_megjegyzes: "Kijelző betörve"
          }
        ]
      }

      const html = generateAssetReturnHtml(damageData)
      assert.ok(/45[\s\u00a0]000\s*Ft/.test(html), "Kártérítési összeg formázva")
      assert.ok(html.includes("Sérült / Hibás"), "Sérült státusz")
      assert.ok(html.includes("Kijelző betörve"), "Sérülési megjegyzés")
      assert.ok(html.includes("Anyagi Megtérítési Kötelezettség"), "Kártérítési záradék")
    })

    it("generateAssetReturnPdfBuffer érvényes PDF buffert generál", async () => {
      const buffer = await generateAssetReturnPdfBuffer(mockAssetReturnData)

      assert.ok(buffer instanceof Buffer, "Buffer típusú eredmény")
      assert.ok(buffer.length > 2000, "A PDF mérete meghaladja a 2 KB-ot")
      assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF", "PDF fejléccel kezdődik")
    })
  })
})
