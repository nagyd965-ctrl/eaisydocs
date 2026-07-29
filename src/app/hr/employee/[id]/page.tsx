import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, User, ShieldAlert } from "lucide-react"
import { WorkplaceTab } from "./tabs/WorkplaceTab"
import { QualificationTab } from "./tabs/QualificationTab"
import { StudyContractTab } from "./tabs/StudyContractTab"
import { MedicalTab } from "./tabs/MedicalTab"
import { DisciplinaryTab } from "./tabs/DisciplinaryTab"
import { PersonalDataTab } from "./tabs/PersonalDataTab"
import { GeneralPersonalInfoTab } from "./tabs/GeneralPersonalInfoTab"
import { EmploymentTab } from "./tabs/EmploymentTab"
import { LeaveTab } from "./tabs/LeaveTab"
import { CafeteriaTab } from "./tabs/CafeteriaTab"
import { AttendanceTab } from "./tabs/AttendanceTab"
import { ContractGeneratorDialog } from "@/components/hr/contract-generator-dialog"
import { ManualUploadDialog } from "@/components/hr/manual-upload-dialog"
import { DeleteContractButton } from "@/components/hr/delete-contract-button"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Get current logged in user (RBAC)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin"].includes(currentUserProfile?.hr_szerepkor || "")

  // 2. Lekérjük a profil adatokat
  const { data: profile, error } = await supabase
    .from("felhasznalo_profil")
    .select(`
      id,
      nev,
      hr_szerepkor,
      kozvetlen_vezeto_id,
      hr_dolgozo_adatlap ( 
        *,
        hr_tavollet ( * ),
        hr_elozo_munkahely ( * ),
        hr_kepzettseg ( * ),
        hr_tanulmanyi_szerzodes ( * ),
        hr_orvosi_vizsgalat ( * ),
        hr_fegyelmi ( * ),
        hr_jogviszony (
          *,
          hr_beosztas (
            *,
            munkakor: hr_munkakor ( megnevezes )
          )
        )
      )
    `)
    .eq("id", resolvedParams.id)
    .single()

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
      .single()
    if (vData) vezetoNev = vData.nev
  }

  const { data: hrDocumentsList } = await supabase
    .from("hr_dokumentum")
    .select("*")
    .eq("dolgozo_id", resolvedParams.id)
    .order("created_at", { ascending: false })

  // Aláírt URL-ek generálása a privát fájlokhoz
  const hrDocuments = await Promise.all(
    (hrDocumentsList || []).map(async (doc) => {
      if (doc.url) {
        const { data } = await supabase.storage.from("irat_files").createSignedUrl(doc.url, 3600)
        return { ...doc, signedUrl: data?.signedUrl || doc.url }
      }
      return doc
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hr/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            {profile.nev}
            <Badge variant="default" className="text-sm">Aktív</Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile.hr_szerepkor === 'admin' ? 'Rendszergazda' : profile.hr_szerepkor === 'ugyintezo' ? 'Fejlesztő / Ügyintéző' : profile.hr_szerepkor}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Alap adatok
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Teljes Név</p>
              <p className="font-medium">{profile.nev}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Munkakör / Szerepkör</p>
              <p className="font-medium">{profile.hr_szerepkor}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Letisztult 4-füles adatlap */}
      <Tabs defaultValue="szemelyes" className="w-full mt-8">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-wrap gap-x-2 gap-y-2 pb-2">
          <TabsTrigger value="szemelyes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2">Személyes adatok</TabsTrigger>
          <TabsTrigger value="szakmai_hatter" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2">Szakmai háttér</TabsTrigger>
          <TabsTrigger value="munkaviszony_szerzodes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2">Munkaviszony & Szerződések</TabsTrigger>
          <TabsTrigger value="tavollet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2">Távollét</TabsTrigger>
          <TabsTrigger value="jelenlet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2">Jelenlét</TabsTrigger>
          <TabsTrigger value="cafeteria" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2">Cafeteria</TabsTrigger>
          {isHrOrAdmin && (
            <TabsTrigger value="bizalmas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-2">
              Bizalmas HR adatok <ShieldAlert className="ml-2 w-3 h-3 text-destructive" />
            </TabsTrigger>
          )}
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

          {/* Új: Távollét */}
          <TabsContent value="tavollet" className="mt-0 outline-none">
            <LeaveTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} leaves={adatlap?.hr_tavollet || []} />
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

            <PersonalDataTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} />
          </TabsContent>

          {/* 2. Szakmai Háttér (Összevont) */}
          <TabsContent value="szakmai_hatter" className="mt-0 outline-none space-y-12">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Előző Munkahelyek</h2>
              <WorkplaceTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_elozo_munkahely || []} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Képzettségek és Végzettségek</h2>
              <QualificationTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_kepzettseg || []} />
            </div>
          </TabsContent>

          {/* 3. Munkaviszony & Szerződések (Összevont) */}
          <TabsContent value="munkaviszony_szerzodes" className="mt-0 outline-none space-y-12">
            {/* Jogviszony (Jövőbeli) */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Jogviszony és Munkarend</h2>
              <EmploymentTab 
                employeeId={profile.id} 
                isHrOrAdmin={isHrOrAdmin} 
                adatlap={adatlap} 
                jogviszonyok={adatlap?.hr_jogviszony || []}
                munkakorok={munkakorok || []}
                vezetoNev={vezetoNev}
              />
            </div>

            {/* Generált / Feltöltött Dokumentumok */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Hivatalos Dokumentumok</h2>
                  <p className="text-sm text-muted-foreground mt-1">Szerződések idővonala és generálása.</p>
                </div>
                {isHrOrAdmin && (
                  <div className="flex gap-2">
                    <ManualUploadDialog employeeId={profile.id} />
                    <ContractGeneratorDialog employee={profile} adatlap={adatlap} />
                  </div>
                )}
              </div>

              <div className="border rounded-lg relative overflow-hidden bg-card">
                <div className="absolute left-8 top-0 bottom-0 w-px bg-border"></div>
                <div className="p-6 space-y-8">
                  {hrDocuments && hrDocuments.length > 0 ? hrDocuments.map((doc: any) => (
                    <div key={doc.id} className="flex gap-6 relative">
                      <div className="w-4 h-4 rounded-full bg-primary mt-1 relative z-10 outline outline-4 outline-background"></div>
                      <div className="flex-1 border rounded-lg p-4 bg-background hover:bg-muted/50 transition-colors shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-primary">{doc.nev}</h4>
                            <p className="text-sm text-muted-foreground mt-1">Kategória: {doc.kategoria || "Egyéb"}</p>
                            <p className="text-xs text-muted-foreground mt-2">Dátum: {new Date(doc.created_at).toLocaleString("hu-HU")}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.url && (
                              <PdfViewerDialog url={doc.signedUrl || doc.url} title={doc.nev} />
                            )}
                            {isHrOrAdmin && (
                              <DeleteContractButton documentId={doc.id} fileUrl={doc.url} dolgozoId={profile.id} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="pl-12 text-muted-foreground py-4">Még nincsenek generált vagy feltöltött dokumentumok.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Tanulmányi Szerződés */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Tanulmányi Szerződések</h2>
              <StudyContractTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_tanulmanyi_szerzodes || []} />
            </div>
          </TabsContent>

          {/* 4. Bizalmas HR Adatok (Összevont) */}
          {isHrOrAdmin && (
            <TabsContent value="bizalmas" className="mt-0 outline-none space-y-12">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-destructive flex items-center gap-2 border-b pb-2">
                  <ShieldAlert className="w-5 h-5" /> Orvosi Alkalmassági Vizsgálatok
                </h2>
                <MedicalTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_orvosi_vizsgalat || []} />
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-destructive flex items-center gap-2 border-b pb-2">
                  <ShieldAlert className="w-5 h-5" /> Fegyelmi és Kitüntetési Ügyek
                </h2>
                <DisciplinaryTab employeeId={profile.id} isHrOrAdmin={isHrOrAdmin} initialData={adatlap?.hr_fegyelmi || []} />
              </div>
            </TabsContent>
          )}

        </div>
      </Tabs>
    </div>
  )
}
