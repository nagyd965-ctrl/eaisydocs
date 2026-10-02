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

    if (!filePath || filePath.includes("..") || filePath.startsWith("/") || filePath.startsWith("\\")) {
      return new NextResponse("Érvénytelen fájl útvonal", { status: 400 })
    }

    // 1. Felhasználói profil és szerepkörök lekérése
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("hr_szerepkor, docs_szerepkor")
      .eq("id", user.id)
      .single()

    const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin"].includes(profile?.hr_szerepkor || "") ||
                        ["admin", "rendszergazda"].includes(profile?.docs_szerepkor || "")

    // 2. Dokumentum jogosultság ellenőrzése
    // Ellenőrizzük, hogy a fájl munkaköri leírás-e (publikus a cégen belül minden munkavállalónak)
    const { data: jobDoc } = await supabase
      .from("hr_munkakor_verzio")
      .select("id")
      .eq("fajl_path", filePath)
      .maybeSingle()

    // Vagy személyes HR dokumentum-e (csak saját maga vagy HR/Admin férhet hozzá)
    const { data: empDoc } = await supabase
      .from("hr_dokumentum")
      .select("id, dolgozo_id")
      .eq("fajl_path", filePath)
      .maybeSingle()

    const isOwnDocument = empDoc?.dolgozo_id === user.id
    const isAuthorized = isHrOrAdmin || Boolean(jobDoc) || isOwnDocument

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
