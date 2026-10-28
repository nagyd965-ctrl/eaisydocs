import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import { getScopedPerformanceEmployeeIds } from "@/utils/hr/performance-access"
import {
  PerformanceCalibrationDashboard,
  type EnrichedEmployee,
  type PerformanceCycleItem,
  type PerformanceKpiItem,
} from "./components/performance-calibration-dashboard"

export default async function DashboardPage() {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "vezeto", "auditor"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-semibold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">
            Csak vezetők és HR munkatársak férhetnek hozzá a teljesítményriportokhoz.
          </p>
        </div>
      </div>
    )
  }

  const { activeCompanyId } = auth
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Aktív cég tagjainak azonosítói (vezeto esetén csak a saját közvetlen beosztottak)
  const { data: companyMembers } = await supabaseAdmin
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyScope)
  const memberUserIds = (companyMembers || []).map((m: any) => m.user_id)
  const scopedEmployeeIds = await getScopedPerformanceEmployeeIds(
    supabaseAdmin,
    auth,
    memberUserIds
  )
  const safeMemberIds =
    scopedEmployeeIds.length > 0 ? scopedEmployeeIds : ["00000000-0000-0000-0000-000000000000"]

  const [kpisRes, cyclesRes, employeesRes, departmentsRes] = await Promise.all([
    supabaseAdmin
      .from("hr_teljesitmeny")
      .select("*")
      .in("dolgozo_id", safeMemberIds)
      .or(`company_id.eq.${companyScope},company_id.is.null`),

    supabaseAdmin
      .from("hr_teljesitmeny_ciklus")
      .select("*")
      .or(`company_id.eq.${companyScope},company_id.is.null`)
      .order("kezdo_datum", { ascending: false }),

    supabaseAdmin
      .from("hr_dolgozo_adatlap")
      .select(`
        id,
        felhasznalo_profil (
          nev,
          avatar_url,
          szervezeti_egyseg_id
        ),
        hr_jogviszony (
          hr_beosztas (
            ervenyes_ig,
            hr_munkakor (
              megnevezes,
              szervezeti_egyseg_id
            )
          )
        )
      `)
      .in("id", safeMemberIds),

    supabaseAdmin
      .from("szervezeti_egyseg")
      .select("id, nev")
      .or(`company_id.eq.${companyScope},company_id.is.null`),
  ])

  const deptMap = new Map<string, string>()
  ;(departmentsRes.data || []).forEach((d: any) => {
    if (d.id && d.nev) deptMap.set(d.id, d.nev)
  })

  const inferDepartmentFromRole = (roleName: string): string => {
    const lower = roleName.toLowerCase()
    if (lower.includes("fejlesztő") || lower.includes("engineer") || lower.includes("devops") || lower.includes("ux")) {
      return "Fejlesztés"
    }
    if (lower.includes("hr") || lower.includes("toborz")) {
      return "HR & Operáció"
    }
    if (lower.includes("flotta") || lower.includes("logisztik") || lower.includes("operáció")) {
      return "Flotta & Operáció"
    }
    if (lower.includes("pénzügy") || lower.includes("kontroller") || lower.includes("könyvel")) {
      return "Pénzügy"
    }
    if (lower.includes("értékesít") || lower.includes("sales") || lower.includes("account")) {
      return "Értékesítés"
    }
    return "Általános Operáció"
  }

  const enrichedEmployees: EnrichedEmployee[] = (employeesRes.data || []).map((emp: any) => {
    const profil = Array.isArray(emp.felhasznalo_profil)
      ? emp.felhasznalo_profil[0]
      : emp.felhasznalo_profil

    const nev = profil?.nev || "Ismeretlen munkavállaló"
    const avatar_url = profil?.avatar_url || null

    const jogviszonyList = Array.isArray(emp.hr_jogviszony)
      ? emp.hr_jogviszony
      : emp.hr_jogviszony
      ? [emp.hr_jogviszony]
      : []

    let activeBeosztas: any = null
    for (const jv of jogviszonyList) {
      const beosztasList = Array.isArray(jv?.hr_beosztas)
        ? jv.hr_beosztas
        : jv?.hr_beosztas
        ? [jv.hr_beosztas]
        : []
      const found = beosztasList.find((b: any) => b.ervenyes_ig === null) || beosztasList[0]
      if (found) {
        activeBeosztas = found
        break
      }
    }

    const munkakorObj = Array.isArray(activeBeosztas?.hr_munkakor)
      ? activeBeosztas.hr_munkakor[0]
      : activeBeosztas?.hr_munkakor

    const munkakor = munkakorObj?.megnevezes || "Munkatárs"
    const deptId = profil?.szervezeti_egyseg_id || munkakorObj?.szervezeti_egyseg_id || null
    const reszleg = (deptId && deptMap.get(deptId)) || inferDepartmentFromRole(munkakor)

    return {
      id: emp.id,
      nev,
      avatar_url,
      munkakor,
      reszleg,
    }
  })

  const cycles: PerformanceCycleItem[] = (cyclesRes.data || []).map((c: any) => ({
    id: c.id,
    megnevezes: c.megnevezes,
    kezdo_datum: c.kezdo_datum,
    befejezo_datum: c.befejezo_datum,
    statusz: c.statusz,
  }))

  const kpis: PerformanceKpiItem[] = (kpisRes.data || []).map((k: any) => ({
    id: k.id,
    dolgozo_id: k.dolgozo_id,
    ciklus_id: k.ciklus_id || null,
    celkituzes: k.celkituzes || "Célkitűzés",
    meroszam_tipusa: k.meroszam_tipusa || "szazalek",
    cel_ertek: k.cel_ertek ?? 100,
    aktualis_ertek: k.aktualis_ertek ?? 0,
    sulyozas: k.sulyozas ?? 1,
    workflow_fazis: k.workflow_fazis || null,
    ertekeles_lezarva_datum: k.ertekeles_lezarva_datum || null,
    ertekeles_szovege: k.ertekeles_szovege || null,
    onertekeles_szovege: k.onertekeles_szovege || null,
    hatarido: k.hatarido || null,
  }))

  return (
    <PerformanceCalibrationDashboard
      key={companyScope}
      employees={enrichedEmployees}
      cycles={cycles}
      kpis={kpis}
    />
  )
}
