import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarIcon } from "lucide-react"
import { TeamCalendar } from "@/components/hr/team-calendar"

export default async function TimeAndAttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // Biztonsági ellenőrzés
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
          <p className="text-muted-foreground">Csak HR munkatársak férhetnek hozzá a globális naptárhoz.</p>
        </div>
      </div>
    )
  }

  // 1. Összes (Folyamatban/Jóváhagyott/stb) kérelem lekérése a teljes cégre
  const { data: allLeaves } = await supabase
    .from("hr_tavollet")
    .select("*")
    .neq("statusz", "elutasitva")
    .order("kezdet_datuma", { ascending: true })

  // 2. Teljes cég dolgozóinak lekérése
  // Nincs RLS korlátozás (a HR lát mindenkit)
  const { data: allEmployees } = await supabase
    .from("hr_dolgozo_adatlap")
    .select(`
      id, 
      felhasznalo_profil!inner(nev), 
      hr_munkakor(megnevezes)
    `)
    .order("created_at", { ascending: true })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-primary" /> Naptár & Távollét
        </h1>
        <p className="text-muted-foreground">Központi naptár a szabadságok, táppénzek és csapat szintű távollétek nyomon követésére.</p>
      </div>

      <TeamCalendar teamMembers={allEmployees || []} leaves={allLeaves || []} />
    </div>
  )
}
