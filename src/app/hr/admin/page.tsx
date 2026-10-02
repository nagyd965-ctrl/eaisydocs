import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, AlertCircle, Users, Briefcase, AlertTriangle, ChevronRight } from "lucide-react"
import { AddEmployeeDialog } from "@/components/hr/add-employee-dialog"
import { EmployeeTable } from "@/components/hr/employee-table"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"



export default async function HrAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin", "rendszergazda", "auditor"].includes(profile?.hr_szerepkor || "")
  if (!isHrOrAdmin) {
    redirect("/hr/self-service/profile")
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Dolgozók lekérése
  const { data: employees } = await supabase
    .from("felhasznalo_profil")
    .select(`
      id,
      nev,
      hr_szerepkor,
      avatar_url,
      hr_dolgozo_adatlap (
        id,
        munkaviszony_vege,
        hr_jogviszony (
          id,
          belepes_datuma,
          hr_beosztas (
            id,
            hr_munkakor ( megnevezes )
          )
        )
      )
    `)
    .order("created_at", { ascending: true })

  // 2. Felvételi adatok
  const { data: jobs } = await supabase.from("hr_munkakor").select("id, megnevezes")
  const { data: allUsers } = await supabase.from("felhasznalo_profil").select("id, nev")
  const assignedIds = employees?.filter(e => e.hr_dolgozo_adatlap !== null).map(e => e.id) || []
  const unassignedUsers = allUsers?.filter(u => !assignedIds.includes(u.id)) || []

  const { data: elfogadottJelentkezok } = await supabaseAdmin
    .from("hr_toborzas")
    .select("id, nev, email, megpalyazott_munkakor_id")
    .eq("statusz", "elfogadva")

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const userEmails = authUsers.users.map(u => u.email)
  const availableCandidates = elfogadottJelentkezok?.filter(j => !userEmails.includes(j.email)) || []

  // 3. Toborzási statisztikák
  const { data: toborzas } = await supabaseAdmin.from("hr_toborzas").select("*")
  const { data: allashirdetesek } = await supabase
    .from("hr_allashirdetes")
    .select("*")
    .eq("aktiv", true)
    .eq("publikus", true)
  const activeAdsCount = allashirdetesek?.length || 0
  const activeCandidatesCount = toborzas?.filter(
    t => t.statusz !== "elutasitva" && t.statusz !== "elfogadva"
  ).length || 0

  // 4. Figyelmeztetések generálása
  const alerts: any[] = []
  const { data: onboardings } = await supabase
    .from("hr_onboarding")
    .select("*, hr_onboarding_feladat(*)")
  if (onboardings) {
    onboardings.forEach(o => {
      const hasPending = o.hr_onboarding_feladat?.some((f: any) => f.statusz === "pending")
      if (hasPending) {
        alerts.push({
          id: o.id,
          type: "Onboarding",
          message: `Új belépő (${o.nev}) beléptetési feladatai folyamatban vannak.`,
        })
      }
    })
  }

  const activeEmployees = employees?.filter((emp: any) => {
    if (!emp.hr_dolgozo_adatlap) return false
    const isExited = emp.hr_szerepkor === "inaktiv" || (emp.hr_dolgozo_adatlap.munkaviszony_vege && new Date(emp.hr_dolgozo_adatlap.munkaviszony_vege) <= new Date())
    return !isExited
  }) || []

  return (
    <div className="space-y-6 pb-10">

      {/* Fejléc */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">HR Munkaasztal</h1>
          <p className="text-muted-foreground mt-1">
            Teljes állomány áttekintése és HR adminisztráció.
          </p>
        </div>
        <AddEmployeeDialog
          availableUsers={unassignedUsers}
          jobs={jobs || []}
          candidates={availableCandidates}
        />
      </div>

      {/* Stat kártyák */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Teljes Állomány */}
        <Card className="border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Teljes Állomány</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1 tabular-nums">{activeEmployees.length} fő</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Nyitott Pozíciók */}
        <Card className="border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nyitott Pozíciók</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1 tabular-nums">{activeAdsCount} db</h3>
              {activeCandidatesCount > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeCandidatesCount} aktív jelentkező
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-info-subtle text-info flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Figyelmeztetés */}
        <Card className={`border shadow-xs transition-colors ${alerts.length > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-card"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Figyelmeztetés</p>
              <h3 className={`text-2xl font-bold tracking-tight mt-1 tabular-nums ${alerts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {alerts.length} db
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{alerts.length > 0 ? "Azonnali teendő" : "Minden rendben"}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${alerts.length > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert sáv – csak ha van figyelmeztetés */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-warning">{alert.type}: </span>
                <span className="text-sm">{alert.message}</span>
              </div>
              <Link href="/hr/onboarding">
                <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs">
                  Megtekintés
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Dolgozói Törzsadatbázis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Dolgozói Törzsadatbázis
          </CardTitle>
          <Link href="/hr/recruitment">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Toborzás kezelése
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <EmployeeTable employees={activeEmployees} />
        </CardContent>
      </Card>

    </div>
  )
}
