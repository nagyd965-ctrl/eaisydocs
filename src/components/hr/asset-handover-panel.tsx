"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Laptop, 
  Plus, 
  Trash2, 
  FileCheck, 
  Loader2, 
  ShieldCheck, 
  Download, 
  Smartphone,
  Key,
  Car,
  Package,
  ArrowLeft,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { 
  getEmployeeAssets, 
  saveAssetItem, 
  deleteAssetItem, 
  generateAndFileAssetHandoverAction,
  fileExistingAssetHandoverDocument
} from "@/app/hr/actions/asset-actions"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

export interface AssetHandoverPanelProps {
  employeeName: string
  dolgozoId?: string | null
  onboardingId?: string | null
  munkakor?: string | null
  onSuccess?: () => void
  onBack?: () => void
}

const CATEGORY_ICONS: Record<string, any> = {
  it: Laptop,
  telekom: Smartphone,
  iroda: Key,
  jarmu: Car,
  egyeb: Package
}

const CATEGORY_NAMES: Record<string, string> = {
  it: "Informatika (Laptop/PC)",
  telekom: "Telekommunikáció (Mobil/SIM)",
  iroda: "Iroda (Kártya/Kulcs)",
  jarmu: "Gépjármű / Üzemanyag",
  egyeb: "Egyéb munkaeszköz"
}

