"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { onboardEmployee } from "@/app/hr/admin/actions"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function toggleTaskStatus(taskId: string, currentStatus: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const newStatus = currentStatus === 'pending' ? 'done' : 'pending'

  // Feladat lekérése audit infóhoz
  const { data: taskData } = await supabase
    .from("hr_onboarding_feladat")
    .select(`cim, onboarding_id, hr_onboarding(nev)`)
    .eq("id", taskId)
    .single()

  const { error } = await supabase
    .from("hr_onboarding_feladat")
    .update({ statusz: newStatus })
    .eq("id", taskId)

  if (error) {
    console.error("Hiba feladat módosításakor:", error)
    return { error: error.message }
  }

  // Audit napló írása
  if (taskData) {
    const statusText = newStatus === 'done' ? 'Elvégezve' : 'Folyamatban'
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_megtekintes", 
      entitas_tipus: "hr_onboarding_feladat",
      entitas_id: taskId,
      megjegyzes: `Onboarding feladat (${taskData.cim}) státusza átállítva: ${statusText} - ${(taskData.hr_onboarding as any)?.nev} profilján`
    })
  }

  revalidatePath("/hr/onboarding")
  return { success: true }
}

export async function updateOnboardingDate(onboardingId: string, newDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_onboarding")
    .update({ belepes_datuma: newDate })
    .eq("id", onboardingId)

  if (error) {
    console.error("Hiba a dátum mentésekor:", error)
    return { error: error.message }
  }

  // Logolás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_onboarding",
    entitas_id: onboardingId,
    megjegyzes: `Belépési dátum frissítve erre: ${newDate}`
  })

  revalidatePath("/hr/onboarding")
  return { success: true }
}

export async function addOnboardingTask(onboardingId: string, cim: string, felelos_reszleg: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_onboarding_feladat")
    .insert([{
      onboarding_id: onboardingId,
      cim,
      felelos_reszleg,
      statusz: 'pending'
    }])

  if (error) {
    console.error("Hiba a feladat hozzáadásakor:", error)
    return { error: error.message }
  }

  // Logolás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_modositas", 
    entitas_tipus: "hr_onboarding",
    entitas_id: onboardingId,
    megjegyzes: `Új feladat hozzáadva: ${cim} (${felelos_reszleg})`
  })

  revalidatePath("/hr/onboarding")
  return { success: true }
}

export async function deleteOnboardingTask(taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: taskData } = await supabase
    .from("hr_onboarding_feladat")
    .select(`cim, onboarding_id`)
    .eq("id", taskId)
    .single()

  const { error } = await supabase
    .from("hr_onboarding_feladat")
    .delete()
    .eq("id", taskId)

  if (error) {
    console.error("Hiba a feladat törlésekor:", error)
    return { error: error.message }
  }

  if (taskData) {
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_torles", 
      entitas_tipus: "hr_onboarding",
      entitas_id: taskData.onboarding_id,
      megjegyzes: `Feladat törölve: ${taskData.cim}`
    })
  }

  revalidatePath("/hr/onboarding")
  return { success: true }
}

/**
 * Munkavállalói fiók aktiválása és hivatalos Welcome e-mail kiküldése
 * Ezt a HR indítja el az Onboarding felületen a belépés közeledtével vagy az 1. munkanapon
 */
