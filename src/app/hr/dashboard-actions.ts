"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function reassignPendingLeaves() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Csak HR/Admin futtathatja
  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  if (!currentUserProfile || !["hr_vezeto", "admin"].includes(currentUserProfile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod ehhez a művelethez!" }
  }

  // 1. Lekérjük az összes függő kérelmet
  const { data: pendingLeaves } = await supabaseAdmin
    .from("hr_tavollet")
    .select("id, dolgozo_id, aktualis_jovahagyo_id")
    .eq("statusz", "jovahagyasra_var")

  if (!pendingLeaves || pendingLeaves.length === 0) {
    return { success: true, message: "Nincs függő kérelem." }
  }

  let updatedCount = 0;
  const today = new Date().toISOString().split('T')[0];

  // 2. Újraértékeljük őket
  for (const leave of pendingLeaves) {
    const { data: profile } = await supabaseAdmin
      .from("felhasznalo_profil")
      .select("kozvetlen_vezeto_id")
      .eq("id", leave.dolgozo_id)
      .single()

    let currentManagerId = profile?.kozvetlen_vezeto_id;
    let newJovahagyoId: string | null = null;

    if (currentManagerId) {
      // Vezető távol van-e?
      const { data: managerLeave } = await supabaseAdmin
        .from("hr_tavollet")
        .select("id")
        .eq("dolgozo_id", currentManagerId)
        .eq("statusz", "jovahagyva")
        .lte("kezdet_datuma", today)
        .gte("veg_datuma", today)
        .limit(1)
        .maybeSingle()

      if (managerLeave) {
        // Helyettes keresése
        const { data: substitute } = await supabaseAdmin
          .from("hr_helyettesites")
          .select("helyettes_id")
          .eq("vezeto_id", currentManagerId)
          .eq("aktiv", true)
          .lte("kezdet_datuma", today)
          .gte("veg_datuma", today)
          .limit(1)
          .maybeSingle()

        if (substitute) {
          newJovahagyoId = substitute.helyettes_id;
        } else {
          currentManagerId = null; // HR-re dobjuk
        }
      } else {
        newJovahagyoId = currentManagerId;
      }
    }

    if (!currentManagerId && !newJovahagyoId) {
      const { data: hrAdmin } = await supabaseAdmin
        .from("felhasznalo_profil")
        .select("id")
        .in("hr_szerepkor", ["hr_vezeto", "admin"])
        .limit(1)
        .maybeSingle();
      
      if (hrAdmin) newJovahagyoId = hrAdmin.id;
    }

    // Csak akkor frissítjük, ha változott az aktuális jóváhagyó
    if (newJovahagyoId && newJovahagyoId !== leave.aktualis_jovahagyo_id) {
      await supabaseAdmin
        .from("hr_tavollet")
        .update({ aktualis_jovahagyo_id: newJovahagyoId })
        .eq("id", leave.id)
      updatedCount++;
    }
  }

  revalidatePath("/hr")
  revalidatePath("/hr/manager")
  return { success: true, message: `${updatedCount} kérelem sikeresen átszignálva.` }
}
