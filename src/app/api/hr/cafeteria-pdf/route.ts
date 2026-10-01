import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateCafeteriaPdfBuffer } from "@/utils/hr/cafeteria-pdf-generator"

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

    // 1. Jogosultság ellenőrzése
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Nincs bejelentkezve", { status: 401 })
    }

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
      return new NextResponse("Nincs jogosultsága a cafeteria nyilatkozat megtekintéséhez", { status: 403 })
    }

    // 2. Keret és nyilatkozat állapotának lekérése
    const { data: keret, error: keretErr } = await supabase
      .from("hr_cafeteria_keret")
      .select("id, nyilatkozat_lezarva, fajl_url, iktatoszam")
      .eq("dolgozo_id", employeeId)
      .eq("ev", year)
      .maybeSingle()

    if (keretErr || !keret) {
      return new NextResponse("A megadott évhez nem található cafeteria keret", { status: 404 })
    }

    if (!keret.nyilatkozat_lezarva) {
      return new NextResponse("A nyilatkozat még nincs véglegesítve és lezárva", { status: 422 })
    }

    const dispositionType = isPreview ? "inline" : "attachment"

    // 3. Ha már van archivált / feltöltött fájl a storage-ban, azt szolgáljuk ki
    if (keret.fajl_url) {
      let fileBlob: Blob | null = null
      const { data: blob, error: downloadErr } = await supabase.storage
        .from("irat_files")
        .download(keret.fajl_url)

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
