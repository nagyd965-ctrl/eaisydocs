import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new NextResponse("Nem azonosított felhasználó", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("path")
    const bucket = searchParams.get("bucket") || "irat_files"

    if (!filePath || filePath.includes("..")) {
      return new NextResponse("Érvénytelen fájl útvonal", { status: 400 })
    }

    // Először megpróbáljuk a felhasználó saját auth kontextusával letölteni
    let { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath)

    // Ha RLS miatt nem érhető el közvetlenül, service role fallback
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
          return new NextResponse("Fájl letöltése sikertelen: " + (adminError?.message || "Nem található"), { status: 404 })
        }
        fileData = adminFileData
      } else {
        return new NextResponse("Fájl letöltése sikertelen (RLS / Jogosultság)", { status: 403 })
      }
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const fileName = filePath.split("/").pop() || "dokumentum.pdf"

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("Hiba a HR dokumentum letöltése során:", error)
    return new NextResponse("Belső szerverhiba: " + error.message, { status: 500 })
  }
}
