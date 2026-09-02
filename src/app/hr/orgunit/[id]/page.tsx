import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, Users, Briefcase, ChevronLeft, ChevronRight, Crown } from "lucide-react"
import Link from "next/link"
import { AssignEmployeeOrgDialog } from "@/components/hr/assign-employee-org-dialog"
import { RemoveEmployeeOrgButton } from "@/components/hr/remove-employee-org-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function roleLabel(role: string | null | undefined): { label: string; className: string } {
  switch (role) {
    case "admin":          return { label: "Admin",                className: "bg-destructive/10 text-destructive border-destructive/20 border" }
    case "rendszergazda":  return { label: "Rendszergazda (IT)",   className: "bg-destructive/10 text-destructive border-destructive/20 border" }
    case "hr_vezeto":      return { label: "HR Vezető",            className: "bg-primary/10 text-primary border-primary/20 border" }
    case "hr_munkatars":   return { label: "HR Munkatárs",         className: "bg-primary/10 text-primary border-primary/20 border" }
    case "vezeto":         return { label: "Vezető",               className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border" }
    case "berugyi":        return { label: "Bérügyi",              className: "bg-blue-500/10 text-blue-600 border-blue-500/20 border" }
    case "toborzo":        return { label: "Toborzó (ATS)",        className: "bg-orange-500/10 text-orange-600 border-orange-500/20 border" }
    case "munkavedelmi":   return { label: "Munkavédelmi",         className: "bg-amber-500/10 text-amber-600 border-amber-500/20 border" }
    case "auditor":        return { label: "Auditor",              className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 border" }
    default:               return { label: "Munkavállaló",         className: "bg-secondary text-secondary-foreground" }
  }
}

export default async function OrgUnitProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("elerheto_modulok, hr_szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.elerheto_modulok.includes("hr")) redirect("/dashboard")

  // 1. Szervezeti egység adatai (szülő nevével)
  const { data: orgUnit, error: orgUnitError } = await supabase
    .from("hr_szervezeti_egyseg")
    .select("*, parent:szulo_id(id, nev)")
    .eq("id", id)
    .single()

  if (orgUnitError || !orgUnit) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Building2 className="w-12 h-12 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold text-muted-foreground">Szervezeti egység nem található</h2>
        <Link href="/hr/settings">
          <Button variant="outline" size="sm">Vissza a beállításokhoz</Button>
        </Link>
      </div>
    )
  }

  // 2. Az egységhez rendelt dolgozók (gazdagabb adatokkal)
  const { data: employeesRaw } = await admin
    .from("felhasznalo_profil")
    .select("id, nev, hr_szerepkor")
    .eq("hr_szervezeti_egyseg_id", id)

  const employees = employeesRaw || []

  // 3. Dolgozók beosztás (munkakör) adatai – külön query a hr_dolgozo_adatlap-on át
  const employeeIds = employees.map(e => e.id)
  let munkakorByEmployeeId: Record<string, string> = {}
  if (employeeIds.length > 0) {
    const { data: beosztasok } = await admin
      .from("hr_dolgozo_adatlap")
      .select(`
        id,
        hr_jogviszony (
          hr_beosztas (
            ervenyes_ig,
            hr_munkakor (megnevezes)
          )
        )
      `)
      .in("id", employeeIds)

    beosztasok?.forEach((d) => {
      const jv = Array.isArray(d.hr_jogviszony) ? d.hr_jogviszony[0] : d.hr_jogviszony
      const beosztas = Array.isArray(jv?.hr_beosztas)
        ? jv.hr_beosztas.find((b: any) => b.ervenyes_ig === null)
        : ((jv?.hr_beosztas as any)?.ervenyes_ig === null ? jv.hr_beosztas : null)
      const mk = Array.isArray(beosztas?.hr_munkakor) ? beosztas.hr_munkakor[0] : beosztas?.hr_munkakor
      if (mk?.megnevezes) munkakorByEmployeeId[d.id] = mk.megnevezes
    })
  }

  // 4. Ehhez az egységhez rendelt munkakörök
  const { data: jobsRaw } = await supabase
    .from("hr_munkakor")
    .select(`
      id, megnevezes, feor_kod, besorolasi_szint,
      hr_beosztas (id, ervenyes_ig)
    `)
    .eq("szervezeti_egyseg_id", id)
    .order("megnevezes")

  const jobs = jobsRaw || []

  // 5. Hozzárendeléshez elérhető dolgozók
  const { data: allEmployeesData } = await admin
    .from("hr_dolgozo_adatlap")
    .select("id, felhasznalo_profil!inner(id, nev)")

  const assignedIds = employees.map(e => e.id)
  const availableEmployees = allEmployeesData?.map(emp => {
    const profil = Array.isArray(emp.felhasznalo_profil) ? emp.felhasznalo_profil[0] : emp.felhasznalo_profil as { id: string; nev: string } | null
    return { id: profil?.id || "", nev: profil?.nev || "Névtelen" }
  }).filter(e => e.id && !assignedIds.includes(e.id)) || []

  const activeJobsCount = jobs.filter(j =>
    (j.hr_beosztas as any[])?.some((b: any) => b.ervenyes_ig === null)
  ).length

  return (
    <div className="space-y-6 pb-10">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/hr/settings" className="hover:text-foreground transition-colors">Beállítások</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/hr/settings?tab=organization" className="hover:text-foreground transition-colors">Szervezeti egységek</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{orgUnit.nev}</span>
      </div>

      {/* ── Fejléc ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/hr/settings">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{orgUnit.nev}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {(orgUnit.parent as any)?.nev
                  ? <>Szülő: <Link href={`/hr/orgunit/${(orgUnit.parent as any).id}`} className="text-primary hover:underline">{(orgUnit.parent as any).nev}</Link></>
                  : "Főszintű szervezeti egység"}
              </p>
            </div>
          </div>
        </div>
        <AssignEmployeeOrgDialog orgUnitId={orgUnit.id} availableEmployees={availableEmployees} />
      </div>

      {/* ── Stat kártyák ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{employees.length}</p>
                <p className="text-xs text-muted-foreground">Hozzárendelt dolgozó</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10">
                <Briefcase className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">Hozzárendelt munkakör</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10">
                <Crown className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold truncate">{(orgUnit.parent as any)?.nev || "Főszintű"}</p>
                <p className="text-xs text-muted-foreground">Szülő egység</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Fő tartalom – Tabs ── */}
      <Tabs defaultValue="dolgozok" className="space-y-4">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0">
          <TabsTrigger
            value="dolgozok"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-5 py-3 gap-2"
          >
            <Users className="w-4 h-4" />
            Dolgozók
            <Badge variant="secondary" className="ml-1 font-normal text-xs">{employees.length}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="munkakoprok"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-5 py-3 gap-2"
          >
            <Briefcase className="w-4 h-4" />
            Munkakörök
            <Badge variant="secondary" className="ml-1 font-normal text-xs">{jobs.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Dolgozók tab ── */}
        <TabsContent value="dolgozok" className="outline-none">
          <Card className="border-border">
            <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Hozzárendelt Dolgozók</CardTitle>
                <CardDescription>Az egységben dolgozó munkatársak és szerepköreik.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="compact-table min-w-max w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="pl-6 w-[240px]">Neve</TableHead>
                      <TableHead className="w-[200px]">Szerepkör</TableHead>
                      <TableHead className="w-[220px]">Betöltött Munkakör</TableHead>
                      <TableHead className="text-right pr-6 w-[100px]">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length > 0 ? employees.map((emp) => {
                      const role = roleLabel(emp.hr_szerepkor)
                      const initials = (emp.nev || "?").substring(0, 2).toUpperCase()
                      const munkakor = munkakorByEmployeeId[emp.id]
                      return (
                        <TableRow key={emp.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <Link href={`/hr/employee/${emp.id}`} className="font-medium hover:underline text-primary leading-tight">
                                {emp.nev}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`font-normal text-xs ${role.className}`}>
                              {role.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {munkakor ? (
                              <span className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 opacity-50 shrink-0" />
                                {munkakor}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground/50">Nincs beállítva</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <RemoveEmployeeOrgButton orgUnitId={orgUnit.id} employeeId={emp.id} employeeName={emp.nev} />
                          </TableCell>
                        </TableRow>
                      )
                    }) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-36 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Users className="w-8 h-8 opacity-20" />
                            <p className="text-sm">Nincsenek hozzárendelt dolgozók</p>
                            <p className="text-xs text-muted-foreground/60">Kattints a &ldquo;Dolgozó Hozzárendelése&rdquo; gombra a fenti fejlécnél.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Munkakörök tab ── */}
        <TabsContent value="munkakoprok" className="outline-none">
          <Card className="border-border">
            <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Hozzárendelt Munkakörök</CardTitle>
                <CardDescription>Az egységbe sorolt pozíciók és betöltöttségük.</CardDescription>
              </div>
              <Link href="/hr/settings?tab=organization&sub=jobs">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Katalógus kezelése
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="compact-table min-w-max w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="pl-6 w-[240px]">Munkakör Neve</TableHead>
                      <TableHead className="w-[100px]">FEOR</TableHead>
                      <TableHead className="w-[140px]">Besorolás</TableHead>
                      <TableHead className="text-center w-[120px]">Betöltöttség</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.length > 0 ? jobs.map((job) => {
                      const activeCount = (job.hr_beosztas as any[])?.filter((b: any) => b.ervenyes_ig === null).length || 0
                      return (
                        <TableRow key={job.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="pl-6">
                            <Link href={`/hr/job/${job.id}`} className="font-medium hover:underline text-primary flex items-center gap-2">
                              <Briefcase className="w-3.5 h-3.5 opacity-50 shrink-0" />
                              {job.megnevezes}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground tabular-nums text-sm">
                            {job.feor_kod || <span className="italic opacity-40">–</span>}
                          </TableCell>
                          <TableCell>
                            {job.besorolasi_szint ? (
                              <Badge variant="outline" className="font-normal text-xs">
                                {job.besorolasi_szint}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/50 italic text-sm">–</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {activeCount > 0 ? (
                              <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700 text-xs">
                                <Users className="w-3 h-3" />
                                {activeCount} fő
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                                Betöltetlen
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    }) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-36 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Briefcase className="w-8 h-8 opacity-20" />
                            <p className="text-sm">Nincsenek munkakörök hozzárendelve</p>
                            <p className="text-xs text-muted-foreground/60">
                              A munkakörök beállításánál rendeld hozzá ezt az egységet.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}
