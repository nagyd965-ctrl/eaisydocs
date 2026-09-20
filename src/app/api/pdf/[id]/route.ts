import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import sharp from "sharp"

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

  // Fetch user profile
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, max_minosites, szervezeti_egyseg_id")
    .eq("id", user.id)
    .single()
  const isBetekinto = profile?.docs_szerepkor === "betekinto"
  const isAdmin = profile?.docs_szerepkor === "admin"

  // 2. Fetch document details
  const { data: irat } = await supabase
    .from("irat")
    .select("minosites, erkeztetoszam, ugyirat_id")
    .eq("id", iratId)
    .single()

  if (!irat) {
    return new NextResponse("Irat nem található vagy nincs hozzáférése", { status: 404 })
  }

  // 2.1 Szigorú biztonsági minősítés ellenőrzése (Clearance check)
  const minositesHierarchy: Record<string, number> = {
    nyilt: 1,
    belso: 2,
    bizalmas: 3,
    szigoruan_bizalmas: 4
  }
  const userLevel = minositesHierarchy[profile?.max_minosites || 'nyilt'] || 1
  const docLevel = minositesHierarchy[irat.minosites || 'nyilt'] || 1

  if (!isAdmin && userLevel < docLevel) {
    return new NextResponse(
      `Hozzáférés megtagadva: A dokumentum megtekintéséhez legalább '${irat.minosites}' biztonsági minősítés szükséges (Az Ön szintje: ${profile?.max_minosites || 'nyilt'}).`,
      { status: 403 }
    )
  }

  // 2.2 Szervezeti egység / explicit hozzáférés ellenőrzése iktatott iratoknál
  if (!isAdmin && profile?.docs_szerepkor !== 'iktato' && profile?.docs_szerepkor !== 'auditor' && irat.ugyirat_id) {
    const { data: ugyirat } = await supabase
      .from("ugyirat")
      .select("szervezeti_egyseg_id")
      .eq("id", irat.ugyirat_id)
      .single()

    const inDepartment = ugyirat?.szervezeti_egyseg_id === profile?.szervezeti_egyseg_id
    const { data: explicitAccess } = await supabase
      .from("ugyirat_hozzaferes")
      .select("id")
      .eq("ugyirat_id", irat.ugyirat_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!inDepartment && !explicitAccess) {
      return new NextResponse("Hozzáférés megtagadva: Nincs jogosultsága ehhez az ügyirathoz.", { status: 403 })
    }
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

  const { data: fajl } = await fileQuery.select("storage_path, mime_type, kulso_fajl_url, eredeti_fajlnev").limit(1).single()

  if (!fajl || (!fajl.storage_path && !fajl.kulso_fajl_url)) {
    return new NextResponse("Fájl nem található az irathoz", { status: 404 })
  }

  // Képfájlok kezelése: letöltjük és EXIF alapján automatikusan forgatjuk (display only)
  const isImage = fajl.mime_type?.startsWith("image/") ||
    ["jpg","jpeg","png","gif","webp","bmp","tiff"].some(ext =>
      fajl.storage_path?.toLowerCase().endsWith(`.${ext}`) ||
      fajl.kulso_fajl_url?.toLowerCase().includes(`.${ext}`)
    )

  if (isImage) {
    if (isBetekinto) {
      return new NextResponse("Betekinto szerepkorrel csak PDF előnézet érhető el.", { status: 403 })
    }
    try {
      let imageBuffer: Buffer
      if (fajl.kulso_fajl_url) {
        const resp = await fetch(fajl.kulso_fajl_url)
        imageBuffer = Buffer.from(await resp.arrayBuffer())
      } else {
        // Próbáljuk felhasználói klienssel, ha nem megy, service role-lal
        let dlData: Blob | null = null
        const { data: dlResult } = await supabase.storage.from("irat_files").download(fajl.storage_path)
        dlData = dlResult
        if (!dlData) {
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (serviceKey) {
            const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
            const { data: adminDl } = await adminClient.storage.from("irat_files").download(fajl.storage_path)
            dlData = adminDl
          }
        }
        if (!dlData) return new NextResponse("Képfájl letöltése sikertelen", { status: 500 })
        imageBuffer = Buffer.from(await dlData.arrayBuffer())
      }

      // EXIF alapú automatikus forgatás — a Storage-ban lévő eredeti fájl változatlan marad
      const rotatedBuffer = await sharp(imageBuffer).rotate().toBuffer()
      const meta = await sharp(rotatedBuffer).metadata()
      const outMime = (meta.format === "png") ? "image/png" : "image/jpeg"

      return new NextResponse(new Uint8Array(rotatedBuffer), {
        headers: {
          "Content-Type": outMime,
          "Content-Disposition": "inline",
          "Cache-Control": "private, max-age=60"
        }
      })
    } catch (imgErr) {
      console.error("Képforgatási hiba:", imgErr)
      // Fallback: signed URL redirect
      if (fajl.storage_path) {
        const { data: signedUrlData } = await supabase.storage.from("irat_files").createSignedUrl(fajl.storage_path, 60)
        if (signedUrlData?.signedUrl) return NextResponse.redirect(signedUrlData.signedUrl)
      }
      return new NextResponse("Nem lehet megnyitni a képet", { status: 500 })
    }
  }

  // PDF fájlok
  if (fajl.mime_type !== "application/pdf") {
    // Ismeretlen fájltípus fallback
    if (fajl.storage_path) {
      const { data: signedUrlData } = await supabase.storage.from("irat_files").createSignedUrl(fajl.storage_path, 60)
      if (signedUrlData?.signedUrl) return NextResponse.redirect(signedUrlData.signedUrl)
    }
    return new NextResponse("Nem támogatott fájlformátum", { status: 415 })
  }

  // 4. Determine if watermarking is needed
  const isConfidential = isBetekinto || irat.minosites === "bizalmas" || irat.minosites === "szigoruan_bizalmas"

  // 5. Audit naplózás: Megtekintés rögzítése az eseménynaplóban (AGENTS.md 3. szabály)
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
    const userAgent = request.headers.get("user-agent") || "Ismeretlen"

    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "irat",
      entitas_id: iratId,
      esemeny_tipus: "megtekintve",
      user_id: user.id,
      indoklas: isConfidential ? "Vízjelezett PDF megtekintése" : "PDF megtekintése",
      ip_cim: ip,
      user_agent: userAgent
    })
  } catch (auditErr) {
    console.error("Audit naplózási hiba PDF megtekintéskor:", auditErr)
  }

  // Ha külső forrásból származik a fájl (pl. eaisyBill)
  if (fajl.kulso_fajl_url) {
    try {
      const resp = await fetch(fajl.kulso_fajl_url)
      if (!resp.ok) {
        console.error(`Külső fájl letöltési hiba HTTP ${resp.status}:`, fajl.kulso_fajl_url)
        return new NextResponse(`Külső fájl letöltése sikertelen (${resp.status})`, { status: 502 })
      }
      const externalBlob = await resp.blob()
      return await processPdf(externalBlob, isConfidential, isBetekinto, user.email || user.id, fajl.eredeti_fajlnev ?? undefined)
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
      return await processPdf(adminFileData, isConfidential, isBetekinto, user.email || user.id, fajl.eredeti_fajlnev ?? undefined)
    }
    
    return new NextResponse("Fájl letöltése sikertelen (RLS / Jogosultság hiba)", { status: 403 })
  }

  return await processPdf(fileData, isConfidential, isBetekinto, user.email || user.id, fajl.eredeti_fajlnev ?? undefined)
}

