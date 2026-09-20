"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { fileIncomingDocument, generateAISuggestions, clearAICacheAndRerun } from "@/app/inbox/filing-actions"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw,
  X, 
  Calendar, 
  Building2, 
  Tag, 
  Hash, 
  Link as LinkIcon,
  Check,
  AlertTriangle
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

import { type FilingIrat, type FilingTerv, type FilingUgyirat } from "./filing-dialog"
import { type AntecedentMatchResult } from "@/utils/antecedent-matcher"

export interface FilingDepartment {
  id: string
  nev: string
  iktato_prefix?: string | null
  [key: string]: unknown
}

export interface FilingPartner {
  id: string
  nev: string
  adoszam?: string | null
  [key: string]: unknown
}

const DOCUMENT_TYPES = [
  { value: "szerzodes", label: "Szerződés" },
  { value: "szamla", label: "Számla / Bizonylat" },
  { value: "hatosagi_level", label: "Hatósági levél / Végzés" },
  { value: "beadvany", label: "Beadvány / Kérelem" },
  { value: "igazolas", label: "Igazolás / Tanúsítvány" },
  { value: "egyeb", label: "Egyéb irat" },
]

export function FilingPanelClient({ 
  irat, 
  pdfUrl,
  tervek,
  ugyiratok,
  departments,
  partners = [],
  antecedentSuggestion,
  initialMode
}: { 
  irat: FilingIrat, 
  pdfUrl: string | null,
  tervek: FilingTerv[],
  ugyiratok: FilingUgyirat[],
  departments?: FilingDepartment[],
  partners?: FilingPartner[],
  antecedentSuggestion?: AntecedentMatchResult,
  initialMode?: "new" | "existing"
}) {
  const router = useRouter()
  const isSuggestionOpen = !["irattarban", "lezart", "selejtezheto", "selejtezett"].includes(antecedentSuggestion?.statusz || "")
  const isInitialAntecedent = (antecedentSuggestion?.confidence_score || 0) >= 60 && !!antecedentSuggestion?.ugyirat_id && isSuggestionOpen

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // initialMode (from URL param) takes priority over the antecedent-based detection
  const [mode, setMode] = useState<"new" | "existing">(
    initialMode ?? (isInitialAntecedent ? "existing" : "new")
  )
  
  // Mezők állapota
  const [targy, setTargy] = useState(irat.targy || "")
  const [dokumentumTipus, setDokumentumTipus] = useState<string>("egyeb")
  const [partnerId, setPartnerId] = useState<string>((irat.partner as any)?.id || (irat as any).kuldo_partner_id || "")
  const [partnerNev, setPartnerNev] = useState<string>((irat.partner as any)?.nev || "")
  const [partnerAdoszam, setPartnerAdoszam] = useState<string>((irat.partner as any)?.adoszam || "")
  const [hivatkozottSzam, setHivatkozottSzam] = useState<string>("")
  const [hatarido, setHatarido] = useState<string>("")
  const [ugytipusId, setUgytipusId] = useState<string>("")
  const [departmentId, setDepartmentId] = useState<string>("")
  const [existingUgyiratId, setExistingUgyiratId] = useState<string>(
    isInitialAntecedent && antecedentSuggestion?.ugyirat_id ? antecedentSuggestion.ugyirat_id : ""
  )

  // Csak azok az ügyiratok, amelyek nincsenek lezárva, irattározva vagy selejtezve
  const attachableUgyiratok = useMemo(() => {
    return (ugyiratok || []).filter(
      (u) => !["irattarban", "lezart", "selejtezheto", "selejtezett"].includes(u.statusz)
    )
  }, [ugyiratok])

  // AI és előzmény állapotok
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHasRun, setAiHasRun] = useState(false) // true: már futott AI kitöltés, megjelenhet az újraelemzés gomb
  const [aiReasoning, setAiReasoning] = useState<string | null>(null)
  const [detectedAntecedent, setDetectedAntecedent] = useState<{
    ugyiratId: string
    iktatoszam: string
    confidence?: number
  } | null>(
    isInitialAntecedent && antecedentSuggestion?.ugyirat_id
      ? {
          ugyiratId: antecedentSuggestion.ugyirat_id,
          iktatoszam: antecedentSuggestion.iktatoszam || "",
          confidence: antecedentSuggestion.confidence_score
        }
      : null
  )

  const [isFiledByOther, setIsFiledByOther] = useState(false)

  // Realtime figyelés: ha egy másik kolléga már eliktatta ezt a dokumentumot
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`filing_conflict_${irat.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "irat",
          filter: `id=eq.${irat.id}`,
        },
        (payload: any) => {
          if (payload.new?.ugyirat_id) {
            setIsFiledByOther(true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [irat.id])

  // Partner autocomplete állapotok
  const [showPartnerSuggestions, setShowPartnerSuggestions] = useState(false)
  const partnerInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (partnerInputRef.current && !partnerInputRef.current.contains(e.target as Node)) {
        setShowPartnerSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredPartners = partnerNev.trim() || partnerAdoszam.trim()
    ? partners.filter(p => 
        (partnerNev.trim() && p.nev.toLowerCase().includes(partnerNev.toLowerCase())) ||
        (partnerAdoszam.trim() && p.adoszam && p.adoszam.toLowerCase().includes(partnerAdoszam.toLowerCase()))
      ).slice(0, 6)
    : partners.slice(0, 6)

  const selectedPlan = tervek.find(t => t.id === ugytipusId)
  const selectedDept = departments?.find((d) => d.id === departmentId)

  // AI Kitöltés hívása
  const handleAiSuggest = async () => {
    setAiLoading(true)
    setError(null)
    setAiReasoning(null)
    try {
      const result = await generateAISuggestions(irat.id)
      applyAiResult(result)
    } catch (_err) {
      setError("Hiba történt az AI automatikus metaadat-kinyerése során.")
    } finally {
      setAiLoading(false)
    }
  }

  // AI Ú jraelemzés (cache törlés + friss futás)
  const handleAiRerun = async () => {
    setAiLoading(true)
    setError(null)
    setAiReasoning(null)
    try {
      const result = await clearAICacheAndRerun(irat.id)
      applyAiResult(result)
    } catch (_err) {
      setError("Hiba történt az AI újraelemzése során.")
    } finally {
      setAiLoading(false)
    }
  }

  function applyAiResult(result: Awaited<ReturnType<typeof generateAISuggestions>>) {
    if (result.error) {
      setError(result.error)
    } else if (result.suggestions) {
      const s = result.suggestions
      if (s.targy) setTargy(s.targy)
      if (s.dokumentum_tipus) setDokumentumTipus(s.dokumentum_tipus)
      if (s.partner_nev) setPartnerNev(s.partner_nev)
      if (s.partner_id) setPartnerId(s.partner_id)
      if (s.partner_adoszam) setPartnerAdoszam(s.partner_adoszam)
      if (s.hivatkozott_szam) setHivatkozottSzam(s.hivatkozott_szam)
      if (s.hatarido) setHatarido(s.hatarido)
      if (s.irattari_tetel_id) setUgytipusId(s.irattari_tetel_id)
      if (s.department_id) setDepartmentId(s.department_id)
      if (s.indoklas) setAiReasoning(s.indoklas)
      setAiHasRun(true) // az újraelemzés gomb mostantól látható

      if (s.elozmeny_ugyirat_id) {
        setDetectedAntecedent({
          ugyiratId: s.elozmeny_ugyirat_id,
          iktatoszam: s.elozmeny_iktatoszam || "",
          confidence: s.confidence_score || 90
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append("irat_id", irat.id)
    formData.append("mode", mode)
    formData.append("dokumentum_tipus", dokumentumTipus)
    formData.append("kuldo_partner_id", partnerId)
    formData.append("partner_nev", partnerNev)
    formData.append("partner_adoszam", partnerAdoszam)
    formData.append("hivatkozott_szam", hivatkozottSzam)
    formData.append("hatarido", hatarido)
    
    try {
      const result = await fileIncomingDocument(formData)
      if (result?.error) {
        setError(result.error)
        if (result.error.includes("másik") || result.error.includes("iktatta")) {
          setIsFiledByOther(true)
        }
      } else {
        router.push("/inbox")
      }
    } catch (_err: unknown) {
      setError("Váratlan hiba történt az iktatás során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full items-stretch">
      {/* Bal oldali dokumentum előnézet (60%) */}
      <ResizablePanel defaultSize={60} minSize={30}>
        <div className="flex h-full flex-col bg-muted/30">
          <div className="flex h-12 items-center border-b px-4 bg-background justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/inbox")} className="h-8">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Vissza
              </Button>
              <div className="text-sm font-medium text-foreground">
                Dokumentum előnézet
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Érkeztetve: {irat.erkezes_datuma ? new Date(irat.erkezes_datuma as string).toLocaleDateString("hu-HU") : "N/A"}
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative bg-muted">
            {pdfUrl ? (
              <iframe 
                src={pdfUrl} 
                className="w-full h-full border-0" 
                title="Dokumentum előnézet"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p>A dokumentum nem tölthető be, vagy nincs csatolt fájl.</p>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Jobb oldali iktató és metaadat űrlap (40%) */}
      <ResizablePanel defaultSize={40} minSize={30}>
        <div className="flex h-full flex-col overflow-y-auto bg-background">
          {/* Header */}
          <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Iktatás és Metaadatok</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Érkeztetőszám: <strong className="text-foreground">{irat.erkeztetoszam}</strong>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAiSuggest} 
                disabled={aiLoading}
                className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/25 h-9 font-medium shadow-none transition-all"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                    <span>Kiolvasás (OCR)...</span>
                  </>
                ) : (
                  <span>AI Kitöltés</span>
                )}
              </Button>
              {aiHasRun && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAiRerun}
                  disabled={aiLoading}
                  title="AI újraelemzés (cache törlés)"
                  className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-none border border-transparent hover:border-primary/25 transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 space-y-6">
            {isFiledByOther && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-start justify-between gap-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">A dokumentumot időközben eliktatták!</h4>
                    <p className="text-xs text-destructive/90 mt-0.5">
                      Egy másik munkatárs már lezárta és iktatta ezt a beérkezett iratot. Az űrlap zárolásra került az adatütközés megelőzése érdekében.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push("/inbox")}
                  className="shrink-0 border-destructive/30 hover:bg-destructive/20 text-destructive text-xs h-8"
                >
                  Vissza a beérkezőkhöz
                </Button>
              </div>
            )}

            <form id="filing-form" onSubmit={handleSubmit} className="space-y-5">
              {error && (
                (() => {
                  const isPermError = error.includes("jogosultságod") || error.includes("nincs jogosults") || error.includes("szervezeti egység")
                  return (
                    <div className={`rounded-lg border p-3.5 space-y-2 ${isPermError ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className={`flex items-center gap-2 text-sm font-semibold ${isPermError ? "text-warning" : "text-destructive"}`}>
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{isPermError ? "Hozzáférés megtagadva" : "Hiba történt"}</span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{error}</p>
                    </div>
                  )
                })()
              )}

              {/* AI indoklás és előtöltés értesítő */}
              {aiReasoning && (
                <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-3.5 dark:bg-primary/10 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <Sparkles className="h-4 w-4" />
                      <span>AI Intelligens javaslatok alkalmazva</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiReasoning(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-primary/10"
                      title="Bezárás"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {aiReasoning}
                  </p>
                </div>
              )}

              {/* Detektált előzmény-ügyirat banner (1-kattintásos csatolási opció) */}
              {detectedAntecedent && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3 text-xs animate-in fade-in">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span>Javasolt előzmény-ügyirat</span>
                      {detectedAntecedent.confidence && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 font-mono">
                          {detectedAntecedent.confidence}% egyezés
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      Iktatószám: <strong className="text-foreground">{detectedAntecedent.iktatoszam}</strong>
                    </p>
                  </div>
                  {mode === "new" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs font-medium shrink-0"
                      onClick={() => {
                        setMode("existing")
                        setExistingUgyiratId(detectedAntecedent.ugyiratId)
                      }}
                    >
                      Csatolás ehhez
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-primary font-medium text-[11px] shrink-0">
                      <Check className="h-3.5 w-3.5" /> Kiválasztva
                    </span>
                  )}
                </div>
              )}

              {/* Ügy tárgya */}
              <div className="space-y-1.5">
                <Label htmlFor="targy" className="text-xs font-medium">
                  Ügy tárgya <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="targy" 
                  name="targy" 
                  required
                  value={targy}
                  onChange={(e) => setTargy(e.target.value)}
                  placeholder="Pl. Munkaszerződés – Kovács Béla" 
                  className={`text-sm ${aiLoading ? "animate-pulse bg-muted" : ""}`}
                />
              </div>

              {/* Dokumentumtípus és Hivatkozott szám (2 oszlopos elrendezés) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dokumentumtípus */}
                <div className="space-y-1.5">
                  <Label htmlFor="dokumentum_tipus" className="text-xs font-medium">
                    Dokumentumtípus
                  </Label>
                  <Select 
                    name="dokumentum_tipus" 
                    value={dokumentumTipus} 
                    onValueChange={(v) => setDokumentumTipus(v || "egyeb")}
                  >
                    <SelectTrigger id="dokumentum_tipus" className={`text-xs sm:text-sm ${aiLoading ? "animate-pulse bg-muted" : ""}`}>
                      <SelectValue placeholder="Válassz típust...">
                        {DOCUMENT_TYPES.find(d => d.value === dokumentumTipus)?.label || "Egyéb irat"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((dt) => (
                        <SelectItem key={dt.value} value={dt.value} label={dt.label}>
                          {dt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hivatkozott ügyiratszám / szerződésszám */}
                <div className="space-y-1.5">
                  <Label htmlFor="hivatkozott_szam" className="text-xs font-medium">
                    Hivatkozott szám
                  </Label>
                  <Input 
                    id="hivatkozott_szam" 
                    name="hivatkozott_szam" 
                    value={hivatkozottSzam}
                    onChange={(e) => setHivatkozottSzam(e.target.value)}
                    placeholder="Pl. SZERZ-2025/11 vagy NAV-1234" 
                    className={`text-xs sm:text-sm font-mono ${aiLoading ? "animate-pulse bg-muted" : ""}`}
                  />
                </div>
              </div>

              {/* Partner adatok (2 oszlop: Küldő partner neve + Partner adószáma) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Küldő partner */}
                <div className="space-y-1.5 relative" ref={partnerInputRef}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="partner_nev" className="text-xs font-medium">
                      Küldő partner
                    </Label>
                    {partnerId && (
                      <span className="text-[10px] text-primary flex items-center gap-0.5">
                        <Check className="h-3 w-3" /> Partner azonosítva
                      </span>
                    )}
                  </div>
                  <Input 
                    id="partner_nev" 
                    name="partner_nev" 
                    value={partnerNev}
                    onChange={(e) => {
                      setPartnerNev(e.target.value)
                      setPartnerId("") // új gépeléskor töröljük a fix ID-t
                      setShowPartnerSuggestions(true)
                    }}
                    onFocus={() => setShowPartnerSuggestions(true)}
                    placeholder="Pl. Nemzeti Közművek Zrt." 
                    autoComplete="off"
                    className={`text-xs sm:text-sm ${aiLoading ? "animate-pulse bg-muted" : ""}`}
                  />

                  {showPartnerSuggestions && filteredPartners.length > 0 && (
                    <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg p-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1 tracking-wider">
                        {partnerNev.trim() || partnerAdoszam.trim() ? "Találatok a partnerek között" : "Mentett partnerek"}
                      </div>
                      {filteredPartners.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPartnerId(p.id)
                            setPartnerNev(p.nev)
                            setPartnerAdoszam(p.adoszam || "")
                            setShowPartnerSuggestions(false)
                          }}
                          className="w-full flex items-center justify-between text-left px-2 py-1.5 text-xs rounded hover:bg-muted/80 transition-colors"
                        >
                          <span className="font-medium truncate">{p.nev}</span>
                          {p.adoszam && (
                            <span className="text-[10px] text-muted-foreground font-mono ml-2 shrink-0">
                              {p.adoszam}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Partner adószáma */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="partner_adoszam" className="text-xs font-medium">
                      Partner adószáma
                    </Label>
                    <span className="text-[10px] text-muted-foreground">kötőjellel vagy egybe</span>
                  </div>
                  <Input 
                    id="partner_adoszam" 
                    name="partner_adoszam" 
                    value={partnerAdoszam}
                    onChange={(e) => {
                      setPartnerAdoszam(e.target.value)
                      setPartnerId("")
                    }}
                    placeholder="Pl. 12345678-2-42" 
                    className={`text-xs sm:text-sm font-mono ${aiLoading ? "animate-pulse bg-muted" : ""}`}
                  />
                </div>
              </div>

              {/* Határidő */}
              <div className="space-y-1.5">
                <Label htmlFor="hatarido" className="text-xs font-medium">
                  Megjelölt határidő
                </Label>
                <Input 
                  id="hatarido" 
                  name="hatarido" 
                  type="date" 
                  value={hatarido}
                  onChange={(e) => setHatarido(e.target.value)}
                  className={`text-xs sm:text-sm ${aiLoading ? "animate-pulse bg-muted" : ""}`}
                />
              </div>

              {/* Iktatási Mód Kiválasztása (Tabs) */}
              <div className="pt-2 border-t">
                <Tabs defaultValue="new" value={mode} onValueChange={(v) => setMode(v as "new" | "existing")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new">Új ügyirat nyitása</TabsTrigger>
                    <TabsTrigger value="existing">Meglévőhöz csatolás</TabsTrigger>
                  </TabsList>
                  
                  {/* Új ügyirat nyitása panel */}
                  <TabsContent value="new" className="space-y-4 pt-4">
                    <input 
                      type="hidden" 
                      name="prefix" 
                      value={departments?.find((d) => d.id === departmentId)?.iktato_prefix || "NYILV"} 
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor="irattari_terv_id" className="text-xs font-medium">
                        Irattári tételszám <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        name="irattari_terv_id" 
                        required={mode === "new"} 
                        value={ugytipusId} 
                        onValueChange={(v) => setUgytipusId(v || "")}
                      >
                        <SelectTrigger id="irattari_terv_id" className={aiLoading ? "animate-pulse bg-muted" : ""}>
                          <SelectValue placeholder="Válassz tételszámot...">
                            {selectedPlan ? `${selectedPlan.tetelszam} - ${selectedPlan.megnevezes}` : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {tervek.map((t) => (
                            <SelectItem key={t.id} value={t.id} label={`${t.tetelszam} - ${t.megnevezes}`}>
                              {t.tetelszam} - {t.megnevezes}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="department_id" className="text-xs font-medium">
                        Szervezeti Egység (Osztály) <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        name="department_id" 
                        required={mode === "new"} 
                        value={departmentId} 
                        onValueChange={(v) => setDepartmentId(v || "")}
                      >
                        <SelectTrigger id="department_id" className={aiLoading ? "animate-pulse bg-muted" : ""}>
                          <SelectValue placeholder="Válassz szervezeti egységet...">
                            {selectedDept ? selectedDept.nev : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id} label={dept.nev}>
                              {dept.nev}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  {/* Meglévőhöz csatolás panel */}
                  <TabsContent value="existing" className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="existing_ugyirat_id" className="text-xs font-medium">
                        Kiválasztott ügyirat <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        name="existing_ugyirat_id" 
                        required={mode === "existing"}
                        value={existingUgyiratId}
                        onValueChange={(val) => setExistingUgyiratId(val || "")}
                      >
                        <SelectTrigger id="existing_ugyirat_id">
                          <SelectValue placeholder="Válassz egy meglévő ügyiratot...">
                            {(value) => {
                              const item = ugyiratok.find(u => u.id === value);
                              const targyStr = Array.isArray(item?.ugy) ? item?.ugy[0]?.targy : item?.ugy?.targy;
                              return item ? `${item.iktatoszam} - ${targyStr || ''}` : "Válassz egy meglévő ügyiratot...";
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {attachableUgyiratok.map((u) => {
                            const targyStr = Array.isArray(u.ugy) ? u.ugy[0]?.targy : u.ugy?.targy;
                            return (
                              <SelectItem 
                                key={u.id} 
                                value={u.id} 
                                label={`${u.iktatoszam} - ${targyStr || ''}`}
                              >
                                <span>
                                  {u.iktatoszam} - {targyStr}
                                </span>
                              </SelectItem>
                            );
                          })}
                          {attachableUgyiratok.length === 0 && (
                            <div className="p-3 text-xs text-muted-foreground text-center">
                              Nincs aktív, folyamatban lévő ügyirat, amelyhez csatolni lehetne.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Az irat a kiválasztott ügyiraton belül kapja meg a következő szabad alszámot.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </form>
          </div>

          {/* Alsó jóváhagyási és mentési sáv (1 kattintásos iktatás) */}
          <div className="border-t bg-muted/20 px-6 py-4 mt-auto sticky bottom-0 bg-background/95 backdrop-blur z-10">
            <Button 
              form="filing-form" 
              type="submit" 
              disabled={loading || aiLoading || isFiledByOther} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 font-semibold shadow-none transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Iktatás folyamatban...</span>
                </>
              ) : (
                <span>Jóváhagyás és iktatás</span>
              )}
            </Button>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

