"use server"

import puppeteer from 'puppeteer'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

    // Wrap the HTML content in a proper HTML document structure
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 2rem; }
            h1 { font-size: 1.5rem; font-weight: bold; text-align: center; margin-bottom: 2.5rem; text-transform: uppercase; letter-spacing: 0.1em; }
            p { text-align: justify; line-height: 1.625; margin-bottom: 1rem; }
            ol { padding-left: 1.5rem; text-align: justify; line-height: 1.625; margin-top: 1.5rem; margin-bottom: 1.5rem; }
            li { margin-bottom: 1rem; }
            .mt-20 { margin-top: 5rem; }
            .pt-10 { padding-top: 2.5rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .text-center { text-align: center; }
            .w-48 { width: 12rem; }
            .border-b { border-bottom: 1px solid black; }
            .mb-2 { margin-bottom: 0.5rem; }
            strong { font-weight: bold; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }
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

export async function deleteContract(documentId: string, fileUrl: string | null, dolgozo_id: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Nincs bejelentkezve" }
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
