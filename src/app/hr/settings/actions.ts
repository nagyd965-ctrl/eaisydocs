"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

/**
 * HR deep-analysis 20261029 (2.3) P0-javítás (2026-11-01):
 * a settings-műveletek közös őrblokkja — bejelentkezés + HR-szerepkör/modul.
 * (Korábban az updateEmployeeInfo / removeEmployeeFromHR / szervezeti CRUD
 * EGYETLEN ellenőrzés nélkül futott — öneszkaláció és CASCADE-törlés volt lehetséges.)
 */
async function requireHrSettingsAccess(): Promise<{
  error?: string
  auth?: Awaited<ReturnType<typeof requireHrAuthServer>>
  activeCompanyId?: string | null
}> {
  const auth = await requireHrAuthServer(["admin", "organization"], null)
  if (!auth.authorized) {
    return { error: "Nincs jogosultságod ehhez a művelethez (HR admin vagy Szervezet/Állomány modul szükséges)." }
  }
  const activeCompanyId = await getActiveCompanyIdServer()
  return { auth, activeCompanyId }
}

export async function createMunkakor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }

  const activeCompanyId = guard.activeCompanyId || (await getActiveCompanyIdServer())

  const megnevezes = formData.get("megnevezes") as string
  const feor_kod = formData.get("feor_kod") as string
  const besorolasi_szint = formData.get("besorolasi_szint") as string
  const kockazat_tipusa = formData.get("kockazat_tipusa") as string
  const vedoeszkoz_igeny = formData.get("vedoeszkoz_igeny") as string
  
  const feladatok = formData.get("feladatok_es_hataskorok") as string
  const kompetenciak = formData.get("elvart_kompetenciak") as string
  const orvosi_tipus = formData.get("orvosi_vizsgalat_tipus") as string
  const orvosi_ho = formData.get("orvosi_vizsgalat_gyakorisag_ho") as string
  const szervezeti_egyseg_raw = formData.get("szervezeti_egyseg_id") as string
  const szervezeti_egyseg_id = szervezeti_egyseg_raw && szervezeti_egyseg_raw !== "none" ? szervezeti_egyseg_raw : null

  if (!megnevezes) {
    return { error: "A megnevezés megadása kötelező" }
  }

  // Parse textareas into JSON arrays by splitting newlines
  const feladatokArray = feladatok ? feladatok.split('\n').map(s => s.trim()).filter(s => s) : []
  const kompetenciakArray = kompetenciak ? kompetenciak.split('\n').map(s => s.trim()).filter(s => s) : []

  const { data, error } = await supabase
    .from("hr_munkakor")
    .insert([
      {
        megnevezes,
        feor_kod: feor_kod || null,
        besorolasi_szint: besorolasi_szint || null,
        szervezeti_egyseg_id,
        kockazat_tipusa: kockazat_tipusa || null,
        vedoeszkoz_igeny: vedoeszkoz_igeny || null,
        feladatok_es_hataskorok: feladatokArray,
        elvart_kompetenciak: kompetenciakArray,
        orvosi_vizsgalat_tipus: orvosi_tipus || null,
        orvosi_vizsgalat_gyakorisag_ho: orvosi_ho ? parseInt(orvosi_ho, 10) : null,
        company_id: activeCompanyId || null
      }
    ])
    .select()

  if (error) {
    console.error("Hiba a munkakör létrehozásánál:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  revalidatePath("/hr/organization")
  return { success: true }
}

export async function updateEmployeeInfo(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  // ── P0-javítás (2026-11-01): őrblokk — csak HR admin vagy Szervezet/Állomány modullal rendelkezők szerkeszthetnek ──
  const guard = await requireHrSettingsAccess()
  if (guard.error || !guard.auth) return { error: guard.error }

  const employeeId = formData.get("employeeId") as string
  const role = formData.get("role") as string
  const munkakorId = formData.get("munkakorId") as string
  const entryDate = formData.get("entryDate") as string
  const jogviszonyId = formData.get("jogviszonyId") as string
  const formDataOrgUnitId = formData.get("orgUnitId") as string
  const managerId = formData.get("managerId") as string

  // ── P0-javítás: SZEREPKÖR-VÁLTOZTATÁS kizárólag valódi HR admin szerepkörrel ──
  // (nem elég az Állomány modul — a szerepkörök egyetlen forrása a Jogosultsági Mátrix;
  //  ezen a dialogon keresztül sima dolgozó ne írhasson admin szerepkört senkinek)
  const canChangeRole = guard.auth.hrRole === "admin"

  // 0. Szerviz kliens inicializálása (mivel RLS miatt a profilt csak admin joggal tudjuk módosítani)
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (!employeeId) return { error: "Hiányzó dolgozó azonosító" }

  const activeCompanyId = guard.activeCompanyId || (await getActiveCompanyIdServer())
  if (activeCompanyId) {
    const [{ data: memberRow }, { data: adatlapRow }] = await Promise.all([
      supabaseAdmin
        .from("company_members")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("user_id", employeeId)
        .maybeSingle(),
      supabaseAdmin
        .from("hr_dolgozo_adatlap")
        .select("company_id")
        .eq("id", employeeId)
        .maybeSingle(),
    ])
    const belongsToActiveCompany =
      Boolean(memberRow) || (adatlapRow?.company_id === activeCompanyId)
    if (!belongsToActiveCompany) {
      return { error: "A kiválasztott dolgozó nem tartozik az aktív céghez." }
    }
  }

  // 1. Megnézzük, hogy változott-e a munkakör, és ha igen, lekérjük a hozzá tartozó szervezeti egységet
  const targetMunkakor = munkakorId === "none" ? null : munkakorId
  let defaultOrgUnitId = null;
  if (targetMunkakor) {
    const { data: jobData } = await supabaseAdmin
      .from("hr_munkakor")
      .select("szervezeti_egyseg_id")
      .eq("id", targetMunkakor)
      .single()
    if (jobData?.szervezeti_egyseg_id) {
      defaultOrgUnitId = jobData.szervezeti_egyseg_id
    }
  }

  const finalOrgUnitId = formDataOrgUnitId && formDataOrgUnitId !== "none"
    ? formDataOrgUnitId
    : (formDataOrgUnitId === "none" ? null : defaultOrgUnitId)

  // 2. Profil (Szerepkör és Szervezeti Egység) frissítése admin klienssel
  // (szerepkör csak valódi HR admintől fogadva el — l. fent canChangeRole)
  const { count: membershipCount } = await supabaseAdmin
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", employeeId)

  const profileUpdateData: any = {}
  if (role && canChangeRole && (membershipCount || 0) <= 1) {
    profileUpdateData.hr_szerepkor = role
  }
  
  if (finalOrgUnitId !== undefined) {
    profileUpdateData.hr_szervezeti_egyseg_id = finalOrgUnitId
  }

  if (managerId !== undefined) {
    profileUpdateData.kozvetlen_vezeto_id = managerId === "none" ? null : managerId
  }

  if (Object.keys(profileUpdateData).length > 0) {
    const { error: profileError } = await supabaseAdmin
      .from("felhasznalo_profil")
      .update(profileUpdateData)
      .eq("id", employeeId)

    if (profileError) return { error: "Hiba a profil frissítésekor: " + profileError.message }
  }

  // Ha szerepkört módosítottak és van aktív cég, a cégtagsági szerepkört szinkronizáljuk
  if (activeCompanyId && role && canChangeRole) {
    await supabaseAdmin
      .from("company_members")
      .update({ hr_szerepkor: role })
      .eq("company_id", activeCompanyId)
      .eq("user_id", employeeId)
  }

  if (jogviszonyId) {
    // 3. Jogviszony frissítése (Belépés dátuma)
    if (entryDate) {
      const { error: hrError } = await supabaseAdmin
        .from("hr_jogviszony")
        .update({ belepes_datuma: entryDate })
        .eq("id", jogviszonyId)

      if (hrError) return { error: "Hiba a jogviszony frissítésekor: " + hrError.message }
    }

    // 4. Munkakör (Beosztás) frissítése
    // Megnézzük mi az aktív beosztás
    const { data: beosztasok } = await supabaseAdmin
      .from("hr_beosztas")
      .select("id, munkakor_id")
      .eq("jogviszony_id", jogviszonyId)
      .is("ervenyes_ig", null)
      .order("ervenyes_tol", { ascending: false })
      .limit(1)

    const activeBeosztas = beosztasok?.[0]

    // Csak akkor változtatunk beosztást, ha tényleg módosult a munkakör
    if (targetMunkakor !== (activeBeosztas?.munkakor_id || null)) {
      // 1. Lezárjuk a régit a mai nappal
      if (activeBeosztas) {
        await supabaseAdmin
          .from("hr_beosztas")
          .update({ ervenyes_ig: new Date().toISOString().split("T")[0] })
          .eq("id", activeBeosztas.id)
      }

      // 2. Nyitunk egy újat, ha van megadva új
      if (targetMunkakor) {
        await supabaseAdmin
          .from("hr_beosztas")
          .insert([{
            jogviszony_id: jogviszonyId,
            munkakor_id: targetMunkakor,
            ervenyes_tol: new Date().toISOString().split("T")[0]
          }])
      }
    }
  }

  revalidatePath("/hr/settings")
  revalidatePath("/hr/admin")
  revalidatePath("/hr/organization")
  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr/self-service/profile")
  revalidatePath("/hr")
  return { success: true }
}

export async function updateMunkakor(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }
  if (guard.activeCompanyId) {
    const { data: existingJob } = await supabase
      .from("hr_munkakor")
      .select("company_id")
      .eq("id", id)
      .maybeSingle()
    if (existingJob?.company_id && existingJob.company_id !== guard.activeCompanyId) {
      return { error: "A munkakör másik céghez tartozik." }
    }
  }

  const megnevezes = formData.get("megnevezes") as string
  const feor_kod = formData.get("feor_kod") as string
  const besorolasi_szint = formData.get("besorolasi_szint") as string
  const kockazat_tipusa = formData.get("kockazat_tipusa") as string
  const vedoeszkoz_igeny = formData.get("vedoeszkoz_igeny") as string
  
  const feladatok = formData.get("feladatok_es_hataskorok") as string
  const kompetenciak = formData.get("elvart_kompetenciak") as string
  const orvosi_tipus = formData.get("orvosi_vizsgalat_tipus") as string
  const orvosi_ho = formData.get("orvosi_vizsgalat_gyakorisag_ho") as string
  const szervezeti_egyseg_raw = formData.get("szervezeti_egyseg_id") as string
  const szervezeti_egyseg_id = szervezeti_egyseg_raw && szervezeti_egyseg_raw !== "none" ? szervezeti_egyseg_raw : null

  if (!megnevezes) return { error: "A megnevezés megadása kötelező" }

  let feladatokArray: string[] = []
  if (feladatok) {
    try {
      const parsed = JSON.parse(feladatok)
      if (Array.isArray(parsed)) {
        feladatokArray = parsed.map((s: any) => String(s).trim()).filter(Boolean)
      } else {
        feladatokArray = feladatok.split('\n').map(s => s.trim()).filter(Boolean)
      }
    } catch {
      feladatokArray = feladatok.split('\n').map(s => s.trim()).filter(Boolean)
    }
  }

  let kompetenciakArray: string[] = []
  if (kompetenciak) {
    try {
      const parsed = JSON.parse(kompetenciak)
      if (Array.isArray(parsed)) {
        kompetenciakArray = parsed.map((s: any) => String(s).trim()).filter(Boolean)
      } else {
        kompetenciakArray = kompetenciak.split('\n').map(s => s.trim()).filter(Boolean)
      }
    } catch {
      kompetenciakArray = kompetenciak.split('\n').map(s => s.trim()).filter(Boolean)
    }
  }

  const { error } = await supabase
    .from("hr_munkakor")
    .update({
      megnevezes,
      feor_kod: feor_kod || null,
      besorolasi_szint: besorolasi_szint || null,
      szervezeti_egyseg_id,
      kockazat_tipusa: kockazat_tipusa || null,
      vedoeszkoz_igeny: vedoeszkoz_igeny || null,
      feladatok_es_hataskorok: feladatokArray,
      elvart_kompetenciak: kompetenciakArray,
      orvosi_vizsgalat_tipus: orvosi_tipus || null,
      orvosi_vizsgalat_gyakorisag_ho: orvosi_ho ? parseInt(orvosi_ho, 10) : null
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/hr/settings")
  revalidatePath("/hr/organization")
  revalidatePath(`/hr/job/${id}`)
  return { success: true }
}

export async function deleteMunkakor(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }
  if (guard.activeCompanyId) {
    const { data: existingJob } = await supabase
      .from("hr_munkakor")
      .select("company_id")
      .eq("id", id)
      .maybeSingle()
    if (existingJob?.company_id && existingJob.company_id !== guard.activeCompanyId) {
      return { error: "A munkakör másik céghez tartozik." }
    }
  }

  // ── HR deep-analysis 20261029 (2.3) P1-javítás (2026-11-01): ──
  // Korábban a törlés ELŐRE törölte az összes hr_beosztas sort (a dolgozók
  // munkakör-előzményeit!), hogy a ForeignKey ne akadályozza. Mostantól:
  // ha bármilyen beosztás (folyamatban lévő vagy történelmi) hivatkozik a
  // munkakörre, a törlés TILTVA — a beosztás-történet megőrzése érdekében.
  const { count: beosztasCount } = await supabase
    .from("hr_beosztas")
    .select("id", { count: "exact", head: true })
    .eq("munkakor_id", id)

  if ((beosztasCount ?? 0) > 0) {
    return {
      error: "A munkakör nem törölhető, mert dolgozók beosztás-előzményei hivatkoznak rá. A munkakör-előzmények megőrzése érdekében csak olyan munkakör törölhető, amelyre nincs egyetlen beosztás sem.",
    }
  }

  // 2. Töröljük a munkakört (a beosztásokra már nem kell előre-törölni — fent tiltva)
  const { error } = await supabase
    .from("hr_munkakor")
    .delete()
    .eq("id", id)

  if (error) {
    if (error.code === '23503') {
      return { error: "Nem törölhető, mert vannak hozzárendelt dolgozók vagy jelentkezők." }
    }
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  revalidatePath("/hr/organization")
  return { success: true }
}

export async function removeEmployeeFromHR(employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  // ── P0-javítás (2026-11-01): őrblokk — destruktív művelet, kizárólag VALÓDI HR admin szerepkörrel
  // (az Állomány modul nem elég — a teljes karton CASCADE-törlése nem lehet modul-jogosultságon)
  const guard = await requireHrSettingsAccess()
  if (guard.error || !guard.auth) return { error: guard.error }
  if (guard.auth.hrRole !== "admin") {
    return { error: "Dolgozó törlése kizárólag HR adminisztrátori szerepkörrel lehetséges." }
  }

  // Cég-ellenőrzés: a dolgozó az aktív céghez tartozzon
  if (guard.activeCompanyId) {
    const { data: adatlap } = await supabase
      .from("hr_dolgozo_adatlap")
      .select("company_id")
      .eq("id", employeeId)
      .maybeSingle()
    if (adatlap?.company_id && adatlap.company_id !== guard.activeCompanyId) {
      return { error: "A dolgozó másik céghez tartozik — nincs jogosultságod a törléséhez." }
    }
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Töröljük a hr_dolgozo_adatlapot
  // (A DB szinten a CASCADE miatt elvileg a hr_jogviszony és hr_beosztas is törlődik)
  const { error } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .delete()
    .eq("id", employeeId)

  if (error) {
    return { error: "Hiba a HR profil törlésekor: " + error.message }
  }

  // 2. Visszaállítjuk a hr_szerepkort az alapértelmezett "ugyintezo"-re kizárólag akkor,
  // ha nem tagja másik cégnek (egyébként csak az aktív cégben veszíti el a HR jogosultságát).
  const { count: remainingMemberships } = await supabaseAdmin
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", employeeId)

  if ((remainingMemberships || 0) <= 1) {
    await supabaseAdmin
      .from("felhasznalo_profil")
      .update({ hr_szerepkor: "ugyintezo" })
      .eq("id", employeeId)
  }

  revalidatePath("/hr/settings")
  revalidatePath("/hr/admin")
  revalidatePath("/hr/organization")
  return { success: true }
}

export async function createHrDepartment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  // ── P0-javítás (2026-11-01): őrblokk
  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }

  const nev = formData.get("nev") as string
  if (!nev) return { error: "Név megadása kötelező!" }

  const activeCompanyId = await getActiveCompanyIdServer()

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const insertData: any = { nev }
  if (activeCompanyId) {
    insertData.company_id = activeCompanyId
  }

  const { error } = await supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .insert(insertData)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  revalidatePath("/hr/organization")
  return { success: true }
}

export async function updateHrDepartment(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  // ── P0-javítás (2026-11-01): őrblokk + cég-ellenőrzés (más cég egysége nem módosítható)
  const guard = await requireHrSettingsAccess()
  if (guard.error || !guard.auth) return { error: guard.error }
  if (guard.activeCompanyId) {
    const { data: unit } = await supabase
      .from("hr_szervezeti_egyseg")
      .select("company_id")
      .eq("id", id)
      .maybeSingle()
    if (unit?.company_id && unit.company_id !== guard.activeCompanyId) {
      return { error: "A szervezeti egység másik céghez tartozik." }
    }
  }

  const nev = formData.get("nev") as string
  if (!nev) return { error: "Név megadása kötelező!" }

  // szulo_id: üres string → null (főszint), egyébként UUID
  const szuloIdRaw = formData.get("szulo_id") as string | null
  const szulo_id = szuloIdRaw && szuloIdRaw.trim() !== "" ? szuloIdRaw.trim() : null

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .update({ nev, szulo_id })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  revalidatePath("/hr/organization")
  revalidatePath(`/hr/orgunit/${id}`)
  return { success: true }
}


export async function deleteHrDepartment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  // ── P0-javítás (2026-11-01): őrblokk + cég-ellenőrzés (más cég egysége nem törölhető)
  const guard = await requireHrSettingsAccess()
  if (guard.error || !guard.auth) return { error: guard.error }
  if (guard.activeCompanyId) {
    const { data: unit } = await supabase
      .from("hr_szervezeti_egyseg")
      .select("company_id")
      .eq("id", id)
      .maybeSingle()
    if (unit?.company_id && unit.company_id !== guard.activeCompanyId) {
      return { error: "A szervezeti egység másik céghez tartozik." }
    }
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: employees } = await supabaseAdmin
    .from("felhasznalo_profil")
    .select("id")
    .eq("hr_szervezeti_egyseg_id", id)
    .limit(1)

  if (employees && employees.length > 0) {
    return { error: "A szervezeti egység nem törölhető, mert vannak hozzárendelt dolgozók!" }
  }

  const { data: subUnits } = await supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .select("id")
    .eq("szulo_id", id)
    .limit(1)

  if (subUnits && subUnits.length > 0) {
    return { error: "A szervezeti egység nem törölhető, mert vannak alatta lévő egységek!" }
  }

  const { error } = await supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .delete()
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  revalidatePath("/hr/organization")
  return { success: true }
}

