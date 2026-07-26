import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Users, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AssignEmployeeOrgDialog } from "@/components/hr/assign-employee-org-dialog"
import { RemoveEmployeeOrgButton } from "@/components/hr/remove-employee-org-button"

export default async function OrgUnitProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

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

  const { data: orgUnit, error: orgUnitError } = await supabase
    .from("hr_szervezeti_egyseg")
    .select("*, parent:szulo_id(nev)")
    .eq("id", id)
    .single()

  if (orgUnitError || !orgUnit) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h2 className="text-2xl font-bold text-destructive mb-2">Szervezeti egység nem található</h2>
        <Link href="/hr/settings">
          <Button variant="outline">Vissza a beállításokhoz</Button>
        </Link>
      </div>
    )
  }

  // Dolgozók ebben az egységben
  const { data: employees } = await supabase
    .from("felhasznalo_profil")
    .select(`
      id,
      nev,
      email,
      hr_jogviszony!inner(
        belepes_datuma
      )
    `)
    .eq("hr_szervezeti_egyseg_id", id)

  // Elérhető dolgozók (akik nincsenek ebben az egységben, de regisztrált HR dolgozók)
  const { data: allEmployeesData } = await supabase
    .from("hr_dolgozo_adatlap")
    .select(`
      id,
      felhasznalo_profil!inner(id, nev)
    `)
  
  const assignedEmployeeIds = employees?.map(e => e.id) || []
  const availableEmployees = allEmployeesData?.map(emp => {
    const profil = Array.isArray(emp.felhasznalo_profil) ? emp.felhasznalo_profil[0] : emp.felhasznalo_profil;
    return {
      id: profil?.id || "",
      nev: profil?.nev || "Névtelen",
    }
  }).filter(e => !assignedEmployeeIds.includes(e.id)) || []

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      <div className="flex items-center gap-4 mb-2">
        <Link href="/hr/settings">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#02b8cc]" />
            {orgUnit.nev}
          </h1>
          <p className="text-muted-foreground">
            Szervezeti egység adatlapja és hozzárendelt dolgozók
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-1 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-lg">Alapadatok</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Megnevezés</p>
                <p className="text-base font-semibold">{orgUnit.nev}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Szülő Egység</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-normal text-sm">
                    {orgUnit.parent?.nev || "Nincs (Főszint)"}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Hozzárendelt Dolgozók</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {employees?.length || 0} fő
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="border-border shadow-sm h-full">
            <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  Hozzárendelt Dolgozók
                </CardTitle>
                <CardDescription>
                  Azok a munkatársak, akik ebbe a szervezeti egységbe vannak beosztva.
                </CardDescription>
              </div>
              <AssignEmployeeOrgDialog orgUnitId={orgUnit.id} availableEmployees={availableEmployees} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="pl-6">Név</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Belépés Dátuma</TableHead>
                    <TableHead className="text-right pr-6">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees && employees.length > 0 ? employees.map((emp) => {
                    const belD = Array.isArray(emp.hr_jogviszony) && emp.hr_jogviszony.length > 0 
                      ? emp.hr_jogviszony[0].belepes_datuma 
                      : "-";
                      
                    return (
                      <TableRow key={emp.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="pl-6 font-medium">
                          <Link href={`/hr/employee/${emp.id}`} className="hover:underline text-primary">
                            {emp.nev}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                        <TableCell>{belD}</TableCell>
                        <TableCell className="text-right pr-6">
                          <RemoveEmployeeOrgButton orgUnitId={orgUnit.id} employeeId={emp.id} employeeName={emp.nev} />
                        </TableCell>
                      </TableRow>
                    )
                  }) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                          <Users className="w-8 h-8 opacity-20" />
                          <p>Nincsenek dolgozók ebben a szervezeti egységben</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
