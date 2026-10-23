"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Briefcase,
  ClipboardList,
  GraduationCap,
  HardHat,
  Stethoscope,
  Plus,
  Trash2,
  X,
  Edit,
  Building2,
} from "lucide-react"
import { updateMunkakor } from "@/app/hr/settings/actions"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface JobEditData {
  id: string
  megnevezes: string
  feor_kod?: string | null
  besorolasi_szint?: string | null
  szervezeti_egyseg_id?: string | null
  kockazat_tipusa?: string | null
  vedoeszkoz_igeny?: string | null
  feladatok_es_hataskorok?: string[] | string | null
  elvart_kompetenciak?: string[] | string | null
  orvosi_vizsgalat_tipus?: string | null
  orvosi_vizsgalat_gyakorisag_ho?: number | null
}

export interface OrgUnitOption {
  id: string
  nev: string
}

interface JobEditDialogProps {
  job: JobEditData
  orgUnits?: OrgUnitOption[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  initialTab?: "general" | "tasks" | "safety"
}

export function JobEditDialog({
  job,
  orgUnits = [],
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  initialTab = "general",
}: JobEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }

  // Parse initial arrays safely
  const parseInitialArray = (val?: string[] | string | null): string[] => {
    if (!val) return []
    if (Array.isArray(val)) return [...val]
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // not json, split by newline
    }
    return val.split("\n").map((s) => s.trim()).filter(Boolean)
  }

  const [megnevezes, setMegnevezes] = useState(job.megnevezes || "")
  const [feorKod, setFeorKod] = useState(job.feor_kod || "")
  const [besorolas, setBesorolas] = useState(job.besorolasi_szint || "none")
  const [selectedOrgUnit, setSelectedOrgUnit] = useState(job.szervezeti_egyseg_id || "none")
  
  // Dynamic list builders
  const [feladatok, setFeladatok] = useState<string[]>(() => parseInitialArray(job.feladatok_es_hataskorok))
  const [newTaskInput, setNewTaskInput] = useState("")

  const [kompetenciak, setKompetenciak] = useState<string[]>(() => parseInitialArray(job.elvart_kompetenciak))
  const [newCompetencyInput, setNewCompetencyInput] = useState("")

  // Safety & Medical
  const [kockazatTipusa, setKockazatTipusa] = useState(job.kockazat_tipusa || "")
  const [vedoeszkozIgeny, setVedoeszkozIgeny] = useState(job.vedoeszkoz_igeny || "")
  const [orvosiTipus, setOrvosiTipus] = useState(job.orvosi_vizsgalat_tipus || "")
  const [orvosiGyakorisagHo, setOrvosiGyakorisagHo] = useState<string>(
    job.orvosi_vizsgalat_gyakorisag_ho ? String(job.orvosi_vizsgalat_gyakorisag_ho) : ""
  )

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"general" | "tasks" | "safety">(initialTab)

  // Reset state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setMegnevezes(job.megnevezes || "")
      setFeorKod(job.feor_kod || "")
      setBesorolas(job.besorolasi_szint || "none")
      setSelectedOrgUnit(job.szervezeti_egyseg_id || "none")
      setFeladatok(parseInitialArray(job.feladatok_es_hataskorok))
      setKompetenciak(parseInitialArray(job.elvart_kompetenciak))
      setKockazatTipusa(job.kockazat_tipusa || "")
      setVedoeszkozIgeny(job.vedoeszkoz_igeny || "")
      setOrvosiTipus(job.orvosi_vizsgalat_tipus || "")
      setOrvosiGyakorisagHo(job.orvosi_vizsgalat_gyakorisag_ho ? String(job.orvosi_vizsgalat_gyakorisag_ho) : "")
      setNewTaskInput("")
      setNewCompetencyInput("")
      setActiveTab(initialTab)
    }
    setOpen(isOpen)
  }

  // Task operations
  const handleAddTask = () => {
    const trimmed = newTaskInput.trim()
    if (!trimmed) return

    // If multi-line pasted text
    if (trimmed.includes("\n")) {
      const items = trimmed
        .split("\n")
        .map((s) => s.replace(/^[-*•0-9.)\s]+/, "").trim())
        .filter(Boolean)
      setFeladatok((prev) => [...prev, ...items])
    } else {
      setFeladatok((prev) => [...prev, trimmed])
    }
    setNewTaskInput("")
  }

  const handleRemoveTask = (index: number) => {
    setFeladatok((prev) => prev.filter((_, i) => i !== index))
  }

  // Competency operations
  const handleAddCompetency = () => {
    const trimmed = newCompetencyInput.trim()
    if (!trimmed) return

    if (trimmed.includes(",") || trimmed.includes("\n")) {
      const items = trimmed
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => Boolean(s) && !kompetenciak.includes(s))
      setKompetenciak((prev) => [...prev, ...items])
    } else if (!kompetenciak.includes(trimmed)) {
      setKompetenciak((prev) => [...prev, trimmed])
    }
    setNewCompetencyInput("")
  }

  const handleRemoveCompetency = (index: number) => {
    setKompetenciak((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!megnevezes.trim()) {
      toast.error("A munkakör megnevezése kötelező!")
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.set("megnevezes", megnevezes.trim())
    formData.set("feor_kod", feorKod.trim())
    formData.set("besorolasi_szint", besorolas === "none" ? "" : besorolas)
    formData.set("szervezeti_egyseg_id", selectedOrgUnit === "none" ? "" : selectedOrgUnit)
    formData.set("kockazat_tipusa", kockazatTipusa.trim())
    formData.set("vedoeszkoz_igeny", vedoeszkozIgeny.trim())
    formData.set("feladatok_es_hataskorok", JSON.stringify(feladatok))
    formData.set("elvart_kompetenciak", JSON.stringify(kompetenciak))
    formData.set("orvosi_vizsgalat_tipus", orvosiTipus.trim())
    formData.set("orvosi_vizsgalat_gyakorisag_ho", orvosiGyakorisagHo.trim())

    const result = await updateMunkakor(job.id, formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Munkakör adatai sikeresen frissítve!")
      setOpen(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <div onClick={() => handleOpenChange(true)} className="w-full h-full cursor-pointer">
          {trigger}
        </div>
      ) : null}

      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Munkakör szerkesztése
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Alapadatok, feladatköri specifikáció, kompetenciák és munkavédelmi előírások karbantartása.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 pt-2 border-b bg-muted/20">
              <TabsList className="bg-transparent h-10 p-0 space-x-6 border-b-0">
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 pb-2 pt-1 font-medium text-xs flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Alapadatok & Besorolás
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 pb-2 pt-1 font-medium text-xs flex items-center gap-1.5"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Feladatok & Kompetenciák
                  {(feladatok.length > 0 || kompetenciak.length > 0) && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                      {feladatok.length + kompetenciak.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="safety"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 pb-2 pt-1 font-medium text-xs flex items-center gap-1.5"
                >
                  <HardHat className="w-3.5 h-3.5" />
                  Munkavédelem & Orvosi
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: ALAPADATOK */}
              <TabsContent value="general" className="m-0 space-y-4 outline-none">
                <div className="space-y-2">
                  <Label htmlFor="edit-megnevezes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Munkakör Megnevezése <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-megnevezes"
                    value={megnevezes}
                    onChange={(e) => setMegnevezes(e.target.value)}
                    placeholder="pl. Vezető Rendszergazda, Értékesítési Menedzser"
                    required
                    className="font-medium text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-feor" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      FEOR-08 Kód
                    </Label>
                    <Input
                      id="edit-feor"
                      value={feorKod}
                      onChange={(e) => setFeorKod(e.target.value)}
                      placeholder="pl. 2142, 3161"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Központi Statisztikai Hivatal (KSH) 4 jegyű foglalkozási kódja.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-besorolas" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Besorolási Szint
                    </Label>
                    <Select value={besorolas} onValueChange={(val) => setBesorolas(val ?? "none")}>
                      <SelectTrigger id="edit-besorolas">
                        <SelectValue placeholder="Válassz szintet..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nincs megadva —</SelectItem>
                        <SelectItem value="Gyakornok">Gyakornok (Intern)</SelectItem>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Medior">Medior</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Vezető">Vezető (Manager)</SelectItem>
                        <SelectItem value="Igazgató">Igazgató (Director)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="edit-org-unit" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Hozzárendelt Szervezeti Egység
                  </Label>
                  <Select value={selectedOrgUnit} onValueChange={(val) => setSelectedOrgUnit(val ?? "none")}>
                    <SelectTrigger id="edit-org-unit">
                      <SelectValue placeholder="Válassz szervezeti egységet..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nincs egységhez rendelve (Központi) —</SelectItem>
                      {orgUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nev}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    A munkakör alapértelmezett szervezeti egysége az állományban és az ábrában.
                  </p>
                </div>
              </TabsContent>

              {/* TAB 2: FELADATOK & KOMPETENCIÁK */}
              <TabsContent value="tasks" className="m-0 space-y-6 outline-none">
                {/* Feladatok és Hatáskörök Dinamikus Lista */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-primary" />
                      Feladatok és Hatáskörök ({feladatok.length})
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Enter gombbal vagy több sor beillesztésével gyorsan rögzíthető
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddTask()
                        }
                      }}
                      placeholder="Új feladat vagy felelősségi kör rögzítése..."
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTask}
                      disabled={!newTaskInput.trim()}
                      className="gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Hozzáadás
                    </Button>
                  </div>

                  {feladatok.length > 0 ? (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {feladatok.map((task, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 p-2.5 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors text-sm group"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="font-semibold text-primary text-xs mt-0.5 tabular-nums shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="text-foreground leading-snug break-words">
                              {task}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTask(idx)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-80 group-hover:opacity-100 shrink-0"
                            title="Törlés"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground">
                      Még nincs feladat rögzítve ehhez a munkakörhöz.
                    </div>
                  )}
                </div>

                {/* Elvárt Kompetenciák & Végzettség */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      Elvárt Kompetenciák és Végzettség ({kompetenciak.length})
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Vesszővel vagy Enterrel elválasztva több is beírható
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newCompetencyInput}
                      onChange={(e) => setNewCompetencyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddCompetency()
                        }
                      }}
                      placeholder="pl. Felsőfokú IT végzettség, Angol C1, B kategóriás jogosítvány..."
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCompetency}
                      disabled={!newCompetencyInput.trim()}
                      className="gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Hozzáadás
                    </Button>
                  </div>

                  {kompetenciak.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                      {kompetenciak.map((comp, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="pl-2.5 pr-1.5 py-1 text-xs font-normal flex items-center gap-1.5 bg-muted hover:bg-muted/80"
                        >
                          <span>{comp}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCompetency(idx)}
                            className="rounded-full hover:bg-foreground/10 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground">
                      Nincs elvárt kompetencia vagy végzettség rögzítve.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 3: MUNKAVÉDELEM & ORVOSI */}
              <TabsContent value="safety" className="m-0 space-y-6 outline-none">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-warning" />
                    <h4 className="text-sm font-semibold">Munkavédelem & Egyéni Védőeszközök (EVE)</h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-kockazat" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Bejelentett Kockázat Típusa
                      </Label>
                      <Input
                        id="edit-kockazat"
                        value={kockazatTipusa}
                        onChange={(e) => setKockazatTipusa(e.target.value)}
                        placeholder="pl. Képernyős munkavégzés, Ergonómiai kockázat, Fizikai megterhelés"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        A kockázatértékelési jegyzőkönyv szerinti munkavédelmi besorolás.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-vedoeszkoz" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Kötelező Védőeszköz Igény
                      </Label>
                      <Input
                        id="edit-vedoeszkoz"
                        value={vedoeszkozIgeny}
                        onChange={(e) => setVedoeszkozIgeny(e.target.value)}
                        placeholder="pl. Munkavédelmi acélbetétes bakancs, Hallásvédő füldugó, Kék köpeny"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        A munkakör betöltéséhez a munkáltató által kötelezően biztosítandó felszerelések.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold">Foglalkozás-egészségügyi Orvosi Vizsgálat</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-orvosi-tipus" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Kötelező Vizsgálat Típusa
                      </Label>
                      <Input
                        id="edit-orvosi-tipus"
                        value={orvosiTipus}
                        onChange={(e) => setOrvosiTipus(e.target.value)}
                        placeholder="pl. Időszakos foglalkozás-egészségügyi alkalmassági"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-orvosi-ho" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Vizsgálat Gyakorisága (hónapban)
                      </Label>
                      <Input
                        id="edit-orvosi-ho"
                        type="number"
                        min="1"
                        max="60"
                        value={orvosiGyakorisagHo}
                        onChange={(e) => setOrvosiGyakorisagHo(e.target.value)}
                        placeholder="pl. 12 (évente) vagy 24 (kétévente)"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        A rendszer ebből automatikusan számolja az esedékességet a dolgozóknál.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? "Mentés..." : "Munkakör mentése"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
