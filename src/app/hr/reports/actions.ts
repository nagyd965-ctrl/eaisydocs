"use server"

import { createClient as createAdminClient } from "@supabase/supabase-js"

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getT1041Data(yearMonth: string) {
  // yearMonth format: YYYY-MM
  const { data, error } = await supabaseAdmin
    .from("hr_jogviszony")
    .select(`
      id,
      belepes_datuma,
      kilepes_datuma,
      hr_dolgozo_adatlap (
        felhasznalo_profil (
          nev
        )
      )
    `)
    .order("belepes_datuma", { ascending: false })

  if (error) {
    console.error("T1041 hiba:", error)
    return []
  }

  // Format data for CSV
  return data.map((d: any) => ({
    Nev: d.hr_dolgozo_adatlap?.felhasznalo_profil?.nev || 'Ismeretlen',
    Tipus: (d.belepes_datuma && (!d.kilepes_datuma || d.kilepes_datuma > new Date().toISOString())) ? 'Belépés' : 'Kilépés',
    Datum: (d.belepes_datuma && (!d.kilepes_datuma || d.kilepes_datuma > new Date().toISOString())) ? d.belepes_datuma : d.kilepes_datuma,
  }))
}

export async function getKSHData(yearMonth: string) {
  const { data: leaves, error: leavesError } = await supabaseAdmin
    .from("hr_tavollet")
    .select(`
      kezdet_datuma,
      veg_datuma,
      tipus,
      statusz,
      hr_dolgozo_adatlap (
        felhasznalo_profil (
          nev
        )
      )
    `)
    .eq("statusz", "jovahagyva")

  if (leavesError) {
    console.error("KSH hiba:", leavesError)
    return []
  }

  return leaves.map((l: any) => ({
    Nev: l.hr_dolgozo_adatlap?.felhasznalo_profil?.nev || 'Ismeretlen',
    Tavollet_Tipus: l.tipus,
    Kezdet: l.kezdet_datuma,
    Vege: l.veg_datuma
  }))
}

export async function getPayrollData(yearMonth: string) {
  // In a real app we would join attendance, cafeteria, and leaves.
  // We'll reuse the leaves query and add cafeteria if present.
  
  const leaves = await getKSHData(yearMonth);
  
  return leaves.map((l: any) => ({
    Nev: l.Nev,
    Adat_Tipus: 'Távollét - ' + l.Tavollet_Tipus,
    Ertek: `${l.Kezdet} - ${l.Vege}`
  }))
}

export async function saveArchiveRecord(tipus: string, idoszak: string, fajl_nev: string, fajl_utvonal: string, feltolto_id: string) {
  const { data, error } = await supabaseAdmin
    .from("hr_bevallas_archivum")
    .insert([
      { tipus, idoszak, fajl_nev, fajl_utvonal, feltolto_id }
    ])
    .select()

  if (error) {
    console.error("Archive hiba:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function uploadArchiveFileAdmin(formData: FormData) {
  const file = formData.get("file") as File
  const type = formData.get("type") as string
  const month = formData.get("month") as string
  const userId = formData.get("userId") as string
  const ugyszam = formData.get("ugyszam") as string

  if (!file) return { success: false, error: "Nincs fájl" }

  const fileExt = file.name.split('.').pop()
  const fileName = `${type}_${month}_${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  // Ensure file is converted to ArrayBuffer for server side upload
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('hr_reports')
    .upload(filePath, buffer, {
      contentType: file.type
    })

  if (uploadError) {
    console.error("Storage hiba:", uploadError)
    return { success: false, error: uploadError.message }
  }

  // Save to db
  const { error: dbError } = await supabaseAdmin
    .from("hr_bevallas_archivum")
    .insert([
      { tipus: type, idoszak: month, fajl_nev: file.name, fajl_utvonal: filePath, feltolto_id: userId, ugyszam }
    ])

  if (dbError) {
    console.error("Archive DB hiba:", dbError)
    return { success: false, error: dbError.message }
  }

  return { success: true }
}

export async function getArchiveRecords() {
  const { data, error } = await supabaseAdmin
    .from("hr_bevallas_archivum")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Archive fetch hiba:", error)
    return []
  }

  return data
}

export async function deleteArchiveRecordAdmin(id: string, filePath: string) {
  // First delete from storage
  const { error: storageError } = await supabaseAdmin.storage
    .from('hr_reports')
    .remove([filePath])

  if (storageError) {
    console.error("Storage delete hiba:", storageError)
    // We might still want to delete the DB record even if storage fails, 
    // but let's try to keep them in sync.
  }

  // Delete from DB
  const { error: dbError } = await supabaseAdmin
    .from("hr_bevallas_archivum")
    .delete()
    .eq("id", id)

  if (dbError) {
    console.error("Archive delete hiba:", dbError)
    return { success: false, error: dbError.message }
  }

  return { success: true }
}
