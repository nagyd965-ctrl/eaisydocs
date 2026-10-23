import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { EmployeeIdpView } from "@/components/hr/idp/employee-idp-view"
import { getDevelopmentPlansByEmployee } from "@/app/hr/actions/idp-actions"

export default async function SelfServiceIdpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const tervek = await getDevelopmentPlansByEmployee(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fejlődési Tervem</h1>
        <p className="text-muted-foreground mt-1">
          Egyéni fejlesztési céljaid, képzési terveid, kompetenciafejlesztési feladataid és igazolásaid.
        </p>
      </div>

      {(!tervek || tervek.length === 0) ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-xl py-16 text-center gap-2">
          <h3 className="font-semibold text-base">Nincs aktív fejlesztési terved</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            A HR vagy a közvetlen vezetőd még nem rendelt hozzád fejlesztési tervet vagy képzési célt. Amint új célt kapsz, itt fogod látni a feladatokat és feltöltheted az elvégzést igazoló tanúsítványokat.
          </p>
        </div>
      ) : (
        <EmployeeIdpView tervek={tervek as any} />
      )}
    </div>
  )
}

