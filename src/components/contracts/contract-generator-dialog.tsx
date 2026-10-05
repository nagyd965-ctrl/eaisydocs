"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FileSignature,
  Sparkles,
  Loader2,
  FileCheck,
  Send,
  Building2,
  Calendar,
  CreditCard,
  Clock,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  Plus,
  PlusCircle,
  Info,
  Eye,
  Download,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ContractParty,
  ContractTemplate,
  ContractType,
  ContractDraftResult,
} from "@/types/contract-templates"
import {
  DEFAULT_CONTRACT_TEMPLATES,
  DEFAULT_MEGBIZO_COMPANY,
  extractAmountFromPrompt,
} from "@/utils/contract-templates"
import {
  getContractGeneratorContextAction,
  generateContractDraftAction,
  finalizeAndFileContractAction,
  deleteContractTemplateAction,
  createCustomContractTemplateAction,
  generateContractPdfPreviewAction,
} from "@/app/partners/contract-actions"
import { DocumentPreviewFrame } from "@/components/document-preview-frame"
import Link from "next/link"

interface ContractGeneratorDialogProps {
  partner: {
    id: string
    nev: string
    adoszam?: string | null
    kulfoldi_adoszam?: string | null
    cegjegyzekszam?: string | null
    szekhely_iranyitoszam?: string | null
    szekhely_varos?: string | null
    szekhely_utca?: string | null
    email?: string | null
    telefonszam?: string | null
  }
  triggerLabel?: string
  iconOnly?: boolean
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ContractGeneratorDialog({
  partner,
  triggerLabel = "Új szerződés generálása",
  iconOnly = false,
  variant = "outline",
  size = "sm",
  className,
}: ContractGeneratorDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"template" | "preview" | "filing">("template")

  // Sablon nézet: lista és választás ("select") vagy inline új sablon létrehozása ("create")
  const [templateViewMode, setTemplateViewMode] = useState<"select" | "create">("select")

  // Új egyedi sablon űrlap állapotok
  const [newTmplName, setNewTmplName] = useState("")
  const [newTmplCategory, setNewTmplCategory] = useState("Szolgáltatás & Megbízás")
  const [newTmplDefaultTitle, setNewTmplDefaultTitle] = useState("")
  const [newTmplDescription, setNewTmplDescription] = useState("")
  const [newTmplPromptPlaceholder, setNewTmplPromptPlaceholder] = useState("")
  const [newTmplExamplePrompt1, setNewTmplExamplePrompt1] = useState("")
  const [newTmplExamplePrompt2, setNewTmplExamplePrompt2] = useState("")
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  // Kontextus és törzsadat állapotok
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [templates, setTemplates] = useState<ContractTemplate[]>(DEFAULT_CONTRACT_TEMPLATES)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("megbizasi-standard")
  const [megbizo, setMegbizo] = useState<ContractParty>(DEFAULT_MEGBIZO_COMPANY)
  const [megbizott, setMegbizott] = useState<ContractParty>({
    nev: partner.nev,
    szekhely: [partner.szekhely_iranyitoszam, partner.szekhely_varos, partner.szekhely_utca].filter(Boolean).join(" ") || "1117 Budapest",
    adoszam: partner.adoszam || partner.kulfoldi_adoszam,
    cegjegyzekszam: partner.cegjegyzekszam,
    email: partner.email,
    telefonszam: partner.telefonszam,
  })
  const [availableDossiers, setAvailableDossiers] = useState<
    { id: string; iktatoszam: string; targy: string; statusz: string }[]
  >([])

  // Egyedi sablon mentése inline
  const handleSaveCustomTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!newTmplName.trim()) {
      toast.error("A sablon megnevezése kötelező!")
      return
    }

    setIsSavingTemplate(true)
    try {
      const examplePrompts = [newTmplExamplePrompt1.trim(), newTmplExamplePrompt2.trim()].filter(Boolean)

      const res = await createCustomContractTemplateAction({
        name: newTmplName.trim(),
        category: newTmplCategory.trim(),
        defaultTitle: newTmplDefaultTitle.trim() || newTmplName.trim(),
        description: newTmplDescription.trim(),
        promptPlaceholder: newTmplPromptPlaceholder.trim() || `pl. Rögzítsd a(z) ${newTmplName.trim()} speciális feltételeit...`,
        examplePrompts: examplePrompts.length > 0 ? examplePrompts : undefined,
      })

      if (res.success && res.template) {
        toast.success(`A(z) "${res.template.name}" sablon sikeresen elmentve!`)
        setTemplates((prev) => [res.template!, ...prev])
        handleSelectTemplate(res.template.id)
        setTemplateViewMode("select")

        // Mezők resetelése
        setNewTmplName("")
        setNewTmplDefaultTitle("")
        setNewTmplDescription("")
        setNewTmplPromptPlaceholder("")
        setNewTmplExamplePrompt1("")
        setNewTmplExamplePrompt2("")
      } else {
        toast.error(res.error || "Hiba történt a sablon mentésekor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt a sablon mentése során.")
    } finally {
      setIsSavingTemplate(false)
    }
  }

