"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CompanyCareerPresentation,
  PresentationBriefingInput,
  PresentationVisualThemeId,
  PRESENTATION_VISUAL_THEMES,
  buildDefaultCompanyPresentation,
} from "@/utils/hr/career-presentation-types"
import {
  generateCompanyPresentationWithAiAction,
  saveCompanyPresentationAction,
  deleteCompanyPresentationAction,
  uploadCompanyPresentationImageAction,
} from "@/app/hr/recruitment/company-presentation-actions"
import { CompanyPresentationViewer } from "@/components/hr/company-presentation-viewer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

interface CompanyPresentationEditorProps {
  companyId: string
  companyName: string
  companyAddress?: string | null
  initialPresentation?: CompanyCareerPresentation | null
  isReadOnly?: boolean
}

const WIZARD_STEPS = [
  {
    step: 1,
    code: "01",
    title: "Alapadatok & Küldetés",
    subtitle: "Iparág, létszám, munkarend és vízió",
  },
  {
    step: 2,
    code: "02",
    title: "Kultúra & Juttatások",
    subtitle: "Csapatértékek és juttatási csomag",
  },
  {
    step: 3,
    code: "03",
    title: "Fotóvilág & Saját képek",
    subtitle: "Vizuális téma vagy saját fotók feltöltése",
  },
  {
    step: 4,
    code: "04",
    title: "AI Generálás & Szövegek",
    subtitle: "Az 5 fejezet szövegeinek finomhangolása",
  },
  {
    step: 5,
    code: "05",
    title: "Előnézet & Publikálás",
    subtitle: "Teljes interaktív prezentáció nézet",
  },
]

