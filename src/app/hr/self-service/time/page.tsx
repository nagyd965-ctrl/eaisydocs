import { createClient } from "@/utils/supabase/server"
import { LeaveHistoryList } from "@/components/hr/leave-history-list"
import { EmployeeTimesheet } from "@/components/hr/employee-timesheet"
import { SubstituteDialog } from "@/components/hr/substitute-dialog"
import { LeaveRequestDialog } from "@/components/hr/leave-request-dialog"
import { redirect } from "next/navigation"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { syncExpiredSubstitutions } from "@/utils/hr/substitute-sync"

export default async function SelfServiceTimePage() {
  await syncExpiredSubstitutions()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const memberRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  // Távollétek lekérése
  const { data: tavolletek } = await supabase
    .from("hr_tavollet")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  // Munkaidő korrekciók lekérése
  const { data: korrekciok } = await supabase
    .from("hr_jelenlet_korrekcio")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  // Túlóra elszámolási / felhasználási kérelmek lekérése
  const { data: tulorak } = await supabase
    .from("hr_tulora_felhasznalás")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  // Munkaszüneti napok lekérése a munkanapok pontos Mt. szerinti kalkulációjához
  const currentYear = new Date().getFullYear()
  const { data: holidaysData } = await supabase
    .from("hr_munkaszuneti_nap")
    .select("datum")
    .gte("datum", `${currentYear - 1}-01-01`)
    .lte("datum", `${currentYear + 1}-12-31`)
    .eq("athelye_munkanap", false)

  const holidays = (holidaysData || []).map((h: any) => h.datum as string)

  const isManagerOrAdmin = ['hr_vezeto', 'vezeto', 'admin'].includes(memberRoles.hrRole || "")

  // Helyettesítések lekérése (aktív cégre szűrve)
  let substituteQuery = supabase
    .from("hr_helyettesites")
    .select("*, helyettes_profil:felhasznalo_profil!hr_helyettesites_helyettes_id_fkey(nev)")
    .eq("vezeto_id", user.id)
    .eq("aktiv", true)
    .gte("veg_datuma", new Date().toISOString().split('T')[0])
    .order("created_at", { ascending: false })
    .limit(1)

  if (activeCompanyId) {
    substituteQuery = substituteQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
  }

  const { data: currentSubstituteList } = await substituteQuery
  const currentSubstitute = currentSubstituteList?.[0] || null
  
  // Helyettesítő személyek lekérdezése (szigorúan a multi-tenant aktív cégre szűrve)
  let availableUsers: any[] = []
  if (isManagerOrAdmin) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (activeCompanyId) {
      // 1. Céghez tartozó tagok lekérése a company_members táblából
      const { data: members } = await supabaseAdmin
        .from("company_members")
        .select("user_id")
        .eq("company_id", activeCompanyId)

      const memberIds = (members || []).map((m: any) => m.user_id).filter((id: string) => id !== user.id)

      // 2. Céghez tartozó dolgozói adatlapok lekérése
      const { data: adatlapUsers } = await supabaseAdmin
        .from("hr_dolgozo_adatlap")
        .select("id, felhasznalo_profil!inner(id, nev)")
        .eq("company_id", activeCompanyId)
        .neq("id", user.id)

      // 3. Cégtagok profiljainak lekérése
      let memberProfiles: any[] = []
      if (memberIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from("felhasznalo_profil")
          .select("id, nev")
          .in("id", memberIds)
        memberProfiles = profiles || []
      }

      // Egyesítés duplikációk nélkül (kizárólag az aktív céghez tartozó személyek)
      const userMap = new Map<string, { id: string; nev: string }>()
      for (const a of (adatlapUsers || [])) {
        const profile = (Array.isArray(a.felhasznalo_profil) ? a.felhasznalo_profil[0] : a.felhasznalo_profil) as { id: string; nev: string } | undefined
        if (profile?.id && profile?.nev) {
          userMap.set(profile.id, { id: profile.id, nev: profile.nev })
        }
      }
      for (const p of memberProfiles) {
        if (p?.id && p?.nev && !userMap.has(p.id)) {
          userMap.set(p.id, { id: p.id, nev: p.nev })
        }
      }

      availableUsers = Array.from(userMap.values()).sort((a, b) =>
        (a.nev || "").localeCompare(b.nev || "", "hu", { sensitivity: "base" })
      )
    } else {
      const { data: availableAdatlapUsers } = await supabaseAdmin
        .from("hr_dolgozo_adatlap")
        .select("id, felhasznalo_profil!inner(id, nev)")
        .neq("id", user.id)

      availableUsers = (availableAdatlapUsers || [])
        .map((a: any) => (Array.isArray(a.felhasznalo_profil) ? a.felhasznalo_profil[0] : a.felhasznalo_profil))
        .filter((p: any) => p && p.id && p.nev)
        .sort((a: any, b: any) => (a.nev || "").localeCompare(b.nev || "", "hu", { sensitivity: "base" }))
    }
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jelenlét és Szabadság</h1>
          <p className="text-muted-foreground mt-1">
            Munkaidő nyilvántartás, szabadságok és helyettesítések.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isManagerOrAdmin && (
            <SubstituteDialog
              availableUsers={availableUsers}
              currentSubstitute={currentSubstitute}
            />
          )}
          <LeaveRequestDialog />
        </div>
      </div>

      {/* Jelenléti Ív + Stat kártyák (a komponensen belül, szinkronban a hónapváltással) */}
      <EmployeeTimesheet employeeId={user.id} />

      {/* Saját Kérelmeim */}
      <LeaveHistoryList
        leaves={tavolletek || []}
        corrections={korrekciok || []}
        overtimes={tulorak || []}
        holidays={holidays}
      />
    </div>
  )
}
