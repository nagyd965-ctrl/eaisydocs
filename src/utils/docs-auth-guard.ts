import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyMemberRolesServer } from "@/utils/company-server"

export interface DocsAuthGuardResult {
  authorized: boolean
  user: any | null
  activeCompanyId: string | null
  docsRole: string
  isCompanyAdmin: boolean
  isMember: boolean
  nev: string | null
  szervezetiEgysegId: string | null
  maxMinosites: string
  error?: string
}

/**
 * Szerver-oldali eaisyDocs jogosultság- és cég-hatókör ellenőrző segédfüggvény.
 * A szerepkört elsődlegesen a `company_members.docs_szerepkor` / `company_members.role`
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
      .select("nev, docs_szerepkor, szerepkor, szervezeti_egyseg_id, max_minosites")
      .eq("id", user.id)
      .maybeSingle(),
    getActiveCompanyMemberRolesServer(targetCompanyId),
  ])

  const effectiveDocsRole =
    companyRoles.isMember && companyRoles.docsRole && companyRoles.docsRole !== "none"
      ? companyRoles.docsRole
      : companyRoles.isCompanyAdmin
      ? "admin"
      : profile?.docs_szerepkor || profile?.szerepkor || "ugyintezo"

  // Ha explicit targetCompanyId-t adtak meg, és a felhasználó nem tagja annak a cégnek:
  if (targetCompanyId && !companyRoles.isMember) {
    return {
      authorized: false,
      user,
      activeCompanyId: companyRoles.companyId,
      docsRole: "none",
      isCompanyAdmin: false,
      isMember: false,
      nev: profile?.nev || null,
      szervezetiEgysegId: profile?.szervezeti_egyseg_id || null,
      maxMinosites: profile?.max_minosites || "nyilt",
      error: "Nincs hozzáférésed a kiválasztott vállalathoz.",
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedRole =
      effectiveDocsRole === "rendszergazda" ? "admin" : effectiveDocsRole
    const isAllowed =
      allowedRoles.includes(effectiveDocsRole) ||
      allowedRoles.includes(normalizedRole) ||
      (companyRoles.isCompanyAdmin && allowedRoles.includes("admin"))

    if (!isAllowed) {
      return {
        authorized: false,
        user,
        activeCompanyId: companyRoles.companyId,
        docsRole: effectiveDocsRole,
        isCompanyAdmin: companyRoles.isCompanyAdmin,
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
    isCompanyAdmin: companyRoles.isCompanyAdmin,
    isMember: companyRoles.isMember,
    nev: profile?.nev || null,
    szervezetiEgysegId: profile?.szervezeti_egyseg_id || null,
    maxMinosites: profile?.max_minosites || "nyilt",
  }
}
