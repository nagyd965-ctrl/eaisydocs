import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Briefcase, Users, FileText, ChevronLeft, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AssignEmployeeDialog } from "@/components/hr/assign-employee-dialog"
import { removeEmployeeFromJob } from "./actions"
import { RemoveEmployeeButton } from "./remove-employee-button"

export default async function JobProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Biztonsági ellenőrzés (HR modul hozzáférés)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('elerheto_modulok, hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !profile.elerheto_modulok.includes("hr")) {
    redirect("/dashboard")
  }

  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)

  // Munkakör adatainak lekérése
  const { data: job, error: jobError } = await supabase
    .from("hr_munkakor")
    .select("*")
    .eq("id", id)
    .single()

  if (jobError || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h2 className="text-2xl font-bold text-destructive mb-2">Munkakör nem található</h2>
        <Link href="/hr/settings">
          <Button variant="outline">Vissza a beállításokhoz</Button>
        </Link>
      </div>
    )
  }

  // Jelenleg ebben a munkakörben dolgozók lekérése
  const { data: beosztasok } = await supabase
    .from("hr_beosztas")
    .select(`
      hr_jogviszony!inner (
        belepes_datuma,
        hr_dolgozo_adatlap!inner (
          id,
          felhasznalo_profil!inner (nev, email)
        )
      )
    `)
    .eq("munkakor_id", id)
    .is("ervenyes_ig", null)

  const employees = beosztasok?.map(b => {
    const jogviszony = Array.isArray(b.hr_jogviszony) ? b.hr_jogviszony[0] : b.hr_jogviszony
    const dolgozo = Array.isArray(jogviszony?.hr_dolgozo_adatlap) ? jogviszony?.hr_dolgozo_adatlap[0] : jogviszony?.hr_dolgozo_adatlap
    const profil = Array.isArray(dolgozo?.felhasznalo_profil) ? dolgozo?.felhasznalo_profil[0] : dolgozo?.felhasznalo_profil
    return {
      id: dolgozo?.id,
      belepes_datuma: jogviszony?.belepes_datuma,
      felhasznalo_profil: profil
    }
  }).filter(e => e.id) || []

  // Elérhető (más/nincs munkakörben lévő) dolgozók lekérése a hozzárendeléshez (egyszerűsítve)
  const { data: allEmployees } = await supabase
    .from("hr_dolgozo_adatlap")
    .select(`
      id,
      felhasznalo_profil(nev)
    `)
  
  const assignedEmployeeIds = employees.map(e => e.id)
  const availableEmployees = allEmployees?.filter(e => !assignedEmployeeIds.includes(e.id)).map(e => {
    return {
      id: e.id,
      felhasznalo_profil: Array.isArray(e.felhasznalo_profil) ? e.felhasznalo_profil[0] : e.felhasznalo_profil
    }
  }) || []

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Vissza gomb és Fejléc */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/hr/settings">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{job.megnevezes}</h1>
            {job.besorolasi_szint && (
              <Badge variant="outline" className="text-sm">
                {job.besorolasi_szint}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Munkakör Adatlap
            {job.feor_kod && <span>• FEOR: {job.feor_kod}</span>}
          </p>
        </div>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 mb-6">
          <TabsTrigger value="employees" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
            <Users className="w-4 h-4 mr-2" />
            Munkatársak ({employees?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
            <FileText className="w-4 h-4 mr-2" />
            Alapadatok & Leírás
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div>
                <CardTitle className="text-lg">Betöltött Pozíciók</CardTitle>
                <CardDescription>Azok a dolgozók, akik jelenleg ezt a munkakört látják el.</CardDescription>
              </div>
              {isHrOrAdmin && (
                <AssignEmployeeDialog jobId={job.id} availableEmployees={availableEmployees || []} />
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Név</TableHead>
                    <TableHead>Email cím</TableHead>
                    <TableHead>Belépés Dátuma</TableHead>
                    {isHrOrAdmin && <TableHead className="text-right pr-6">Művelet</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees && employees.length > 0 ? employees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-muted/50">
                      <TableCell className="pl-6 font-medium">
                        <Link href={`/hr/employee/${emp.id}`} className="hover:underline text-primary">
                          {emp.felhasznalo_profil?.nev || "Névtelen"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{(emp.felhasznalo_profil as any)?.email}</TableCell>
                      <TableCell>{emp.belepes_datuma ? new Date(emp.belepes_datuma).toLocaleDateString('hu-HU') : "-"}</TableCell>
                      {isHrOrAdmin && (
                        <TableCell className="text-right pr-6">
                          <RemoveEmployeeButton jobId={job.id} employeeId={emp.id} employeeName={emp.felhasznalo_profil?.nev} />
                        </TableCell>
                      )}
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={isHrOrAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">
                        Jelenleg nincs dolgozó ebben a munkakörben.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6 outline-none">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Kockázatértékelés (Munkavédelem)</CardTitle>
              </CardHeader>
              <CardContent>
                {job.kockazat_tipusa ? (
                  <div className="flex items-start gap-3 bg-muted/30 p-4 rounded-md border">
                    <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Bejelentett Kockázat</p>
                      <p className="text-sm text-muted-foreground mt-1">{job.kockazat_tipusa}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nincs különleges munkavédelmi kockázat rögzítve.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Hivatalos Munkaköri Leírás</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-md bg-muted/10">
                <FileText className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">Munkaköri leírás dokumentum</p>
                <p className="text-xs text-muted-foreground mb-4">A dolgozók ezt a dokumentumot fogják megkapni és elektronikusan aláírni.</p>
                <Button variant="outline" size="sm">Feltöltés (Hamarosan)</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}