export async function uploadJobDescription(munkakorId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }
  if (guard.activeCompanyId) {
    const { data: existingJob } = await supabase
      .from("hr_munkakor")
      .select("company_id")
      .eq("id", munkakorId)
      .maybeSingle()
    if (existingJob?.company_id && existingJob.company_id !== guard.activeCompanyId) {
      return { error: "A munkakör másik céghez tartozik." }
    }
  }

  const file = formData.get("file") as File
  const megjegyzes = formData.get("megjegyzes") as string

  if (!file || file.size === 0) return { error: "Nincs fájl kiválasztva" }

  // Get next version number
  const { data: existing } = await supabase
    .from("hr_munkakor_leiras_verzio")
    .select("verzio_szam")
    .eq("munkakor_id", munkakorId)
    .order("verzio_szam", { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? existing[0].verzio_szam + 1 : 1

  // Upload file to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const filePath = `munkakor-leirasok/${munkakorId}/v${nextVersion}_${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from("irat_files")
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    console.error("Upload error:", uploadError)
    return { error: "Fájl feltöltés sikertelen: " + uploadError.message }
  }

  // Save version record
  const { error: dbError } = await supabase
    .from("hr_munkakor_leiras_verzio")
    .insert({
      munkakor_id: munkakorId,
      verzio_szam: nextVersion,
      fajl_path: filePath,
      fajl_nev: file.name,
      feltolto_id: user.id,
      megjegyzes: megjegyzes || null,
      ...(guard.activeCompanyId ? { company_id: guard.activeCompanyId } : {})
    })

  if (dbError) {
    console.error("DB error:", dbError)
    return { error: dbError.message }
  }

  revalidatePath(`/hr/job/${munkakorId}`)
  return { success: true, verzio: nextVersion }
}

