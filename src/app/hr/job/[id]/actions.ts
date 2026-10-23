"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { generateJobDescriptionPdfBuffer } from "@/utils/hr/job-description-pdf-generator"
import type { JobDescriptionPdfData } from "@/utils/hr/job-description-constants"
import { getActiveCompanyServer } from "@/utils/company-server"

export async function assignEmployeeToJob(jobId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  // 1. Get active jogviszony
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select("id")
    .eq("dolgozo_id", employeeId)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!jogviszony) {
    return { error: "A dolgozónak nincs aktív jogviszonya!" }
  }

  // 2. Get active beosztas
  const { data: beosztas } = await supabase
    .from("hr_beosztas")
    .select("id")
    .eq("jogviszony_id", jogviszony.id)
    .is("ervenyes_ig", null)
    .order("ervenyes_tol", { ascending: false })
    .limit(1)
    .maybeSingle()

  let error;
  if (beosztas) {
    // Update existing
    const res = await supabase.from("hr_beosztas").update({ munkakor_id: jobId }).eq("id", beosztas.id)
    error = res.error
  } else {
    // Insert new
    const res = await supabase.from("hr_beosztas").insert({ 
      jogviszony_id: jogviszony.id, 
      munkakor_id: jobId, 
      ervenyes_tol: new Date().toISOString().split('T')[0] 
    })
    error = res.error
  }

  if (error) {
    return { error: "Hiba a dolgozó hozzárendelésekor: " + error.message }
  }

  revalidatePath(`/hr/job/${jobId}`)
  revalidatePath("/hr/organization")
  revalidatePath("/hr/admin")
  return { success: true }
}

export async function removeEmployeeFromJob(jobId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  // 1. Get active jogviszony
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select("id")
    .eq("dolgozo_id", employeeId)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!jogviszony) return { success: true }

  // Close the active beosztas for this job
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from("hr_beosztas")
    .update({ ervenyes_ig: today })
    .eq("jogviszony_id", jogviszony.id)
    .eq("munkakor_id", jobId)
    .is("ervenyes_ig", null)

  if (error) {
    return { error: "Hiba a dolgozó eltávolításakor: " + error.message }
  }

  revalidatePath(`/hr/job/${jobId}`)
  revalidatePath("/hr/organization")
  revalidatePath("/hr/admin")
  return { success: true }
}

export async function addJobTaskAction(jobId: string, task: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const trimmed = task.trim()
  if (!trimmed) return { error: "A feladat nem lehet üres!" }

  const { data: job, error: fetchErr } = await supabase
    .from("hr_munkakor")
    .select("feladatok_es_hataskorok")
    .eq("id", jobId)
    .single()

  if (fetchErr || !job) return { error: "Munkakör nem található" }

  let currentTasks: string[] = []
  if (Array.isArray(job.feladatok_es_hataskorok)) {
    currentTasks = [...job.feladatok_es_hataskorok]
  } else if (typeof job.feladatok_es_hataskorok === "string") {
    try {
      const parsed = JSON.parse(job.feladatok_es_hataskorok)
      if (Array.isArray(parsed)) currentTasks = parsed
    } catch {
      currentTasks = job.feladatok_es_hataskorok.split("\n").map((s: string) => s.trim()).filter(Boolean)
    }
  }

  currentTasks.push(trimmed)

  const { error: updateErr } = await supabase
    .from("hr_munkakor")
    .update({ feladatok_es_hataskorok: currentTasks })
    .eq("id", jobId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/hr/job/${jobId}`)
  return { success: true }
}

export async function removeJobTaskAction(jobId: string, taskIndex: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: job, error: fetchErr } = await supabase
    .from("hr_munkakor")
    .select("feladatok_es_hataskorok")
    .eq("id", jobId)
    .single()

  if (fetchErr || !job) return { error: "Munkakör nem található" }

  let currentTasks: string[] = []
  if (Array.isArray(job.feladatok_es_hataskorok)) {
    currentTasks = [...job.feladatok_es_hataskorok]
  }

  const updatedTasks = currentTasks.filter((_, idx) => idx !== taskIndex)

  const { error: updateErr } = await supabase
    .from("hr_munkakor")
    .update({ feladatok_es_hataskorok: updatedTasks })
    .eq("id", jobId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/hr/job/${jobId}`)
  return { success: true }
}

