import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserPlus, AlertCircle, Users, Briefcase, AlertTriangle, ChevronRight } from "lucide-react"
import { AddEmployeeDialog } from "@/components/hr/add-employee-dialog"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const szerepkorLabel: Record<string, string> = {
  hr_munkatars: "HR Munkatárs",
  hr_vezeto: "HR Vezető",
  vezeto: "Vezető",
  admin: "Admin",
  dolgozo: "Dolgozó",
}

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

  const activeEmployees = employees?.filter((emp: any) => emp.hr_dolgozo_adatlap !== null) || []

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

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {activeEmployees.length} fő
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Teljes Állomány</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-info-subtle flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-info" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-info">
                {activeAdsCount} db
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Nyitott Pozíciók</p>
              {activeCandidatesCount > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeCandidatesCount} aktív jelentkező
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-warning-subtle flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-warning">
                {alerts.length} db
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Kritikus Figyelmeztetés</p>
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
              className="flex items-center gap-3 p-4 rounded-lg border border-l-4 border-l-warning hover:bg-muted/30 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-warning">{alert.type}: </span>
                <span className="text-sm">{alert.message}</span>
              </div>
              <Link href="/hr/onboarding">
                <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs gap-1">
                  Megtekintés <ChevronRight className="w-3 h-3" />
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
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              <UserPlus className="w-3.5 h-3.5" />
              Toborzás kezelése
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground font-medium w-[110px]">
                  Azonosító
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Dolgozó
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Munkakör
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Szervezeti Egység
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Szerepkör
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Státusz
                </TableHead>
                <TableHead className="text-right pr-6 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Műveletek
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEmployees.map((emp: any, index: number) => {
                const activeJogviszony = emp.hr_dolgozo_adatlap?.hr_jogviszony?.[0]
                const activeBeosztas = activeJogviszony?.hr_beosztas?.[0]
                const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs beállítva"
                const initials = getInitials(emp.nev || "?")
                const empId = `EMP-${String(index + 1).padStart(3, "0")}`

                return (
                  <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6">
                      <span className="font-mono text-xs text-muted-foreground">{empId}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {emp.avatar_url
                            ? <img src={emp.avatar_url} alt={emp.nev} className="h-full w-full object-cover" />
                            : <span className="text-xs font-semibold text-primary">{initials}</span>
                          }
                        </div>
                        <span className="font-medium text-sm">{emp.nev}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{munkakor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Központ</TableCell>
                    <TableCell>
                      {emp.hr_szerepkor && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-primary/40 text-primary">
                          {szerepkorLabel[emp.hr_szerepkor] ?? emp.hr_szerepkor}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-subtle text-success">
                        Aktív
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Link href={`/hr/employee/${emp.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary hover:text-primary gap-1"
                        >
                          Adatlap <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
              {activeEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                    Nincsenek dolgozók az adatbázisban.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}
