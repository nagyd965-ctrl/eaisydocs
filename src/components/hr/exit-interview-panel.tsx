"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Save, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  HelpCircle
} from "lucide-react"
import { toast } from "sonner"
import { saveExitInterview } from "@/app/hr/offboarding/actions"
import { cn } from "@/lib/utils"

export interface ExitInterviewPanelProps {
  offboardingId: string
  employeeName: string
  initialInterview?: any
  initialData?: any
  onSuccess?: () => void
  onBack?: () => void
}

const KILEPES_KATEGORIA_OPTIONS = [
  { value: "", label: "Válassz távozási okot..." },
  { value: "jobb_ajanlat", label: "Jobb ajánlat / magasabb bér" },
  { value: "magnaleti", label: "Magánéleti / családi okok" },
  { value: "elorelep", label: "Előrelépési lehetőség máshol" },
  { value: "vezeto", label: "Vezető / menedzsmenti okok" },
  { value: "munkakornyezet", label: "Munkahelyi légkör / csapat" },
  { value: "munkakor", label: "Munkakör / feladatok jellege" },
  { value: "tavolsag", label: "Távolság / ingázás / távmunka hiánya" },
  { value: "nyugdij", label: "Nyugdíjba vonulás" },
  { value: "egyeb", label: "Egyéb speciális ok" },
]

const ALLOMASHELY_OPTIONS = [
  { value: "", label: "Válassz következő állomást..." },
  { value: "versenyzo_ceg", label: "Versenytárs / hasonló iparág" },
  { value: "mas_ipar", label: "Más gazdasági szektor / iparág" },
  { value: "tanulas", label: "Továbbtanulás / átképzés" },
  { value: "nyugdij", label: "Nyugdíj" },
  { value: "vallalkozas", label: "Saját vállalkozás indítása" },
  { value: "nem_mondja_meg", label: "Nem kívánja megosztani" },
]

