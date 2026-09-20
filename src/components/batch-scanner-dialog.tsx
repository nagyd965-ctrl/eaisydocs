"use client"

import { useState } from "react"
import { uploadAndSplitBatch, triggerHotfolderSync } from "@/app/inbox/batch-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Layers,
  Printer,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  FileCheck,
} from "lucide-react"

const minositesMap: Record<string, string> = {
  nyilt: "Nyílt (Normál)",
  belso: "Belső használatra",
  bizalmas: "Bizalmas",
  szigoruan_bizalmas: "Szigorúan bizalmas",
}

export function BatchScannerDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    count: number
    totalOriginalPages: number
    separatorPagesFound: number[]
    documents: any[]
  } | null>(null)
  const [syncReport, setSyncReport] = useState<any | null>(null)

  const [minosites, setMinosites] = useState("nyilt")

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setError(null)
      setResult(null)
      setSyncReport(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData(e.currentTarget)

    try {
      const res = await uploadAndSplitBatch(formData)
      if (!res.success) {
        setError(res.error || "Hiba történt a szétbontás során.")
      } else {
        setResult({
          count: res.count || 0,
          totalOriginalPages: res.totalOriginalPages || 0,
          separatorPagesFound: res.separatorPagesFound || [],
          documents: res.documents || [],
        })
      }
    } catch (_err: any) {
      setError("Váratlan hiba történt a köteg feldolgozása közben.")
    } finally {
      setLoading(false)
    }
  }

  const handleSyncHotfolder = async () => {
    setSyncLoading(true)
    setError(null)
    try {
      const res = await triggerHotfolderSync()
      if (!res.success) {
        setError(res.error || "Hiba történt a szkenner mappa ellenőrzésekor.")
      } else {
        setSyncReport(res.report)
      }
    } catch (err: any) {
      setError("Hiba történt: " + err.message)
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" className="border-border/60">
            Kötegelt szkennelés
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 gap-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">
            Kötegelt PDF szétbontása és érkeztetése
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Tölts fel egy elválasztólapokkal összefűzött kötegelt PDF-et. A rendszer automatikusan felismeri a
            vonalkódokat, eltávolítja az elválasztólapokat, és önálló iratokként érkezteti a dokumentumokat a bejövő sorba.
          </DialogDescription>
        </DialogHeader>

        {/* Separator Sheet Download Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs">
          <div className="space-y-0.5 min-w-0">
            <div className="font-semibold text-foreground text-sm">
              Szabványos eaisyDocs elválasztólap (A4)
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Nyomtasd ki és helyezd a fizikai papíriratok közé a szkenner adagolójában. A rendszer automatikusan felismeri és kidobja.
            </p>
          </div>
          <a
            href="/api/scanner/separator-sheet"
            download="eaisyDocs_elvalaszto_lap.pdf"
            className="inline-flex items-center justify-center rounded-md text-xs font-semibold border border-primary/30 bg-background px-3.5 py-2 hover:bg-primary/10 hover:text-primary transition-colors shrink-0 shadow-none"
          >
            PDF Letöltése
          </a>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Report */}
        {result && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Sikeres köteg-szétbontás és érkeztetés!
              </div>
              <span className="text-[11px] text-muted-foreground">
                Elválasztólapok automatikusan kiszűrve
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-background/90 border">
                <div className="text-muted-foreground text-[10px] uppercase font-semibold">Összes oldal</div>
                <div className="text-base font-semibold tabular-nums mt-0.5">{result.totalOriginalPages}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/90 border">
                <div className="text-muted-foreground text-[10px] uppercase font-semibold">Elválasztó lapok</div>
                <div className="text-base font-semibold text-amber-500 tabular-nums mt-0.5">
                  {result.separatorPagesFound.length} db (kidobva)
                </div>
              </div>
              <div className="p-3 rounded-lg bg-background/90 border">
                <div className="text-muted-foreground text-[10px] uppercase font-semibold">Létrejött iratok</div>
                <div className="text-base font-semibold text-primary tabular-nums mt-0.5">{result.count} db</div>
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <div className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Érkeztetett iratok ({result.documents.length}):
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {result.documents.map((d: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-background/90 border text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="flex items-center justify-center h-5 w-5 rounded bg-primary/10 text-primary font-mono text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium truncate text-foreground" title={d.targy}>
                        {d.targy}
                      </span>
                      {d.pageCount && (
                        <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                          {d.pageCount} oldal
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-primary font-semibold shrink-0 text-[11px] bg-primary/5 border border-primary/20 px-2 py-0.5 rounded">
                      {d.erkeztetoszam}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hotfolder Sync Report */}
        {syncReport && (
          <div className="p-3 rounded-lg bg-muted/60 border text-xs space-y-2">
            <div className="font-semibold flex items-center justify-between">
              <span>Szkenner mappa ellenőrzés eredménye:</span>
              <span className="text-[10px] text-muted-foreground">
                {syncReport.scannedFilesFound} fájl található
              </span>
            </div>
            {syncReport.scannedFilesFound === 0 ? (
              <p className="text-muted-foreground">
                A szkenner bemeneti mappájában (`/scanner_hotfolder/input`) jelenleg nincs új fájl.
              </p>
            ) : (
              <p className="text-primary font-medium">
                {syncReport.processedFiles} fájl feldolgozva, összesen{" "}
                {syncReport.totalDocumentsCreated} önálló irat érkeztetve!
              </p>
            )}
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-file" className="text-xs font-medium">
              Kötegelt összefűzött PDF fájl *
            </Label>
            <Input
              id="batch-file"
              name="file"
              type="file"
              accept=".pdf,application/pdf"
              required
              className="cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targy_prefix" className="text-xs font-medium">
                Tárgy előtag (opcionális)
              </Label>
              <Input
                id="targy_prefix"
                name="targy_prefix"
                placeholder="Pl. Postai köteg 2026-09-17"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-minosites" className="text-xs font-medium">
                Biztonsági minősítés
              </Label>
              <input type="hidden" name="minosites" value={minosites} />
              <Select name="minosites" value={minosites} onValueChange={(v) => setMinosites(v || "nyilt")}>
                <SelectTrigger id="batch-minosites" className="text-xs w-full">
                  <SelectValue placeholder="Válassz minősítést...">
                    {minositesMap[minosites] || "Nyílt (Normál)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nyilt" label="Nyílt (Normál)">Nyílt (Normál)</SelectItem>
                  <SelectItem value="belso" label="Belső használatra">Belső használatra</SelectItem>
                  <SelectItem value="bizalmas" label="Bizalmas">Bizalmas</SelectItem>
                  <SelectItem value="szigoruan_bizalmas" label="Szigorúan bizalmas">Szigorúan bizalmas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSyncHotfolder}
              disabled={syncLoading || loading}
              className="text-xs text-muted-foreground hover:text-foreground shrink-0 justify-center sm:justify-start"
            >
              {syncLoading && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Szkenner mappa ellenőrzése
            </Button>

            <div className="flex items-center gap-2 justify-end shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Bezárás
              </Button>
              <Button type="submit" size="sm" disabled={loading || syncLoading} className="font-medium px-4">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Szétvágás és Érkeztetés
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
