"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function borrowDocument(iratId: string, kinekUserId: string, varhatoVisszahozatal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  // Jogosultság ellenőrzés (csak iratkezelő/admin kölcsönözhet)
  const { data: profile } = await supabase.from("felhasznalo_profil").select('docs_szerepkor').eq("id", user.id).single()
  if (!profile || !["iktato", "admin", "rendszergazda"].includes(profile.docs_szerepkor)) {
    return { success: false, error: "Nincs jogosultságod a kölcsönzés rögzítéséhez." }
  }

  // Meglévő aktív kölcsönzés ellenőrzése
  const { data: akt } = await supabase
    .from("irat_kolcsonzes_naplo")
    .select("id")
    .eq("irat_id", iratId)
    .eq("statusz", "kikolcsonozve")
    .single()

  if (akt) {
    return { success: false, error: "Ez az irat jelenleg is ki van kölcsönözve." }
  }

  const { error } = await supabase.from("irat_kolcsonzes_naplo").insert({
    irat_id: iratId,
    kinek_user_id: kinekUserId,
    kiadta_user_id: user.id,
    varhato_visszahozatal: new Date(varhatoVisszahozatal).toISOString(),
    statusz: "kikolcsonozve"
  })

  if (error) {
    console.error("Kölcsönzés hiba:", error)
    return { success: false, error: "Adatbázis hiba." }
  }

  // Eseménynapló rögzítése
  const { data: irat } = await supabase.from("irat").select("ugyirat_id, targy").eq("id", iratId).single()
  const { data: kinek } = await supabase.from("felhasznalo_profil").select("nev").eq("id", kinekUserId).single()
  
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: 'ugyirat',
    entitas_id: irat?.ugyirat_id,
    user_id: user.id,
    esemeny_tipus: 'modositva',
    uj_ertek: { megjegyzes: `Irat kikölcsönözve. Kinek: ${kinek?.nev}. Várható visszahozatal: ${new Date(varhatoVisszahozatal).toLocaleDateString('hu-HU')}.` },
    ip_cim: '127.0.0.1'
  })

  revalidatePath(`/dossiers/${irat?.ugyirat_id}`)
  return { success: true }
}

export async function returnDocument(kolcsonzesId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase.from("felhasznalo_profil").select('docs_szerepkor').eq("id", user.id).single()
  if (!profile || !["iktato", "admin", "rendszergazda"].includes(profile.docs_szerepkor)) {
    return { success: false, error: "Nincs jogosultság." }
  }

  const { data: log } = await supabase.from("irat_kolcsonzes_naplo").select("irat_id, kinek_user_id").eq("id", kolcsonzesId).single()

  const { error } = await supabase
    .from("irat_kolcsonzes_naplo")
    .update({ 
      statusz: "visszahozva", 
      tenyleges_visszahozatal: new Date().toISOString() 
    })
    .eq("id", kolcsonzesId)

  if (error) return { success: false, error: "Hiba történt." }

  let ugyiratId: string | undefined;

  // Eseménynapló rögzítése
  if (log) {
    const { data: irat } = await supabase.from("irat").select("ugyirat_id").eq("id", log.irat_id).single()
    ugyiratId = irat?.ugyirat_id;
    const { data: kinek } = await supabase.from("felhasznalo_profil").select("nev").eq("id", log.kinek_user_id).single()
    
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: 'ugyirat',
      entitas_id: irat?.ugyirat_id,
      user_id: user.id,
      esemeny_tipus: 'modositva',
      uj_ertek: { megjegyzes: `Irat visszavéve tőle: ${kinek?.nev || 'Ismeretlen'}.` },
      ip_cim: '127.0.0.1'
    })
  }

  if (ugyiratId) {
    revalidatePath(`/dossiers/${ugyiratId}`)
  } else {
    revalidatePath("/dossiers/[id]", "page")
  }
  return { success: true }
}

export async function setPhysicalLocation(iratId: string, doboz: string, polc: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase.from("felhasznalo_profil").select('docs_szerepkor').eq("id", user.id).single()
  if (!profile || !["iktato", "admin", "rendszergazda"].includes(profile.docs_szerepkor)) {
    return { success: false, error: "Nincs jogosultság." }
  }

  const { error } = await supabase
    .from("irat_fizikai_hely")
    .upsert({ 
      irat_id: iratId, 
      doboz: doboz || null,
      polc: polc || null
    }, { onConflict: "irat_id" })

  if (error) {
    console.error("Fizikai hely mentési hiba:", error)
    return { success: false, error: "Mentési hiba: " + error.message }
  }

  // Eseménynapló
  const { data: irat } = await supabase.from("irat").select("ugyirat_id").eq("id", iratId).single()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: 'ugyirat',
    entitas_id: irat?.ugyirat_id,
    user_id: user.id,
    esemeny_tipus: 'modositva',
    uj_ertek: { megjegyzes: `Fizikai helyzet módosítva: Polc: ${polc || '-'}, Doboz: ${doboz || '-'}` },
    ip_cim: '127.0.0.1'
  })

  revalidatePath(`/dossiers/${irat?.ugyirat_id}`)
  return { success: true }
}