export async function activateOnboardingAccount(onboardingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin", "hr_vezeto", "hr_munkatars"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod a munkavállalói fiók aktiválásához." }
  }

  const adminClient = getAdminClient()

  // Lekérjük az onboarding adatokat a toborzási jelölttel és feladatokkal együtt
  const { data: onboarding, error: onbErr } = await adminClient
    .from("hr_onboarding")
    .select(`
      *,
      hr_toborzas (*),
      hr_onboarding_feladat (*)
    `)
    .eq("id", onboardingId)
    .single()

  if (onbErr || !onboarding) {
    return { error: "Nem található az onboarding profil." }
  }

  if (onboarding.fiok_allapot === "aktivalva" && onboarding.dolgozo_id) {
    return { error: "Ez a munkavállalói fiók már korábban aktiválva lett." }
  }

  let finalUserId = onboarding.dolgozo_id

  if (!finalUserId && onboarding.toborzas_id) {
    // Meghívjuk a bevált onboardEmployee admin akciót, ami elkészíti az auth fiókot, adatlapot, jogviszonyt és kiküldi az e-mailt
    const candidate = onboarding.hr_toborzas
    const result = await onboardEmployee({
      mode: "select_candidate",
      candidateId: onboarding.toborzas_id,
      role: "munkavallalo",
      munkakorId: candidate?.megpalyazott_munkakor_id || "none",
      belepes_datuma: onboarding.belepes_datuma && onboarding.belepes_datuma !== "Hamarosan" 
        ? onboarding.belepes_datuma 
        : new Date().toISOString()
    })

    if (result.error) {
      console.error("Hiba a fiók generálásakor:", result.error)
      return { error: result.error }
    }

    finalUserId = result.userId
  }

  if (!finalUserId) {
    return { error: "Nem sikerült a felhasználói azonosítót meghatározni a fiók aktiválásához." }
  }

  // Frissítjük az Onboarding rekordot
  const nowIso = new Date().toISOString()
  const { error: updateErr } = await adminClient
    .from("hr_onboarding")
    .update({
      dolgozo_id: finalUserId,
      fiok_allapot: "aktivalva",
      fiok_aktivalva_ekor: nowIso
    })
    .eq("id", onboardingId)

  if (updateErr) {
    console.error("Hiba az onboarding rekord frissítésekor:", updateErr)
    return { error: updateErr.message }
  }

  // Automatikusan készre állítjuk a fiókaktiválási feladatot a listában (ha van ilyen)
  const activationTask = (onboarding.hr_onboarding_feladat || []).find((t: any) =>
    t.cim.toLowerCase().includes("fiók") || 
    t.cim.toLowerCase().includes("aktivál") || 
    t.cim.toLowerCase().includes("hozzáférés")
  )
  if (activationTask && activationTask.statusz !== "done") {
    await adminClient
      .from("hr_onboarding_feladat")
      .update({ statusz: "done" })
      .eq("id", activationTask.id)
  }

  // Kapcsolódó eszközök és jegyzőkönyvek összekötése az új dolgozói profillal és iktatás a dossziéba
  try {
    await adminClient
      .from("hr_munkahelyi_eszkoz")
      .update({ dolgozo_id: finalUserId })
      .eq("onboarding_id", onboardingId)

    const { data: assetRecords } = await adminClient
      .from("hr_munkahelyi_eszkoz")
      .select("dokumentum_id")
      .eq("onboarding_id", onboardingId)
      .not("dokumentum_id", "is", null)

    const docIds = Array.from(new Set((assetRecords || []).map((r: any) => r.dokumentum_id).filter(Boolean)))
    for (const docId of docIds) {
      await adminClient
        .from("hr_dokumentum")
        .update({ dolgozo_id: finalUserId })
        .eq("id", docId)

      const { data: docData } = await adminClient
        .from("hr_dokumentum")
        .select("iktatoszam, nev")
        .eq("id", docId)
        .single()

      if (docData && !docData.iktatoszam) {
        const { executeHrDocumentFiling } = await import("@/utils/hr-filing-bridge")
        await executeHrDocumentFiling(adminClient, {
          documentId: docId as string,
          employeeId: finalUserId,
          customTargy: docData.nev,
          currentUserId: user.id
        })
      }
    }

    // Kapcsolódó munkavédelmi oktatások összekötése és iktatása
    await adminClient
      .from("hr_munkavedelmi_oktatas")
      .update({ dolgozo_id: finalUserId })
      .eq("onboarding_id", onboardingId)

    const { data: safetyRecords } = await adminClient
      .from("hr_munkavedelmi_oktatas")
      .select("dokumentum_id")
      .eq("onboarding_id", onboardingId)
      .not("dokumentum_id", "is", null)

    const safetyDocIds = Array.from(new Set((safetyRecords || []).map((r: any) => r.dokumentum_id).filter(Boolean)))
    for (const docId of safetyDocIds) {
      await adminClient
        .from("hr_dokumentum")
        .update({ dolgozo_id: finalUserId })
        .eq("id", docId)

      const { data: docData } = await adminClient
        .from("hr_dokumentum")
        .select("iktatoszam, nev")
        .eq("id", docId)
        .single()

      if (docData && !docData.iktatoszam) {
        const { executeHrDocumentFiling } = await import("@/utils/hr-filing-bridge")
        await executeHrDocumentFiling(adminClient, {
          documentId: docId as string,
          employeeId: finalUserId,
          customTargy: docData.nev,
          currentUserId: user.id
        })
      }
    }
  } catch (err) {
    console.error("Hiba az eszközök, munkavédelem és dokumentumok összekötésekor:", err)
  }

  // Audit napló
  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel",
    entitas_tipus: "hr_onboarding",
    entitas_id: onboardingId,
    megjegyzes: `Munkavállalói eaisyHR fiók sikeresen aktiválva és belépési adatok kiküldve: ${onboarding.nev}`
  })

  revalidatePath("/hr/onboarding")
  revalidatePath(`/hr/employee/${finalUserId}`)
  return { success: true, userId: finalUserId }
}

