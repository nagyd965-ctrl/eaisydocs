"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  ShieldCheck, 
  FileCheck, 
  Download, 
  Loader2, 
  CheckCircle2,
  HardHat,
  ArrowLeft,
  Calendar,
  User,
  Building,
  Info
} from "lucide-react"
import { toast } from "sonner"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { 
  getSafetyTrainingRecord, 
  generateAndFileSafetyTrainingAction,
  fileExistingSafetyTrainingDocument 
} from "@/app/hr/actions/safety-training-actions"
import { DEFAULT_SAFETY_TOPICS, type SafetyTrainingPdfData } from "@/utils/hr/safety-training-constants"

export interface SafetyTrainingPanelProps {
  employeeName: string
  dolgozoId?: string | null
  onboardingId?: string | null
  munkakor?: string | null
  reszleg?: string | null
  currentUserName?: string
  onSuccess?: () => void
  onBack?: () => void
}

export function SafetyTrainingPanel({
  employeeName,
  dolgozoId,
  onboardingId,
  munkakor,
  reszleg,
  currentUserName,
  onSuccess,
  onBack
}: SafetyTrainingPanelProps) {
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFileLoading, setIsFileLoading] = useState(false)
  const [existingRecord, setExistingRecord] = useState<any>(null)
  const [existingDoc, setExistingDoc] = useState<any>(null)

  // Űrlap állapot
  const [oktatoNeve, setOktatoNeve] = useState(currentUserName || "Nagy Dániel")
  const [oktatoBeosztasa, setOktatoBeosztasa] = useState("Munkavédelmi és Tűzvédelmi Megbízott")
  const [oktatasDatuma, setOktatasDatuma] = useState(new Date().toISOString().split("T")[0])
  const [oktatasTipusa, setOktatasTipusa] = useState("elozetes_munkaba_allasi")
  const [megjegyzes, setMegjegyzes] = useState("")

  const loadRecord = async () => {
    setLoading(true)
    const res = await getSafetyTrainingRecord({ dolgozoId, onboardingId })
    setLoading(false)
    if (res.data) setExistingRecord(res.data)
    if (res.existingDocument) setExistingDoc(res.existingDocument)
    else setExistingDoc(null)
  }

  useEffect(() => {
    loadRecord()
  }, [dolgozoId, onboardingId])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oktatoNeve.trim()) {
      toast.error("Add meg az oktató nevét!")
      return
    }

    setIsGenerating(true)
    const res = await generateAndFileSafetyTrainingAction({
      onboardingId,
      dolgozoId,
      employeeName,
      munkakor,
      reszleg,
      oktatoNeve: oktatoNeve.trim(),
      oktatoBeosztasa: oktatoBeosztasa.trim(),
      oktatasDatuma,
      oktatasTipusa,
      megjegyzes: megjegyzes.trim() || null
    })
    setIsGenerating(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      if (res.isFiled) {
        toast.success("Oktatási jegyzőkönyv sikeresen kiállítva és beiktatva az eaisyDocs-ba!")
      } else {
        toast.success("Oktatási jegyzőkönyv (PDF) legenerálva és mentve! Az iktatás a fiók aktiválásakor történik meg.")
      }
      setExistingDoc(res.document)
      if (onSuccess) onSuccess()
    }
  }

  const handleFileExisting = async () => {
    if (!existingDoc?.id || !dolgozoId) return
    setIsFileLoading(true)
    const res = await fileExistingSafetyTrainingDocument({
      documentId: existingDoc.id,
      dolgozoId,
      employeeName
    })
    setIsFileLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Jegyzőkönyv sikeresen beiktatva! Iktatószám: ${res.iktatoszam}`)
      setExistingDoc((prev: any) => prev ? { ...prev, iktatoszam: res.iktatoszam } : prev)
      if (onSuccess) onSuccess()
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Fejléc és navigáció */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="h-8 gap-1 text-xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Vissza a teendőkhöz
            </Button>
          )}
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <HardHat className="w-4 h-4 text-teal-600" /> Munkavédelmi és Tűzvédelmi Oktatás
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kötelező előzetes vagy ismétlődő oktatási jegyzőkönyv kiállítása és eaisyDocs iktatása (3.4 tétel, 10 év megőrzési idő).
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20 shrink-0 self-start sm:self-auto">
          Mvt. 55. § & Ttv. 22. §
        </Badge>
      </div>

      {/* 2. Létező jegyzőkönyv státusz kártya */}
      {existingDoc && (
        <div className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
          existingDoc.iktatoszam 
            ? "border-emerald-500/30 bg-emerald-500/10" 
            : "border-amber-500/30 bg-amber-500/5"
        }`}>
          <div className="flex items-center gap-3">
            {existingDoc.iktatoszam ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <FileCheck className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground">
                  Elkészült Munkavédelmi & Tűzvédelmi Jegyzőkönyv
                </h4>
                {existingDoc.iktatoszam ? (
                  <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium">
                    Beiktatva: {existingDoc.iktatoszam}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium">
                    Mentve (Iktatás fiókaktiváláskor)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {existingDoc.iktatoszam 
                  ? "Hivatalosan beiktatva az eaisyDocs személyi dossziéba (3.4 irattári tétel, 10 év megőrzés)." 
                  : "A jegyzőkönyv PDF elkészült az onboardingban. Az aláírás után a fiók aktiválásakor automatikusan a személyi dossziéba iktatódik."
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dolgozoId && !existingDoc.iktatoszam && (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={handleFileExisting}
                disabled={isFileLoading}
                className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {isFileLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Iktatás a dossziéba
              </Button>
            )}
            <PdfViewerDialog url={existingDoc.url} title="Munkavédelmi Oktatási Jegyzőkönyv" />
            <a
              href={existingDoc.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-1.5 text-xs`}
            >
              <Download className="w-3.5 h-3.5" /> Letöltés
            </a>
          </div>
        </div>
      )}

      {/* 3. Munkavállaló gyors adatai */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-muted-foreground block text-[11px]">Oktatott munkavállaló:</span>
            <strong className="text-foreground">{employeeName}</strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-muted-foreground block text-[11px]">Munkakör:</span>
            <strong className="text-foreground">{munkakor || "Munkatárs"}</strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-muted-foreground block text-[11px]">Részleg:</span>
            <strong className="text-foreground">{reszleg || "Központi"}</strong>
          </div>
        </div>
      </div>

      {/* 4. Generálási űrlap */}
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Oktató neve <span className="text-destructive">*</span>
            </Label>
            <Input
              value={oktatoNeve}
              onChange={(e) => setOktatoNeve(e.target.value)}
              placeholder="Pl. Kovács Péter"
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Oktató beosztása / minősítése</Label>
            <Input
              value={oktatoBeosztasa}
              onChange={(e) => setOktatoBeosztasa(e.target.value)}
              placeholder="Pl. Munkavédelmi és Tűzvédelmi Megbízott"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Oktatás típusa</Label>
            <select
              value={oktatasTipusa}
              onChange={(e) => setOktatasTipusa(e.target.value)}
              className="w-full h-8 text-xs px-2.5 rounded-md border border-input bg-background font-medium"
            >
              <option value="elozetes_munkaba_allasi">Előzetes munkába állási oktatás (Onboarding)</option>
              <option value="idoszakos_ismetlo">Éves időszakos ismétlő oktatás</option>
              <option value="rendkivuli">Rendkívüli oktatás (baleset / technológiaváltás)</option>
              <option value="munkakor_valtozas">Munkakör vagy telephely változása miatti oktatás</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Oktatás dátuma</Label>
            <Input
              type="date"
              value={oktatasDatuma}
              onChange={(e) => setOktatasDatuma(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Oktatási tematika áttekintése */}
        <div className="border rounded-lg p-3.5 bg-muted/10 space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              Jegyzőkönyvezett Oktatási Tematika ({DEFAULT_SAFETY_TOPICS.length} pont)
            </h5>
            <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20 font-medium">
              Mvt. 55. § & OTSZ
            </Badge>
          </div>
          <ul className="text-[11px] text-muted-foreground space-y-1.5 pl-4 list-disc max-h-36 overflow-y-auto pr-1">
            {DEFAULT_SAFETY_TOPICS.map((t, idx) => (
              <li key={idx} className="leading-snug">{t}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Egyedi megjegyzés / Speciális munkahelyi kockázatok (opcionális)</Label>
          <Textarea
            value={megjegyzes}
            onChange={(e) => setMegjegyzes(e.target.value)}
            placeholder="Pl. Laboratóriumi vegyszerhasználati előírások, ESD védelem, speciális egyéni védőeszköz juttatás..."
            className="text-xs min-h-[60px]"
          />
        </div>

        {/* Műveleti gomb és tájékoztató */}
        <div className="border-t pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-lg border">
          <div className="text-[11px] text-muted-foreground leading-tight space-y-0.5">
            <span className="font-semibold text-foreground block">
              {dolgozoId ? "Hivatalos eaisyDocs Iktatás (3.4 tétel)" : "Pre-onboarding Jegyzőkönyv Készítés"}
            </span>
            <span>
              {dolgozoId 
                ? "A jegyzőkönyv generálódik és azonnal beiktatásra kerül a személyi dossziéba (10 év megőrzési idő)."
                : "A jegyzőkönyv letölthető és aláírható PDF formátumban mentődik. Az eaisyDocs személyi dossziéba az aktiváláskor iktatódik."
              }
            </span>
          </div>

          <Button
            type="submit"
            disabled={isGenerating || !oktatoNeve.trim()}
            className="gap-2 shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {dolgozoId ? "Generálás & Iktatás..." : "Jegyzőkönyv generálása..."}
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                {dolgozoId ? "Jegyzőkönyv Generálása & Iktatás" : "Jegyzőkönyv Generálása (PDF)"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
