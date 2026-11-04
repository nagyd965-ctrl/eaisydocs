import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import {
  ALL_DOCS_MODULES,
  isUserAuthorizedForDocsView,
  normalizeDocsRoleAndModules,
  type DocsModuleKey,
} from "@/utils/hr/company-role-resolver"

export interface DocsAuthGuardResult {
  authorized: boolean
  user: any | null
  activeCompanyId: string | null
  docsRole: string
  docsModules: DocsModuleKey[]
  docsWriteModules: DocsModuleKey[]
  isCompanyAdmin: boolean
  isMember: boolean
  nev: string | null
  szervezetiEgysegId: string | null
  maxMinosites: string
  error?: string
}

/**
 * Szerver-oldali eaisyDocs jogosultság- és cég-hatókör ellenőrző segédfüggvény.
 * A szerepkört és modul-engedélyeket elsődlegesen a `company_members.docs_szerepkor` / `docs_modulok` / `docs_iras_modulok`
 * alapján oldja fel az aktív vagy célvállalat kontextusában, megakadályozva, hogy
 * egy másik cégben szerzett globális `felhasznalo_profil.docs_szerepkor = 'admin'`
 * jogosultság átszivárogjon egy olyan cégbe, ahol a felhasználó csak sima tag.
 */
export async function requireDocsAuthServer(
  allowedRoles?: string[],
  targetCompanyId?: string | null
): Promise<DocsAuthGuardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      authorized: false,
      user: null,
      activeCompanyId: null,
      docsRole: "none",
      docsModules: [],
      docsWriteModules: [],
      isCompanyAdmin: false,
      isMember: false,
      nev: null,
      szervezetiEgysegId: null,
      maxMinosites: "nyilt",
      error: "Nincs bejelentkezve.",
    }
  }

  const [{ data: profile }, companyRoles] = await Promise.all([
    supabase
      .from("felhasznalo_profil")
      .select("nev, docs_szerepkor, docs_modulok, docs_iras_modulok, szerepkor, szervezeti_egyseg_id, max_minosites, elerheto_modulok")
      .eq("id", user.id)
      .maybeSingle(),
    getActiveCompanyMemberRolesServer(targetCompanyId),
  ])

  const hasDocsModule = Array.isArray((profile as any)?.elerheto_modulok)
    ? (profile as any).elerheto_modulok.includes("docs")
    : true

  if (!hasDocsModule) {
    return {
      authorized: false,
      user,
      activeCompanyId: companyRoles.companyId,
      docsRole: "none",
      docsModules: [],
      docsWriteModules: [],
      isCompanyAdmin: false,
      isMember: companyRoles.isMember,
      nev: profile?.nev || null,
      szervezetiEgysegId: profile?.szervezeti_egyseg_id || null,
      maxMinosites: profile?.max_minosites || "nyilt",
      error: "Nincs hozzáférésed az eaisyDocs modulhoz.",
    }
  }

  const fallbackNormalized = normalizeDocsRoleAndModules(
    profile?.docs_szerepkor || profile?.szerepkor || "munkavallalo",
    (profile as any)?.docs_modulok,
    (profile as any)?.docs_iras_modulok
  )

  const effectiveDocsRole =
    companyRoles.isMember && companyRoles.docsRole && companyRoles.docsRole !== "none"
      ? companyRoles.docsRole
      : companyRoles.isCompanyAdmin
      ? "admin"
      : fallbackNormalized.role

  const effectiveDocsModules: DocsModuleKey[] =
    companyRoles.isMember && companyRoles.docsModules && companyRoles.docsModules.length > 0
      ? companyRoles.docsModules
      : companyRoles.isCompanyAdmin
      ? normalizeDocsRoleAndModules("admin").modules
      : fallbackNormalized.modules

  const effectiveDocsWriteModules: DocsModuleKey[] =
    companyRoles.isMember
      ? companyRoles.docsWriteModules
      : companyRoles.isCompanyAdmin
      ? normalizeDocsRoleAndModules("admin").writeModules
      : fallbackNormalized.writeModules

  const isDocsAdmin =
    effectiveDocsRole === "admin" ||
    effectiveDocsRole === "rendszergazda"

  // Ha explicit targetCompanyId-t adtak meg, és a felhasználó nem tagja annak a cégnek:
  if (targetCompanyId && !companyRoles.isMember) {
    return {
      authorized: false,
      user,
      activeCompanyId: companyRoles.companyId,
      docsRole: "none",
      docsModules: [],
      docsWriteModules: [],
      isCompanyAdmin: false,
      isMember: false,
      nev: profile?.nev || null,
      szervezetiEgysegId: profile?.szervezeti_egyseg_id || null,
      maxMinosites: profile?.max_minosites || "nyilt",
      error: "Nincs hozzáférésed a kiválasztott vállalathoz.",
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isReadOrAuditCheck =
      allowedRoles.includes("betekinto") ||
      allowedRoles.includes("auditor") ||
      allowedRoles.includes("audit")

    const isAdminUser = isDocsAdmin

    if (!isReadOrAuditCheck && !isAdminUser) {
      if (effectiveDocsWriteModules.length === 0) {
        return {
          authorized: false,
          user,
          activeCompanyId: companyRoles.companyId,
          docsRole: effectiveDocsRole,
          docsModules: effectiveDocsModules,
          docsWriteModules: effectiveDocsWriteModules,
          isCompanyAdmin: isDocsAdmin,
          isMember: companyRoles.isMember,
          nev: profile?.nev || null,
          szervezetiEgysegId: profile?.szervezeti_egyseg_id || null,
          maxMinosites: profile?.max_minosites || "nyilt",
          error: "Nincs írási jogosultságod a művelet végrehajtásához (csak olvasási joggal rendelkezel).",
        }
      }

      const explicitModuleKeys = allowedRoles.filter((r): r is DocsModuleKey =>
        (ALL_DOCS_MODULES as readonly string[]).includes(r)
      )
      if (
        explicitModuleKeys.length > 0 &&
        !explicitModuleKeys.some((k) => effectiveDocsWriteModules.includes(k))
      ) {
        return {
          authorized: false,
          user,
          activeCompanyId: companyRoles.companyId,
          docsRole: effectiveDocsRole,
          docsModules: effectiveDocsModules,
          docsWriteModules: effectiveDocsWriteModules,
          isCompanyAdmin: isDocsAdmin,
          isMember: companyRoles.isMember,
          nev: profile?.nev || null,
          szervezetiEgysegId: profile?.szervezeti_egyseg_id || null,
          maxMinosites: profile?.max_minosites || "nyilt",
          error: "Nincs írási jogosultságod ehhez a modulhoz.",
        }
      }
    }

    const modulesToCheck = isReadOrAuditCheck ? effectiveDocsModules : effectiveDocsWriteModules
    const isAllowed =
      isUserAuthorizedForDocsView(effectiveDocsRole, allowedRoles, modulesToCheck) ||
      (isDocsAdmin && allowedRoles.includes("admin"))

    if (!isAllowed) {
      return {
        authorized: false,
        user,
        activeCompanyId: companyRoles.companyId,
        docsRole: effectiveDocsRole,
        docsModules: effectiveDocsModules,
        docsWriteModules: effectiveDocsWriteModules,
        isCompanyAdmin: isDocsAdmin,
        isMember: companyRoles.isMember,
        nev: profile?.nev || null,
        szervezetiEgysegId: profile?.szervezeti_egyseg_id || null,
        maxMinosites: profile?.max_minosites || "nyilt",
        error: "Nincs megfelelő jogosultságod a művelet végrehajtásához az aktív vállalatban.",
      }
    }
  }

  return {
    authorized: true,
    user,
    activeCompanyId: companyRoles.companyId,
    docsRole: effectiveDocsRole,
    docsModules: effectiveDocsModules,
    docsWriteModules: effectiveDocsWriteModules,
    isCompanyAdmin: isDocsAdmin,
    isMember: companyRoles.isMember,
    nev: profile?.nev || null,
    szervezetiEgysegId: profile?.szervezeti_egyseg_id || null,
    maxMinosites: profile?.max_minosites || "nyilt",
  }
}
