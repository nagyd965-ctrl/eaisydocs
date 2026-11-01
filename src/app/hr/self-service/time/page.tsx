import { createClient } from "@/utils/supabase/server"
import { LeaveHistoryList } from "@/components/hr/leave-history-list"
import { EmployeeTimesheet } from "@/components/hr/employee-timesheet"
import { SubstituteDialog } from "@/components/hr/substitute-dialog"
import { LeaveRequestDialog } from "@/components/hr/leave-request-dialog"
import { redirect } from "next/navigation"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isUserAuthorizedForHrView } from "@/utils/hr/company-role-resolver"
import { syncExpiredSubstitutions } from "@/utils/hr/substitute-sync"
import { resolveEffectiveHolidays } from "@/utils/hr/leave-calculator"

export default async function SelfServiceTimePage() {
  await syncExpiredSubstitutions()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const memberRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  // Távollétek lekérése (HR deep-analysis P0-javítás 2026-11-01: aktív cég-szűrés)
  let tavolletQuery = supabase
    .from("hr_tavollet")
    .select("*")
    .eq("dolgozo_id", user.id)
  if (activeCompanyId) {
    tavolletQuery = tavolletQuery.eq("company_id", activeCompanyId)
  }
  const { data: tavolletek } = await tavolletQuery.order("created_at", { ascending: false })

  // Munkaidő korrekciók lekérése (aktív cég-szűrés)
  let korrekcioQuery = supabase
    .from("hr_jelenlet_korrekcio")
    .select("*")
    .eq("dolgozo_id", user.id)
  if (activeCompanyId) {
    korrekcioQuery = korrekcioQuery.eq("company_id", activeCompanyId)
  }
  const { data: korrekciok } = await korrekcioQuery.order("created_at", { ascending: false })

  // Túlóra elszámolási / felhasználási kérelmek lekérése (aktív cégre szűrve)
  let tuloraQuery = supabase
    .from("hr_tulora_felhasznalás")
    .select("*")
    .eq("dolgozo_id", user.id)
  if (activeCompanyId) {
    tuloraQuery = tuloraQuery.eq("company_id", activeCompanyId)
  }
  const { data: tulorak } = await tuloraQuery.order("created_at", { ascending: false })

  // Munkaszüneti napok és áthelyezett munkanapok lekérése a munkanapok pontos Mt. szerinti kalkulációjához
  const currentYear = new Date().getFullYear()
  let holidaysQuery = supabase
    .from("hr_munkaszuneti_nap")
    .select("datum, athelye_munkanap, company_id")
    .gte("datum", `${currentYear - 1}-01-01`)
    .lte("datum", `${currentYear + 1}-12-31`)
  if (activeCompanyId) {
    holidaysQuery = holidaysQuery.or(`company_id.is.null,company_id.eq.${activeCompanyId}`)
  } else {
    holidaysQuery = holidaysQuery.is("company_id", null)
  }
  const { data: holidaysData } = await holidaysQuery

  const { holidays, transferredWorkdays } = resolveEffectiveHolidays(holidaysData as any[], activeCompanyId)

  const isManagerOrAdmin =
    memberRoles.isCompanyAdmin ||
    memberRoles.hrRole === "vezeto" ||
    isUserAuthorizedForHrView(memberRoles.hrRole, ["admin", "time"], memberRoles.hrModules)

  // Helyettesítések lekérése (aktív cégre szűrve)
  const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date())
  let substituteQuery = supabase
    .from("hr_helyettesites")
    .select("*, helyettes_profil:felhasznalo_profil!hr_helyettesites_helyettes_id_fkey(nev)")
    .eq("vezeto_id", user.id)
    .eq("aktiv", true)
    .gte("veg_datuma", todayStr)
    .order("created_at", { ascending: false })
    .limit(1)

  if (activeCompanyId) {
    substituteQuery = substituteQuery.eq("company_id", activeCompanyId)
  }

  const { data: currentSubstituteList } = await substituteQuery
  const currentSubstitute = currentSubstituteList?.[0] || null
  
  // Helyettesítő személyek lekérdezése (szigorúan a multi-tenant aktív cégre szűrve)
  let availableUsers: any[] = []
  if (isManagerOrAdmin && activeCompanyId) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jelenlét</h1>
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
        transferredWorkdays={transferredWorkdays}
      />
    </div>
  )
}
