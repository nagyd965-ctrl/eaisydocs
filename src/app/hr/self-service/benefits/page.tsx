import { createClient } from "@/utils/supabase/server"
import { CafeteriaDeclaration } from "@/components/hr/cafeteria-declaration"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Coffee } from "lucide-react"
import { redirect } from "next/navigation"

export default async function SelfServiceBenefitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const currentYear = new Date().getFullYear()
  
  const { data: cafeteriaKeret } = await supabase
    .from("hr_cafeteria_keret")
    .select("*")
    .eq("dolgozo_id", user.id)
    .eq("ev", currentYear)
    .single()

  const { data: cafeteriaKatalogus } = await supabase
    .from("hr_cafeteria_katalogus")
    .select("*")
    .eq("aktiv", true)
    .order("nev")

  const { data: cafeteriaValasztasok } = await supabase
    .from("hr_cafeteria_valasztas")
    .select("*")
    .eq("dolgozo_id", user.id)
    .eq("ev", currentYear)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Juttatások</h1>
          <p className="text-muted-foreground mt-1">
            Cafeteria keretek és nyilatkozatok kezelése.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 max-w-4xl">
        {cafeteriaKeret ? (
          <CafeteriaDeclaration 
            employeeId={user.id}
            year={currentYear}
            budget={cafeteriaKeret.osszeg}
            isClosed={cafeteriaKeret.nyilatkozat_lezarva}
            catalog={cafeteriaKatalogus || []}
            existingChoices={cafeteriaValasztasok || []}
          />
        ) : (
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-primary" /> Cafeteria Nyilatkozat
              </CardTitle>
              <CardDescription>Jelenleg nincs beállítva cafeteria kereted erre az évre.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
