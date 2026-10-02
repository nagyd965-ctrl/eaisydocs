"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Eye, 
  Download, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Upload, 
  Sparkles, 
  Briefcase, 
  Building2, 
  AlertCircle, 
  Check, 
  Clock,
  Layers,
  FilePlus
} from "lucide-react"
import { toast } from "sonner"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { 
  getOnboardingJobData, 
  assignCatalogJobDescriptionAction, 
  generateJobDescriptionPdfAction, 
  uploadCustomJobDescriptionAction,
  fileExistingJobDescriptionDocument,
  type OnboardingJobDataResult 
} from "@/app/hr/actions/onboarding-job-actions"
import { type JobDescriptionPdfData, DEFAULT_JOB_TASKS, DEFAULT_JOB_COMPETENCIES } from "@/utils/hr/job-description-constants"

export interface JobDescriptionPanelProps {
  employeeName: string
  dolgozoId?: string | null
  onboardingId?: string | null
  munkakor?: string | null
  reszleg?: string | null
  onSuccess?: () => void
  onBack?: () => void
}

export function JobDescriptionPanel({
  employeeName,
  dolgozoId,
  onboardingId,
  munkakor,
  reszleg,
  onSuccess,
  onBack
}: JobDescriptionPanelProps) {
  const [loading, setLoading] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isFileLoading, setIsFileLoading] = useState(false)

  const [jobData, setJobData] = useState<OnboardingJobDataResult | null>(null)
  const [customFile, setCustomFile] = useState<File | null>(null)

  // Űrlap állapot a dinamikus generáláshoz
  const [formMunkakor, setFormMunkakor] = useState(munkakor || "")
  const [formFeor, setFormFeor] = useState("")
  const [formReszleg, setFormReszleg] = useState(reszleg || "")
  const [formKezdes, setFormKezdes] = useState("")
  const [formHetiOra, setFormHetiOra] = useState(40)
  const [formVezeto, setFormVezeto] = useState("")
  const [formLeiras, setFormLeiras] = useState("")
  const [formFeladatok, setFormFeladatok] = useState(DEFAULT_JOB_TASKS.join("\n"))
  const [formKompetenciak, setFormKompetenciak] = useState(DEFAULT_JOB_COMPETENCIES.join("\n"))
  const [formOrvosi, setFormOrvosi] = useState("")
  const [formVedoeszkoz, setFormVedoeszkoz] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getOnboardingJobData({ onboardingId, dolgozoId })
      setJobData(res)

      if (res.munkakorMegnevezes) setFormMunkakor(res.munkakorMegnevezes)
      if (res.reszleg) setFormReszleg(res.reszleg)
      if (res.belepesDatuma) setFormKezdes(res.belepesDatuma)

      if (res.jobCatalog) {
        if (res.jobCatalog.feor_kod) setFormFeor(res.jobCatalog.feor_kod)
        if (res.jobCatalog.leiras) setFormLeiras(res.jobCatalog.leiras)
        if (Array.isArray(res.jobCatalog.feladatok_es_hataskorok) && res.jobCatalog.feladatok_es_hataskorok.length > 0) {
          setFormFeladatok(res.jobCatalog.feladatok_es_hataskorok.join("\n"))
        }
        if (Array.isArray(res.jobCatalog.elvart_kompetenciak) && res.jobCatalog.elvart_kompetenciak.length > 0) {
          setFormKompetenciak(res.jobCatalog.elvart_kompetenciak.join("\n"))
        }
        if (res.jobCatalog.orvosi_vizsgalat_tipus) {
          setFormOrvosi(`${res.jobCatalog.orvosi_vizsgalat_tipus} (Gyakoriság: minden ${res.jobCatalog.orvosi_vizsgalat_gyakorisag_ho || 12} hónapban)`)
        }
        if (res.jobCatalog.vedoeszkoz_igeny || res.jobCatalog.kockazatertekeles_munkavedelmi) {
          setFormVedoeszkoz(res.jobCatalog.vedoeszkoz_igeny || res.jobCatalog.kockazatertekeles_munkavedelmi)
        }
      }
    } catch (err) {
      console.error("Job data load error:", err)
      toast.error("Nem sikerült betölteni a munkaköri adatokat.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [onboardingId, dolgozoId])

  // Katalógus verzió hozzárendelése
  const handleAssignCatalog = async (versionId: string) => {
    if (!jobData?.jobCatalog?.id) return
    setIsAssigning(true)
    const res = await assignCatalogJobDescriptionAction({
      onboardingId,
      dolgozoId,
      munkakorId: jobData.jobCatalog.id,
      versionId,
      employeeName,
      munkakorNev: formMunkakor,
      feorKod: formFeor || undefined
    })
    setIsAssigning(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(
        res.isFiled
          ? `Központi munkaköri leírás hozzárendelve és iktatva! (${res.iktatoszam})`
          : "Központi munkaköri leírás sablon sikeresen hozzárendelve!"
      )
      loadData()
      if (onSuccess) onSuccess()
    }
  }

  // Dinamikus PDF generálása
  const handleGeneratePdf = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formMunkakor.trim()) {
      toast.error("Add meg a munkakör megnevezését!")
      return
    }

    const payload: JobDescriptionPdfData = {
      employeeName,
      munkakor: formMunkakor.trim(),
      feorKod: formFeor.trim() || undefined,
      reszleg: formReszleg.trim() || undefined,
      jogviszonyKezdete: formKezdes || undefined,
      hetiMunkaidoOra: Number(formHetiOra) || 40,
      vezetoNev: formVezeto.trim() || undefined,
      leiras: formLeiras.trim() || undefined,
      feladatok: formFeladatok.split("\n").map(t => t.trim()).filter(Boolean),
      kompetenciak: formKompetenciak.split("\n").map(c => c.trim()).filter(Boolean),
      orvosiVizsgalat: formOrvosi.trim() || undefined,
      vedoeszkoz: formVedoeszkoz.trim() || undefined
    }

    setIsGenerating(true)
    const res = await generateJobDescriptionPdfAction({
      onboardingId,
      dolgozoId,
      data: payload,
      munkakorId: jobData?.jobCatalog?.id || null
    })
    setIsGenerating(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(
        res.isFiled
          ? `Hivatalos Munkaköri Leírás PDF generálva és iktatva! (${res.iktatoszam})`
          : "Hivatalos Munkaköri Leírás PDF sikeresen legenerálva és rögzítve!"
      )
      loadData()
      if (onSuccess) onSuccess()
    }
  }

  // Egyedi PDF feltöltése
  const handleUploadCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customFile) {
      toast.error("Válassz ki egy feltöltendő PDF fájlt!")
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", customFile)
    formData.append("employeeName", employeeName)
    formData.append("munkakorNev", formMunkakor)
    if (jobData?.jobCatalog?.id) formData.append("munkakorId", jobData.jobCatalog.id)
    if (formFeor) formData.append("feorKod", formFeor)
    if (onboardingId) formData.append("onboardingId", onboardingId)
    if (dolgozoId) formData.append("dolgozoId", dolgozoId)

    const res = await uploadCustomJobDescriptionAction(formData)
    setIsUploading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(
        res.isFiled
          ? `Munkaköri leírás feltöltve és iktatva! (${res.iktatoszam})`
          : "Egyedi munkaköri leírás PDF sikeresen feltöltve és rögzítve!"
      )
      setCustomFile(null)
      loadData()
      if (onSuccess) onSuccess()
    }
  }

  // Iktatás ha már van aktív dolgozó
  const handleFileExisting = async (docId: string) => {
    if (!dolgozoId) return
    setIsFileLoading(true)
    const res = await fileExistingJobDescriptionDocument({
      dolgozoId,
      documentId: docId
    })
    setIsFileLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Munkaköri leírás iktatva az 1.1 Munkaköri leírások dossziéba! (${res.iktatoszam})`)
      loadData()
    }
  }

  const isAssigned = Boolean(jobData?.existingDoc)
  const catalogVersions = jobData?.catalogVersions || []
  const hasCatalogVersion = catalogVersions.length > 0

  if (loading && !jobData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Munkaköri leírás adatok betöltése...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Státusz Fejléc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Hivatalos Munkaköri Leírás
            </h3>
            {isAssigned ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Hozzárendelve / Előkészítve
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" /> Előkészítésre vár
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A munkakör céljának, feladatainak és felelősségi köreinek hivatalos rögzítése (Mt. 45. § (4) bekezdés).
            A munkaszerződés kötelező mellékletét képezi.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs font-mono bg-background">
            Pozíció: <strong className="ml-1 text-foreground">{formMunkakor || "Nincs megadva"}</strong>
          </Badge>
        </div>
      </div>

      {/* 2. Jelenleg Hozzárendelt Dokumentum Kártya (ha van) */}
      {jobData?.existingDoc && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-foreground">
                    Hivatalos Munkaköri Leírás Érvényesítve
                  </h4>
                  <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                    {jobData.existingAssignment?.forras_tipus === "katalogus" ? "Központi sablon" : jobData.existingAssignment?.forras_tipus === "generator" ? "Dinamikus PDF" : "Feltöltött PDF"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  Dokumentum: {jobData.existingDoc.nev}
                </p>
                {jobData.existingDoc.iktatoszam ? (
                  <div className="text-xs font-semibold text-emerald-600 pt-0.5 flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Iktatószám: {jobData.existingDoc.iktatoszam} (1.1 - Munkaköri leírások)
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 pt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Fiókaktiváláskor automatikusan iktatásra kerül (1.1 - Munkaköri leírások).
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <PdfViewerDialog
                url={jobData.existingDoc.displayUrl || jobData.existingDoc.url}
                title={`Munkaköri Leírás - ${employeeName}`}
                trigger={
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10">
                    <Eye className="w-3.5 h-3.5" /> Megtekintés
                  </Button>
                }
              />
              <a
                href={jobData.existingDoc.displayUrl || jobData.existingDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className={`${buttonVariants({ variant: "outline", size: "sm" })} h-8 text-xs gap-1 border-emerald-500/30`}
              >
                <Download className="w-3.5 h-3.5" /> Letöltés
              </a>

              {dolgozoId && !jobData.existingDoc.iktatoszam && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleFileExisting(jobData.existingDoc.id)}
                  disabled={isFileLoading}
                >
                  {isFileLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Iktatás a dossziéba
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Munkaköri Leírás Létrehozási Módok */}
      <Tabs defaultValue={hasCatalogVersion ? "catalog" : "generator"} className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-muted/40 p-1">
          <TabsTrigger value="catalog" className="text-xs gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5" />
            Központi Sablon {hasCatalogVersion && `(${catalogVersions.length})`}
          </TabsTrigger>
          <TabsTrigger value="generator" className="text-xs gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Dinamikus Generátor (PDF)
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs gap-1.5 font-medium">
            <Upload className="w-3.5 h-3.5" />
            Egyedi Fájl Feltöltése
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Katalógus Sablon */}
        <TabsContent value="catalog" className="pt-4 outline-none space-y-4">
          {hasCatalogVersion ? (
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Hivatalos Munkaköri Sablon a Katalógusból
                </h4>
                <p className="text-xs text-muted-foreground">
                  A vállalat által központilag jóváhagyott, verzionált munkaköri leírás PDF ehhez a pozícióhoz ({formMunkakor}).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {catalogVersions.map((ver) => (
                  <div key={ver.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">{ver.fajl_nev}</span>
                        <Badge variant="secondary" className="text-xs font-mono">v{ver.verzio_szam}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Kiadva: {new Date(ver.kiadas_datum).toLocaleDateString("hu-HU")}
                        {ver.megjegyzes && ` • ${ver.megjegyzes}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {ver.signedUrl && (
                        <PdfViewerDialog
                          url={ver.signedUrl}
                          title={`Központi Sablon - ${formMunkakor} (v${ver.verzio_szam})`}
                          trigger={
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                              <Eye className="w-3.5 h-3.5" /> Sablon Előnézet
                            </Button>
                          }
                        />
                      )}

                      <Button
                        type="button"
                        size="sm"
                        disabled={isAssigning}
                        className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
                        onClick={() => handleAssignCatalog(ver.id)}
                      >
                        {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
                        Sablon Hozzárendelése ehhez a Jelölthöz
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed rounded-xl space-y-2 bg-muted/10">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Ehhez a munkakörhöz ({formMunkakor || "Kiválasztott"}) még nincs központi feltöltött PDF sablon
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Használd a <strong>Dinamikus Generátor</strong> fület a munkaköri leírás automatikus A4 PDF előállításához, vagy tölts fel egy egyedi fájlt.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Dinamikus PDF Generátor */}
        <TabsContent value="generator" className="pt-4 outline-none space-y-4">
          <form onSubmit={handleGeneratePdf} className="space-y-4 border rounded-xl p-5 bg-card">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Hivatalos Munkaköri Leírás Generálása (PDF)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Strukturált munkaköri adatokból előállított, jogilag kötelező érvényű A4-es dokumentum eaisyDocs fejlécbélyegzővel.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Munkakör Megnevezése</Label>
                <Input
                  value={formMunkakor}
                  onChange={(e) => setFormMunkakor(e.target.value)}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">FEOR-08 Szám</Label>
                <Input
                  value={formFeor}
                  onChange={(e) => setFormFeor(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="pl. 4121"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Szervezeti Egység / Részleg</Label>
                <Input
                  value={formReszleg}
                  onChange={(e) => setFormReszleg(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Munkaviszony Kezdete</Label>
                <Input
                  type="date"
                  value={formKezdes}
                  onChange={(e) => setFormKezdes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Heti Munkaidő (Óra)</Label>
                <Input
                  type="number"
                  value={formHetiOra}
                  onChange={(e) => setFormHetiOra(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Közvetlen Szakmai Felettes Vezető</Label>
                <Input
                  value={formVezeto}
                  onChange={(e) => setFormVezeto(e.target.value)}
                  placeholder="pl. Nagy Dániel (Operatív Vezető)"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">1. Munkakör Célja és Küldetése</Label>
              <Textarea
                rows={2}
                value={formLeiras}
                onChange={(e) => setFormLeiras(e.target.value)}
                placeholder="A munkakör stratégiai célja a vállalaton belül..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">2. Főbb Feladatok és Hatáskörök (soronként egy pont)</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formFeladatok.split("\n").filter(Boolean).length} feladatpont
                </span>
              </div>
              <Textarea
                rows={4}
                value={formFeladatok}
                onChange={(e) => setFormFeladatok(e.target.value)}
                className="text-xs leading-relaxed font-sans"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">3. Elvárt Kompetenciák és Szaktudás (soronként egy pont)</Label>
              <Textarea
                rows={3}
                value={formKompetenciak}
                onChange={(e) => setFormKompetenciak(e.target.value)}
                className="text-xs leading-relaxed font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Foglalkozás-egészségügyi vizsgálat</Label>
                <Input
                  value={formOrvosi}
                  onChange={(e) => setFormOrvosi(e.target.value)}
                  placeholder="pl. Előzetes és időszakos vizsgálat (12 havonta)"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Egyéni védőeszköz (EVE) juttatás</Label>
                <Input
                  value={formVedoeszkoz}
                  onChange={(e) => setFormVedoeszkoz(e.target.value)}
                  placeholder="pl. Munkavédelmi cipő, láthatósági mellény"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full h-8 text-xs gap-1.5 font-medium bg-primary text-primary-foreground"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Munkaköri leírás generálása folyamatban...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Hivatalos Munkaköri Leírás (PDF) Generálása és Rögzítése
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        {/* Tab 3: Egyedi PDF feltöltése */}
        <TabsContent value="upload" className="pt-4 outline-none space-y-4">
          <form onSubmit={handleUploadCustom} className="space-y-4 border rounded-xl p-5 bg-card">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Már elkészített Munkaköri Leírás Feltöltése
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ha külsőleg készült, aláírt vagy egyedi formátumú munkaköri leírásod van, töltsd fel ide közvetlenül.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">PDF Fájl Kiválasztása</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                className="h-9 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
            </div>

            <Button
              type="submit"
              disabled={isUploading || !customFile}
              className="w-full h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Feltöltés és mentés...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Egyedi Munkaköri Leírás Mentése az Onboardinghoz
                </>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
