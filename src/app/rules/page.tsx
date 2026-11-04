import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer, getActiveCompanyServer } from "@/utils/company-server"
import { hasDocsModuleAccess, hasDocsWriteAccess } from "@/utils/hr/company-role-resolver"
import { getCompanyPromptRules } from "./rules-actions"
import { getCompanyFilingRules } from "./filing-rules-actions"
import { RulesClient } from "./rules-client"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Iktatási és Könyvelési Szabályok | eaisyDocs",
  description: "Cég-specifikus egyedi iktatási szabályok és AI prompt könyvtár",
}

export default async function RulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const canReadRules =
    scopedRoles.isCompanyAdmin ||
    hasDocsModuleAccess(scopedRoles.docsRole, scopedRoles.docsModules, "rules")
  const canEditRules =
    scopedRoles.isCompanyAdmin ||
    hasDocsWriteAccess(scopedRoles.docsRole, scopedRoles.docsModules, scopedRoles.docsWriteModules, "rules")

  if (!canReadRules) {
    return (
      <div className="flex-1 p-8 pt-6">
        <h2 className="text-2xl font-semibold tracking-tight">Szabályok</h2>
        <p className="text-muted-foreground mt-2">
          A Szabályok megtekintése csak engedélyezett Szabályok modullal vagy adminisztrátori szerepkörrel érhető el.
        </p>
      </div>
    )
  }

  const activeCompany = await getActiveCompanyServer()

  let deptQuery = supabase.from("szervezeti_egyseg").select("id, nev").order("nev")
  let planQuery = supabase.from("irattari_terv").select("id, tetelszam, megnevezes").order("tetelszam")
  if (activeCompanyId) {
    deptQuery = deptQuery.eq("company_id", activeCompanyId)
    planQuery = planQuery.eq("company_id", activeCompanyId)
  }

  // Lekérdezések párhuzamosan
  const [initialPromptRules, initialFilingRules, deptsRes, plansRes] = await Promise.all([
    getCompanyPromptRules(activeCompanyId || undefined),
    getCompanyFilingRules(activeCompanyId || undefined),
    deptQuery,
    planQuery,
  ])

  const companyScope = activeCompanyId || "default"

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <RulesClient
        key={companyScope}
        initialPromptRules={initialPromptRules}
        initialFilingRules={initialFilingRules}
        departments={deptsRes.data || []}
        irattariTervek={plansRes.data || []}
        activeCompany={activeCompany}
        canEdit={canEditRules}
      />
    </div>
  )
}
