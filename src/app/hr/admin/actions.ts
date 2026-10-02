"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { sendNotificationEmail } from "@/utils/mailer"

export async function onboardEmployee(data: {
  mode: string
  userId?: string
  candidateId?: string
  email?: string
  password?: string
  nev?: string
  telefon?: string
  role: string
  munkakorId: string
  belepes_datuma: string
}) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let finalUserId = data.userId

  if (data.mode === "select_candidate") {
    // 1. Kikeressük a jelentkezőt
    const { data: candidate } = await supabaseAdmin
      .from("hr_toborzas")
      .select("nev, email")
      .eq("id", data.candidateId)
      .single()

    if (!candidate) {
      return { error: "Nem található a kiválasztott jelentkező." }
    }

    const generatedPassword = "Welcome2026!"

    // 2. Létrehozzuk a fiókot az e-mailjével
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: candidate.email,
      email_confirm: true,
      password: generatedPassword,
      user_metadata: {
        nev: candidate.nev
      }
    })

    let isExistingUser = false
    if (authError || !authData.user) {
      // Ha a felhasználó már létezik ezzel az email címmel, megkeressük
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === candidate.email?.toLowerCase())
      if (existingUser) {
        finalUserId = existingUser.id
        isExistingUser = true
      } else {
        return { error: authError?.message || "Nem sikerült a felhasználót létrehozni az átemelés során." }
      }
    } else {
      finalUserId = authData.user.id
    }
    await new Promise(resolve => setTimeout(resolve, 500))

    // 3. Ha teljesen új fiók, beállítjuk a nevet
    if (!isExistingUser) {
      await supabaseAdmin
        .from("felhasznalo_profil")
        .update({ nev: candidate.nev })
        .eq("id", finalUserId)

      // 4. Kiküldjük az e-mailt a Brevo-n keresztül kizárólag új felhasználónak
      const emailHtml = `
        <h2>Üdvözlünk a csapatban, ${candidate.nev}!</h2>
        <p>A jelentkezésedet elfogadtuk, és örömmel értesítünk, hogy létrehoztuk számodra a hozzáférést a vállalati HR rendszerhez (eaisyHR).</p>
        <br/>
        <p><b>Bejelentkezési adataid:</b></p>
        <p>E-mail cím: ${candidate.email}</p>
        <p>Ideiglenes jelszó: <b>${generatedPassword}</b></p>
        <br/>
        <p>Kérjük, az első bejelentkezés után azonnal változtasd meg a jelszavadat a Profil beállítások menüpontban!</p>
        <br/>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login" style="display:inline-block;padding:10px 20px;background-color:#14b8a6;color:white;text-decoration:none;border-radius:5px;">Bejelentkezés az eaisyHR-be</a>
        <br/><br/>
        <p>Üdvözlettel,<br/>A HR Csapat</p>
      `

      await sendNotificationEmail({
        to: candidate.email,
        subject: "Üdvözlünk a csapatban! - eaisyHR hozzáférés",
        html: emailHtml,
        senderName: "eaisyHR Rendszer",
        senderEmail: "eaisyhr@thinkai.hu"
      })
    }
  } else if (data.mode === "create_new") {
    // 0. Hozzuk létre az új felhasználót az Auth-ban
    let isExistingUser = false
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email!,
      email_confirm: true,
      password: data.password!,
      user_metadata: {
        nev: data.nev!
      }
    })

    if (authError || !authData.user) {
      // Ha már létezik, feloldjuk a meglévőt
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === data.email?.toLowerCase())
      if (existingUser) {
        finalUserId = existingUser.id
        isExistingUser = true
      } else {
        return { error: authError?.message || "Nem sikerült a felhasználót létrehozni." }
      }
    } else {
      finalUserId = authData.user.id
    }

    // Várjunk egy pillanatot, hogy lefusson a trigger, ami létrehozza a felhasznalo_profilt
    await new Promise(resolve => setTimeout(resolve, 500))

    if (!isExistingUser) {
      await supabaseAdmin
        .from("felhasznalo_profil")
        .update({ nev: data.nev! })
        .eq("id", finalUserId)
    }
  }

  if (!finalUserId) {
    return { error: "Hiányzik a felhasználó azonosítója." }
  }

  // 0.5. Határozzuk meg a szervezeti egységet a munkakör alapján
  let orgUnitId = null;
  if (data.munkakorId && data.munkakorId !== "none") {
    const { data: jobData } = await supabaseAdmin
      .from("hr_munkakor")
      .select("szervezeti_egyseg_id")
      .eq("id", data.munkakorId)
      .single()
    if (jobData?.szervezeti_egyseg_id) {
      orgUnitId = jobData.szervezeti_egyseg_id
    }
  }

  // 1. Meglévő profil lekérdezése a meglévő szerepkör és modulok védelmére
  const { data: existingProf } = await supabaseAdmin
    .from("felhasznalo_profil")
    .select("szerepkor, hr_szerepkor, elerheto_modulok")
    .eq("id", finalUserId)
    .single()

  const updateData: any = {}

  // SOHA ne fokozzunk le admint vagy hr_vezetőt munkavállalóvá!
  const isHighPrivilege = existingProf?.hr_szerepkor === "admin" || existingProf?.szerepkor === "admin" || existingProf?.hr_szerepkor === "hr_vezeto"
  if (!isHighPrivilege) {
    updateData.hr_szerepkor = data.role
  }

  // Modulok: a meglévő modulokat (pl. docs) SOHA ne töröljük, hanem uniózzuk a hr-rel!
  const existingModules = Array.isArray(existingProf?.elerheto_modulok) ? existingProf.elerheto_modulok : []
  updateData.elerheto_modulok = Array.from(new Set([...existingModules, "hr"]))

  if (orgUnitId) {
    updateData.hr_szervezeti_egyseg_id = orgUnitId
  }
  if (data.telefon !== undefined && data.telefon !== "") {
    updateData.telefon = data.telefon
  }

  await supabaseAdmin
    .from("felhasznalo_profil")
    .update(updateData)
    .eq("id", finalUserId)

  // 2. Létrehozzuk a hr_dolgozo_adatlapot
  const { error: adatlapError } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .insert([{ id: finalUserId }])

  if (adatlapError) {
    // Ha az adatlap már létezik (mert duplán kattintottak), azt elnyeljük
    if (adatlapError.code !== '23505') {
      return { error: "Hiba az adatlap létrehozásakor: " + adatlapError.message }
    }
  }

  // 3. Létrehozzuk a jogviszonyt
  const { data: jogvData, error: jogvError } = await supabaseAdmin
    .from("hr_jogviszony")
    .insert([{
      dolgozo_id: finalUserId,
      belepes_datuma: data.belepes_datuma,
      tipus: "teljes_munkaido"
    }])
    .select()
    .single()

  if (jogvError) {
    return { error: "Hiba a jogviszony létrehozásakor: " + jogvError.message }
  }

  // 4. Létrehozzuk a beosztást, ha van munkakör kiválasztva
  if (data.munkakorId && data.munkakorId !== "none") {
    const { error: beosztasError } = await supabaseAdmin
      .from("hr_beosztas")
      .insert([{
        jogviszony_id: jogvData.id,
        munkakor_id: data.munkakorId,
        ervenyes_tol: data.belepes_datuma
      }])
    
    if (beosztasError) {
      return { error: "Hiba a beosztás létrehozásakor: " + beosztasError.message }
    }
  }

  revalidatePath("/hr/settings")
  return { success: true, userId: finalUserId }
}
