"use client"

import { useState, useRef } from "react"
import { submitApplication } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  AVAILABILITY_LABELS,
  SOURCE_LABELS,
} from "@/utils/hr/career-constants"
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  X,
  Copy,
  Check,
  Building2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

export interface ApplicationFormCompanyOption {
  id: string
  name: string
}

export interface ApplicationFormProps {
  allashirdetesId?: string | null
  munkakorId?: string | null
  companyId?: string | null
  companyName?: string | null
  positionTitle?: string | null
  isSpontaneous?: boolean
  companies?: ApplicationFormCompanyOption[]
  onSuccessCallback?: () => void
}

export function ApplicationForm({
  allashirdetesId = null,
  munkakorId = null,
  companyId = null,
  companyName = null,
  positionTitle = null,
  isSpontaneous = false,
  companies = [],
  onSuccessCallback,
}: ApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedData, setSubmittedData] = useState<{
    palyazatiKod: string
    companyName: string
    positionName: string
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [gdprConsent, setGdprConsent] = useState(false)

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    companyId || companies[0]?.id || ""
  )
  const [kezdesiIdo, setKezdesiIdo] = useState<string>("1_honap")
  const [forras, setForras] = useState<string>("karrieroldal")
  const [megpalyazottTerulet, setMegpalyazottTerulet] = useState<string>(
    "Szoftverfejlesztés & IT"
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const resolvedCompanyName =
    companyName ||
    companies.find((c) => c.id === selectedCompanyId)?.name ||
    "Vállalatunk"

  function handleFileChange(file: File | null) {
    if (!file) {
      setSelectedFile(null)
      return
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!["pdf", "doc", "docx"].includes(ext)) {
      toast.error("Kérjük, PDF vagy Word (.doc, .docx) formátumú önéletrajzot válasszon!")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A fájl mérete nem haladhatja meg a 10 MB-ot!")
      return
    }
    setSelectedFile(file)
  }

  async function handleSubmit(formData: FormData) {
    if (!gdprConsent) {
      toast.error("Az adatkezelési tájékoztató elfogadása kötelező!")
      return
    }

    const cvFile = selectedFile || (formData.get("cv") as File)
    if (!cvFile || cvFile.size === 0) {
      toast.error("Kérjük, csatolja az önéletrajzát!")
      return
    }

    if (isSpontaneous && !selectedCompanyId && !companyId) {
      toast.error("Kérjük, válassza ki, melyik vállalathoz szeretne jelentkezni!")
      return
    }

    setIsSubmitting(true)
    try {
      formData.set("cv", cvFile)
      if (allashirdetesId) formData.set("allashirdetesId", allashirdetesId)
      if (munkakorId) formData.set("munkakorId", munkakorId)
      if (companyId || selectedCompanyId) {
        formData.set("companyId", companyId || selectedCompanyId)
      }
      formData.set("kezdesi_ido", kezdesiIdo)
      formData.set("forras", forras)
      if (isSpontaneous) {
        formData.set("megpalyazott_terulet", megpalyazottTerulet)
      }

      const result = await submitApplication(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        setSubmittedData({
          palyazatiKod: result.palyazatiKod || "KAR-2026",
          companyName: result.companyName || resolvedCompanyName,
          positionName:
            result.positionName || positionTitle || "Meghirdetett pozíció",
        })
        toast.success("Pályázata sikeresen beérkezett!")
        if (onSuccessCallback) onSuccessCallback()
      }
    } catch {
      toast.error("Váratlan hiba történt a küldés során.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCopyCode() {
    if (!submittedData?.palyazatiKod) return
    navigator.clipboard.writeText(submittedData.palyazatiKod)
    setCopiedCode(true)
    toast.success("Pályázati azonosító vágólapra másolva!")
    setTimeout(() => setCopiedCode(false), 2000)
  }

  if (submittedData) {
    return (
      <div className="bg-card text-foreground p-6 sm:p-8 rounded-lg border border-success/40 space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Köszönjük a jelentkezésedet!
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Pályázatod sikeresen beérkezett a(z){" "}
              <strong className="text-foreground">{submittedData.companyName}</strong>{" "}
              toborzási rendszerébe ({submittedData.positionName}).
            </p>
          </div>
        </div>

        {/* Pályázatkövető azonosító kártya */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Pályázatkövető azonosító (Reference ID)
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleCopyCode}
              className="h-6 px-2 text-xs gap-1"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span>Másolva</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Azonosító másolása</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-xl font-semibold tabular-nums font-mono text-primary">
            {submittedData.palyazatiKod}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mentsd el ezt a kódot (e-mailben is elküldtük): a karrieroldal{" "}
            <strong>Pályázatstátusz lekérdezése</strong> felületén bármikor
            ellenőrizheted, hol tart az elbírálás.
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2 text-xs">
          <p className="font-semibold text-foreground">Mi történik ezután?</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>HR csapatunk 2–3 munkanapon belül áttekinti a szakmai önéletrajzodat.</li>
            <li>Megfelelés esetén telefonos vagy online rövid egyeztetésre hívunk.</li>
            <li>Szakmai interjú a közvetlen csapattal és vezetővel.</li>
            <li>Visszajelzés és személyre szabott ajánlattétel.</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-5 bg-card text-foreground p-6 rounded-lg border border-border/70"
    >
      <div className="border-b border-border/60 pb-4 space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-foreground">
            {isSpontaneous
              ? "Nyitott jelentkezés (Talent Pool)"
              : "Jelentkezés erre a pozícióra"}
          </h3>
          {resolvedCompanyName && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs border-primary/30 bg-primary/5 text-primary font-medium"
            >
              <Building2 className="w-3 h-3" />
              <span>{resolvedCompanyName}</span>
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isSpontaneous
            ? "Add meg adataidat és csatold az önéletrajzodat, hogy felvehessünk a kiválasztott vállalat tehetségbázisába."
            : "Töltsd ki az alábbi mezőket és csatold az önéletrajzodat. A beküldés után azonnal kapsz egy pályázatkövető azonosítót."}
        </p>
      </div>

      {/* Ha általános Talent Pool jelentkezés, cég és szakterület választó */}
      {isSpontaneous && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg border border-primary/20 bg-primary/5">
          {companies.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Célvállalat kiválasztása <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(val) => val && setSelectedCompanyId(val)}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Válassz vállalatot...">
                    {companies.find((c) => c.id === selectedCompanyId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id} label={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Milyen szakterület érdekel? <span className="text-destructive">*</span>
            </Label>
            <Input
              value={megpalyazottTerulet}
              onChange={(e) => setMegpalyazottTerulet(e.target.value)}
              placeholder="pl. Szoftverfejlesztés, Design, Flottakezelés, HR..."
              className="bg-background"
              required
            />
          </div>
        </div>
      )}

      {/* 1. Személyes elérhetőségek */}
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="nev" className="text-xs font-medium">
            Teljes név <span className="text-destructive">*</span>
          </Label>
          <Input id="nev" name="nev" required placeholder="Kovács János" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              E-mail cím <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="kovacs.janos@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefon" className="text-xs font-medium">
              Telefonszám <span className="text-destructive">*</span>
            </Label>
            <Input
              id="telefon"
              name="telefon"
              type="tel"
              required
              placeholder="+36 30 123 4567"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="linkedin_url" className="text-xs font-medium">
            LinkedIn profil / Portfólió / GitHub URL (opcionális)
          </Label>
          <Input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            placeholder="https://www.linkedin.com/in/..."
          />
        </div>
      </div>

      {/* 2. Szakmai paraméterek (Bérigény, Kezdés, Forrás) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="berigeny" className="text-xs font-medium">
            Bruttó havi bérigény (Ft / hó, opcionális)
          </Label>
          <Input
            id="berigeny"
            name="berigeny"
            type="number"
            min={0}
            step={10000}
            placeholder="pl. 950000"
            className="tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Legkorábbi kezdés / Felmondási idő</Label>
          <Select
            value={kezdesiIdo}
            onValueChange={(val) => val && setKezdesiIdo(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{AVAILABILITY_LABELS[kezdesiIdo]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AVAILABILITY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Honnan hallottál rólunk?</Label>
        <Select value={forras} onValueChange={(val) => val && setForras(val)}>
          <SelectTrigger className="w-full">
            <SelectValue>{SOURCE_LABELS[forras]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SOURCE_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Önéletrajz feltöltése (Drag & Drop zóna) */}
      <div className="space-y-1.5">
        <Label htmlFor="cv" className="text-xs font-medium">
          Szakmai önéletrajz (CV) feltöltése (PDF vagy Word, max. 10 MB){" "}
          <span className="text-destructive">*</span>
        </Label>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const droppedFile = e.dataTransfer.files?.[0] || null
            handleFileChange(droppedFile)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : selectedFile
              ? "border-primary/40 bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            id="cv"
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />

          {selectedFile ? (
            <div className="flex items-center justify-between w-full gap-3 px-2">
              <div className="flex items-center gap-2.5 min-w-0 text-left">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Kattints a cseréhez
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="text-muted-foreground hover:text-destructive shrink-0"
                title="Fájl eltávolítása"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <UploadCloud className="w-6 h-6 text-muted-foreground mb-1.5" />
              <p className="text-xs font-medium text-foreground">
                Húzd ide az önéletrajzodat, vagy{" "}
                <span className="text-primary underline">böngéssz a gépeden</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Támogatott formátumok: PDF, DOCX (max. 10 MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* 4. Bemutatkozás / Motiváció */}
      <div className="space-y-1.5">
        <Label htmlFor="uzenet" className="text-xs font-medium">
          Rövid bemutatkozás / Motiváció (opcionális)
        </Label>
        <Textarea
          id="uzenet"
          name="uzenet"
          placeholder="Írj néhány sort a releváns tapasztalataidról vagy motivációdról..."
          className="min-h-[84px] text-xs"
        />
      </div>

      {/* 5. GDPR Adatkezelési hozzájárulás */}
      <div className="flex items-start space-x-2.5 pt-1">
        <Checkbox
          id="gdpr"
          className="mt-0.5 shrink-0"
          checked={gdprConsent}
          onCheckedChange={(checked) => setGdprConsent(checked as boolean)}
        />
        <label
          htmlFor="gdpr"
          className="text-xs font-normal leading-relaxed cursor-pointer text-muted-foreground"
        >
          Elfogadom az{" "}
          <Dialog>
            <DialogTrigger className="text-primary hover:underline cursor-pointer bg-transparent border-none p-0 outline-none inline font-medium">
              Adatvédelmi Tájékoztatót
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Adatvédelmi Tájékoztató — Toborzás és Kiválasztás ({resolvedCompanyName})
                </DialogTitle>
                <DialogDescription>
                  EU 2016/679 rendelet (GDPR) szerinti pályázói adatkezelési tájékoztató.
                </DialogDescription>
              </DialogHeader>
              <div className="text-xs space-y-3 text-muted-foreground mt-3 leading-relaxed">
                <h4 className="font-semibold text-sm text-foreground">
                  1. Az adatkezelő és az adatkezelés célja
                </h4>
                <p>
                  A megadott személyes adatokat (név, elérhetőségek, szakmai önéletrajz, bérigény) a kiválasztott hirdető vállalat (<strong>{resolvedCompanyName}</strong>) kizárólag a kiválasztási folyamat lebonyolítása, a jelentkező szakmai értékelése és kapcsolattartás céljából kezeli.
                </p>

                <h4 className="font-semibold text-sm text-foreground">
                  2. Kezelt adatok köre és AI előszűrési támogatás
                </h4>
                <p>
                  A jelentkezés során megadott adatok, valamint az önéletrajzban szereplő szakmai információk. Rendszerünk a HR szakemberek munkájának támogatására strukturált készség-kinyerést alkalmazhat, azonban minden kiválasztási döntést emberi HR szakember hoz meg.
                </p>

                <h4 className="font-semibold text-sm text-foreground">
                  3. Adatkezelés időtartama (6 hónap Talent Pool)
                </h4>
                <p>
                  A személyes adatokat a jelentkezés benyújtásától számított <strong>6 hónapig</strong> tároljuk a vállalat saját tehetségbázisában (Talent Pool), ezt követően az adatok törlésre vagy anonimizálásra kerülnek.
                </p>

                <h4 className="font-semibold text-sm text-foreground">
                  4. Az érintett jogai
                </h4>
                <p>
                  Bármikor jogosult tájékoztatást kérni adatai kezeléséről, kérheti azok helyesbítését, vagy a 6 hónapos időtartam lejárta előtt is kérheti adatai azonnali törlését.
                </p>
              </div>
            </DialogContent>
          </Dialog>
          , és hozzájárulok ahhoz, hogy a(z){" "}
          <strong className="text-foreground">{resolvedCompanyName}</strong> az
          önéletrajzomat és a megadott adataimat a kiválasztási folyamat céljából{" "}
          <strong className="text-foreground">6 hónapig</strong> kezelje.{" "}
          <span className="text-destructive">*</span>
        </label>
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>
          {isSubmitting ? "Pályázat beküldése folyamatban..." : "Pályázat beküldése"}
        </span>
      </Button>
    </form>
  )
}
