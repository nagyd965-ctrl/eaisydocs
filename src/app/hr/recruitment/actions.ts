"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"
import { getBaseUrl } from "@/utils/url"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyRecruitmentAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false, error: "Nincs bejelentkezve", activeCompanyId: null, user: null }

  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) return { allowed: false, error: "Nincs kiválasztott cég", activeCompanyId: null, user }

  const { hrRole, isCompanyAdmin } = await getActiveCompanyMemberRolesServer(activeCompanyId)
  if (!isCompanyAdmin && !["hr_munkatars", "hr_vezeto", "admin", "toborzo"].includes(hrRole)) {
    return { allowed: false, error: "Nincs jogosultságod a toborzás kezeléséhez ebben a cégben.", activeCompanyId, user }
  }

  return { allowed: true, activeCompanyId, hrRole, isCompanyAdmin, user }
}

export async function updateCandidateStatus(candidateId: string, newStatus: string) {
  const auth = await verifyRecruitmentAccess()
  if (!auth.allowed || !auth.activeCompanyId || !auth.user) {
    return { error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()

  // Ellenőrizzük, hogy a jelölt az aktív céghez tartozik-e
  const { data: currentCandidate } = await adminClient
    .from("hr_toborzas")
    .select("id, company_id")
    .eq("id", candidateId)
    .single()

  if (currentCandidate?.company_id && currentCandidate.company_id !== auth.activeCompanyId) {
    return { error: "Nincs jogosultságod más cég jelöltjét módosítani." }
  }

  const { error } = await adminClient
    .from("hr_toborzas")
    .update({ 
      statusz: newStatus,
      company_id: currentCandidate?.company_id || auth.activeCompanyId 
    })
    .eq("id", candidateId)

  if (error) {
    console.error("Hiba a jelölt frissítésekor:", error)
    return { error: error.message }
  }

  // Automatikus Onboarding profil létrehozása, ha "elfogadva" státuszba kerül (pre-onboarding)
  if (newStatus === "elfogadva") {
    const { data: candidate, error: fetchErr } = await adminClient
      .from("hr_toborzas")
      .select(`
        nev, 
        email, 
        megpalyazott_munkakor_id, 
        hr_munkakor (
          id, 
          megnevezes, 
          szervezeti_egyseg_id,
          hr_szervezeti_egyseg (id, nev)
        )
      `)
      .eq("id", candidateId)
      .single()
      
    if (fetchErr) {
      console.error("Hiba jelölt adatainak lekérésekor az onboardinghoz:", fetchErr)
    }

    if (candidate) {
      const { data: existingOnboarding } = await adminClient
        .from("hr_onboarding")
        .select("id")
        .eq("toborzas_id", candidateId)
        .maybeSingle()

      if (!existingOnboarding) {
        const munkakor = (candidate as any).hr_munkakor?.megnevezes || "Új munkatárs"
        const reszleg = (candidate as any).hr_munkakor?.hr_szervezeti_egyseg?.nev || null
        
        const { data: newOnboarding, error: onbError } = await adminClient
          .from("hr_onboarding")
          .insert({
            company_id: auth.activeCompanyId,
            toborzas_id: candidateId,
            nev: candidate.nev,
            munkakor: munkakor,
            reszleg: reszleg,
            belepes_datuma: "Hamarosan",
            statusz: "folyamatban",
            fiok_allapot: "varakozik"
          })
          .select()
          .single()

        if (newOnboarding && !onbError) {
          await adminClient.from("hr_onboarding_feladat").insert([
            { onboarding_id: newOnboarding.id, cim: "Munkaszerződés előkészítése & aláírása", felelos_reszleg: "HR", statusz: "pending" },
            { onboarding_id: newOnboarding.id, cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés", statusz: "pending" },
            { onboarding_id: newOnboarding.id, cim: "Eszközigény leadása (Laptop, Telefon)", felelos_reszleg: "IT", statusz: "pending" },
            { onboarding_id: newOnboarding.id, cim: "Munkavédelmi és tűzvédelmi oktatás", felelos_reszleg: "EHS", statusz: "pending" },
            { onboarding_id: newOnboarding.id, cim: "Munkavállalói fiók aktiválása & e-mail", felelos_reszleg: "HR", statusz: "pending" }
          ])
          
          await adminClient.from("hr_esemeny_naplo").insert({
            felhasznalo_id: auth.user.id,
            esemeny_tipus: "rendszer_inditas", 
            entitas_tipus: "hr_onboarding",
            entitas_id: newOnboarding.id,
            megjegyzes: `Onboarding előkészület indítva (fiók aktiválásra vár): ${candidate.nev}`,
            company_id: auth.activeCompanyId
          })
        }
      }
    }
  } else if (newStatus === "interju") {
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
          subject: "Meghívás személyes interjúra - eaisyHR",
          senderName: "eaisyHR Toborzás",
          senderEmail: "eaisyhr@thinkai.hu",
          html: buildHtmlEmail(
            "Meghívás személyes interjúra",
            `Kedves ${candidate.nev}!\n\nÖrömmel értesítjük, hogy jelentkezését a(z) ${munkakor} pozícióra sikeresnek értékeltük. Szeretnénk behívni egy személyes interjúra!\n\nHamarosan jelentkezni fogunk a pontos időpont egyeztetése céljából.\n\nÜdvözlettel,\neaisyHR Csapat`,
            [],
            "Jelentkezés megtekintése",
            `${getBaseUrl()}/hr/recruitment`,
            "eaisyHR"
          )
        })
      } catch (err) {
        console.error("Nem sikerült elküldeni az interjú meghívó e-mailt:", err)
      }
    }
  }

  const supabase = await createClient()
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_toborzas",
    entitas_id: candidateId,
    megjegyzes: `Jelölt státusza módosítva erre: ${newStatus}`,
    company_id: auth.activeCompanyId
  })

  revalidatePath("/hr/recruitment")
  revalidatePath("/hr/onboarding")
  return { success: true }
}

