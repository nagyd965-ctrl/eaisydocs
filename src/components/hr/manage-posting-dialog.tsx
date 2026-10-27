"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { generateJobPostingWithAiAction } from "@/app/hr/recruitment/ai-posting-actions"
import { saveJobPostingAction } from "@/app/hr/recruitment/actions"
import {
  WORK_MODE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
} from "@/utils/hr/career-constants"
import { useCompany } from "@/contexts/company-context"

export interface JobOptionItem {
  id: string
  megnevezes: string
  [key: string]: unknown
}

export interface PostingFormData {
  id?: string
  cim?: string
  munkakor_id?: string
  rovid_leiras?: string | null
  reszletes_leiras?: string | null
  is_internal?: boolean
  munkavegzes_modja?: string | null
  helyszin?: string | null
  foglalkoztatas_tipusa?: string | null
  tapasztalati_szint?: string | null
  reszleg_nev?: string | null
  bersav_min?: number | null
  bersav_max?: number | null
  bersav_publikus?: boolean
  jelentkezesi_hatarido?: string | null
  company_id?: string | null
  [key: string]: unknown
}

export function ManagePostingDialog({
  jobs,
  existingData = null,
  onSaved,
  children,
}: {
  jobs: JobOptionItem[]
  existingData?: PostingFormData | null
  onSaved: (data: PostingFormData) => void
  children?: React.ReactNode
}) {
  const { selectedCompany } = useCompany()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [cim, setCim] = useState(existingData?.cim || "")
  const [munkakorId, setMunkakorId] = useState<string>(existingData?.munkakor_id || "")
  const [rovidLeiras, setRovidLeiras] = useState(existingData?.rovid_leiras || "")
  const [reszletesLeiras, setReszletesLeiras] = useState(existingData?.reszletes_leiras || "")
  const [isInternal, setIsInternal] = useState<boolean>(existingData?.is_internal || false)

  // Strukturált ATS metaadatok
  const [munkavegzesModja, setMunkavegzesModja] = useState<string>(
    existingData?.munkavegzes_modja || "hibrid"
  )
  const [helyszin, setHelyszin] = useState<string>(
    existingData?.helyszin || selectedCompany?.address || "Budapest"
  )
  const [foglalkoztatasTipusa, setFoglalkoztatasTipusa] = useState<string>(
    existingData?.foglalkoztatas_tipusa || "teljes_munkaido"
  )
  const [tapasztalatiSzint, setTapasztalatiSzint] = useState<string>(
    existingData?.tapasztalati_szint || "medior"
  )
  const [reszlegNev, setReszlegNev] = useState<string>(existingData?.reszleg_nev || "")
  const [bersavMin, setBersavMin] = useState<string>(
    existingData?.bersav_min ? String(existingData.bersav_min) : ""
  )
  const [bersavMax, setBersavMax] = useState<string>(
    existingData?.bersav_max ? String(existingData.bersav_max) : ""
  )
  const [bersavPublikus, setBersavPublikus] = useState<boolean>(
    existingData?.bersav_publikus ?? false
  )
  const [jelentkezesiHatarido, setJelentkezesiHatarido] = useState<string>(
    existingData?.jelentkezesi_hatarido || ""
  )

  // Külön felugró AI ablak állapota
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiInstructions, setAiInstructions] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)

  const isEditing = !!existingData

  useEffect(() => {
    if (open) {
      setCim(existingData?.cim || "")
      setMunkakorId(existingData?.munkakor_id || "")
      setRovidLeiras(existingData?.rovid_leiras || "")
      setReszletesLeiras(existingData?.reszletes_leiras || "")
      setIsInternal(existingData?.is_internal || false)
      setMunkavegzesModja(existingData?.munkavegzes_modja || "hibrid")
      setHelyszin(existingData?.helyszin || selectedCompany?.address || "Budapest")
      setFoglalkoztatasTipusa(existingData?.foglalkoztatas_tipusa || "teljes_munkaido")
      setTapasztalatiSzint(existingData?.tapasztalati_szint || "medior")
      setReszlegNev(existingData?.reszleg_nev || "")
      setBersavMin(existingData?.bersav_min ? String(existingData.bersav_min) : "")
      setBersavMax(existingData?.bersav_max ? String(existingData.bersav_max) : "")
      setBersavPublikus(existingData?.bersav_publikus ?? false)
      setJelentkezesiHatarido(existingData?.jelentkezesi_hatarido || "")
      setIsAiModalOpen(false)
      setAiInstructions("")
    }
  }, [open, existingData, selectedCompany?.address])

  function handleOpenAiModal() {
    if (!cim.trim()) {
      toast.error("Kérlek, először add meg a hirdetés nyilvános címét a felső mezőben!")
      return
    }
    setAiInstructions("")
    setIsAiModalOpen(true)
  }

  async function handleGenerateWithAi() {
    if (!cim.trim()) {
      toast.error("Kérlek, add meg a hirdetés nyilvános címét!")
      return
    }

    setAiGenerating(true)
    try {
      const selectedJobName = jobs.find((j) => j.id === munkakorId)?.megnevezes
      const result = await generateJobPostingWithAiAction({
        cim: cim.trim(),
        munkakorNev: selectedJobName,
        instructions: aiInstructions.trim(),
        cegNev: selectedCompany?.name || undefined,
        cegCim: helyszin.trim() || selectedCompany?.address || undefined,
      })

      if (!result.success) {
        toast.error(result.error || "Hiba történt a generálás során.")
        return
      }

      if (result.reszletes_leiras) {
        setReszletesLeiras(result.reszletes_leiras)
      }
      if (result.rovid_leiras && !rovidLeiras.trim()) {
        setRovidLeiras(result.rovid_leiras)
      }

      toast.success("Álláshirdetés sikeresen legenerálva és beillesztve!")
      setIsAiModalOpen(false)
    } catch (err: unknown) {
      console.error(err)
      toast.error("Váratlan hiba történt az AI generáláskor.")
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!cim.trim() || !munkakorId) {
      toast.error("Cím és Belső Munkakör megadása kötelező!")
      return
    }

    setLoading(true)
    try {
      const res = await saveJobPostingAction({
        id: existingData?.id,
        cim: cim.trim(),
        munkakor_id: munkakorId,
        rovid_leiras: rovidLeiras.trim(),
        reszletes_leiras: reszletesLeiras.trim(),
        is_internal: isInternal,
        munkavegzes_modja: munkavegzesModja,
        helyszin: helyszin.trim() || null,
        foglalkoztatas_tipusa: foglalkoztatasTipusa,
        tapasztalati_szint: tapasztalatiSzint,
        reszleg_nev: reszlegNev.trim() || null,
        bersav_min: bersavMin ? Number(bersavMin) : null,
        bersav_max: bersavMax ? Number(bersavMax) : null,
        bersav_publikus: bersavPublikus,
        jelentkezesi_hatarido: jelentkezesiHatarido || null,
        company_id: selectedCompany?.id || null,
      })

      if (res.error) {
        toast.error(res.error)
      } else if (res.data) {
        toast.success(isEditing ? "Álláshirdetés módosítva" : "Új álláshirdetés létrehozva")
        onSaved(res.data as PostingFormData)
        setOpen(false)
      }
    } catch (error: unknown) {
      toast.error("Hiba történt a mentés során")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            children ? (
              (children as React.ReactElement)
            ) : (
              <Button>Új hirdetés feladása</Button>
            )
          }
        />
        <DialogContent className="sm:max-w-[740px] max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <DialogTitle className="text-lg font-semibold">
                {isEditing ? "Álláshirdetés módosítása" : "Új álláshirdetés feladása"}
              </DialogTitle>
              {selectedCompany?.name && (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-primary/30 bg-primary/5 text-primary text-xs font-medium"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Hirdető cég: {selectedCompany.name}</span>
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs">
              Állítsd be a pozíció strukturált paramétereit, bérsávját és részletes leírását a publikus karrieroldalhoz.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-3">
            {/* 1. Szekció: Pozíció és Munkakör */}
            <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                1. Pozíció megnevezése és szervezeti besorolás
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cim" className="text-xs font-medium">
                    Hirdetés nyilvános címe <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cim"
                    name="cim"
                    required
                    value={cim}
                    onChange={(e) => setCim(e.target.value)}
                    placeholder="pl. Senior Full-Stack Fejlesztő"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="munkakor_id" className="text-xs font-medium">
                    Belső munkakör <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    name="munkakor_id"
                    value={munkakorId}
                    onValueChange={(val) => val && setMunkakorId(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Válassz munkakört...">
                        {jobs.find((j) => j.id === munkakorId)?.megnevezes}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id} label={job.megnevezes}>
                          {job.megnevezes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reszleg_nev" className="text-xs font-medium">
                    Részleg / Csapat megnevezése (Karrieroldali szűrőhöz)
                  </Label>
                  <Input
                    id="reszleg_nev"
                    value={reszlegNev}
                    onChange={(e) => setReszlegNev(e.target.value)}
                    placeholder="Üresen hagyva a munkakör részlegét veszi át (pl. IT, HR, FCM)"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="jelentkezesi_hatarido" className="text-xs font-medium">
                    Jelentkezési határidő (opcionális)
                  </Label>
                  <Input
                    id="jelentkezesi_hatarido"
                    type="date"
                    value={jelentkezesiHatarido}
                    onChange={(e) => setJelentkezesiHatarido(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 2. Szekció: Munkavégzés paraméterei */}
            <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Munkavégzés módja, szint és helyszín
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Munkavégzés módja</Label>
                  <Select
                    value={munkavegzesModja}
                    onValueChange={(val) => val && setMunkavegzesModja(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{WORK_MODE_LABELS[munkavegzesModja]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hibrid">{WORK_MODE_LABELS.hibrid}</SelectItem>
                      <SelectItem value="remote">{WORK_MODE_LABELS.remote}</SelectItem>
                      <SelectItem value="irodai">{WORK_MODE_LABELS.irodai}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Foglalkoztatás jellege</Label>
                  <Select
                    value={foglalkoztatasTipusa}
                    onValueChange={(val) => val && setFoglalkoztatasTipusa(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {EMPLOYMENT_TYPE_LABELS[foglalkoztatasTipusa]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teljes_munkaido">
                        {EMPLOYMENT_TYPE_LABELS.teljes_munkaido}
                      </SelectItem>
                      <SelectItem value="reszmunkaido">
                        {EMPLOYMENT_TYPE_LABELS.reszmunkaido}
                      </SelectItem>
                      <SelectItem value="vallalkozoi">
                        {EMPLOYMENT_TYPE_LABELS.vallalkozoi}
                      </SelectItem>
                      <SelectItem value="gyakornok">
                        {EMPLOYMENT_TYPE_LABELS.gyakornok}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tapasztalati szint (Seniority)</Label>
                  <Select
                    value={tapasztalatiSzint}
                    onValueChange={(val) => val && setTapasztalatiSzint(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{SENIORITY_LABELS[tapasztalatiSzint]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">{SENIORITY_LABELS.junior}</SelectItem>
                      <SelectItem value="medior">{SENIORITY_LABELS.medior}</SelectItem>
                      <SelectItem value="senior">{SENIORITY_LABELS.senior}</SelectItem>
                      <SelectItem value="lead">{SENIORITY_LABELS.lead}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="helyszin" className="text-xs font-medium">
                  Munkavégzés helyszíne (Város / Iroda címe)
                </Label>
                <Input
                  id="helyszin"
                  value={helyszin}
                  onChange={(e) => setHelyszin(e.target.value)}
                  placeholder="pl. 1054 Budapest, Szabadság tér 7."
                />
              </div>
            </div>

            {/* 3. Szekció: EU Bértranszparencia (Publikus bérsáv) */}
            <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    3. Bértranszparencia és Juttatási Sáv (EU 2023/970 irányelv)
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Ha bekapcsolod a publikus megjelenítést, a jelöltek a karrieroldalon is látják a bruttó havi bérsávot.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor="bersav_publikus" className="text-xs font-medium cursor-pointer">
                    Publikus a karrieroldalon
                  </Label>
                  <Switch
                    id="bersav_publikus"
                    checked={bersavPublikus}
                    onCheckedChange={setBersavPublikus}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bersav_min" className="text-xs font-medium">
                    Minimum bruttó alapbér (Ft / hó)
                  </Label>
                  <Input
                    id="bersav_min"
                    type="number"
                    min={0}
                    step={10000}
                    value={bersavMin}
                    onChange={(e) => setBersavMin(e.target.value)}
                    placeholder="pl. 850000"
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bersav_max" className="text-xs font-medium">
                    Maximum bruttó alapbér (Ft / hó)
                  </Label>
                  <Input
                    id="bersav_max"
                    type="number"
                    min={0}
                    step={10000}
                    value={bersavMax}
                    onChange={(e) => setBersavMax(e.target.value)}
                    placeholder="pl. 1250000"
                    className="tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* 4. Szekció: Szöveges leírás és AI Generátor */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rovid_leiras" className="text-xs font-medium">
                  Rövid összefoglaló (Pitch a pozíciókártyán)
                </Label>
                <Textarea
                  id="rovid_leiras"
                  name="rovid_leiras"
                  value={rovidLeiras}
                  onChange={(e) => setRovidLeiras(e.target.value)}
                  placeholder="1-2 mondatos lényegretörő összefoglaló a pozícióról..."
                  maxLength={240}
                  className="min-h-[68px] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reszletes_leiras" className="text-xs font-medium">
                    Részletes pozícióleírás (HTML vagy Markdown)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAiModal}
                    className="h-7 text-xs font-medium text-primary hover:text-primary gap-1.5 px-2.5 border-primary/30 hover:bg-primary/5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Generálás AI-val</span>
                  </Button>
                </div>

                <Textarea
                  id="reszletes_leiras"
                  name="reszletes_leiras"
                  value={reszletesLeiras}
                  onChange={(e) => setReszletesLeiras(e.target.value)}
                  className="min-h-[160px] font-mono text-xs leading-relaxed"
                  placeholder="Rólunk, Főbb feladatok, Elvárások, Amit kínálunk..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-colors hover:border-border">
              <div className="space-y-0.5 pr-4 text-left">
                <Label
                  htmlFor="is_internal"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Csak Belső Hirdetés (Internal Mobility)
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ha be van kapcsolva, a hirdetés kizárólag a belső munkatársak számára látható, a nyilvános karrieroldalon nem jelenik meg.
                </p>
              </div>
              <Switch
                id="is_internal"
                checked={isInternal}
                onCheckedChange={setIsInternal}
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                onClick={() => setOpen(false)}
              >
                Mégsem
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Mentés..."
                  : isEditing
                  ? "Módosítások mentése"
                  : "Álláshirdetés létrehozása"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Külön felugró kis AI Hirdetésíró ablak */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="w-4 h-4 text-primary" />
              Álláshirdetés Generálása AI-val
            </DialogTitle>
            <DialogDescription>
              A pozíció címe, a hirdető vállalat és a megadott szempontok alapján a Google Gemini összeállítja a strukturált hirdetést.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Kontextus kártya */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pozíció megnevezése:</span>
                <span className="font-semibold text-foreground text-right">
                  {cim || "–"}
                </span>
              </div>
              {munkakorId && (
                <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                  <span className="text-muted-foreground">Belső munkakör:</span>
                  <span className="font-medium text-foreground text-right">
                    {jobs.find((j) => j.id === munkakorId)?.megnevezes}
                  </span>
                </div>
              )}
              {selectedCompany?.name && (
                <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                  <span className="text-muted-foreground">Hirdető szervezet:</span>
                  <span
                    className="font-medium text-foreground text-right truncate max-w-[260px]"
                    title={selectedCompany.name}
                  >
                    {selectedCompany.name}
                  </span>
                </div>
              )}
            </div>

            {/* Egyedi szempontok */}
            <div className="space-y-2">
              <Label
                htmlFor="ai_instructions"
                className="text-xs font-medium text-foreground"
              >
                Egyedi szempontok vagy elvárások (opcionális):
              </Label>
              <Textarea
                id="ai_instructions"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="pl. 4 év tapasztalat, React + Node.js, heti 2 nap home office, cafeteria, összetartó csapat..."
                className="min-h-[90px] text-xs leading-relaxed"
                disabled={aiGenerating}
              />
              <p className="text-[11px] text-muted-foreground">
                Ha üresen hagyod, az AI automatikusan az iparági standardnak megfelelő leírást állítja össze.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAiModalOpen(false)}
              disabled={aiGenerating}
            >
              Mégsem
            </Button>
            <Button
              type="button"
              onClick={handleGenerateWithAi}
              disabled={aiGenerating}
              className="gap-1.5 bg-primary text-primary-foreground font-medium"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI fogalmazza a hirdetést...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Hirdetés elkészítése</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
