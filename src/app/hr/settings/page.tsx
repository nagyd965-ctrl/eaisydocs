import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Monitor, CalendarDays, Coffee, Clock, Shield, Info, Briefcase, Building2, Search, Users, Plus } from "lucide-react"
import { EmployeeEditDialog } from "@/components/hr/employee-edit-dialog"
import { OrgChartTree, EmployeeNode } from "@/components/hr/org-chart-tree"
import { JobCreateDialog } from "@/components/hr/job-create-dialog"

export default async function HrSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // Biztonsági ellenőrzés
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.szerepkor)) {
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

  // Lekérdezzük a dolgozókat a szervezeti ábrához
  const { data: employeesData } = await supabase
    .from("felhasznalo_profil")
    .select(`
      id,
      nev,
      hr_dolgozo_adatlap ( berkategoria, kozvetlen_vezeto )
    `)
    
  const orgChartEmployees: EmployeeNode[] = (employeesData || []).map(emp => ({
    id: emp.id,
    nev: emp.nev,
    pozicio: emp.hr_dolgozo_adatlap?.berkategoria || "Munkatárs",
    kozvetlen_vezeto: emp.hr_dolgozo_adatlap?.kozvetlen_vezeto || null
  }))

  // Munkakörök lekérése a katalógushoz
  const { data: dbJobs } = await supabase
    .from("hr_munkakor")
    .select(`
      *,
      hr_dolgozo_adatlap ( id )
    `)
    .order("created_at", { ascending: false })

  // 1. Összes dolgozó lekérése
  const { data: employees } = await supabase
    .from("hr_dolgozo_adatlap")
    .select(`
      *,
      felhasznalo_profil (
        nev,
        szerepkor,
        szervezeti_egyseg_id,
        szervezeti_egyseg (nev)
      ),
      hr_munkakor (megnevezes)
    `)
    .order("created_at", { ascending: false })

  // 2. Összes elérhető munkakör lekérése (A szerkesztő ablakhoz)
  const { data: jobs } = await supabase
    .from("hr_munkakor")
    .select("id, megnevezes")
    .order("megnevezes")

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
            value="leave" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Szabadság Szabályok
          </TabsTrigger>
          <TabsTrigger 
            value="cafeteria" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Coffee className="h-4 w-4 mr-2" />
            Cafeteria Elemek
          </TabsTrigger>
          <TabsTrigger 
            value="munkatarsak" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Users className="h-4 w-4 mr-2" />
            Munkatársak (HR)
          </TabsTrigger>
          <TabsTrigger 
            value="munkaido" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Clock className="h-4 w-4 mr-2" />
            Munkarendek
          </TabsTrigger>
          <TabsTrigger 
            value="roles" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Shield className="h-4 w-4 mr-2" />
            Jogosultságok
          </TabsTrigger>
          <TabsTrigger 
            value="organization" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Szervezet
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
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nev">Teljes név</Label>
                  <Input id="nev" name="nev" defaultValue="Nagy Dániel" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email cím</Label>
                  <Input id="email" defaultValue="testing@gmail.com" readOnly className="bg-muted/50 cursor-not-allowed opacity-70" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pozicio">Pozíció</Label>
                  <Input id="pozicio" name="pozicio" placeholder="pl. Rendszergazda-iratkezelő" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ceg_neve">Cég neve</Label>
                  <Input id="ceg_neve" name="ceg_neve" className="bg-background" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-[#02b8cc] hover:bg-[#029db0] text-white">
                Profil mentése
              </Button>
            </CardFooter>
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

        {/* HR Specifikus Beállítások */}
        <TabsContent value="leave" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Szabadság Paraméterek</CardTitle>
              <CardDescription>A Munka Törvénykönyve szerinti alapszabadságok és pótszabadságok.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between border-b pb-4">
                 <div className="space-y-0.5">
                   <Label className="text-base">Életkor alapú pótszabadság automatika</Label>
                   <p className="text-sm text-muted-foreground">A rendszer automatikusan hozzáadja a pótnapokat a dolgozó születési dátuma alapján.</p>
                 </div>
                 <Switch defaultChecked />
               </div>
               <div className="flex items-center justify-between border-b pb-4">
                 <div className="space-y-0.5">
                   <Label className="text-base">Előző évi szabadság áthozatala</Label>
                   <p className="text-sm text-muted-foreground">Március 31-ig felhasználható a megmaradt szabadság.</p>
                 </div>
                 <Switch defaultChecked />
               </div>
               <Button variant="outline">Új egyedi pótszabadság jogcím felvitele</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cafeteria" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cafeteria Katalógus</CardTitle>
              <CardDescription>Az aktuális évben választható juttatások és adószabályok.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="p-4 border rounded-md flex justify-between items-center">
                   <div>
                     <p className="font-semibold">SZÉP Kártya</p>
                     <p className="text-sm text-muted-foreground">Adókulcs: 28%</p>
                   </div>
                   <Button variant="ghost" size="sm">Szerkesztés</Button>
                 </div>
                 <div className="p-4 border rounded-md flex justify-between items-center">
                   <div>
                     <p className="font-semibold">Helyi közlekedési bérlet</p>
                     <p className="text-sm text-muted-foreground">Adókulcs: 0% (Adómentes)</p>
                   </div>
                   <Button variant="ghost" size="sm">Szerkesztés</Button>
                 </div>
               </div>
               <Button className="mt-4 gap-2"><Coffee className="w-4 h-4" /> Új elem hozzáadása</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Munkarend Sablonok</CardTitle>
              <CardDescription>Rendelj hozzá munkarendet a dolgozókhoz az időszámításhoz.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="p-4 border rounded-md flex justify-between items-center">
                   <div>
                     <p className="font-semibold">Normál (H-P, 8 óra)</p>
                     <p className="text-sm text-muted-foreground">08:00 - 16:30 (30p ebédidő)</p>
                   </div>
                   <Button variant="ghost" size="sm">Szerkesztés</Button>
                 </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6 outline-none">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">Szervezet és Munkakörök</h3>
              <p className="text-muted-foreground mt-1">Vállalati struktúra és munkaköri leírások (FEOR) kezelése.</p>
            </div>
            <JobCreateDialog />
          </div>

          <Tabs defaultValue="jobs" className="space-y-6">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 mb-6">
              <TabsTrigger value="jobs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                <Briefcase className="w-4 h-4 mr-2" />
                Munkakör-katalógus
              </TabsTrigger>
              <TabsTrigger value="orgchart" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                <Building2 className="w-4 h-4 mr-2" />
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
                        const employeeCount = job.hr_dolgozo_adatlap?.length || 0;
                        return (
                          <TableRow key={job.id} className="hover:bg-muted/50 cursor-pointer">
                            <TableCell className="pl-6 font-medium text-primary">{job.megnevezes}</TableCell>
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
                              <Button variant="ghost" size="sm" className="text-xs">Leírás (PDF)</Button>
                              <Button variant="ghost" size="sm" className="text-xs text-primary">Szerkesztés</Button>
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

            <TabsContent value="orgchart" className="space-y-4 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle>Szervezeti Felépítés</CardTitle>
                  <CardDescription>Vizuális fa-struktúra a vezetők és beosztottak megjelenítéséhez.</CardDescription>
                </CardHeader>
                <CardContent>
                  <OrgChartTree employees={orgChartEmployees} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* --- ÚJ MUNKATÁRSAK TAB (BEÁGYAZOTT TÁBLÁZAT) --- */}
        <TabsContent value="munkatarsak" className="mt-0 outline-none space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" /> Munkatársak ({employees?.length || 0} fő)
                </CardTitle>
              </div>
              <CardDescription>
                A dolgozói nyilvántartás és a szerepkörök szerkesztése.
              </CardDescription>
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
                      <th className="px-6 py-4 font-semibold">Belépés</th>
                      <th className="px-6 py-4 text-right font-semibold">Műveletek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employees?.map((emp) => {
                      const nev = emp.felhasznalo_profil?.nev || "Ismeretlen"
                      const initials = nev.substring(0,2).toUpperCase()
                      const munkakor = emp.hr_munkakor?.megnevezes || "Nincs beállítva"
                      const egyseg = (emp.felhasznalo_profil as any)?.szervezeti_egyseg?.nev || "Központ"
                      const szerepkor = emp.felhasznalo_profil?.szerepkor || "Ismeretlen"
                      const belepes = emp.belepes_datuma ? new Date(emp.belepes_datuma).toLocaleDateString("hu-HU") : "-"

                      // Szerepkör badge színezés és fordítás
                      let roleColor = "bg-secondary text-secondary-foreground"
                      let roleName = "Ismeretlen"
                      if (szerepkor === "admin") {
                        roleColor = "bg-destructive/10 text-destructive border-destructive/20 border"
                        roleName = "Rendszergazda (Admin)"
                      } else if (szerepkor === "hr_vezeto") {
                        roleColor = "bg-primary/10 text-primary border-primary/20 border"
                        roleName = "Vezető (Manager)"
                      } else if (szerepkor === "hr_munkatars") {
                        roleColor = "bg-primary/10 text-primary border-primary/20 border"
                        roleName = "HR Munkatárs"
                      } else if (szerepkor === "munkavallalo") {
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
                            {belepes}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <EmployeeEditDialog employee={emp} jobs={jobs || []} />
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

      </Tabs>
    </div>
  )
}
