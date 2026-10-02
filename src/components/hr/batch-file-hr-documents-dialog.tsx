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
import { Badge } from "@/components/ui/badge"
import { Archive, FileCheck, FolderCheck, FolderPlus, Loader2, ShieldAlert, Layers } from "lucide-react"
import { toast } from "sonner"
import { fileAllHrDocumentsAction, getEmployeeDossierInfo } from "@/app/hr/employee/[id]/actions"

interface BatchFileHrDocumentsDialogProps {
  employeeId: string
  employeeName: string
  unfiledDocs: Array<{
    id: string
    nev: string
    kategoria?: string | null
    url?: string | null
    created_at: string
  }>
}

export function BatchFileHrDocumentsDialog({
  employeeId,
  employeeName,
  unfiledDocs,
}: BatchFileHrDocumentsDialogProps) {
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

  useEffect(() => {
    if (open) {
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
  }, [open, employeeId])

  // Ha nincs iktatatlan dokumentum, a gomb meg sem jelenik
  if (!unfiledDocs || unfiledDocs.length === 0) {
    return null
  }

  const handleBatchFiling = async () => {
    setLoading(true)
    try {
      const res = await fileAllHrDocumentsAction(employeeId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          `Sikeres kötegelt iktatás! ${res.filedCount} dokumentum bekerült a(z) ${res.iktatoszam} személyi dossziéba.`
        )
        setOpen(false)
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Váratlan hiba történt a kötegelt iktatás során.")
    } finally {
      setLoading(false)
    }
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
        Összes iktatása eaisyDocs-ba ({unfiledDocs.length})
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Teljes Személyi Dosszié Iktatása</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {employeeName} összes ({unfiledDocs.length} db) belső HR vázlatának egyidejű beiktatása az eaisyDocs-ba.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Cél dosszié állapot kártya */}
          <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Cél Személyi Dosszié</span>
              {dossierLoading ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Keresés...</span>
                </div>
              ) : dossierInfo?.hasDossier ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] gap-1">
                  <FolderCheck className="w-3 h-3" /> Meglévő dosszié folytatása
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px] gap-1">
                  <FolderPlus className="w-3 h-3" /> Új központi dosszié nyitása
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
                    {employeeName} személyi dossziéja ({dossierInfo.iratCount} korábbi irat mellé érkezik {unfiledDocs.length} új alszám)
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground font-semibold">
                    {employeeName} személyi dossziéja
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Megnyílik a központi HR dosszié, a dokumentumok /1, /2, /{unfiledDocs.length} alszámokat kapnak.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Iktatandó dokumentumok listája */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground flex justify-between items-center">
              <span>Beiktatásra váró iratok listája</span>
              <span className="text-[11px]">{unfiledDocs.length} tétel</span>
            </span>
            <div className="max-h-48 overflow-y-auto border rounded-md divide-y bg-background">
              {unfiledDocs.map((doc, idx) => (
                <div key={doc.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="font-medium text-foreground truncate">{doc.nev}</p>
                      <p className="text-[11px] text-muted-foreground">{doc.kategoria || "Egyéb"}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                    Alszám: +{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Garanciák */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-md border bg-background space-y-1">
              <span className="text-muted-foreground block text-[11px]">Irattári tétel & megőrzés</span>
              <span className="font-medium text-foreground block">3.1 HR és Munkaügy</span>
              <span className="text-[11px] text-muted-foreground">50 év megőrzési idő (nem selejtezhető)</span>
            </div>
            <div className="p-2.5 rounded-md border bg-background space-y-1">
              <span className="text-muted-foreground block text-[11px]">Biztonsági minősítés</span>
              <div className="flex items-center gap-1.5 pt-0.5">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px] gap-1 font-medium">
                  <ShieldAlert className="w-3 h-3 text-amber-600" /> Bizalmas HR
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">GDPR & személyiségi jogi védelem</span>
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-muted/30 border border-border/60 text-xs text-muted-foreground">
            A kötegelt iktatás után mind a {unfiledDocs.length} dokumentum hivatalos gap-mentes iktatószámot kap, és a jogszabályi előírásoknak megfelelően zárolásra kerül a HR felületen.
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
              type="button"
              size="sm"
              onClick={handleBatchFiling}
              disabled={loading || dossierLoading}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kötegelt iktatás folyamatban...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Összes iktatása ({unfiledDocs.length} irat)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
