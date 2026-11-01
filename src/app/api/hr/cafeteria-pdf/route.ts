import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateCafeteriaPdfBuffer } from "@/utils/hr/cafeteria-pdf-generator"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isUserAuthorizedForHrView } from "@/utils/hr/company-role-resolver"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get("employeeId")
    const yearStr = searchParams.get("year")
    const isPreview = searchParams.get("preview") === "true"

    if (!employeeId || !yearStr) {
      return new NextResponse("Hiányzó 'employeeId' vagy 'year' paraméter", { status: 400 })
    }

    const year = parseInt(yearStr, 10)
    if (isNaN(year)) {
      return new NextResponse("Érvénytelen év formátum", { status: 400 })
    }

    const supabase = await createClient()

    // 1. Jogosultság és aktív cég ellenőrzése
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

    const isHrOrAdmin =
      scopedRoles.isCompanyAdmin ||
      isUserAuthorizedForHrView(
        scopedRoles.hrRole,
        ["admin", "employees", "payroll", "compliance", "auditor", "reports"],
        scopedRoles.hrModules
      )
    const isOwn = employeeId === user.id

    if (!isOwn && !isHrOrAdmin) {
      return new NextResponse("Nincs jogosultsága a cafeteria nyilatkozat megtekintéséhez", { status: 403 })
    }

    // 2. Keret és nyilatkozat állapotának lekérése cég-szűréssel
    const { data: keret, error: keretErr } = await supabase
      .from("hr_cafeteria_keret")
      .select("id, nyilatkozat_lezarva, fajl_url, iktatoszam, company_id")
      .eq("dolgozo_id", employeeId)
      .eq("ev", year)
      .eq("company_id", activeCompanyId)
      .maybeSingle()

    if (keretErr || !keret) {
      return new NextResponse("A megadott évhez nem található cafeteria keret az aktív cégben", { status: 404 })
    }

    if (!keret.nyilatkozat_lezarva) {
      return new NextResponse("A nyilatkozat még nincs véglegesítve és lezárva", { status: 422 })
    }

    const dispositionType = isPreview ? "inline" : "attachment"

    // 3. Ha már van archivált / feltöltött fájl a storage-ban, azt szolgáljuk ki
    if (keret.fajl_url && !String(keret.fajl_url).includes("..")) {
      let fileBlob: Blob | null = null
      const { data: blob, error: downloadErr } = await supabase.storage
        .from("irat_files")
        .download(keret.fajl_url)

      if (downloadErr || !blob) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
          const { data: adminBlob } = await adminClient.storage
            .from("irat_files")
            .download(keret.fajl_url)
          if (adminBlob) fileBlob = adminBlob
        }
      } else {
        fileBlob = blob
      }

      if (fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)
        const originalName = keret.fajl_url.split("/").pop() || `cafeteria_nyilatkozat_${year}.pdf`
        const safeFilename = encodeURIComponent(originalName)

        return new NextResponse(buffer as any, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
            "Cache-Control": "private, max-age=60",
          },
        })
      }
    }

    // 4. Ha még nincs feltöltött fájl, dinamikusan generáljuk a hivatalos PDF-et
    const { buffer, fileName } = await generateCafeteriaPdfBuffer(supabase, employeeId, year)
    const safeFilename = encodeURIComponent(fileName)

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error: any) {
    console.error("Hiba a cafeteria nyilatkozat PDF kiszolgálása során:", error)
    return new NextResponse(
      "Belső hiba a PDF generálása során: " + (error?.message || "Ismeretlen hiba"),
      { status: 500 }
    )
  }
}
