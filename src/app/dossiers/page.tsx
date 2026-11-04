import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isStealthSuperadmin, STEALTH_SUPERADMIN_ID } from "@/utils/stealth-superadmin"
import { getPermissions } from "@/utils/permissions"
import { DossiersTableClient } from "./dossiers-table-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DossiersPage() {
  const supabase = await createClient()

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"
  const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const query = supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      iktatas_datuma,
      megorzesi_ido_vege,
      szervezeti_egyseg_id,
      ugy!inner ( id, targy, hatarido, statusz, felelos_user_id ),
      irat (
        id,
        targy,
        minosites,
        irat_fajl (
          id,
          storage_path,
          eredeti_fajlnev,
          mime_type,
          pdfa_path,
          meret_byte,
          sha256
        )
      )
    `)
    .eq("company_id", companyScope)
    .order("iktatas_datuma", { ascending: false })
    .limit(200)

  const { data: rawDossiers } = await query
  const dossiers = rawDossiers || []

  // Current user role check (cég-hatókörrel)
  const { data: authUser } = await supabase.auth.getUser()
  const { data: rawCurrentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, szervezeti_egyseg_id")
    .eq("id", authUser?.user?.id || "")
    .single()

  const effectiveDocsRole =
    scopedRoles.isMember && scopedRoles.docsRole && scopedRoles.docsRole !== "none"
      ? scopedRoles.docsRole
      : rawCurrentUserProfile?.docs_szerepkor || "munkavallalo"
  const permissions = getPermissions(
    effectiveDocsRole,
    scopedRoles.docsModules,
    scopedRoles.docsWriteModules,
    "dossiers"
  )
  const canAssign = permissions.canAssign
  const displayDocsRole = permissions.canEdit ? effectiveDocsRole : "betekinto"
  const currentUserProfile = rawCurrentUserProfile
    ? { ...rawCurrentUserProfile, docs_szerepkor: displayDocsRole }
    : { docs_szerepkor: displayDocsRole, szervezeti_egyseg_id: null }

  // Felhasználók: CSAK az aktív cég tagjai (cég-tagság ellenőrzéssel, rejtett rendszerfiók nélkül)
  let memberUserIds: string[] | null = null
  const memberDocsRolesMap = new Map<string, string>()
  if (companyScope) {
    const { data: companyMembers } = await supabase
      .from("company_members")
      .select("user_id, role, docs_szerepkor")
      .eq("company_id", companyScope)
    memberUserIds = (companyMembers || [])
      .map((m: any) => m.user_id)
      .filter((id: string) => id !== STEALTH_SUPERADMIN_ID)
    for (const m of companyMembers || []) {
      if (m.docs_szerepkor) {
        memberDocsRolesMap.set(m.user_id, m.docs_szerepkor)
      } else if (m.role === "owner" || m.role === "admin") {
        memberDocsRolesMap.set(m.user_id, "admin")
      }
    }
  }

  let usersQuery = supabase
    .from("felhasznalo_profil")
    .select("id, nev, docs_szerepkor, szervezeti_egyseg_id")
    .contains("elerheto_modulok", ["docs"])
  if (memberUserIds) {
    usersQuery = usersQuery.in(
      "id",
      memberUserIds.length > 0 ? memberUserIds : ["00000000-0000-0000-0000-000000000000"]
    )
  }
  const { data: rawUsers } = await usersQuery
  const users = (rawUsers || [])
    .filter((u: any) => !isStealthSuperadmin(u))
    .map((u: any) => ({
      ...u,
      docs_szerepkor: memberDocsRolesMap.get(u.id) || u.docs_szerepkor || "munkavallalo",
    }))

  const { data: depts } = await supabase
    .from("szervezeti_egyseg")
    .select("id, nev")
    .eq("company_id", companyScope)

  const userMap = (users || []).reduce((acc: any, user: any) => {
    acc[user.id] = user.nev
    return acc
  }, {})

  const deptMap = (depts || []).reduce((acc: any, dept: any) => {
    acc[dept.id] = dept.nev
    return acc
  }, {})

  // Map dossiers to include user name and department name
  const mappedDossiers = (dossiers || []).map((d: any) => {
    const ugy = d.ugy as any
    if (ugy && ugy.felelos_user_id) {
      ugy.felelos_user = {
        id: ugy.felelos_user_id,
        full_name: userMap[ugy.felelos_user_id],
      }
    }
    if (d.szervezeti_egyseg_id) {
      d.szervezeti_egyseg = {
        nev: deptMap[d.szervezeti_egyseg_id] || "Egyéb",
      }
    }
    return d
  })

  return (
    <div className="page-animate space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Iktatókönyv</h1>
        <p className="text-muted-foreground">Az összes iktatott ügyirat nyilvántartása.</p>
      </div>

      <DossiersTableClient
        key={companyScope}
        initialDossiers={mappedDossiers}
        users={users || []}
        currentUserProfile={currentUserProfile}
        canAssign={canAssign}
      />
    </div>
  )
}
