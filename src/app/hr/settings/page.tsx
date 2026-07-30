import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Monitor, Shield, Info, Briefcase, Building2, Search, Users, Network } from "lucide-react"
import { EmployeeEditDialog } from "@/components/hr/employee-edit-dialog"
import { OrgChartTree } from "@/components/hr/org-chart-tree"
import { JobCreateDialog } from "@/components/hr/job-create-dialog"
import { JobActionMenu } from "@/components/hr/job-action-menu"
import { OrgUnitActionMenu } from "@/components/hr/org-unit-action-menu"
import { AddEmployeeDialog } from "@/components/hr/add-employee-dialog"
import { EmployeeDeleteDialog } from "@/components/hr/employee-delete-dialog"
import { HrOrgUnitCreateDialog } from "@/components/hr/org-unit-create-dialog"
import Link from "next/link"
import { SecuritySettingsTab } from "./security-tab"
import { HrNotificationSettings } from "./notification-settings"
import { Bell } from "lucide-react"
import { updateProfile } from "@/app/settings/settings-actions"

export default async function HrSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // Biztonsági ellenőrzés
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('*')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground mt-2">Nincs jogosultságod a HR beállítások megtekintéséhez.</p>
        </div>
      </div>
    )
  }

  // 1. Összes dolgozó lekérése
  const { data: employees, error: employeesError } = await supabase
    .from("hr_dolgozo_adatlap")
    .select(`
      *,
      felhasznalo_profil (
        nev,
        hr_szerepkor,
        hr_szervezeti_egyseg_id,
        kozvetlen_vezeto_id,
        hr_szervezeti_egyseg (nev)
      ),
      hr_jogviszony (
        id,
        belepes_datuma,
        hr_beosztas (
          id,
          berkategoria,
          kozvetlen_vezeto,
          ervenyes_ig,
          hr_munkakor (id, megnevezes)
        )
      )
    `)
    .order("created_at", { ascending: false })

  if (employeesError) {
    console.error("EMPLOYEES QUERY ERROR:", employeesError)
  }

  // --- SZERVEZETI ÁBRA LOGIKA ÚJRAÍRÁSA ---
  const { data: orgUnits } = await supabase
    .from("hr_szervezeti_egyseg")
    .select("id, nev, szulo_id")
    .order("nev")

  // Szabályok lekérése az értesítésekhez
  const { data: szabalyok } = await supabase
    .from("ertesitesi_szabaly")
    .select("*")
    .order("esemeny_tipus")

   // 2. OrgChart adatok összeállítása (új: közvetlen vezető alapján)
  const employeeMap = new Map<string, any>()
  if (employees) {
    employees.forEach(emp => {
      const p = emp.felhasznalo_profil as any;
      const nev = p?.nev || "Névtelen";
      const managerId = p?.kozvetlen_vezeto_id;
      const egyseg = p?.hr_szervezeti_egyseg?.nev || "Központ";
      
      const activeJogviszony = emp.hr_jogviszony?.[0];
      const activeBeosztas = activeJogviszony?.hr_beosztas?.[0];
      const pozicio = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs beállítva";

      employeeMap.set(emp.id, {
        id: emp.id,
        nev,
        pozicio,
        egyseg,
        managerId,
        beosztottak: []
      })
    })
  }

  const rootEmployees: any[] = []
  employeeMap.forEach(empNode => {
    if (empNode.managerId && employeeMap.has(empNode.managerId)) {
      employeeMap.get(empNode.managerId).beosztottak.push(empNode)
    } else {
      rootEmployees.push(empNode)
    }
  })
  // --- EDDIG ---

  // Munkakörök lekérése a katalógushoz
  const { data: dbJobs } = await supabase
    .from("hr_munkakor")
    .select(`
      *,
      hr_beosztas ( id, ervenyes_ig )
    `)
    .order("created_at", { ascending: false })

  // 2. Összes elérhető munkakör lekérése (A szerkesztő ablakhoz)
  const { data: jobs } = await supabase
    .from("hr_munkakor")
    .select("id, megnevezes")
    .order("megnevezes")

  // 3. Olyan felhasználók lekérése, akik nincsenek benne a hr_dolgozo_adatlap-ban
  const { data: allUsers } = await supabase.from("felhasznalo_profil").select("id, nev")
  const assignedIds = employees?.map(e => e.id) || []
  const unassignedUsers = allUsers?.filter(u => !assignedIds.includes(u.id)) || []

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 4. Toborzásból (ATS) elfogadott jelentkezők lekérése (akiknek az email címe még nem létezik a rendszerben)
  const { data: elfogadottJelentkezok } = await supabaseAdmin
    .from("hr_toborzas")
    .select("id, nev, email, megpalyazott_munkakor_id")
    .eq("statusz", "elfogadva")
    
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const userEmails = authUsers.users.map(u => u.email)
  const availableCandidates = elfogadottJelentkezok?.filter(j => !userEmails.includes(j.email)) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-2">
        <h2 className="text-3xl font-semibold tracking-tight">Beállítások</h2>
        <Info className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground mt-0 mb-6">Rendszer és üzleti beállítások kezelése</p>

      <Tabs defaultValue="profil" className="space-y-4">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6 flex-wrap">
          <TabsTrigger 
            value="profil" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <User className="h-4 w-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger 
            value="rendszer" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Rendszer
          </TabsTrigger>
          <TabsTrigger 
            value="biztonsag" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Shield className="h-4 w-4 mr-2" />
            Biztonság
          </TabsTrigger>
          <TabsTrigger 
            value="munkatarsak" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Users className="h-4 w-4 mr-2" />
            Munkatársak (HR)
          </TabsTrigger>

          <TabsTrigger 
            value="organization" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Szervezet
          </TabsTrigger>
          <TabsTrigger 
            value="ertesitesek" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Bell className="h-4 w-4 mr-2" />
            Értesítések
          </TabsTrigger>
        </TabsList>

        {/* 1. TAB: PROFIL (eaisyDocs stílus) */}
        <TabsContent value="profil" className="space-y-4 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <CardTitle className="text-xl">Felhasználói profil</CardTitle>
              </div>
              <CardDescription>Személyes információk és avatar kezelése</CardDescription>
            </CardHeader>
            <form action={updateProfile} key={profile?.telefon || 'profile-form'}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nev">Teljes név</Label>
                    <Input id="nev" name="nev" defaultValue={profile?.nev || ""} key={profile?.nev || 'nev'} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email cím</Label>
                    <Input id="email" defaultValue={user.email} readOnly className="bg-muted/50 cursor-not-allowed opacity-70" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="pozicio">Pozíció</Label>
                    <Input id="pozicio" name="pozicio" defaultValue={profile?.pozicio || ""} key={profile?.pozicio || 'poz'} placeholder="pl. Rendszergazda-iratkezelő" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ceg_neve">Cég neve</Label>
                    <Input id="ceg_neve" name="ceg_neve" defaultValue={profile?.ceg_neve || ""} key={profile?.ceg_neve || 'ceg'} className="bg-background" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="telefon">Telefonszám</Label>
                    <Input id="telefon" name="telefon" defaultValue={profile?.telefon || ""} key={profile?.telefon || 'tel'} placeholder="+36301234567" className="bg-background" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="bg-[#02b8cc] hover:bg-[#029db0] text-white">
                  Profil mentése
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* 2. TAB: RENDSZER (eaisyDocs stílus) */}
        <TabsContent value="rendszer" className="space-y-4 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Rendszer beállítások</CardTitle>
              <CardDescription>Téma és megjelenítési beállítások</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="theme-select">Téma</Label>
                  <Select defaultValue="light">
                    <SelectTrigger id="theme-select" className="bg-background">
                      <SelectValue placeholder="Világos">Világos</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Világos</SelectItem>
                      <SelectItem value="dark">Sötét</SelectItem>
                      <SelectItem value="system">Rendszer alapértelmezett</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language-select">Nyelv</Label>
                  <Select defaultValue="hu" disabled>
                    <SelectTrigger id="language-select" className="bg-muted/50 cursor-not-allowed text-foreground opacity-100">
                      <SelectValue placeholder="Magyar">Magyar</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hu">Magyar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date-format">Dátum formátum</Label>
                  <Select defaultValue="ddmmyyyy" disabled>
                    <SelectTrigger id="date-format" className="bg-muted/50 cursor-not-allowed text-foreground opacity-100">
                      <SelectValue placeholder="DD/MM/YYYY">DD/MM/YYYY</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ddmmyyyy">DD/MM/YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number-format">Szám formátum</Label>
                  <Select defaultValue="space" disabled>
                    <SelectTrigger id="number-format" className="bg-muted/50 cursor-not-allowed text-foreground opacity-100">
                      <SelectValue placeholder="1 234 567,89">1 234 567,89</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="space">1 234 567,89</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-6 flex justify-start pt-4">
              <Button className="bg-[#02b8cc] hover:bg-[#029db0] text-white">
                Rendszer beállítások mentése
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>



        <TabsContent value="organization" className="space-y-6 outline-none">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">Szervezet és Munkakörök</h3>
              <p className="text-muted-foreground mt-1">Vállalati struktúra és munkaköri leírások (FEOR) kezelése.</p>
            </div>
            <div className="flex gap-2">
              <HrOrgUnitCreateDialog />
              <JobCreateDialog />
            </div>
          </div>

          <Tabs defaultValue="jobs" className="space-y-6">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 mb-6">
              <TabsTrigger value="jobs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                <Briefcase className="w-4 h-4 mr-2" />
                Munkakör-katalógus
              </TabsTrigger>
              <TabsTrigger value="orgunits" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                <Building2 className="w-4 h-4 mr-2" />
                Szervezeti egységek
              </TabsTrigger>
              <TabsTrigger value="orgchart" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                <Network className="w-4 h-4 mr-2" />
                Szervezeti Ábra
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Nyilvántartott Munkakörök</CardTitle>
                    <CardDescription>A 1. követelmény szerinti feladatok, hatáskörök és kompetenciák.</CardDescription>
                  </div>
                  <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Keresés munkakörre vagy FEOR-ra..." className="pl-9 bg-background" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Munkakör Megnevezése</TableHead>
                        <TableHead>FEOR</TableHead>
                        <TableHead>Szervezeti Egység</TableHead>
                        <TableHead>Besorolás</TableHead>
                        <TableHead className="text-center">Betöltött</TableHead>
                        <TableHead className="text-right pr-6">Műveletek</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbJobs && dbJobs.length > 0 ? dbJobs.map((job) => {
                        const employeeCount = job.hr_beosztas?.filter((b: any) => b.ervenyes_ig === null).length || 0;
                        return (
                          <TableRow key={job.id} className="hover:bg-muted/50">
                            <TableCell className="pl-6 font-medium">
                              <Link href={`/hr/job/${job.id}`} className="hover:underline text-primary">
                                {job.megnevezes}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground tabular-nums">{job.feor_kod || "-"}</TableCell>
                            <TableCell>Nem besorolt</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-background">
                                {job.besorolasi_szint || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {employeeCount > 0 ? (
                                 <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                                   <Users className="w-3 h-3" /> {employeeCount} fő
                                 </Badge>
                              ) : (
                                 <Badge variant="destructive" className="gap-1">
                                   Betöltetlen
                                 </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <JobActionMenu job={job} />
                            </TableCell>
                          </TableRow>
                        )
                      }) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Még nincsenek munkakörök létrehozva.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orgunits" className="space-y-4 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Szervezeti Egységek</CardTitle>
                    <CardDescription>A vállalat szervezeti felépítését alkotó részlegek és osztályok.</CardDescription>
                  </div>
                  <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Keresés..." className="pl-9 bg-background" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Megnevezés</TableHead>
                        <TableHead>Szülő egység</TableHead>
                        <TableHead className="text-center">Hozzárendelt dolgozók</TableHead>
                        <TableHead className="text-right pr-6">Műveletek</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgUnits && orgUnits.length > 0 ? orgUnits.map((unit) => {
                        const parentUnit = orgUnits.find(u => u.id === unit.szulo_id);
                        const employeeCount = employees?.filter(e => e.felhasznalo_profil?.hr_szervezeti_egyseg_id === unit.id).length || 0;
                        return (
                          <TableRow key={unit.id} className="hover:bg-muted/50">
                            <TableCell className="pl-6 font-medium">
                              <Link href={`/hr/orgunit/${unit.id}`} className="hover:underline text-primary">
                                {unit.nev}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {parentUnit ? parentUnit.nev : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {employeeCount > 0 ? (
                                 <Badge variant="default" className="gap-1 bg-blue-600 hover:bg-blue-700">
                                   <Users className="w-3 h-3" /> {employeeCount} fő
                                 </Badge>
                              ) : (
                                 <Badge variant="secondary" className="gap-1 text-muted-foreground">
                                   Nincs dolgozó
                                 </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <OrgUnitActionMenu unit={unit} />
                            </TableCell>
                          </TableRow>
                        )
                      }) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Még nincsenek szervezeti egységek létrehozva.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orgchart" className="space-y-4 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle>Szervezeti Felépítés</CardTitle>
                  <CardDescription>Vizuális fa-struktúra a vezetők és beosztottak megjelenítéséhez.</CardDescription>
                </CardHeader>
                <CardContent>
                  <OrgChartTree rootUnits={rootEmployees} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* --- ÚJ MUNKATÁRSAK TAB (BEÁGYAZOTT TÁBLÁZAT) --- */}
        <TabsContent value="munkatarsak" className="mt-0 outline-none space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Munkatársak ({employees?.length || 0} fő)
                </CardTitle>
                <CardDescription>
                  A dolgozói nyilvántartás és a szerepkörök szerkesztése.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <AddEmployeeDialog availableUsers={unassignedUsers} jobs={jobs || []} candidates={availableCandidates} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Név</th>
                      <th className="px-6 py-4 font-semibold">Munkakör</th>
                      <th className="px-6 py-4 font-semibold">Szervezeti Egység</th>
                      <th className="px-6 py-4 font-semibold">Szerepkör</th>
                      <th className="px-6 py-4 font-semibold">Közvetlen vezető</th>
                      <th className="px-6 py-4 font-semibold">Belépés</th>
                      <th className="px-6 py-4 text-right font-semibold">Műveletek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employees?.map((emp) => {
                      const nev = emp.felhasznalo_profil?.nev || "Ismeretlen"
                      const initials = nev.substring(0,2).toUpperCase()
                      
                      // Új schema: dolgozo -> jogviszony -> beosztas -> munkakor
                      const activeJogviszony = emp.hr_jogviszony?.[0]
                      const activeBeosztas = activeJogviszony?.hr_beosztas?.[0]
                      const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs beállítva"
                      
                      const egyseg = (emp.felhasznalo_profil as any)?.hr_szervezeti_egyseg?.nev || "Központ"
                      const hr_szerepkor = emp.felhasznalo_profil?.hr_szerepkor || "Ismeretlen"
                      const belepes = activeJogviszony?.belepes_datuma ? new Date(activeJogviszony.belepes_datuma).toLocaleDateString("hu-HU") : "-"
                      
                      // Közvetlen vezető kikeresése
                      const managerId = (emp.felhasznalo_profil as any)?.kozvetlen_vezeto_id
                      const manager = managerId ? employees.find(m => m.id === managerId) : null
                      const managerName = manager?.felhasznalo_profil?.nev || "Nincs beállítva"

                      // Szerepkör badge színezés és fordítás
                      let roleColor = "bg-secondary text-secondary-foreground"
                      let roleName = "Ismeretlen"
                      if (hr_szerepkor === "admin") {
                        roleColor = "bg-destructive/10 text-destructive border-destructive/20 border"
                        roleName = "Rendszergazda (Admin)"
                      } else if (hr_szerepkor === "hr_vezeto") {
                        roleColor = "bg-primary/10 text-primary border-primary/20 border"
                        roleName = "Vezető (Manager)"
                      } else if (hr_szerepkor === "hr_munkatars") {
                        roleColor = "bg-primary/10 text-primary border-primary/20 border"
                        roleName = "HR Munkatárs"
                      } else if (hr_szerepkor === "munkavallalo") {
                        roleName = "Munkavállaló (Alap)"
                      }

                      return (
                        <tr key={emp.id} className="bg-card hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-medium whitespace-nowrap flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                            {nev}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {munkakor}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="font-normal">{egyseg}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className={`font-normal ${roleColor}`}>{roleName}</Badge>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {managerName}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {belepes}
                          </td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                            <EmployeeEditDialog employee={emp} jobs={jobs || []} orgUnits={orgUnits || []} managers={employees || []} />
                            <EmployeeDeleteDialog employeeId={emp.id} employeeName={nev} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {(!employees || employees.length === 0) && (
                <div className="p-8 text-center text-muted-foreground">
                  Nincsenek megjeleníthető dolgozók az adatbázisban.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <SecuritySettingsTab initialTimeout={profile.munkamenet_idotullepes} />
        {/* 6. TAB: ÉRTESÍTÉSEK (ÚJ) */}
        <TabsContent value="ertesitesek" className="space-y-4 outline-none">
          <HrNotificationSettings rules={(szabalyok || []).filter(s => !['hatarido_kozeledik', 'hatarido_lejart', 'uj_szignalas', 'allapotvaltozas', 'megorzesi_ido_lejart'].includes(s.esemeny_tipus))} />
        </TabsContent>

      </Tabs>
    </div>
  )
}
