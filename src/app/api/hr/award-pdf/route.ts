import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateAwardCertificatePdfBuffer } from "@/utils/hr/award-certificate-pdf-generator"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const awardId = searchParams.get("id")
    const isPreview = searchParams.get("preview") === "true"

    if (!awardId) {
      return new NextResponse("Hiányzó 'id' paraméter", { status: 400 })
    }

    const supabase = await createClient()

    // 1. Felhasználói munkamenet ellenőrzése
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Nincs bejelentkezve", { status: 401 })
    }

    // 2. Kitüntetés rekord lekérése
    const { data: item, error: itemErr } = await supabase
      .from("hr_kituntetes")
      .select("id, dolgozo_id, fajl_url, iktatoszam, megnevezes")
      .eq("id", awardId)
      .maybeSingle()

    if (itemErr || !item) {
      return new NextResponse("A megadott kitüntetés / elismerés nem található", { status: 404 })
    }

    const dispositionType = isPreview ? "inline" : "attachment"

    // 3. Ha már van feltöltött / iktatott fájl, azt szolgáljuk ki
    if (item.fajl_url) {
      let fileBlob: Blob | null = null
      const { data: blob, error: downloadErr } = await supabase.storage
        .from("irat_files")
        .download(item.fajl_url)

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
            .download(item.fajl_url)
          if (adminBlob) fileBlob = adminBlob
        }
      } else {
        fileBlob = blob
      }

      if (fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)
        const originalName = item.fajl_url.split("/").pop() || `elismero_oklevel_${awardId}.pdf`
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

    // 4. Ha még nincs tárolt fájl, generáljuk le dinamikusan a reprezentatív Elismerő Oklevél PDF-et
    const { buffer, fileName } = await generateAwardCertificatePdfBuffer(supabase, awardId)
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
    console.error("Hiba az elismerő oklevél PDF kiszolgálása során:", error)
    return new NextResponse("Belső szerverhiba az elismerő oklevél PDF előállítása során: " + (error?.message || ""), {
      status: 500,
    })
  }
}
