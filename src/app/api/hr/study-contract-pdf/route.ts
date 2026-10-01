import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateStudyContractPdfBuffer } from "@/utils/hr/study-contract-pdf-generator"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const contractId = searchParams.get("id")
    const isPreview = searchParams.get("preview") === "true"

    if (!contractId) {
      return new NextResponse("Hiányzó 'id' paraméter", { status: 400 })
    }

    const supabase = await createClient()

    // 1. Felhasználói munkamenet és jogosultság ellenőrzése
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Nincs bejelentkezve", { status: 401 })
    }

    // 2. Szerződés rekord lekérése
    const { data: contract, error: contractErr } = await supabase
      .from("hr_tanulmanyi_szerzodes")
      .select("id, dolgozo_id, fajl_url, iktatoszam, kepzes_neve")
      .eq("id", contractId)
      .maybeSingle()

    if (contractErr || !contract) {
      return new NextResponse("A megadott tanulmányi szerződés nem található", { status: 404 })
    }

    const employeeId = contract.dolgozo_id

    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("hr_szerepkor, docs_szerepkor")
      .eq("id", user.id)
      .single()

    const isHrOrAdmin =
      ["hr_munkatars", "hr_vezeto", "admin"].includes(profile?.hr_szerepkor || "") ||
      profile?.docs_szerepkor === "admin"
    const isOwn = employeeId === user.id

    if (!isOwn && !isHrOrAdmin) {
      return new NextResponse("Nincs jogosultsága a tanulmányi szerződés megtekintéséhez", { status: 403 })
    }

    const dispositionType = isPreview ? "inline" : "attachment"

    // 3. Ha már van archivált / feltöltött fájl a storage-ban, azt szolgáljuk ki
    if (contract.fajl_url) {
      let fileBlob: Blob | null = null
      const { data: blob, error: downloadErr } = await supabase.storage
        .from("irat_files")
        .download(contract.fajl_url)

      if (downloadErr || !blob) {
        // Fallback: service role client ha az RLS policy blokkolná
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
          const { data: adminBlob } = await adminClient.storage
            .from("irat_files")
            .download(contract.fajl_url)
          if (adminBlob) fileBlob = adminBlob
        }
      } else {
        fileBlob = blob
      }

      if (fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)
        const originalName = contract.fajl_url.split("/").pop() || `tanulmanyi_szerzodes_${contractId}.pdf`
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

    // 4. Ha még nincs feltöltött fájl, generáljuk le dinamikusan a hivatalos Mt. 229. § PDF-et
    const { buffer, fileName } = await generateStudyContractPdfBuffer(supabase, contractId)
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
    console.error("Hiba a tanulmányi szerződés PDF kiszolgálása során:", error)
    return new NextResponse("Belső szerverhiba a tanulmányi szerződés PDF előállítása során: " + (error?.message || ""), {
      status: 500,
    })
  }
}