export async function scheduleInterview(candidateId: string, idopont: string, helyszin: string, uzenet: string, smsKerve: boolean) {
  const auth = await verifyRecruitmentAccess()
  if (!auth.allowed || !auth.activeCompanyId || !auth.user) {
    return { error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()

  const { error } = await adminClient
    .from("hr_toborzas")
    .update({ 
      statusz: "interju",
      interju_idopont: idopont,
      interju_helyszin: helyszin,
      sms_emlekezteto_kerve: smsKerve,
      company_id: auth.activeCompanyId
    })
    .eq("id", candidateId)

  if (error) return { error: error.message }

  const { data: candidate } = await adminClient.from("hr_toborzas").select(`nev, email`).eq("id", candidateId).single()
  
  if (candidate && candidate.email) {
    try {
      await sendNotificationEmail({
        to: candidate.email,
        subject: "Meghívás személyes interjúra - eaisyHR",
        senderName: "eaisyHR Toborzás",
        senderEmail: "eaisyhr@thinkai.hu",
        html: buildHtmlEmail(
          "Meghívás személyes interjúra",
          uzenet,
          [
            { label: "Időpont", value: new Date(idopont).toLocaleString('hu-HU', { dateStyle: 'long', timeStyle: 'short' }) },
            { label: "Helyszín / Link", value: helyszin }
          ],
          "Jelentkezés megtekintése",
          `${getBaseUrl()}/hr/recruitment`,
          "eaisyHR"
        )
      })
    } catch (err) {
      console.error("Nem sikerült elküldeni az interjú meghívó e-mailt:", err)
    }
  }

  const supabase = await createClient()
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id, esemeny_tipus: "munkatars_felvetel", entitas_tipus: "hr_toborzas", entitas_id: candidateId,
    megjegyzes: `Interjú egyeztetve: ${new Date(idopont).toLocaleString('hu-HU')}`,
    company_id: auth.activeCompanyId
  })

  revalidatePath("/hr/recruitment")
  return { success: true }
}

export async function addCandidate(formData: FormData) {
  const auth = await verifyRecruitmentAccess()
  if (!auth.allowed || !auth.activeCompanyId || !auth.user) {
    return { error: auth.error || "Hozzáférés megtagadva" }
  }

  const nev = formData.get("nev") as string
  const email = formData.get("email") as string
  const jobId = formData.get("jobId") as string

  if (!nev || !email) return { error: "Név és email kötelező!" }

  const adminClient = getAdminClient()

  const { error } = await adminClient
    .from("hr_toborzas")
    .insert([{
      nev,
      email,
      megpalyazott_munkakor_id: jobId || null,
      statusz: 'uj',
      company_id: auth.activeCompanyId
    }])

  if (error) {
    console.error("Hiba jelölt rögzítésekor:", error)
    return { error: error.message }
  }

  const supabase = await createClient()
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_toborzas",
    megjegyzes: `Új jelölt rögzítve a toborzásba: ${nev}`,
    company_id: auth.activeCompanyId
  })

  revalidatePath("/hr/recruitment")
  return { success: true }
}

