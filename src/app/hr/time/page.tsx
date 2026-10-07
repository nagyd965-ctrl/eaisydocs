import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
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
  const { data: rawEmployees } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      dolgozo_id,
      kilepes_datuma,
      created_at,
      hr_dolgozo_adatlap (
        id,
        felhasznalo_profil ( nev )
      ),
      hr_beosztas (
        hr_munkakor ( megnevezes )
      )
    `)
    .order("created_at", { ascending: false })

  // Format to match what TeamCalendar expects, deduplicating by dolgozo_id
  const employeeMap = new Map<string, any>()
  for (const j of (rawEmployees as any[]) || []) {
    if (!j.dolgozo_id) continue
    const existing = employeeMap.get(j.dolgozo_id)
    // Ha még nem szerepel, vagy az újabb bejegyzés aktív (nincs kilépés dátuma)
    if (!existing || (!j.kilepes_datuma && existing.kilepes_datuma)) {
      employeeMap.set(j.dolgozo_id, {
        id: j.dolgozo_id,
        felhasznalo_profil: j.hr_dolgozo_adatlap?.felhasznalo_profil,
        hr_munkakor: {
          megnevezes: j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs beosztás"
        },
        kilepes_datuma: j.kilepes_datuma
      })
    }
  }
  const allEmployees = Array.from(employeeMap.values())

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Naptár & Távollét</h1>
          <p className="text-muted-foreground mt-1">
            Központi naptár a szabadságok, táppénzek és csapat szintű távollétek nyomon követésére.
          </p>
        </div>
      </div>

      <TeamCalendar teamMembers={allEmployees || []} leaves={allLeaves || []} />
    </div>
  )
}