  // Sablon törlés megerősítés (Kanonikus AlertDialog állapot)
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null)
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false)

  // Egyedi sablon végleges törlése megerősítés után
  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete) return
    setIsDeletingTemplate(true)
    try {
      const res = await deleteContractTemplateAction(templateToDelete.id)
      if (res.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id))
        if (selectedTemplateId === templateToDelete.id) {
          const remaining = templates.filter((t) => t.id !== templateToDelete.id)
          const fallback = remaining[0] || DEFAULT_CONTRACT_TEMPLATES[0]
          handleSelectTemplate(fallback.id)
        }
        toast.success(`A(z) "${templateToDelete.name}" sablon sikeresen törölve.`)
        setTemplateToDelete(null)
      } else {
        toast.error(res.error || "Hiba a sablon törlésekor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt a törlés során.")
    } finally {
      setIsDeletingTemplate(false)
    }
  }

  // Űrlap állapotok
  const [title, setTitle] = useState("Megbízási Szerződés")
  const [customPrompt, setCustomPrompt] = useState(() => {
    return DEFAULT_CONTRACT_TEMPLATES[0]?.examplePrompts?.[0] || ""
  })
  const [effectiveDate, setEffectiveDate] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [validityMonths, setValidityMonths] = useState<number | undefined>(12)
  const [feeAmount, setFeeAmount] = useState<number | undefined>(undefined)
  const [currency, setCurrency] = useState("HUF")

  // Kétirányú szinkronizáció: ha a felhasználó kitölti az összeg mezőt, szinkronizáljuk a promptban szereplő összeget is
  const handleFeeAmountChange = (val: number | undefined) => {
    setFeeAmount(val)
    if (val !== undefined && val > 0) {
      const formatted = val.toLocaleString("hu-HU") + " Ft"
      setCustomPrompt((prev) => {
        const match = prev.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{4,9})\s*(?:,-\s*)?(?:ft|huf|forint)/i)
        if (match) {
          return prev.replace(match[0], formatted)
        }
        return prev
      })
    }
  }

  // Ha a felhasználó a promptban módosít összeget, és a fenti mezőben már van érték, tartsuk szinkronban
  const handleCustomPromptChange = (text: string) => {
    setCustomPrompt(text)
    if (feeAmount !== undefined) {
      const extracted = extractAmountFromPrompt(text)
      if (extracted !== undefined && extracted !== feeAmount) {
        setFeeAmount(extracted)
      }
    }
  }

  // Generált tervezet állapotok
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [draft, setDraft] = useState<ContractDraftResult | null>(null)
  const [editedText, setEditedText] = useState("")

  // PDF előnézet állapotok (élő A4-es PDF renderelés a szövegből)
  const [pdfPreviewDataUri, setPdfPreviewDataUri] = useState<string | null>(null)
  const [isGeneratingPdfPreview, setIsGeneratingPdfPreview] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)

  const handleFetchPdfPreview = async (): Promise<string | null> => {
    setIsGeneratingPdfPreview(true)
    try {
      const res = await generateContractPdfPreviewAction({
        title,
        content: editedText,
        effectiveDate,
        megbizo,
        megbizott,
      })

      if (res.success && res.pdfDataUri) {
        setPdfPreviewDataUri(res.pdfDataUri)
        return res.pdfDataUri
      } else {
        toast.error(res.error || "Nem sikerült a PDF előnézet létrehozása.")
        return null
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba a PDF előnézet készítésekor.")
      return null
    } finally {
      setIsGeneratingPdfPreview(false)
    }
  }

  const handleOpenPdfModal = async () => {
    const uri = await handleFetchPdfPreview()
    if (uri) {
      setIsPdfModalOpen(true)
    }
  }

  // Iktatás és expedíció állapotok
  const [dossierMode, setDossierMode] = useState<"new" | "existing">("new")
  const [selectedDossierId, setSelectedDossierId] = useState<string>("")
  const [newDossierTitle, setNewDossierTitle] = useState("")
  const [sendEmail, setSendEmail] = useState(false)
  const [partnerEmail, setPartnerEmail] = useState(partner.email || "")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [finalizedResult, setFinalizedResult] = useState<{
    iratId: string
    ugyiratId: string
    iktatoszam: string
    emailed?: boolean
  } | null>(null)

  // Aktuális sablon objektum
  const currentTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0]

  // Kontextus betöltése megnyitáskor
  useEffect(() => {
    if (!open) {
      // Reset állás
      setFinalizedResult(null)
      setTemplateViewMode("select")
      setActiveTab("template")
      setDraft(null)
      setEditedText("")
      setIsAiGenerated(false)
      setFeeAmount(undefined)
      setPdfPreviewDataUri(null)
      setIsPdfModalOpen(false)
      return
    }

    async function loadContext() {
      setIsLoadingContext(true)
      try {
        const res = await getContractGeneratorContextAction(partner.id)
        if (res.success && res.partner) {
          if (res.templates && res.templates.length > 0) {
            setTemplates(res.templates)
          }
          if (res.megbizo) setMegbizo(res.megbizo)
          if (res.dossiers) {
            setAvailableDossiers(res.dossiers)
            if (res.dossiers.length > 0) {
              setSelectedDossierId(res.dossiers[0].id)
            }
          }
          if (res.partner.email) {
            setPartnerEmail(res.partner.email)
          }

          const primaryContact = res.partner.kapcsolattartok?.find((c: any) => c.elsodleges) || res.partner.kapcsolattartok?.[0]
          const szekhelyStr = [
            res.partner.szekhely_iranyitoszam,
            res.partner.szekhely_varos,
            res.partner.szekhely_utca,
          ].filter(Boolean).join(" ")

          setMegbizott({
            nev: res.partner.nev,
            szekhely: szekhelyStr || "–",
            adoszam: res.partner.adoszam || res.partner.kulfoldi_adoszam,
            cegjegyzekszam: res.partner.cegjegyzekszam,
            kepviselo: primaryContact ? `${primaryContact.nev} (${primaryContact.beosztas || "képviselő"})` : null,
            email: res.partner.email || primaryContact?.email,
            telefonszam: res.partner.telefonszam || primaryContact?.telefonszam,
          })
        }
      } catch (err) {
        console.error("Hiba a kontextus betöltésekor:", err)
      } finally {
        setIsLoadingContext(false)
      }
    }

    loadContext()
  }, [open, partner.id])

  // Sablon váltáskor frissítjük a címet, promptot és releváns paramétereket
  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId)
    const tmpl = templates.find((t) => t.id === tmplId)
    if (tmpl) {
      setTitle(tmpl.defaultTitle)
      // Mindig átváltjuk a promptot a kiválasztott sablon első mintájára
      setCustomPrompt(tmpl.examplePrompts?.[0] || "")

      // Alapértelmezetten az összeg/kötbér mező üres marad, a felhasználó töltheti ki
      setFeeAmount(undefined)

      if (tmpl.type === "nda") {
        setValidityMonths(36)
      } else if (tmpl.type === "megbizasi") {
        setValidityMonths(12)
      } else if (tmpl.type === "keretszerzodes") {
        setValidityMonths(12)
      } else if (tmpl.type === "teljesites_igazolas") {
        setValidityMonths(undefined)
      } else {
        setValidityMonths(12)
      }
    }
  }

  // AI Tervezet generálása
  const handleGenerateDraft = async () => {
    setIsGenerating(true)
    try {
      const res = await generateContractDraftAction({
        partnerId: partner.id,
        contractType: currentTemplate.type,
        templateId: currentTemplate.id,
        customPrompt,
        title,
        effectiveDate,
        validityMonths,
        feeAmount,
        currency,
      })

      if (res.success && res.draft) {
        setDraft(res.draft)
        setEditedText(res.draft.fullText)
        setIsAiGenerated(!!res.isAiGenerated)
        setActiveTab("preview")

        setNewDossierTitle(`Szerződés: ${res.draft.title} — ${partner.nev}`)
        setEmailSubject(`Szerződés tervezet: ${res.draft.title} (${partner.nev})`)
        setEmailMessage(
          `Tisztelt Partnerünk!\n\nMellékelten továbbítjuk a(z) ${res.draft.title} megállapodás tervezetét.\nKérjük, szíveskedjenek áttekinteni.\n\nÜdvözlettel,\n${megbizo.nev}`
        )

        if (res.isAiGenerated) {
          toast.success("AI szerződéstervezet sikeresen elkészült!")
        } else {
          toast.info("Szabványos mintatervezet elkészült (determinisztikus motorral).")
        }
      } else {
        toast.error(res.error || "Hiba történt a tervezet előállításakor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt a generálás során.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Szerződés véglegesítése és iktatása
  const handleFinalizeAndFile = async () => {
    if (!editedText.trim()) {
      toast.error("A szerződés szövege nem lehet üres!")
      return
    }

    setIsFinalizing(true)
    try {
      const res = await finalizeAndFileContractAction({
        partnerId: partner.id,
        title: title.trim() || currentTemplate.defaultTitle,
        contractType: currentTemplate.type,
        content: editedText,
        dossierId: dossierMode === "existing" ? selectedDossierId : null,
        createNewDossier: dossierMode === "new",
        dossierTitle: newDossierTitle,
        sendEmailToPartner: sendEmail,
        partnerEmail: sendEmail ? partnerEmail : undefined,
        emailSubject: sendEmail ? emailSubject : undefined,
        emailMessage: sendEmail ? emailMessage : undefined,
        megbizo,
        megbizott,
      })

      if (res.success && res.iratId && res.ugyiratId && res.iktatoszam) {
        setFinalizedResult({
          iratId: res.iratId,
          ugyiratId: res.ugyiratId,
          iktatoszam: res.iktatoszam,
          emailed: res.emailed,
        })
        toast.success(`Szerződés sikeresen iktatva! Iktatószám: ${res.iktatoszam}`)
      } else {
        toast.error(res.error || "Hiba történt a szerződés iktatásakor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt a véglegesítés során.")
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant, size }),
          "gap-1.5 font-medium border-border/80 hover:border-primary/50 transition-colors cursor-pointer",
          className
        )}
        title="Új üzleti szerződés vagy megállapodás generálása AI prompt alapján"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {!iconOnly && <span>{triggerLabel}</span>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl w-[96vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border">
        {/* ── Dialog Fejléc */}
        <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <FileSignature className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Üzleti Szerződés- és Megállapodásgenerátor
                </DialogTitle>
                <Badge variant="outline" className="text-[11px] font-normal gap-1 border-primary/30 text-primary">
                  <Sparkles className="h-3 w-3" />
                  AI Prompt
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Szerződő partner: <span className="font-medium text-foreground">{partner.nev}</span>
                {partner.adoszam && <span className="ml-2 font-mono text-[11px]">({partner.adoszam})</span>}
              </DialogDescription>
            </div>
          </div>

          {/* Fülek */}
          <Tabs
            value={activeTab}
            onValueChange={(val: any) => {
              if (templateViewMode === "create") {
                setTemplateViewMode("select")
              }
              setActiveTab(val)
            }}
            className="w-full mt-4"
          >
            <TabsList className="grid grid-cols-3 h-9 w-full bg-muted/40 p-0.5 border border-border/60">
              <TabsTrigger value="template" className="text-xs data-[state=active]:bg-background">
                1. Sablon & Prompt {templateViewMode === "create" && " (Új sablon)"}
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                disabled={!draft || templateViewMode === "create"}
                className="text-xs data-[state=active]:bg-background"
              >
                2. Tervezet Előnézet {draft && "✓"}
              </TabsTrigger>
              <TabsTrigger
                value="filing"
                disabled={!draft || templateViewMode === "create"}
                className="text-xs data-[state=active]:bg-background"
              >
                3. Iktatás & Expedíció
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        {/* ── Dialog Tartalom (Görgethető közép) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoadingContext ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Partner és vállalati adatok betöltése...</p>
            </div>
          ) : finalizedResult ? (
            /* ── SIKERES IKTATÁS EREDMÉNY KÁRTYA ── */
            <div className="py-8 px-6 text-center space-y-5 max-w-lg mx-auto">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold text-foreground">Szerződés Sikeresen Iktatva!</h3>
                <p className="text-xs text-muted-foreground">
                  A szerződés A4 formátumú PDF példánya elkészült, SHA-256 hash ellenőrzéssel hitelesítve és elhelyezve a rendszerben.
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Iktatószám:</span>
                  <span className="font-mono font-semibold text-primary">{finalizedResult.iktatoszam}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Szerződés címe:</span>
                  <span className="font-medium text-foreground">{title}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Partner:</span>
                  <span className="font-medium text-foreground">{partner.nev}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Expedíció / E-mail:</span>
                  <span className={cn("font-medium", finalizedResult.emailed ? "text-emerald-500" : "text-muted-foreground")}>
                    {finalizedResult.emailed ? "Azonnal elküldve a partnernek ✓" : "Nem lett elküldve"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href={`/dossiers/${finalizedResult.ugyiratId}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ügyirat megnyitása
                </Link>
                <Button
                  onClick={() => setOpen(false)}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Bezárás
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ────────────────────────────────────────────────────────── */}
              {/* 1. LÉPÉS: SABLON & PROMPT */}
              {/* ────────────────────────────────────────────────────────── */}
              {/* ────────────────────────────────────────────────────────── */}
              {/* 1. LÉPÉS: SABLON & PROMPT */}
              {/* ────────────────────────────────────────────────────────── */}
              {activeTab === "template" && (
                templateViewMode === "create" ? (
                  /* ── INLINE EGYEDI SABLON LÉTREHOZÓ NÉZET ── */
                  <div className="space-y-5 animate-in fade-in-50 duration-200">
                    {/* Al-fejléc visszalépéssel */}
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setTemplateViewMode("select")}
                          className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          Vissza a sablonokhoz
                        </Button>
                        <div className="h-4 w-px bg-border/70" />
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-foreground tracking-tight">
                            Új Egyedi Szerződéssablon Létrehozása
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-normal border-primary/30 text-primary">
                        Vállalati sablontárba mentődik
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Bal oszlop: Sablon alapadatok */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            1. Sablon alapadatai
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Határozd meg a szerződés típusát, hivatalos elnevezését és kategóriáját.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="tmpl-name" className="text-xs font-medium">
                              Sablon megnevezése *
                            </Label>
                            <Input
                              id="tmpl-name"
                              value={newTmplName}
                              onChange={(e) => {
                                setNewTmplName(e.target.value)
                                if (!newTmplDefaultTitle) setNewTmplDefaultTitle(e.target.value)
                              }}
                              placeholder="pl. Bérleti Szerződés"
                              className="text-xs h-9"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="tmpl-cat" className="text-xs font-medium">
                              Kategória
                            </Label>
                            <Select value={newTmplCategory} onValueChange={(val) => val && setNewTmplCategory(val)}>
                              <SelectTrigger id="tmpl-cat" className="text-xs h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Szolgáltatás & Megbízás">Szolgáltatás & Megbízás</SelectItem>
                                <SelectItem value="Ingatlan & Bérlet">Ingatlan & Bérlet</SelectItem>
                                <SelectItem value="Kereskedelem & Értékesítés">Kereskedelem & Értékesítés</SelectItem>
                                <SelectItem value="Jogi & Védelem">Jogi & Védelem</SelectItem>
                                <SelectItem value="Munkaügy & Megbízás">Munkaügy & Megbízás</SelectItem>
                                <SelectItem value="Egyedi Szerződések">Egyedi Szerződések</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="tmpl-title" className="text-xs font-medium">
                              Alapértelmezett hivatalos szerződéscím
                            </Label>
                            <Input
                              id="tmpl-title"
                              value={newTmplDefaultTitle}
                              onChange={(e) => setNewTmplDefaultTitle(e.target.value)}
                              placeholder="pl. Helyiségbérleti Szerződés"
                              className="text-xs h-9"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Ez a cím jelenik meg a generált PDF dokumentum és a célügyirat fejléceként.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="tmpl-desc" className="text-xs font-medium">
                              Rövid leírás (a sablonkártyán jelenik meg)
                            </Label>
                            <Input
                              id="tmpl-desc"
                              value={newTmplDescription}
                              onChange={(e) => setNewTmplDescription(e.target.value)}
                              placeholder="pl. Irodahelyiség és raktár bérbeadására, óvadék és rezsi elszámolással."
                              className="text-xs h-9"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Jobb oszlop: AI Prompt és minták */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            2. AI Promptolás és minta utasítások
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Segítség a felhasználóknak: útmutató szöveg és egykattintásos gyorsminták.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="tmpl-placeholder" className="text-xs font-medium">
                              Prompt helyőrző szöveg (tipp a prompt mezőben)
                            </Label>
                            <Textarea
                              id="tmpl-placeholder"
                              rows={2}
                              value={newTmplPromptPlaceholder}
                              onChange={(e) => setNewTmplPromptPlaceholder(e.target.value)}
                              placeholder="pl. Szakmai feladatok ellátása heti 20 órában, 15 napos átutalási határidővel..."
                              className="text-xs resize-none"
                            />
                          </div>

                          <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Kattintható mintapromptok (gyors kitöltéshez)
                            </Label>
                            <div className="space-y-2">
                              <Input
                                value={newTmplExamplePrompt1}
                                onChange={(e) => setNewTmplExamplePrompt1(e.target.value)}
                                placeholder="1. Minta: pl. Fejlesztési és karbantartási feladatok sprint átadásokkal..."
                                className="text-xs h-8 bg-background"
                              />
                              <Input
                                value={newTmplExamplePrompt2}
                                onChange={(e) => setNewTmplExamplePrompt2(e.target.value)}
                                placeholder="2. Minta: pl. Üzemeltetési feladatok 4 órás kritikus hibajavítási SLA-val..."
                                className="text-xs h-8 bg-background"
                              />
                            </div>
                          </div>

                          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1 text-muted-foreground">
                            <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
                              <Info className="h-3.5 w-3.5 text-primary" />
                              Azonnali sablonaktiválás
                            </div>
                            <p className="text-[10px] leading-relaxed">
                              Mentés után a sablon azonnal bekerül a vállalati sablontárba, automatikusan kijelölésre kerül, és azonnal generálhatod vele a tervezetet.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── NORMÁL SABLONVÁLASZTÓ ÉS PROMPT NÉZET ── */
                  <div className="space-y-6">
                    {/* Sablonválasztó kártyák */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Válassz szerződéstípust
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTemplateViewMode("create")}
                          className="h-7 text-xs gap-1.5 border-border/80 hover:border-primary/40 hover:text-primary transition-colors font-medium"
                        >
                          <Plus className="h-3.5 w-3.5 text-primary" />
                          Új szerződéssablon
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {templates.map((tmpl) => {
                          const isSelected = tmpl.id === selectedTemplateId
                          return (
                            <div
                              key={tmpl.id}
                              onClick={() => handleSelectTemplate(tmpl.id)}
                              className={cn(
                                "cursor-pointer text-left p-3.5 rounded-lg border transition-all relative flex flex-col justify-between gap-2 group",
                                isSelected
                                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                                  : "border-border/60 hover:border-primary/40 bg-card text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-foreground tracking-tight">
                                    {tmpl.name}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {tmpl.isCustom && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setTemplateToDelete(tmpl)
                                        }}
                                        className="opacity-60 hover:opacity-100 p-1 hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                                        title="Egyedi sablon törlése"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                    {isSelected && (
                                      <Badge className="h-4 px-1.5 text-[9px] bg-primary text-primary-foreground font-mono">
                                        Aktív
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[11px] leading-relaxed line-clamp-2">
                                  {tmpl.description}
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                  {tmpl.category}
                                </span>
                                {tmpl.isCustom && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
                                    Egyedi
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Szerződés címe & Hatály */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="contract-title" className="text-xs font-medium">
                          Szerződés pontos címe
                        </Label>
                        <Input
                          id="contract-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="pl. Megbízási Szerződés"
                          className="text-xs h-9"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="effective-date" className="text-xs font-medium">
                            Kelt / Hatálybalépés
                          </Label>
                          <Input
                            id="effective-date"
                            type="date"
                            value={effectiveDate}
                            onChange={(e) => setEffectiveDate(e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="validity-months" className="text-xs font-medium">
                            Időtartam (hónap)
                          </Label>
                          <Input
                            id="validity-months"
                            type="number"
                            min="1"
                            placeholder="pl. 12"
                            value={validityMonths || ""}
                            onChange={(e) => setValidityMonths(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="text-xs h-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pénzügyi díjazás opciók */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg border border-border/60 bg-muted/15">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label htmlFor="fee-amount" className="text-xs font-medium flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-primary" />
                          {currentTemplate.type === "nda"
                            ? "Kötbér összege (opcionális)"
                            : currentTemplate.type === "teljesites_igazolas"
                            ? "Igazolt összeg (nettó)"
                            : "Megbízási díj / Keretösszeg (nettó)"}
                        </Label>
                        <Input
                          id="fee-amount"
                          type="number"
                          placeholder={currentTemplate.type === "nda" ? "pl. 1000000" : "pl. 650000"}
                          value={feeAmount !== undefined ? feeAmount : ""}
                          onChange={(e) => handleFeeAmountChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          className="text-xs h-9 font-mono tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="currency" className="text-xs font-medium">
                          Pénznem
                        </Label>
                        <Select value={currency} onValueChange={(val) => val && setCurrency(val)}>
                          <SelectTrigger id="currency" className="text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HUF">HUF (Ft)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Természetes nyelvű AI Prompt */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="custom-prompt" className="text-xs font-semibold flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Természetes nyelvű instrukciók az AI számára
                        </Label>
                        <span className="text-[11px] text-muted-foreground">
                          Feladatok, SLA, kötbér (az összeg és időtartam a fenti mezőkből jön)
                        </span>
                      </div>

                      <Textarea
                        id="custom-prompt"
                        rows={4}
                        value={customPrompt}
                        onChange={(e) => handleCustomPromptChange(e.target.value)}
                        placeholder={currentTemplate.promptPlaceholder}
                        className="text-xs leading-relaxed font-sans resize-none"
                      />

                      {/* Mintaprompt javaslatok (chipek) */}
                      {currentTemplate.examplePrompts && currentTemplate.examplePrompts.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Kattints egy mintára a gyors kitöltéshez:
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {currentTemplate.examplePrompts.map((example, i) => {
                              const isChipActive = customPrompt.trim() === example.trim()
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setCustomPrompt(example)}
                                  className={cn(
                                    "text-left text-[11px] p-2 rounded border transition-colors leading-normal",
                                    isChipActive
                                      ? "border-primary/60 bg-primary/10 text-foreground font-medium ring-1 ring-primary/20"
                                      : "border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  💡 &quot;{example}&quot;
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* 2. LÉPÉS: ELŐNÉZET ÉS SZERKESZTÉS */}
              {/* ────────────────────────────────────────────────────────── */}
              {activeTab === "preview" && draft && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Szerződéstervezet áttekintése
                        </h4>
                        {isAiGenerated ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                            Gemini 2.5 Flash generálta
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Szabványos mintamotor
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Becsült terjedelem: ~{draft.estimatedPages} A4 oldal | {draft.sections.length} számozott fejezet
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenPdfModal}
                        disabled={isGeneratingPdfPreview || isGenerating}
                        className="text-xs gap-1.5 h-8 border-border hover:border-primary/50 text-foreground hover:text-primary transition-colors cursor-pointer font-medium"
                        title="Elkészülő A4-es formázott PDF szerződés megtekintése"
                      >
                        {isGeneratingPdfPreview ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span>PDF Előnézet</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateDraft()}
                        disabled={isGenerating}
                        className="text-xs gap-1 h-8 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Újragenerálás
                      </Button>
                    </div>
                  </div>

                  {/* Felek kártya az átláthatóságért */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Megbízó:</span>
                      <p className="font-semibold text-foreground">{draft.megbizo.nev}</p>
                      <p className="text-muted-foreground text-[11px]">{draft.megbizo.szekhely}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">Adószám: {draft.megbizo.adoszam || "–"}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Megbízott (Partner):</span>
                      <p className="font-semibold text-foreground">{draft.megbizott.nev}</p>
                      <p className="text-muted-foreground text-[11px]">{draft.megbizott.szekhely}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">Adószám: {draft.megbizott.adoszam || "–"}</p>
                    </div>
                  </div>

                  {/* Szerkeszthető szövegmező */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contract-body" className="text-xs font-medium">
                        Szerződés végleges szövege (közvetlenül szerkeszthető a véglegesítés előtt)
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        A fejezetek számozása (pl. &quot;1. CÍM&quot;) határozza meg a PDF bekezdéseit
                      </span>
                    </div>
                    <Textarea
                      id="contract-body"
                      rows={14}
                      value={editedText}
                      onChange={(e) => {
                        setEditedText(e.target.value)
                        setPdfPreviewDataUri(null)
                      }}
                      className="font-mono text-xs leading-relaxed resize-y min-h-[300px]"
                    />
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* 3. LÉPÉS: IKTATÁS & EXPEDÍCIÓ */}
              {/* ────────────────────────────────────────────────────────── */}
              {activeTab === "filing" && draft && (
                <div className="space-y-5">
                  {/* Ügyirat kezelés */}
                  <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Iktatási Célügyirat Kiválasztása
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Minden kimenő szerződés az eaisyDocs iratkezelési szabályai szerint automatikusan iktatásra kerül.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDossierMode("new")}
                        className={cn(
                          "p-3 rounded-lg border text-left text-xs transition-colors space-y-1",
                          dossierMode === "new"
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border/60 hover:border-primary/40 text-muted-foreground"
                        )}
                      >
                        <div className="font-semibold text-foreground">Új ügyirat nyitása</div>
                        <p className="text-[11px] leading-relaxed">
                          Új dedikált ügyirat nyílik a partner nevével és a szerződés címével.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDossierMode("existing")}
                        className={cn(
                          "p-3 rounded-lg border text-left text-xs transition-colors space-y-1",
                          dossierMode === "existing"
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border/60 hover:border-primary/40 text-muted-foreground"
                        )}
                      >
                        <div className="font-semibold text-foreground">Meglévő ügyirathoz csatolás</div>
                        <p className="text-[11px] leading-relaxed">
                          A szerződés alszámként kerül iktatásra egy már folyamatban lévő ügyiratba.
                        </p>
                      </button>
                    </div>

                    {dossierMode === "new" ? (
                      <div className="space-y-1.5 pt-2">
                        <Label htmlFor="dossier-title" className="text-xs font-medium">
                          Új ügyirat tárgya
                        </Label>
                        <Input
                          id="dossier-title"
                          value={newDossierTitle}
                          onChange={(e) => setNewDossierTitle(e.target.value)}
                          placeholder="pl. Szerződés: Megbízási Szerződés — Partner Kft."
                          className="text-xs h-9"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-2">
                        <Label htmlFor="select-dossier" className="text-xs font-medium">
                          Válassz aktív ügyiratot
                        </Label>
                        {availableDossiers.length > 0 ? (
                          <Select
                            value={selectedDossierId}
                            onValueChange={(val) => val && setSelectedDossierId(val)}
                          >
                            <SelectTrigger id="select-dossier" className="text-xs h-9">
                              <SelectValue placeholder="Válassz ügyiratot..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDossiers.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  <span className="font-mono font-medium">{d.iktatoszam}</span> — {d.targy}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Nincs kiválasztható aktív ügyirat. Javasolt új ügyirat nyitása!
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expedíció (Azonnali e-mail kiküldés) */}
                  <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Send className="h-3.5 w-3.5 text-primary" />
                          <Label htmlFor="send-email" className="text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer">
                            Azonnali kiküldés a partnernek (Expedíció)
                          </Label>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          A generált és iktatott PDF automatikusan csatolásra kerül az elküldött e-mailhez.
                        </p>
                      </div>
                      <Switch
                        id="send-email"
                        checked={sendEmail}
                        onCheckedChange={setSendEmail}
                      />
                    </div>

                    {sendEmail && (
                      <div className="space-y-3 pt-2 border-t border-border/40">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="partner-email" className="text-xs font-medium">
                              Címzett e-mail címe
                            </Label>
                            <Input
                              id="partner-email"
                              type="email"
                              value={partnerEmail}
                              onChange={(e) => setPartnerEmail(e.target.value)}
                              placeholder="partner@ceg.hu"
                              className="text-xs h-9 font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="email-subject" className="text-xs font-medium">
                              E-mail tárgya
                            </Label>
                            <Input
                              id="email-subject"
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              className="text-xs h-9"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="email-message" className="text-xs font-medium">
                            Kísérőlevél szövege
                          </Label>
                          <Textarea
                            id="email-message"
                            rows={3}
                            value={emailMessage}
                            onChange={(e) => setEmailMessage(e.target.value)}
                            className="text-xs leading-relaxed resize-none font-sans"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Dialog Lábléc (Műveleti gombok) */}
        {!finalizedResult && (
          <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3">
            {activeTab === "template" && templateViewMode === "create" ? (
              <div className="flex items-center justify-between w-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTemplateViewMode("select")}
                  disabled={isSavingTemplate}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Mégse (Vissza a sablonokhoz)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveCustomTemplate()}
                  disabled={isSavingTemplate || !newTmplName.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5"
                >
                  {isSavingTemplate ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sablon mentése...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-3.5 w-3.5" />
                      Sablon Mentése és Azonnali Kiválasztása
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isGenerating || isFinalizing}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Mégse
                </Button>

                <div className="flex items-center gap-2">
                  {activeTab === "template" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGenerateDraft}
                      disabled={isGenerating || !title.trim()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 font-medium"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          AI Szerződés készítése folyamatban...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          AI Szerződéstervezet generálása
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </>
                      )}
                    </Button>
                  )}

                  {activeTab === "preview" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("template")}
                        className="text-xs"
                      >
                        Vissza a paraméterekhez
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setActiveTab("filing")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5"
                      >
                        Tovább az iktatáshoz
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  {activeTab === "filing" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("preview")}
                        disabled={isFinalizing}
                        className="text-xs"
                      >
                        Vissza a szöveghez
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleFinalizeAndFile}
                        disabled={isFinalizing}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 font-semibold"
                      >
                        {isFinalizing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            PDF készítése és iktatás...
                          </>
                        ) : (
                          <>
                            <FileCheck className="h-3.5 w-3.5" />
                            Szerződés Véglegesítése & Iktatása
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* ── Sablon törlés megerősítő párbeszédablak (Kanonikus AlertDialog) ── */}
    <AlertDialog
      open={Boolean(templateToDelete)}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isDeletingTemplate) setTemplateToDelete(null)
      }}
    >
      <AlertDialogContent className="sm:max-w-md z-[70]">
        <AlertDialogHeader>
          <div className="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-1">
            <Trash2 className="h-4 w-4" />
          </div>
          <AlertDialogTitle className="text-base font-semibold">
            Biztosan törölni szeretnéd ezt a sablont?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            A(z) <span className="font-semibold text-foreground">„{templateToDelete?.name}”</span> nevű egyedi szerződéssablon véglegesen törlődik a vállalati sablontárból.
            <br />
            <br />
            A korábban generált vagy már leiktatott szerződések és kapcsolódó ügyiratok változatlanok maradnak.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel
            disabled={isDeletingTemplate}
            onClick={() => setTemplateToDelete(null)}
            className="text-xs cursor-pointer"
          >
            Mégse
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeletingTemplate}
            onClick={handleConfirmDeleteTemplate}
            className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 cursor-pointer font-medium"
          >
            {isDeletingTemplate ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Törlés...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Sablon törlése
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* ── Teljes méretű PDF Előnézet Modál (Dialog) ── */}
    <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[96vw] h-[90vh] flex flex-col p-4 sm:p-6 z-[70] bg-background">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>{title} — A4 PDF Előnézet (Tervezet)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                A szerződés hivatalos, formázott A4 elrendezése. Ha a szövegen módosítasz, a PDF automatikusan az aktuális tartalommal generálódik.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFetchPdfPreview()}
                disabled={isGeneratingPdfPreview}
                className="h-8 text-xs gap-1.5"
              >
                <RotateCcw className={cn("h-3.5 w-3.5", isGeneratingPdfPreview && "animate-spin text-primary")} />
                Frissítés
              </Button>
              {pdfPreviewDataUri && (
                <a
                  href={pdfPreviewDataUri}
                  download={`${title.replace(/[^a-zA-Z0-9_-]/g, "_")}_tervezet.pdf`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs gap-1.5")}
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  PDF Letöltése
                </a>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full bg-muted/20 border rounded-lg overflow-hidden relative mt-2">
          {isGeneratingPdfPreview ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-xs z-10 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">A4-es PDF dokumentum összeállítása...</p>
            </div>
          ) : pdfPreviewDataUri ? (
            <DocumentPreviewFrame
              src={pdfPreviewDataUri}
              title={`${title} — Előnézet`}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              Nincs megjeleníthető PDF adat.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
