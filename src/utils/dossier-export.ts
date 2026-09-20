"use client"

import { toast } from "sonner"
import * as XLSX from "xlsx"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export interface DossierExportItem {
  id: string
  iktatoszam: string
  statusz: string
  iktatas_datuma: string
  megorzesi_ido_vege?: string | null
  szervezeti_egyseg_id?: string
  szervezeti_egyseg?: {
    nev?: string | null
  } | null
  ugy?: {
    id?: string
    targy?: string
    hatarido?: string
    statusz?: string
    felelos_user_id?: string
    felelos_user?: {
      id?: string
      full_name?: string
    }
  } | null
  irat?: Array<{
    id: string
    minosites?: string
  }>
}

export function formatDossierStatus(statusz?: string | null): string {
  switch (statusz) {
    case "iktatva":
      return "Iktatva"
    case "folyamatban":
      return "Folyamatban"
    case "lezart":
      return "Lezárva"
    case "irattarban":
      return "Irattárban"
    case "selejtezheto":
      return "Selejtezhető"
    case "selejtezett":
      return "Selejtezett"
    default:
      return statusz || "-"
  }
}

// WinAnsi kompatibilis karaktertisztító (ő/ű -> ö/ü)
function cleanText(text: string | null | undefined): string {
  if (!text) return ""
  return String(text)
    .replace(/ő/g, "ö")
    .replace(/Ő/g, "Ö")
    .replace(/ű/g, "ü")
    .replace(/Ű/g, "Ü")
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + "…"
}

/**
 * CSV Export
 */
export function exportDossiersToCsv(data: DossierExportItem[]) {
  if (!data || data.length === 0) {
    toast.error("Nincs exportálható ügyirat!")
    return
  }

  const headers = [
    "Iktatószám",
    "Tárgy",
    "Állapot",
    "Felelős",
    "Szervezeti egység",
    "Iktatás Dátuma",
    "Határidő",
    "Megőrzés vége",
    "Iratok száma",
  ]

  const rows = data.map((item) => {
    const iktatoszam = item.iktatoszam || ""
    const targy = item.ugy?.targy || ""
    const statusz = formatDossierStatus(item.statusz)
    const felelos = item.ugy?.felelos_user?.full_name || "-"
    const szerv = item.szervezeti_egyseg?.nev || "-"
    const iktatasDatuma = item.iktatas_datuma
      ? new Date(item.iktatas_datuma).toLocaleDateString("hu-HU")
      : "-"
    const hatarido = item.ugy?.hatarido
      ? new Date(item.ugy.hatarido).toLocaleDateString("hu-HU")
      : "-"
    const megorzesVege = item.megorzesi_ido_vege
      ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU")
      : "-"
    const iratokSzama = String(item.irat?.length || 0)

    return [
      iktatoszam,
      targy,
      statusz,
      felelos,
      szerv,
      iktatasDatuma,
      hatarido,
      megorzesVege,
      iratokSzama,
    ]
      .map((val) => `"${String(val).replace(/"/g, '""')}"`)
      .join(";")
  })

  const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  downloadBlob(blob, `iktatokonyv_export_${getTodayString()}.csv`)
  toast.success("CSV export sikeresen letöltve!")
}

/**
 * Formázott Excel (.xlsx) Export
 */
