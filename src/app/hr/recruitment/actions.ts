"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function updateCandidateStatus(candidateId: string, newStatus: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.szerepkor)) {
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
      .select(`nev, hr_munkakor(megnevezes)`)
      .eq("id", candidateId)
      .single()
      
    if (fetchErr) {
      console.error("Hiba jelölt adatainak lekérésekor az onboardinghoz:", fetchErr)
    }

    if (candidate) {
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

export async function addCandidate(formData: FormData) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.szerepkor)) {
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
    .select("szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.szerepkor)) {
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
