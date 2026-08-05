"use server"

import { createClient } from "@/utils/supabase/server"

export async function exportSecurityPolicyPdf() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle("IT Biztonsagi Szabalyzat")
  pdfDoc.setAuthor("eaisyDocs")
  pdfDoc.setCreator("eaisyDocs - Elektronikus Iratkezelő Rendszer")
  pdfDoc.setCreationDate(new Date())

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28 // A4
  const pageHeight = 841.89
  const margin = 55
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 14
  const headingLineHeight = 22

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  // Clean helper to replace non-WinAnsi characters (ő/ű) with ö/ü
  const clean = (text: string): string => {
    return text
      .replace(/ő/g, "ö")
      .replace(/Ő/g, "Ö")
      .replace(/ű/g, "ü")
      .replace(/Ű/g, "Ü")
  }

  // --- Fejléc ---
  page.drawText(clean("IT BIZTONSÁGI SZABÁLYZAT"), {
    x: margin, y, size: 18, font: helveticaBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 6
  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 2, color: rgb(0.01, 0.72, 0.80), // Fintech Teal
  })
  y -= lineHeight * 1.5

  page.drawText(clean("Az eaisyDocs Elektronikus Iratkezelő Rendszer Szállítói IT Biztonsági Szabályzata."), {
    x: margin, y, size: 9, font: helveticaBold, color: rgb(0.3, 0.3, 0.3),
  })
  y -= lineHeight
  page.drawText(clean("Verzió: 1.0 | Utolsó frissítés: 2026. július"), {
    x: margin, y, size: 8, font: helvetica, color: rgb(0.5, 0.5, 0.5),
  })
  y -= lineHeight * 2

  const policySections = [
    {
      title: "1. Bevezető rendelkezések",
      paragraphs: [
        "Jelen szabályzat célja, hogy rögzítse az eaisyDocs rendszerben tárolt üzleti és személyes adatok védelmének technikai és logikai kereteit. A rendszer tervezése és fejlesztése során a 'Security by Design' és a legkisebb jogosultság (Principle of Least Privilege) elveit alkalmaztuk."
      ]
    },
    {
      title: "2. Hitelesítés és Jelszó Házirend",
      paragraphs: [
        "• Erős hitelesítés: A rendszerbe történő belépés kizárólag regisztrált e-mail cím és jelszó párosával lehetséges (Supabase Auth).",
        "• Jelszókövetelmények: A felhasználói jelszavaknak minimum 6 karakter hosszúságúnak kell lenniük. A jelszavak tárolása biztonságos, egyirányú titkosítással (Bcrypt hash) történik, visszafejtésük nem lehetséges.",
        "• Automatikus kijelentkeztetés (Session Timeout): Inaktivitás esetén a rendszer automatikusan megszakítja a munkamenetet. A határérték a rendszergazda által paraméterezhető (5, 15, 30 vagy 60 perc)."
      ]
    },
    {
      title: "3. Jogosultságkezelés (RBAC és RLS)",
      paragraphs: [
        "A hozzáférés-szabályozás adatbázis szinten, Row Level Security (RLS) technológiával valósul meg. Az adatokhoz való hozzáférés két dimenzió metszeteként dől el:",
        "a) Szerepkörök (Role-Based Access Control):",
        "  - rendszergazda: Teljes hozzáférés a beállításokhoz és felhasználókhoz.",
        "  - iktato: Iratok érkeztetése, iktatása és metaadatok szerkesztése.",
        "  - vezeto: Ügyek szignálása, felelősök kijelölése, minden irat megtekintése.",
        "  - ugyintezo: Csak a rászignált ügyiratok kezelése.",
        "  - betekinto: Kizárólag olvasási jog (letöltés nélkül).",
        "  - auditor: Olvasási jog az iratokra és az audit naplóra (esemeny_naplo).",
        "b) Biztonsági Minősítés:",
        "Minden felhasználó és minden dokumentum rendelkezik egy minősítési szinttel (Nyílt, Belső, Bizalmas, Szigorúan Bizalmas). A felhasználó csak azokat a dokumentumokat érheti el, amelyek minősítési szintje nem haladja meg az ő saját biztonsági minősítését."
      ]
    },
    {
      title: "4. Naplózás és Nyomonkövethetőség (Audit Trail)",
      paragraphs: [
        "A rendszer minden kritikus műveletet (bejelentkezés, irat megtekintés, letöltés, módosítás, törlés) egy központosított esemeny_naplo táblában rögzít.",
        "• Append-only kialakítás: Az audit naplóhoz adatbázis szinten letiltottuk az UPDATE és DELETE jogosultságokat. A naplóbejegyzések utólagos módosítása még Rendszergazda jogosultsággal sem lehetséges.",
        "• A napló rögzíti a pontos időbélyeget, a felhasználó azonosítóját, az IP címet és a művelet típusát."
      ]
    },
    {
      title: "5. Adatvédelem, Adattárolás és Integritás",
      paragraphs: [
        "A feltöltött fizikai fájlok (PDF, Word, stb.) védelme kiemelt prioritású.",
        "• Zárt tárolás: A fájlok a Supabase Storage privát vödreiben (private buckets) kapnak helyet. Publikus URL-en keresztül semmilyen dokumentum nem érhető el.",
        "• Lejáró tokenek: Letöltéskor vagy megtekintéskor a rendszer egy rövid életű (60 másodperces), titkosítással aláírt (signed) URL-t generál, amely a lejárati idő után automatikusan érvényét veszti.",
        "• Fájl integritás: Minden feltöltött állományról a rendszer azonnal kiszámít egy SHA-256 hash értéket (digitális ujjlenyomat), amelyet az adatbázisban tárol. Ez biztosítja a dokumentumok sértetlenségének és eredetiségének utólagos bizonyíthatóságát."
      ]
    }
  ]

  // Szövegkiírás oldaltörés-kezeléssel
  const writeText = (text: string, font: any, size: number, isParagraph = true) => {
    const cleanedText = clean(text)
    const words = cleanedText.split(" ")
    let currentLine = ""

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = font.widthOfTextAtSize(testLine, size)

      if (textWidth > contentWidth) {
        if (y < margin + lineHeight * 2) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin
        }
        page.drawText(currentLine, { x: margin, y, size, font, color: rgb(0.15, 0.15, 0.15) })
        y -= lineHeight
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      if (y < margin + lineHeight * 2) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawText(currentLine, { x: margin, y, size, font, color: rgb(0.15, 0.15, 0.15) })
      y -= isParagraph ? lineHeight * 1.5 : lineHeight
    }
  }

  // Ciklus a szekciókon
  for (const section of policySections) {
    if (y < margin + headingLineHeight * 2) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }

    // Szekció cím
    page.drawText(clean(section.title), {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: rgb(0.01, 0.72, 0.80) // Teal
    })
    y -= headingLineHeight

    // Szekció bekezdések
    for (const paragraph of section.paragraphs) {
      writeText(paragraph, helvetica, 9.5, true)
    }
    y -= 5 // extra térköz a szekciók között
  }

  // --- Lábléc minden oldalra ---
  const pages = pdfDoc.getPages()
  const dateStr = new Date().toLocaleDateString("hu-HU")
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    p.drawText(clean(`Oldal ${i + 1} / ${pages.length} | eaisyDocs Elektronikus Iratkezelő Rendszer | Generálva: ${dateStr}`), {
      x: margin,
      y: 30,
      size: 7,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    })
  }

  const pdfBytes = await pdfDoc.save()
  const base64 = Buffer.from(pdfBytes).toString("base64")

  return { success: true, base64, filename: "eaisyDocs_IT_Biztonsagi_Szabalyzat.pdf" }
}