/**
 * Onboarding folyamat sikeres lezárása (Archiválás)
 * A folyamat átkerül a "Lezárt beléptetések" fülre
 */
export async function closeOnboarding(onboardingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin", "hr_vezeto", "hr_munkatars"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod a beléptetés lezárásához." }
  }

  const adminClient = getAdminClient()
  const nowIso = new Date().toISOString()

  const { error } = await adminClient
    .from("hr_onboarding")
    .update({
      statusz: "lezart",
      lezarva_ekor: nowIso,
      lezarta_id: user.id
    })
    .eq("id", onboardingId)

  if (error) {
    return { error: error.message }
  }

  // Audit log
  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_modositas",
    entitas_tipus: "hr_onboarding",
    entitas_id: onboardingId,
    megjegyzes: `Beléptetési (Onboarding) folyamat sikeresen lezárva és archiválva.`
  })

  revalidatePath("/hr/onboarding")
  return { success: true }
}

/**
 * Lezárt onboarding újranyitása szükség esetén
 */
export async function reopenOnboarding(onboardingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()

  const { error } = await adminClient
    .from("hr_onboarding")
    .update({
      statusz: "folyamatban",
      lezarva_ekor: null,
      lezarta_id: null
    })
    .eq("id", onboardingId)

  if (error) {
    return { error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_modositas",
    entitas_tipus: "hr_onboarding",
    entitas_id: onboardingId,
    megjegyzes: `Beléptetési folyamat újranyitva.`
  })

  revalidatePath("/hr/onboarding")
  return { success: true }
}

/**
 * Onboarding folyamat törlése
 */
export async function deleteOnboarding(onboardingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()

  const { error } = await adminClient
    .from("hr_onboarding")
    .delete()
    .eq("id", onboardingId)

  if (error) {
    return { error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_torles",
    entitas_tipus: "hr_onboarding",
    entitas_id: onboardingId,
    megjegyzes: `Onboarding folyamat törölve.`
  })

  revalidatePath("/hr/onboarding")
  return { success: true }
}

/**
 * Manuális onboarding folyamat indítása (nem toborzásból érkező munkatársakhoz)
 */
