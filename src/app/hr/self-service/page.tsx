import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, Clock, FileText, ArrowRight } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { LeaveRequestDialog } from "@/components/hr/leave-request-dialog"
import { TimeTrackingCard } from "@/components/hr/time-tracking-card"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileSignature } from "lucide-react"

export default async function SelfServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: adatlap } = await supabase
    .from("hr_dolgozo_adatlap")
    .select("*, felhasznalo_profil(nev)")
    .eq("id", user.id)
    .single()

  // 1. Szabadság egyenleg számítása
  const { data: tavolletek } = await supabase
    .from("hr_tavollet")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  const totalLeave = 25
  const usedLeave = tavolletek?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyva").length || 0
  const plannedLeave = tavolletek?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyasra_var").length || 0
  const remainingLeave = totalLeave - usedLeave

  // Legutóbbi 3 távollét kérelem
  const recentLeaves = tavolletek?.slice(0, 3) || []

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

  // 3. Céges dokumentumok ellenőrzése
  const { data: cegesDokumentumok } = await supabase
    .from("hr_ceges_dokumentum")
    .select(`id, hr_ceges_dokumentum_nyugtazas(id)`)
    .eq("aktiv", true)
    .eq("kotelezo_mindenkinek", true)
    .eq("hr_ceges_dokumentum_nyugtazas.dolgozo_id", user.id)

  const pendingDocsCount = cegesDokumentumok?.filter(d => !d.hr_ceges_dokumentum_nyugtazas || d.hr_ceges_dokumentum_nyugtazas.length === 0).length || 0

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Áttekintés</h1>
          <p className="text-muted-foreground mt-1">
            Üdvözlünk, {adatlap?.felhasznalo_profil?.nev || "Dolgozó"}! Ez a személyes irányítópultod.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/hr/self-service/dokumentumok">
            <Button variant="outline" className="relative">
              <FileSignature className="w-4 h-4 mr-2 text-primary" />
              Céges Szabályzatok
              {pendingDocsCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse shadow-sm">
                  {pendingDocsCount}
                </span>
              )}
            </Button>
          </Link>
          <LeaveRequestDialog />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Időadat Rögzítés Kártya */}
        <TimeTrackingCard 
          initialStatus={timeStatus} 
          checkInTime={jelenlet?.becsekkolas_ideje || null}
          checkOutTime={jelenlet?.kicsekkolas_ideje || null}
        />
        
        {/* Szabadság egyenleg */}
        <Card className="hover:border-primary/50 transition-colors">
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
            <Link href="/hr/self-service/time" className="mt-4 flex items-center text-sm text-primary hover:underline font-medium">
              Részletek megtekintése <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardContent>
        </Card>

        {/* Legutóbbi Kérelmek */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Legutóbbi Kérelmek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeaves.length > 0 ? (
                recentLeaves.map((leave: any) => (
                  <div key={leave.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium capitalize">{leave.tipus === 'szabadsag' ? 'Szabadság' : leave.tipus}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(leave.kezdo_datum).toLocaleDateString("hu-HU")} - {new Date(leave.veg_datum).toLocaleDateString("hu-HU")}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      leave.statusz === 'jovahagyva' ? 'bg-emerald-100 text-emerald-700' :
                      leave.statusz === 'elutasitva' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {leave.statusz.replace('_', ' ')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nincsenek kérelmek.</p>
              )}
            </div>
            <Link href="/hr/self-service/time" className="mt-4 flex items-center text-sm text-primary hover:underline font-medium">
              Összes megtekintése <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
