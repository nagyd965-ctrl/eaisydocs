"use server"

import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sendNotificationEmail } from "@/utils/mailer"

export async function submitApplication(formData: FormData) {
  try {
    const nev = formData.get("nev") as string
    const email = formData.get("email") as string
    const telefon = formData.get("telefon") as string
    const uzenet = formData.get("uzenet") as string
    const allashirdetesId = formData.get("allashirdetesId") as string
    const munkakorId = formData.get("munkakorId") as string
    const cvFile = formData.get("cv") as File

    if (!nev || !email || !cvFile || !munkakorId) {
      return { error: "Hiányzó kötelező mezők!" }
    }

    // Használjuk az Admin klienst, mivel bejelentkezés nélküli kérésről van szó
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Önéletrajz feltöltése
    const fileExt = cvFile.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const storagePath = `cv/${fileName}`
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('hr_dokumentumok')
      .upload(storagePath, cvFile, {
        contentType: cvFile.type,
        upsert: false
      })

    if (uploadError) {
      console.error("Storage hiba:", uploadError)
      return { error: "Nem sikerült feltölteni az önéletrajzot: " + uploadError.message }
    }

    // 2. Adatbázis bejegyzés létrehozása
    const { error: dbError } = await supabaseAdmin
      .from("hr_toborzas")
      .insert({
        allashirdetes_id: allashirdetesId,
        megpalyazott_munkakor_id: munkakorId,
        nev,
        email,
        telefon,
        uzenet,
        cv_storage_path: uploadData.path,
        statusz: "uj"
      })

    if (dbError) {
      console.error("Adatbázis hiba:", dbError)
      return { error: "Nem sikerült elmenteni a jelentkezést: " + dbError.message }
    }

    // Opcionális: Rögzítés az eseménynaplóban, mint külső esemény
    await supabaseAdmin.from("hr_esemeny_naplo").insert({
      modul: "toborzas",
      esemeny_tipus: "uj_jelentkezes",
      leiras: `Új jelentkezés érkezett a karrieroldalról: ${nev}`,
      celpont_id: munkakorId,
      entitas_tipus: "hr_munkakor",
      felhasznalo_id: null // Nincs bejelentkezett felhasználó
    })

    // Lekérjük a pozíció nevét az emailhez
    const { data: munkakor } = await supabaseAdmin
      .from("hr_munkakor")
      .select("megnevezes")
      .eq("id", munkakorId)
      .single()
    
    const positionName = munkakor?.megnevezes || "meghirdetett pozíció"

    // E-mail sablon összeállítása (vibrant, premium, modern design)
    const emailHtml = `
      <div style="font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <div style="background-color: #0f766e; padding: 32px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Sikeres Jelentkezés</h1>
            <p style="color: #ccfbf1; margin: 8px 0 0 0; font-size: 15px;">eaisyHR Karrier Portál</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px;">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 600;">Kedves ${nev}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
              Köszönjük, hogy megtiszteltél minket bizalmaddal! Örömmel értesítünk, hogy a(z) <strong>${positionName}</strong> pozícióra leadott jelentkezésed és az önéletrajzod sikeresen megérkezett hozzánk.
            </p>

            <div style="background-color: #f1f5f9; border-left: 4px solid #0f766e; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
              <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Mi a következő lépés?</h3>
              <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.5;">
                HR csapatunk hamarosan feldolgozza az anyagodat. Amint áttekintettük a pályázatodat, felvesszük veled a kapcsolatot a megadott elérhetőségeid egyikén a továbbiakkal kapcsolatban.
              </p>
            </div>

            <p style="font-size: 15px; color: #64748b; margin: 0;">
              Addig is szíves türelmedet kérjük. Sok sikert kívánunk a kiválasztási folyamat során!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
              Üdvözlettel,<br>
              <strong>eaisyHR Toborzási Csapat</strong>
            </p>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #cbd5e1;">
              Ez egy automatikusan generált üzenet, kérjük, ne válaszolj rá.
            </p>
          </div>

        </div>
      </div>
    `

    // Brevo e-mail küldés
    await sendNotificationEmail({
      to: email,
      subject: `Sikeres jelentkezés: ${positionName}`,
      html: emailHtml,
      senderName: 'eaisyHR Toborzás'
    })

    return { success: true }
  } catch (err: any) {
    console.error("Jelentkezési hiba:", err)
    return { error: "Váratlan hiba történt. Kérjük, próbálja újra később." }
  }
}
