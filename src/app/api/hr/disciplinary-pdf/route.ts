import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateDisciplinaryPdfBuffer } from "@/utils/hr/disciplinary-pdf-generator"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const disciplinaryId = searchParams.get("id")
    const isPreview = searchParams.get("preview") === "true"

    if (!disciplinaryId) {
      return new NextResponse("Hiányzó 'id' paraméter", { status: 400 })
    }

    const supabase = await createClient()

    // 1. Felhasználói munkamenet és szigorú jogosultság ellenőrzése
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Nincs bejelentkezve", { status: 401 })
    }

    // 2. Fegyelmi rekord lekérése
    const { data: item, error: itemErr } = await supabase
      .from("hr_fegyelmi")
      .select("id, dolgozo_id, fajl_url, iktatoszam, tipus")
      .eq("id", disciplinaryId)
      .maybeSingle()

    if (itemErr || !item) {
      return new NextResponse("A megadott fegyelmi határozat nem található", { status: 404 })
    }

    const employeeId = item.dolgozo_id

    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("hr_szerepkor, docs_szerepkor")
      .eq("id", user.id)
      .single()

    const isHrOrAdmin =
      ["hr_munkatars", "hr_vezeto", "admin", "auditor"].includes(profile?.hr_szerepkor || "") ||
      profile?.docs_szerepkor === "admin"
    const isOwn = employeeId === user.id

    // Bizalmas HR adat: csak HR/Admin/Auditor vagy az érintett dolgozó láthatja
    if (!isOwn && !isHrOrAdmin) {
      return new NextResponse("Nincs jogosultsága a fegyelmi határozat megtekintéséhez", { status: 403 })
    }

    const dispositionType = isPreview ? "inline" : "attachment"

    // 3. Ha már van feltöltött fájl a storage-ban, azt szolgáljuk ki
    if (item.fajl_url) {
      let fileBlob: Blob | null = null
      const { data: blob, error: downloadErr } = await supabase.storage
        .from("irat_files")
        .download(item.fajl_url)

      if (downloadErr || !blob) {
        // Fallback: service role client ha RLS blokkolná
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
          const { data: adminBlob } = await adminClient.storage
            .from("irat_files")
            .download(item.fajl_url)
          if (adminBlob) fileBlob = adminBlob
        }
      } else {
        fileBlob = blob
      }

      if (fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)
        const originalName = item.fajl_url.split("/").pop() || `fegyelmi_hatarozat_${disciplinaryId}.pdf`
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

    // 4. Ha még nincs tárolt fájl, generáljuk le dinamikusan az Mt. 56. § / 179. § PDF-et
    const { buffer, fileName } = await generateDisciplinaryPdfBuffer(supabase, disciplinaryId)
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
    console.error("Hiba a fegyelmi PDF kiszolgálása során:", error)
    return new NextResponse("Belső szerverhiba a fegyelmi határozat PDF előállítása során: " + (error?.message || ""), {
      status: 500,
    })
  }
}
