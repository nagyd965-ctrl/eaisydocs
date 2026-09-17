import assert from "node:assert"
import { generateDisposalProtocolPdf, DisposalProtocolData } from "../disposal-protocol-pdf"

console.log("Starting Disposal Protocol PDF Unit Tests...")

async function runTests() {
  // Test 1: Standard PDF generation with mixed disposal items
  console.log("Test 1: Generating standard disposal protocol PDF...")
  const mockData: DisposalProtocolData = {
    protocolNumber: "SELEJT-2026/001",
    date: "2026.09.17",
    cutoffDate: "2026.12.31",
    organizationName: "eaisyDocs Kft. Iratkezelő Rendszer",
    proposerName: "Iratkezelő Anna",
    approverName: "Vezető Viktor",
    items: [
      {
        iktatoszam: "ED-2021-00123",
        targy: "Közüzemi számlák és igazolások 2021",
        tetelszam: "101",
        tetelMegnevezes: "Pénzügyi bizonylatok",
        megorzesiEv: 5,
        megorzesiIdoVege: "2026-09-01",
        iratDarab: 4,
        selejtezheto: true,
      },
      {
        iktatoszam: "ED-2016-00045",
        targy: "Cég alapító okirat és cégbírósági végzések",
        tetelszam: "001",
        tetelMegnevezes: "Cégbírósági iratok",
        megorzesiEv: 10,
        megorzesiIdoVege: "2026-06-15",
        iratDarab: 2,
        selejtezheto: false, // Levéltári átadás
      },
    ],
  }

  const pdfBytes = await generateDisposalProtocolPdf(mockData)

  assert(pdfBytes instanceof Uint8Array, "Result must be a Uint8Array")
  assert(pdfBytes.length > 1000, `PDF size too small: ${pdfBytes.length} bytes`)

  // Check PDF magic header %PDF
  const header = String.fromCharCode(...pdfBytes.slice(0, 4))
  assert.strictEqual(header, "%PDF", "PDF header must start with %PDF")
  console.log(`✓ Test 1 passed! Generated PDF length: ${pdfBytes.length} bytes`)

  // Test 2: Multi-item pagination test
  console.log("Test 2: Generating multi-item paginated protocol PDF...")
  const multiItemData: DisposalProtocolData = {
    protocolNumber: "SELEJT-2026/002",
    date: "2026.09.17",
    cutoffDate: "2025.12.31",
    proposerName: "Kovács Béla",
    approverName: "Nagy Dániel",
    items: Array.from({ length: 40 }, (_, i) => ({
      iktatoszam: `ED-2020-${String(i + 1).padStart(4, "0")}`,
      targy: `Ügyirat tárgy tesztelés ${i + 1}`,
      tetelszam: "202",
      tetelMegnevezes: "Általános ügyiratok",
      megorzesiIdoVege: "2025-12-31",
      iratDarab: 1,
      selejtezheto: i % 3 !== 0,
    })),
  }

  const multiPdfBytes = await generateDisposalProtocolPdf(multiItemData)
  assert(multiPdfBytes.length > 5000, `Paginated PDF size too small: ${multiPdfBytes.length} bytes`)
  console.log(`✓ Test 2 passed! Multi-page PDF length: ${multiPdfBytes.length} bytes`)

  console.log("\nALL DISPOSAL PROTOCOL PDF TESTS PASSED SUCCESSFULLY! ✓")
}

runTests().catch((err) => {
  console.error("Test failed with error:", err)
  process.exit(1)
})
