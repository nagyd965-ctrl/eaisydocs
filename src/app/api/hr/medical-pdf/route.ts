import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateMedicalPdfBuffer } from "@/utils/hr/medical-sheet-pdf-generator"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")
    const isPreview = searchParams.get("preview") === "true"

    if (!id) {
      return new NextResponse("Hiányzó 'id' paraméter", { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Nincs bejelentkezve", { status: 401 })
    }

    // 1. Lekérjük a vizsgálat rekordot
    const { data: orvosi, error: orvosiErr } = await supabase
      .from("hr_orvosi_vizsgalat")
      .select("id, dolgozo_id, fajl_url, tipus, vizsgalat_datuma")
      .eq("id", id)
      .single()

    if (orvosiErr || !orvosi) {
      return new NextResponse("Az orvosi vizsgálat nem található", { status: 404 })
    }

    // 2. Jogosultság ellenőrzése
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("hr_szerepkor, docs_szerepkor")
      .eq("id", user.id)
      .single()

    const isHrOrAdmin =
      ["hr_munkatars", "hr_vezeto", "admin"].includes(profile?.hr_szerepkor || "") ||
      profile?.docs_szerepkor === "admin"
    const isPrivileged =
      isHrOrAdmin || ["auditor", "munkavedelmi"].includes(profile?.hr_szerepkor || "")
    const isOwn = orvosi.dolgozo_id === user.id

    if (!isOwn && !isPrivileged) {
      return new NextResponse("Nincs jogosultsága az orvosi dokumentum megtekintéséhez", { status: 403 })
    }

    const dispositionType = isPreview ? "inline" : "attachment"

    // 3. Ha van feltöltött fájl a storage-ban, azt adjuk vissza
    if (orvosi.fajl_url) {
      let fileBlob: Blob | null = null
      let { data: blob, error: downloadErr } = await supabase.storage
        .from("irat_files")
        .download(orvosi.fajl_url)

      if (downloadErr || !blob) {
        // Fallback: service role client ha az RLS policy blokkolná a storage elérést
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
          const { data: adminBlob } = await adminClient.storage
            .from("irat_files")
            .download(orvosi.fajl_url)
          if (adminBlob) fileBlob = adminBlob
        }
      } else {
        fileBlob = blob
      }

      if (fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)

        // MIME típus meghatározása kiterjesztésből
        let mimeType = "application/pdf"
        const lowerUrl = orvosi.fajl_url.toLowerCase()
        if (lowerUrl.endsWith(".png")) mimeType = "image/png"
        else if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) mimeType = "image/jpeg"
        else if (lowerUrl.endsWith(".webp")) mimeType = "image/webp"

        const originalName = orvosi.fajl_url.split("/").pop() || "orvosi_lelet.pdf"
        const safeFilename = encodeURIComponent(originalName)

        return new NextResponse(buffer as any, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
            "Cache-Control": "private, max-age=60",
          },
        })
      }
    }

    // 4. Ha nincs feltöltött fájl, a hivatalos rendszerszintű alkalmassági vélemény PDF-et generáljuk le
    const { buffer, fileName } = await generateMedicalPdfBuffer(supabase, id)
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
    console.error("Hiba az orvosi alkalmassági PDF kiszolgálása során:", error)
    return new NextResponse("Belső hiba a PDF generálása során: " + (error?.message || "Ismeretlen hiba"), { status: 500 })
  }
}
