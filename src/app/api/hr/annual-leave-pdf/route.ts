import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateAnnualLeavePdfBuffer } from "@/utils/hr/annual-leave-pdf-generator"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get("employeeId")
    const yearStr = searchParams.get("year")
    const isPreview = searchParams.get("preview") === "true"

    if (!employeeId || !yearStr) {
      return new NextResponse("Hiányzó paraméterek (employeeId, year)", { status: 400 })
    }

    const year = parseInt(yearStr, 10)
    if (isNaN(year) || year < 2000 || year > 2100) {
      return new NextResponse("Érvénytelen év paraméter", { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Nincs bejelentkezve", { status: 401 })
    }

    // Biztonsági ellenőrzés: saját vagy HR / Admin
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("hr_szerepkor")
      .eq("id", user.id)
      .single()

    const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin"].includes(profile?.hr_szerepkor || "")
    const isOwn = employeeId === user.id

    if (!isOwn && !isHrOrAdmin) {
      return new NextResponse("Nincs jogosultsága a szabadság-nyilvántartás megtekintéséhez", { status: 403 })
    }

    const { buffer, employeeName } = await generateAnnualLeavePdfBuffer(supabase, employeeId, year)

    const dispositionType = isPreview ? "inline" : "attachment"
    const safeFilename = encodeURIComponent(`Eves_Szabadsag_Nyilvantartas_${employeeName}_${year}.pdf`)

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error: any) {
    console.error("Hiba az éves szabadság-nyilvántartás PDF generálása során:", error)
    return new NextResponse("Belső hiba a PDF generálása során: " + (error?.message || "Ismeretlen hiba"), { status: 500 })
  }
}