export function exportDossiersToXlsx(data: DossierExportItem[]) {
  if (!data || data.length === 0) {
    toast.error("Nincs exportálható ügyirat!")
    return
  }

  const exportRows = data.map((item) => ({
    "Iktatószám": item.iktatoszam || "",
    "Tárgy": item.ugy?.targy || "",
    "Állapot": formatDossierStatus(item.statusz),
    "Felelős": item.ugy?.felelos_user?.full_name || "-",
    "Szervezeti egység": item.szervezeti_egyseg?.nev || "-",
    "Iktatás dátuma": item.iktatas_datuma
      ? new Date(item.iktatas_datuma).toLocaleDateString("hu-HU")
      : "-",
    "Ügyintézési határidő": item.ugy?.hatarido
      ? new Date(item.ugy.hatarido).toLocaleDateString("hu-HU")
      : "-",
    "Megőrzési idő vége": item.megorzesi_ido_vege
      ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU")
      : "-",
    "Iratok száma": item.irat?.length ? `${item.irat.length} db` : "0 db",
  }))

  const ws = XLSX.utils.json_to_sheet(exportRows)

  // Oszlopszélességek beállítása
  ws["!cols"] = [
    { wch: 18 }, // Iktatószám
    { wch: 38 }, // Tárgy
    { wch: 14 }, // Állapot
    { wch: 22 }, // Felelős
    { wch: 20 }, // Szervezeti egység
    { wch: 16 }, // Iktatás dátuma
    { wch: 18 }, // Ügyintézési határidő
    { wch: 18 }, // Megőrzési idő vége
    { wch: 14 }, // Iratok száma
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Iktatókönyv")

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  downloadBlob(blob, `iktatokonyv_${getTodayString()}.xlsx`)
  toast.success("Excel (.xlsx) export sikeresen elkészült!")
}

/**
 * Hivatalos Iktatókönyv PDF Generálás
 */
export async function exportDossiersToPdf(data: DossierExportItem[]) {
  if (!data || data.length === 0) {
    toast.error("Nincs exportálható ügyirat!")
    return
  }

  const toastId = toast.loading("Hivatalos Iktatókönyv PDF összeállítása...")

  try {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.setTitle("Hivatalos Iktatókönyv Kivonat — eaisyDocs")
    pdfDoc.setAuthor("eaisyDocs Elektronikus Iratkezelő Rendszer")
    pdfDoc.setCreator("eaisyDocs v1.0")
    pdfDoc.setCreationDate(new Date())

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // A4 fekvő tájolás
    const pageWidth = 841.89
    const pageHeight = 595.28
    const margin = 36
    const contentWidth = pageWidth - margin * 2
    const rowHeight = 19

    // Oszlopok definíciója
    const columns = [
      { id: "ssz", label: "Ssz.", width: 28, align: "center" },
      { id: "iktatoszam", label: "Iktatószám", width: 110, align: "left" },
      { id: "targy", label: "Tárgy", width: 240, align: "left" },
      { id: "statusz", label: "Állapot", width: 75, align: "left" },
      { id: "felelos", label: "Felelős", width: 95, align: "left" },
      { id: "szerv", label: "Szervezeti egység", width: 85, align: "left" },
      { id: "iktatva", label: "Iktatás", width: 68, align: "left" },
      { id: "hatarido", label: "Határidő", width: 68, align: "left" },
    ]

    const tealColor = rgb(0.01, 0.72, 0.80)
    const darkText = rgb(0.12, 0.14, 0.17)
    const mutedText = rgb(0.42, 0.46, 0.52)
    const borderColor = rgb(0.82, 0.85, 0.90)
    const headerBg = rgb(0.94, 0.96, 0.98)
    const altRowBg = rgb(0.98, 0.99, 1.0)

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let currentY = pageHeight - margin

    const drawHeader = (isFirstPage: boolean) => {
      if (isFirstPage) {
        // Cím és fejlécek
        page.drawText(cleanText("HIVATALOS IKTATÓKÖNYVI KIVONAT"), {
          x: margin,
          y: currentY - 14,
          size: 15,
          font: helveticaBold,
          color: darkText,
        })

        page.drawText(cleanText("eaisyDocs Elektronikus Iratkezelő Rendszer"), {
          x: margin,
          y: currentY - 26,
          size: 8.5,
          font: helveticaOblique,
          color: tealColor,
        })

        const dateStr = new Date().toLocaleString("hu-HU")
        const rightInfo = cleanText(`Kelt: ${dateStr}  |  Iktatott tételek: ${data.length} db`)
        const rightInfoWidth = helvetica.widthOfTextAtSize(rightInfo, 8.5)
        page.drawText(rightInfo, {
          x: pageWidth - margin - rightInfoWidth,
          y: currentY - 18,
          size: 8.5,
          font: helvetica,
          color: mutedText,
        })

        currentY -= 36

        // Díszítő vonal
        page.drawLine({
          start: { x: margin, y: currentY },
          end: { x: pageWidth - margin, y: currentY },
          thickness: 1.5,
          color: tealColor,
        })

        currentY -= 12
      } else {
        currentY = pageHeight - margin
        page.drawText(cleanText("HIVATALOS IKTATÓKÖNYVI KIVONAT (Folytatás)"), {
          x: margin,
          y: currentY - 10,
          size: 10,
          font: helveticaBold,
          color: mutedText,
        })
        currentY -= 20
      }

      // Táblázat Fejléc Háttér
      page.drawRectangle({
        x: margin,
        y: currentY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: headerBg,
        borderColor: borderColor,
        borderWidth: 0.5,
      })

      // Oszlopnevek
      let colX = margin
      for (const col of columns) {
        page.drawText(cleanText(col.label), {
          x: colX + 4,
          y: currentY - 13,
          size: 8,
          font: helveticaBold,
          color: darkText,
        })
        colX += col.width
      }

      currentY -= rowHeight
    }

    drawHeader(true)

    // Sorok kirajzolása
    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      // Ha nem fér ki a következő sor és a lábléc, új oldal
      if (currentY - rowHeight < margin + 24) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        currentY = pageHeight - margin
        drawHeader(false)
      }

      // Váltakozó sorszín
      if (i % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: altRowBg,
        })
      }

      // Vízszintes elválasztó vonal
      page.drawLine({
        start: { x: margin, y: currentY - rowHeight },
        end: { x: pageWidth - margin, y: currentY - rowHeight },
        thickness: 0.5,
        color: borderColor,
      })

      // Cella adatok
      const ssz = String(i + 1)
      const iktatoszam = item.iktatoszam || "-"
      const targy = truncateText(cleanText(item.ugy?.targy || "-"), 42)
      const statusz = cleanText(formatDossierStatus(item.statusz))
      const felelos = truncateText(cleanText(item.ugy?.felelos_user?.full_name || "-"), 16)
      const szerv = truncateText(cleanText(item.szervezeti_egyseg?.nev || "-"), 14)
      const iktatva = item.iktatas_datuma
        ? new Date(item.iktatas_datuma).toLocaleDateString("hu-HU")
        : "-"
      const hatarido = item.ugy?.hatarido
        ? new Date(item.ugy.hatarido).toLocaleDateString("hu-HU")
        : "-"

      const rowValues = [
        ssz,
        iktatoszam,
        targy,
        statusz,
        felelos,
        szerv,
        iktatva,
        hatarido,
      ]

      let colX = margin
      for (let c = 0; c < columns.length; c++) {
        const val = rowValues[c]
        const colDef = columns[c]
        const textY = currentY - 13

        if (c === 1) {
          // Iktatószám kiemelt betűtípussal
          page.drawText(val, {
            x: colX + 4,
            y: textY,
            size: 7.5,
            font: helveticaBold,
            color: rgb(0.05, 0.45, 0.55),
          })
        } else {
          page.drawText(val, {
            x: colX + 4,
            y: textY,
            size: 7.5,
            font: helvetica,
            color: c === 0 ? mutedText : darkText,
          })
        }

        colX += colDef.width
      }

      currentY -= rowHeight
    }

    // Lábléc minden oldalra (oldalszámozás)
    const pages = pdfDoc.getPages()
    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const p = pages[pIdx]
      const footerText = cleanText(
        `Oldal ${pIdx + 1} / ${pages.length}   •   eaisyDocs Elektronikus Iratkezelő Rendszer   •   Szigorú számadású nyilvántartás`
      )
      const footerWidth = helvetica.widthOfTextAtSize(footerText, 7.5)
      p.drawText(footerText, {
        x: (pageWidth - footerWidth) / 2,
        y: margin - 12,
        size: 7.5,
        font: helvetica,
        color: mutedText,
      })
    }

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" })
    downloadBlob(blob, `iktatokonyv_${getTodayString()}.pdf`)

    toast.dismiss(toastId)
    toast.success("Hivatalos Iktatókönyv PDF sikeresen letöltve!")
  } catch (err: any) {
    console.error("PDF generálási hiba:", err)
    toast.dismiss(toastId)
    toast.error("Nem sikerült előállítani a PDF iktatókönyvet: " + (err.message || ""))
  }
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
