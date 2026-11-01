"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isUserAuthorizedForHrView } from "@/utils/hr/company-role-resolver"

export async function reassignPendingLeaves() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const activeCompanyId = await getActiveCompanyIdServer()
  const scoped = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Csak HR/Admin (time vagy admin moduljoggal rendelkező) futtathatja az aktív cégben
  const canReassign =
    scoped.isCompanyAdmin ||
    isUserAuthorizedForHrView(scoped.hrRole, ["admin", "time"], scoped.hrModules)

  if (!canReassign) {
    return { error: "Nincs jogosultságod ehhez a művelethez!" }
  }

  // 1. Lekérjük az összes függő kérelmet (adott céghez szűrve)
  let pendingLeavesQuery = supabaseAdmin
    .from("hr_tavollet")
    .select("id, dolgozo_id, aktualis_jovahagyo_id")
    .eq("statusz", "jovahagyasra_var")

  if (activeCompanyId) {
    pendingLeavesQuery = pendingLeavesQuery.eq("company_id", activeCompanyId)
  }

  const { data: pendingLeaves } = await pendingLeavesQuery

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

    if (!currentManagerId && !newJovahagyoId && activeCompanyId) {
      const { data: companyMembers } = await supabaseAdmin
        .from("company_members")
        .select("user_id, role, hr_szerepkor, hr_modulok")
        .eq("company_id", activeCompanyId)

      const hrOrAdminMember = (companyMembers || []).find((m: any) =>
        m.role === "owner" ||
        m.role === "admin" ||
        isUserAuthorizedForHrView(
          m.hr_szerepkor,
          ["admin", "time"],
          Array.isArray(m.hr_modulok) ? m.hr_modulok : []
        )
      )
      if (hrOrAdminMember?.user_id) {
        newJovahagyoId = hrOrAdminMember.user_id
      }
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
