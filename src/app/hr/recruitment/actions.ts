"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"

export async function updateCandidateStatus(candidateId: string, newStatus: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod a toborzás kezeléséhez." }
  }

  // Admin kliens az RLS hiánya miatt (a fenti kód már leellenőrizte a jogosultságot)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_toborzas")
    .update({ statusz: newStatus })
    .eq("id", candidateId)

  if (error) {
    console.error("Hiba a jelölt frissítésekor:", error)
    return { error: error.message }
  }

  // Automatikus Onboarding profil létrehozása, ha "elfogadva" státuszba kerül
  if (newStatus === "elfogadva") {
    // 1. Lekérjük a jelölt nevét és pozícióját
    const { data: candidate, error: fetchErr } = await adminClient
      .from("hr_toborzas")
      .select(`nev, email, megpalyazott_munkakor_id, hr_munkakor(megnevezes)`)
      .eq("id", candidateId)
      .single()
      
    if (fetchErr) {
      console.error("Hiba jelölt adatainak lekérésekor az onboardinghoz:", fetchErr)
    }

    if (candidate) {
      // Automatikusan átemeljük a munkavállalót (ami kiküldi az e-mailt)
      try {
        const { onboardEmployee } = await import("@/app/hr/admin/actions")
        await onboardEmployee({
          mode: "select_candidate",
          candidateId: candidateId,
          role: "munkavallalo",
          munkakorId: candidate.megpalyazott_munkakor_id || "none",
          belepes_datuma: new Date().toISOString()
        })
      } catch (e) {
        console.error("Hiba az automatikus átemelésnél", e)
      }

      // @ts-ignore - Supabase types might be tricky here
      const munkakor = candidate.hr_munkakor?.megnevezes || "Új munkatárs"
      
      // 2. Létrehozzuk az Onboarding rekordot
      const { data: newOnboarding, error: onbError } = await adminClient
        .from("hr_onboarding")
        .insert({
          toborzas_id: candidateId,
          nev: candidate.nev,
          munkakor: munkakor,
          belepes_datuma: "Hamarosan",
          statusz: "folyamatban"
        })
        .select()
        .single()

      if (newOnboarding && !onbError) {
        // 3. Hozzáadjuk az alapértelmezett feladatokat
        await adminClient.from("hr_onboarding_feladat").insert([
          { onboarding_id: newOnboarding.id, cim: "Munkaszerződés aláírása", felelos_reszleg: "HR", statusz: "pending" },
          { onboarding_id: newOnboarding.id, cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés", statusz: "pending" },
          { onboarding_id: newOnboarding.id, cim: "Eszközigénylés (Laptop, Telefon)", felelos_reszleg: "IT", statusz: "pending" },
          { onboarding_id: newOnboarding.id, cim: "Munkavédelmi oktatás (EHS)", felelos_reszleg: "EHS", statusz: "pending" }
        ])
        
        // Logolás
        await adminClient.from("hr_esemeny_naplo").insert({
          felhasznalo_id: user.id,
          esemeny_tipus: "rendszer_inditas", 
          entitas_tipus: "hr_onboarding",
          entitas_id: newOnboarding.id,
          megjegyzes: `Automatikus Onboarding profil létrehozva a sikeres toborzás után: ${candidate.nev}`
        })
      }
    }
  } else if (newStatus === "interju") {
    // Ha interjúra húzták a jelöltet, azonnal küldünk egy értesítő e-mailt
    const { data: candidate, error: fetchErr } = await adminClient
      .from("hr_toborzas")
      .select(`nev, email, hr_munkakor(megnevezes)`)
      .eq("id", candidateId)
      .single()

    if (!fetchErr && candidate && candidate.email) {
      try {
        // @ts-ignore
        const munkakor = candidate.hr_munkakor?.megnevezes || "megpályázott pozíció"
        
        await sendNotificationEmail({
          to: candidate.email,
          subject: "Meghívás személyes interjúra - Think AI Kft.",
          html: buildHtmlEmail(
            "Meghívás személyes interjúra",
            `Kedves ${candidate.nev}!\n\nÖrömmel értesítjük, hogy jelentkezését a(z) ${munkakor} pozícióra sikeresnek értékeltük. Szeretnénk behívni egy személyes interjúra!\n\nHamarosan jelentkezni fogunk a pontos időpont egyeztetése céljából.\n\nÜdvözlettel,\nThink AI Kft. HR csapata`,
            [],
            "Jelentkezés megtekintése", // Button fallback
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/hr/recruitment`
          )
        })
      } catch (err) {
        console.error("Nem sikerült elküldeni az interjú meghívó e-mailt:", err)
      }
    }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_toborzas",
    entitas_id: candidateId,
    megjegyzes: `Jelölt státusza módosítva erre: ${newStatus}`
  })

  revalidatePath("/hr/recruitment")
  revalidatePath("/hr/onboarding")
  return { success: true }
}

export async function scheduleInterview(candidateId: string, idopont: string, helyszin: string, uzenet: string, smsKerve: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { error } = await adminClient
    .from("hr_toborzas")
    .update({ 
      statusz: "interju",
      interju_idopont: idopont,
      interju_helyszin: helyszin,
      sms_emlekezteto_kerve: smsKerve
    })
    .eq("id", candidateId)

  if (error) return { error: error.message }

  // E-mail küldés
  const { data: candidate } = await adminClient.from("hr_toborzas").select(`nev, email`).eq("id", candidateId).single()
  
  if (candidate && candidate.email) {
    try {
      await sendNotificationEmail({
        to: candidate.email,
        subject: "Meghívás személyes interjúra - Think AI Kft.",
        html: buildHtmlEmail(
          "Meghívás személyes interjúra",
          uzenet,
          [
            { label: "Időpont", value: new Date(idopont).toLocaleString('hu-HU', { dateStyle: 'long', timeStyle: 'short' }) },
            { label: "Helyszín / Link", value: helyszin }
          ],
          "Jelentkezés megtekintése",
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/hr/recruitment`
        )
      })
    } catch (err) {
      console.error("Nem sikerült elküldeni az interjú meghívó e-mailt:", err)
    }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id, esemeny_tipus: "munkatars_felvetel", entitas_tipus: "hr_toborzas", entitas_id: candidateId,
    megjegyzes: `Interjú egyeztetve: ${new Date(idopont).toLocaleString('hu-HU')}`
  })

  revalidatePath("/hr/recruitment")
  return { success: true }
}

