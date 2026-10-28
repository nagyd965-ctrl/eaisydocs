import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { InternalCareerView, InternalJobPosting } from "@/components/hr/internal-career-view"
import { getMyReferralsAction, getReferralBonusAmountAction, getMyInternalApplicationsAction } from "./referral-actions"

export default async function InternalCareerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const activeCompanyId = await getActiveCompanyIdServer()

  // Lekérdezzük az aktív céghez tartozó aktív hirdetéseket a munkakör és részleg adataival együtt
  let query = supabase
    .from("hr_allashirdetes")
    .select(`
      id, 
      cim, 
      rovid_leiras,
      reszletes_leiras,
      nyitva_tol,
      nyitva_ig,
      is_internal,
      publikus,
      munkavegzes_modja,
      foglalkoztatas_tipusa,
      tapasztalati_szint,
      helyszin,
      reszleg_nev,
      bersav_min,
      bersav_max,
      bersav_publikus,
      created_at,
      hr_munkakor (
        id,
        megnevezes,
        hr_szervezeti_egyseg (
          id,
          nev
        )
      )
    `)
    .eq("aktiv", true)

  if (activeCompanyId) {
    query = query.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
  }

  const [
    { data: hirdetesek },
    referrals,
    bonusAmount,
    initialApplications,
    { data: profile },
    { data: adatlap },
  ] = await Promise.all([
    query.order("created_at", { ascending: false }),
    getMyReferralsAction(),
    getReferralBonusAmountAction(),
    getMyInternalApplicationsAction(),
    supabase.from("felhasznalo_profil").select("nev, email").eq("id", user.id).maybeSingle(),
    supabase.from("hr_dolgozo_adatlap").select("hr_munkakor(megnevezes)").eq("id", user.id).maybeSingle(),
  ])

  const mk = Array.isArray((adatlap as any)?.hr_munkakor)
    ? (adatlap as any)?.hr_munkakor[0]
    : (adatlap as any)?.hr_munkakor

  const currentEmployee = {
    nev: profile?.nev || user.email || "Munkatárs",
    email: profile?.email || user.email || "",
    munkakor: mk?.megnevezes || "Belső munkatárs",
  }

  return (
    <InternalCareerView
      postings={(hirdetesek as InternalJobPosting[]) || []}
      initialReferrals={referrals}
      initialApplications={initialApplications}
      bonusAmount={bonusAmount}
      currentEmployee={currentEmployee}
    />
  )
}