export async function deleteJobDescriptionVersion(versionId: string, munkakorId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }
  if (guard.activeCompanyId) {
    const { data: existingJob } = await supabase
      .from("hr_munkakor")
      .select("company_id")
      .eq("id", munkakorId)
      .maybeSingle()
    if (existingJob?.company_id && existingJob.company_id !== guard.activeCompanyId) {
      return { error: "A munkakör másik céghez tartozik." }
    }
  }

  // Get file path first (ellenőrizve, hogy a verzió ehhez a munkakörhöz és céghez tartozik)
  let versionQuery = supabase
    .from("hr_munkakor_leiras_verzio")
    .select("id, fajl_path, munkakor_id, company_id")
    .eq("id", versionId)
    .eq("munkakor_id", munkakorId)

  if (guard.activeCompanyId) {
    versionQuery = versionQuery.eq("company_id", guard.activeCompanyId)
  }

  const { data: version } = await versionQuery.maybeSingle()
  if (!version) {
    return { error: "A munkaköri leírás verzió nem található az adott munkakörnél." }
  }

  if (version.fajl_path) {
    await supabase.storage.from("irat_files").remove([version.fajl_path])
  }

  let deleteQuery = supabase
    .from("hr_munkakor_leiras_verzio")
    .delete()
    .eq("id", versionId)
    .eq("munkakor_id", munkakorId)

  if (guard.activeCompanyId) {
    deleteQuery = deleteQuery.eq("company_id", guard.activeCompanyId)
  }

  const { error } = await deleteQuery

  if (error) return { error: error.message }

  revalidatePath(`/hr/job/${munkakorId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// CÉGES DOKUMENTUM NYUGTÁZÁS – Admin server actions
// ─────────────────────────────────────────────────────────────────────────────

/** Lekéri az összes céges dokumentumot a nyugtázási státusszal együtt (HR admin nézethez) */
export async function getCegesDokumentumokAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve", data: null }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error, data: null }

  // Az összes aktív céges dokumentum lekérése a nyugtázásokkal (aktív cégre szűrve)
  let docsQuery = supabase
    .from("hr_ceges_dokumentum")
    .select(`
      id,
      cim,
      leiras,
      fajl_path,
      kotelezo_mindenkinek,
      aktiv,
      created_at,
      hr_ceges_dokumentum_nyugtazas (
        id,
        dolgozo_id,
        nyugtazva_mikor,
        ip_cim,
        hr_dolgozo_adatlap (
          id,
          felhasznalo_profil ( id, nev, email )
        )
      )
    `)
    .eq("aktiv", true)
    .order("created_at", { ascending: false })
  if (guard.activeCompanyId) {
    docsQuery = docsQuery.eq("company_id", guard.activeCompanyId)
  }
  const { data: dokumentumok, error } = await docsQuery

  if (error) return { error: error.message, data: null }

  // Az összes aktív dolgozó lekérése (hogy tudjuk, ki NEM nyugtázott)
  let empQuery = supabase
    .from("hr_dolgozo_adatlap")
    .select("id, felhasznalo_profil(id, nev, email)")
  if (guard.activeCompanyId) {
    empQuery = empQuery.eq("company_id", guard.activeCompanyId)
  }
  const { data: osszesDolgozo } = await empQuery

  return { data: { dokumentumok, osszesDolgozo }, error: null }
}

/** Új céges dokumentum létrehozása */
export async function createCegesDokumentum(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }

  const cim = formData.get("cim") as string
  const leiras = formData.get("leiras") as string | null
  const fajl_path = formData.get("fajl_path") as string | null
  const kotelezo = formData.get("kotelezo_mindenkinek") === "true"

  if (!cim) return { error: "A cím megadása kötelező" }

  const { error } = await supabase
    .from("hr_ceges_dokumentum")
    .insert({
      cim,
      leiras,
      fajl_path,
      kotelezo_mindenkinek: kotelezo,
      feltolto_id: user.id,
      ...(guard.activeCompanyId ? { company_id: guard.activeCompanyId } : {})
    })

  if (error) return { error: error.message }

  revalidatePath("/hr/settings")
  return { success: true }
}

/** Céges dokumentum törlése (csak inaktívvá teszi, nem fizikailag törli) */
export async function deleteCegesDokumentum(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }

  let query = supabase
    .from("hr_ceges_dokumentum")
    .update({ aktiv: false })
    .eq("id", id)
  if (guard.activeCompanyId) {
    query = query.eq("company_id", guard.activeCompanyId)
  }
  const { error } = await query

  if (error) return { error: error.message }

  revalidatePath("/hr/settings")
  return { success: true }
}

/** Emlékeztető e-mail küldése azoknak, akik még nem nyugtázták a dokumentumot */
export async function sendAcknowledgmentReminder(dokumentumId: string, dokumentumCim: string, nemNyugtazottak: { nev: string; email: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const guard = await requireHrSettingsAccess()
  if (guard.error) return { error: guard.error }

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { error: "Hiányzó BREVO_API_KEY" }

  let sikerCount = 0
  let hibaCount = 0

  for (const dolgozo of nemNyugtazottak) {
    if (!dolgozo.email) { hibaCount++; continue }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f766e;">Dokumentum nyugtázás emlékeztető</h2>
        <p>Kedves <strong>${dolgozo.nev}</strong>!</p>
        <p>Kérjük, tekintsd meg és nyugtázd az alábbi céges dokumentumot az eaisyHR rendszerben:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <strong>${dokumentumCim}</strong>
        </div>
        <p>Bejelentkezés után a főoldalon találod a teendők között.</p>
        <p style="color: #64748b; font-size: 12px;">Ez egy automatikus értesítés az eaisyHR rendszerből.</p>
      </div>
    `

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "accept": "application/json", "api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          sender: { name: "eaisyHR Rendszer", email: "ertesites@thinkai.hu" },
          to: [{ email: dolgozo.email, name: dolgozo.nev }],
          subject: `Emlékeztető: "${dokumentumCim}" nyugtázása szükséges`,
          htmlContent: html
        })
      })
      if (res.ok) sikerCount++
      else hibaCount++
    } catch {
      hibaCount++
    }
  }

  // Naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "dokumentum_emlekezteto_kuldve",
    entitas_tipus: "hr_ceges_dokumentum",
    entitas_id: dokumentumId,
    megjegyzes: `Emlékeztető elküldve ${sikerCount} főnek (${hibaCount} hiba)`,
    ...(guard.activeCompanyId ? { company_id: guard.activeCompanyId } : {})
  })

  revalidatePath("/hr/settings")
  return { success: true, sikerCount, hibaCount }
}
