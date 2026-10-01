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

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin", "toborzo"].includes(profile.hr_szerepkor)) {
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

  // Automatikus Onboarding profil létrehozása, ha "elfogadva" státuszba kerül (pre-onboarding)
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
      // Duplikációvédelem: ellenőrizzük, hogy létezik-e már onboarding folyamat ehhez a jelölthöz
      const { data: existingOnboarding } = await adminClient
        .from("hr_onboarding")
        .select("id")
        .eq("toborzas_id", candidateId)
        .maybeSingle()

      if (!existingOnboarding) {
        const munkakor = (candidate as any).hr_munkakor?.megnevezes || "Új munkatárs"
        
        // Létrehozzuk az Onboarding rekordot előkészületi ("varakozik") állapotban.
        // Fiók és e-mail még NEM készül, azt a HR indítja el az Onboarding felületen a belépés közeledtével.
        const { data: newOnboarding, error: onbError } = await adminClient
          .from("hr_onboarding")
          .insert({
            toborzas_id: candidateId,
            nev: candidate.nev,
            munkakor: munkakor,
            belepes_datuma: "Hamarosan",
            statusz: "folyamatban",
            fiok_allapot: "varakozik"
          })
          .select()
          .single()

        if (newOnboarding && !onbError) {
          // Standard belépési feladatok hozzáadása
          await adminClient.from("hr_onboarding_feladat").insert([
            { onboarding_id: newOnboarding.id, cim: "Munkaszerződés előkészítése & aláírása", felelos_reszleg: "HR", statusz: "pending" },
            { onboarding_id: newOnboarding.id, cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés", statusz: "pending" },
            { onboarding_id: newOnboarding.id, cim: "Eszközigény leadása (Laptop, Telefon)", felelos_reszleg: "IT", statusz: "pending" },
            { onboarding_id: newOnboarding.id, cim: "Munkavédelmi és tűzvédelmi oktatás", felelos_reszleg: "EHS", statusz: "pending" },
            { onboarding_id: newOnboarding.id, cim: "Munkavállalói fiók aktiválása & e-mail", felelos_reszleg: "HR", statusz: "pending" }
          ])
          
          // Logolás
          await adminClient.from("hr_esemeny_naplo").insert({
            felhasznalo_id: user.id,
            esemeny_tipus: "rendszer_inditas", 
            entitas_tipus: "hr_onboarding",
            entitas_id: newOnboarding.id,
            megjegyzes: `Onboarding előkészület indítva (fiók aktiválásra vár): ${candidate.nev}`
          })
        }
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
        const munkakor = (candidate as any).hr_munkakor?.megnevezes || "megpályázott pozíció"
        
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

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin", "toborzo"].includes(profile.hr_szerepkor)) {
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

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin", "toborzo"].includes(profile.hr_szerepkor)) {
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

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin", "toborzo"].includes(profile.hr_szerepkor)) {
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
    .select('hr_szerepkor, nev')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin", "toborzo"].includes(profile.hr_szerepkor)) {
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
    author: profile.nev || "HR Munkatárs"
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
