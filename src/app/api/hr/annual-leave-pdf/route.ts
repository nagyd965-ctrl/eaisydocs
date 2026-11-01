import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateAnnualLeavePdfBuffer } from "@/utils/hr/annual-leave-pdf-generator"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isUserAuthorizedForHrView } from "@/utils/hr/company-role-resolver"

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

    const activeCompanyId = await getActiveCompanyIdServer()
    if (!activeCompanyId) {
      return new NextResponse("Nincs kiválasztott aktív cég", { status: 403 })
    }

    const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)
    if (!scopedRoles.isCompanyAdmin && scopedRoles.hrRole === "none") {
      return new NextResponse("Nincs hozzáférése az aktív céghez", { status: 403 })
    }

    // Ellenőrizzük, hogy a cél dolgozó tagja-e az aktív cégnek
    const { data: targetMembership } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", activeCompanyId)
      .eq("user_id", employeeId)
      .maybeSingle()

    if (!targetMembership) {
      return new NextResponse("A dolgozó nem található az aktív cégben", { status: 404 })
    }

    const isHrOrAdmin =
      scopedRoles.isCompanyAdmin ||
      isUserAuthorizedForHrView(
        scopedRoles.hrRole,
        ["admin", "employees", "time", "payroll", "compliance", "auditor", "reports"],
        scopedRoles.hrModules
      )
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
