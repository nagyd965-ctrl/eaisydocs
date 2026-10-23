import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCard } from "@/components/kpi-card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { AssignEmployeeDialog } from "@/components/hr/assign-employee-dialog"
import { JobDescriptionUpload } from "@/components/hr/job-description-upload"
import { JobEditDialog } from "@/components/hr/job-edit-dialog"
import { JobProfileTasksSection } from "./job-profile-tasks-section"
import { JobAssignedEmployeesTable } from "@/components/hr/job-assigned-employees-table"

export default async function JobProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Biztonsági ellenőrzés (HR modul hozzáférés)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("elerheto_modulok, hr_szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.elerheto_modulok.includes("hr")) {
    redirect("/dashboard")
  }

  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)

  // Munkakör és szervezeti egységek lekérése
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
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-muted-foreground">Munkakör nem található</h2>
        <Link href="/hr/organization?tab=jobs">
          <Button variant="outline" size="sm">Vissza a munkakör-katalógushoz</Button>
        </Link>
      </div>
    )
  }

  // Jelenleg ebben a munkakörben dolgozók lekérése profil avatarral
  const { data: beosztasok } = await admin
    .from("hr_beosztas")
    .select(`
      hr_jogviszony (
        belepes_datuma,
        hr_dolgozo_adatlap (
          id,
          felhasznalo_profil (id, nev, hr_szerepkor, avatar_url)
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
      id: dolgozo?.id || "",
      profilId: profil?.id || dolgozo?.id || "",
      nev: profil?.nev || "Névtelen",
      avatarUrl: profil?.avatar_url || null,
      hr_szerepkor: profil?.hr_szerepkor || null,
      belepes_datuma: jogviszony?.belepes_datuma || null
    }
  }).filter(e => e.id).filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i) || []

  // Elérhető dolgozók a hozzárendeléshez
  const { data: allEmployees } = await admin
    .from("hr_dolgozo_adatlap")
    .select(`
      id,
      felhasznalo_profil (id, nev)
    `)

  const assignedEmployeeIds = employees.map(e => e.id)
  const availableEmployees = allEmployees
    ?.filter(e => !assignedEmployeeIds.includes(e.id))
    .map(e => {
      const profil = Array.isArray(e.felhasznalo_profil) ? e.felhasznalo_profil[0] : e.felhasznalo_profil
      return {
        id: e.id,
        felhasznalo_profil: {
          nev: profil?.nev || "Névtelen"
        }
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
    <div className="space-y-6 pb-10">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/hr/organization" className="hover:text-foreground transition-colors">Szervezeti felépítés</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/hr/organization?tab=jobs" className="hover:text-foreground transition-colors">Munkakör-katalógus</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{job.megnevezes}</span>
      </div>

      {/* ── Fejléc ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/hr/organization?tab=jobs">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{job.megnevezes}</h1>
              {job.besorolasi_szint && (
                <Badge variant="outline" className="text-xs font-normal">
                  {job.besorolasi_szint}
                </Badge>
              )}
              {orgUnitNev && (
                <Badge variant="secondary" className="text-xs font-normal bg-muted">
                  {orgUnitNev}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {orgUnitNev && job.hr_szervezeti_egyseg?.id ? (
                <>Szervezeti egység: <Link href={`/hr/orgunit/${job.hr_szervezeti_egyseg.id}`} className="text-primary hover:underline">{orgUnitNev}</Link></>
              ) : (
                "Nincs szervezeti egységhez rendelve"
              )}
              {job.feor_kod ? ` • FEOR-08: ${job.feor_kod}` : ""}
            </p>
          </div>
        </div>

        {/* Fejléc Műveletek */}
        {isHrOrAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <JobEditDialog
              job={job}
              orgUnits={orgUnits || []}
              initialTab="general"
              trigger={
                <Button variant="outline" size="sm">
                  Munkakör szerkesztése
                </Button>
              }
            />
            <AssignEmployeeDialog jobId={job.id} availableEmployees={availableEmployees} />
          </div>
        )}
      </div>

      {/* ── Statisztikai Kártyák (Linear Flat KPI Grid – Kattintható gyorsszerkesztéssel) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isHrOrAdmin ? (
          <AssignEmployeeDialog
            jobId={job.id}
            availableEmployees={availableEmployees}
            trigger={
              <div className="h-full cursor-pointer group">
                <KpiCard
                  label="Hozzárendelt dolgozó"
                  value={employees.length}
                  className="group-hover:border-primary/40 transition-colors"
                />
              </div>
            }
          />
        ) : (
          <KpiCard
            label="Hozzárendelt dolgozó"
            value={employees.length}
          />
        )}

        {isHrOrAdmin ? (
          <JobEditDialog
            job={job}
            orgUnits={orgUnits || []}
            initialTab="general"
            trigger={
              <KpiCard
                label="Szervezeti egység"
                value={orgUnitNev || "Nincs rendelve"}
                className="hover:border-primary/40 transition-colors"
              />
            }
          />
        ) : (
          <KpiCard
            label="Szervezeti egység"
            value={orgUnitNev || "Nincs rendelve"}
          />
        )}

        {isHrOrAdmin ? (
          <JobEditDialog
            job={job}
            orgUnits={orgUnits || []}
            initialTab="general"
            trigger={
              <KpiCard
                label="FEOR-08 Foglalkozás"
                value={job.feor_kod || "—"}
                className="hover:border-primary/40 transition-colors"
              />
            }
          />
        ) : (
          <KpiCard
            label="FEOR-08 Foglalkozás"
            value={job.feor_kod || "—"}
          />
        )}

        {isHrOrAdmin ? (
          <JobEditDialog
            job={job}
            orgUnits={orgUnits || []}
            initialTab="general"
            trigger={
              <KpiCard
                label="Besorolási szint"
                value={job.besorolasi_szint || "Általános"}
                className="hover:border-primary/40 transition-colors"
              />
            }
          />
        ) : (
          <KpiCard
            label="Besorolási szint"
            value={job.besorolasi_szint || "Általános"}
          />
        )}
      </div>

      {/* ── Fő tartalom – Tabs ── */}
      <Tabs defaultValue="dolgozok" className="space-y-4">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0">
          <TabsTrigger
            value="dolgozok"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-5 py-3 gap-2"
          >
            Dolgozók
            <Badge variant="secondary" className="ml-1 font-normal text-xs">{employees.length}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="profil"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-5 py-3 gap-2"
          >
            Munkaköri Profil & Feladatok
          </TabsTrigger>
          <TabsTrigger
            value="munkavedelem"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-5 py-3 gap-2"
          >
            Munkavédelem & Egészségügy
          </TabsTrigger>
          <TabsTrigger
            value="dokumentum"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-5 py-3 gap-2"
          >
            Hivatalos Munkaköri Leírás
            <Badge variant="secondary" className="ml-1 font-normal text-xs">{leirasVerziok?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Dolgozók Tab ── */}
        <TabsContent value="dolgozok" className="outline-none">
          <JobAssignedEmployeesTable
            jobId={job.id}
            employees={employees}
            isHrOrAdmin={isHrOrAdmin}
            availableEmployees={availableEmployees}
          />
        </TabsContent>

        {/* ── 2. Munkaköri Profil & Feladatok Tab ── */}
        <TabsContent value="profil" className="space-y-6 outline-none">
          {/* Munkaköri Alapadatok Card */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Munkaköri Törzs- és Minősítési Adatok</CardTitle>
                <CardDescription className="text-xs">
                  Szervezeti hovatartozás, hivatalos megnevezés, KSH FEOR besorolás és karrierszint.
                </CardDescription>
              </div>
              {isHrOrAdmin && (
                <JobEditDialog
                  job={job}
                  orgUnits={orgUnits || []}
                  initialTab="general"
                  trigger={
                    <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                      Alapadatok szerkesztése
                    </Button>
                  }
                />
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Munkakör Neve</span>
                  <p className="font-medium text-sm text-foreground">{job.megnevezes}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Szervezeti Egység</span>
                  <p className="font-medium text-sm text-foreground">
                    {orgUnitNev ? (
                      <Link href={`/hr/orgunit/${job.hr_szervezeti_egyseg?.id}`} className="text-primary hover:underline">
                        {orgUnitNev}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">— Nincs hozzárendelve —</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">FEOR-08 Foglalkozás</span>
                  <p className="font-medium text-sm text-foreground tabular-nums">
                    {job.feor_kod ? job.feor_kod : <span className="text-muted-foreground">— Nincs megadva —</span>}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Besorolási Szint</span>
                  <p className="font-medium text-sm text-foreground">
                    {job.besorolasi_szint ? job.besorolasi_szint : <span className="text-muted-foreground">— Nincs szint —</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dinamikus Feladatok és Kompetenciák (Közvetlen inline hozzáadás & törlés + kezelés) */}
          <JobProfileTasksSection
            job={job}
            orgUnits={orgUnits || []}
            isHrOrAdmin={isHrOrAdmin}
            initialTasks={feladatok}
            initialCompetencies={kompetenciak}
          />
        </TabsContent>

        {/* ── 3. Munkavédelem & Egészségügy Tab ── */}
        <TabsContent value="munkavedelem" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kockázatértékelés (Munkavédelem) */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Munkavédelem és Kockázatértékelés</CardTitle>
                  <CardDescription className="text-xs">Munkaköri kockázatok és kötelező védőfelszerelések.</CardDescription>
                </div>
                {isHrOrAdmin && (
                  <JobEditDialog
                    job={job}
                    orgUnits={orgUnits || []}
                    initialTab="safety"
                    trigger={
                      <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                        Munkavédelem szerkesztése
                      </Button>
                    }
                  />
                )}
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Bejelentett Kockázat</span>
                  <p className="text-sm font-medium text-foreground">
                    {job.kockazat_tipusa || "Nincs különleges munkavédelmi kockázat rögzítve."}
                  </p>
                </div>
                <div className="space-y-1 pt-3 border-t">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Védőeszköz Igény</span>
                  <p className="text-sm font-medium text-foreground">
                    {job.vedoeszkoz_igeny || "Nem igényel speciális egyéni védőeszközt."}
                  </p>
                </div>
                {isHrOrAdmin && !job.kockazat_tipusa && !job.vedoeszkoz_igeny && (
                  <div className="pt-2">
                    <JobEditDialog
                      job={job}
                      orgUnits={orgUnits || []}
                      initialTab="safety"
                      trigger={
                        <Button variant="outline" size="sm" className="text-xs">
                          + Kockázat és védőeszköz megadása
                        </Button>
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Kötelező Orvosi Vizsgálat */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Foglalkozás-egészségügyi Alkalmasság</CardTitle>
                  <CardDescription className="text-xs">Előírt orvosi vizsgálatok és gyakoriság.</CardDescription>
                </div>
                {isHrOrAdmin && (
                  <JobEditDialog
                    job={job}
                    orgUnits={orgUnits || []}
                    initialTab="safety"
                    trigger={
                      <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                        Orvosi előírás szerkesztése
                      </Button>
                    }
                  />
                )}
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vizsgálat típusa:</span>
                  <Badge variant="outline" className="font-normal text-xs">
                    {job.orvosi_vizsgalat_tipus || "Alapvizsgálat"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm text-muted-foreground">Ismétlés gyakorisága:</span>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {job.orvosi_vizsgalat_gyakorisag_ho ? `Minden ${job.orvosi_vizsgalat_gyakorisag_ho} hónapban` : "Időszakos felülvizsgálat szerint"}
                  </span>
                </div>
                {isHrOrAdmin && !job.orvosi_vizsgalat_tipus && !job.orvosi_vizsgalat_gyakorisag_ho && (
                  <div className="pt-2">
                    <JobEditDialog
                      job={job}
                      orgUnits={orgUnits || []}
                      initialTab="safety"
                      trigger={
                        <Button variant="outline" size="sm" className="text-xs">
                          + Orvosi vizsgálat beállítása
                        </Button>
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── 4. Hivatalos Munkaköri Leírás Tab ── */}
        <TabsContent value="dokumentum" className="space-y-4 outline-none">
          <Card className="border-border">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base font-semibold">Hivatalos Munkaköri Leírás Dokumentum</CardTitle>
              <CardDescription className="text-xs">
                Verzionált dokumentumtár — a dolgozók ezt a dokumentumot kapják meg átvételre és elektronikus nyugtázásra.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <JobDescriptionUpload
                munkakorId={job.id}
                job={job}
                orgUnitNev={orgUnitNev}
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