export async function addJobCompetencyAction(jobId: string, competency: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const trimmed = competency.trim()
  if (!trimmed) return { error: "A kompetencia nem lehet üres!" }

  const { data: job, error: fetchErr } = await supabase
    .from("hr_munkakor")
    .select("elvart_kompetenciak")
    .eq("id", jobId)
    .single()

  if (fetchErr || !job) return { error: "Munkakör nem található" }

  let currentComp: string[] = []
  if (Array.isArray(job.elvart_kompetenciak)) {
    currentComp = [...job.elvart_kompetenciak]
  } else if (typeof job.elvart_kompetenciak === "string") {
    try {
      const parsed = JSON.parse(job.elvart_kompetenciak)
      if (Array.isArray(parsed)) currentComp = parsed
    } catch {
      currentComp = job.elvart_kompetenciak.split("\n").map((s: string) => s.trim()).filter(Boolean)
    }
  }

  if (!currentComp.includes(trimmed)) {
    currentComp.push(trimmed)
  }

  const { error: updateErr } = await supabase
    .from("hr_munkakor")
    .update({ elvart_kompetenciak: currentComp })
    .eq("id", jobId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/hr/job/${jobId}`)
  return { success: true }
}

export async function removeJobCompetencyAction(jobId: string, compIndex: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: job, error: fetchErr } = await supabase
    .from("hr_munkakor")
    .select("elvart_kompetenciak")
    .eq("id", jobId)
    .single()

  if (fetchErr || !job) return { error: "Munkakör nem található" }

  let currentComp: string[] = []
  if (Array.isArray(job.elvart_kompetenciak)) {
    currentComp = [...job.elvart_kompetenciak]
  }

  const updatedComp = currentComp.filter((_, idx) => idx !== compIndex)

  const { error: updateErr } = await supabase
    .from("hr_munkakor")
    .update({ elvart_kompetenciak: updatedComp })
    .eq("id", jobId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/hr/job/${jobId}`)
  return { success: true }
}

