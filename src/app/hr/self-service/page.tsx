import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UserCircle, CalendarDays, Coffee } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { PersonalDataCard } from "@/components/hr/personal-data-card"
import { LeaveRequestDialog } from "@/components/hr/leave-request-dialog"
import { TimeTrackingCard } from "@/components/hr/time-tracking-card"
import { RecentDocumentsCard } from "@/components/hr/recent-documents-card"
import { LeaveHistoryList } from "@/components/hr/leave-history-list"
import { CafeteriaDeclaration } from "@/components/hr/cafeteria-declaration"
import { EmployeeTimesheet } from "@/components/hr/employee-timesheet"
import { EmployeeKpiCard } from "@/components/hr/employee-kpi-card"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileSignature } from "lucide-react"
import { JobDescriptionAcknowledgment } from "@/components/hr/job-description-acknowledgment"
import { SubstituteSettingsCard } from "@/components/hr/substitute-settings-card"

export default async function SelfServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Lekérdezzük a dolgozó alapadatait és a kapcsolódó új táblákat
  const [adatlapRes, jogviszonyRes, orvosiRes] = await Promise.all([
    supabase
      .from("hr_dolgozo_adatlap")
      .select("*, felhasznalo_profil(nev, hr_szerepkor)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("hr_jogviszony")
      .select("belepes_datuma, hr_beosztas(hr_munkakor(megnevezes))")
      .eq("dolgozo_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hr_orvosi_vizsgalat")
      .select("ervenyesseg_datuma")
      .eq("dolgozo_id", user.id)
      .order("ervenyesseg_datuma", { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  const adatlap = adatlapRes.data
  const jogviszony = jogviszonyRes.data
  const orvosi = orvosiRes.data

  const munkakorMegnevezes = jogviszony?.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs beállítva"
  const belepesDatuma = jogviszony?.belepes_datuma || null
  const orvosiErvenyesseg = orvosi?.ervenyesseg_datuma || null

  // 1. Szabadság egyenleg számítása és Távollétek lekérése
  const { data: tavolletek } = await supabase
    .from("hr_tavollet")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  const totalLeave = 25
  const usedLeave = tavolletek?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyva").length || 0
  const plannedLeave = tavolletek?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyasra_var").length || 0
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

  // 3. Dokumentumok lekérése (Saját fájlok)
  const { data: dokumentumok } = await supabase
    .from("hr_dokumentum")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  // 3.5 Céges dokumentumok ellenőrzése (van-e olvasatlan kötelező)
  const { data: cegesDokumentumok } = await supabase
    .from("hr_ceges_dokumentum")
    .select(`id, hr_ceges_dokumentum_nyugtazas(id)`)
    .eq("aktiv", true)
    .eq("kotelezo_mindenkinek", true)
    .eq("hr_ceges_dokumentum_nyugtazas.dolgozo_id", user.id)

  const pendingDocsCount = cegesDokumentumok?.filter(d => !d.hr_ceges_dokumentum_nyugtazas || d.hr_ceges_dokumentum_nyugtazas.length === 0).length || 0

  // 4. Cafeteria lekérések
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

  // 5. Teljesítményértékelés (KPI-ok) lekérése (Admin kliens az RLS problémák miatt)
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: kpis } = await supabaseAdmin
    .from("hr_teljesitmeny")
    .select("*, hr_teljesitmeny_ciklus(megnevezes)")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  const { data: kpiLogs } = await supabaseAdmin
    .from("hr_esemeny_naplo")
    .select("*, felhasznalo_profil(nev)")
    .eq("entitas_tipus", "hr_teljesitmeny")
    .order("created_at", { ascending: true })

  // 6. Munkakör és nyugtázás lekérése
  const { data: jogviszonyInfo } = await supabase
    .from("hr_jogviszony")
    .select("*, hr_beosztas(*, hr_munkakor(*))")
    .eq("dolgozo_id", user.id)
    .is("kilepes_datuma", null)
    .single()

  const activeMunkakor = jogviszonyInfo?.hr_beosztas?.[0]?.hr_munkakor;

  let needsAcknowledgment = false;
  if (activeMunkakor) {
    const { data: nyugtazas } = await supabase
      .from("hr_munkakor_nyugtazas")
      .select("id")
      .eq("user_id", user.id)
      .eq("munkakor_id", activeMunkakor.id)
      .single()
    if (!nyugtazas) needsAcknowledgment = true;
  }

  // 7. Helyettesítések lekérése
  const { data: currentSubstituteList } = await supabase
    .from("hr_helyettesites")
    .select("*, helyettes_profil:felhasznalo_profil!hr_helyettesites_helyettes_id_fkey(nev)")
    .eq("vezeto_id", user.id)
    .eq("aktiv", true)
    .gte("veg_datuma", new Date().toISOString().split('T')[0])
    .order("created_at", { ascending: false })
    .limit(1)

  const currentSubstitute = currentSubstituteList?.[0] || null

  const { data: availableAdatlapUsers } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .select("id, felhasznalo_profil!inner(id, nev)")
    .neq("id", user.id)

  const availableUsers = availableAdatlapUsers
    ?.map((a: any) => a.felhasznalo_profil)
    .sort((a: any, b: any) => a.nev.localeCompare(b.nev)) || []

  // Explicitly fetch user role to avoid join issues
  const { data: myProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  const isManagerOrAdmin = ['hr_vezeto', 'vezeto', 'admin'].includes(myProfile?.hr_szerepkor)

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dolgozói Portál</h1>
          <p className="text-muted-foreground mt-1">
            Üdvözlünk, {adatlap?.felhasznalo_profil?.nev || "Dolgozó"}! Itt találod a személyes HR adataidat.
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

      {needsAcknowledgment && activeMunkakor && (
        <JobDescriptionAcknowledgment munkakor={activeMunkakor} />
      )}

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
                <p className="font-medium text-sm mt-1">{munkakorMegnevezes}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Belépés Dátuma</p>
                <p className="font-medium text-sm mt-1">{belepesDatuma ? new Date(belepesDatuma).toLocaleDateString("hu-HU") : "Nincs megadva"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Orvosi Érvényesség</p>
                <p className="font-medium text-sm mt-1">{orvosiErvenyesseg ? new Date(orvosiErvenyesseg).toLocaleDateString("hu-HU") : "Nincs megadva"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Titkos Adatok Kártya */}
        <PersonalDataCard />

        {/* Helyettesítés Kártya */}
        {isManagerOrAdmin && (
          <SubstituteSettingsCard availableUsers={availableUsers || []} currentSubstitute={currentSubstitute} />
        )}
        
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

      <div className="grid gap-6 md:grid-cols-1">
        {/* Jelenléti Ív */}
        <EmployeeTimesheet employeeId={user.id} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cafeteria Nyilatkozat */}
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
        
        {/* Távollét Előzmények */}
        <LeaveHistoryList leaves={tavolletek || []} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Legutóbbi Dokumentumaim */}
        <RecentDocumentsCard documents={dokumentumok || []} />

        {/* Teljesítménycélok */}
        <EmployeeKpiCard kpis={kpis || []} logs={kpiLogs || []} />
      </div>
      
    </div>
  )
}
