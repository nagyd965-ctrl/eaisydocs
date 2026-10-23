"use server"

import { launchPdfBrowser } from '@/utils/pdf-browser'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from 'next/cache'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getEmployeeContractFillData(dolgozoId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nincs bejelentkezve" }

    const adminClient = getAdminClient()

    // 1. Profil & Adatlap
    const { data: profil } = await adminClient
      .from("felhasznalo_profil")
      .select("id, nev, email, telefon, pozicio, hr_szervezeti_egyseg(nev)")
      .eq("id", dolgozoId)
      .maybeSingle()

    const { data: adatlap } = await adminClient
      .from("hr_dolgozo_adatlap")
      .select(`
        *,
        hr_jogviszony (
          tipus,
          belepes_datuma,
          kilepes_datuma,
          hr_beosztas (
            ervenyes_ig,
            hr_munkakor ( megnevezes, feor_kod )
          )
        )
      `)
      .eq("id", dolgozoId)
      .maybeSingle()

    // 2. Legfrissebb munkaszerződés ha van
    const { data: contract } = await adminClient
      .from("hr_munkaszerzodes")
      .select("*")
      .eq("dolgozo_id", dolgozoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // 3. Titkos adatok (TAJ, adójel, bankszámla, bér)
    let secretData: any = null
    try {
      const { data: sec } = await adminClient.rpc("get_decrypted_hr_data", {
        p_dolgozo_id: dolgozoId,
      })
      secretData = sec
    } catch (e) {
      console.warn("Could not fetch decrypted data for contract fill:", e)
    }

    // 4. Munkakör feloldása
    let activeMunkakor = contract?.munkakor || ""
    if (!activeMunkakor && adatlap?.hr_jogviszony && Array.isArray(adatlap.hr_jogviszony)) {
      const activeJog = adatlap.hr_jogviszony.find((j: any) => !j.kilepes_datuma) || adatlap.hr_jogviszony[0]
      const beosztasok = activeJog?.hr_beosztas || []
      const activeBeosztas = beosztasok.find((b: any) => !b.ervenyes_ig || new Date(b.ervenyes_ig) >= new Date()) || beosztasok[0]
      if (activeBeosztas?.hr_munkakor?.megnevezes) {
        activeMunkakor = activeBeosztas.hr_munkakor.megnevezes
        if (activeBeosztas.hr_munkakor.feor_kod) {
          activeMunkakor += ` (FEOR: ${activeBeosztas.hr_munkakor.feor_kod})`
        }
      }
    }
    if (!activeMunkakor) activeMunkakor = profil?.pozicio || "Alkalmazott"

    const belepesDatuma = contract?.kezdes_datuma || adatlap?.hr_jogviszony?.[0]?.belepes_datuma || adatlap?.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]

    const reszlegNev = (Array.isArray(profil?.hr_szervezeti_egyseg) ? profil.hr_szervezeti_egyseg[0]?.nev : (profil?.hr_szervezeti_egyseg as any)?.nev) || "Központi"

    const merged = {
      id: dolgozoId,
      nev: profil?.nev || "Munkavállaló",
      szuletesiHely: contract?.szuletesi_hely || adatlap?.szuletesi_hely || "Budapest",
      szuletesiDatum: contract?.szuletesi_datum || adatlap?.szuletesi_datum || adatlap?.szuletesi_ido || "",
      anyjaNeve: contract?.anyja_neve || adatlap?.anyja_neve || "",
      lakcim: contract?.lakcim || adatlap?.lakcim || "",
      adoazonositoJel: contract?.adoazonosito_jel || secretData?.adoazonosito || "",
      tajSzam: contract?.taj_szam || secretData?.taj_szam || "",
      bankszamlaszam: contract?.bankszamlaszam || secretData?.bankszamla || "",
      alapber: Number(contract?.alapber || (secretData?.brutto_ber ? Number(secretData.brutto_ber) : null) || 650000),
      munkakor: activeMunkakor,
      reszleg: contract?.reszleg || reszlegNev,
      belepesDatuma: belepesDatuma,
      szerzodesTipusa: contract?.szerzodes_tipusa || (adatlap?.szerzodes_tipusa === "határozott" ? "hatarozott" : "hatarozatlan"),
    }

    return { success: true, data: merged }
  } catch (err: any) {
    console.error("getEmployeeContractFillData error:", err)
    return { success: false, error: err.message }
  }
}