export async function addCandidate(formData: FormData) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod a toborzás kezeléséhez." }
  }

  const nev = formData.get("nev") as string
  const email = formData.get("email") as string
  const jobId = formData.get("jobId") as string

  if (!nev || !email) return { error: "Név és email kötelező!" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_toborzas")
    .insert([{
      nev,
      email,
      megpalyazott_munkakor_id: jobId || null,
      statusz: 'uj'
    }])

  if (error) {
    console.error("Hiba jelölt rögzítésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_toborzas",
    megjegyzes: `Új jelölt rögzítve a toborzásba: ${nev}`
  })

  revalidatePath("/hr/recruitment")
  return { success: true }
}

export async function deleteCandidate(candidateId: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod a toborzás kezeléséhez." }
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_toborzas")
    .delete()
    .eq("id", candidateId)

  if (error) {
    console.error("Hiba a jelölt törlésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/recruitment")
  return { success: true }
}

export async function generateCvSignedUrl(candidateId: string, storagePath: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod a CV megtekintéséhez." }
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // 60 másodperces aláírt URL generálása
  const { data, error } = await adminClient.storage
    .from('hr_dokumentumok')
    .createSignedUrl(storagePath, 60)
    
  if (error) {
    console.error("Signed URL hiba:", error)
    return { error: "Nem sikerült legenerálni a CV megtekintő linket." }
  }

  // Szigorú audit naplózás AGENTS.md alapján
  await adminClient.from("esemeny_naplo").insert({
    entitas_tipus: "hr_toborzas",
    entitas_id: candidateId,
    esemeny_tipus: "letoltes",
    user_id: user.id,
    uj_ertek: { fajl: storagePath, esemeny: "CV megtekintése" }
  })

  return { signedUrl: data.signedUrl }
}

export async function updateCandidateNote(candidateId: string, note: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor, teljes_nev')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod a jegyzet módosításához." }
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // 1. Fetch current notes
  const { data: candidate } = await adminClient
    .from("hr_toborzas")
    .select("naptar_jegyzet")
    .eq("id", candidateId)
    .single()

  let notes = []
  if (candidate?.naptar_jegyzet) {
    try {
      notes = JSON.parse(candidate.naptar_jegyzet)
      if (!Array.isArray(notes)) notes = []
    } catch (e) {
      // Ha nem JSON volt eddig, akkor az első jegyzetként elmentjük
      notes = [{
        date: new Date().toISOString(),
        text: candidate.naptar_jegyzet,
        author: "Rendszer / Korábbi"
      }]
    }
  }

  // 2. Append new note
  const newNote = {
    date: new Date().toISOString(),
    text: note,
    author: profile.teljes_nev || "HR Munkatárs"
  }
  notes.push(newNote)
  const newNotesString = JSON.stringify(notes)

  // 3. Update database
  const { error } = await adminClient
    .from("hr_toborzas")
    .update({ naptar_jegyzet: newNotesString })
    .eq("id", candidateId)

  if (error) {
    console.error("Hiba jegyzet mentésekor:", error)
    return { error: "Nem sikerült elmenteni a jegyzetet." }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_toborzas",
    entitas_id: candidateId,
    megjegyzes: "Jelölt jegyzete frissítve"
  })

  revalidatePath("/hr/recruitment")
  return { success: true, newNotesString }
}
