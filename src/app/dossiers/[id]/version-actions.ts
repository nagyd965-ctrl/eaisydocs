"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import crypto from "crypto"
import { getClientInfo } from "@/utils/client-info"

export async function uploadDocumentNewVersion(iratId: string, ugyiratId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  // Felhasználó jogosultság ellenőrzése
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, szervezeti_egyseg_id")
    .eq("id", user.id)
    .single()

  const userRole = profile?.docs_szerepkor || "ugyintezo"
  if (userRole === "betekinto" || userRole === "auditor") {
    return { error: "Nincs jogosultsága új verzió feltöltéséhez (csak olvasási joggal rendelkezik)." }
  }

  // Ellenőrizzük az ügyirat státuszát (lezártba ne lehessen tölteni)
  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("id, statusz, iktatoszam, szervezeti_egyseg_id, ugy:ugy_id(felelos_user_id)")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) {
    return { error: "Ügyirat nem található." }
  }

  if (["irattarban", "lezart", "selejtezheto", "selejtezett"].includes(ugyirat.statusz)) {
    return { error: `A kiválasztott ügyirat (${ugyirat.iktatoszam}) lezárt vagy irattározott állapotban van, ezért új fájlverzió már nem tölthető fel hozzá!` }
  }

  if (!["admin", "iktato"].includes(userRole)) {
    const { data: explicitAccess } = await supabase
      .from("ugyirat_hozzaferes")
      .select("id")
      .eq("ugyirat_id", ugyiratId)
      .eq("user_id", user.id)
      .maybeSingle()

    const isSameDept = ugyirat.szervezeti_egyseg_id === profile?.szervezeti_egyseg_id
    const isAssigned = (ugyirat.ugy as any)?.felelos_user_id === user.id

    if (!isSameDept && !explicitAccess && !isAssigned) {
      return { error: "Nincs szerkesztési hozzáférése ehhez az ügyirathoz!" }
    }
  }

  const file = formData.get("file") as File | null
  const indoklas = (formData.get("indoklas") as string) || ""

  if (!file || file.size === 0) {
    return { error: "Kérjük, válasszon ki egy érvényes, nem üres fájlt!" }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { validateUploadedDocument } = await import("@/utils/file-validator")
  const fileCheck = await validateUploadedDocument(file, buffer)
  if (!fileCheck.valid) {
    return { error: fileCheck.error || "A kiválasztott fájl érvénytelen vagy sérült!" }
  }

  // 1. Határozzuk meg a következő verziószámot
  const { data: existingFiles } = await supabase
    .from("irat_fajl")
    .select("verzio")
    .eq("irat_id", iratId)
    .order("verzio", { ascending: false })

  const nextVersion = existingFiles && existingFiles.length > 0 && existingFiles[0].verzio
    ? existingFiles[0].verzio + 1
    : 2

  // 2. Fájl feltöltése Storage-ba
  const fileExt = file.name.split('.').pop() || "bin"
  const fileName = `${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from("irat_files")
    .upload(fileName, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    })

  if (uploadError) {
    return { error: "Hiba a fájl feltöltésekor: " + uploadError.message }
  }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex')

  // PDF szöveg kinyerése a keresőhöz (FTS)
  let ocr_szoveg: string | null = null
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const { extractPdfText } = await import("@/utils/pdf-extractor")
      ocr_szoveg = await extractPdfText(buffer)
    } catch (e) {
      console.error("[VersionUpload] Text extract error:", e)
    }
  }

  // 3. Rekord mentése az irat_fajl táblába
  const { error: insertError } = await supabase.from("irat_fajl").insert({
    irat_id: iratId,
    eredeti_fajlnev: file.name,
    meret_byte: file.size,
    mime_type: file.type || "application/octet-stream",
    storage_path: fileName,
    sha256: hash,
    ocr_szoveg: ocr_szoveg,
    verzio: nextVersion
  })

  if (insertError) {
    return { error: "Hiba a fájl verzió rögzítésekor: " + insertError.message }
  }

  // 4. Audit naplózás
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    user_id: user.id,
    esemeny_tipus: "modositva",
    indoklas: `Új fájlverzió feltöltve (v${nextVersion}): ${file.name}.${indoklas ? ` Indoklás: ${indoklas}` : ""}`,
    uj_ertek: { irat_id: iratId, fajlnev: file.name, verzio: nextVersion },
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${ugyiratId}`)
  return { success: true, verzio: nextVersion }
}
