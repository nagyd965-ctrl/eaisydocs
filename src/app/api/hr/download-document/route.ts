import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new NextResponse("Hozzáférés megtagadva: Bejelentkezés szükséges.", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("path")
    const bucket = searchParams.get("bucket") || "irat_files"
    const ALLOWED_BUCKETS = new Set(["irat_files", "hr_dokumentumok"])

    if (
      !filePath ||
      filePath.includes("..") ||
      filePath.startsWith("/") ||
      filePath.startsWith("\\") ||
      !ALLOWED_BUCKETS.has(bucket)
    ) {
      return new NextResponse("Érvénytelen fájl útvonal vagy tároló", { status: 400 })
    }

    // 1. Felhasználói profil és cég-szintű szerepkörök lekérése
    const { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } = await import("@/utils/company-server")
    const { isUserAuthorizedForHrView } = await import("@/utils/hr/company-role-resolver")
    const activeCompanyId = await getActiveCompanyIdServer()
    if (!activeCompanyId) {
      return new NextResponse("Nincs kiválasztott aktív vállalat.", { status: 403 })
    }
    const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

    const effectiveHrRole = scopedRoles.hrRole || "none"
    const effectiveHrModules = scopedRoles.hrModules || []
    const isHrAdmin = effectiveHrRole === "admin" || effectiveHrRole === "rendszergazda"

    const isHrOrAdmin =
      isHrAdmin ||
      isUserAuthorizedForHrView(
        effectiveHrRole,
        ["admin", "employees", "compliance", "payroll", "onboarding", "offboarding", "auditor"],
        effectiveHrModules
      )

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const dbClient = serviceRoleKey
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : supabase

    // 2. Dokumentum jogosultság ellenőrzése az aktív vállalaton belül
    // Ellenőrizzük, hogy a fájl munkaköri leírás-e (publikus a cégen belül minden tagnak)
    const { data: jobDoc } = await dbClient
      .from("hr_munkakor_leiras_verzio")
      .select("id, company_id")
      .eq("fajl_path", filePath)
      .eq("company_id", activeCompanyId)
      .limit(1)
      .maybeSingle()

    // Vagy közös céges szabályzat / vállalati dokumentum-e az adott cégnél
    const { data: policyDoc } = await dbClient
      .from("hr_ceges_dokumentum")
      .select("id, cim, company_id")
      .eq("fajl_path", filePath)
      .eq("company_id", activeCompanyId)
      .eq("aktiv", true)
      .limit(1)
      .maybeSingle()

    // Vagy személyes HR dokumentum-e az adott cégnél
    const { data: empDoc } = await dbClient
      .from("hr_dokumentum")
      .select("id, dolgozo_id, company_id")
      .or(`url.eq.${filePath},alairt_fajl_url.eq.${filePath}`)
      .eq("company_id", activeCompanyId)
      .limit(1)
      .maybeSingle()

    const isOwnDocument = Boolean(empDoc && empDoc.dolgozo_id === user.id)
    const belongsToActiveCompanyHr = Boolean(jobDoc) || Boolean(policyDoc) || Boolean(empDoc)
    const isAuthorized =
      ((Boolean(jobDoc) || Boolean(policyDoc)) && (effectiveHrRole !== "none" || isHrAdmin)) ||
      isOwnDocument ||
      (isHrOrAdmin && belongsToActiveCompanyHr)

    if (!isAuthorized) {
      return new NextResponse("Hozzáférés megtagadva: Nincs jogosultsága a kért dokumentum letöltéséhez.", { status: 403 })
    }

    // 3. Fájl letöltése felhasználói auth kontextussal
    const downloadRes = await supabase.storage
      .from(bucket)
      .download(filePath)
    let fileData = downloadRes.data
    const downloadError = downloadRes.error

    // Ha RLS miatt nem érhető el közvetlenül, de a fenti ABAC/RBAC jogosultság-ellenőrzés sikeres volt:
    if (downloadError || !fileData) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
        const { data: adminFileData, error: adminError } = await supabaseAdmin.storage
          .from(bucket)
          .download(filePath)

        if (adminError || !adminFileData) {
          return new NextResponse("A kért dokumentum nem található a tárhelyen.", { status: 404 })
        }
        fileData = adminFileData
      } else {
        return new NextResponse("Fájl letöltése sikertelen (tárhely hozzáférési hiba)", { status: 403 })
      }
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const fileName = filePath.split("/").pop() || "dokumentum.pdf"

    // 4. Audit naplózás a hr_esemeny_naplo táblába
    const entitasTipus = empDoc
      ? "hr_dokumentum"
      : policyDoc
        ? "hr_ceges_dokumentum"
        : "hr_munkakor_leiras_verzio"
    const entitasId = empDoc?.id || policyDoc?.id || jobDoc?.id || null

    try {
      await dbClient.from("hr_esemeny_naplo").insert({
        felhasznalo_id: user.id,
        esemeny_tipus: "dokumentum_letoltve",
        entitas_tipus: entitasTipus,
        entitas_id: entitasId,
        megjegyzes: `HR dokumentum megtekintve/letöltve: ${fileName}`,
        company_id: activeCompanyId,
      })
    } catch (logErr) {
      console.error("Nem sikerült naplózni a HR dokumentum letöltését:", logErr)
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error: any) {
    console.error("Hiba a HR dokumentum letöltése során:", error)
    return new NextResponse("Belső szerverhiba a dokumentum kiszolgálása során", { status: 500 })
  }
}
