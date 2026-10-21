"use client"

import * as React from "react"
import { useState, useMemo, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Plus, 
  Loader2, 
  User, 
  Calendar, 
  Target, 
  Scale, 
  Search, 
  X, 
  Check, 
  ChevronDown 
} from "lucide-react"
import { toast } from "sonner"
import { addKpi } from "@/app/hr/performance/actions"
import { cn } from "@/lib/utils"
import { type PerformanceKpi, type PerformanceCycle } from "@/types/hr"

export interface AddKpiEmployeeItem {
  id: string
  felhasznalo_profil?: any
  hr_jogviszony?: any
  nev?: string
  [key: string]: any
}

interface EmployeeDisplayInfo {
  id: string
  nev: string
  avatarUrl: string
  initials: string
  munkakor: string
  activeKpiCount: number
}

export function AddKpiDialog({ 
  employees, 
  cycles, 
  allKpis = [],
  defaultDolgozoId
}: { 
  employees: AddKpiEmployeeItem[]
  cycles?: PerformanceCycle[]
  allKpis?: PerformanceKpi[]
  defaultDolgozoId?: string
  catalogue?: any[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dolgozoId, setDolgozoId] = useState<string>(defaultDolgozoId || "")
  const [ciklusId, setCiklusId] = useState<string>("")
  const [celMegnevezes, setCelMegnevezes] = useState<string>("")
  const [sulyozas, setSulyozas] = useState<string>("1.0")

  // Dolgozó választó popover állapotok
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined)

  // Find default open cycle if any
  const defaultCycle = cycles?.find(c => c.statusz === "nyitott" || c.statusz === "aktiv")?.id || cycles?.[0]?.id || ""

  // Feldolgozott dolgozói lista avatarral, beosztással és KPI terheltséggel
  const employeeDisplayList: EmployeeDisplayInfo[] = useMemo(() => {
    return employees.map((emp) => {
      const profil = Array.isArray(emp.felhasznalo_profil) ? emp.felhasznalo_profil[0] : emp.felhasznalo_profil
      const nev = profil?.nev || emp.nev || "Ismeretlen dolgozó"
      const avatarUrl = profil?.avatar_url || ""
      const initials = nev.substring(0, 2).toUpperCase()

      const activeJogviszony = Array.isArray(emp.hr_jogviszony) ? emp.hr_jogviszony[0] : emp.hr_jogviszony
      const allBeosztas = activeJogviszony?.hr_beosztas
      const activeBeosztas = Array.isArray(allBeosztas)
        ? allBeosztas.find((b: any) => b.ervenyes_ig === null) || allBeosztas[0]
        : allBeosztas
      const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs beosztás"

      // Aktív (nem lezárt) KPI-ok száma a terheltséghez
      const activeKpis = allKpis.filter(
        k => k.dolgozo_id === emp.id && k.workflow_fazis !== "lezart" && !k.ertekeles_lezarva_datum
      )

      return {
        id: emp.id,
        nev,
        avatarUrl,
        initials,
        munkakor,
        activeKpiCount: activeKpis.length
      }
    })
  }, [employees, allKpis])

  // Keresett dolgozók
  const filteredEmployees = useMemo(() => {
    const q = employeeSearchQuery.trim().toLowerCase()
    if (!q) return employeeDisplayList
    return employeeDisplayList.filter(
      emp => emp.nev.toLowerCase().includes(q) || emp.munkakor.toLowerCase().includes(q)
    )
  }, [employeeDisplayList, employeeSearchQuery])

  // Kiválasztott dolgozó adatai
  const selectedEmployee = useMemo(() => {
    return employeeDisplayList.find(e => e.id === dolgozoId) || null
  }, [employeeDisplayList, dolgozoId])

  // Trigger szélességének követése
  useEffect(() => {
    if (employeePickerOpen && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [employeePickerOpen])

  const onOpenChangeWrapper = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      if (!ciklusId && defaultCycle) setCiklusId(defaultCycle)
      setDolgozoId(defaultDolgozoId || "")
    } else {
      setEmployeePickerOpen(false)
      setEmployeeSearchQuery("")
      setDolgozoId("")
      setCelMegnevezes("")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dolgozoId) {
      toast.error("Kérlek válassz ki egy dolgozót!")
      return
    }
    if (!celMegnevezes.trim()) {
      toast.error("A cél megnevezése kötelező!")
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append("dolgozoId", dolgozoId)
    formData.append("ertekelesSzovege", celMegnevezes.trim())
    formData.append("ciklusId", ciklusId || defaultCycle)
    formData.append("meroszamTipusa", "igen_nem")
    formData.append("celErtek", "1")
    formData.append("aktualisErtek", "0")
    formData.append("sulyozas", sulyozas)

    try {
      const res = await addKpi(formData)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success("Célkitűzés sikeresen rögzítve!")
        setOpen(false)
        setCelMegnevezes("")
      }
    } catch {
      toast.error("Váratlan hiba történt a célkitűzés rögzítésekor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWrapper}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="w-4 h-4" />
        Új KPI Hozzáadása
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-primary" />
            Új Célkitűzés (KPI) Rögzítése
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          
          {/* Profi Dolgozó Választó (Avatar, Munkakör, KPI terheltség) */}
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Érintett Dolgozó
              </span>
              {selectedEmployee ? (
                <span className="text-[11px] text-muted-foreground font-normal normal-case">
                  Aktuális terheltség: <strong className="text-foreground">{selectedEmployee.activeKpiCount} db</strong> aktív cél
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground font-normal normal-case italic">
                  Válassz ki egy munkatársat
                </span>
              )}
            </Label>

            <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
              <PopoverTrigger
                ref={triggerRef}
                type="button"
                className={cn(
                  "w-full h-auto min-h-[54px] p-2.5 rounded-lg border bg-background hover:bg-muted/20 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors flex items-center justify-between gap-3 text-left shadow-xs cursor-pointer",
                  !selectedEmployee ? "border-dashed border-border/80" : "border-input"
                )}
              >
                {selectedEmployee ? (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-9 w-9 shrink-0 border border-border">
                      <AvatarImage src={selectedEmployee.avatarUrl} alt={selectedEmployee.nev} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {selectedEmployee.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm leading-tight text-foreground truncate">
                        {selectedEmployee.nev}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {selectedEmployee.munkakor}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {selectedEmployee.activeKpiCount === 0 ? (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal bg-muted/30">
                          0 aktív cél
                        </Badge>
                      ) : selectedEmployee.activeKpiCount <= 2 ? (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-medium">
                          {selectedEmployee.activeKpiCount} aktív cél
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 font-medium">
                          {selectedEmployee.activeKpiCount} aktív cél
                        </Badge>
                      )}
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full px-1">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-muted/60 border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium text-foreground block">
                          Válassz dolgozót a listából...
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Kattints a munkatársak kereséséhez és kiválasztásához
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                )}
              </PopoverTrigger>

              <PopoverContent 
                align="start"
                className="p-2 bg-popover border border-border shadow-xl rounded-xl z-[70]"
                style={{ width: triggerWidth ? `${Math.max(triggerWidth, 340)}px` : "100%" }}
              >
                {/* Keresőmező a dolgozókhoz */}
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    placeholder="Keresés név vagy beosztás alapján..."
                    className="pl-8 pr-7 h-9 text-xs"
                    autoFocus
                  />
                  {employeeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setEmployeeSearchQuery("")}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dolgozói lista */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                  {filteredEmployees.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      Nincs a keresésnek megfelelő dolgozó.
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = emp.id === dolgozoId
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            setDolgozoId(emp.id)
                            setEmployeePickerOpen(false)
                            setEmployeeSearchQuery("")
                          }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-sm",
                            isSelected
                              ? "bg-primary/10 text-foreground font-medium border border-primary/20"
                              : "hover:bg-muted/60 text-foreground border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                            <Avatar className="h-8 w-8 shrink-0 border border-border">
                              <AvatarImage src={emp.avatarUrl} alt={emp.nev} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {emp.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs truncate leading-snug">{emp.nev}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{emp.munkakor}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {emp.activeKpiCount === 0 ? (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal bg-muted/20">
                                0 cél
                              </Badge>
                            ) : emp.activeKpiCount <= 2 ? (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-medium">
                                {emp.activeKpiCount} cél
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 font-medium">
                                {emp.activeKpiCount} cél
                              </Badge>
                            )}
                            {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Cél megnevezése */}
          <div className="space-y-1.5">
            <Label htmlFor="celMegnevezes">Célkitűzés megnevezése</Label>
            <Input
              id="celMegnevezes"
              value={celMegnevezes}
              onChange={(e) => setCelMegnevezes(e.target.value)}
              required
              placeholder="Pl. Fluktuáció 10% alatt tartása vagy Új ügyfelek száma"
              className="font-medium"
            />
          </div>

          {/* Értékelési Ciklus */}
          <div className="space-y-1.5">
            <Label htmlFor="ciklusId" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              Értékelési Ciklus
            </Label>
            <select
              id="ciklusId"
              name="ciklusId"
              value={ciklusId}
              onChange={(e) => setCiklusId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {cycles?.length === 0 ? (
                <option value="">Nincs rögzített ciklus</option>
              ) : (
                cycles?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.megnevezes} {c.statusz === "nyitott" ? "(Aktív, nyitott)" : `(${c.statusz})`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Célkitűzés Súlyozása / Prioritása */}
          <div className="space-y-2">
            <Label htmlFor="sulyozas" className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Scale className="w-3.5 h-3.5 text-primary" />
                Célkitűzés Súlyozása (Prioritás)
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{sulyozas}x szorzó</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "1.0", label: "Normál (1x)", desc: "Alap célkitűzés" },
                { val: "1.5", label: "Kiemelt (1.5x)", desc: "Fontos KPI" },
                { val: "2.0", label: "Stratégiai (2x)", desc: "Kiemelt prioritás" }
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setSulyozas(item.val)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer",
                    sulyozas === item.val
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="text-xs font-medium">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gombok */}
          <div className="pt-4 flex justify-end gap-2 border-t mt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Célkitűzés Mentése
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
