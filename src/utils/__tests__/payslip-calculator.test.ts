import test from "node:test"
import assert from "node:assert/strict"
import {
  calculatePayslipDetails,
  formatHufCurrency,
  acknowledgePayslipReceipt,
  type PayslipCalculationInput
} from "../hr/payslip-calculator"

test("Payslip Calculator (Mt. 155. §)", async (t) => {
  await t.test("1. Alapeset: Teljes havi munkavégzés, kedvezmények nélkül (600.000 Ft bruttó)", () => {
    const input: PayslipCalculationInput = {
      bruttoAlapber: 600000,
      tervezettMunkanap: 20,
      ledolgozottMunkanap: 20,
      ledolgozottMunkaora: 160,
      szabadsagNap: 0,
      betegszabadsagNap: 0,
      tuloraOra: 0,
      bonuszJutalom: 0,
      cafeteriaBrutto: 0,
      kedvezmeny25EvAlatti: false,
      csaladiKedvezmenyOsszeg: 0,
      egyebAdokedvezmeny: 0,
      letiltasLevonas: 0
    }

    const res = calculatePayslipDetails(input)

    assert.equal(res.bruttoOsszesen, 600000)
    assert.equal(res.alapberReszlet, 600000)
    // SZJA 15%: 90.000 Ft
    assert.equal(res.szjaLevonas, 90000)
    // TB járulék 18.5%: 111.000 Ft
    assert.equal(res.tbJarulekLevonas, 111000)
    // Összes levonás: 201.000 Ft (33.5%)
    assert.equal(res.levonasokOsszesen, 201000)
    // Nettó: 600.000 - 201.000 = 399.000 Ft (66.5%)
    assert.equal(res.nettoKifizetendo, 399000)
    // SZOCHO (13% munkáltatói teher): 78.000 Ft
    assert.equal(res.szochoMunkaltatoi, 78000)
  })

  await t.test("2. Távollétek: 15 nap munka + 3 nap fizetett szabadság + 2 nap betegszabadság (Mt. 146. § 70%)", () => {
    const input: PayslipCalculationInput = {
      bruttoAlapber: 600000,
      tervezettMunkanap: 20,
      ledolgozottMunkanap: 15,
      ledolgozottMunkaora: 120,
      szabadsagNap: 3,
      betegszabadsagNap: 2,
      tuloraOra: 0,
      bonuszJutalom: 0,
      cafeteriaBrutto: 0,
      kedvezmeny25EvAlatti: false,
      csaladiKedvezmenyOsszeg: 0,
      egyebAdokedvezmeny: 0,
      letiltasLevonas: 0
    }

    const res = calculatePayslipDetails(input)

    // Napi bér: 600.000 / 20 = 30.000 Ft
    // 15 nap munka: 450.000 Ft
    assert.equal(res.alapberReszlet, 450000)
    // 3 nap szabadság: 3 * 30.000 = 90.000 Ft
    assert.equal(res.szabadsagDij, 90000)
    // 2 nap betegszabadság (70%): 2 * 30.000 * 0.7 = 42.000 Ft
    assert.equal(res.betegszabadsagDij, 42000)
    // Bruttó összesen: 450.000 + 90.000 + 42.000 = 582.000 Ft
    assert.equal(res.bruttoOsszesen, 582000)
    // SZJA 15%: 87.300 Ft
    assert.equal(res.szjaLevonas, 87300)
    // TB 18.5%: 107.670 Ft
    assert.equal(res.tbJarulekLevonas, 107670)
    // Nettó: 582.000 - 194.970 = 387.030 Ft
    assert.equal(res.nettoKifizetendo, 387030)
  })

  await t.test("3. 25 év alattiak SZJA mentessége (törvényi keretig 0% SZJA)", () => {
    const input: PayslipCalculationInput = {
      bruttoAlapber: 500000,
      tervezettMunkanap: 20,
      ledolgozottMunkanap: 20,
      ledolgozottMunkaora: 160,
      szabadsagNap: 0,
      betegszabadsagNap: 0,
      tuloraOra: 0,
      bonuszJutalom: 0,
      cafeteriaBrutto: 0,
      kedvezmeny25EvAlatti: true, // Teljes SZJA mentesség a bérre
      csaladiKedvezmenyOsszeg: 0,
      egyebAdokedvezmeny: 0,
      letiltasLevonas: 0
    }

    const res = calculatePayslipDetails(input)

    assert.equal(res.bruttoOsszesen, 500000)
    // 25 év alatti kedvezmény miatt SZJA = 0 Ft
    assert.equal(res.szjaLevonas, 0)
    // TB járulék marad 18.5%: 92.500 Ft
    assert.equal(res.tbJarulekLevonas, 92500)
    // Nettó: 500.000 - 92.500 = 407.500 Ft (81.5%)
    assert.equal(res.nettoKifizetendo, 407500)
    assert.equal(res.kedvezmenyekOsszesen, 75000) // Megtakarított 15% SZJA
  })

  await t.test("4. Családi adókedvezmény és bírósági letiltás érvényesítése", () => {
    const input: PayslipCalculationInput = {
      bruttoAlapber: 600000,
      tervezettMunkanap: 20,
      ledolgozottMunkanap: 20,
      ledolgozottMunkaora: 160,
      szabadsagNap: 0,
      betegszabadsagNap: 0,
      tuloraOra: 0,
      bonuszJutalom: 0,
      cafeteriaBrutto: 0,
      kedvezmeny25EvAlatti: false,
      csaladiKedvezmenyOsszeg: 40000, // 2 gyermek után 40.000 Ft nettó adókedvezmény
      egyebAdokedvezmeny: 0,
      letiltasLevonas: 50000 // 50.000 Ft bírósági letiltás
    }

    const res = calculatePayslipDetails(input)

    // SZJA alap: 600.000 -> 15% = 90.000 Ft. Családi kedvezmény: -40.000 Ft -> 50.000 Ft fizetendő SZJA
    assert.equal(res.szjaLevonas, 50000)
    assert.equal(res.tbJarulekLevonas, 111000)
    assert.equal(res.letiltasEgyebLevonas, 50000)
    // Levonások: 50.000 (SZJA) + 111.000 (TB) + 50.000 (letiltás) = 211.000 Ft
    assert.equal(res.levonasokOsszesen, 211000)
    // Nettó: 600.000 - 211.000 = 389.000 Ft
    assert.equal(res.nettoKifizetendo, 389000)
  })

  await t.test("5. Digitális átvételi nyugtázás állapota és érvényesítése (Mt. 155. §)", () => {
    const acknowledged = acknowledgePayslipReceipt({
      currentStatus: "kikuldve",
      dolgozoId: "emp-123",
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 Chrome",
      acknowledgedAt: new Date("2026-10-10T10:30:00Z")
    })

    assert.equal(acknowledged.statusz, "atveve")
    assert.equal(acknowledged.atvetelDatuma, "2026-10-10T10:30:00.000Z")
    assert.equal(acknowledged.isAcknowledged, true)
    assert.match(acknowledged.auditLogText, /Elektronikusan átvéve és nyugtázva/)
  })

  await t.test("6. Pénznem formázás (HUF)", () => {
    assert.equal(formatHufCurrency(600000), "600 000 Ft")
    assert.equal(formatHufCurrency(0), "0 Ft")
  })
})
