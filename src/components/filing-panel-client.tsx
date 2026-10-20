"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { fileIncomingDocument, generateAISuggestions, clearAICacheAndRerun } from "@/app/inbox/filing-actions"
import { toast } from "sonner"
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
  AlertTriangle,
  Split,
  Mail,
  Download,
  ExternalLink,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"

import { type FilingIrat, type FilingTerv, type FilingUgyirat } from "./filing-dialog"
import { type AntecedentMatchResult } from "@/utils/antecedent-matcher"
import { DocumentPreviewFrame } from "@/components/document-preview-frame"
import { splitAttachmentToNewIncoming } from "@/app/inbox/filing-actions"
import { DossierSearchSelector } from "@/components/dossier-search-selector"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface FilingFile {
  id: string
  eredeti_fajlnev: string
  mime_type: string
  meret_byte?: number
  storage_path?: string
  kulso_fajl_url?: string
}

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
  kulfoldi_adoszam?: string | null
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

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FilingPanelClient({ 
  irat, 
  pdfUrl,
  fajlok = [],
  tervek,
  ugyiratok,
  departments,
  partners = [],
  antecedentSuggestion,
  initialMode
}: { 
  irat: FilingIrat, 
  pdfUrl: string | null,
  fajlok?: FilingFile[],
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

  // Csatolmányok kezelése (többcsatolmányos nézet és szétválasztás)
  const initialFile = useMemo(() => {
    if (!fajlok || fajlok.length === 0) return null
    const nonEmailPdf = fajlok.find(
      (f) =>
        (f.mime_type?.startsWith("application/pdf") || f.eredeti_fajlnev?.toLowerCase().endsWith(".pdf")) &&
        !f.eredeti_fajlnev?.toLowerCase().startsWith("email_torzs")
    )
    if (nonEmailPdf) return nonEmailPdf
    const anyPdf = fajlok.find(
      (f) => f.mime_type?.startsWith("application/pdf") || f.eredeti_fajlnev?.toLowerCase().endsWith(".pdf")
    )
    return anyPdf || fajlok[0]
  }, [fajlok])

  const [filesList, setFilesList] = useState<FilingFile[]>(fajlok || [])
  const [activeFileId, setActiveFileId] = useState<string>(
    initialFile?.id || (fajlok && fajlok.length > 0 ? fajlok[0].id : "")
  )
  const [splitCandidate, setSplitCandidate] = useState<FilingFile | null>(null)
  const [splitLoading, setSplitLoading] = useState(false)

  useEffect(() => {
    if (fajlok && fajlok.length > 0) {
      setFilesList(fajlok)
      if (!activeFileId || !fajlok.some((f) => f.id === activeFileId)) {
        setActiveFileId(initialFile?.id || fajlok[0].id)
      }
    }
  }, [fajlok, initialFile, activeFileId])

  const activeFile = useMemo(() => {
    return filesList.find((f) => f.id === activeFileId) || filesList[0] || null
  }, [filesList, activeFileId])

  const currentPreviewUrl = useMemo(() => {
    if (activeFile) {
      return `/api/pdf/${irat.id}?fileId=${activeFile.id}`
    }
    return pdfUrl
  }, [activeFile, irat.id, pdfUrl])

  const handleConfirmSplit = async () => {
    if (!splitCandidate) return
    setSplitLoading(true)
    try {
      const res = await splitAttachmentToNewIncoming(irat.id, splitCandidate.id)
      if (res.error) {
        toast.error("Hiba a szétválasztás során", { description: res.error })
      } else if (res.success && res.newIratId) {
        const newId = res.newIratId
        const newErkez = res.newErkeztetoszam
        toast.success("Csatolmány sikeresen szétválasztva!", {
          description: `A(z) ${res.detachedFileName} leválasztva. Új érkeztetőszám: ${newErkez}`,
          action: {
            label: "Megnyitás",
            onClick: () => router.push(`/inbox/${newId}`),
          },
        })
        const remaining = filesList.filter((f) => f.id !== splitCandidate.id)
        setFilesList(remaining)
        setSplitCandidate(null)
        if (remaining.length > 0) {
          setActiveFileId(remaining[0].id)
        }
      }
    } catch (_err) {
      toast.error("Váratlan hiba történt a csatolmány szétválasztásakor.")
    } finally {
      setSplitLoading(false)
    }
  }

  const partnerObj = irat.partner as any
  const senderName = partnerObj?.nev || "Ismeretlen feladó"
  const senderEmail = partnerObj?.email || ""

  
  // Mezők állapota
  const [targy, setTargy] = useState(irat.targy || "")
  const [dokumentumTipus, setDokumentumTipus] = useState<string>("egyeb")
  const [partnerId, setPartnerId] = useState<string>((irat.partner as any)?.id || (irat as any).kuldo_partner_id || "")
  const [partnerNev, setPartnerNev] = useState<string>((irat.partner as any)?.nev || "")
  const [partnerAdoszam, setPartnerAdoszam] = useState<string>((irat.partner as any)?.adoszam || "")
  const [partnerKulfoldiAdoszam, setPartnerKulfoldiAdoszam] = useState<string>((irat.partner as any)?.kulfoldi_adoszam || "")
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
    targy?: string | null
    indoklas?: string | null
    reszletek?: string[]
  } | null>(
    antecedentSuggestion?.ugyirat_id && (antecedentSuggestion?.confidence_score || 0) >= 45
      ? {
          ugyiratId: antecedentSuggestion.ugyirat_id,
          iktatoszam: antecedentSuggestion.iktatoszam || "",
          confidence: antecedentSuggestion.confidence_score,
          targy: antecedentSuggestion.targy,
          indoklas: antecedentSuggestion.indoklas,
          reszletek: antecedentSuggestion.reszletek
        }
      : null
  )

  const [isFiledByOther, setIsFiledByOther] = useState(false)
  const isSubmittingRef = useRef(false)

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
          // Ha éppen mi magunk iktatjuk ezt az iratot (isSubmittingRef.current),
          // akkor a Realtime esemény a saját mentésünkből fakad, ezt nem tekintjük külső ütközésnek!
          if (isSubmittingRef.current) {
            return
          }
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

  const filteredPartners = partnerNev.trim() || partnerAdoszam.trim() || partnerKulfoldiAdoszam.trim()
    ? partners.filter(p => 
        (partnerNev.trim() && p.nev.toLowerCase().includes(partnerNev.toLowerCase())) ||
        (partnerAdoszam.trim() && p.adoszam && p.adoszam.toLowerCase().includes(partnerAdoszam.toLowerCase())) ||
        (partnerKulfoldiAdoszam.trim() && p.kulfoldi_adoszam && p.kulfoldi_adoszam.toLowerCase().includes(partnerKulfoldiAdoszam.toLowerCase()))
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
      if (s.partner_id !== undefined) setPartnerId(s.partner_id)
      setPartnerAdoszam(s.partner_adoszam || "")
      setPartnerKulfoldiAdoszam(s.partner_kulfoldi_adoszam || "")
      if (s.hivatkozott_szam) setHivatkozottSzam(s.hivatkozott_szam)
      if (s.hatarido) setHatarido(s.hatarido)
      if (s.irattari_tetel_id) setUgytipusId(s.irattari_tetel_id)
      if (s.department_id) setDepartmentId(s.department_id)
      if (s.indoklas) setAiReasoning(s.indoklas)
      setAiHasRun(true) // az újraelemzés gomb mostantól látható

      if (s.elozmeny_ugyirat_id) {
        setExistingUgyiratId(s.elozmeny_ugyirat_id)
        setDetectedAntecedent({
          ugyiratId: s.elozmeny_ugyirat_id,
          iktatoszam: s.elozmeny_iktatoszam || "",
          confidence: (s as any).elozmeny_confidence || s.confidence_score || 90,
          targy: (s as any).elozmeny_targy,
          indoklas: (s as any).elozmeny_indoklas,
          reszletek: (s as any).elozmeny_reszletek
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    isSubmittingRef.current = true
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append("irat_id", irat.id)
    formData.append("mode", mode)
    formData.append("dokumentum_tipus", dokumentumTipus)
    formData.append("kuldo_partner_id", partnerId)
    formData.append("partner_nev", partnerNev)
    formData.append("partner_adoszam", partnerAdoszam)
    formData.append("partner_kulfoldi_adoszam", partnerKulfoldiAdoszam)
    formData.append("hivatkozott_szam", hivatkozottSzam)
    formData.append("hatarido", hatarido)

    if (mode === "existing") {
      if (!existingUgyiratId) {
        isSubmittingRef.current = false
        setLoading(false)
        setError("Kérjük, válassz ki egy meglévő ügyiratot a csatoláshoz!")
        toast.error("Nincs kiválasztva ügyirat a csatoláshoz!")
        return
      }
      formData.set("existing_ugyirat_id", existingUgyiratId)
    }
    
    try {
      const result = await fileIncomingDocument(formData)
      if (result?.error) {
        isSubmittingRef.current = false
        setError(result.error)
        if (result.error.includes("másik") || result.error.includes("iktatta")) {
          setIsFiledByOther(true)
        }
      } else {
        toast.success("Dokumentum sikeresen iktatva!")
        router.push("/inbox")
      }
    } catch (_err: unknown) {
      isSubmittingRef.current = false
      setError("Váratlan hiba történt az iktatás során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ResizablePanelGroup orientation="horizontal" className="h-full items-stretch">
        {/* Bal oldali dokumentum előnézet (60%) */}
        <ResizablePanel defaultSize={60} minSize={30}>
          <div className="flex h-full flex-col bg-muted/30">
            {/* Fejléc: Vissza gomb | Csatolmányok | Szétválasztás */}
            <div className="flex h-11 items-center border-b px-3 bg-background justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-x-auto">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push("/inbox")} 
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Vissza
                </Button>
                
                <div className="h-4 w-px bg-border/60 shrink-0" />

                {/* Csatolmányok listája */}
                {filesList && filesList.length > 1 ? (
                  <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto py-1">
                    {filesList.map((file) => {
                      const isActive = file.id === activeFileId
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setActiveFileId(file.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 max-w-[220px] border cursor-pointer",
                            isActive
                              ? "bg-muted/70 text-foreground border-primary/50 font-medium shadow-xs"
                              : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
                          )}
                          title={file.eredeti_fajlnev}
                        >
                          <FileText className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className="truncate">{file.eredeti_fajlnev}</span>
                          {file.meret_byte && (
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                              ({formatFileSize(file.meret_byte)})
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : filesList && filesList.length === 1 ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate min-w-0">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate font-medium text-foreground">{filesList[0]?.eredeti_fajlnev}</span>
                    {filesList[0]?.meret_byte && (
                      <span className="text-[11px] font-mono shrink-0">({formatFileSize(filesList[0]?.meret_byte)})</span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Szétválasztás gomb ha több csatolmány van */}
              {filesList && filesList.length > 1 && activeFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSplitCandidate(activeFile)}
                  className="h-7 text-xs gap-1.5 shrink-0 border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-colors cursor-pointer ml-auto"
                  title="A kiválasztott csatolmány leválasztása és új érkeztetett bejövő iratként való létrehozása"
                >
                  <Split className="h-3.5 w-3.5" />
                  <span>Szétválasztás önálló irattá</span>
                </Button>
              )}
            </div>

            {/* Fájl előnézet */}
            <div className="flex-1 overflow-hidden relative bg-muted">
              <DocumentPreviewFrame src={currentPreviewUrl} title={activeFile?.eredeti_fajlnev || "Dokumentum előnézet"} />
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

              {/* Detektált előzmény-ügyirat banner (felhasználóbarát, tömör összefoglaló) */}
              {detectedAntecedent && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 dark:bg-primary/10 p-3 space-y-1.5 text-xs animate-in fade-in transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-primary">Javasolt előzmény:</span>
                      <strong className="font-mono font-semibold text-foreground shrink-0">{detectedAntecedent.iktatoszam}</strong>
                      {detectedAntecedent.confidence && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 font-mono text-primary font-medium shrink-0">
                          {detectedAntecedent.confidence}%
                        </span>
                      )}
                    </div>
                    {mode === "new" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-6 text-[11px] px-2 font-medium shrink-0 cursor-pointer shadow-none"
                        onClick={() => {
                          setMode("existing")
                          setExistingUgyiratId(detectedAntecedent.ugyiratId)
                        }}
                      >
                        Csatolás ehhez
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-primary font-medium text-[11px] shrink-0">
                        <Check className="h-3.5 w-3.5" /> Csatolva
                      </span>
                    )}
                  </div>

                  {/* 1 rövid, tömör, felhasználóbarát magyarázat a miértről */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {detectedAntecedent.indoklas || "A beérkező irat partnere és témája megegyezik ezzel a nyitott ügyirattal, ezért alszámként érdemes csatolni."}
                  </p>
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

              {/* Partner adatok */}
              <div className="space-y-3">
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
                    placeholder="Pl. Think AI Korlátolt Felelősségű Társaság" 
                    autoComplete="off"
                    className={`text-xs sm:text-sm ${aiLoading ? "animate-pulse bg-muted" : ""}`}
                  />

                  {showPartnerSuggestions && filteredPartners.length > 0 && (
                    <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg p-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1 tracking-wider">
                        {partnerNev.trim() || partnerAdoszam.trim() || partnerKulfoldiAdoszam.trim() ? "Találatok a partnerek között" : "Mentett partnerek"}
                      </div>
                      {filteredPartners.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPartnerId(p.id)
                            setPartnerNev(p.nev)
                            setPartnerAdoszam(p.adoszam || "")
                            setPartnerKulfoldiAdoszam((p as any).kulfoldi_adoszam || "")
                            setShowPartnerSuggestions(false)
                          }}
                          className="w-full flex items-center justify-between text-left px-2 py-1.5 text-xs rounded hover:bg-muted/80 transition-colors"
                        >
                          <span className="font-medium truncate">{p.nev}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {p.adoszam && (
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                {p.adoszam}
                              </span>
                            )}
                            {(p as any).kulfoldi_adoszam && (
                              <span className="text-[10px] text-primary/80 font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                                {(p as any).kulfoldi_adoszam}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Adószámok szétválasztva (2 oszlop: Belföldi magyar adószám + Külföldi / EU adószám) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Magyar adószám */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="partner_adoszam" className="text-xs font-medium">
                        Partner adószáma
                      </Label>
                      <span className="text-[10px] text-muted-foreground">8 vagy 11 jegyű belföldi</span>
                    </div>
                    <Input 
                      id="partner_adoszam" 
                      name="partner_adoszam" 
                      value={partnerAdoszam}
                      onChange={(e) => {
                        setPartnerAdoszam(e.target.value)
                        setPartnerId("")
                      }}
                      placeholder="Pl. 32478520-2-41" 
                      className={`text-xs sm:text-sm font-mono ${aiLoading ? "animate-pulse bg-muted" : ""}`}
                    />
                  </div>

                  {/* Külföldi / EU adóazonosító */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="partner_kulfoldi_adoszam" className="text-xs font-medium">
                        Külföldi / EU adóazonosító
                      </Label>
                      <span className="text-[10px] text-muted-foreground">EU VAT vagy PIB/TIN</span>
                    </div>
                    <Input 
                      id="partner_kulfoldi_adoszam" 
                      name="partner_kulfoldi_adoszam" 
                      value={partnerKulfoldiAdoszam}
                      onChange={(e) => {
                        setPartnerKulfoldiAdoszam(e.target.value)
                        setPartnerId("")
                      }}
                      placeholder="Pl. HU32478520, DE123456789" 
                      className={`text-xs sm:text-sm font-mono ${aiLoading ? "animate-pulse bg-muted" : ""}`}
                    />
                  </div>
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
                      <Label htmlFor="existing_ugyirat_id" className="text-xs font-medium flex items-center justify-between">
                        <span>Kiválasztott ügyirat <span className="text-destructive">*</span></span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {attachableUgyiratok.length} nyitott ügyirat elérhető
                        </span>
                      </Label>

                      <DossierSearchSelector
                        ugyiratok={attachableUgyiratok}
                        value={existingUgyiratId}
                        onChange={(val) => setExistingUgyiratId(val)}
                        currentPartnerName={partnerNev}
                        currentDocSubject={targy}
                        currentReferenceNum={hivatkozottSzam}
                      />
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

    {/* Csatolmány szétválasztási megerősítő modál */}
    <Dialog open={!!splitCandidate} onOpenChange={(open) => !open && !splitLoading && setSplitCandidate(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Split className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Csatolmány szétválasztása önálló irattá</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Leválasztás új beérkezett iratként, saját érkeztetőszámmal
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <p className="text-xs text-foreground/90 leading-relaxed">
            Biztosan leválasztja a(z) <strong className="font-semibold text-foreground">{splitCandidate?.eredeti_fajlnev}</strong> mellékletet erről a beérkezett iratról?
          </p>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Jelenlegi irat száma:</span>
              <span className="font-mono font-medium text-foreground">{irat.erkeztetoszam}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Fájlméret:</span>
              <span className="font-mono">{formatFileSize(splitCandidate?.meret_byte)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Küldő partner:</span>
              <span className="text-foreground">{senderName}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A művelet során a kiválasztott fájl egy <strong>új érkeztetőszámot</strong> kap, bekerül a bejövő feladatsorba, és automatikusan elindul rá a háttérbeli AI feldolgozás. A jelenlegi irat többi csatolmánya változatlanul megmarad.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={splitLoading}
            onClick={() => setSplitCandidate(null)}
          >
            Mégse
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={splitLoading}
            onClick={handleConfirmSplit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
          >
            {splitLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Leválasztás folyamatban...</span>
              </>
            ) : (
              <>
                <Split className="h-3.5 w-3.5" />
                <span>Szétválasztás és új irat generálása</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}

