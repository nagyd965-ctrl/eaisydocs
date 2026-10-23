"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, User, Calendar, BookOpen, GraduationCap, Award, Briefcase } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  createDevelopmentGoal,
  updateDevelopmentGoal,
  getCompanyMentorsAction,
  getEmployeeStudyContractsAction,
  IDPGoalType,
  IDPPriority,
  FejlesztesiCel
} from "@/app/hr/actions/idp-actions"
import { toast } from "sonner"

interface IdpDialogProps {
  tervId: string
  dolgozoId: string
  buttonVariant?: "default" | "outline" | "ghost"
  buttonText?: string
  /** Ha meg van adva, szerkesztés módban nyílik meg */
  existingGoal?: FejlesztesiCel
  /** Ha meg van adva, ez jelenik meg a trigger helyett */
  customTrigger?: React.ReactNode
}

const TIPUS_LABELS: Record<string, { label: string; desc: string }> = {
  kompetencia: { label: "Kompetencia / Készség", desc: "Munkaköri készségek, soft skillek, vezetői készségek" },
  kepzes:      { label: "Képzés / Tanfolyam",   desc: "Szakmai továbbképzés, tréning, kurzus" },
  nyelv:       { label: "Nyelvvizsga / Nyelv",  desc: "Nyelvi szint elérése, üzleti nyelvhasználat" },
  egyeb:       { label: "Belső projekt / Egyéb", desc: "Rotáció, belső projektfeladat, mentorálás" },
}


const FINANSZIROZAS_LABELS: Record<string, string> = {
  ceg:      "Cég által finanszírozott",
  dolgozo:  "Munkavállalói önköltség",
  ingyenes: "Belső / Ingyenes képzés",
  vegyes:   "Vegyes finanszírozás",
}

