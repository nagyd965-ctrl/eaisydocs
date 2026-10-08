import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { getPermissions } from "@/utils/permissions"
import { PartnersTableClient } from "./partners-table-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PartnersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  let docs_szerepkor = ""
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()
  docs_szerepkor = profile?.docs_szerepkor || ""
  const permissions = getPermissions(docs_szerepkor)

  // 1. Partnerek lekérése a kapcsolattartókkal együtt az aktív céghez
  const { data: realPartners } = await supabase
    .from("partner")
    .select(`
      *,
      kapcsolattartok:partner_kapcsolattarto(id, nev, email, telefonszam, elsodleges)
    `)
    .eq("company_id", companyScope)
    .order("nev")

  // 2. Iratforgalom darabszámok partnerek szerint az aktív cégben
  const { data: iratok } = await supabase
    .from("irat")
    .select("kuldo_partner_id")
    .eq("company_id", companyScope)
    .not("kuldo_partner_id", "is", null)

  const docCountMap: Record<string, number> = {}
  for (const ir of iratok || []) {
    if (ir.kuldo_partner_id) {
      docCountMap[ir.kuldo_partner_id] = (docCountMap[ir.kuldo_partner_id] || 0) + 1
    }
  }

  // Partnerek dúsítása az iratszámlálóval és elsődleges kapcsolattartóval
  const enrichedPartners = (realPartners || []).map((p: any) => {
    const primaryContact = p.kapcsolattartok?.find((c: any) => c.elsodleges) || p.kapcsolattartok?.[0]
    return {
      ...p,
      irat_darabszam: docCountMap[p.id] || 0,
      elsodleges_kapcsolattarto: primaryContact ? {
        nev: primaryContact.nev,
        email: primaryContact.email,
        telefonszam: primaryContact.telefonszam,
      } : null,
    }
  })

  return (
    <div className="page-animate space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partnerek</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          A rendszerben rögzített partnerek, ügyfelek és hivatalok törzsadatai és forgalma.
        </p>
      </div>

      <PartnersTableClient
        key={companyScope}
        initialPartners={enrichedPartners}
        canEdit={permissions.canEdit}
      />
    </div>
  )
}