function InteractiveRating({
  label,
  value,
  onChange,
  disabled
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const current = hover ?? value ?? 0

  const labels = ["", "Nagyon rossz", "Nem kielégítő", "Megfelelő", "Jó", "Kiváló"]

  return (
    <div className="p-3 rounded-lg border bg-card space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[11px] font-semibold text-muted-foreground min-w-[70px] text-right">
          {current > 0 ? labels[current] : "Nincs értékelve"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 pt-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star === value ? 0 : star)}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              "p-1 rounded transition-transform",
              disabled ? "cursor-default" : "cursor-pointer hover:scale-115 active:scale-95"
            )}
          >
            <Star
              className={cn(
                "w-5 h-5 transition-colors",
                current >= star
                  ? "fill-warning text-warning"
                  : "fill-transparent text-muted-foreground/25"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export function ExitInterviewPanel({
  offboardingId,
  employeeName,
  initialInterview,
  initialData,
  onSuccess,
  onBack
}: ExitInterviewPanelProps) {
  const data = initialInterview || initialData
  const [isSaving, setIsSaving] = useState(false)

  const [kilepesKategoria, setKilepesKategoria] = useState(data?.kilepes_kategoria || "")
  const [kovetkezoAllomashely, setKovetkezoAllomashely] = useState(data?.kovetkezo_allomashely || "")
  const [kilepesOka, setKilepesOka] = useState(data?.kilepes_oka || "")

  // 1-5 Skálák
  const [altalanosElegedettseg, setAltalanosElegedettseg] = useState<number | null>(
    data?.altalanos_elegedettseg ?? null
  )
  const [vezetoKapcsolat, setVezetoKapcsolat] = useState<number | null>(
    data?.vezeto_kapcsolat ?? null
  )
  const [munkakornyezetErtekeles, setMunkakornyezetErtekeles] = useState<number | null>(
    data?.munkakornyezet_ertekeles ?? null
  )
  const [csapatErtekeles, setCsapatErtekeles] = useState<number | null>(
    initialInterview?.csapat_ertekeles ?? null
  )

  // Szöveges kifejtés
  const [miTetszett, setMiTetszett] = useState(initialInterview?.mi_tetszett || "")
  const [mitValtoztatna, setMitValtoztatna] = useState(initialInterview?.mit_valtoztatna || "")
  const [ajanlana, setAjanlana] = useState<boolean | null>(initialInterview?.ajanlana ?? null)

  const isSavedBefore = Boolean(initialInterview?.id)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await saveExitInterview(offboardingId, {
        kilepes_kategoria: kilepesKategoria,
        kilepes_oka: kilepesOka,
        altalanos_elegedettseg: altalanosElegedettseg,
        vezeto_kapcsolat: vezetoKapcsolat,
        munkakornyezet_ertekeles: munkakornyezetErtekeles,
        csapat_ertekeles: csapatErtekeles,
        mi_tetszett: miTetszett,
        mit_valtoztatna: mitValtoztatna,
        ajanlana,
        kovetkezo_allomashely: kovetkezoAllomashely
      })

      if (res.error) {
        toast.error("Hiba az interjú mentésekor", { description: res.error })
      } else {
        toast.success("Kilépési interjú sikeresen rögzítve!", {
          description: "Az adatok frissültek a fluktuációs elemzésben és a feladat készre lett pipálva."
        })
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      toast.error("Váratlan hiba történt", { description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Vissza a teendőkhöz
            </Button>
          )}
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Kilépési Interjú & Visszajelzés
            </h3>
            <p className="text-xs text-muted-foreground">
              A távozó munkatárs őszinte véleményének és távozási okainak strukturált rögzítése.
            </p>
          </div>
        </div>

        {isSavedBefore && (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs gap-1 py-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Kitöltve és rögzítve
          </Badge>
        )}
      </div>

      {/* 1. Távozási Kategória és Következő Állomás */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-primary" />
          1. Távozás Háttere és Következő Állomás
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="kategoria" className="text-xs font-medium">
              Elsődleges távozási ok (Kategória)
            </Label>
            <select
              id="kategoria"
              value={kilepesKategoria}
              onChange={(e) => setKilepesKategoria(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {KILEPES_KATEGORIA_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="allomashely" className="text-xs font-medium">
              Következő állomáshely jellege
            </Label>
            <select
              id="allomashely"
              value={kovetkezoAllomashely}
              onChange={(e) => setKovetkezoAllomashely(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ALLOMASHELY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="kilepesOka" className="text-xs font-medium">
              Távozás konkrét oka – dolgozó szavaival leírva
            </Label>
            <Textarea
              id="kilepesOka"
              rows={2}
              value={kilepesOka}
              onChange={(e) => setKilepesOka(e.target.value)}
              placeholder="Rövid összefoglaló arról, mi vezette a munkatársat a döntéshez..."
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* 2. Elégedettségi Értékelések (1–5 Csillag) */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-warning" />
          2. Munkahelyi Elégedettségi Dimenziók (1–5 skála)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InteractiveRating
            label="Általános elégedettség a céggel"
            value={altalanosElegedettseg}
            onChange={setAltalanosElegedettseg}
          />
          <InteractiveRating
            label="Közvetlen vezetői kapcsolat & támogatás"
            value={vezetoKapcsolat}
            onChange={setVezetoKapcsolat}
          />
          <InteractiveRating
            label="Munkahelyi környezet, eszközök & infrastruktúra"
            value={munkakornyezetErtekeles}
            onChange={setMunkakornyezetErtekeles}
          />
          <InteractiveRating
            label="Csapat légkör & kollégákkal való együttműködés"
            value={csapatErtekeles}
            onChange={setCsapatErtekeles}
          />
        </div>
      </div>

      {/* 3. Minőségi Visszajelzések & Ajánlás */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          3. Minőségi Visszajelzések & Vállalati Ajánlás
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="miTetszett" className="text-xs font-medium text-success">
              Mi tetszett a legjobban az itt töltött idő alatt?
            </Label>
            <Textarea
              id="miTetszett"
              rows={3}
              value={miTetszett}
              onChange={(e) => setMiTetszett(e.target.value)}
              placeholder="Pozitív élmények, sikeres projektek, jó gyakorlatok..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mitValtoztatna" className="text-xs font-medium text-warning">
              Min változtatna a cég működésében? (Konstruktív kritika)
            </Label>
            <Textarea
              id="mitValtoztatna"
              rows={3}
              value={mitValtoztatna}
              onChange={(e) => setMitValtoztatna(e.target.value)}
              placeholder="Fejlesztendő folyamatok, eszközök, vezetői kommunikáció..."
              className="text-xs"
            />
          </div>

          <div className="space-y-2 md:col-span-2 pt-1">
            <Label className="text-xs font-medium">Ajánlaná-e a céget munkahelyként ismerőseinek? (eNPS)</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={ajanlana === true ? "default" : "outline"}
                size="sm"
                onClick={() => setAjanlana(ajanlana === true ? null : true)}
                className={cn(
                  "gap-1.5 text-xs font-medium",
                  ajanlana === true && "bg-success hover:bg-success/90 text-success-foreground"
                )}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Igen, szívesen ajánlanám
              </Button>

              <Button
                type="button"
                variant={ajanlana === false ? "destructive" : "outline"}
                size="sm"
                onClick={() => setAjanlana(ajanlana === false ? null : false)}
                className="gap-1.5 text-xs font-medium"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                Nem ajánlanám
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Műveleti gomb */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-xs text-muted-foreground">
          Az interjú rögzítése azonnal megjelenik a Kilépési Interjú Összesítő statisztikáiban.
        </p>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 w-full sm:w-auto font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Interjú mentése folyamatban...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Kilépési Interjú Mentése
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
