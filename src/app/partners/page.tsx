import { createClient } from "@/utils/supabase/server"
import { getPermissions } from "@/utils/permissions"
import { PartnersTableClient } from "./partners-table-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PartnersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let docs_szerepkor = ""
  if (user) {
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("docs_szerepkor")
      .eq("id", user.id)
      .single()
    docs_szerepkor = profile?.docs_szerepkor || ""
  }
  const permissions = getPermissions(docs_szerepkor)

  // Partnerek lekérése
  const { data: realPartners } = await supabase.from("partner").select("*").order("nev")

  return (
    <div className="page-animate space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partnerek</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          A rendszerben rögzített partnerek és ügyfelek listája.
        </p>
      </div>

      <PartnersTableClient
        initialPartners={(realPartners as any) || []}
        canEdit={permissions.canEdit}
      />
    </div>
  )
}
