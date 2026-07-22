import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UserCircle, CalendarDays, FileText, Download, Briefcase, Calendar, FileArchive, Coffee, Clock, Lock, Eye, CheckCircle2, Target } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { PersonalDataCard } from "@/components/hr/personal-data-card"
import { LeaveRequestDialog } from "@/components/hr/leave-request-dialog"
import { TimeTrackingCard } from "@/components/hr/time-tracking-card"
import { RecentDocumentsCard } from "@/components/hr/recent-documents-card"
import { redirect } from "next/navigation"

export default async function SelfServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Lekérdezzük a dolgozó alapadatait és a munkakörét
  const { data: adatlap } = await supabase
    .from("hr_dolgozo_adatlap")
    .select("*, hr_munkakor(megnevezes), felhasznalo_profil(nev)")
    .eq("id", user.id)
    .single()

  // 1. Szabadság egyenleg számítása
  const { data: tavolletek } = await supabase
    .from("hr_tavollet")
    .select("statusz")
    .eq("dolgozo_id", user.id)
    .eq("tipus", "szabadsag")

  const totalLeave = 25
  const usedLeave = tavolletek?.filter(t => t.statusz === "jovahagyva").length || 0
  const plannedLeave = tavolletek?.filter(t => t.statusz === "jovahagyasra_var").length || 0
  const remainingLeave = totalLeave - usedLeave

  // 2. Időrögzítés státusz
  const { data: jelenlet } = await supabase
    .from("hr_jelenlet")
    .select("becsekkolas_ideje, kicsekkolas_ideje")
    .eq("dolgozo_id", user.id)
    .eq("datum", new Date().toISOString().split('T')[0])
    .single()
  
  let timeStatus: "none" | "checked_in" | "checked_out" = "none"
  if (jelenlet) {
    if (jelenlet.kicsekkolas_ideje) timeStatus = "checked_out"
    else timeStatus = "checked_in"
  }

  // 3. Dokumentumok lekérése
  const { data: dokumentumok } = await supabase
    .from("hr_dokumentum")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dolgozói Portál</h1>
          <p className="text-muted-foreground mt-1">
            Üdvözlünk, {adatlap?.felhasznalo_profil?.nev || "Dolgozó"}! Itt találod a személyes HR adataidat.
          </p>
        </div>
        <LeaveRequestDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Személyes Adatok */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-primary" /> Alapadatok
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Munkakör</p>
                <p className="font-medium text-sm mt-1">{adatlap?.hr_munkakor?.megnevezes || "Nincs beállítva"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Belépés Dátuma</p>
                <p className="font-medium text-sm mt-1">{adatlap?.belepes_datuma ? new Date(adatlap.belepes_datuma).toLocaleDateString("hu-HU") : "Nincs megadva"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Orvosi Érvényesség</p>
                <p className="font-medium text-sm mt-1">{adatlap?.orvosi_alkalmassag_ervenyesseg ? new Date(adatlap.orvosi_alkalmassag_ervenyesseg).toLocaleDateString("hu-HU") : "Nincs megadva"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Titkos Adatok Kártya */}
        <PersonalDataCard />
        
        {/* Szabadság egyenleg */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Szabadság ({new Date().getFullYear()})</CardTitle>
              <CardDescription>Éves alapszabadság + pótszabadságok</CardDescription>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-4 flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{remainingLeave}</span>
                <span className="text-muted-foreground text-sm">nap maradt</span>
              </div>
              <div className="text-sm text-muted-foreground">Összesen: {totalLeave} nap</div>
            </div>
            <Progress value={(usedLeave / totalLeave) * 100} className="mt-4 h-2" />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Felhasznált: {usedLeave} nap</span>
              <span>Tervezett: {plannedLeave} nap</span>
            </div>
          </CardContent>
        </Card>

        {/* Időadat Rögzítés Kártya */}
        <TimeTrackingCard 
          initialStatus={timeStatus} 
          checkInTime={jelenlet?.becsekkolas_ideje || null}
          checkOutTime={jelenlet?.kicsekkolas_ideje || null}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Legutóbbi Dokumentumaim */}
        <RecentDocumentsCard documents={dokumentumok || []} />

        {/* Teljesítménycélok */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" /> Aktuális Célkitűzések
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-32 text-center space-y-3">
              <Target className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nincs aktív teljesítményértékelési ciklus.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  )
}