export function CompanyPresentationEditor({
  companyName,
  companyAddress,
  initialPresentation,
  isReadOnly = false,
}: CompanyPresentationEditorProps) {
  const defaultPres = React.useMemo(
    () =>
      initialPresentation && initialPresentation.heroSlide
        ? initialPresentation
        : buildDefaultCompanyPresentation(companyName, companyAddress, "tech_ai"),
    [initialPresentation, companyName, companyAddress]
  )

  const [presentation, setPresentation] =
    useState<CompanyCareerPresentation>(defaultPres)
  const [briefing, setBriefing] = useState<PresentationBriefingInput>(
    defaultPres.briefing || {
      industry: "Mesterséges intelligencia & Vállalati digitalizáció",
      foundedYear: "2021",
      teamSize: "25–50 fő",
      workModel: "Hibrid (heti 2–3 nap home office)",
      missionInput:
        "Intelligens, papírmentes dokumentumkezelő és HR ökoszisztémát építünk, amely leveszi az adminisztrációs terhet a vállalatok válláról.",
      cultureInput:
        "Lapos hierarchia, önálló döntéshozatal, modern technológiai stack, nyílt szakmai visszajelzések és emberközpontú munkarend.",
      perksInput:
        "Versenyképes alapbér, SZÉP-kártya és cafeteria keret, prémium munkaeszközök, szakmai képzési büdzsé, rugalmas munkaidő.",
      visualTheme: "tech_ai",
    }
  )

  const [hasSavedPresentation, setHasSavedPresentation] = useState<boolean>(
    Boolean(initialPresentation && initialPresentation.heroSlide)
  )
  const [isEditing, setIsEditing] = useState<boolean>(
    !Boolean(initialPresentation && initialPresentation.heroSlide)
  )
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [editSlideTab, setEditSlideTab] = useState<
    "slide1" | "slide2" | "slide3" | "slide4" | "slide5"
  >("slide1")
  const [aiGenerating, setAiGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const locationShort = companyAddress
    ? companyAddress.split(",")[0].trim()
    : "Budapest"

  async function handleDeletePresentation() {
    if (isReadOnly) return
    setDeleting(true)
    try {
      const res = await deleteCompanyPresentationAction()
      if (res.error) {
        toast.error(res.error)
      } else {
        const freshDefault = buildDefaultCompanyPresentation(
          companyName,
          companyAddress,
          "tech_ai"
        )
        setPresentation(freshDefault)
        if (freshDefault.briefing) {
          setBriefing(freshDefault.briefing)
        }
        setHasSavedPresentation(false)
        setIsEditing(true)
        setIsPreviewOpen(false)
        setCurrentStep(1)
        setDeleteDialogOpen(false)
        toast.success(
          "A „Cégünkről” prezentáció törölve és levéve a Karrieroldalról. A varázslóval bármikor létrehozhatod újra."
        )
        router.refresh()
      }
    } catch {
      toast.error("Hiba történt a prezentáció törlésekor.")
    } finally {
      setDeleting(false)
    }
  }

  function handleSelectTheme(themeId: PresentationVisualThemeId) {
    setBriefing((prev) => ({ ...prev, visualTheme: themeId }))
    const preset = PRESENTATION_VISUAL_THEMES[themeId]
    if (preset) {
      setPresentation((prev) => ({
        ...prev,
        briefing: { ...prev.briefing, visualTheme: themeId },
        heroSlide: {
          ...prev.heroSlide,
          coverImageUrl: preset.coverImageUrl,
        },
        cultureSlide: {
          ...prev.cultureSlide,
          featureImageUrl: preset.featureImageUrl,
        },
        environmentSlide: {
          ...prev.environmentSlide,
          gallery: preset.gallery,
        },
      }))
      toast.success(`Fotóvilág kiválasztva: ${preset.label}`)
    }
  }

  async function handleGenerateAi(goToStepAfter?: number) {
    if (isReadOnly) return
    setAiGenerating(true)
    try {
      const res = await generateCompanyPresentationWithAiAction(briefing)
      if (!res.success || !res.presentation) {
        toast.error(res.error || "Nem sikerült legenerálni a prezentációt.")
      } else {
        setPresentation((prev) => ({
          ...res.presentation!,
          heroSlide: {
            ...res.presentation!.heroSlide,
            coverImageUrl:
              prev.heroSlide.coverImageUrl ||
              res.presentation!.heroSlide.coverImageUrl,
          },
          cultureSlide: {
            ...res.presentation!.cultureSlide,
            featureImageUrl:
              prev.cultureSlide.featureImageUrl ||
              res.presentation!.cultureSlide.featureImageUrl,
          },
          environmentSlide: {
            ...res.presentation!.environmentSlide,
            gallery:
              prev.environmentSlide.gallery?.length === 3
                ? prev.environmentSlide.gallery
                : res.presentation!.environmentSlide.gallery,
          },
        }))
        toast.success(
          `A(z) ${companyName} 5 fejezetes vállalati prezentációja elkészült!`
        )
        if (goToStepAfter) {
          setCurrentStep(goToStepAfter)
        }
      }
    } catch {
      toast.error("Váratlan hiba történt az AI generálás során.")
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleSavePresentation() {
    if (isReadOnly) return
    setSaving(true)
    try {
      const payload: CompanyCareerPresentation = {
        ...presentation,
        briefing,
        updatedAt: new Date().toISOString(),
      }
      const res = await saveCompanyPresentationAction(payload)
      if (!res.success) {
        toast.error(res.error || "Hiba történt a prezentáció mentésekor.")
      } else {
        setPresentation(payload)
        setHasSavedPresentation(true)
        setIsEditing(false)
        toast.success(
          `A(z) ${companyName} „Cégünkről” prezentációja sikeresen elmentve és publikálva a Karrieroldalra!`
        )
      }
    } catch {
      toast.error("Hiba történt a mentés során.")
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: "cover" | "culture" | "gallery-0" | "gallery-1" | "gallery-2"
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSlot(target)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await uploadCompanyPresentationImageAction(fd)
      if (!res.success || !res.imageUrl) {
        toast.error(res.error || "Hiba a kép feltöltésekor")
      } else {
        const url = res.imageUrl
        setPresentation((prev) => {
          if (target === "cover") {
            return {
              ...prev,
              heroSlide: { ...prev.heroSlide, coverImageUrl: url },
            }
          }
          if (target === "culture") {
            return {
              ...prev,
              cultureSlide: { ...prev.cultureSlide, featureImageUrl: url },
            }
          }
          const idx = parseInt(target.replace("gallery-", ""), 10)
          const nextGallery = [...(prev.environmentSlide.gallery || [])]
          if (nextGallery[idx]) {
            nextGallery[idx] = { ...nextGallery[idx], imageUrl: url }
          }
          return {
            ...prev,
            environmentSlide: {
              ...prev.environmentSlide,
              gallery: nextGallery,
            },
          }
        })
        toast.success("Saját fotó sikeresen feltöltve!")
      }
    } catch {
      toast.error("Nem sikerült feltölteni a képet.")
    } finally {
      setUploadingSlot(null)
      e.target.value = ""
    }
  }

  if (!isEditing && hasSavedPresentation) {
    const formattedUpdatedAt = presentation.updatedAt
      ? new Date(presentation.updatedAt).toLocaleDateString("hu-HU", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null

    return (
      <div className="w-full space-y-6 pb-12">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsPreviewOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setIsPreviewOpen((prev) => !prev)
            }
          }}
          className={cn(
            "group w-full rounded-lg border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none transition-colors",
            isPreviewOpen
              ? "border-primary/40 bg-primary/5 hover:border-primary/60"
              : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/20"
          )}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary text-xs font-medium gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Aktív vállalat: {companyName}</span>
              </Badge>
              <Badge
                variant="secondary"
                className="text-[11px] bg-success/10 text-success border border-success/25"
              >
                Aktív és publikálva a Karrieroldalon
              </Badge>
              {formattedUpdatedAt && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Utoljára mentve: {formattedUpdatedAt}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                „Cégünkről” Vállalati Prezentáció — {companyName}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  isPreviewOpen
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/70 bg-muted/40 text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>
                  {isPreviewOpen
                    ? "Kattints a prezentáció elrejtéséhez"
                    : "Kattints a prezentáció megtekintéséhez"}
                </span>
                {isPreviewOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              Ez az 5 fejezetes interaktív prezentáció jelenik meg élőben a publikus Karrieroldalon a jelentkezők számára.
            </p>
          </div>

          {!isReadOnly && (
            <div
              className="flex items-center gap-2.5 shrink-0 flex-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCurrentStep(1)
                  setIsEditing(true)
                }}
                className="gap-1.5 text-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Prezentáció szerkesztése</span>
              </Button>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deleting}
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-1.5 text-xs text-destructive border-destructive/30 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Törlés</span>
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      „Cégünkről” prezentáció törlése
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Biztosan törölni szeretnéd a(z) {companyName} vállalati bemutatkozó prezentációját?
                      A törlés után az azonnal eltűnik a publikus Karrieroldalról, és a varázslóval bármikor újból létrehozható.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Mégsem</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletePresentation}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? "Törlés folyamatban..." : "Végleges törlés"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {isPreviewOpen && (
          <CompanyPresentationViewer
            companyName={companyName}
            presentation={presentation}
          />
        )}
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── 1. TELJES SZÉLESSÉGŰ STÚDIÓ FEJLÉC ÉS 5 LÉPÉSES STEPPER SÁV ── */}
      <div className="w-full rounded-lg border border-border/70 bg-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary text-xs font-medium gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Aktív vállalat: {companyName}</span>
              </Badge>
              <Badge
                variant="secondary"
                className="text-[11px] bg-success/10 text-success border border-success/25"
              >
                Publikus a Karrieroldalon („Cégünkről” menüpont)
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              „Cégünkről” Vállalati Prezentáció Beállítása (Lépésről lépésre)
            </h2>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {hasSavedPresentation && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
                <span>Kilépés a szerkesztésből</span>
              </Button>
            )}

            {currentStep !== 5 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(5)}
                className="gap-1.5 text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Prezentáció előnézete</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Vissza az adatok szerkesztéséhez</span>
              </Button>
            )}

            {!isReadOnly && (
              <Button
                type="button"
                size="sm"
                onClick={handleSavePresentation}
                disabled={saving}
                className="gap-1.5 text-xs"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Mentés és publikálás</span>
              </Button>
            )}
          </div>
        </div>

        {/* Teljes szélességű 5 oszlopos Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {WIZARD_STEPS.map((s) => {
            const isActive = currentStep === s.step
            const isCompleted = currentStep > s.step
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step)}
                className={cn(
                  "text-left rounded-lg border p-3.5 transition-colors flex flex-col justify-between gap-1.5",
                  isActive
                    ? "border-primary bg-primary/5"
                    : isCompleted
                    ? "border-primary/30 bg-card hover:bg-muted/30"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-mono font-semibold px-2 py-0.5 rounded",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {s.code}. LÉPÉS
                  </span>
                  {isCompleted && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p
                  className={cn(
                    "text-sm font-semibold mt-1",
                    isActive ? "text-primary" : "text-foreground"
                  )}
                >
                  {s.title}
                </p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {s.subtitle}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 1. LÉPÉS: VÁLLALATI ALAPADATOK ÉS KÜLDETÉS (TELJES SZÉLESSÉGBEN) ── */}
      {currentStep === 1 && (
        <div className="w-full rounded-lg border border-border/70 bg-card p-6 sm:p-8 space-y-8">
          <div className="space-y-1 border-b border-border/60 pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              1. Lépés / 5 — Cégprofil és Küldetés
            </span>
            <h3 className="text-xl font-semibold text-foreground">
              Vállalati alapadatok és küldetés megadása
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Add meg a(z) <strong>{companyName}</strong> alapvető cégprofilját és azt, hogy mivel foglalkoztok. Ezek az adatok kerülnek a prezentáció nyitó fejezetébe és a kulcsmutató kártyákra.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Bal oszlop: Strukturált alapadatok */}
            <div className="lg:col-span-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Iparág / Fő tevékenységi terület
                </Label>
                <Input
                  value={briefing.industry}
                  onChange={(e) =>
                    setBriefing({ ...briefing, industry: e.target.value })
                  }
                  placeholder="pl. Mesterséges intelligencia & Vállalati digitalizáció"
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Alapítás éve</Label>
                  <Input
                    value={briefing.foundedYear}
                    onChange={(e) =>
                      setBriefing({ ...briefing, foundedYear: e.target.value })
                    }
                    placeholder="pl. 2021"
                    className="tabular-nums"
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Csapatméret (Létszám)
                  </Label>
                  <Input
                    value={briefing.teamSize}
                    onChange={(e) =>
                      setBriefing({ ...briefing, teamSize: e.target.value })
                    }
                    placeholder="pl. 25–50 fő"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Munkavégzési modell és irodai jelenlét
                </Label>
                <Input
                  value={briefing.workModel}
                  onChange={(e) =>
                    setBriefing({ ...briefing, workModel: e.target.value })
                  }
                  placeholder="pl. Hibrid (heti 2–3 nap home office, budapesti központi iroda)"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Jobb oszlop: Küldetés és Kulcsmutatók élő előnézete */}
            <div className="lg:col-span-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Küldetésünk & Mit építünk / mivel foglalkozik a vállalat?
                </Label>
                <Textarea
                  rows={5}
                  value={briefing.missionInput}
                  onChange={(e) =>
                    setBriefing({ ...briefing, missionInput: e.target.value })
                  }
                  placeholder="Írd le néhány mondatban, milyen termékeket vagy szolgáltatásokat nyújt a vállalat, kik az ügyfelek, és miért izgalmas nálatok dolgozni..."
                  disabled={isReadOnly}
                />
                <p className="text-xs text-muted-foreground">
                  Elég kulcsszavakban vagy 2–3 mondatban leírnod, az AI ebből fogja megfogalmazni a teljes nyitó fejezetet.
                </p>
              </div>

              {/* Élő KPI előnézet kártyák */}
              <div className="rounded-lg border border-border/60 bg-muted/15 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Megjelenő kulcsmutatók a prezentáció 1. fejezetében:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-md border border-border/60 bg-card p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Alapítás éve
                    </p>
                    <p className="text-base font-semibold tabular-nums text-foreground mt-0.5">
                      {briefing.foundedYear || "2021"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-card p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Csapatméret
                    </p>
                    <p className="text-base font-semibold tabular-nums text-foreground mt-0.5">
                      {briefing.teamSize || "25–50 fő"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-card p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Központ
                    </p>
                    <p className="text-base font-semibold text-foreground mt-0.5 truncate">
                      {locationShort}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-card p-3">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Munkarend
                    </p>
                    <p className="text-base font-semibold text-foreground mt-0.5 truncate">
                      {briefing.workModel
                        ? briefing.workModel.split("(")[0].trim()
                        : "Hibrid"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-border/60">
            <Button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="gap-2"
            >
              <span>Tovább a 2. lépésre: Kultúra és Juttatások</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── 2. LÉPÉS: CSAPATKULTÚRA, ÉRTÉKEK ÉS JUTTATÁSOK (TELJES SZÉLESSÉGBEN) ── */}
      {currentStep === 2 && (
        <div className="w-full rounded-lg border border-border/70 bg-card p-6 sm:p-8 space-y-8">
          <div className="space-y-1 border-b border-border/60 pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              2. Lépés / 5 — Kultúra és Juttatási Csomag
            </span>
            <h3 className="text-xl font-semibold text-foreground">
              Csapatkultúra, értékek és juttatási csomag megadása
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Írd le röviden, milyen a hangulat a csapatban, milyen alapértékek szerint dolgoztok, és milyen juttatásokat kínáltok a belépőknek.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Csapatkultúra, alapértékek és mindennapi együttműködés (02. Fejezet)
                </Label>
                <Textarea
                  rows={7}
                  value={briefing.cultureInput}
                  onChange={(e) =>
                    setBriefing({ ...briefing, cultureInput: e.target.value })
                  }
                  placeholder="pl. Lapos hierarchia, önálló döntéshozatal, modern technológiai stack, heti szakmai tudásmegosztó workshopok, nyílt visszajelzések..."
                  disabled={isReadOnly}
                />
                <p className="text-xs text-muted-foreground">
                  Az AI ebből a leírásból 4 strukturált vállalati alapérték kártyát és egy csapatkultúra-bemutatót generál.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Juttatási csomag, eszközpark és fejlődési lehetőségek (03–04. Fejezet)
                </Label>
                <Textarea
                  rows={4}
                  value={briefing.perksInput}
                  onChange={(e) =>
                    setBriefing({ ...briefing, perksInput: e.target.value })
                  }
                  placeholder="pl. Versenyképes alapbér, SZÉP-kártya és cafeteria keret, prémium laptop és nagy monitorok, éves képzési és konferencia keret, rugalmas munkaidő..."
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Záró üzenet aláírója (05. Fejezet)
                  </Label>
                  <Input
                    value={presentation.closingSlide.leaderName}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        closingSlide: {
                          ...presentation.closingSlide,
                          leaderName: e.target.value,
                        },
                      })
                    }
                    placeholder="pl. HR & Vezetői Csapat"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Aláíró titulusa / Vállalat neve
                  </Label>
                  <Input
                    value={presentation.closingSlide.leaderRole}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        closingSlide: {
                          ...presentation.closingSlide,
                          leaderRole: e.target.value,
                        },
                      })
                    }
                    placeholder={companyName}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Vissza az 1. lépésre</span>
            </Button>

            <Button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="gap-2"
            >
              <span>Tovább a 3. lépésre: Fotóvilág és Saját képek</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. LÉPÉS: VIZUÁLIS FOTÓVILÁG ÉS SAJÁT KÉPEK FELTÖLTÉSE (TELJES SZÉLESSÉGBEN) ── */}
      {currentStep === 3 && (
        <div className="w-full rounded-lg border border-border/70 bg-card p-6 sm:p-8 space-y-8">
          <div className="space-y-1 border-b border-border/60 pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              3. Lépés / 5 — Fotóvilág és Saját Képek
            </span>
            <h3 className="text-xl font-semibold text-foreground">
              Vizuális fotóvilág választása és saját fotók feltöltése
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Válassz egy kurált irodai fotóvilágot alapnak, vagy tölts fel saját irodai és csapatfotókat az egyes fejezetekhez!
            </p>
          </div>

          {/* 3/A: Kurált Fotótéma választó */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              A) Alapértelmezett fotóvilág kiválasztása (1 kattintásos sablonok)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(PRESENTATION_VISUAL_THEMES).map((theme) => {
                const active = briefing.visualTheme === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleSelectTheme(theme.id)}
                    className={cn(
                      "group rounded-lg border overflow-hidden text-left transition-all flex flex-col justify-between",
                      active
                        ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                        : "border-border/70 bg-card hover:border-primary/40"
                    )}
                  >
                    <div className="h-36 w-full bg-muted overflow-hidden relative">
                      <img
                        src={theme.coverImageUrl}
                        alt={theme.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                      {active && (
                        <div className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Kiválasztva</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {theme.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {theme.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3/B: Saját fotók feltöltése */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                B) Saját fotók feltöltése (Opcionális — bármelyik képet lecserélheted saját fotóra)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tölts fel saját nagy felbontású irodai vagy csapatképeket (JPG, PNG, WebP, max. 8 MB), vagy add meg a kép URL-jét.
              </p>
            </div>

            {/* Borítókép + Kultúra kép */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Borítókép */}
              <div className="rounded-lg border border-border/70 p-4 space-y-3 bg-muted/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    1. Nyitó Borítókép (01. Fejezet)
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Hero fotó
                  </Badge>
                </div>
                <div className="h-44 rounded-md overflow-hidden border border-border/60 bg-muted">
                  <img
                    src={presentation.heroSlide.coverImageUrl}
                    alt="Borítókép"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={presentation.heroSlide.coverImageUrl}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        heroSlide: {
                          ...presentation.heroSlide,
                          coverImageUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="Kép URL..."
                    className="text-xs h-9 flex-1"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 text-xs font-medium shrink-0">
                    {uploadingSlot === "cover" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Saját kép feltöltése</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "cover")}
                    />
                  </label>
                </div>
              </div>

              {/* 2. Csapatkultúra fotó */}
              <div className="rounded-lg border border-border/70 p-4 space-y-3 bg-muted/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    2. Csapatkultúra Fotó (02. Fejezet)
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Kultúra fotó
                  </Badge>
                </div>
                <div className="h-44 rounded-md overflow-hidden border border-border/60 bg-muted">
                  <img
                    src={presentation.cultureSlide.featureImageUrl}
                    alt="Csapatkultúra fotó"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={presentation.cultureSlide.featureImageUrl}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        cultureSlide: {
                          ...presentation.cultureSlide,
                          featureImageUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="Kép URL..."
                    className="text-xs h-9 flex-1"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 text-xs font-medium shrink-0">
                    {uploadingSlot === "culture" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Saját kép feltöltése</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "culture")}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Galéria 3 kép */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {(presentation.environmentSlide.gallery || []).map((g, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/70 p-4 space-y-3 bg-muted/10"
                >
                  <span className="text-xs font-semibold text-foreground block">
                    Galéria {idx + 1}. fotó (03. Fejezet)
                  </span>
                  <div className="h-36 rounded-md overflow-hidden border border-border/60 bg-muted">
                    <img
                      src={g.imageUrl}
                      alt={g.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Input
                    value={g.title}
                    onChange={(e) => {
                      const next = [...presentation.environmentSlide.gallery]
                      next[idx] = { ...next[idx], title: e.target.value }
                      setPresentation({
                        ...presentation,
                        environmentSlide: {
                          ...presentation.environmentSlide,
                          gallery: next,
                        },
                      })
                    }}
                    placeholder="Fotó címe"
                    className="text-xs h-8 font-medium"
                  />
                  <Input
                    value={g.subtitle}
                    onChange={(e) => {
                      const next = [...presentation.environmentSlide.gallery]
                      next[idx] = { ...next[idx], subtitle: e.target.value }
                      setPresentation({
                        ...presentation,
                        environmentSlide: {
                          ...presentation.environmentSlide,
                          gallery: next,
                        },
                      })
                    }}
                    placeholder="Rövid képaláírás"
                    className="text-xs h-8"
                  />
                  <label className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 text-xs font-medium">
                    {uploadingSlot === `gallery-${idx}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Saját fotó feltöltése</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(
                          e,
                          `gallery-${idx}` as
                            | "gallery-0"
                            | "gallery-1"
                            | "gallery-2"
                        )
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Vissza a 2. lépésre</span>
            </Button>

            <Button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="gap-2"
            >
              <span>Tovább a 4. lépésre: AI Generálás és Szövegek</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── 4. LÉPÉS: AI GENERÁLÁS ÉS FEJEZETEK SZÖVEGEINEK ELLENŐRZÉSE (TELJES SZÉLESSÉGBEN) ── */}
      {currentStep === 4 && (
        <div className="w-full rounded-lg border border-border/70 bg-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                4. Lépés / 5 — Szövegek Ellenőrzése
              </span>
              <h3 className="text-xl font-semibold text-foreground">
                Fejezetek szövegeinek ellenőrzése és finomhangolása
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Itt fejezetenként (`01`–`05`) átolvashatod és tetszés szerint módosíthatod az AI által megfogalmazott szövegeket az előnézet előtt.
              </p>
            </div>

            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleGenerateAi()}
                disabled={aiGenerating}
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shrink-0"
              >
                {aiGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Szövegek újragenerálása AI-val</span>
              </Button>
            )}
          </div>

          {/* Fejezetválasztó fülek */}
          <div className="flex items-center gap-2 flex-wrap border-b border-border/60 pb-3">
            {(
              [
                { id: "slide1", label: "01. Hero & Küldetés" },
                { id: "slide2", label: "02. Kultúra & Értékek" },
                { id: "slide3", label: "03. Munkakörnyezet & Eszközök" },
                { id: "slide4", label: "04. Juttatási csomag" },
                { id: "slide5", label: "05. Záró üzenet" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditSlideTab(t.id)}
                className={cn(
                  "px-3.5 py-2 rounded-md text-xs font-medium border transition-colors",
                  editSlideTab === t.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 01. Fejezet */}
          {editSlideTab === "slide1" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Felső Badge felirat</Label>
                  <Input
                    value={presentation.heroSlide.badgeText}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        heroSlide: {
                          ...presentation.heroSlide,
                          badgeText: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Hero Főcím (Headline)</Label>
                  <Input
                    value={presentation.heroSlide.headline}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        heroSlide: {
                          ...presentation.heroSlide,
                          headline: e.target.value,
                        },
                      })
                    }
                    className="font-semibold"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bevezető alcím</Label>
                  <Textarea
                    rows={2}
                    value={presentation.heroSlide.subheadline}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        heroSlide: {
                          ...presentation.heroSlide,
                          subheadline: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Kiemelt Küldetésnyilatkozat (Mission Statement)
                  </Label>
                  <Textarea
                    rows={3}
                    value={presentation.heroSlide.missionStatement}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        heroSlide: {
                          ...presentation.heroSlide,
                          missionStatement: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* 02. Fejezet */}
          {editSlideTab === "slide2" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Fejezet címe</Label>
                    <Input
                      value={presentation.cultureSlide.sectionTitle}
                      onChange={(e) =>
                        setPresentation({
                          ...presentation,
                          cultureSlide: {
                            ...presentation.cultureSlide,
                            sectionTitle: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Bevezető összefoglaló
                    </Label>
                    <Textarea
                      rows={2}
                      value={presentation.cultureSlide.sectionSubtitle}
                      onChange={(e) =>
                        setPresentation({
                          ...presentation,
                          cultureSlide: {
                            ...presentation.cultureSlide,
                            sectionSubtitle: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Csapatkultúra történet
                  </Label>
                  <Textarea
                    rows={5}
                    value={presentation.cultureSlide.storyParagraph}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        cultureSlide: {
                          ...presentation.cultureSlide,
                          storyParagraph: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {presentation.cultureSlide.values.map((v, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-border/70 p-4 space-y-2.5 bg-muted/10"
                  >
                    <Label className="text-xs text-primary font-semibold">
                      0{idx + 1}. Alapérték
                    </Label>
                    <Input
                      value={v.title}
                      onChange={(e) => {
                        const next = [...presentation.cultureSlide.values]
                        next[idx] = { ...next[idx], title: e.target.value }
                        setPresentation({
                          ...presentation,
                          cultureSlide: {
                            ...presentation.cultureSlide,
                            values: next,
                          },
                        })
                      }}
                      className="text-xs font-medium"
                    />
                    <Textarea
                      rows={3}
                      value={v.description}
                      onChange={(e) => {
                        const next = [...presentation.cultureSlide.values]
                        next[idx] = { ...next[idx], description: e.target.value }
                        setPresentation({
                          ...presentation,
                          cultureSlide: {
                            ...presentation.cultureSlide,
                            values: next,
                          },
                        })
                      }}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 03. Fejezet */}
          {editSlideTab === "slide3" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Fejezet címe</Label>
                  <Input
                    value={presentation.environmentSlide.sectionTitle}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        environmentSlide: {
                          ...presentation.environmentSlide,
                          sectionTitle: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Munkakörnyezet összefoglaló
                  </Label>
                  <Textarea
                    rows={3}
                    value={presentation.environmentSlide.workflowDescription}
                    onChange={(e) =>
                      setPresentation({
                        ...presentation,
                        environmentSlide: {
                          ...presentation.environmentSlide,
                          workflowDescription: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Eszközpark és munkafolyamatok (soronként egy elem)
                </Label>
                <Textarea
                  rows={6}
                  value={(presentation.environmentSlide.techAndTools || []).join(
                    "\n"
                  )}
                  onChange={(e) =>
                    setPresentation({
                      ...presentation,
                      environmentSlide: {
                        ...presentation.environmentSlide,
                        techAndTools: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* 04. Fejezet */}
          {editSlideTab === "slide4" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Juttatási fejezet bevezetője
                </Label>
                <Input
                  value={presentation.perksSlide.sectionSubtitle}
                  onChange={(e) =>
                    setPresentation({
                      ...presentation,
                      perksSlide: {
                        ...presentation.perksSlide,
                        sectionSubtitle: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {presentation.perksSlide.perkCategories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-border/70 p-4 space-y-2.5 bg-muted/10"
                  >
                    <Label className="text-xs text-primary font-semibold">
                      0{idx + 1}. Kategória
                    </Label>
                    <Input
                      value={cat.category}
                      onChange={(e) => {
                        const next = [...presentation.perksSlide.perkCategories]
                        next[idx] = { ...next[idx], category: e.target.value }
                        setPresentation({
                          ...presentation,
                          perksSlide: {
                            ...presentation.perksSlide,
                            perkCategories: next,
                          },
                        })
                      }}
                      className="text-xs font-medium"
                    />
                    <Textarea
                      rows={5}
                      value={cat.items.join("\n")}
                      onChange={(e) => {
                        const next = [...presentation.perksSlide.perkCategories]
                        next[idx] = {
                          ...next[idx],
                          items: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }
                        setPresentation({
                          ...presentation,
                          perksSlide: {
                            ...presentation.perksSlide,
                            perkCategories: next,
                          },
                        })
                      }}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 05. Fejezet */}
          {editSlideTab === "slide5" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Záró főcím</Label>
                <Input
                  value={presentation.closingSlide.headline}
                  onChange={(e) =>
                    setPresentation({
                      ...presentation,
                      closingSlide: {
                        ...presentation.closingSlide,
                        headline: e.target.value,
                      },
                    })
                  }
                  className="font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Személyes vezetői / HR üzenet a pályázóknak
                </Label>
                <Textarea
                  rows={4}
                  value={presentation.closingSlide.leadershipMessage}
                  onChange={(e) =>
                    setPresentation({
                      ...presentation,
                      closingSlide: {
                        ...presentation.closingSlide,
                        leadershipMessage: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(3)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Vissza a 3. lépésre (Fotók)</span>
            </Button>

            <Button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>Tovább az 5. lépésre: Teljes Prezentáció Előnézete</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── 5. LÉPÉS: TELJES SZÉLESSÉGŰ ELŐNÉZET ÉS PUBLIKÁLÁS ── */}
      {currentStep === 5 && (
        <div className="w-full space-y-6">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                5. Lépés / 5 — Karrieroldali Előnézet
              </span>
              <h3 className="text-base font-semibold text-foreground">
                Így látják a pályázók a(z) {companyName} „Cégünkről” prezentációját a Karrieroldalon
              </h3>
              <p className="text-xs text-muted-foreground">
                Kattints végig a 01–05 fejezeteken! Ha elégedett vagy az eredménnyel, kattints a jobb oldali Mentés és publikálás gombra.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(4)}
                className="gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Szövegek módosítása</span>
              </Button>
              {!isReadOnly && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSavePresentation}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Mentés és publikálás a Karrieroldalra</span>
                </Button>
              )}
            </div>
          </div>

          <CompanyPresentationViewer
            companyName={companyName}
            presentation={presentation}
          />
        </div>
      )}
    </div>
  )
}
