import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { WorkplaceTab } from "./tabs/WorkplaceTab"
import { QualificationTab } from "./tabs/QualificationTab"
import { StudyContractTab } from "./tabs/StudyContractTab"
import { MedicalTab } from "./tabs/MedicalTab"
import { DisciplinaryTab } from "./tabs/DisciplinaryTab"
import { AwardsTab } from "./tabs/AwardsTab"
import { PersonalDataTab } from "./tabs/PersonalDataTab"
import { GeneralPersonalInfoTab } from "./tabs/GeneralPersonalInfoTab"
import { EmploymentTab } from "./tabs/EmploymentTab"
import { LeaveTab } from "./tabs/LeaveTab"
import { CafeteriaTab } from "./tabs/CafeteriaTab"
import { AttendanceTab } from "./tabs/AttendanceTab"
import { AuditLogTab } from "./tabs/AuditLogTab"
import { AddOffboardingDialog } from "@/components/hr/add-offboarding-dialog"
import { UserMinus } from "lucide-react"
import { IDPTab } from "./tabs/IDPTab"
import { SafetyTrainingEmployeeCard } from "@/components/hr/safety-training-employee-card"
import { PayslipsTab } from "./tabs/PayslipsTab"
import { OfficialDocumentsTab } from "./tabs/OfficialDocumentsTab"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Get current logged in user (RBAC) and scoped role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const activeCompanyId = await getActiveCompanyIdServer()
  const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  const currentHrRole = scopedRoles.hrRole || currentUserProfile?.hr_szerepkor || "munkavallalo"
  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin", "rendszergazda"].includes(currentHrRole)
  const isPayroll = currentHrRole === "berugyi"

  // 2. Lekérjük a profil adatokat
  const { data: profile, error } = await supabase
    .from("felhasznalo_profil")
    .select(`
      id,
      nev,
      hr_szerepkor,
      kozvetlen_vezeto_id,
      szervezeti_egyseg_id,
      hr_szervezeti_egyseg ( nev ),
      hr_dolgozo_adatlap ( 
        *,
        hr_tavollet ( * ),
        hr_elozo_munkahely ( * ),
        hr_kepzettseg ( * ),
        hr_tanulmanyi_szerzodes ( * ),
        hr_orvosi_vizsgalat ( * ),
        hr_fegyelmi ( * ),
        hr_kituntetes ( * ),
        hr_jogviszony (
          *,
          hr_beosztas (
            *,
            munkakor: hr_munkakor ( * )
          )
        )
      )
    `)
    .eq("id", resolvedParams.id)
    .single()

  const isSelf = user.id === resolvedParams.id
  const isSubordinate = profile?.kozvetlen_vezeto_id === user.id
  const isManager = currentHrRole === 'vezeto' && isSubordinate
  const isAllowed = isHrOrAdmin || isPayroll || isSelf || isManager || ["auditor", "munkavedelmi"].includes(currentHrRole)

  if (profile && !isAllowed) {
    redirect("/hr/self-service/profile")
  }

  // 3. Lekérjük a választható munkaköröket
  const { data: munkakorok } = await supabase
    .from("hr_munkakor")
    .select("id, megnevezes")
    .order("megnevezes")

  let vezetoNev = ""
  if (profile?.kozvetlen_vezeto_id) {
    const { data: vData } = await supabase
      .from("felhasznalo_profil")
      .select("nev")
      .eq("id", profile.kozvetlen_vezeto_id)
      .maybeSingle()
    if (vData?.nev) {
      vezetoNev = vData.nev
    } else {
      const { data: aData } = await supabase
        .from("hr_dolgozo_adatlap")
        .select("felhasznalo_profil(nev)")
        .eq("id", profile.kozvetlen_vezeto_id)
        .maybeSingle()
      if (aData?.felhasznalo_profil) {
        vezetoNev = (aData.felhasznalo_profil as any).nev || ""
      }
    }
  }

  const { data: hrDocumentsList } = await supabase
    .from("hr_dokumentum")
    .select("*")
    .eq("dolgozo_id", resolvedParams.id)
    .order("created_at", { ascending: false })

  // Munkavédelmi és tűzvédelmi oktatások lekérése
  const { data: safetyTrainingsData } = await supabase
    .from("hr_munkavedelmi_oktatas")
    .select(`
      id,
      dolgozo_id,
      oktatas_tipusa,
      oktatas_datuma,
      ervenyesseg_vege,
      oktato_neve,
      oktato_beosztasa,
      tematika,
      megjegyzes,
      dokumentum_id,
      hr_dokumentum:dokumentum_id (
        id,
        nev,
        url,
        iktatoszam,
        ugyirat_id
      )
    `)
    .eq("dolgozo_id", resolvedParams.id)
    .order("oktatas_datuma", { ascending: false })

  // Aláírt URL-ek generálása a privát fájlokhoz (eredeti és aláírt példány)
  const hrDocuments = await Promise.all(
    (hrDocumentsList || []).map(async (doc) => {
      let signedUrl = doc.url
      let alairtSignedUrl: string | null = null

      if (doc.url) {
        const { data } = await supabase.storage.from("irat_files").createSignedUrl(doc.url, 3600)
        signedUrl = data?.signedUrl || doc.url
      }

      if (doc.alairt_fajl_url) {
        const { data: aData } = await supabase.storage.from("irat_files").createSignedUrl(doc.alairt_fajl_url, 3600)
        alairtSignedUrl = aData?.signedUrl || doc.alairt_fajl_url
      }

      return {
        ...doc,
        signedUrl,
        alairtSignedUrl,
        displayUrl: alairtSignedUrl || signedUrl,
      }
    })
  )

  if (error) {
    console.error("DB Query error:", error)
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Hiba: Dolgozó nem található</h2>
        <p className="mt-2 text-muted-foreground">ID: {resolvedParams.id}</p>
        <Link href="/hr/admin">
          <Button className="mt-4">Vissza a Munkaasztalra</Button>
        </Link>
      </div>
    )
  }

  const adatlap = profile?.hr_dolgozo_adatlap as any

  // Munkakör adatok és legfrissebb hivatalos munkaköri leírás verzió feloldása
  const jogviszonyok = adatlap?.hr_jogviszony || []
  const currentJogviszony = jogviszonyok.find((j: any) => !j.kilepes_datuma) || jogviszonyok[0]
  const beosztasok = currentJogviszony?.hr_beosztas || []
  const sortedBeosztasok = [...beosztasok].sort((a: any, b: any) => new Date(b.ervenyes_tol).getTime() - new Date(a.ervenyes_tol).getTime())
  const currentBeosztas = sortedBeosztasok.find((b: any) => !b.ervenyes_ig || new Date(b.ervenyes_ig) >= new Date()) || sortedBeosztasok[0]
  let activeMunkakor = currentBeosztas?.munkakor || null
  const activeMunkakorId = currentBeosztas?.munkakor_id || adatlap?.munkakor_id || null

  if (activeMunkakorId && !activeMunkakor) {
    const { data: jData } = await supabase
      .from("hr_munkakor")
      .select("*")
      .eq("id", activeMunkakorId)
      .maybeSingle()
    activeMunkakor = jData
  }

  let latestJobVersion = null
  if (activeMunkakorId) {
    const { data: vData } = await supabase
      .from("hr_munkakor_leiras_verzio")
      .select("*")
      .eq("munkakor_id", activeMunkakorId)
      .order("verzio_szam", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (vData?.fajl_path) {
      const { data: sData } = await supabase.storage.from("irat_files").createSignedUrl(vData.fajl_path, 3600)
      latestJobVersion = {
        ...vData,
        signedUrl: sData?.signedUrl || `/api/hr/download-document?path=${encodeURIComponent(vData.fajl_path)}&bucket=irat_files`
      }
    } else {
      latestJobVersion = vData
    }
  }

  const existingJobDoc = hrDocuments?.find((d: any) => 
    d.kategoria === "Munkaköri leírás" || d.nev?.toLowerCase().includes("munkaköri leírás")
  ) || null

  // Cafeteria adatok
  const currentYear = new Date().getFullYear()
  
  const { data: cafeteriaKeret } = await supabase
    .from("hr_cafeteria_keret")
    .select("*")
    .eq("dolgozo_id", resolvedParams.id)
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
    .eq("dolgozo_id", resolvedParams.id)
    .eq("ev", currentYear)

  // Bérpapírok lekérése (biztonság: HR/Admin, Bérügyi, Auditor vagy a dolgozó saját maga férhet hozzá)
  const canViewSalary = isHrOrAdmin || isPayroll || isSelf || currentHrRole === "auditor"
  let employeePayslips: any[] = []
  if (canViewSalary) {
    const { data: pData } = await supabase
      .from("hr_berpapir")
      .select("*")
      .eq("dolgozo_id", resolvedParams.id)
      .order("ev", { ascending: false })
      .order("honap", { ascending: false })

    employeePayslips = (pData || []).filter((p: any) => isHrOrAdmin || isPayroll || p.statusz === "kikuldve" || p.statusz === "atveve")
  }

  const roleMap: Record<string, string> = {
    admin: "Rendszergazda",
    hr_vezeto: "HR Vezető",
    hr_munkatars: "HR Munkatárs",
    munkavallalo: "Munkavállaló",
    vezeto: "Vezető",
    ugyintezo: "Fejlesztő / Ügyintéző"
  }
  const displayRole = roleMap[profile.hr_szerepkor] || profile.hr_szerepkor

  // Offboarding státusz lekérése a dolgozóhoz
  const { data: employeeOffboarding } = await supabase
    .from("hr_offboarding")
    .select("id, statusz, kilepes_datuma, utolso_munkaban_toltott_nap, megszunes_modja")
    .eq("dolgozo_id", resolvedParams.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const isOffboardingActive = employeeOffboarding?.statusz === "folyamatban"
  const isOffboardingClosed = employeeOffboarding?.statusz === "lezart"
  const isInactive = profile.hr_szerepkor === "inaktiv" || !!adatlap?.munkaviszony_vege || isOffboardingClosed

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/hr/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center flex-wrap gap-2.5">
              {profile.nev}
              {isOffboardingActive ? (
                <Link href="/hr/offboarding">
                  <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 transition-colors gap-1.5 cursor-pointer">
                    <UserMinus className="w-3.5 h-3.5" />
                    Kiléptetés folyamatban (Kilépés: {employeeOffboarding.kilepes_datuma || "Nincs megadva"})
                  </Badge>
                </Link>
              ) : isInactive ? (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border gap-1.5">
                  Kilépett ({employeeOffboarding?.kilepes_datuma || adatlap?.munkaviszony_vege || "Inaktív"})
                </Badge>
              ) : (
                <Badge variant="default" className="text-xs">Aktív</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              {displayRole}
            </p>
          </div>
        </div>

        {/* Műveleti sáv (pl. Kiléptetés indítása HR-nek) */}
        {isHrOrAdmin && (
          <div className="flex items-center gap-2">
            {isOffboardingActive ? (
              <Link href="/hr/offboarding">
                <Button variant="outline" size="sm" className="gap-2 text-xs border-warning/40 text-warning hover:bg-warning/10">
                  <UserMinus className="h-3.5 w-3.5" />
                  Offboarding feladatok kezelése
                </Button>
              </Link>
            ) : !isInactive ? (
              <AddOffboardingDialog
                employees={[]}
                preselectedEmployeeId={profile.id}
                preselectedEmployeeName={profile.nev}
                triggerButton={
                  <Button variant="outline" size="sm" className="gap-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <UserMinus className="h-3.5 w-3.5" />
                    Kiléptetés indítása
                  </Button>
                }
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alap adatok</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Teljes Név</p>
              <p className="font-medium">{profile.nev}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Munkakör / Szerepkör</p>
              <p className="font-medium">{displayRole}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Letisztult 4-füles adatlap */}
      <Tabs defaultValue="szemelyes" className="w-full mt-8">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-nowrap overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden gap-x-1">
          <TabsTrigger value="szemelyes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">Személyes adatok</TabsTrigger>
          <TabsTrigger value="szakmai_hatter" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">Szakmai háttér</TabsTrigger>
          <TabsTrigger value="munkaviszony" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">Munkaviszony</TabsTrigger>
          <TabsTrigger value="tavollet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">Távollét</TabsTrigger>
          <TabsTrigger value="jelenlet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">Jelenlét</TabsTrigger>
          <TabsTrigger value="cafeteria" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">Cafeteria</TabsTrigger>
          <TabsTrigger value="idp" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">Fejlesztési tervek</TabsTrigger>
          {canViewSalary && (
            <TabsTrigger value="berpapirok" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">
              Bérpapírok
            </TabsTrigger>
          )}
          {(isHrOrAdmin || isPayroll || ["auditor", "munkavedelmi"].includes(currentHrRole)) && (
            <TabsTrigger value="bizalmas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">
              Bizalmas HR adatok
            </TabsTrigger>
          )}
          <TabsTrigger value="dokumentumok" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">
            Hivatalos dokumentumok
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3.5 py-2.5 text-sm font-medium whitespace-nowrap">Előzmények</TabsTrigger>
        </TabsList>

        <div className="pt-6">
          {/* Új: Cafeteria */}
          <TabsContent value="cafeteria" className="mt-0 outline-none">
            <CafeteriaTab 
              employeeId={profile.id} 
              year={currentYear} 
              budgetData={cafeteriaKeret}
              catalog={cafeteriaKatalogus || []}
              choices={cafeteriaValasztasok || []}
            />
          </TabsContent>

          {/* Fejlesztési tervek */}
          <TabsContent value="idp" className="mt-0 outline-none">
            <IDPTab dolgozoId={profile.id} isManagerView={isHrOrAdmin} />
          </TabsContent>

          {/* Új: Audit */}
          <TabsContent value="audit" className="mt-0 outline-none">
            <AuditLogTab employeeId={profile.id} />
          </TabsContent>

          {/* Új: Távollét */}
          <TabsContent value="tavollet" className="mt-0 outline-none">
            <LeaveTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} leaves={adatlap?.hr_tavollet || []} adatlap={adatlap} />
          </TabsContent>

          {/* Új: Jelenlét */}
          <TabsContent value="jelenlet" className="mt-0 outline-none">
            <AttendanceTab employeeId={profile.id} />
          </TabsContent>

          {/* 1. Személyes Adatok */}
          <TabsContent value="szemelyes" className="mt-0 outline-none space-y-6">
            <GeneralPersonalInfoTab 
              employeeId={profile.id} 
              isHrOrAdmin={isHrOrAdmin} 
              adatlap={adatlap} 
            />

            <PersonalDataTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin || isPayroll} />
          </TabsContent>

          {/* 2. Szakmai Háttér (Összevont) */}
          <TabsContent value="szakmai_hatter" className="mt-0 outline-none space-y-12">
            <div className="space-y-4">
              <AwardsTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_kituntetes || []} />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Képzettségek és Végzettségek</h2>
              <QualificationTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_kepzettseg || []} />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Előző Munkahelyek</h2>
              <WorkplaceTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_elozo_munkahely || []} />
            </div>
          </TabsContent>

          {/* 3. Munkaviszony */}
          <TabsContent value="munkaviszony" className="mt-0 outline-none space-y-12">
            {/* Jogviszony és Munkarend */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Jogviszony és Munkarend</h2>
              <EmploymentTab 
                employeeId={profile.id} 
                isHrOrAdmin={isHrOrAdmin} 
                loggedInUserId={user.id}
                currentUserRole={currentUserProfile?.hr_szerepkor || "munkavallalo"}
                adatlap={adatlap} 
                jogviszonyok={adatlap?.hr_jogviszony || []}
                munkakorok={munkakorok || []}
                vezetoNev={vezetoNev}
                activeMunkakor={activeMunkakor}
                latestJobVersion={latestJobVersion}
              />
            </div>

            {/* Tanulmányi Szerződés */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Tanulmányi Szerződések</h2>
              <StudyContractTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_tanulmanyi_szerzodes || []} />
            </div>
          </TabsContent>

          {/* Havi Bérpapírok & Elszámolások (Mt. 155. §) */}
          {canViewSalary && (
            <TabsContent value="berpapirok" className="mt-0 outline-none">
              <PayslipsTab
                employeeId={profile.id}
                employeeName={profile.nev}
                isHrOrAdmin={isHrOrAdmin || isPayroll}
                initialPayslips={employeePayslips}
              />
            </TabsContent>
          )}

          {/* 4. Bizalmas HR Adatok (Összevont) */}
          {(isHrOrAdmin || isPayroll || ["auditor", "munkavedelmi"].includes(currentHrRole)) && (
            <TabsContent value="bizalmas" className="mt-0 outline-none space-y-12">
              {(isHrOrAdmin || ["auditor", "munkavedelmi"].includes(currentHrRole)) && (
                <>
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
                      Orvosi Alkalmassági Vizsgálatok
                    </h2>
                    <MedicalTab 
                      employeeId={profile.id} 
                      employeeName={profile.nev}
                      isHrOrAdmin={isHrOrAdmin || currentHrRole === "munkavedelmi"} 
                      currentUserRole={currentHrRole}
                      initialData={adatlap?.hr_orvosi_vizsgalat || []} 
                    />
                  </div>

                  {/* Munkavédelmi és Tűzvédelmi Oktatások */}
                  <div className="space-y-4">
                    <SafetyTrainingEmployeeCard
                      employeeId={profile.id}
                      employeeName={profile.nev}
                      munkakor={activeMunkakor?.megnevezes || null}
                      reszleg={(profile as any)?.hr_szervezeti_egyseg?.nev || null}
                      isHrOrAdmin={isHrOrAdmin || currentHrRole === "munkavedelmi"}
                      trainings={(safetyTrainingsData as any) || []}
                    />
                  </div>
                </>
              )}

              {(isHrOrAdmin || ["auditor"].includes(currentHrRole)) && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
                    Fegyelmi és Károkozási Ügyek (Mt. 56. §, 179. §)
                  </h2>
                  <DisciplinaryTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_fegyelmi || []} />
                </div>
              )}
            </TabsContent>
          )}

          {/* Hivatalos Dokumentumok */}
          <TabsContent value="dokumentumok" className="mt-0 outline-none">
            <OfficialDocumentsTab
              employee={profile}
              adatlap={adatlap}
              activeMunkakor={activeMunkakor}
              vezetoNev={vezetoNev}
              isHrOrAdmin={isHrOrAdmin}
              initialDocuments={(hrDocuments as any) || []}
              latestJobVersion={latestJobVersion}
              existingJobDoc={existingJobDoc}
            />
          </TabsContent>

        </div>
      </Tabs>
    </div>
  )
}
