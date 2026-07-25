import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { NavT1041Generator } from "@/components/hr/nav-t1041-generator"
import { KshReportGenerator } from "@/components/hr/ksh-report-generator"

export default async function CompliancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Ehhez a modulhoz HR jogosultság szükséges.</p>
        </div>
      </div>
    )
  }

  // Lekérjük a dolgozókat a jelentésekhez
  const { data: employees } = await supabase
    .from("hr_dolgozo_adatlap")
    .select(`
      id,
      taj_szam,
      adoazonosito_jel,
      belepes_datuma,
      munkaido_fte,
      hr_munkakor ( megnevezes, feor ),
      felhasznalo_profil ( nev )
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight">Hatósági Adatszolgáltatás</h1>
        <p className="text-muted-foreground mt-1">
          Törvényi kötelezettségek, NAV bejelentések és KSH statisztikák kezelése.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* NAV T1041 Generátor */}
        <section>
          <NavT1041Generator employees={employees || []} />
        </section>

        {/* KSH Munkaügyi Jelentés */}
        <section className="print:hidden">
          <KshReportGenerator employees={employees || []} />
        </section>
      </div>
    </div>
  )
}
