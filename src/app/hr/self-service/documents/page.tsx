import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { EmployeeDocumentsView, HrDocument } from "@/components/hr/employee-documents-view"

export default async function EmployeeDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Lekérjük a bejelentkezett dolgozó összes hivatalos dokumentumát
  const { data: documents, error } = await supabase
    .from("hr_dokumentum")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Hiba a dolgozói dokumentumok lekérésekor:", error)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Fejléc */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dokumentumaim</h1>
        <p className="text-muted-foreground mt-1">
          Hivatalos munkaviszony-iratok, szerződések, jegyzőkönyvek és hatósági igazolások.
        </p>
      </div>

      {/* Részletes dokumentum lista szűrőkkel és előnézettel */}
      <EmployeeDocumentsView documents={(documents as HrDocument[]) || []} />
    </div>
  )
}
