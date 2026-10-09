import { getActiveCompanyIdServer, getActiveCompanyServer } from "@/utils/company-server"
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
  const activeCompany = await getActiveCompanyServer()

  // Lekérdezések párhuzamosan
  const [initialPromptRules, initialFilingRules, deptsRes, plansRes] = await Promise.all([
    getCompanyPromptRules(activeCompanyId || undefined),
    getCompanyFilingRules(activeCompanyId || undefined),
    supabase.from("szervezeti_egyseg").select("id, nev").order("nev"),
    supabase.from("irattari_terv").select("id, tetelszam, megnevezes").order("tetelszam"),
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
      />
    </div>
  )
}
