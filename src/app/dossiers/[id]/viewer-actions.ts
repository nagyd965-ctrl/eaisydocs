"use server"

import { createClient } from "@/utils/supabase/server"

export async function getDocumentSignedUrl(filePath: string, iratId: string, fileId?: string, isPdfa?: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // Check user clearance
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, hr_szerepkor, hr_modulok, max_minosites")
    .eq("id", user.id)
    .single()

  const { data: irat } = await supabase
    .from("irat")
    .select("minosites, company_id")
    .eq("id", iratId)
    .single()

  if (!irat) {
    return { error: "A megtekinteni kívánt irat nem található vagy nincs hozzáférése." }
  }

  const { getActiveCompanyMemberRolesServer } = await import("@/utils/company-server")
  const iratCompanyRoles = await getActiveCompanyMemberRolesServer(irat.company_id || null)
  const isDocsCompanyAdmin =
    iratCompanyRoles.isCompanyAdmin ||
    iratCompanyRoles.docsRole === "admin" ||
    iratCompanyRoles.docsRole === "rendszergazda"

  const minositesHierarchy: Record<string, number> = {
    nyilt: 1,
    belso: 2,
    bizalmas: 3,
    szigoruan_bizalmas: 4
  }
  const userLevel = minositesHierarchy[profile?.max_minosites || 'nyilt'] || 1
  const docLevel = minositesHierarchy[irat?.minosites || 'nyilt'] || 1

  if (!isDocsCompanyAdmin && userLevel < docLevel) {
    // Ellenőrizzük, hogy HR dokumentumról van-e szó (saját irat vagy jogosult HR/cég-admin)
    const { data: hrDoc } = await supabase
      .from("hr_dokumentum")
      .select("id, dolgozo_id, company_id")
      .eq("irat_id", iratId)
      .limit(1)
      .maybeSingle()

    let hasHrAccess = false
    if (hrDoc) {
      if (hrDoc.dolgozo_id === user.id) {
        hasHrAccess = true
      } else {
        const { isUserAuthorizedForHrView, normalizeHrRoleAndModules } = await import("@/utils/hr/company-role-resolver")
        const targetCompanyId = hrDoc.company_id || irat?.company_id || null
        const companyRoles =
          targetCompanyId === (irat.company_id || null)
            ? iratCompanyRoles
            : await getActiveCompanyMemberRolesServer(targetCompanyId)
        const fallbackNormalized = normalizeHrRoleAndModules(
          profile?.hr_szerepkor,
          Array.isArray(profile?.hr_modulok) ? profile.hr_modulok : []
        )
        const effectiveHrRole =
          companyRoles.hrRole && companyRoles.hrRole !== "none"
            ? companyRoles.hrRole
            : fallbackNormalized.role
        const effectiveHrModules =
          companyRoles.hrModules && companyRoles.hrModules.length > 0
            ? companyRoles.hrModules
            : fallbackNormalized.modules

        if (
          companyRoles.isCompanyAdmin ||
          companyRoles.docsRole === "admin" ||
          effectiveHrRole === "admin" ||
          effectiveHrRole === "rendszergazda" ||
          isUserAuthorizedForHrView(
            effectiveHrRole,
            ["employees", "compliance", "payroll", "onboarding", "offboarding", "auditor", "admin"],
            effectiveHrModules
          )
        ) {
          hasHrAccess = true
        }
      }
    }

    if (!hasHrAccess) {
      return { 
        error: `Hozzáférés megtagadva: A dokumentum megtekintéséhez legalább '${irat?.minosites || 'bizalmas'}' biztonsági minősítés szükséges (Az Ön szintje: ${profile?.max_minosites || 'nyilt'}).` 
      }
    }
  }

  // Log the viewing action directly to the esemeny_naplo
  // since viewing doesn't update the record, we do it manually.
  const { getClientInfo } = await import("@/utils/client-info")
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "irat",
    entitas_id: iratId,
    esemeny_tipus: "megtekintve",
    user_id: user.id,
    company_id: irat?.company_id || null,
    uj_ertek: { fajl: filePath, isPdfa: !!isPdfa, akcio: "megtekintes_biztonsagos_api_vegponton" },
    ip_cim: ip,
    user_agent: userAgent
  })

  // Return our secure internal API route with specific fileId & pdfa parameter
  const params = new URLSearchParams()
  if (fileId) params.set("fileId", fileId)
  if (isPdfa) params.set("pdfa", "true")
  const queryStr = params.toString()
  const url = queryStr ? `/api/pdf/${iratId}?${queryStr}` : `/api/pdf/${iratId}`
  return { signedUrl: url }
}
