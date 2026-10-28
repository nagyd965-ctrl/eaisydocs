import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { buildOrgTree, type OrgDolgozo, type OrgUnitNode } from "@/lib/org-chart-utils"
import { OrganizationTabsView } from "@/components/hr/organization-tabs-view"
import { normalizeHrRoleAndModules } from "@/utils/hr/company-role-resolver"
import { type PermissionMatrixEmployee } from "@/components/hr/permissions-matrix-view"

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
  const hrModules = scopedRoles.hrModules || []
  const isStrictAdmin = hrRole === "admin"
  const isAuthorizedForOrg = isStrictAdmin || hrModules.includes("organization")

  if (!isAuthorizedForOrg) {
    redirect("/hr/self-service/profile")
  }

  // Aktív cég tagjainak azonosítói és szerepkörei
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: companyData }, { data: companyMembers }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("id", companyScope).maybeSingle(),
    supabaseAdmin
      .from("company_members")
      .select("user_id, role, hr_szerepkor, hr_modulok")
      .eq("company_id", companyScope),
  ])

  const companyName = companyData?.name || "Aktív Vállalat"
  const companyUserIds = (companyMembers || []).map(m => m.user_id)
  const safeMemberIds = companyUserIds.length > 0 ? companyUserIds : ["00000000-0000-0000-0000-000000000000"]

  // Párhuzamos adatlekérések a szervezeti struktúrához
  const [orgUnitsRes, dbJobsRes, employeesRes] = await Promise.all([
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

    // 3. Dolgozók a szervezeti fához és (ha admin) a jogosultságkezelő mátrixhoz
    supabaseAdmin
      .from("felhasznalo_profil")
      .select(`
        id,
        nev,
        avatar_url,
        hr_szerepkor,
        hr_modulok,
        hr_szervezeti_egyseg_id,
        hr_szervezeti_egyseg ( id, nev ),
        hr_dolgozo_adatlap (
          id,
          company_id,
          munkaviszony_vege,
          hr_jogviszony (
            id,
            kilepes_datuma,
            hr_beosztas (
              id,
              hr_munkakor ( id, megnevezes )
            )
          )
        )
      `)
      .in("id", safeMemberIds)
      .order("nev", { ascending: true }),
  ])

  const orgUnits = orgUnitsRes.data || []
  const dbJobs = dbJobsRes.data || []
  const employees = employeesRes.data || []

  // Szigorúan csak az aktív eaisyHR munkavállalók (nem tisztán Docs tagok)
  const hrEmployees = employees.filter((emp: any) => {
    if (!emp.hr_dolgozo_adatlap) return false
    const adatlap = Array.isArray(emp.hr_dolgozo_adatlap) ? emp.hr_dolgozo_adatlap[0] : emp.hr_dolgozo_adatlap
    if (!adatlap) return false
    if (adatlap.company_id && adatlap.company_id !== companyScope) return false
    const isExited = emp.hr_szerepkor === "inaktiv" || (adatlap?.munkaviszony_vege && new Date(adatlap.munkaviszony_vege) <= new Date())
    return !isExited
  })

  // Szervezeti ábra adatstruktúra felépítése
  const dolgozokByUnit: Record<string, OrgDolgozo[]> = {}
  hrEmployees.forEach((emp: any) => {
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

  // Jogosultságkezelő Mátrix adatok KIZÁRÓLAG Admin számára (nem-adminnak üres tömb, nem megy le a kliensre)
  let permissionEmployees: PermissionMatrixEmployee[] = []
  if (isStrictAdmin) {
    const memberMap = new Map<
      string,
      { role?: string | null; hr_szerepkor?: string | null; hr_modulok?: string[] | null }
    >()
    for (const m of companyMembers || []) {
      memberMap.set(m.user_id, m)
    }

    permissionEmployees = hrEmployees.map((p: any) => {
      const m = memberMap.get(p.id)
      const rawRole =
        m?.hr_szerepkor && m.hr_szerepkor.trim() !== ""
          ? m.hr_szerepkor
          : m?.role === "admin" || m?.role === "owner"
          ? "admin"
          : p.hr_szerepkor || "munkavallalo"

      const rawModules =
        m?.hr_modulok && m.hr_modulok.length > 0
          ? m.hr_modulok
          : p.hr_modulok || []

      const normalized = normalizeHrRoleAndModules(rawRole, rawModules)

      const egyseg = Array.isArray(p.hr_szervezeti_egyseg)
        ? p.hr_szervezeti_egyseg[0]?.nev
        : p.hr_szervezeti_egyseg?.nev

      const adatlap = Array.isArray(p.hr_dolgozo_adatlap)
        ? p.hr_dolgozo_adatlap[0]
        : p.hr_dolgozo_adatlap
      const jogviszony = adatlap?.hr_jogviszony?.[0]
      const beosztas = jogviszony?.hr_beosztas?.[0]
      const munkakor = beosztas?.hr_munkakor?.megnevezes || "Nincs munkakör beállítva"

      return {
        id: p.id,
        nev: p.nev || "Névtelen munkatárs",
        avatar_url: p.avatar_url || null,
        munkakor,
        szervezeti_egyseg: egyseg || "Nincs besorolva",
        hrRole: normalized.role,
        hrModules: normalized.modules,
      }
    })
  }

  const resolvedParams = await searchParams
  const requestedTab = resolvedParams?.tab || "orgchart"
  // Ha nem admin próbálná URL-ből a permissions fület nyitni, visszaállítjuk orgchart-ra
  const defaultTab = !isStrictAdmin && requestedTab === "permissions" ? "orgchart" : requestedTab

  return (
    <OrganizationTabsView
      rootOrgUnits={rootOrgUnits}
      orgUnits={orgUnits}
      dbJobs={dbJobs}
      allUsers={hrEmployees}
      defaultTab={defaultTab}
      isAdmin={isStrictAdmin}
      permissionEmployees={permissionEmployees}
      companyName={companyName}
    />
  )
}
