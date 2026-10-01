"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog"
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
  Printer, 
  Download, 
  Eye,
  Smartphone,
  Key,
  Car,
  Package
} from "lucide-react"
import { toast } from "sonner"
import { 
  getEmployeeAssets, 
  saveAssetItem, 
  deleteAssetItem, 
  generateAndFileAssetHandoverAction 
} from "@/app/hr/actions/asset-actions"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

interface AssetHandoverDialogProps {
  employeeName: string
  dolgozoId?: string | null
  onboardingId?: string | null
  munkakor?: string | null
  triggerButton?: React.ReactNode
  onSuccess?: () => void
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

export function AssetHandoverDialog({
  employeeName,
  dolgozoId,
  onboardingId,
  munkakor,
  triggerButton,
  onSuccess
}: AssetHandoverDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<any>(null)

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
  }

  useEffect(() => {
    if (open) {
      loadAssets()
      setGeneratedDoc(null)
    }
  }, [open, dolgozoId, onboardingId])

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
      toast.success("Átadás-átvételi jegyzőkönyv sikeresen legenerálva és beiktatva!")
      setGeneratedDoc(res.document)
      if (onSuccess) onSuccess()
    }
  }

  // Gyors sablon előválasztó
  const applyPreset = (presetName: string, presetCat: string, presetAccessories: string) => {
    setMegnevezes(presetName)
    setKategoria(presetCat)
    setTartozekok(presetAccessories)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        nativeButton={false}
        render={
          triggerButton ? (
            (triggerButton as any)
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Laptop className="w-3.5 h-3.5" /> Eszközök átadása & Jkv
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto p-0 flex flex-col">
        {/* Fejléc */}
        <div className="bg-muted/40 p-6 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Munkahelyi Eszközök és Átadás-Átvételi Jegyzőkönyv
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Munkavállaló: <strong>{employeeName}</strong> • {munkakor || "Munkatárs"}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 shrink-0">
              Mt. 179. § Leltárfelelősség
            </Badge>
          </div>
        </div>

        {/* Tartalom */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Ha frissen lett generálva a dokumentum */}
          {generatedDoc && (
            <div className="border border-emerald-500/30 bg-emerald-500/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Jegyzőkönyv sikeresen kiállítva és beiktatva!
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {generatedDoc.iktatoszam ? `Iktatószám: ${generatedDoc.iktatoszam}` : "Dokumentum a rendszerbe elmentve."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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

          {/* 1. Kiadott / Tervezett Eszközök Listája */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kiadott Eszközök Listája ({assets.length} db)
              </h3>
              <span className="text-xs text-muted-foreground">
                Kizárólagos használatba és megőrzésre átadva
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />
                Eszközök betöltése...
              </div>
            ) : assets.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                Még nincsenek rögzített eszközök. Az alábbi űrlapon add hozzá az átadandó laptopot, telefont vagy kulcsot!
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/40 text-xs">
                    <TableRow>
                      <TableHead>Eszköz</TableHead>
                      <TableHead>Kategória</TableHead>
                      <TableHead>Sorozatszám / IMEI</TableHead>
                      <TableHead>Tartozékok</TableHead>
                      <TableHead className="w-[80px]">Állapot</TableHead>
                      <TableHead className="w-[50px] text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {assets.map((asset) => {
                      const IconComponent = CATEGORY_ICONS[asset.eszkoz_kategoria] || Laptop
                      return (
                        <TableRow key={asset.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium flex items-center gap-2">
                            <IconComponent className="w-3.5 h-3.5 text-primary shrink-0" />
                            {asset.megnevezes}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {CATEGORY_NAMES[asset.eszkoz_kategoria] || asset.eszkoz_kategoria}
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            {asset.gyari_szam || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[180px]">
                            {asset.tartozekok || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {asset.allapot === "uj" ? "Új" : asset.allapot === "ujszeru" ? "Újszerű" : "Használt"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAsset(asset.id)}
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

          {/* 2. Új Eszköz Hozzáadása */}
          <div className="border rounded-xl p-4 bg-muted/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                + Új Eszköz Hozzáadása
              </h4>

              {/* Gyors sablonok */}
              <div className="flex gap-1.5 flex-wrap">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] px-2"
                  onClick={() => applyPreset("Lenovo ThinkPad T14", "it", "65W USB-C töltő, táska, egér")}
                >
                  + Laptop
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] px-2"
                  onClick={() => applyPreset("Apple iPhone 15", "telekom", "Töltőkábel, SIM kártya")}
                >
                  + Telefon
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] px-2"
                  onClick={() => applyPreset("Céges Belépőkártya", "iroda", "Nyakpánt")}
                >
                  + Belépőkártya
                </Button>
              </div>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Kategória</Label>
                  <select
                    value={kategoria}
                    onChange={(e) => setKategoria(e.target.value)}
                    className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background font-medium"
                  >
                    <option value="it">Informatika (Laptop/PC)</option>
                    <option value="telekom">Telekommunikáció (Mobil/SIM)</option>
                    <option value="iroda">Iroda (Kártya/Kulcs)</option>
                    <option value="jarmu">Gépjármű / Üzemanyag</option>
                    <option value="egyeb">Egyéb munkaeszköz</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">Eszköz Megnevezése *</Label>
                  <Input
                    placeholder="Pl. Lenovo ThinkPad T14 vagy iPhone 15"
                    value={megnevezes}
                    onChange={(e) => setMegnevezes(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Sorozatszám / IMEI</Label>
                  <Input
                    placeholder="Pl. SN-89472619"
                    value={gyariSzam}
                    onChange={(e) => setGyariSzam(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Tartozékok</Label>
                  <Input
                    placeholder="Pl. Töltő, egér, táska"
                    value={tartozekok}
                    onChange={(e) => setTartozekok(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Állapot</Label>
                  <select
                    value={allapot}
                    onChange={(e) => setAllapot(e.target.value)}
                    className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background font-medium"
                  >
                    <option value="uj">Új</option>
                    <option value="ujszeru">Újszerű</option>
                    <option value="hasznalt">Használt</option>
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
                  {isAddingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Eszköz hozzáadása
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Lábléc: Generálás és iktatás */}
        <DialogFooter className="p-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-muted-foreground text-left leading-relaxed">
            A generálás elkészíti az Mt. 179. § szerinti felelősségvállalási jegyzőkönyvet, és beiktatja a személyi dossziéba.
          </p>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Bezárás
            </Button>
            <Button
              onClick={handleGenerateHandover}
              disabled={isGenerating || assets.length === 0}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              size="sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Jegyzőkönyv generálása...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Jegyzőkönyv Generálása & Iktatás
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