export function AssetHandoverPanel({
  employeeName,
  dolgozoId,
  onboardingId,
  munkakor,
  onSuccess,
  onBack
}: AssetHandoverPanelProps) {
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<any>(null)
  const [isFileLoading, setIsFileLoading] = useState(false)

  // Form state új eszköz hozzáadásához
  const [kategoria, setKategoria] = useState("it")
  const [megnevezes, setMegnevezes] = useState("")
  const [gyariSzam, setGyariSzam] = useState("")
  const [tartozekok, setTartozekok] = useState("")
  const [allapot, setAllapot] = useState("uj")
  const [isAddingItem, setIsAddingItem] = useState(false)

  const loadAssets = async () => {
    setLoading(true)
    const res = await getEmployeeAssets({ dolgozoId, onboardingId })
    setLoading(false)
    if (res.data) setAssets(res.data)
    if (res.existingDocument) setGeneratedDoc(res.existingDocument)
  }

  useEffect(() => {
    loadAssets()
  }, [dolgozoId, onboardingId])

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!megnevezes.trim()) {
      toast.error("Add meg az eszköz megnevezését!")
      return
    }

    setIsAddingItem(true)
    const res = await saveAssetItem({
      dolgozoId,
      onboardingId,
      eszkoz_kategoria: kategoria,
      megnevezes: megnevezes.trim(),
      gyari_szam: gyariSzam.trim() || null,
      tartozekok: tartozekok.trim() || null,
      allapot: allapot
    })
    setIsAddingItem(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Eszköz hozzáadva a listához!")
      setMegnevezes("")
      setGyariSzam("")
      setTartozekok("")
      loadAssets()
    }
  }

  const handleDeleteAsset = async (id: string) => {
    const res = await deleteAssetItem(id)
    if (res.error) toast.error(res.error)
    else {
      toast.success("Eszköz törölve.")
      loadAssets()
    }
  }

  const handleGenerateHandover = async () => {
    if (assets.length === 0) {
      toast.error("Előbb adj hozzá legalább egy eszközt a jegyzőkönyvhöz!")
      return
    }

    setIsGenerating(true)
    const res = await generateAndFileAssetHandoverAction({
      onboardingId,
      dolgozoId,
      employeeName,
      munkakor
    })
    setIsGenerating(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      if (res.isFiled) {
        toast.success("Átadás-átvételi jegyzőkönyv sikeresen legenerálva és beiktatva az eaisyDocs-ba!")
      } else {
        toast.success("Jegyzőkönyv (PDF) sikeresen legenerálva és mentve! Az iktatás a fiók aktiválásakor történik meg.")
      }
      setGeneratedDoc(res.document)
      if (onSuccess) onSuccess()
    }
  }

  const handleFileExistingDoc = async () => {
    if (!generatedDoc?.id || !dolgozoId) return
    setIsFileLoading(true)
    const res = await fileExistingAssetHandoverDocument({
      documentId: generatedDoc.id,
      dolgozoId,
      employeeName
    })
    setIsFileLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Jegyzőkönyv sikeresen beiktatva! Iktatószám: ${res.iktatoszam}`)
      setGeneratedDoc((prev: any) => prev ? { ...prev, iktatoszam: res.iktatoszam } : prev)
      if (onSuccess) onSuccess()
    }
  }

  const applyPreset = (presetName: string, presetCat: string, presetAccessories: string) => {
    setMegnevezes(presetName)
    setKategoria(presetCat)
    setTartozekok(presetAccessories)
  }

  return (
    <div className="space-y-6">
      {/* Fejléc / Navigációs sáv */}
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
              <Laptop className="w-4 h-4 text-primary" /> Munkahelyi Eszközök és Jegyzőkönyv
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tételes kiadás, leltár- és megőrzési felelősségvállalás (Mt. 179. §).
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 shrink-0 self-start sm:self-auto">
          Mt. 179. § Leltárfelelősség
        </Badge>
      </div>

      {/* Létező vagy épp generált jegyzőkönyv kártya */}
      {generatedDoc && (
        <div className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
          generatedDoc.iktatoszam 
            ? "border-success/30 bg-success/10" 
            : "border-warning/30 bg-warning/5"
        }`}>
          <div className="flex items-center gap-3">
            {generatedDoc.iktatoszam ? (
              <ShieldCheck className="w-5 h-5 text-success shrink-0" />
            ) : (
              <FileCheck className="w-5 h-5 text-warning shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground">
                  Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv
                </h4>
                {generatedDoc.iktatoszam ? (
                  <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">
                    Beiktatva: {generatedDoc.iktatoszam}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30">
                    Generálva (Iktatás a fiók aktiválásakor)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {generatedDoc.iktatoszam 
                  ? "Hivatalosan beiktatva az eaisyDocs személyi dossziéba (Mt. 179. § leltárfelelősség)." 
                  : "A jegyzőkönyv PDF elkészült és el van mentve az onboardingban. A fiók aktiválásakor a rendszer automatikusan beiktatja a személyi dossziéba."
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dolgozoId && !generatedDoc.iktatoszam && (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={handleFileExistingDoc}
                disabled={isFileLoading}
                className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {isFileLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Iktatás a dossziéba
              </Button>
            )}
            <PdfViewerDialog url={generatedDoc.url} title="Eszköz Átadás-Átvételi Jegyzőkönyv" />
            <a
              href={generatedDoc.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-1.5 text-xs`}
            >
              <Download className="w-3.5 h-3.5" /> Letöltés
            </a>
          </div>
        </div>
      )}

      {/* 1. Kiadott eszközök listája */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Kiadott Eszközök Listája ({assets.length} db)
          </h4>
          <span className="text-[11px] text-muted-foreground">
            Kizárólagos használatba és megőrzésre átadva
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Eszközök betöltése...
          </div>
        ) : assets.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/10 space-y-1">
            <p className="font-medium text-foreground">Még nincsenek rögzített eszközök.</p>
            <p>Az alábbi űrlapon vagy a fenti gyors gombokkal add hozzá az átadandó laptopot, telefont vagy kulcsot!</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table className="compact-table">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-9 text-center">#</TableHead>
                  <TableHead>Megnevezés</TableHead>
                  <TableHead className="w-32">Kategória</TableHead>
                  <TableHead className="w-36">Sorozatszám / IMEI</TableHead>
                  <TableHead>Tartozékok</TableHead>
                  <TableHead className="w-24 text-center">Állapot</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((item, idx) => {
                  const Icon = CATEGORY_ICONS[item.eszkoz_kategoria] || Package
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}.
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary shrink-0" />
                          <span>{item.megnevezes}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {CATEGORY_NAMES[item.eszkoz_kategoria]?.split(" ")[0] || item.eszkoz_kategoria}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.gyari_szam || <span className="text-muted-foreground/60">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {item.tartozekok || <span className="text-muted-foreground/60">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                          {item.allapot === "uj" ? "Új" : item.allapot === "ujszeru" ? "Újszerű" : item.allapot === "hasznalt" ? "Használt" : "Sérült"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteAsset(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 2. Új eszköz felvétele űrlap */}
      <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-primary" /> Új eszköz hozzáadása
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">Gyors sablon:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2 rounded-full"
              onClick={() => applyPreset("Lenovo ThinkPad T14 Gen 4", "it", "65W USB-C töltő, táska, egér")}
            >
              + Laptop
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2 rounded-full"
              onClick={() => applyPreset("iPhone 15 128GB + Telekom SIM", "telekom", "Töltőkábel, tok")}
            >
              + Telefon
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2 rounded-full"
              onClick={() => applyPreset("Irodai RFID Belépőkártya", "iroda", "Nyakpánt")}
            >
              + Belépőkártya
            </Button>
          </div>
        </div>

        <form onSubmit={handleAddAsset} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Kategória</Label>
              <select
                value={kategoria}
                onChange={(e) => setKategoria(e.target.value)}
                className="w-full h-8 text-xs px-2.5 rounded-md border border-input bg-background font-medium"
              >
                <option value="it">Informatika (Laptop/PC)</option>
                <option value="telekom">Telekommunikáció (Mobil/SIM)</option>
                <option value="iroda">Iroda (Kártya/Kulcs)</option>
                <option value="jarmu">Gépjármű / Üzemanyag</option>
                <option value="egyeb">Egyéb munkaeszköz</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">
                Eszköz Megnevezése <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Pl. Lenovo ThinkPad T14 vagy iPhone 15"
                value={megnevezes}
                onChange={(e) => setMegnevezes(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Sorozatszám / IMEI</Label>
              <Input
                placeholder="Pl. SN-89472619"
                value={gyariSzam}
                onChange={(e) => setGyariSzam(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tartozékok</Label>
              <Input
                placeholder="Pl. Töltő, egér, táska"
                value={tartozekok}
                onChange={(e) => setTartozekok(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Állapot</Label>
              <select
                value={allapot}
                onChange={(e) => setAllapot(e.target.value)}
                className="w-full h-8 text-xs px-2.5 rounded-md border border-input bg-background font-medium"
              >
                <option value="uj">Új</option>
                <option value="ujszeru">Újszerű</option>
                <option value="hasznalt">Használt / Megkímélt</option>
                <option value="serult">Sérült</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isAddingItem || !megnevezes.trim()}
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              {isAddingItem ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Eszköz hozzáadása
            </Button>
          </div>
        </form>
      </div>

      {/* 3. Jegyzőkönyv generálás és iktatás lábléc */}
      <div className="border-t pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> 
            {dolgozoId ? "Hivatalos eaisyDocs Iktatás (3.3 - Eszközfelelősség)" : "Jegyzőkönyv Előkészítése (Pre-onboarding)"}
          </p>
          <p>
            {dolgozoId 
              ? "A jegyzőkönyv generálása elkészíti az Mt. 179. § szerinti felelősségvállalási dokumentumot, és beiktatja a munkavállaló személyi dossziéjába (5 év megőrzési idő)."
              : "A jegyzőkönyv generálása elkészíti a letölthető és aláírható PDF dokumentumot az onboardingban. Az eaisyDocs személyi dossziéba történő iktatás a fiók aktiválásakor történik meg automatikusan."
            }
          </p>
        </div>

        <Button
          type="button"
          onClick={handleGenerateHandover}
          disabled={isGenerating || assets.length === 0}
          className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {dolgozoId ? "Generálás & Iktatás..." : "Jegyzőkönyv generálása..."}
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
              {dolgozoId ? "Jegyzőkönyv Generálása & Iktatás" : "Jegyzőkönyv Generálása (PDF)"}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
