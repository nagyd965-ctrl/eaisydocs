"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Laptop, 
  FileCheck, 
  Download, 
  Loader2, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText,
  PackageCheck
} from "lucide-react"
import { toast } from "sonner"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { generateAssetReturnSheetAction, fileSingleOffboardingDocument } from "@/app/hr/offboarding/actions"
import { type AssetReturnItem } from "@/utils/hr/asset-return-pdf-generator"

export interface AssetReturnPanelProps {
  offboardingId: string
  employeeName: string
  dolgozoId?: string | null
  munkakor?: string | null
  reszleg?: string | null
  initialAssets?: any[]
  initialData?: any
  onSuccess?: () => void
  onBack?: () => void
}

export function AssetReturnPanel({
  offboardingId,
  employeeName,
  dolgozoId,
  munkakor,
  reszleg,
  initialAssets = [],
  initialData,
  onSuccess,
  onBack
}: AssetReturnPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFileLoading, setIsFileLoading] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(initialData?.assetReturnDoc?.url || null)
  const [docId, setDocId] = useState<string | null>(initialData?.assetReturnDoc?.documentId || null)
  const [iktatoszam, setIktatoszam] = useState<string | null>(initialData?.assetReturnDoc?.iktatoszam || null)
  const [iktatvaEkor, setIktatvaEkor] = useState<string | null>(initialData?.assetReturnDoc?.iktatvaEkor || null)

  // Visszavételi dátum
  const [visszavetelDatuma, setVisszavetelDatuma] = useState(
    initialData?.utolso_munkaban_toltott_nap || initialData?.kilepes_datuma || new Date().toISOString().split("T")[0]
  )
  const [fizetendoKarteritesOsszeg, setFizetendoKarteritesOsszeg] = useState<number>(0)
  const [vagyoniNyilatkozat, setVagyoniNyilatkozat] = useState<string>("")

  // Szinkronizálás amikor a detailData megérkezik
  useEffect(() => {
    if (initialData?.assetReturnDoc?.url) {
      setCurrentPdfUrl(initialData.assetReturnDoc.url)
    }
    if (initialData?.assetReturnDoc?.documentId) {
      setDocId(initialData.assetReturnDoc.documentId)
    }
    if (initialData?.assetReturnDoc?.iktatoszam) {
      setIktatoszam(initialData.assetReturnDoc.iktatoszam)
    }
    if (initialData?.assetReturnDoc?.iktatvaEkor) {
      setIktatvaEkor(initialData.assetReturnDoc.iktatvaEkor)
    }
    if (initialData?.utolso_munkaban_toltott_nap || initialData?.kilepes_datuma) {
      setVisszavetelDatuma(initialData.utolso_munkaban_toltott_nap || initialData.kilepes_datuma)
    }
  }, [initialData])

  // Eszköz lista összeállítása a meglévő munkahelyi eszközökből
  const [items, setItems] = useState<AssetReturnItem[]>(() => {
    if (initialAssets && initialAssets.length > 0) {
      return initialAssets.map(a => ({
        megnevezes: a.megnevezes,
        eszkoz_kategoria: a.eszkoz_kategoria || "it",
        gyari_szam: a.gyari_szam || null,
        tartozekok: a.tartozekok || null,
        visszavetel_allapot: (a.allapot === "serult" ? "serult" : "ep") as any,
        visszavetel_megjegyzes: a.megjegyzes || ""
      }))
    }
    // Ha a dolgozóhoz nem volt előzetesen munkaeszköz rögzítve az eaisyHR-ben, üres listával indul
    return []
  })


  // Új eszköz sor
  const [newMegnevezes, setNewMegnevezes] = useState("")
  const [newKategoria, setNewKategoria] = useState("it")
  const [newGyariSzam, setNewGyariSzam] = useState("")

  const handleAddItem = () => {
    if (!newMegnevezes.trim()) return
    setItems(prev => [
      ...prev,
      {
        megnevezes: newMegnevezes.trim(),
        eszkoz_kategoria: newKategoria,
        gyari_szam: newGyariSzam.trim() || undefined,
        visszavetel_allapot: "ep",
        visszavetel_megjegyzes: ""
      }
    ])
    setNewMegnevezes("")
    setNewGyariSzam("")
  }

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateItem = (index: number, field: keyof AssetReturnItem, value: any) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item))
  }

  const isAlreadyGenerated = Boolean(currentPdfUrl)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await generateAssetReturnSheetAction(offboardingId, {
        items,
        visszavetelDatuma,
        fizetendoKarteritesOsszeg: Number(fizetendoKarteritesOsszeg || 0),
        vagyoniElszamolasNyilatkozat: vagyoniNyilatkozat.trim() || undefined
      })

      if (res.error) {
        toast.error("Hiba a leszámoló lap generálásakor", { description: res.error })
      } else {
        toast.success("Eszköz Visszavételi és Leszámoló Lap (PDF) sikeresen legenerálva és mentve!", {
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
    const targetDocId = docId || initialData?.assetReturnDoc?.documentId
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
        customTargy: `Eszköz Visszavételi Lap - ${employeeName}`
      })
      if ("error" in res && res.error) {
        toast.error("Iktatási hiba", { description: String(res.error) })
      } else if ("iktatoszam" in res && res.iktatoszam) {
        toast.success(`Dokumentum sikeresen beiktatva! Iktatószám: ${res.iktatoszam}`)
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
              <Laptop className="w-4 h-4 text-primary" />
              Eszköz Visszavétel és Vagyoni Leszámolás (Mt. 179. § / Mt. 80. §)
            </h3>
            <p className="text-xs text-muted-foreground">
              A dolgozóhoz kiadott céges munkaeszközök hiánytalan visszavétele és vagyoni elszámolás rögzítése.
            </p>
          </div>
        </div>
      </div>

      {/* Állapotjelző kártya */}
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
              {iktatoszam ? <ShieldCheck className="w-5 h-5" /> : <PackageCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  {iktatoszam 
                    ? "Eszköz elszámolási jegyzőkönyv kiállítva és beiktatva" 
                    : "Elkészült Eszköz Visszavételi és Vagyoni Leszámoló Lap"}
                </span>
                <Badge variant="outline" className="bg-background text-muted-foreground text-[10px] font-mono border-muted">
                  1.4 Tétel (5 év)
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
                    A dokumentum hivatalosan beiktatásra került az eaisyDocs személyi dossziéba ({iktatoszam}).
                    {iktatvaEkor && (
                      <span className="ml-1 opacity-80">
                        Iktatás ideje: {new Date(iktatvaEkor).toLocaleDateString("hu-HU")} {new Date(iktatvaEkor).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </>
                ) : (
                  "A leszámoló lap PDF elkészült az offboardingban. Az eszközök visszavétele után a kiléptetési folyamat lezárásakor automatikusan a személyi dossziéba iktatódik."
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

      {/* Dátum és elszámolási keret */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="visszavetelDatuma" className="text-xs font-medium">
              Eszközvisszavétel hivatalos dátuma
            </Label>
            <Input
              id="visszavetelDatuma"
              type="date"
              value={visszavetelDatuma}
              onChange={(e) => setVisszavetelDatuma(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="karterites" className="text-xs font-medium">
              Esetleges kártérítési összeg (Ft)
            </Label>
            <Input
              id="karterites"
              type="number"
              min={0}
              step={1000}
              value={fizetendoKarteritesOsszeg}
              onChange={(e) => setFizetendoKarteritesOsszeg(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="h-9 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              0 Ft = Teljes vagyoni és leltárhiány-mentesség igazolása.
            </p>
          </div>
        </div>
      </div>

      {/* Eszközök táblázata */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-primary" />
            Leadásra kerülő céges eszközök ({items.length} db)
          </h4>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2.5 text-center border border-dashed rounded-md bg-muted/10">
            Nincs rögzített leadandó eszköz (nemleges vagyoni elszámolás).
          </p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-md border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{item.megnevezes}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {item.eszkoz_kategoria}
                    </Badge>
                    {item.gyari_szam && (
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                        Gyári szám: <span className="font-semibold text-foreground">{item.gyari_szam}</span>
                      </span>
                    )}
                  </div>
                  {item.tartozekok && (
                    <p className="text-[11px] text-muted-foreground">Tartozékok: {item.tartozekok}</p>
                  )}
                  <Input
                    placeholder="Állapot megjegyzés (pl. enyhe karc, hiánytalan)..."
                    value={item.visszavetel_megjegyzes || ""}
                    onChange={(e) => handleUpdateItem(idx, "visszavetel_megjegyzes", e.target.value)}
                    className="h-7 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={item.visszavetel_allapot}
                    onChange={(e) => handleUpdateItem(idx, "visszavetel_allapot", e.target.value)}
                    className="h-8 px-2 rounded-md border border-input bg-background text-xs font-medium"
                  >
                    <option value="ep">✓ Ép / Hibátlan</option>
                    <option value="normal_kopas">Rendeltetésszerű kopás</option>
                    <option value="serult">⚠ Sérült / Hibás</option>
                    <option value="hianyzik">✕ Hiányzik</option>
                  </select>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(idx)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Új eszköz hozzáadása */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <Input
            placeholder="Eszköz megnevezése (pl. Lenovo ThinkPad T14, belépőkártya)..."
            value={newMegnevezes}
            onChange={(e) => setNewMegnevezes(e.target.value)}
            className="h-8 text-xs flex-1 min-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddItem()
            }}
          />
          <select
            value={newKategoria}
            onChange={(e) => setNewKategoria(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium shrink-0"
          >
            <option value="it">IT / Hardver</option>
            <option value="telekom">Mobil / Telekom</option>
            <option value="iroda">Iroda / Kulcs / Kártya</option>
            <option value="jarmu">Gépjármű</option>
            <option value="egyeb">Egyéb</option>
          </select>
          <Input
            placeholder="Gyári szám / azonosító (pl. PF3XYZ12)..."
            value={newGyariSzam}
            onChange={(e) => setNewGyariSzam(e.target.value)}
            className="h-8 text-xs w-full sm:w-72 lg:w-80 font-mono shrink-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddItem()
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={!newMegnevezes.trim()}
            className="h-8 px-3.5 gap-1.5 shrink-0 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Hozzáadás
          </Button>
        </div>
      </div>

      {/* Vagyoni nyilatkozat */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <Label htmlFor="nyilatkozat" className="text-xs font-medium">
          Egyedi vagyoni záradék / megjegyzés (opcionális)
        </Label>
        <Input
          id="nyilatkozat"
          value={vagyoniNyilatkozat}
          onChange={(e) => setVagyoniNyilatkozat(e.target.value)}
          placeholder="Pl. a SIM kártya telefonszáma a dolgozó saját nevére átírásra kerül..."
          className="h-9 text-xs"
        />
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
              Leszámoló Lap Generálása...
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
              {items.length === 0
                ? (isAlreadyGenerated ? "Nemleges Leszámoló Lap Újragenerálása" : "Nemleges Leszámoló Lap Generálása (0 Ft)")
                : (isAlreadyGenerated ? "Eszköz Visszavételi Lap Újragenerálása" : "Eszköz Visszavételi Lap Generálása (PDF)")}
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
          title={`Eszköz Visszavételi Lap - ${employeeName}`}
        />
      )}
    </div>
  )
}
