"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  FileCheck, 
  ShieldCheck, 
  Download, 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  FileSignature,
  Scale
} from "lucide-react"
import { toast } from "sonner"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { generateTerminationAgreementAction, fileSingleOffboardingDocument } from "@/app/hr/offboarding/actions"
import { 
  type TerminationType, 
  TERMINATION_TYPE_LABELS,
  DEFAULT_COMPANY_DETAILS 
} from "@/utils/hr/termination-constants"

export interface TerminationPanelProps {
  offboardingId: string
  employeeName: string
  dolgozoId?: string | null
  munkakor?: string | null
  reszleg?: string | null
  kilepesDatuma?: string | null
  initialData?: any
  adatlap?: any
  onSuccess?: () => void
  onBack?: () => void
}

export function TerminationPanel({
  offboardingId,
  employeeName,
  dolgozoId,
  munkakor: initialMunkakor,
  reszleg: initialReszleg,
  kilepesDatuma,
  initialData,
  adatlap,
  onSuccess,
  onBack
}: TerminationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFileLoading, setIsFileLoading] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(initialData?.terminationDoc?.url || null)
  const [docId, setDocId] = useState<string | null>(initialData?.terminationDoc?.documentId || null)
  const [iktatoszam, setIktatoszam] = useState<string | null>(initialData?.terminationDoc?.iktatoszam || null)
  const [iktatvaEkor, setIktatvaEkor] = useState<string | null>(initialData?.terminationDoc?.iktatvaEkor || null)

  // Megszüntetés paraméterek
  const [megszunesModja, setMegszunesModja] = useState<TerminationType>(
    (initialData?.megszunes_modja as TerminationType) || "kozos_megegyezes"
  )
  const [utolsoMunkanap, setUtolsoMunkanap] = useState(
    initialData?.utolso_munkaban_toltott_nap || kilepesDatuma || new Date().toISOString().split("T")[0]
  )
  const [megszunesDatuma, setMegszunesDatuma] = useState(
    initialData?.kilepes_datuma || kilepesDatuma || new Date().toISOString().split("T")[0]
  )
  const [felmentesiIdoNap, setFelmentesiIdoNap] = useState<number>(initialData?.felmentesi_ido_nap ?? 0)
  const [megvaltottSzabadsagNap, setMegvaltottSzabadsagNap] = useState<number>(initialData?.megvaltott_szabadsag_nap ?? 0)
  const [vegkielegitesOsszeg, setVegkielegitesOsszeg] = useState<number>(initialData?.vegkielegites_osszeg ?? 0)
  const [indoklas, setIndoklas] = useState<string>(initialData?.indoklas || "")
  const [egyediZaradek, setEgyediZaradek] = useState<string>("")

  // Munkavállaló azonosító adatai (előtöltve adatlapból)
  const [munkakor, setMunkakor] = useState(initialMunkakor || initialData?.munkakor || adatlap?.munkakor || "")
  const [reszleg, setReszleg] = useState(initialReszleg || initialData?.reszleg || adatlap?.reszleg || "")
  const [szuletesiHely, setSzuletesiHely] = useState(adatlap?.szuletesi_hely || "")
  const [szuletesiDatum, setSzuletesiDatum] = useState(adatlap?.szuletesi_datum || "")
  const [anyjaNeve, setAnyjaNeve] = useState(adatlap?.anyja_neve || "")
  const [lakcim, setLakcim] = useState(adatlap?.lakcim || "")
  const [adoazonosito, setAdoazonosito] = useState(adatlap?.adoazonosito_jel || adatlap?.adoazonosito || "")
  const [tajSzam, setTajSzam] = useState(adatlap?.taj_szam || "")

  // Szinkronizálás amikor a detailData megérkezik
  useEffect(() => {
    if (initialData?.terminationDoc?.url) {
      setCurrentPdfUrl(initialData.terminationDoc.url)
    }
    if (initialData?.terminationDoc?.documentId) {
      setDocId(initialData.terminationDoc.documentId)
    }
    if (initialData?.terminationDoc?.iktatoszam) {
      setIktatoszam(initialData.terminationDoc.iktatoszam)
    }
    if (initialData?.terminationDoc?.iktatvaEkor) {
      setIktatvaEkor(initialData.terminationDoc.iktatvaEkor)
    }
    if (initialData?.megszunes_modja) {
      setMegszunesModja(initialData.megszunes_modja)
    }
    if (initialData?.utolso_munkaban_toltott_nap) {
      setUtolsoMunkanap(initialData.utolso_munkaban_toltott_nap)
    }
    if (initialData?.kilepes_datuma) {
      setMegszunesDatuma(initialData.kilepes_datuma)
    }
    if (initialData?.munkakor && !munkakor) {
      setMunkakor(initialData.munkakor)
    }
    if (initialData?.reszleg && !reszleg) {
      setReszleg(initialData.reszleg)
    }
  }, [initialData])

  const isAlreadyGenerated = Boolean(currentPdfUrl)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await generateTerminationAgreementAction(offboardingId, {
        employeeName,
        munkakor,
        reszleg,
        szuletesiHely,
        szuletesiDatum,
        anyjaNeve,
        lakcim,
        adoazonosito,
        tajSzam,
        megszunesModja,
        utolsoMunkanap,
        megszunesDatuma,
        felmentesiIdoNap: Number(felmentesiIdoNap || 0),
        megvaltottSzabadsagNap: Number(megvaltottSzabadsagNap || 0),
        vegkielegitesOsszeg: Number(vegkielegitesOsszeg || 0),
        indoklas: indoklas.trim() || undefined,
        egyediZaradek: egyediZaradek.trim() || undefined
      })

      if (res.error) {
        toast.error("Hiba a dokumentum generálásakor", { description: res.error })
      } else {
        toast.success("Megszüntetési megállapodás (PDF) sikeresen legenerálva és mentve!", {
          description: "Az iktatás a kiléptetési folyamat hivatalos lezárásakor automatikusan megtörténik."
        })
        if (res.pdfUrl || res.storagePath) {
          setCurrentPdfUrl(res.pdfUrl || res.storagePath)
        }
        if ("documentId" in res && res.documentId) {
          setDocId(res.documentId)
        }
        const resIktatoszam = (res as any).iktatoszam
        if (resIktatoszam) {
          setIktatoszam(resIktatoszam)
          setIktatvaEkor(new Date().toISOString())
        }
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      toast.error("Váratlan hiba történt", { description: err.message })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileManual = async () => {
    const targetDocId = docId || initialData?.terminationDoc?.documentId
    const targetDolgozoId = dolgozoId || initialData?.dolgozo_id
    if (!targetDocId || !targetDolgozoId) {
      toast.error("Nem található dokumentum azonosító az iktatáshoz.")
      return
    }
    setIsFileLoading(true)
    try {
      const res = await fileSingleOffboardingDocument({
        documentId: targetDocId,
        dolgozoId: targetDolgozoId,
        customTargy: `Munkaviszony megszüntetés - ${employeeName}`
      })
      if ("error" in res && res.error) {
        toast.error("Iktatási hiba", { description: String(res.error) })
      } else if ("iktatoszam" in res && res.iktatoszam) {
        toast.success(`Megállapodás sikeresen beiktatva! Iktatószám: ${res.iktatoszam}`)
        setIktatoszam(res.iktatoszam)
        setIktatvaEkor(new Date().toISOString())
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      toast.error("Váratlan hiba", { description: err.message })
    } finally {
      setIsFileLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Fejléc és navigáció */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Vissza a teendőkhöz
            </Button>
          )}
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Munkaviszony Megszüntetés (Mt. 64–85. §)
            </h3>
            <p className="text-xs text-muted-foreground">
              Hivatalos jogszabályi megállapodás előkészítése, A4 PDF előállítása és iktatása az eaisyDocs személyi dossziéba.
            </p>
          </div>
        </div>
      </div>

      {/* Állapotkártya: ha már be van iktatva (zöld), vagy ha mentve van és lezáráskor iktatódik (borostyán) */}
      {isAlreadyGenerated && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
          iktatoszam 
            ? "bg-emerald-500/10 border-emerald-500/20" 
            : "bg-amber-500/5 border-amber-500/30"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              iktatoszam 
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}>
              {iktatoszam ? <ShieldCheck className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  {iktatoszam 
                    ? "Munkaviszony megszüntetési megállapodás kiállítva és beiktatva" 
                    : "Elkészült Munkaviszony Megszüntetési Megállapodás"}
                </span>
                <Badge variant="outline" className="bg-background text-muted-foreground text-[10px] font-mono border-muted">
                  1.2 Tétel (50 év)
                </Badge>
                {iktatoszam ? (
                  <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium">
                    Beiktatva: {iktatoszam}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium">
                    Mentve (Iktatás a kiléptetés lezárásakor)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {iktatoszam ? (
                  <>
                    A megállapodás hivatalosan beiktatásra került az eaisyDocs személyi dossziéba ({iktatoszam}).
                    {iktatvaEkor && (
                      <span className="ml-1 opacity-80">
                        Iktatás ideje: {new Date(iktatvaEkor).toLocaleDateString("hu-HU")} {new Date(iktatvaEkor).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </>
                ) : (
                  "A megállapodás PDF elkészült az offboardingban. Az aláírás után a kiléptetési folyamat lezárásakor automatikusan a személyi dossziéba iktatódik."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => setPdfPreviewOpen(true)}
            >
              <FileText className="w-3.5 h-3.5" />
              Megtekintés
            </Button>
            <a
              href={currentPdfUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonVariants({ variant: "default", size: "sm" })} h-8 gap-1.5 text-xs`}
            >
              <Download className="w-3.5 h-3.5" />
              Letöltés (PDF)
            </a>
          </div>
        </div>
      )}

      {/* 1. Munkaviszony Megszűnésének Jogcíme és Dátumai */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          1. Megszüntetés Módja és Időpontja
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="megszunesModja" className="text-xs font-medium">
              Megszüntetés jogcíme (Mt. hivatkozással)
            </Label>
            <select
              id="megszunesModja"
              value={megszunesModja}
              onChange={(e) => setMegszunesModja(e.target.value as TerminationType)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.entries(TERMINATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="utolsoMunkanap" className="text-xs font-medium">
              Utolsó munkában töltött nap
            </Label>
            <Input
              id="utolsoMunkanap"
              type="date"
              value={utolsoMunkanap}
              onChange={(e) => setUtolsoMunkanap(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="megszunesDatuma" className="text-xs font-medium">
              Munkaviszony megszűnésének napja
            </Label>
            <Input
              id="megszunesDatuma"
              type="date"
              value={megszunesDatuma}
              onChange={(e) => setMegszunesDatuma(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="felmentesiIdoNap" className="text-xs font-medium">
              Felmentési időtartam (nap)
            </Label>
            <Input
              id="felmentesiIdoNap"
              type="number"
              min={0}
              value={felmentesiIdoNap}
              onChange={(e) => setFelmentesiIdoNap(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              A munkavégzés alóli mentesítés napjainak száma (távolléti díjjal).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="megvaltottSzabadsagNap" className="text-xs font-medium">
              Megváltandó szabadságnapok (nap)
            </Label>
            <Input
              id="megvaltottSzabadsagNap"
              type="number"
              step="0.5"
              min={0}
              value={megvaltottSzabadsagNap}
              onChange={(e) => setMegvaltottSzabadsagNap(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Időarányos, természetben ki nem adott szabadság pénzbeli megváltása.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Pénzügyi Elszámolás és Indoklás */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-primary" />
          2. Pénzügyi Elszámolás és Indoklás (Mt. 80. §)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="vegkielegitesOsszeg" className="text-xs font-medium">
              Végkielégítés összege (Ft)
            </Label>
            <Input
              id="vegkielegitesOsszeg"
              type="number"
              min={0}
              step={1000}
              value={vegkielegitesOsszeg}
              onChange={(e) => setVegkielegitesOsszeg(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="h-9 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              0 Ft esetén nem illeti meg, vagy a megállapodás nem tartalmaz végkielégítést.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="indoklas" className="text-xs font-medium">
              Indoklás (munkáltatói felmondásnál kötelező)
            </Label>
            <Textarea
              id="indoklas"
              rows={2}
              value={indoklas}
              onChange={(e) => setIndoklas(e.target.value)}
              placeholder="A felmondás jogszerű, világos és valós indoka (pl. átszervezés, minőségi csere)..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="egyediZaradek" className="text-xs font-medium">
              Egyedi megállapodás / záradék (opcionális)
            </Label>
            <Input
              id="egyediZaradek"
              value={egyediZaradek}
              onChange={(e) => setEgyediZaradek(e.target.value)}
              placeholder="Pl. felek megállapodnak a tanulmányi szerződés időarányos elszámolásában..."
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Munkavállaló Azonosító Adatai */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          3. Munkavállaló Hivatalos Azonosító Adatai
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Munkakör</Label>
            <Input value={munkakor} onChange={(e) => setMunkakor(e.target.value)} className="h-8 text-xs font-medium" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Szervezeti Egység / Részleg</Label>
            <Input value={reszleg} onChange={(e) => setReszleg(e.target.value)} className="h-8 text-xs font-medium" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Adóazonosító jel</Label>
            <Input value={adoazonosito} onChange={(e) => setAdoazonosito(e.target.value)} className="h-8 text-xs font-mono" placeholder="84..." />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">TAJ szám</Label>
            <Input value={tajSzam} onChange={(e) => setTajSzam(e.target.value)} className="h-8 text-xs font-mono" placeholder="123 456 789" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Születési hely, idő</Label>
            <div className="flex gap-1.5">
              <Input value={szuletesiHely} onChange={(e) => setSzuletesiHely(e.target.value)} className="h-8 text-xs" placeholder="Hely" />
              <Input value={szuletesiDatum} onChange={(e) => setSzuletesiDatum(e.target.value)} type="date" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Anyja születési neve</Label>
            <Input value={anyjaNeve} onChange={(e) => setAnyjaNeve(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label className="text-[11px] text-muted-foreground">Állandó lakcím</Label>
            <Input value={lakcim} onChange={(e) => setLakcim(e.target.value)} className="h-8 text-xs" placeholder="Irányítószám, Város, Utca, házszám" />
          </div>
        </div>
      </div>

      {/* Műveleti Sáv */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          A generáláskor a rendszer előállítja a hiteles PDF tervezetet. Az iktatás a kiléptetés hivatalos lezárásakor automatikusan megtörténik a személyi dossziéba.
        </p>

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2 w-full sm:w-auto font-medium"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Megállapodás generálása folyamatban...
            </>
          ) : (
            <>
              <FileSignature className="w-4 h-4" />
              {isAlreadyGenerated 
                ? "Megszüntetési Megállapodás Újragenerálása" 
                : "Megszüntetési Megállapodás Generálása (PDF)"}
            </>
          )}
        </Button>
      </div>

      {/* PDF Előnézet Modal */}
      {currentPdfUrl && (
        <PdfViewerDialog
          open={pdfPreviewOpen}
          onOpenChange={setPdfPreviewOpen}
          pdfUrl={currentPdfUrl}
          title={`Munkaviszony Megszüntetés - ${employeeName}`}
        />
      )}
    </div>
  )
}
