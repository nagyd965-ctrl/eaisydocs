"use server"

import { createClient } from "@/utils/supabase/server"

export async function getDocumentSignedUrl(filePath: string, iratId: string, fileId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
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
    uj_ertek: { fajl: filePath, akcio: "megtekintes_biztonsagos_api_vegponton" },
    ip_cim: ip,
    user_agent: userAgent
  })

  // Return our secure internal API route with specific fileId so the correct file is loaded
  const url = fileId ? `/api/pdf/${iratId}?fileId=${fileId}` : `/api/pdf/${iratId}`
  return { signedUrl: url }
}
