import test from "node:test"
import assert from "node:assert/strict"
import { generatePayslipHtml, type PayslipPdfData } from "../hr/payslip-pdf-generator"

test("Payslip PDF HTML Generator (Mt. 155. §)", async (t) => {
  const sampleData: PayslipPdfData = {
    ev: 2026,
    honap: 10,
    honapNev: "Október",
    munkaltatoNev: "Think AI Kft.",
    munkaltatoCim: "1054 Budapest, Szabadság tér 7.",
    munkaltatoAdoszam: "12345678-2-41",
    dolgozoNev: "Kovács János",
    adoazonosito: "8421098765",
    tajSzam: "123 456 789",
    munkakor: "Senior Szoftverfejlesztő",
    feorKod: "2142",
    reszleg: "Fejlesztés",
    bankszamlaszam: "11773016-12345678-00000000",
    tervezettMunkanap: 22,
    ledolgozottMunkanap: 20,
    ledolgozottMunkaora: 160,
    szabadsagNap: 2,
    betegszabadsagNap: 0,
    tuloraOra: 5,
    bruttoAlapber: 700000,
    alapberReszlet: 636364,
    szabadsagDij: 63636,
    betegszabadsagDij: 0,
    tuloraPotlek: 29886,
    bonuszJutalom: 50000,
    cafeteriaBrutto: 35000,
    bruttoOsszesen: 814886,
    kedvezmeny25EvAlatti: false,
    csaladiKedvezmenyOsszeg: 40000,
    egyebAdokedvezmeny: 0,
    adokedvezmenyekOsszesen: 40000,
    szjaLevonas: 82233,
    tbJarulekLevonas: 150754,
    letiltasEgyebLevonas: 0,
    levonasokOsszesen: 232987,
    nettoKifizetendo: 581899,
    szochoMunkaltatoi: 105935,
    kifizetesHatarido: "2026. november 10.",
    kifizetesModja: "Banki átutalás",
    statusz: "atveve",
    atvetelDatuma: "2026-10-10T09:15:00Z",
    atvetelIp: "192.168.1.55"
  }

  await t.test("Generálja a fejlécet és dolgozói azonosítókat", () => {
    const html = generatePayslipHtml(sampleData)
    assert.match(html, /HAVI MUNKABÉR ELSZÁMOLÁS/)
    assert.match(html, /Kovács János/)
    assert.match(html, /8421098765/)
    assert.match(html, /123 456 789/)
    assert.match(html, /Think AI Kft\./)
  })

  await t.test("Tartalmazza a bruttó tételeket, levonásokat és nettót", () => {
    const html = generatePayslipHtml(sampleData)
    assert.match(html, /700 000 Ft/)
    assert.match(html, /581 899 Ft/)
    assert.match(html, /Személyi jövedelemadó előleg \(SZJA 15%\)/)
    assert.match(html, /Társadalombiztosítási járulék \(TB járulék 18,5%\)/)
    assert.match(html, /Családi adókedvezmény: 40 000 Ft/)
  })

  await t.test("Megjeleníti az elektronikus átvételi nyugtázási záradékot (Mt. 155. §)", () => {
    const html = generatePayslipHtml(sampleData)
    assert.match(html, /ELEKTRONIKUSAN ÁTVÉVE ÉS NYUGTÁZVA/)
    assert.match(html, /192\.168\.1\.55/)
  })
})