export async function generateJobDescriptionVersionAction(
  jobId: string,
  options?: { megjegyzes?: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  // 1. Munkakör adatok lekérése a legfrissebb állapotból
  const { data: job, error: jobErr } = await supabase
    .from("hr_munkakor")
    .select("*, hr_szervezeti_egyseg(id, nev)")
    .eq("id", jobId)
    .single()

  if (jobErr || !job) {
    return { error: "Munkakör nem található: " + (jobErr?.message || "") }
  }

  // 2. Aktív cég lekérése fejléc adatokhoz
  const activeCompany = await getActiveCompanyServer()

  // 3. Legutolsó verziószám lekérdezése
  const { data: existing } = await supabase
    .from("hr_munkakor_leiras_verzio")
    .select("verzio_szam")
    .eq("munkakor_id", jobId)
    .order("verzio_szam", { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? (existing[0].verzio_szam || 0) + 1 : 1

  // 4. Tisztított fájlnév generálása: Munkakori_Leiras_{megnevezes}_v{verzio}.pdf
  const cleanName = (job.megnevezes || "Munkakor")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")

  const fileName = `Munkakori_Leiras_${cleanName}_v${nextVersion}.pdf`
  const storagePath = `munkakor-leirasok/${jobId}/v${nextVersion}_${Date.now()}.pdf`

  // 5. Feladatok és kompetenciák feldolgozása
  let tasks: string[] = []
  if (Array.isArray(job.feladatok_es_hataskorok)) {
    tasks = job.feladatok_es_hataskorok
  } else if (typeof job.feladatok_es_hataskorok === "string") {
    try {
      const parsed = JSON.parse(job.feladatok_es_hataskorok)
      if (Array.isArray(parsed)) tasks = parsed
    } catch {
      tasks = job.feladatok_es_hataskorok.split("\n").map((s: string) => s.trim()).filter(Boolean)
    }
  }

  let competencies: string[] = []
  if (Array.isArray(job.elvart_kompetenciak)) {
    competencies = job.elvart_kompetenciak
  } else if (typeof job.elvart_kompetenciak === "string") {
    try {
      const parsed = JSON.parse(job.elvart_kompetenciak)
      if (Array.isArray(parsed)) competencies = parsed
    } catch {
      competencies = job.elvart_kompetenciak.split("\n").map((s: string) => s.trim()).filter(Boolean)
    }
  }

  // 6. Munkavédelem és orvosi vizsgálat szövegezés
  const orvosiVizsgalat = job.orvosi_vizsgalat_tipus
    ? `${job.orvosi_vizsgalat_tipus}${job.orvosi_vizsgalat_gyakorisag_ho ? ` (Időszakos felülvizsgálat: minden ${job.orvosi_vizsgalat_gyakorisag_ho} hónapban)` : ""}`
    : null

  let vedoeszkoz = job.vedoeszkoz_igeny || null
  if (job.kockazat_tipusa) {
    vedoeszkoz = vedoeszkoz 
      ? `${vedoeszkoz} • Munkaköri kockázati besorolás: ${job.kockazat_tipusa}`
      : `Munkaköri kockázati besorolás: ${job.kockazat_tipusa}`
  }

  const orgUnitNev = job.hr_szervezeti_egyseg?.nev || "Központi állomány"

  // 7. PDF adatstruktúra összeállítása
  const pdfData: JobDescriptionPdfData = {
    employeeName: "Munkakörben foglalkoztatott munkavállaló",
    munkakor: job.megnevezes,
    feorKod: job.feor_kod || null,
    reszleg: orgUnitNev,
    vezetoNev: "Közvetlen szakmai vezető",
    leiras: job.leiras || null,
    feladatok: tasks.length > 0 ? tasks : undefined,
    kompetenciak: competencies.length > 0 ? competencies : undefined,
    orvosiVizsgalat: orvosiVizsgalat,
    vedoeszkoz: vedoeszkoz,
    cegNev: activeCompany?.name || "eaisyDocs Zrt.",
    cegCim: activeCompany?.address || "1111 Budapest, Példa utca 1.",
    cegAdoszam: activeCompany?.tax_number || "12345678-2-41",
    kelt: new Date().toISOString().split("T")[0]
  }

  // 8. PDF Buffer generálása Puppeteerrel
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateJobDescriptionPdfBuffer(pdfData)
  } catch (pdfErr: any) {
    console.error("Hiba a PDF generálásakor:", pdfErr)
    return { error: "Nem sikerült legenerálni a PDF dokumentumot: " + (pdfErr.message || "") }
  }

  // 9. Feltöltés a Supabase Storage irat_files vödörbe
  const { error: uploadErr } = await supabase.storage
    .from("irat_files")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false
    })

  if (uploadErr) {
    console.error("Storage upload hiba:", uploadErr)
    return { error: "Fájl feltöltése sikertelen: " + uploadErr.message }
  }

  // 10. Új verzió rekord beszúrása a hr_munkakor_leiras_verzio táblába
  const megjegyzes = options?.megjegyzes?.trim() || `Automatikusan generált v${nextVersion} (Rendszeradatokból)`

  const { error: dbError } = await supabase
    .from("hr_munkakor_leiras_verzio")
    .insert({
      munkakor_id: jobId,
      verzio_szam: nextVersion,
      fajl_path: storagePath,
      fajl_nev: fileName,
      feltolto_id: user.id,
      megjegyzes: megjegyzes
    })

  if (dbError) {
    console.error("Adatbázis hiba:", dbError)
    return { error: "Hiba a verzió rögzítésekor: " + dbError.message }
  }

  revalidatePath(`/hr/job/${jobId}`)
  revalidatePath("/hr/organization")
  return { success: true, verzio: nextVersion, fileName }
}

