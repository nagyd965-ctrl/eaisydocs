import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { buildOrgTree, type OrgDolgozo, type OrgUnitNode } from "@/lib/org-chart-utils"
import { OrganizationTabsView } from "@/components/hr/organization-tabs-view"

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function HrOrganizationPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"
  const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  const hrRole = scopedRoles.hrRole || profile?.hr_szerepkor || "munkavallalo"
  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin", "rendszergazda", "auditor", "berugyi"].includes(hrRole)

  if (!isHrOrAdmin) {
    redirect("/hr/self-service/profile")
  }

  // Aktív cég tagjainak azonosítói
  const { data: companyMembers } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyScope)

  const companyUserIds = (companyMembers || []).map(m => m.user_id)
  const safeMemberIds = companyUserIds.length > 0 ? companyUserIds : ["00000000-0000-0000-0000-000000000000"]

  // Párhuzamos adatlekérések a szervezeti struktúrához
  const [orgUnitsRes, dbJobsRes, employeesRes, allUsersRes] = await Promise.all([
    // 1. Szervezeti egységek
    supabase
      .from("hr_szervezeti_egyseg")
      .select("id, nev, szulo_id")
      .eq("company_id", companyScope)
      .order("nev"),

    // 2. Munkakörök
    supabase
      .from("hr_munkakor")
      .select(`
        *,
        hr_beosztas ( id, ervenyes_ig )
      `)
      .eq("company_id", companyScope)
      .order("created_at", { ascending: false }),

    // 3. Dolgozók a szervezeti fához (beosztásokkal és egység kapcsolatokkal)
    supabase
      .from("felhasznalo_profil")
      .select(`
        id,
        nev,
        hr_szerepkor,
        hr_szervezeti_egyseg_id,
        hr_dolgozo_adatlap (
          id,
          company_id,
          munkaviszony_vege,
          hr_jogviszony (
            id,
            hr_beosztas (
              id,
              hr_munkakor ( megnevezes )
            )
          )
        )
      `)
      .in("id", safeMemberIds),

    // 4. Munkakörök és egységek lekérdezés lezárása
    Promise.resolve([])
  ])

  const orgUnits = orgUnitsRes.data || []
  const dbJobs = dbJobsRes.data || []
  const employees = employeesRes.data || []

  // Szigorúan csak az aktív eaisyHR munkavállalók (nem tisztán Docs tagok)
  const hrEmployees = employees.filter(emp => {
    if (!emp.hr_dolgozo_adatlap) return false
    const adatlap = Array.isArray(emp.hr_dolgozo_adatlap) ? emp.hr_dolgozo_adatlap[0] : emp.hr_dolgozo_adatlap
    if (!adatlap) return false
    if (adatlap.company_id && adatlap.company_id !== companyScope) return false
    const isExited = emp.hr_szerepkor === "inaktiv" || (adatlap?.munkaviszony_vege && new Date(adatlap.munkaviszony_vege) <= new Date())
    return !isExited
  })

  // Szervezeti ábra adatstruktúra felépítése
  const dolgozokByUnit: Record<string, OrgDolgozo[]> = {}
  hrEmployees.forEach(emp => {
    const unitId = emp.hr_szervezeti_egyseg_id
    if (!unitId) return

    const adatlap = Array.isArray(emp.hr_dolgozo_adatlap) ? emp.hr_dolgozo_adatlap[0] : emp.hr_dolgozo_adatlap
    const jogviszony = Array.isArray(adatlap?.hr_jogviszony) ? adatlap.hr_jogviszony[0] : adatlap?.hr_jogviszony
    const beosztas = Array.isArray(jogviszony?.hr_beosztas) ? jogviszony.hr_beosztas[0] : jogviszony?.hr_beosztas
    const munkakor = Array.isArray(beosztas?.hr_munkakor) ? beosztas.hr_munkakor[0] : (beosztas?.hr_munkakor as any)
    const pozicio = munkakor?.megnevezes || "Nincs beállítva"

    if (!dolgozokByUnit[unitId]) dolgozokByUnit[unitId] = []
    dolgozokByUnit[unitId].push({
      id: emp.id,
      nev: emp.nev || "Névtelen",
      pozicio,
    })
  })

  const rootOrgUnits: OrgUnitNode[] = buildOrgTree(orgUnits, dolgozokByUnit)

  const resolvedParams = await searchParams
  const defaultTab = resolvedParams?.tab || "orgchart"

  return (
    <OrganizationTabsView
      rootOrgUnits={rootOrgUnits}
      orgUnits={orgUnits}
      dbJobs={dbJobs}
      allUsers={hrEmployees}
      defaultTab={defaultTab}
    />
  )
}
