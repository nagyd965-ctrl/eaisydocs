import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AssignEmployeeDialog } from "@/components/hr/assign-employee-dialog"
import { RemoveEmployeeButton } from "./remove-employee-button"
import { JobDescriptionUpload } from "@/components/hr/job-description-upload"
import { JobEditDialog } from "@/components/hr/job-edit-dialog"

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

  // Munkakör és szervezeti egységek párhuzamos lekérése
  const [{ data: job, error: jobError }, { data: orgUnits }] = await Promise.all([
    supabase
      .from("hr_munkakor")
      .select("*, hr_szervezeti_egyseg(id, nev)")
      .eq("id", id)
      .single(),
    supabase
      .from("hr_szervezeti_egyseg")
      .select("id, nev")
      .order("nev")
  ])

  if (jobError || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h2 className="text-2xl font-semibold text-destructive mb-2">Munkakör nem található</h2>
        <Link href="/hr/organization?tab=jobs">
          <Button variant="outline">Vissza a munkakörökhöz</Button>
        </Link>
      </div>
    )
  }

  // Jelenleg ebben a munkakörben dolgozók lekérése
  const { data: beosztasok } = await supabase
    .from("hr_beosztas")
    .select(`
      hr_jogviszony (
        belepes_datuma,
        hr_dolgozo_adatlap (
          id,
          felhasznalo_profil (nev)
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
  }).filter(e => e.id).filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i) || []

  // Elérhető dolgozók a hozzárendeléshez
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

  // Munkaköri leírás verziók lekérése
  const { data: leirasVerziok } = await supabase
    .from("hr_munkakor_leiras_verzio")
    .select("*")
    .eq("munkakor_id", id)
    .order("verzio_szam", { ascending: false })

  // Parse JSONB arrays
  const feladatok: string[] = Array.isArray(job.feladatok_es_hataskorok) ? job.feladatok_es_hataskorok : []
  const kompetenciak: string[] = Array.isArray(job.elvart_kompetenciak) ? job.elvart_kompetenciak : []

  const orgUnitNev = job.hr_szervezeti_egyseg?.nev || null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Vissza gomb és Fejléc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Link href="/hr/organization?tab=jobs">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{job.megnevezes}</h1>
              {job.besorolasi_szint && (
                <Badge variant="outline" className="text-xs">
                  {job.besorolasi_szint}
                </Badge>
              )}
              {orgUnitNev && (
                <Badge variant="secondary" className="text-xs font-normal bg-muted">
                  {orgUnitNev}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-xs sm:text-sm">
              <span>Munkakör Adatlap</span>
              {job.feor_kod && <span>• FEOR: <strong>{job.feor_kod}</strong></span>}
              <span>• {employees.length} aktív munkatárs</span>
            </p>
          </div>
        </div>

        {/* Fejléc Művelet: Munkakör szerkesztése */}
        {isHrOrAdmin && (
          <div className="flex items-center gap-2">
            <JobEditDialog
              job={job}
              orgUnits={orgUnits || []}
              trigger={
                <Button variant="outline" size="sm">
                  Munkakör szerkesztése
                </Button>
              }
            />
          </div>
        )}
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 mb-6">
          <TabsTrigger value="employees" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
            Munkatársak ({employees?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
            Alapadatok & Leírás
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4 outline-none">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-semibold">Betöltött Pozíciók</CardTitle>
                <CardDescription>Azok a dolgozók, akik jelenleg ezt a munkakört látják el.</CardDescription>
              </div>
              {isHrOrAdmin && (
                <AssignEmployeeDialog jobId={job.id} availableEmployees={availableEmployees || []} />
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="compact-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Név</TableHead>
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
                      <TableCell>{emp.belepes_datuma ? new Date(emp.belepes_datuma).toLocaleDateString('hu-HU') : "-"}</TableCell>
                      {isHrOrAdmin && (
                        <TableCell className="text-right pr-6">
                          <RemoveEmployeeButton jobId={job.id} employeeId={emp.id} employeeName={emp.felhasznalo_profil?.nev} />
                        </TableCell>
                      )}
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={isHrOrAdmin ? 3 : 2} className="text-center py-8 text-muted-foreground">
                        Jelenleg nincs dolgozó ebben a munkakörben.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6 outline-none">
          {/* Munkaköri Főtörzs Összegzés */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Munkaköri Törzs- és Minősítési Adatok</CardTitle>
              <CardDescription className="text-xs">
                Szervezeti hovatartozás, KSH FEOR besorolás és foglalkozás-egészségügyi paraméterek.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Szervezeti Egység</span>
                  <p className="font-medium text-sm text-foreground">
                    {orgUnitNev || "— Nincs hozzárendelve —"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">FEOR-08 Foglalkozás</span>
                  <p className="font-medium text-sm text-foreground">
                    {job.feor_kod ? (
                      <span className="tabular-nums font-semibold">{job.feor_kod}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Besorolási Szint</span>
                  <p className="font-medium text-sm text-foreground">
                    {job.besorolasi_szint || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Orvosi Gyakoriság</span>
                  <p className="font-medium text-sm text-foreground">
                    {job.orvosi_vizsgalat_gyakorisag_ho ? (
                      <span>{job.orvosi_vizsgalat_gyakorisag_ho} havonta</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Feladatok és Hatáskörök */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">
                Feladatok és Hatáskörök ({feladatok.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feladatok.length > 0 ? (
                <ul className="space-y-2">
                  {feladatok.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-semibold mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nincs rögzített feladat vagy hatáskör.</p>
              )}
            </CardContent>
          </Card>

          {/* Elvárt Kompetenciák */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">
                Elvárt Kompetenciák és Végzettség ({kompetenciak.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kompetenciak.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {kompetenciak.map((k, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">{k}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nincs rögzített kompetencia vagy végzettségi elvárás.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Kockázatértékelés + Védőeszköz */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold">
                  Kockázatértékelés (Munkavédelem)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {job.kockazat_tipusa ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Bejelentett Kockázat</span>
                    <p className="text-sm font-medium text-foreground">{job.kockazat_tipusa}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nincs különleges munkavédelmi kockázat rögzítve.</p>
                )}
                {job.vedoeszkoz_igeny && (
                  <div className="space-y-1 pt-2 border-t">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Védőeszköz Igény</span>
                    <p className="text-sm font-medium text-foreground">{job.vedoeszkoz_igeny}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orvosi Vizsgálat */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold">
                  Kötelező Orvosi Vizsgálat
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {job.orvosi_vizsgalat_tipus ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Típus:</span>
                      <Badge variant="outline">{job.orvosi_vizsgalat_tipus}</Badge>
                    </div>
                    {job.orvosi_vizsgalat_gyakorisag_ho && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Gyakoriság:</span>
                        <span className="text-sm font-medium">Minden {job.orvosi_vizsgalat_gyakorisag_ho} hónapban</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nincs kötelező orvosi vizsgálat megadva ehhez a munkakörhöz.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Munkaköri Leírás Dokumentum (verziókövetéssel) */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">
                Hivatalos Munkaköri Leírás
              </CardTitle>
              <CardDescription className="text-xs">Verzionált dokumentum — a dolgozók ezt kapják meg és nyugtázzák elektronikusan.</CardDescription>
            </CardHeader>
            <CardContent>
              <JobDescriptionUpload 
                munkakorId={job.id} 
                versions={leirasVerziok || []} 
                isHrOrAdmin={isHrOrAdmin} 
              />
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

    </div>
  )
}
