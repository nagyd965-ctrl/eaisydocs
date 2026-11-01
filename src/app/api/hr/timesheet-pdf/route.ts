import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateTimesheetPdfBuffer } from "@/utils/hr/timesheet-pdf-generator"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isUserAuthorizedForHrView } from "@/utils/hr/company-role-resolver"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get("employeeId")
    const yearStr = searchParams.get("year")
    const monthStr = searchParams.get("month")

    if (!employeeId || !yearStr || !monthStr) {
      return new NextResponse("Hiányzó paraméterek (employeeId, year, month)", { status: 400 })
    }

    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return new NextResponse("Érvénytelen év vagy hónap paraméter", { status: 400 })
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
        ["admin", "employees", "time", "payroll", "compliance", "auditor", "reports", "vezeto"],
        scopedRoles.hrModules
      )
    const isOwn = employeeId === user.id

    if (!isOwn && !isHrOrAdmin) {
      return new NextResponse("Nincs jogosultsága a jelenléti ív megtekintéséhez", { status: 403 })
    }

    const { buffer, employeeName, monthName } = await generateTimesheetPdfBuffer(supabase, employeeId, year, month)

    const safeFilename = encodeURIComponent(`Jelenleti_iv_${employeeName}_${year}_${monthName}.pdf`)

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error: any) {
    console.error("Hiba a jelenléti ív PDF generálása során:", error)
    return new NextResponse("Belső hiba a PDF generálása során: " + error.message, { status: 500 })
  }
}