export function IdpDialog({
  tervId,
  dolgozoId,
  buttonVariant = "outline",
  buttonText,
  existingGoal,
  customTrigger
}: IdpDialogProps) {
  const isEdit = !!existingGoal
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form állapotok
  const [tipus, setTipus] = useState<string>(existingGoal?.tipus ?? "kepzes")
  const [megnevezes, setMegnevezes] = useState(existingGoal?.megnevezes ?? "")
  const [leiras, setLeiras] = useState(existingGoal?.leiras ?? "")
  const [hatarido, setHatarido] = useState(existingGoal?.hatarido ?? "")
  const [mentorId, setMentorId] = useState<string>(existingGoal?.mentor_id ?? "")
  const [intezmeny, setIntezmeny] = useState(existingGoal?.intezmeny ?? "")
  const [koltseg, setKoltseg] = useState<string>(existingGoal?.koltseg ? String(existingGoal.koltseg) : "")
  const [finanszirozas, setFinanszirozas] = useState<string>(existingGoal?.finanszirozas ?? "ceg")
  const [tanulmanyiSzerzodesId, setTanulmanyiSzerzodesId] = useState<string>(existingGoal?.tanulmanyi_szerzodes_id ?? "")

  // Mentorok és tanulmányi szerződések listája
  const [mentors, setMentors] = useState<{ id: string; nev: string; munkakor?: string }[]>([])
  const [studyContracts, setStudyContracts] = useState<any[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const router = useRouter()

  useEffect(() => {
    if (open) {
      setLoadingOptions(true)
      Promise.all([
        getCompanyMentorsAction(),
        getEmployeeStudyContractsAction(dolgozoId),
      ]).then(([mentorList, contractList]) => {
        setMentors(mentorList)
        setStudyContracts(contractList)
        setLoadingOptions(false)
      }).catch((err) => {
        console.error("Hiba a mentori opciók betöltésekor:", err)
        setLoadingOptions(false)
      })
    }
  }, [open, dolgozoId])

  function resetForm() {
    if (!isEdit) {
      setTipus("kepzes")
      setMegnevezes("")
      setLeiras("")
      setHatarido("")
      setMentorId("")
      setIntezmeny("")
      setKoltseg("")
      setFinanszirozas("ceg")
      setTanulmanyiSzerzodesId("")
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!megnevezes.trim()) {
      toast.error("Kérjük, adja meg a célkitűzés megnevezését!")
      return
    }

    setIsSubmitting(true)

    // Kiválasztott mentor neve mentése szöveges fallbackként is
    const selectedMentor = mentors.find(m => m.id === mentorId)
    const mentorName = selectedMentor ? selectedMentor.nev : (existingGoal?.mentor || "")

    let result
    if (isEdit && existingGoal) {
      result = await updateDevelopmentGoal(existingGoal.id, {
        megnevezes: megnevezes.trim(),
        tipus: tipus as IDPGoalType,
        prioritas: (existingGoal?.prioritas || "kozepes") as IDPPriority,
        leiras: leiras.trim() || undefined,
        hatarido: hatarido || undefined,
        mentor_id: mentorId || null,
        mentor: mentorName || undefined,
        intezmeny: intezmeny.trim() || undefined,
        koltseg: koltseg ? Number(koltseg) : undefined,
        finanszirozas: finanszirozas || undefined,
        tanulmanyi_szerzodes_id: tanulmanyiSzerzodesId || null,
      })
    } else {
      result = await createDevelopmentGoal({
        terv_id: tervId,
        dolgozo_id: dolgozoId,
        megnevezes: megnevezes.trim(),
        tipus: tipus as IDPGoalType,
        prioritas: "kozepes" as IDPPriority,
        leiras: leiras.trim() || undefined,
        hatarido: hatarido || undefined,
        mentor_id: mentorId || undefined,
        mentor: mentorName || undefined,
        intezmeny: intezmeny.trim() || undefined,
        koltseg: koltseg ? Number(koltseg) : undefined,
        finanszirozas: finanszirozas || undefined,
        tanulmanyi_szerzodes_id: tanulmanyiSzerzodesId || undefined,
      })
    }

    setIsSubmitting(false)

    if (result.success) {
      toast.success(isEdit ? "Fejlesztési cél sikeresen frissítve" : "Fejlesztési cél sikeresen rögzítve")
      setOpen(false)
      resetForm()
      router.refresh()
    } else {
      toast.error("Hiba történt a mentéskor", { description: result.error })
    }
  }

  const isTrainingOrLanguage = tipus === "kepzes" || tipus === "nyelv"

  return (
    <>
      {customTrigger ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer contents">
          {customTrigger}
        </span>
      ) : (
        <Button variant={buttonVariant as any} size="sm" onClick={() => setOpen(true)}>
          {isEdit ? (
            <>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              {buttonText || "Szerkesztés"}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              {buttonText || "Új Célkitűzés"}
            </>
          )}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {isEdit ? "Fejlesztési Célkitűzés Módosítása" : "Új Fejlesztési Célkitűzés"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isEdit
                ? "Módosítsa a képzési vagy kompetenciafejlesztési cél részleteit."
                : "Rögzítsen egy konkrét szakmai célkitűzést, képzést vagy készségfejlesztést."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            {/* Típus és Megnevezés egy sorban */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="tipus" className="text-xs font-medium">Cél Típusa *</Label>
                <Select value={tipus} onValueChange={(v) => setTipus(v || "kepzes")}>
                  <SelectTrigger id="tipus" className="h-9">
                    <SelectValue placeholder="Válasszon típust..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPUS_LABELS).map(([k, item]) => (
                      <SelectItem key={k} value={k}>
                        <span className="font-medium text-xs">{item.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="megnevezes" className="text-xs font-medium">Megnevezés *</Label>
                <Input
                  id="megnevezes"
                  placeholder={
                    tipus === "nyelv"
                      ? "pl. B2 szakmai angol nyelvvizsga megszerzése"
                      : tipus === "kepzes"
                      ? "pl. Haladó TypeScript és Next.js architektúra képzés"
                      : "pl. Vezetői delegálás és csapatkommunikáció fejlesztése"
                  }
                  value={megnevezes}
                  onChange={(e) => setMegnevezes(e.target.value)}
                  className="h-9"
                  required
                />
              </div>
            </div>

            {/* Határidő és Mentor (Valós munkatárs választó!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="hatarido" className="text-xs font-medium">Tervezett Határidő</Label>
                <Input
                  id="hatarido"
                  type="date"
                  value={hatarido}
                  onChange={(e) => setHatarido(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mentor" className="text-xs font-medium">
                  Kijelölt Mentor / Felelős
                </Label>
                <Select
                  value={mentorId || "none"}
                  onValueChange={(val) => setMentorId(!val || val === "none" ? "" : val)}
                  disabled={loadingOptions}
                >
                  <SelectTrigger id="mentor" className="h-9">
                    <SelectValue placeholder={loadingOptions ? "Betöltés..." : "Válasszon mentort..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="none" className="text-xs text-muted-foreground italic">
                      Nincs kijelölt mentor
                    </SelectItem>
                    {mentors.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.nev}</span>
                          {m.munkakor && (
                            <span className="text-[11px] text-muted-foreground">({m.munkakor})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Képzés és Nyelvvizsga specifikus blokk */}
            {isTrainingOrLanguage && (
              <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Képzési & Finanszírozási Adatok
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="intezmeny" className="text-xs">Képző Intézmény / Szervező</Label>
                    <Input
                      id="intezmeny"
                      placeholder="pl. Codecool, British Council, ELTE..."
                      value={intezmeny}
                      onChange={(e) => setIntezmeny(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="finanszirozas" className="text-xs">Finanszírozás Módja</Label>
                    <Select value={finanszirozas} onValueChange={(v) => setFinanszirozas(v || "ceg")}>
                      <SelectTrigger id="finanszirozas" className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FINANSZIROZAS_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="koltseg" className="text-xs">Becsült Költség (Ft)</Label>
                    <Input
                      id="koltseg"
                      type="number"
                      placeholder="pl. 180000"
                      value={koltseg}
                      onChange={(e) => setKoltseg(e.target.value)}
                      className="h-8 text-xs tabular-nums bg-background"
                    />
                  </div>

                  {studyContracts.length > 0 && (
                    <div className="space-y-1">
                      <Label htmlFor="tanulmanyi_szerzodes" className="text-xs">Kapcsolódó Tanulmányi Szerződés</Label>
                      <Select
                        value={tanulmanyiSzerzodesId || "none"}
                        onValueChange={(val) => setTanulmanyiSzerzodesId(!val || val === "none" ? "" : val)}
                      >
                        <SelectTrigger id="tanulmanyi_szerzodes" className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Válasszon szerződést..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs text-muted-foreground italic">
                            Nincs hozzárendelve
                          </SelectItem>
                          {studyContracts.map((sc) => (
                            <SelectItem key={sc.id} value={sc.id} className="text-xs">
                              {sc.szerzodes_szam ? `${sc.szerzodes_szam} - ` : ""}{sc.kepzes_neve || sc.intezmeny_neve || "Szerződés"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Leírás */}
            <div className="space-y-1.5">
              <Label htmlFor="leiras" className="text-xs font-medium">
                Célkitűzés Részletei és Elvárások (opcionális)
              </Label>
              <Textarea
                id="leiras"
                placeholder="Részletezze a megszerezendő készségeket, vizsgakövetelményeket vagy a gyakorlati projektfeladatokat..."
                className="resize-none text-xs"
                rows={3}
                value={leiras}
                onChange={(e) => setLeiras(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Mégse
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting || !megnevezes.trim()}>
                {isSubmitting ? "Mentés folyamatban..." : isEdit ? "Módosítások Mentése" : "Célkitűzés Rögzítése"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
