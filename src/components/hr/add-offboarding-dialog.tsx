"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserMinus, Loader2, Calendar, Scale, Briefcase } from "lucide-react"
import { createOffboarding } from "@/app/hr/offboarding/actions"
import { toast } from "sonner"
import { type Employee } from "@/types/hr"
import { TERMINATION_TYPE_LABELS, type TerminationType } from "@/utils/hr/termination-constants"

interface AddOffboardingDialogProps {
  employees?: Employee[]
  preselectedEmployeeId?: string
  preselectedEmployeeName?: string
  triggerButton?: React.ReactNode
}

export function AddOffboardingDialog({ 
  employees = [], 
  preselectedEmployeeId, 
  preselectedEmployeeName, 
  triggerButton 
}: AddOffboardingDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(preselectedEmployeeId || "")
  const [megszunesModja, setMegszunesModja] = useState<TerminationType>("kozos_megegyezes")
  const [utolsoMunkanap, setUtolsoMunkanap] = useState("")
  const [kilepesDatuma, setKilepesDatuma] = useState("")
  const [indoklas, setIndoklas] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const safeEmployees = Array.isArray(employees) ? employees : []
  const effectiveId = preselectedEmployeeId || selectedId
  const selectedEmployee = safeEmployees.find(e => e.id === effectiveId)
  const effectiveEmployeeName = preselectedEmployeeName || selectedEmployee?.nev || "Kiválasztott munkatárs"

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      if (preselectedEmployeeId) {
        setSelectedId(preselectedEmployeeId)
      }
    } else {
      if (!preselectedEmployeeId) {
        setSelectedId("")
      }
      setUtolsoMunkanap("")
      setKilepesDatuma("")
      setIndoklas("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = preselectedEmployeeId || selectedId
    if (!targetId) return

    setIsLoading(true)
    try {
      const finalDate = kilepesDatuma || utolsoMunkanap || new Date().toISOString().split("T")[0]
      const res = await createOffboarding(targetId, finalDate, {
        megszunesModja,
        utolsoMunkanap: utolsoMunkanap || finalDate,
        indoklas: indoklas.trim() || undefined
      })

      if (res.error) {
        toast.error("Hiba a mentés során", { description: res.error })
      } else {
        toast.success("Kiléptetési folyamat sikeresen elindítva", {
          description: "A rendszer legenerálta az alapértelmezett felelős feladatokat."
        })
        setOpen(false)
        if (!preselectedEmployeeId) {
          setSelectedId("")
        }
        setUtolsoMunkanap("")
        setKilepesDatuma("")
        setIndoklas("")
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {triggerButton ? (
        <span onClick={() => handleOpenChange(true)}>{triggerButton}</span>
      ) : (
        <Button onClick={() => handleOpenChange(true)} className="gap-2">
          <UserMinus className="h-4 w-4" />
          Új kilépő hozzáadása
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[550px] p-0 flex flex-col max-h-[92vh] overflow-y-auto">
          {/* Fejléc */}
          <div className="bg-muted/40 p-6 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Új Kiléptetési Folyamat Indítása
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Válaszd ki a távozó dolgozót és a megszűnés tervezett módját az automatikus feladatkiosztáshoz.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-4">
              {/* Dolgozó kiválasztása */}
              <div className="grid gap-1.5">
                <Label htmlFor="employee" className="text-xs font-medium">Dolgozó kiválasztása *</Label>
                {preselectedEmployeeId ? (
                  <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30 border-primary/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold border border-primary/20">
                        {effectiveEmployeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{effectiveEmployeeName}</p>
                        <p className="text-[11px] text-muted-foreground">Közvetlen kiléptetés indítása az adatlapról</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Kiválasztva
                    </span>
                  </div>
                ) : (
                  <Select value={selectedId} onValueChange={(val) => setSelectedId(val || "")} required>
                    <SelectTrigger id="employee" className="h-9 text-xs">
                      {selectedId
                        ? <span className="font-medium">{selectedEmployee?.nev || "Ismeretlen dolgozó"}</span>
                        : <span className="text-muted-foreground">Válassz aktív munkatársat...</span>
                      }
                    </SelectTrigger>
                    <SelectContent>
                      {safeEmployees.map((emp) => (
                        <SelectItem 
                          key={emp.id} 
                          value={emp.id} 
                          disabled={emp.hasActiveOffboarding}
                          className="text-xs"
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="font-medium">{emp.nev || "Ismeretlen"}</span>
                            {emp.hasActiveOffboarding && (
                              <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded font-normal">
                                Kiléptetés folyamatban
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Megszűnés módja */}
              <div className="grid gap-1.5">
                <Label htmlFor="megszunesModja" className="text-xs font-medium">
                  Munkaviszony megszűnésének tervezett módja
                </Label>
                <select
                  id="megszunesModja"
                  value={megszunesModja}
                  onChange={(e) => setMegszunesModja(e.target.value as TerminationType)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Object.entries(TERMINATION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Dátumok */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="utolsoMunkanap" className="text-xs font-medium">Utolsó munkanap</Label>
                  <Input
                    id="utolsoMunkanap"
                    type="date"
                    value={utolsoMunkanap}
                    onChange={(e) => {
                      setUtolsoMunkanap(e.target.value)
                      if (!kilepesDatuma) setKilepesDatuma(e.target.value)
                    }}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="kilepesDatuma" className="text-xs font-medium">Jogviszony vége napja</Label>
                  <Input
                    id="kilepesDatuma"
                    type="date"
                    value={kilepesDatuma}
                    onChange={(e) => setKilepesDatuma(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Indoklás / Megjegyzés */}
              <div className="grid gap-1.5">
                <Label htmlFor="indoklas" className="text-xs font-medium">Indoklás / Megjegyzés (opcionális)</Label>
                <Textarea
                  id="indoklas"
                  rows={2}
                  value={indoklas}
                  onChange={(e) => setIndoklas(e.target.value)}
                  placeholder="Rövid háttér-információ a felmondás vagy kilépés kapcsán..."
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading} className="text-xs">
                Mégse
              </Button>
              <Button type="submit" disabled={isLoading || (!preselectedEmployeeId && !selectedId)} className="text-xs font-medium">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kiléptetés Indítása
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
