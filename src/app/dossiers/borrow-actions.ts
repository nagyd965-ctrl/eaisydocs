"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { requireDocsAuthServer } from "@/utils/docs-auth-guard"

export async function borrowDocument(iratId: string, kinekUserId: string, varhatoVisszahozatal: string) {
  const supabase = await createClient()
  const { data: irat } = await supabase
    .from("irat")
    .select("ugyirat_id, targy, company_id")
    .eq("id", iratId)
    .single()

  if (!irat) {
    return { success: false, error: "Az érintett irat nem található." }
  }

  const targetCompanyId = irat.company_id || (await getActiveCompanyIdServer())
  const auth = await requireDocsAuthServer(
    ["iktato", "admin", "rendszergazda", "vezeto", "ugyintezo", "dossiers", "archive"],
    targetCompanyId
  )
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Nincs jogosultságod a kölcsönzés rögzítéséhez." }
  }
  const user = auth.user

  if (targetCompanyId) {
    const { data: borrowerMembership } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", targetCompanyId)
      .eq("user_id", kinekUserId)
      .maybeSingle()

    if (!borrowerMembership) {
      return { success: false, error: "A kiválasztott munkatárs nem tagja az aktív vállalatnak." }
    }
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

  const { data: kinek } = await supabase
    .from("felhasznalo_profil")
    .select("nev, elerheto_modulok")
    .eq("id", kinekUserId)
    .single()

  const borrowerModules = Array.isArray((kinek as any)?.elerheto_modulok)
    ? (kinek as any).elerheto_modulok
    : ["docs", "hr"]
  if (!borrowerModules.includes("docs")) {
    return { success: false, error: "A kiválasztott munkatárs nem rendelkezik eaisyDocs modul-hozzáféréssel." }
  }

  const { error } = await supabase.from("irat_kolcsonzes_naplo").insert({
    irat_id: iratId,
    kinek_user_id: kinekUserId,
    kiadta_user_id: user.id,
    varhato_visszahozatal: new Date(varhatoVisszahozatal).toISOString(),
    statusz: "kikolcsonozve"
  })

  if (error) {
    if ((error as any).code === "23505") {
      return { success: false, error: "Ez az irat időközben már kikölcsönzésre került egy másik munkatárs által." }
    }
    console.error("Kölcsönzés hiba:", error)
    return { success: false, error: "Adatbázis hiba a kölcsönzés során." }
  }

  // Eseménynapló rögzítése
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: irat?.ugyirat_id,
    user_id: user.id,
    esemeny_tipus: "modositva",
    uj_ertek: { megjegyzes: `Irat kikölcsönözve. Kinek: ${kinek?.nev}. Várható visszahozatal: ${new Date(varhatoVisszahozatal).toLocaleDateString("hu-HU")}.` },
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${irat?.ugyirat_id}`)
  return { success: true }
}

export async function returnDocument(kolcsonzesId: string) {
  const supabase = await createClient()
  const { data: log } = await supabase
    .from("irat_kolcsonzes_naplo")
    .select("irat_id, kinek_user_id")
    .eq("id", kolcsonzesId)
    .single()

  if (!log) {
    return { success: false, error: "A kölcsönzési bejegyzés nem található." }
  }

  const { data: irat } = await supabase
    .from("irat")
    .select("ugyirat_id, company_id")
    .eq("id", log.irat_id)
    .single()

  if (!irat) {
    return { success: false, error: "Az érintett irat nem található." }
  }

  const auth = await requireDocsAuthServer(
    ["iktato", "admin", "rendszergazda", "vezeto", "ugyintezo", "dossiers", "archive"],
    irat.company_id || null
  )
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Nincs jogosultság." }
  }
  if (auth.activeCompanyId && irat.company_id && irat.company_id !== auth.activeCompanyId) {
    return { success: false, error: "Az érintett irat nem tartozik az aktív vállalathoz." }
  }
  const user = auth.user

  const { error } = await supabase
    .from("irat_kolcsonzes_naplo")
    .update({ 
      statusz: "visszahozva", 
      tenyleges_visszahozatal: new Date().toISOString() 
    })
    .eq("id", kolcsonzesId)

  if (error) return { success: false, error: "Hiba történt." }

  const ugyiratId = irat?.ugyirat_id

  // Eseménynapló rögzítése
  const { data: kinek } = await supabase.from("felhasznalo_profil").select("nev").eq("id", log.kinek_user_id).single()

  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: irat?.ugyirat_id,
    user_id: user.id,
    company_id: irat.company_id || auth.activeCompanyId || null,
    esemeny_tipus: "modositva",
    uj_ertek: { megjegyzes: `Irat visszavéve tőle: ${kinek?.nev || "Ismeretlen"}.` },
    ip_cim: ip,
    user_agent: userAgent
  })

  if (ugyiratId) {
    revalidatePath(`/dossiers/${ugyiratId}`)
  } else {
    revalidatePath("/dossiers/[id]", "page")
  }
  return { success: true }
}

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

  const list = data || []

  const polcok = Array.from(new Set(list.map((d: any) => d.polc).filter(Boolean))) as string[]
  const dobozok = Array.from(new Set(list.map((d: any) => d.doboz).filter(Boolean))) as string[]

  return {
    polcok: polcok.sort((a, b) => a.localeCompare(b, "hu")),
    dobozok: dobozok.sort((a, b) => a.localeCompare(b, "hu"))
  }
}

export async function setPhysicalLocation(iratId: string, doboz: string, polc: string, megjegyzes?: string) {
  const supabase = await createClient()
  const { data: irat } = await supabase
    .from("irat")
    .select("id, ugyirat_id, company_id")
    .eq("id", iratId)
    .single()

  if (!irat) {
    return { success: false, error: "Az érintett irat nem található." }
  }

  const auth = await requireDocsAuthServer(
    ["iktato", "admin", "rendszergazda", "vezeto", "ugyintezo", "dossiers", "archive"],
    irat.company_id || null
  )
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Nincs jogosultság." }
  }
  if (auth.activeCompanyId && irat.company_id && irat.company_id !== auth.activeCompanyId) {
    return { success: false, error: "Az érintett irat nem tartozik az aktív vállalathoz." }
  }
  const user = auth.user

  const companyScope = irat.company_id || auth.activeCompanyId || "00000000-0000-0000-0000-000000000000"

  const trimmedDoboz = doboz?.trim() || ""
  const trimmedPolc = polc?.trim() || ""
  const trimmedMegjegyzes = megjegyzes?.trim() || null

  const isClearing = !trimmedDoboz && !trimmedPolc && !trimmedMegjegyzes

  if (isClearing) {
    const { error: delErr } = await supabase
      .from("irat_fizikai_hely")
      .delete()
      .eq("irat_id", iratId)
      .eq("company_id", companyScope)

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
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: irat?.ugyirat_id,
    user_id: user.id,
    company_id: irat.company_id || auth.activeCompanyId || null,
    esemeny_tipus: "modositva",
    uj_ertek: { 
      megjegyzes: isClearing 
        ? "Fizikai helyzet törölve" 
        : `Fizikai helyzet módosítva: Polc: ${trimmedPolc || "-"}, Doboz: ${trimmedDoboz || "-"}${trimmedMegjegyzes ? ` (Megjegyzés: ${trimmedMegjegyzes})` : ""}` 
    },
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${irat?.ugyirat_id}`)
  return { success: true }
}