async function detectPdfOrientationDegrees(pdfBuffer: ArrayBuffer): Promise<0 | 90 | 180 | 270> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return 0

  try {
    const { GoogleGenAI } = await import("@google/genai")
    const ai = new GoogleGenAI({ apiKey })
    const base64 = Buffer.from(pdfBuffer).toString("base64")

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `Te egy dokumentum-tájolás elemző vagy.
A csatolt dokumentum lehet számla, bizonylat, szkennelt irat vagy telefonos fotóból generált PDF.
Feladatod: döntsd el, hogy a dokumentumot hány fokkal kell az ÓRAMUTATÓ JÁRÁSÁVAL MEGEGYEZŐ irányban elforgatni ahhoz, hogy olvasható (felső felé) legyen.

Lehetséges válaszok:
- 0  → A dokumentum helyesen, olvashatóan áll, nincs forgatás szükséges
- 90 → A dokumentumot 90°-kal kell jobbra forgatni (jelenleg balra/CCW döntve)
- 180 → A dokumentum fejjel lefelé van (180°-ot kell forgatni)
- 270 → A dokumentumot 270°-kal kell jobbra forgatni (jelenleg jobbra/CW döntve)

CSAK A SZÁMOT ADD VISSZA (0, 90, 180 vagy 270), semmi mást!`,
        },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64,
          },
        },
      ],
    })

    const answer = (response.text || "0").trim()
    const deg = parseInt(answer, 10)
    if (deg === 0 || deg === 90 || deg === 180 || deg === 270) {
      console.log(`[PDF orientation] Gemini válasz: ${deg}°`)
      return deg as 0 | 90 | 180 | 270
    }
    console.warn(`[PDF orientation] Váratlan Gemini válasz: "${answer}", fallback: 0°`)
    return 0
  } catch (err) {
    console.warn("[PDF orientation] Gemini hívás sikertelen, fallback: 0°:", err)
    return 0
  }
}

async function processPdf(fileBlob: Blob, isConfidential: boolean, isBetekinto: boolean, userIdentifier: string, originalFilename?: string) {
  const arrayBuffer = await fileBlob.arrayBuffer()

  // Képből generált PDF-eknél (eaisyBill telefonos fotók) Gemini Vision tájolás-detektálás
  const looksLikePhotoFilename = (originalFilename || "").match(/IMG_|DSC_|DCIM|DSCN|Photo|photo/i)

  let workingBuffer = arrayBuffer
  if (looksLikePhotoFilename) {
    try {
      const { degrees: pdfDegrees } = await import("pdf-lib")
      const neededRotation = await detectPdfOrientationDegrees(arrayBuffer)

      if (neededRotation !== 0) {
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        const pages = pdfDoc.getPages()
        for (const page of pages) {
          const current = page.getRotation().angle
          // pdf-lib setRotation = CCW (óramutató ellen), Gemini CW (óramutató szerint) → invertálás szükséges
          // Ha Gemini mondja 90° CW → nekünk 270° CCW kell → setRotation(270)
          const ccwDegrees = (360 - neededRotation + current) % 360
          page.setRotation(pdfDegrees(ccwDegrees))
        }
        const rotatedBytes = await pdfDoc.save()
        workingBuffer = rotatedBytes.buffer as ArrayBuffer
        console.log(`[PDF orientation] Elforgatva: ${neededRotation}°`)
      }
    } catch (rotErr) {
      console.warn("[PDF orientation] Forgatás sikertelen, eredeti PDF:", rotErr)
      workingBuffer = arrayBuffer
    }
  }

  if (!isConfidential) {
    return new NextResponse(workingBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=120"
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