export async function createManualOnboarding(formData: {
  nev: string
  email: string
  munkakor: string
  belepes_datuma?: string
  sablon?: string
  reszleg?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin", "hr_vezeto", "hr_munkatars"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod új beléptetési folyamat indításához." }
  }

  const adminClient = getAdminClient()
  const sablonType = formData.sablon || "altalanos"

  // 1. Beszúrjuk az Onboarding rekordot
  const { data: newOnboarding, error: onbError } = await adminClient
    .from("hr_onboarding")
    .insert({
      nev: formData.nev.trim(),
      munkakor: formData.munkakor.trim(),
      belepes_datuma: formData.belepes_datuma || "Hamarosan",
      statusz: "folyamatban",
      fiok_allapot: "varakozik",
      reszleg: formData.reszleg || null
    })
    .select()
    .single()

  if (onbError || !newOnboarding) {
    return { error: onbError?.message || "Nem sikerült létrehozni az onboarding folyamatot." }
  }

  // 2. Feladatok generálása a sablon alapján
  let templateTasks = [
    { cim: "Munkaszerződés előkészítése & aláírása", felelos_reszleg: "HR" },
    { cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés" },
    { cim: "Munkahelyi eszközök átadása & jegyzőkönyv", felelos_reszleg: "IT" },
    { cim: "Munkavédelmi és tűzvédelmi oktatás", felelos_reszleg: "EHS" },
    { cim: "Munkavállalói fiók aktiválása & e-mail", felelos_reszleg: "HR" }
  ]

  if (sablonType === "it_fejleszto") {
    templateTasks = [
      { cim: "Munkaszerződés előkészítése & aláírása", felelos_reszleg: "HR" },
      { cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés" },
      { cim: "Laptop & perifériák átadása (Jegyzőkönyvvel)", felelos_reszleg: "IT" },
      { cim: "VPN, GitHub és Fejlesztői jogosultságok", felelos_reszleg: "IT" },
      { cim: "Munkavédelmi és ergonómiai oktatás", felelos_reszleg: "EHS" },
      { cim: "Munkavállalói fiók aktiválása & e-mail", felelos_reszleg: "HR" }
    ]
  } else if (sablonType === "vezeto") {
    templateTasks = [
      { cim: "Vezetői munkaszerződés & titoktartási (NDA)", felelos_reszleg: "HR" },
      { cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés" },
      { cim: "Céges laptop és okostelefon átadása (Jegyzőkönyvvel)", felelos_reszleg: "IT" },
      { cim: "Aláírási címpéldány és banki meghatalmazások", felelos_reszleg: "Pénzügy" },
      { cim: "Munkavédelmi oktatás", felelos_reszleg: "EHS" },
      { cim: "Munkavállalói fiók aktiválása & e-mail", felelos_reszleg: "HR" }
    ]
  } else if (sablonType === "fizikai") {
    templateTasks = [
      { cim: "Munkaszerződés előkészítése & aláírása", felelos_reszleg: "HR" },
      { cim: "T1041 NAV bejelentés", felelos_reszleg: "Bérszámfejtés" },
      { cim: "Munkaruha és védőeszközök kiosztása", felelos_reszleg: "EHS" },
      { cim: "Foglalkozás-egészségügyi orvosi alkalmasság", felelos_reszleg: "HR" },
      { cim: "Munkavédelmi és gépkezelői oktatás", felelos_reszleg: "EHS" },
      { cim: "Szekrénykulcs és belépőkártya átadása", felelos_reszleg: "Iroda" }
    ]
  }

  await adminClient.from("hr_onboarding_feladat").insert(
    templateTasks.map(t => ({
      onboarding_id: newOnboarding.id,
      cim: t.cim,
      felelos_reszleg: t.felelos_reszleg,
      statusz: "pending"
    }))
  )

  // Audit napló
  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel",
    entitas_tipus: "hr_onboarding",
    entitas_id: newOnboarding.id,
    megjegyzes: `Új Onboarding folyamat indítva manuálisan (${sablonType} sablonnal): ${formData.nev}`
  })

  revalidatePath("/hr/onboarding")
  return { success: true, onboarding: newOnboarding }
}

