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
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Mail, 
  UserCheck, 
  Building2, 
  FileSignature
} from "lucide-react"
import { toast } from "sonner"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { generateExitCertificateAction, fileSingleOffboardingDocument } from "@/app/hr/offboarding/actions"
import { 
  type ExitCertificatePdfData, 
  DEFAULT_EXIT_DOCUMENTS, 
  DEFAULT_COMPANY_DETAILS 
} from "@/utils/hr/exit-certificate-constants"
import { TERMINATION_TYPE_LABELS, type TerminationType } from "@/utils/hr/termination-constants"

export interface ExitCertificatePanelProps {
  offboardingId: string
  employeeName: string
  dolgozoId?: string | null
  munkakor?: string | null
  reszleg?: string | null
  kilepesDatuma?: string | null
  initialData?: any
  adatlap?: any
  targyeviBetegszabadsagNapok?: number
  onSuccess?: () => void
}

export function ExitCertificatePanel({
  offboardingId,
  employeeName,
  dolgozoId,
  munkakor,
  reszleg,
  kilepesDatuma,
  initialData,
  adatlap,
  onSuccess
}: ExitCertificatePanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)

  // Mentett / létező dokumentum állapot
  const existingDoc = initialData?.kilepoIgazolasDoc
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(existingDoc?.url || initialData?.kilepo_igazolas_pdf_url || null)
  const [currentDocId, setCurrentDocId] = useState<string | null>(existingDoc?.documentId || null)
  const [iktatoszam, setIktatoszam] = useState<string | null>(existingDoc?.iktatoszam || null)
  const [iktatvaEkor, setIktatvaEkor] = useState<string | null>(existingDoc?.iktatvaEkor || null)
  const [isFiling, setIsFiling] = useState(false)

  // Űrlap adatok
  const savedAdatok = initialData?.kilepo_igazolas_adatok || {}
  const [feorKod, setFeorKod] = useState<string>(savedAdatok.feorKod || adatlap?.feor_kod || adatlap?.feor || "4121")
  const [jogviszonyKezdete, setJogviszonyKezdete] = useState<string>(
    savedAdatok.jogviszonyKezdete || adatlap?.belepes_datuma || adatlap?.jogviszony_kezdete || ""
  )
  const [jogviszonyVege, setJogviszonyVege] = useState<string>(
    kilepesDatuma || initialData?.kilepes_datuma || new Date().toISOString().split("T")[0]
  )

  // Levonások (Mt. 80. § (2))
  const [vanLevonas, setVanLevonas] = useState<boolean>(Boolean(savedAdatok.vanLevonas))
  const [levonasok, setLevonasok] = useState<string>(
    savedAdatok.levonasok || "A munkavállaló munkabérét végrehajtói vagy egyéb bírósági letiltás, gyermektartásdíj nem terheli."
  )
  const [levonasReszletek, setLevonasReszletek] = useState<string>(savedAdatok.levonasReszletek || "")

  // Betegszabadság és végkielégítés (automatikusan betöltve a jóváhagyott távollétekből)
  const [betegszabadsagNapok, setBetegszabadsagNapok] = useState<number>(
    savedAdatok.betegszabadsagNapok !== undefined 
      ? savedAdatok.betegszabadsagNapok 
      : (initialData?.targyeviBetegszabadsagNapok ?? 0)
  )
  const [vegkielegitesOsszeg, setVegkielegitesOsszeg] = useState<number>(
    initialData?.vegkielegites_osszeg ? Number(initialData.vegkielegites_osszeg) : 0
  )

  // Átvétel módja
  const [atvetelModja, setAtvetelModja] = useState<"szemelyes" | "postai">(
    savedAdatok.atvetelModja || "szemelyes"
  )
  const [postaiAzonosito, setPostaiAzonosito] = useState<string>(savedAdatok.postaiAzonosito || "")

  const isAlreadyGenerated = Boolean(currentPdfUrl)

  // Megszűnés jogcíme szövegesen
  const megszunesModja = initialData?.megszunes_modja || "kozos_megegyezes"
  const megszunesModjaLabel = TERMINATION_TYPE_LABELS[megszunesModja as TerminationType] || "Közös megegyezés (Mt. 64. § (1) bek. a) pont)"

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const payload: Partial<ExitCertificatePdfData> = {
        employeeName,
        munkakor: munkakor || initialData?.munkakor || "Munkatárs",
        feorKod: feorKod.trim() || undefined,
        reszleg: reszleg || initialData?.reszleg || undefined,
        szuletesiHely: adatlap?.szuletesi_hely || undefined,
        szuletesiDatum: adatlap?.szuletesi_datum || undefined,
        anyjaNeve: adatlap?.anyja_szuletesi_neve || adatlap?.anyja_neve || undefined,
        lakcim: adatlap?.allando_lakcim || adatlap?.lakcim || undefined,
        adoazonosito: adatlap?.adoazonosito_jel || adatlap?.adoazonosito || undefined,
        tajSzam: adatlap?.taj_szam || undefined,
        jogviszonyKezdete: jogviszonyKezdete || undefined,
        jogviszonyVege,
        megszunesModja,
        megszunesModjaLabel,
        vanLevonas,
        levonasok: vanLevonas 
          ? (levonasReszletek.trim() || "Bírósági letiltás rögzítve.") 
          : "A munkavállaló munkabérét végrehajtói vagy egyéb bírósági letiltás, gyermektartásdíj nem terheli.",
        levonasReszletek: vanLevonas ? levonasReszletek.trim() : undefined,
        betegszabadsagNapok: Number(betegszabadsagNapok || 0),
        vegkielegitesOsszeg: Number(vegkielegitesOsszeg || 0),
        atvetelModja,
        postaiAzonosito: atvetelModja === "postai" ? postaiAzonosito.trim() : undefined,
        kiadottIratok: DEFAULT_EXIT_DOCUMENTS
      }

      const res = await generateExitCertificateAction(offboardingId, payload)
      if (res.error) {
        toast.error("Hiba a kilépő igazolások generálásakor", { description: res.error })
      } else {
        toast.success("Törvényes Kilépő Igazolások (PDF) sikeresen legenerálva és mentve!", {
          description: "Az iktatás a kiléptetési folyamat lezárásakor automatikusan megtörténik."
        })
        if (res.pdfUrl || res.storagePath) {
          setCurrentPdfUrl(res.pdfUrl || res.storagePath)
        }
        if (res.documentId) {
          setCurrentDocId(res.documentId)
        }
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      toast.error("Váratlan hiba történt", { description: err.message })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileSingleDocument = async () => {
    const docId = currentDocId || existingDoc?.documentId
    if (!docId) {
      toast.error("A dokumentum azonosítója nem található. Kérlek, generáld újra a dokumentumot!")
      return
    }
    const targetDolgozoId = dolgozoId || initialData?.dolgozo_id
    if (!targetDolgozoId) {
      toast.error("A munkavállaló azonosítója hiányzik.")
      return
    }

    setIsFiling(true)
    try {
      const res = await fileSingleOffboardingDocument({
        documentId: docId,
        dolgozoId: targetDolgozoId,
        customTargy: `Törvényes Kilépő Igazolások (Mt. 80. §) - ${employeeName}`
      })

      if (res.error) {
        toast.error("Hiba az iktatás során", { description: res.error })
      } else {
        setIktatoszam(res.iktatoszam || null)
        setIktatvaEkor(new Date().toISOString())
        toast.success("Dokumentum sikeresen beiktatva a személyi dossziéba!", {
          description: `Hivatalos iktatószám: ${res.iktatoszam}`
        })
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      toast.error("Váratlan hiba történt az iktatáskor", { description: err.message })
    } finally {
      setIsFiling(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Fejléc és navigáció */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" />
              Törvényes Kilépő Igazolások Kiadása (Mt. 80. § / Flt. 36/A. §)
            </h3>
            <p className="text-xs text-muted-foreground">
              Munkáltatói igazolás, jövedelem- és levonási elszámolás, valamint átadás-átvételi jegyzőkönyv előállítása.
            </p>
          </div>
        </div>
      </div>

      {/* Állapotjelző kártya: ha már elkészült a PDF */}
      {isAlreadyGenerated && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
          iktatoszam 
            ? "bg-success/10 border-success/20" 
            : "bg-warning/5 border-warning/30"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              iktatoszam 
                ? "bg-success/20 text-success" 
                : "bg-warning/15 text-warning"
            }`}>
              {iktatoszam ? <ShieldCheck className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-sm">
                  Elkészült Munkáltatói Kilépő Igazolás & Átvételi Nyugta
                </span>
                <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                  1.2 Tétel (50 év)
                </span>
                {iktatoszam ? (
                  <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30 font-medium">
                    Beiktatva: {iktatoszam}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30 font-medium">
                    Mentve (Iktatás a kiléptetés lezárásakor)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {iktatoszam ? (
                  <>
                    A dokumentum hivatalosan beiktatásra került az eaisyDocs személyi dossziéba ({iktatoszam}).
                    {iktatvaEkor && (
                      <span className="ml-1 opacity-80">
                        Iktatás ideje: {new Date(iktatvaEkor).toLocaleDateString("hu-HU")} {new Date(iktatvaEkor).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </>
                ) : (
                  "A törvényes kilépő igazolás PDF elkészült az offboardingban. A kiléptetési folyamat lezárásakor automatikusan a személyi dossziéba iktatódik."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {!iktatoszam && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFiling}
                onClick={handleFileSingleDocument}
                className="h-8 gap-1.5 text-xs text-success border-success/30 hover:bg-success/10 font-medium"
              >
                {isFiling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Iktatás...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Beiktatás a személyi dossziéba most
                  </>
                )}
              </Button>
            )}
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

      {/* 1. Munkaviszony és Megszűnés Adatai */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          1. Munkaviszony és Jogviszony Megszűnésének Adatai
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Munkakör megnevezése</Label>
            <Input
              value={munkakor || initialData?.munkakor || "Munkatárs"}
              disabled
              className="h-9 text-sm bg-muted/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">FEOR-08 kód</Label>
            <Input
              value={feorKod}
              onChange={(e) => setFeorKod(e.target.value)}
              placeholder="pl. 4121"
              className="h-9 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Megszűnés jogcíme</Label>
            <Input
              value={megszunesModjaLabel}
              disabled
              className="h-9 text-xs bg-muted/30 truncate"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="jogviszonyKezdete" className="text-xs font-medium">
              Munkaviszony kezdete (opcionális)
            </Label>
            <Input
              id="jogviszonyKezdete"
              type="date"
              value={jogviszonyKezdete}
              onChange={(e) => setJogviszonyKezdete(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jogviszonyVege" className="text-xs font-medium">
              Munkaviszony megszűnésének napja
            </Label>
            <Input
              id="jogviszonyVege"
              type="date"
              value={jogviszonyVege}
              onChange={(e) => setJogviszonyVege(e.target.value)}
              className="h-9 text-sm font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 2. Munkabérből történő levonások (Mt. 80. § (2)) */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            2. Munkabérből Történő Levonások Nyilatkozata (Mt. 80. § (2))
          </h4>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input 
              type="radio" 
              name="vanLevonas" 
              checked={!vanLevonas} 
              onChange={() => setVanLevonas(false)}
              className="text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span className="font-medium text-foreground">
              ✓ Teljesen levonásmentes (nem terheli bírósági letiltás, gyermektartásdíj)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input 
              type="radio" 
              name="vanLevonas" 
              checked={vanLevonas} 
              onChange={() => setVanLevonas(true)}
              className="text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span className="font-medium text-destructive">
              ⚠ Levonási kötelezettség áll fenn
            </span>
          </label>
        </div>

        {vanLevonas && (
          <div className="space-y-1.5 pt-2 animate-in fade-in duration-150">
            <Label className="text-xs font-medium">
              Levonási kötelezettség részletei (határozatszám, kedvezményezett, összeg)
            </Label>
            <Input
              value={levonasReszletek}
              onChange={(e) => setLevonasReszletek(e.target.value)}
              placeholder="pl. 1402.Vh.894/2024/12 sz. végrehajtói letiltás alapján 33% levonás..."
              className="h-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* 3. Tárgyévi Betegszabadság és Pénzügyi Elszámolás */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          3. Tárgyévi Betegszabadság és Pénzügyi Elszámolás
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="betegszabi" className="text-xs font-medium">
              Tárgyévben igénybe vett betegszabadság (munkanap)
            </Label>
            <Input
              id="betegszabi"
              type="number"
              min={0}
              max={15}
              value={betegszabadsagNapok}
              onChange={(e) => setBetegszabadsagNapok(parseInt(e.target.value) || 0)}
              className="h-9 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Az Mt. 126. § alapján évente maximum 15 munkanap betegszabadság illeti meg a munkavállalót.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vegkielegites" className="text-xs font-medium">
              Végkielégítés összege (Ft)
            </Label>
            <Input
              id="vegkielegites"
              type="number"
              min={0}
              step={1000}
              value={vegkielegitesOsszeg}
              onChange={(e) => setVegkielegitesOsszeg(parseInt(e.target.value) || 0)}
              className="h-9 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              A megszűnéskor kifizetendő végkielégítés összege (0 Ft = nincs végkielégítés).
            </p>
          </div>
        </div>
      </div>

      {/* 4. Átvételi mód és nyilatkozat */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          4. Kilépő Iratok Átadásának Módja és Kézbesítés
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div 
            onClick={() => setAtvetelModja("szemelyes")}
            className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-3 ${
              atvetelModja === "szemelyes" 
                ? "border-primary bg-primary/5 text-foreground" 
                : "border-border hover:bg-muted/30 text-muted-foreground"
            }`}
          >
            <UserCheck className={`w-4 h-4 mt-0.5 shrink-0 ${atvetelModja === "szemelyes" ? "text-primary" : ""}`} />
            <div>
              <div className="text-xs font-semibold text-foreground">Személyes átvétel az irodában</div>
              <div className="text-[11px] mt-0.5">A munkavállaló az utolsó munkanapon aláírásával igazoltan veszi át az iratokat.</div>
            </div>
          </div>

          <div 
            onClick={() => setAtvetelModja("postai")}
            className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-3 ${
              atvetelModja === "postai" 
                ? "border-primary bg-primary/5 text-foreground" 
                : "border-border hover:bg-muted/30 text-muted-foreground"
            }`}
          >
            <Mail className={`w-4 h-4 mt-0.5 shrink-0 ${atvetelModja === "postai" ? "text-primary" : ""}`} />
            <div>
              <div className="text-xs font-semibold text-foreground">Postai kézbesítés (5 munkanapon belül)</div>
              <div className="text-[11px] mt-0.5">Ajánlott, tértivevényes küldeményként feladva a dolgozó bejelentett lakcímére.</div>
            </div>
          </div>
        </div>

        {atvetelModja === "postai" && (
          <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
            <Label className="text-xs font-medium">Postai ragszám / feladási azonosító (opcionális)</Label>
            <Input
              value={postaiAzonosito}
              onChange={(e) => setPostaiAzonosito(e.target.value)}
              placeholder="pl. RL-984729104-HU"
              className="h-9 text-xs font-mono"
            />
          </div>
        )}
      </div>

      {/* 5. Kiadásra kerülő igazolások jegyzéke */}
      <div className="rounded-lg border bg-card p-4 space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileSignature className="w-3.5 h-3.5 text-primary" />
          5. A Jegyzőkönyvvel Kiadásra Kerülő Törvényes Iratok
        </h4>
        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/20 p-3 rounded-md border">
          {DEFAULT_EXIT_DOCUMENTS.map((doc, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>{doc}</span>
            </div>
          ))}
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
              Igazolások generálása folyamatban...
            </>
          ) : (
            <>
              <FileSignature className="w-4 h-4" />
              {isAlreadyGenerated 
                ? "Kilépő Igazolások Újragenerálása" 
                : "Törvényes Kilépő Igazolások Generálása (PDF)"}
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
          title={`Törvényes Kilépő Igazolások - ${employeeName}`}
        />
      )}
    </div>
  )
}