export async function generateAndSaveContract(
  htmlContent: string,
  dolgozo_id: string,
  template_name: string,
  nev: string
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Nincs bejelentkezve" }
    }

    // Wrap the HTML content in a proper HTML document structure with complete print styles
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4;
              margin: 1.8cm 1.8cm 1.8cm 1.8cm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              line-height: 1.5;
              font-size: 13px;
              margin: 0;
              padding: 0;
            }
            h1 { font-size: 1.35rem; font-weight: 700; text-align: center; margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; }
            h2 { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0; }
            h3 { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; margin: 1rem 0 0.5rem 0; }
            p { text-align: justify; line-height: 1.6; margin: 0 0 0.75rem 0; }
            ol, ul { padding-left: 1.5rem; text-align: justify; line-height: 1.6; margin: 0.5rem 0 1rem 0; }
            li { margin-bottom: 0.35rem; }
            strong { font-weight: 600; color: #000; }
            
            /* Layout & Utilities */
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-2 { gap: 0.5rem; }
            .gap-4 { gap: 1rem; }
            .gap-6 { gap: 1.5rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .items-center { align-items: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
            
            /* Spacing */
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-6 { margin-top: 1.5rem; }
            .mt-8 { margin-top: 2rem; }
            .mt-10 { margin-top: 2.5rem; }
            .mt-12 { margin-top: 3rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .pt-1 { padding-top: 0.25rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-4 { padding-top: 1rem; }
            .pt-6 { padding-top: 1.5rem; }
            .pt-8 { padding-top: 2rem; }
            .pb-1 { padding-bottom: 0.25rem; }
            .pb-2 { padding-bottom: 0.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .p-3 { padding: 0.75rem; }
            .p-4 { padding: 1rem; }
            
            /* Borders & Styling */
            .border { border: 1px solid #e2e8f0; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .border-black { border-color: #000000; }
            .rounded { border-radius: 0.375rem; }
            .bg-gray-50 { background-color: #f8fafc; }
            .bg-slate-50 { background-color: #f8fafc; }
            .w-full { width: 100%; }
            .w-48 { width: 12rem; }
            .w-56 { width: 14rem; }
            
            /* Typography */
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.85rem; }
            .text-base { font-size: 1rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-widest { letter-spacing: 0.1em; }
            .text-gray-500, .text-slate-500 { color: #64748b; }
            .text-gray-600, .text-slate-600 { color: #475569; }
            .text-gray-700, .text-slate-700 { color: #334155; }
            .leading-relaxed { line-height: 1.625; }
            
            /* Print specifics */
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `

    // Generate PDF using Puppeteer
    const browser = await launchPdfBrowser()
    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' as any })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '1.5cm', right: '1.5cm', bottom: '1.5cm', left: '1.5cm' },
      printBackground: true
    })
    await browser.close()

    const timestamp = new Date().getTime()
    const filename = `hr/${dolgozo_id}/${template_name}_${timestamp}.pdf`

    // Upload to Supabase Storage (irat_files bucket)
    // using base64 or converting buffer? Supabase client on Node can take Buffer.
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('irat_files')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return { success: false, error: "Nem sikerült feltölteni a PDF fájlt." }
    }

    const fileUrl = filename

    // Determine category based on template
    let kategoria = "Munkaszerződés"
    if (template_name === "bermodositas") kategoria = "Bérmódosítás"
    if (template_name === "titoktartasi") kategoria = "Titoktartási Nyilatkozat"
    if (template_name === "munkakori_leiras") kategoria = "Munkaköri leírás"

    const displayNev = `${nev} - ${kategoria} (${new Date().toLocaleDateString('hu-HU')})`

    // Insert into hr_dokumentum
    const { error: dbError } = await supabase
      .from('hr_dokumentum')
      .insert({
        dolgozo_id: dolgozo_id,
        nev: displayNev,
        kategoria: kategoria,
        url: fileUrl
      })

    if (dbError) {
      console.error("DB insert error:", dbError)
      return { success: false, error: "Nem sikerült elmenteni a dokumentum adatokat az adatbázisba." }
    }

    revalidatePath(`/hr/employee/${dolgozo_id}`)
    revalidatePath(`/hr/employee`)
    
    return { success: true, url: fileUrl }
  } catch (error) {
    console.error("PDF generation error:", error)
    return { success: false, error: "Váratlan hiba történt a PDF generálása során." }
  }
}

export async function assignJobDescriptionToEmployee(
  employeeId: string,
  munkakorId: string,
  employeeName: string,
  versionId?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Nincs bejelentkezve" }
    }

    // 1. Lekérjük a munkakör leírás verzióját
    let query = supabase
      .from("hr_munkakor_leiras_verzio")
      .select("*, hr_munkakor(megnevezes)")
      .eq("munkakor_id", munkakorId)

    if (versionId) {
      query = query.eq("id", versionId)
    } else {
      query = query.order("verzio_szam", { ascending: false }).limit(1)
    }

    const { data: versions, error: vError } = await query
    const version = versions?.[0]

    if (vError || !version) {
      return { success: false, error: "Ehhez a munkakörhöz nem található hivatalos munkaköri leírás fájl." }
    }

    const munkakorNev = (version.hr_munkakor as any)?.megnevezes || "Munkakör"
    const docNev = `${employeeName} - Munkaköri Leírás (${munkakorNev} v${version.verzio_szam})`

    // 2. Beillesztjük a hr_dokumentum táblába
    const { data: newDoc, error: insertError } = await supabase
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: employeeId,
        nev: docNev,
        kategoria: "Munkaköri leírás",
        url: version.fajl_path
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting hr_dokumentum:", insertError)
      return { success: false, error: "Nem sikerült hozzárendelni a dokumentumot: " + insertError.message }
    }

    // 3. Naplózás a HR eseménynaplóba
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_letrehozas",
      entitas_tipus: "hr_dokumentum",
      entitas_id: newDoc.id,
      megjegyzes: `Hivatalos munkaköri leírás (v${version.verzio_szam} - ${version.fajl_nev}) hozzárendelve a dolgozóhoz.`
    })

    revalidatePath(`/hr/employee/${employeeId}`)
    return { success: true, docId: newDoc.id }
  } catch (err: any) {
    console.error("assignJobDescriptionToEmployee error:", err)
    return { success: false, error: err.message || "Váratlan hiba történt a hozzárendelés során." }
  }
}

export async function deleteContract(documentId: string, fileUrl: string | null, dolgozo_id: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Nincs bejelentkezve" }
    }

    // Integritás védelem: iktatott irat soha nem törölhető a HR felületről
    const { data: existingDoc } = await supabase
      .from('hr_dokumentum')
      .select('iktatoszam')
      .eq('id', documentId)
      .single()

    if (existingDoc?.iktatoszam) {
      return { 
        success: false, 
        error: `A(z) ${existingDoc.iktatoszam} számon iktatott dokumentum nem törölhető a HR felületről, mert hivatalos eaisyDocs iratkezelési nyilvántartásba került!` 
      }
    }

    // Törlés az adatbázisból
    const { error: dbError } = await supabase
      .from('hr_dokumentum')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error("DB delete error:", dbError)
      return { success: false, error: "Nem sikerült törölni az adatbázisból." }
    }

    // Törlés a Storage-ből
    if (fileUrl) {
      const { error: storageError } = await supabase.storage
        .from('irat_files')
        .remove([fileUrl])

      if (storageError) {
        console.error("Storage delete error:", storageError)
        // Nem blokkoljuk a folyamatot, ha a DB már sikerült, de logoljuk
      }
    }

    revalidatePath(`/hr/employee/${dolgozo_id}`)
    return { success: true }
  } catch (error) {
    console.error("Delete error:", error)
    return { success: false, error: "Váratlan hiba történt a törlés során." }
  }
}
