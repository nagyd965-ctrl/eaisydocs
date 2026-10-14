"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"

export async function borrowDocument(iratId: string, kinekUserId: string, varhatoVisszahozatal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  // Jogosultság ellenőrzés (iktató, ügyintéző, vezető, admin)
  const { data: profile } = await supabase.from("felhasznalo_profil").select('docs_szerepkor').eq("id", user.id).single()
  if (!profile || !["iktato", "admin", "rendszergazda", "vezeto", "ugyintezo"].includes(profile.docs_szerepkor)) {
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

  const { data: kinek } = await supabase.from("felhasznalo_profil").select("nev").eq("id", kinekUserId).single()

  const { error } = await supabase.from("irat_kolcsonzes_naplo").insert({
    irat_id: iratId,
    kinek_user_id: kinekUserId,
    kiadta_user_id: user.id,
    varhato_visszahozatal: new Date(varhatoVisszahozatal).toISOString(),
    statusz: "kikolcsonozve"
  })

  if (error) {
    if ((error as any).code === '23505') {
      return { success: false, error: "Ez az irat időközben már kikölcsönzésre került egy másik munkatárs által." }
    }
    console.error("Kölcsönzés hiba:", error)
    return { success: false, error: "Adatbázis hiba a kölcsönzés során." }
  }

  // Eseménynapló rögzítése
  const { data: irat } = await supabase.from("irat").select("ugyirat_id, targy").eq("id", iratId).single()
  
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: 'ugyirat',
    entitas_id: irat?.ugyirat_id,
    user_id: user.id,
    esemeny_tipus: 'modositva',
    uj_ertek: { megjegyzes: `Irat kikölcsönözve. Kinek: ${kinek?.nev}. Várható visszahozatal: ${new Date(varhatoVisszahozatal).toLocaleDateString('hu-HU')}.` },
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${irat?.ugyirat_id}`)
  return { success: true }
}

export async function returnDocument(kolcsonzesId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase.from("felhasznalo_profil").select('docs_szerepkor').eq("id", user.id).single()
  if (!profile || !["iktato", "admin", "rendszergazda", "vezeto", "ugyintezo"].includes(profile.docs_szerepkor)) {
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
    
    // Eseménynapló rögzítése

    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: 'ugyirat',
      entitas_id: irat?.ugyirat_id,
      user_id: user.id,
      esemeny_tipus: 'modositva',
      uj_ertek: { megjegyzes: `Irat visszavéve tőle: ${kinek?.nev || 'Ismeretlen'}.` },
      ip_cim: ip,
      user_agent: userAgent
    })
  }

  if (ugyiratId) {
    revalidatePath(`/dossiers/${ugyiratId}`)
  } else {
    revalidatePath("/dossiers/[id]", "page")
  }
  return { success: true }
}

import { getActiveCompanyIdServer } from "@/utils/company-server"

export async function getPhysicalLocationSuggestions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { polcok: [], dobozok: [] }

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  const { data } = await supabase
    .from("irat_fizikai_hely")
    .select("polc, doboz")
    .eq("company_id", companyScope)
    .limit(300)

  let list = data || []
  if (list.length === 0) {
    const { data: fallback } = await supabase
      .from("irat_fizikai_hely")
      .select("polc, doboz")
      .limit(300)
    list = fallback || []
  }

  const polcok = Array.from(new Set(list.map((d: any) => d.polc).filter(Boolean))) as string[]
  const dobozok = Array.from(new Set(list.map((d: any) => d.doboz).filter(Boolean))) as string[]

  return {
    polcok: polcok.sort((a, b) => a.localeCompare(b, "hu")),
    dobozok: dobozok.sort((a, b) => a.localeCompare(b, "hu"))
  }
}

export async function setPhysicalLocation(iratId: string, doboz: string, polc: string, megjegyzes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase.from("felhasznalo_profil").select('docs_szerepkor').eq("id", user.id).single()
  if (!profile || !["iktato", "admin", "rendszergazda", "vezeto", "ugyintezo"].includes(profile.docs_szerepkor)) {
    return { success: false, error: "Nincs jogosultság." }
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  const trimmedDoboz = doboz?.trim() || ""
  const trimmedPolc = polc?.trim() || ""
  const trimmedMegjegyzes = megjegyzes?.trim() || null

  const isClearing = !trimmedDoboz && !trimmedPolc && !trimmedMegjegyzes

  if (isClearing) {
    const { error: delErr } = await supabase
      .from("irat_fizikai_hely")
      .delete()
      .eq("irat_id", iratId)

    if (delErr) {
      console.error("Fizikai hely törlési hiba:", delErr)
      return { success: false, error: "Törlési hiba: " + delErr.message }
    }
  } else {
    const { error } = await supabase
      .from("irat_fizikai_hely")
      .upsert({ 
        irat_id: iratId, 
        doboz: trimmedDoboz || null,
        polc: trimmedPolc || null,
        megjegyzes: trimmedMegjegyzes,
        company_id: companyScope,
        updated_at: new Date().toISOString()
      }, { onConflict: "irat_id" })

    if (error) {
      console.error("Fizikai hely mentési hiba:", error)
      return { success: false, error: "Mentési hiba: " + error.message }
    }
  }

  // Eseménynapló
  const { data: irat } = await supabase.from("irat").select("ugyirat_id").eq("id", iratId).single()
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: 'ugyirat',
    entitas_id: irat?.ugyirat_id,
    user_id: user.id,
    esemeny_tipus: 'modositva',
    uj_ertek: { 
      megjegyzes: isClearing 
        ? "Fizikai helyzet törölve" 
        : `Fizikai helyzet módosítva: Polc: ${trimmedPolc || '-'}, Doboz: ${trimmedDoboz || '-'}${trimmedMegjegyzes ? ` (Megjegyzés: ${trimmedMegjegyzes})` : ''}` 
    },
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${irat?.ugyirat_id}`)
  return { success: true }
}
