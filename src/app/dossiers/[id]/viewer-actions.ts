"use server"

import { createClient } from "@/utils/supabase/server"

export async function getDocumentSignedUrl(filePath: string, iratId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // Log the viewing action directly to the esemeny_naplo
  // since viewing doesn't update the record, we do it manually.
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "irat",
    entitas_id: iratId,
    esemeny_tipus: "megtekintve",
    user_id: user.id,
    uj_ertek: { fajl: filePath, akcio: "megtekintes_biztonsagos_api_vegponton" }
  })

  // Return our secure internal API route instead of a direct Supabase signed URL
  return { signedUrl: `/api/pdf/${iratId}` }
}
