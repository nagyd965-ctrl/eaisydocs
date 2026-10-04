"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Archive, FileCheck, FolderCheck, FolderPlus, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { fileHrDocumentAction, getEmployeeDossierInfo } from "@/app/hr/employee/[id]/actions"

interface FileHrDocumentDialogProps {
  document: {
    id: string
    nev: string
    kategoria?: string | null
    url?: string | null
    iktatoszam?: string | null
  }
  employeeId: string
  employeeName: string
}

export function FileHrDocumentDialog({
  document,
  employeeId,
  employeeName,
}: FileHrDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dossierLoading, setDossierLoading] = useState(false)
  const [dossierInfo, setDossierInfo] = useState<{
    hasDossier: boolean
    dossierId: string | null
    iktatoszam: string | null
    statusz?: string | null
    iratCount: number
    proposedSubject?: string
  } | null>(null)

  const [targy, setTargy] = useState(document.nev)

  // Amikor a dialógus megnyílik, lekérdezzük a dosszié státuszt
  useEffect(() => {
    if (open) {
      setTargy(document.nev)
      setDossierLoading(true)
      getEmployeeDossierInfo(employeeId)
        .then((res: any) => {
          if (!res.error) {
            setDossierInfo(res)
          }
        })
        .catch((err) => {
          console.error("Dosszié info lekérési hiba:", err)
        })
        .finally(() => {
          setDossierLoading(false)
        })
    }
  }, [open, employeeId, document.nev])

  const handleFiling = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targy.trim()) {
      toast.error("A tárgy megadása kötelező az iktatáshoz!")
      return
    }

    setLoading(true)
    try {
      const res = await fileHrDocumentAction(document.id, employeeId, targy.trim())
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          `Sikeresen iktatva! Iktatószám: ${res.iktatoszam}${
            res.isNewDossier ? " (Új személyi dosszié megnyitva)" : ""
          }`
        )
        setOpen(false)
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Váratlan hiba történt az iktatás során.")
    } finally {
      setLoading(false)
    }
  }

  // Ha már iktatva van a dokumentum, nem nyitható meg
  if (document.iktatoszam) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 hover:border-primary transition-colors"
          />
        }
      >
        <Archive className="w-3.5 h-3.5" />
        Iktatás eaisyDocs-ba
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Hivatalos Iktatás eaisyDocs-ba</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Dokumentum beiktatása a munkavállaló személyi dossziéjába.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleFiling} className="space-y-4 pt-2">
          {/* Dosszié információ kártya */}
          <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Munkavállalói Dosszié</span>
              {dossierLoading ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Keresés...</span>
                </div>
              ) : dossierInfo?.hasDossier ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[11px] gap-1">
                  <FolderCheck className="w-3 h-3" /> Meglévő dosszié
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-[11px] gap-1">
                  <FolderPlus className="w-3 h-3" /> Új dosszié nyitása
                </Badge>
              )}
            </div>

            <div className="text-sm font-medium">
              {dossierLoading ? (
                <div className="h-5 w-48 bg-muted animate-pulse rounded" />
              ) : dossierInfo?.hasDossier ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground font-semibold">{dossierInfo.iktatoszam}</span>
                  <span className="text-xs text-muted-foreground">
                    {employeeName} személyi dossziéja ({dossierInfo.iratCount} korábbi irat)
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground font-semibold">
                    {employeeName} személyi dossziéja
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Első iratként új dosszié nyílik (HR/2026/XXXXXX)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Irat adatok */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="targy" className="text-xs font-medium">
                Hivatalos irat tárgya az iktatókönyvben *
              </Label>
              <Input
                id="targy"
                value={targy}
                onChange={(e) => setTargy(e.target.value)}
                placeholder="Pl. Munkaszerződés - Kovács Anna"
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-md border bg-background space-y-1">
                <span className="text-muted-foreground block text-[11px]">Irattári tétel & megőrzés</span>
                <span className="font-medium text-foreground block">3.1 HR és Munkaügy</span>
                <span className="text-[11px] text-muted-foreground">50 év megőrzési idő</span>
              </div>
              <div className="p-2.5 rounded-md border bg-background space-y-1">
                <span className="text-muted-foreground block text-[11px]">Biztonsági minősítés</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[11px] gap-1 font-medium">
                    <ShieldAlert className="w-3 h-3 text-warning" /> Bizalmas HR
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">GDPR & személyiségi védelem</span>
              </div>
            </div>
          </div>

          {/* Figyelmeztető / Tájékoztató szöveg */}
          <div className="p-2.5 rounded-md bg-muted/30 border border-border/60 text-xs text-muted-foreground">
            Az iktatás után a dokumentum hivatalos sorszámot kap az eaisyDocs rendszerben, és a HR felületről többé nem törölhető a jogszabályi iratkezelési szabályok védelmében.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || dossierLoading}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iktatás folyamatban...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Iktatás megerősítése
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
