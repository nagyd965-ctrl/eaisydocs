"use server"

import { createClient } from "@/utils/supabase/server"

export async function getDocumentSignedUrl(filePath: string, iratId: string, fileId?: string, isPdfa?: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // Check user clearance
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, max_minosites")
    .eq("id", user.id)
    .single()

  const { data: irat } = await supabase
    .from("irat")
    .select("minosites")
    .eq("id", iratId)
    .single()

  const minositesHierarchy: Record<string, number> = {
    nyilt: 1,
    belso: 2,
    bizalmas: 3,
    szigoruan_bizalmas: 4
  }
  const userLevel = minositesHierarchy[profile?.max_minosites || 'nyilt'] || 1
  const docLevel = minositesHierarchy[irat?.minosites || 'nyilt'] || 1

  if (profile?.docs_szerepkor !== 'admin' && userLevel < docLevel) {
    return { 
      error: `Hozzáférés megtagadva: A dokumentum megtekintéséhez legalább '${irat?.minosites || 'bizalmas'}' biztonsági minősítés szükséges (Az Ön szintje: ${profile?.max_minosites || 'nyilt'}).` 
    }
  }

  // Log the viewing action directly to the esemeny_naplo
  // since viewing doesn't update the record, we do it manually.
  const { getClientInfo } = await import("@/utils/client-info")
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "irat",
    entitas_id: iratId,
    esemeny_tipus: "megtekintve",
    user_id: user.id,
    uj_ertek: { fajl: filePath, isPdfa: !!isPdfa, akcio: "megtekintes_biztonsagos_api_vegponton" },
    ip_cim: ip,
    user_agent: userAgent
  })

  // Return our secure internal API route with specific fileId & pdfa parameter
  const params = new URLSearchParams()
  if (fileId) params.set("fileId", fileId)
  if (isPdfa) params.set("pdfa", "true")
  const queryStr = params.toString()
  const url = queryStr ? `/api/pdf/${iratId}?${queryStr}` : `/api/pdf/${iratId}`
  return { signedUrl: url }
}
