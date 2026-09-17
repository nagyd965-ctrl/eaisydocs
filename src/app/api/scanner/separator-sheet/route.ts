import { NextResponse } from "next/server"
import { generateSeparatorSheetPdf } from "@/utils/batch-scanner"

export async function GET() {
  try {
    const pdfBuffer = await generateSeparatorSheetPdf()

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="eaisyDocs_elvalaszto_lap.pdf"',
      },
    })
  } catch (error: any) {
    console.error("[SeparatorSheetAPI] Error generating separator sheet:", error)
    return NextResponse.json(
      { error: "Nem sikerült legenerálni az elválasztólapot: " + error.message },
      { status: 500 }
    )
  }
}
