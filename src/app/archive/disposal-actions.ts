"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"
import { getBaseUrl } from "@/utils/url"

// 1. Felterjesztés Selejtezésre (Iratkezelő csinálja)
export async function proposeDisposal(ugyiratIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  for (const id of ugyiratIds) {
    // Státusz váltás selejtezhetőre (Jóváhagyásra vár)
    const { error: updateError } = await supabase
      .from("ugyirat")
      .update({ statusz: "selejtezheto" })
      .eq("id", id)

    if (!updateError) {
      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "ugyirat",
        entitas_id: id,
        esemeny_tipus: "modositva",
        user_id: user.id,
        indoklas: "Selejtezésre felterjesztve"
      })
    }
  }

  // Értesítés a vezetőknek (Adminoknak) a selejtezési felterjesztésről
  const { data: szabaly } = await supabase
    .from("ertesitesi_szabaly")
    .select("aktiv")
    .eq("esemeny_tipus", "allapotvaltozas")
    .eq("kinek", "vezeto")
    .single()

  if (szabaly?.aktiv && ugyiratIds.length > 0) {
    // Lekérjük a vezetőket (admin, vezeto) a profil táblából
    const { data: vezetok } = await supabase
      .from("felhasznalo_profil")
      .select("id")
      .in("szerepkor", ["admin", "vezeto", "rendszergazda"])

    if (vezetok && vezetok.length > 0) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )

        for (const vezeto of vezetok) {
          const { data: adminData } = await supabaseAdmin.auth.admin.getUserById(vezeto.id)
          const userEmail = adminData?.user?.email

          if (userEmail) {
            await sendNotificationEmail({
              to: userEmail,
              subject: "Új iratselejtezési javaslat jóváhagyásra vár",
              html: buildHtmlEmail(
                "Iratselejtezési jóváhagyás szükséges",
                `Egy munkatárs felterjesztett <b>${ugyiratIds.length} db</b> ügyiratot végleges selejtezésre. Kérlek, lépj be az Irattár felületre, vizsgáld felül az iratokat, és a "Négy Szem Elve" alapján hagyd jóvá a megsemmisítésüket és a jegyzőkönyv kiállítását.`,
                [],
                "Irattár megnyitása",
                `${getBaseUrl()}/archive`
              )
            })
          }
        }
      }
    }
  }

  revalidatePath("/archive")
  return { success: true }
}

// 2. Jóváhagyás és Jegyzőkönyv generálás (Vezető csinálja)
export async function approveDisposal(ugyiratIds: string[], approverName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  let finalProposerName = "Ismeretlen"

  // Check 4-eyes principle for each
  for (const id of ugyiratIds) {
    const { data: events } = await supabase
      .from("esemeny_naplo")
      .select("user_id")
      .eq("entitas_id", id)
      .eq("esemeny_tipus", "modositva")
      .eq("indoklas", "Selejtezésre felterjesztve")
      .order("tortent", { ascending: false })
      .limit(1)

    if (events && events.length > 0) {
      if (events[0].user_id === user.id) {
         // Négy szem elve megsértve
         return { error: `Négy szem elve megsértve! Nem hagyhatod jóvá a saját magad által felterjesztett ügyiratot. (Azonosító: ${id})` }
      }
      
      // Get proposer name
      if (finalProposerName === "Ismeretlen") {
        const { data: profile } = await supabase.from("felhasznalo_profil").select("nev").eq("id", events[0].user_id).single()
        if (profile?.nev) {
          finalProposerName = profile.nev
        }
      }
    }
  }

  // Ha minden átment, végezzük el a tényleges selejtezést
  const disposedItems = []

  for (const id of ugyiratIds) {
    // 1. Keresd meg a hozzá tartozó iratokat és fájlokat
    const { data: iratok } = await supabase.from("irat").select("id").eq("ugyirat_id", id)

    if (iratok && iratok.length > 0) {
      const iratIds = iratok.map(i => i.id)
      const { data: fajlok } = await supabase.from("irat_fajl").select("storage_path").in("irat_id", iratIds).not("storage_path", "is", null)

      if (fajlok && fajlok.length > 0) {
        const pathsToDelete = fajlok.map(f => f.storage_path)
        await supabase.storage.from("iratok").remove(pathsToDelete)
      }
    }

    // 2. Ügy státuszának átállítása "selejtezett"-re
    const { data: ugyirat } = await supabase.from("ugyirat").select("ugy_id, iktatoszam").eq("id", id).single()
    if (ugyirat?.ugy_id) {
      await supabase.from("ugy").update({ statusz: "selejtezett" }).eq("id", ugyirat.ugy_id)
      disposedItems.push(ugyirat.iktatoszam)
    }

    // 3. Eseménynapló rögzítés "selejtezve"
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "ugyirat",
      entitas_id: id,
      esemeny_tipus: "selejtezve",
      user_id: user.id,
      indoklas: `A megőrzési idő lejárt, az ügyiratot leselejteztük, a fizikai fájlokat véglegesen töröltük a rendszerből. Jóváhagyta: ${approverName}`
    })
  }

  revalidatePath("/archive")
  return { success: true, disposedItems, proposer: finalProposerName }
}
