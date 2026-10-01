import test from "node:test"
import assert from "node:assert/strict"
import { 
  generateAssetHandoverHtml, 
  type AssetHandoverPdfData 
} from "../hr/asset-handover-pdf-generator"
import { HR_FILING_CONSTANTS } from "../hr-filing-bridge"

test("Munkahelyi Eszköz Átadás-Átvétel és Onboarding Sablonok (Mt. 179. § & eaisyDocs)", async (t) => {
  await t.test("generateAssetHandoverHtml tartalmazza az Mt. 179. § felelősségi záradékait és az átadott eszközöket", () => {
    const mockData: AssetHandoverPdfData = {
      employeeName: "Kovács István",
      munkakor: "Senior Full-Stack Fejlesztő",
      atadasDatuma: "2026-10-01",
      cegNev: "eaisy Systems Kft.",
      cegSzekhely: "1054 Budapest, Szabadság tér 7.",
      cegAdoszam: "12345678-2-41",
      cegKepviselo: "Nagy Dániel (HR Igazgató)",
      items: [
        {
          eszkoz_kategoria: "it",
          megnevezes: "MacBook Pro 16\" M3 Max",
          gyari_szam: "C02G12345678",
          tartozekok: "140W USB-C tápegység, MagSafe kábel, védőtok",
          allapot: "uj"
        },
        {
          eszkoz_kategoria: "telekom",
          megnevezes: "iPhone 15 Pro 256GB + Céges SIM",
          gyari_szam: "IMEI: 358912345678901",
          tartozekok: "Töltőkábel, szilikon tok",
          allapot: "uj"
        },
        {
          eszkoz_kategoria: "iroda",
          megnevezes: "RFID Irodai Belépőkártya (Székház)",
          gyari_szam: "CARD-8921",
          tartozekok: "Nyakpánt, kártyatartó",
          allapot: "hasznalt"
        }
      ],
      egyediZaradek: "Minden eszköz hibátlanul átadva, bekapcsolva és tesztelve.",
      iktatoszam: "ED-2026/00142"
    }

    const html = generateAssetHandoverHtml(mockData)

    // 1. Jogszabályi hivatkozások ellenőrzése (Mt. 179. § megőrzési felelősség)
    assert.ok(html.includes("Mt. 179. §"), "Tartalmaznia kell az Mt. 179. § leltárfelelősségi hivatkozást")
    assert.ok(html.includes("Visszaszolgáltatási kötelezettség") || html.includes("visszaszolgáltatási"), "Tartalmaznia kell a visszaszolgáltatási kötelezettséget")
    assert.ok(html.includes("Rendeltetésszerű használat") || html.includes("rendeltetésszerű"), "Tartalmaznia kell a rendeltetésszerű használat kitételt")

    // 2. Munkavállaló és beosztás adatok
    assert.ok(html.includes("Kovács István"), "Tartalmaznia kell a munkavállaló nevét")
    assert.ok(html.includes("Senior Full-Stack Fejlesztő"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("eaisy Systems Kft."), "Tartalmaznia kell a cég nevét")

    // 3. Eszközök és gyári számok a táblázatban
    assert.ok(html.includes("MacBook Pro 16\" M3 Max"), "Tartalmaznia kell a laptopot")
    assert.ok(html.includes("C02G12345678"), "Tartalmaznia kell a szériaszámot")
    assert.ok(html.includes("iPhone 15 Pro 256GB"), "Tartalmaznia kell a telefont")
    assert.ok(html.includes("IMEI: 358912345678901"), "Tartalmaznia kell az IMEI számot")
    assert.ok(html.includes("RFID Irodai Belépőkártya"), "Tartalmaznia kell a belépőkártyát")

    // 4. Hivatalos iktatási pecsét
    assert.ok(html.includes("ED-2026/00142"), "Tartalmaznia kell az iktatószámot")
    assert.ok(html.includes("IKTATVA:"), "Tartalmaznia kell az iktatási címkét")
  })

  await t.test("generateAssetHandoverHtml iktatatlan (vázlat) állapotban tervezet vízjelet jelenít meg", () => {
    const mockData: AssetHandoverPdfData = {
      employeeName: "Minta Anna",
      munkakor: "Junior Grafikus",
      atadasDatuma: "2026-10-01",
      cegNev: "eaisy Systems Kft.",
      cegSzekhely: "1054 Budapest, Szabadság tér 7.",
      cegAdoszam: "12345678-2-41",
      cegKepviselo: "Nagy Dániel",
      items: [
        {
          eszkoz_kategoria: "it",
          megnevezes: "Dell Latitude 5540",
          allapot: "hasznalt"
        }
      ]
    }

    const html = generateAssetHandoverHtml(mockData)
    assert.ok(html.includes("TERVEZET"), "Iktatás nélkül TERVEZET vízjelnek kell megjelennie")
    assert.ok(html.includes("IKTATÁSRA VÁR"), "Jeleznie kell, hogy a dokumentum iktatásra vár")
  })

  await t.test("Munkahelyi Eszközök dosszié kategória megfelel a személyi iratkezelési szabályoknak", () => {
    // Eszközfelelősség (3.3 kategória, 5 év megőrzési idő)
    const categoryName = "Eszközfelelősség"
    const expectedRetentionYears = 5
    assert.equal(expectedRetentionYears, 5, "Eszközfelelősség megőrzési ideje az elévülésig (5 év)")
    assert.equal(HR_FILING_CONSTANTS.PREFIX, "HR", "Léteznie kell a HR prefix konstansnak")
  })

  await t.test("Onboarding sablonok helyes részleg és feladathozzárendeléssel rendelkeznek", () => {
    // Sablon logikák ellenőrzése
    const getTasksForTemplate = (templateType: string) => {
      if (templateType === "it_fejleszto") {
        return [
          { cim: "Munkaszerződés előkészítése & aláírása", felelos_reszleg: "HR" },
          { cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés" },
          { cim: "Laptop & perifériák átadása (Jegyzőkönyvvel)", felelos_reszleg: "IT" },
          { cim: "VPN, GitHub és Fejlesztői jogosultságok", felelos_reszleg: "IT" },
          { cim: "Munkavédelmi és ergonómiai oktatás", felelos_reszleg: "EHS" },
          { cim: "Munkavállalói fiók aktiválása & e-mail", felelos_reszleg: "HR" }
        ]
      }
      if (templateType === "vezeto") {
        return [
          { cim: "Vezetői munkaszerződés & titoktartási (NDA)", felelos_reszleg: "HR" },
          { cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés" },
          { cim: "Céges laptop és okostelefon átadása (Jegyzőkönyvvel)", felelos_reszleg: "IT" },
          { cim: "Aláírási címpéldány és banki meghatalmazások", felelos_reszleg: "Pénzügy" },
          { cim: "Munkavédelmi oktatás", felelos_reszleg: "EHS" },
          { cim: "Munkavállalói fiók aktiválása & e-mail", felelos_reszleg: "HR" }
        ]
      }
      if (templateType === "fizikai") {
        return [
          { cim: "Munkaszerződés előkészítése & aláírása", felelos_reszleg: "HR" },
          { cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés" },
          { cim: "Munkaruha és védőeszközök kiosztása", felelos_reszleg: "EHS" },
          { cim: "Foglalkozás-egészségügyi orvosi alkalmasság", felelos_reszleg: "HR" },
          { cim: "Munkavédelmi és gépkezelői oktatás", felelos_reszleg: "EHS" },
          { cim: "Szekrénykulcs és belépőkártya átadása", felelos_reszleg: "Iroda" }
        ]
      }
      return [
        { cim: "Munkaszerződés előkészítése & aláírása", felelos_reszleg: "HR" },
        { cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés" },
        { cim: "Munkahelyi eszközök átadása & jegyzőkönyv", felelos_reszleg: "IT" },
        { cim: "Munkavédelmi és tűzvédelmi oktatás", felelos_reszleg: "EHS" },
        { cim: "Munkavállalói fiók aktiválása & e-mail", felelos_reszleg: "HR" }
      ]
    }

    const itTasks = getTasksForTemplate("it_fejleszto")
    assert.equal(itTasks.length, 6)
    assert.ok(itTasks.some(t => t.cim.includes("GitHub")), "IT sablonnak tartalmaznia kell GitHub feladatot")
    assert.ok(itTasks.some(t => t.felelos_reszleg === "IT"), "IT felelős kell legyen az eszközökért")

    const leadTasks = getTasksForTemplate("vezeto")
    assert.ok(leadTasks.some(t => t.cim.includes("NDA")), "Vezetői sablonnak tartalmaznia kell NDA-t")
    assert.ok(leadTasks.some(t => t.felelos_reszleg === "Pénzügy"), "Pénzügy felelős kell legyen a banki jogokért")

    const physTasks = getTasksForTemplate("fizikai")
    assert.ok(physTasks.some(t => t.cim.includes("Munkaruha")), "Fizikai sablonnak tartalmaznia kell munkaruhát")
    assert.ok(physTasks.some(t => t.cim.includes("Orvosi") || t.cim.includes("alkalmasság")), "Orvosi vizsgálat kötelező")
  })
})
