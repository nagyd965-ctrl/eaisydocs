"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  FileCheck, 
  ShieldCheck, 
  Download, 
  Loader2, 
  ArrowLeft, 
  User, 
  Building, 
  Calendar, 
  CreditCard,
  Briefcase,
  Home,
  CheckCircle2,
  FileSignature
} from "lucide-react"
import { toast } from "sonner"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { UploadSignedDocumentDialog } from "@/components/hr/upload-signed-document-dialog"
import { 
  getEmploymentContractRecord, 
  generateAndFileEmploymentContractAction, 
  fileExistingEmploymentContractDocument,
  generateMt46NoticeAction
} from "@/app/hr/actions/employment-contract-actions"
import { JobOrgSelector } from "@/components/hr/job-org-selector"
import type { OrgUnitOption, JobOption } from "@/app/hr/actions/job-org-actions"

export interface EmploymentContractPanelProps {
  employeeName: string
  dolgozoId?: string | null
  onboardingId?: string | null
  munkakor?: string | null
  reszleg?: string | null
  belepesDatuma?: string | null
  orgUnits?: OrgUnitOption[]
  jobs?: JobOption[]
  onSuccess?: () => void
  onBack?: () => void
}

export function EmploymentContractPanel({
  employeeName,
  dolgozoId,
  onboardingId,
  munkakor: initialMunkakor,
  reszleg: initialReszleg,
  belepesDatuma,
  orgUnits,
  jobs,
  onSuccess,
  onBack
}: EmploymentContractPanelProps) {
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingNotice, setIsGeneratingNotice] = useState(false)
  const [isFileLoading, setIsFileLoading] = useState(false)
  const [existingRecord, setExistingRecord] = useState<any>(null)
  const [existingDoc, setExistingDoc] = useState<any>(null)
  const [mt46Doc, setMt46Doc] = useState<any>(null)

  // Szerződés paraméterek
  const [munkakor, setMunkakor] = useState(initialMunkakor || "")
  const [reszleg, setReszleg] = useState(initialReszleg || "")
  const [kezdesDatuma, setKezdesDatuma] = useState(belepesDatuma || new Date().toISOString().split("T")[0])
  const [szerzodesTipusa, setSzerzodesTipusa] = useState<"hatarozatlan" | "hatarozott">("hatarozatlan")
  const [hatarozottLejarat, setHatarozottLejarat] = useState("")
  const [munkaidoTipus, setMunkaidoTipus] = useState<"teljes" | "reszmunkaido">("teljes")
  const [napiMunkaidoOra, setNapiMunkaidoOra] = useState(8)
  const [probaidoHonap, setProbaidoHonap] = useState(3)
  const [alapber, setAlapber] = useState(650000)
  const [munkavegzesHelye, setMunkavegzesHelye] = useState("A Munkáltató mindenkori székhelye és telephelyei")
  const [tavmunkaMegallapodas, setTavmunkaMegallapodas] = useState(false)

  // Munkavállaló azonosító adatai
  const [szuletesiHely, setSzuletesiHely] = useState("")
  const [szuletesiDatum, setSzuletesiDatum] = useState("")
  const [anyjaNeve, setAnyjaNeve] = useState("")
  const [lakcim, setLakcim] = useState("")
  const [adoazonositoJel, setAdoazonositoJel] = useState("")
  const [tajSzam, setTajSzam] = useState("")
  const [bankszamlaszam, setBankszamlaszam] = useState("")

  const loadData = async () => {
    setLoading(true)
    const res = await getEmploymentContractRecord({ dolgozoId, onboardingId })
    setLoading(false)

    if (res.data) {
      setExistingRecord(res.data)
      setMunkakor(res.data.munkakor || munkakor)
      if (res.data.reszleg) setReszleg(res.data.reszleg)
      setKezdesDatuma(res.data.kezdes_datuma || kezdesDatuma)
      setSzerzodesTipusa(res.data.szerzodes_tipusa || "hatarozatlan")
      if (res.data.hatarozott_lejarat) setHatarozottLejarat(res.data.hatarozott_lejarat)
      setMunkaidoTipus(res.data.munkaido_tipus || "teljes")
      setNapiMunkaidoOra(Number(res.data.napi_munkaido_ora) || 8)
      setProbaidoHonap(Number(res.data.probaido_honap ?? 3))
      setAlapber(Number(res.data.alapber) || alapber)
      setMunkavegzesHelye(res.data.munkavegzes_helye || munkavegzesHelye)
      setTavmunkaMegallapodas(Boolean(res.data.tavmunka_megallapodas))

      if (res.data.szuletesi_hely) setSzuletesiHely(res.data.szuletesi_hely)
      if (res.data.szuletesi_datum) setSzuletesiDatum(res.data.szuletesi_datum)
      if (res.data.anyja_neve) setAnyjaNeve(res.data.anyja_neve)
      if (res.data.lakcim) setLakcim(res.data.lakcim)
      if (res.data.adoazonosito_jel) setAdoazonositoJel(res.data.adoazonosito_jel)
      if (res.data.taj_szam) setTajSzam(res.data.taj_szam)
      if (res.data.bankszamlaszam) setBankszamlaszam(res.data.bankszamlaszam)
    }

    if (res.existingDocument) {
      setExistingDoc(res.existingDocument)
    }
    if (res.mt46Document) {
      setMt46Doc(res.mt46Document)
    }
  }

  useEffect(() => {
    loadData()
  }, [dolgozoId, onboardingId])

  const handleGenerateMt46Notice = async () => {
    if (!munkakor.trim()) {
      toast.error("Válassz ki egy munkakört a tájékoztatóhoz!")
      return
    }
    setIsGeneratingNotice(true)
    const res = await generateMt46NoticeAction({
      employeeName,
      dolgozoId,
      onboardingId,
      szuletesiHely,
      szuletesiDatum,
      anyjaNeve,
      lakcim,
      adoazonositoJel,
      tajSzam,
      bankszamlaszam,
      munkakor,
      reszleg,
      kezdesDatuma,
      szerzodesTipusa,
      hatarozottLejarat,
      munkaidoTipus,
      napiMunkaidoOra,
      probaidoHonap,
      alapber,
      munkavegzesHelye,
      tavmunkaMegallapodas
    })
    setIsGeneratingNotice(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(
        res.iktatoszam
          ? `Mt. 46. § Tájékoztató sikeresen generálva és iktatva! (${res.iktatoszam})`
          : "Mt. 46. § Írásbeli Munkáltatói Tájékoztató (PDF) sikeresen generálva!"
      )
      setMt46Doc(res)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!munkakor.trim()) {
      toast.error("Add meg a munkakör megnevezését!")
      return
    }
    if (!alapber || alapber <= 0) {
      toast.error("Add meg a bruttó alapbért!")
      return
    }

    setIsGenerating(true)
    const res = await generateAndFileEmploymentContractAction({
      onboardingId,
      dolgozoId,
      employeeName,
      munkakor: munkakor.trim(),
      reszleg: reszleg.trim(),
      kezdesDatuma,
      szerzodesTipusa,
      hatarozottLejarat: szerzodesTipusa === "hatarozott" ? hatarozottLejarat : null,
      munkaidoTipus,
      napiMunkaidoOra,
      probaidoHonap,
      alapber: Number(alapber),
      munkavegzesHelye: munkavegzesHelye.trim(),
      tavmunkaMegallapodas,
      szuletesiHely: szuletesiHely.trim() || null,
      szuletesiDatum: szuletesiDatum || null,
      anyjaNeve: anyjaNeve.trim() || null,
      lakcim: lakcim.trim() || null,
      adoazonositoJel: adoazonositoJel.trim() || null,
      tajSzam: tajSzam.trim() || null,
      bankszamlaszam: bankszamlaszam.trim() || null
    })
    setIsGenerating(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      if (res.isFiled) {
        toast.success("Munkaszerződés sikeresen kiállítva és beiktatva az eaisyDocs-ba!")
      } else {
        toast.success("Munkaszerződés tervezete (PDF) legenerálva és mentve! Az iktatás a fiók aktiválásakor történik meg.")
      }
      setExistingDoc(res.document)
      setExistingRecord(res.contract)
      if (onSuccess) onSuccess()
    }
  }

  const handleFileExisting = async () => {
    if (!existingDoc?.id || !dolgozoId) return
    setIsFileLoading(true)
    const res = await fileExistingEmploymentContractDocument({
      documentId: existingDoc.id,
      dolgozoId,
      employeeName
    })
    setIsFileLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Munkaszerződés sikeresen beiktatva! Iktatószám: ${res.iktatoszam}`)
      setExistingDoc((prev: any) => prev ? { ...prev, iktatoszam: res.iktatoszam } : prev)
      if (onSuccess) onSuccess()
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Fejléc / Navigációs sáv */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="h-8 gap-1 text-xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Vissza a teendőkhöz
            </Button>
          )}
          <div>
            <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Munkaszerződés Előkészítése és Kezelése
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hivatalos munkaszerződés kiállítása (Mt. 42–45. §) és eaisyDocs iktatása (1.2 irattári tétel, 50 év megőrzési idő).
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 shrink-0 self-start sm:self-auto font-medium">
          Mt. 42–45. § Munkaszerződés
        </Badge>
      </div>

      {/* 2. Létező vagy épp generált szerződés státuszkártya */}
      {existingDoc && (
        <div className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
          existingDoc.iktatoszam 
            ? "border-success/30 bg-success/10" 
            : "border-warning/30 bg-warning/5"
        }`}>
          <div className="flex items-center gap-3">
            {existingDoc.iktatoszam ? (
              <ShieldCheck className="w-5 h-5 text-success shrink-0" />
            ) : (
              <FileCheck className="w-5 h-5 text-warning shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground">
                  Elkészült Munkaszerződés
                </h4>
                {existingDoc.iktatoszam ? (
                  <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30 font-medium">
                    Beiktatva: {existingDoc.iktatoszam}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30 font-medium">
                    Tervezet (Iktatás fiókaktiváláskor)
                  </Badge>
                )}
                {existingDoc.alairas_statusz === "alairva" && (
                  <Badge variant="outline" className="text-xs bg-primary/15 text-primary border-primary/30 font-medium gap-1">
                    <CheckCircle2 className="w-3 h-3 text-primary" /> Aláírt példány csatolva
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {existingDoc.iktatoszam 
                  ? "Hivatalosan beiktatva az eaisyDocs személyi dossziéba (1.2 munkaviszony iratok, 50 év megőrzés)." 
                  : "A munkaszerződés PDF tervezete elkészült és el van mentve az onboardingban. A fiók aktiválásakor a rendszer automatikusan beiktatja a személyi dossziéba."
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {dolgozoId && !existingDoc.iktatoszam && (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={handleFileExisting}
                disabled={isFileLoading}
                className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {isFileLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Iktatás a dossziéba
              </Button>
            )}
            <PdfViewerDialog url={existingDoc.displayUrl || existingDoc.url} title="Munkaszerződés Megtekintése" />
            <a
              href={existingDoc.displayUrl || existingDoc.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-1.5 text-xs`}
            >
              <Download className="w-3.5 h-3.5" /> Letöltés
            </a>
            {existingDoc.id && dolgozoId && (
              <UploadSignedDocumentDialog
                document={{
                  id: existingDoc.id,
                  nev: existingDoc.nev,
                  iktatoszam: existingDoc.iktatoszam,
                  alairt_fajl_url: existingDoc.alairt_fajl_url,
                  alairas_statusz: existingDoc.alairas_statusz,
                  alairva_ekor: existingDoc.alairva_ekor,
                }}
                employeeId={dolgozoId}
                employeeName={employeeName}
              />
            )}
          </div>
        </div>
      )}

      {/* 2b. Mt. 46. § Tájékoztató Kártya (ha van) */}
      {mt46Doc && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs text-foreground">
                  Munkáltatói Írásbeli Tájékoztató (Mt. 46. §)
                </span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  {mt46Doc.iktatoszam ? `Iktatva: ${mt46Doc.iktatoszam}` : "PDF Kész"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Kötelező munkafeltételi tájékoztató (munkaidő, bérfizetés, szabadság, felmondás, NAV).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <PdfViewerDialog url={mt46Doc.displayUrl || mt46Doc.url} title="Mt. 46. § Munkáltatói Tájékoztató" />
            <a
              href={mt46Doc.displayUrl || mt46Doc.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-1 text-xs h-7 border-primary/30`}
            >
              <Download className="w-3 h-3" /> Letöltés
            </a>
          </div>
        </div>
      )}

      {/* 3. Munkavállaló gyors adatai */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-muted-foreground block text-[11px]">Leendő Munkavállaló:</span>
            <strong className="text-foreground">{employeeName}</strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-muted-foreground block text-[11px]">Munkakör:</span>
            <strong className="text-foreground">{munkakor}</strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-muted-foreground block text-[11px]">Kezdés / Belépés Napja:</span>
            <strong className="text-foreground">{kezdesDatuma}</strong>
          </div>
        </div>
      </div>

      {/* 4. Munkaszerződés Paraméterező Űrlap */}
      <form onSubmit={handleGenerate} className="space-y-5">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileSignature className="w-3.5 h-3.5 text-primary" /> Munkaviszony Alapvető Feltételei (Mt. 42–45. §)
          </h4>

          {/* Szervezeti Egység és Munkakör Összekapcsolt Választó */}
          <JobOrgSelector
            orgUnits={orgUnits}
            jobs={jobs}
            selectedOrgUnitName={reszleg}
            selectedMunkakor={munkakor}
            onOrgUnitChange={(orgName) => setReszleg(orgName)}
            onMunkakorChange={(jobTitle) => setMunkakor(jobTitle)}
            compact
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Munkaviszony Kezdete</Label>
              <Input
                type="date"
                value={kezdesDatuma}
                onChange={(e) => setKezdesDatuma(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Szerződés Időtartama</Label>
              <select
                value={szerzodesTipusa}
                onChange={(e) => setSzerzodesTipusa(e.target.value as any)}
                className="w-full h-8 text-xs px-2.5 rounded-md border border-input bg-background font-medium"
              >
                <option value="hatarozatlan">Határozatlan idejű</option>
                <option value="hatarozott">Határozott idejű</option>
              </select>
            </div>

            {szerzodesTipusa === "hatarozott" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Határozott Idő Lejárata</Label>
                <Input
                  type="date"
                  value={hatarozottLejarat}
                  onChange={(e) => setHatarozottLejarat(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Próbaidő Időtartama (Mt. 45. § (5))</Label>
                <select
                  value={probaidoHonap}
                  onChange={(e) => setProbaidoHonap(Number(e.target.value))}
                  className="w-full h-8 text-xs px-2.5 rounded-md border border-input bg-background font-medium"
                >
                  <option value={3}>3 hónap (törvényi általános)</option>
                  <option value={1}>1 hónap</option>
                  <option value={2}>2 hónap</option>
                  <option value={6}>6 hónap (kollektív szerződés alapján)</option>
                  <option value={0}>Nincs próbaidő kikötve</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Havi Bruttó Alapbér (Ft) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                step="1000"
                min="200000"
                value={alapber}
                onChange={(e) => setAlapber(Number(e.target.value))}
                className="h-8 text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Munkaidő Jellege</Label>
              <select
                value={munkaidoTipus}
                onChange={(e) => setMunkaidoTipus(e.target.value as any)}
                className="w-full h-8 text-xs px-2.5 rounded-md border border-input bg-background font-medium"
              >
                <option value="teljes">Teljes munkaidő (napi 8 óra, heti 40 óra)</option>
                <option value="reszmunkaido">Részmunkaidő</option>
              </select>
            </div>

            {munkaidoTipus === "reszmunkaido" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Napi Munkaidő (Óra)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="2"
                  max="7.5"
                  value={napiMunkaidoOra}
                  onChange={(e) => setNapiMunkaidoOra(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Munkavégzési Megállapodás</Label>
                <label className="flex items-center gap-2 h-8 px-2 border rounded-md bg-muted/20 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tavmunkaMegallapodas}
                    onChange={(e) => setTavmunkaMegallapodas(e.target.checked)}
                    className="rounded border-input"
                  />
                  <span>Hibrid / Távmunka (Home Office)</span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Szokásos Munkavégzési Hely</Label>
            <Input
              value={munkavegzesHelye}
              onChange={(e) => setMunkavegzesHelye(e.target.value)}
              placeholder="Pl. A Munkáltató mindenkori székhelye és telephelyei"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* 2. Munkavállaló Személyes Azonosító Adatai */}
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" /> Munkavállaló Szerződéses Adatai (Nyilvántartáshoz)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Születési Hely</Label>
              <Input
                value={szuletesiHely}
                onChange={(e) => setSzuletesiHely(e.target.value)}
                placeholder="Pl. Budapest"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Születési Idő</Label>
              <Input
                type="date"
                value={szuletesiDatum}
                onChange={(e) => setSzuletesiDatum(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Anyja Születési Neve</Label>
              <Input
                value={anyjaNeve}
                onChange={(e) => setAnyjaNeve(e.target.value)}
                placeholder="Pl. Kiss Erzsébet"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-medium">Állandó Lakcím</Label>
              <Input
                value={lakcim}
                onChange={(e) => setLakcim(e.target.value)}
                placeholder="Pl. 1111 Budapest, Fő utca 12."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Adóazonosító Jel</Label>
              <Input
                value={adoazonositoJel}
                onChange={(e) => setAdoazonositoJel(e.target.value)}
                placeholder="8419201928"
                maxLength={10}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">TAJ Szám</Label>
              <Input
                value={tajSzam}
                onChange={(e) => setTajSzam(e.target.value)}
                placeholder="123 456 789"
                maxLength={11}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Bankszámlaszám (Munkabér átutaláshoz)</Label>
            <Input
              value={bankszamlaszam}
              onChange={(e) => setBankszamlaszam(e.target.value)}
              placeholder="11773016-00000000-00000000"
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>

        {/* 3. Műveleti Sáv */}
        <div className="border-t pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-lg border">
          <div className="text-[11px] text-muted-foreground leading-tight space-y-0.5">
            <span className="font-semibold text-foreground block">
              {dolgozoId ? "Hivatalos eaisyDocs Iktatás (1.2 irattári tétel)" : "Pre-onboarding Munkaszerződés Tervezet"}
            </span>
            <span>
              {dolgozoId 
                ? "A munkaszerződés generálódik és azonnal beiktatásra kerül az eaisyDocs Személyi Dossziéba (50 év megőrzési idő)."
                : "A szerződés letölthető és aláírható PDF formátumban mentődik. Az eaisyDocs személyi dossziéba a fiók aktiválásakor iktatódik be."
              }
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={isGeneratingNotice || !munkakor.trim()}
              onClick={handleGenerateMt46Notice}
              className="gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-medium"
            >
              {isGeneratingNotice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Tájékoztató készítése...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Mt. 46. § Tájékoztató (PDF)
                </>
              )}
            </Button>

            <Button
              type="submit"
              disabled={isGenerating || !munkakor.trim()}
              className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {dolgozoId ? "Generálás & Iktatás..." : "Szerződés generálása..."}
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  {dolgozoId ? "Munkaszerződés Generálása & Iktatás" : "Munkaszerződés Generálása (PDF)"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
