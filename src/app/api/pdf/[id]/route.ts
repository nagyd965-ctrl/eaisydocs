import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const iratId = resolvedParams.id
  
  if (!iratId) {
    return new NextResponse("Irat ID hiányzik", { status: 400 })
  }

  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse("Nincs bejelentkezve", { status: 401 })
  }

  // Fetch user role
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()
  const isBetekinto = profile?.docs_szerepkor === "betekinto"

  // 2. Fetch document details
  const { data: irat } = await supabase
    .from("irat")
    .select("minosites, erkeztetoszam")
    .eq("id", iratId)
    .single()

  if (!irat) {
    return new NextResponse("Irat nem található", { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const fileId = searchParams.get('fileId')

  // 3. Fetch file details
  let fileQuery = supabase
    .from("irat_fajl")
    .select("storage_path, mime_type, kulso_fajl_url")
    .eq("irat_id", iratId)

  if (fileId) {
    fileQuery = fileQuery.eq("id", fileId)
  }

  const { data: fajl } = await fileQuery.limit(1).single()

  if (!fajl || (!fajl.storage_path && !fajl.kulso_fajl_url)) {
    return new NextResponse("Fájl nem található az irathoz", { status: 404 })
  }

  // Only handle PDFs
  if (fajl.mime_type !== "application/pdf") {
    if (isBetekinto) {
      return new NextResponse("Betekinto szerepkorrel csak PDF előnézet érhető el (letöltés tiltott).", { status: 403 })
    }
    if (fajl.kulso_fajl_url) {
      return NextResponse.redirect(fajl.kulso_fajl_url)
    }
    if (fajl.storage_path) {
      const { data: signedUrlData } = await supabase.storage
        .from("irat_files")
        .createSignedUrl(fajl.storage_path, 60)
        
      if (signedUrlData?.signedUrl) {
        return NextResponse.redirect(signedUrlData.signedUrl)
      }
    }
    return new NextResponse("Nem lehet megnyitni a fájlt", { status: 500 })
  }

  // 4. Determine if watermarking is needed
  const isConfidential = isBetekinto || irat.minosites === "bizalmas" || irat.minosites === "szigoruan_bizalmas"

  // Ha külső forrásból származik a fájl (pl. eaisyBill)
  if (fajl.kulso_fajl_url) {
    try {
      const resp = await fetch(fajl.kulso_fajl_url)
      if (!resp.ok) {
        console.error(`Külső fájl letöltési hiba HTTP ${resp.status}:`, fajl.kulso_fajl_url)
        return new NextResponse(`Külső fájl letöltése sikertelen (${resp.status})`, { status: 502 })
      }
      const externalBlob = await resp.blob()
      return await processPdf(externalBlob, isConfidential, isBetekinto, user.email || user.id)
    } catch (err: any) {
      console.error("Hiba a külső fájl letöltésekor:", err)
      return new NextResponse("Külső fájl letöltése sikertelen: " + err.message, { status: 500 })
    }
  }

  // Helyi Supabase Storage fájl
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("irat_files")
    .download(fajl.storage_path)

  if (downloadError || !fileData) {
    // Fallback to service role client if RLS is too restrictive for direct download in edge
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      )
      const { data: adminFileData, error: adminDownloadError } = await supabaseAdmin.storage
        .from("irat_files")
        .download(fajl.storage_path)
        
      if (adminDownloadError || !adminFileData) {
        return new NextResponse("Fájl letöltése sikertelen", { status: 500 })
      }
      return await processPdf(adminFileData, isConfidential, isBetekinto, user.email || user.id)
    }
    
    return new NextResponse("Fájl letöltése sikertelen (RLS / Jogosultság hiba)", { status: 403 })
  }

  return await processPdf(fileData, isConfidential, isBetekinto, user.email || user.id)
}

async function processPdf(fileBlob: Blob, isConfidential: boolean, isBetekinto: boolean, userIdentifier: string) {
  const arrayBuffer = await fileBlob.arrayBuffer()
  
  if (!isConfidential) {
    // Return original if no watermark needed
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline"
      }
    })
  }

  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const pages = pdfDoc.getPages()
    
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    // Convert timestamp to ascii-safe by removing accents just in case (e.g. if locale uses them)
    // "hu-HU" locale for toLocaleString is usually numbers and dots/colons, so it's safe.
    const timestamp = new Date().toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })
    
    // Replace hungarian accents with english counterparts to avoid font rendering errors in default Helvetica
    const safeIdentifier = userIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const watermarkText = isBetekinto 
      ? `BETEKINTO\n${safeIdentifier}\n${timestamp}`
      : `BIZALMAS\n${safeIdentifier}\n${timestamp}`

    // Add watermark to each page
    pages.forEach((page) => {
      const { width, height } = page.getSize()
      page.drawText(watermarkText, {
        x: width / 2 - 150,
        y: height / 2,
        size: 50,
        font: helveticaFont,
        color: rgb(1, 0, 0), // Pure red for maximum visibility
        opacity: 0.8,        // High opacity so it's visible on dark backgrounds
        rotate: degrees(45),
        lineHeight: 50,
      })
    })

    const pdfBytes = await pdfDoc.save()
        return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      }
    })
  } catch (error) {
    console.error("PDF vízjelezési hiba:", error)
    return new NextResponse("Hiba történt a PDF feldolgozása közben", { status: 500 })
  }
}
