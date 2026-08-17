import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { EmployeeIdpView } from "@/components/hr/idp/employee-idp-view"
import { TrendingUp } from "lucide-react"

export default async function SelfServiceIdpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: tervek } = await supabase
    .from("hr_fejlesztesi_terv")
    .select(`
      *,
      celok:hr_fejlesztesi_cel(
        *,
        megjegyzesek:hr_idp_megjegyzes(*, iro:felhasznalo_profil(nev))
      )
    `)
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fejlődési Tervem</h1>
        <p className="text-muted-foreground mt-1">
          Egyéni fejlesztési céljaid, képzési terveid és kompetenciafejlesztési feladataid.
        </p>
      </div>

      {(!tervek || tervek.length === 0) ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-xl py-16 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Nincs aktív fejlesztési terved</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            A HR vagy a vezetőd fog fejlesztési célokat hozzárendelni hozzád. Addig türelmet kérünk!
          </p>
        </div>
      ) : (
        <EmployeeIdpView tervek={tervek as any} />
      )}
    </div>
  )
}