export async function deleteCandidate(candidateId: string) {
  const auth = await verifyRecruitmentAccess()
  if (!auth.allowed || !auth.activeCompanyId) {
    return { error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()

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
  const auth = await verifyRecruitmentAccess()
  if (!auth.allowed || !auth.user) {
    return { error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()
  
  const { data, error } = await adminClient.storage
    .from('hr_dokumentumok')
    .createSignedUrl(storagePath, 60)
    
  if (error) {
    console.error("Signed URL hiba:", error)
    return { error: "Nem sikerült legenerálni a CV megtekintő linket." }
  }

  await adminClient.from("esemeny_naplo").insert({
    entitas_tipus: "hr_toborzas",
    entitas_id: candidateId,
    esemeny_tipus: "letoltes",
    user_id: auth.user.id,
    uj_ertek: { fajl: storagePath, esemeny: "CV megtekintése" }
  })

  return { signedUrl: data.signedUrl }
}

export async function updateCandidateNote(candidateId: string, note: string) {
  const auth = await verifyRecruitmentAccess()
  if (!auth.allowed || !auth.activeCompanyId || !auth.user) {
    return { error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()
  
  const { data: profile } = await adminClient
    .from("felhasznalo_profil")
    .select('nev')
    .eq("id", auth.user.id)
    .single()

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
    } catch {
      notes = [{
        date: new Date().toISOString(),
        text: candidate.naptar_jegyzet,
        author: "Rendszer / Korábbi"
      }]
    }
  }

  const newNote = {
    date: new Date().toISOString(),
    text: note,
    author: profile?.nev || "HR Munkatárs"
  }
  notes.push(newNote)
  const newNotesString = JSON.stringify(notes)

  const { error } = await adminClient
    .from("hr_toborzas")
    .update({ naptar_jegyzet: newNotesString })
    .eq("id", candidateId)

  if (error) {
    console.error("Hiba jegyzet mentésekor:", error)
    return { error: "Nem sikerült elmenteni a jegyzetet." }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_toborzas",
    entitas_id: candidateId,
    megjegyzes: "Jelölt jegyzete frissítve",
    company_id: auth.activeCompanyId
  })

  revalidatePath("/hr/recruitment")
  return { success: true, newNotesString }
}

export interface SaveJobPostingPayload {
  id?: string
  cim: string
  munkakor_id: string
  rovid_leiras?: string | null
  reszletes_leiras?: string | null
  is_internal?: boolean
  munkavegzes_modja?: string | null
  helyszin?: string | null
  foglalkoztatas_tipusa?: string | null
  tapasztalati_szint?: string | null
  reszleg_nev?: string | null
  bersav_min?: number | null
  bersav_max?: number | null
  bersav_publikus?: boolean
  jelentkezesi_hatarido?: string | null
  company_id?: string | null
}

export async function saveJobPostingAction(payload: SaveJobPostingPayload) {
  const auth = await verifyRecruitmentAccess()
  if (!auth.allowed || !auth.activeCompanyId || !auth.user) {
    return { error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()

  // Garantált cég-hozzárendelés: az aktív cégből (vagy a munkakör cégéből)
  let targetCompanyId = auth.activeCompanyId || payload.company_id || null
  if (payload.munkakor_id) {
    const { data: jobRow } = await adminClient
      .from("hr_munkakor")
      .select("company_id, hr_szervezeti_egyseg:szervezeti_egyseg_id(nev)")
      .eq("id", payload.munkakor_id)
      .maybeSingle()
    if (jobRow?.company_id) {
      targetCompanyId = jobRow.company_id
    }
    if (!payload.reszleg_nev) {
      const org = Array.isArray((jobRow as any)?.hr_szervezeti_egyseg)
        ? (jobRow as any).hr_szervezeti_egyseg[0]
        : (jobRow as any)?.hr_szervezeti_egyseg
      if (org?.nev) {
        payload.reszleg_nev = org.nev
      }
    }
  }

  const recordData: Record<string, unknown> = {
    cim: payload.cim.trim(),
    munkakor_id: payload.munkakor_id,
    rovid_leiras: payload.rovid_leiras?.trim() || null,
    reszletes_leiras: payload.reszletes_leiras?.trim() || null,
    is_internal: !!payload.is_internal,
    munkavegzes_modja: payload.munkavegzes_modja || "hibrid",
    helyszin: payload.helyszin?.trim() || null,
    foglalkoztatas_tipusa: payload.foglalkoztatas_tipusa || "teljes_munkaido",
    tapasztalati_szint: payload.tapasztalati_szint || "medior",
    reszleg_nev: payload.reszleg_nev?.trim() || null,
    bersav_min: payload.bersav_min || null,
    bersav_max: payload.bersav_max || null,
    bersav_publikus: !!payload.bersav_publikus,
    jelentkezesi_hatarido: payload.jelentkezesi_hatarido || null,
    company_id: targetCompanyId,
  }

  if (payload.id) {
    const { data: updated, error } = await adminClient
      .from("hr_allashirdetes")
      .update(recordData)
      .eq("id", payload.id)
      .select("*, hr_munkakor (megnevezes)")
      .single()

    if (error) {
      console.error("Hiba álláshirdetés frissítésekor:", error)
      return { error: error.message }
    }

    revalidatePath("/hr/recruitment")
    revalidatePath("/karrier")
    revalidatePath(`/karrier/${payload.id}`)
    return { success: true, data: updated }
  } else {
    const { data: inserted, error } = await adminClient
      .from("hr_allashirdetes")
      .insert(recordData)
      .select("*, hr_munkakor (megnevezes)")
      .single()

    if (error) {
      console.error("Hiba álláshirdetés létrehozásakor:", error)
      return { error: error.message }
    }

    revalidatePath("/hr/recruitment")
    revalidatePath("/karrier")
    return { success: true, data: inserted }
  }
}
