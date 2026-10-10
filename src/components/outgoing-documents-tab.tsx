"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Mail,
  Send,
  FileText,
  Sparkles,
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Package,
  Trash2,
  Eye,
  Loader2,
  Paperclip,
  Building2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  Pencil,
  FileDown,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { generateAndExpediteReply, deleteOutgoingDocument } from "@/app/dossiers/[id]/actions"
import { generateAiReplyAction, ReplyStyle } from "@/app/dossiers/[id]/ai-reply-actions"
import { DocumentViewer } from "./document-viewer"
import { ReplyTemplate, ReplyTemplateCategory } from "@/types/reply-templates"
import { DEFAULT_REPLY_TEMPLATES, REPLY_CATEGORIES } from "@/utils/reply-templates"
import {
  getReplyTemplates,
  createCustomReplyTemplate,
  deleteCustomReplyTemplate,
} from "@/app/dossiers/[id]/template-actions"

export interface PartnerDetectionInfo {
  id?: string | null
  nev?: string | null
  email?: string | null
  telefonszam?: string | null
  cim?: string | null
  source?: string | null
  contacts?: Array<{
    id: string
    nev: string
    email?: string | null
    elsodleges?: boolean
  }>
}

export interface IncomingIratInfo {
  id: string
  targy: string
  erkeztetoszam?: string | null
  erkezes_modja?: string | null
  leiras?: string | null
}

export interface OutgoingDocItem {
  id: string
  targy: string
  alszam?: number
  erkeztetoszam?: string | null
  kezbesites_statusz?: string | null
  kezbesites_modja?: string | null
  kezbesites_datuma?: string | null
  kezbesites_cimzett?: string | null
  kezbesites_azonosito?: string | null
  kezbesites_megjegyzes?: string | null
  created_at?: string
  irat_fajl?: Array<{
    id: string
    storage_path: string
    eredeti_fajlnev: string
    verzio?: number
    pdfa_path?: string | null
  }>
}

interface OutgoingDocumentsTabProps {
  ugyiratId: string
  iktatoszam?: string
  canEdit: boolean
  partnerInfo?: PartnerDetectionInfo | null
  incomingIrat?: IncomingIratInfo | null
  outgoingDocs?: OutgoingDocItem[]
}

type WizardStep = 1 | 2 | 3
type EditorSubTab = "custom" | "ai" | "templates"
type DeliveryChannel = "email" | "posta" | "none"

export function OutgoingDocumentsTab({
  ugyiratId,
  iktatoszam,
  canEdit,
  partnerInfo,
  incomingIrat,
  outgoingDocs = [],
}: OutgoingDocumentsTabProps) {
  const router = useRouter()

  // Wizard Dialog állapota
  const [wizardOpen, setWizardOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [editorSubTab, setEditorSubTab] = useState<EditorSubTab>("custom")

  // Sablonok betöltése
  const [allTemplates, setAllTemplates] = useState<ReplyTemplate[]>(DEFAULT_REPLY_TEMPLATES)
  const [templateSearch, setTemplateSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Dokumentum betekintő
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedFajl, setSelectedFajl] = useState<any>(null)
  const [selectedIratId, setSelectedIratId] = useState<string>("")

  // Törlés modal
  const [deletingDoc, setDeletingDoc] = useState<{ id: string; targy: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Űrlap állapota (Wizard Form State)
  const [recipientEmail, setRecipientEmail] = useState("")
  const [saveEmailToPartner, setSaveEmailToPartner] = useState(false)
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>("email")
  const [postalAddress, setPostalAddress] = useState("")
  const [postalTracking, setPostalTracking] = useState("")

  const [targy, setTargy] = useState("")
  const [tartalom, setTartalom] = useState("")
  const [attachedFile, setAttachedFile] = useState<File | null>(null)

  // AI Varázsló állapota
  const [aiStyle, setAiStyle] = useState<ReplyStyle>("hivatalos")
  const [aiInstructions, setAiInstructions] = useState("")
  const [aiLoading, setAiLoading] = useState(false)

  const [submitLoading, setSubmitLoading] = useState(false)

  // Sablonok lekérése a szerverről
  useEffect(() => {
    getReplyTemplates().then((res) => {
      if (res.success && res.templates) {
        setAllTemplates(res.templates)
      }
    })
  }, [])

  // ── SABLON KEZELÉS ÉS MENTÉS ÁLLAPOTA (0 POPUP!) ──
  const [newReplyTplOpen, setNewReplyTplOpen] = useState(false)
  const [saveCurrentAsTplOpen, setSaveCurrentAsTplOpen] = useState(false)
  const [tplFormNev, setTplFormNev] = useState("")
  const [tplFormKategoria, setTplFormKategoria] = useState<ReplyTemplateCategory>("hivatalos")
  const [tplFormTargy, setTplFormTargy] = useState("")
  const [tplFormLeiras, setTplFormLeiras] = useState("")
  const [tplFormTartalom, setTplFormTartalom] = useState("")
  const [tplFormSaving, setTplFormSaving] = useState(false)

  const handleSaveReplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tplFormNev.trim()) {
      toast.error("Kérlek add meg a sablon megnevezését!")
      return
    }
    if (!tplFormTartalom.trim()) {
      toast.error("A sablon levélszövege nem lehet üres!")
      return
    }
    setTplFormSaving(true)
    try {
      const res = await createCustomReplyTemplate({
        nev: tplFormNev.trim(),
        kategoria: tplFormKategoria,
        targy: tplFormTargy.trim() || tplFormNev.trim(),
        description: tplFormLeiras.trim() || undefined,
        tartalom: tplFormTartalom.trim(),
      })
      if (res.success && res.template) {
        toast.success("Új válaszlevél sablon sikeresen elmentve a vállalati sablontárba!")
        setAllTemplates((prev) => [res.template!, ...prev])
        setNewReplyTplOpen(false)
        setSaveCurrentAsTplOpen(false)
        setTplFormNev("")
        setTplFormTargy("")
        setTplFormLeiras("")
        setTplFormTartalom("")
      } else {
        toast.error(res.error || "Hiba történt a sablon mentésekor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setTplFormSaving(false)
    }
  }

  // Törlés modal válaszlevél sablonhoz
  const [deletingReplyTemplate, setDeletingReplyTemplate] = useState<{ id: string; title: string } | null>(null)
  const [deleteReplyTemplateLoading, setDeleteReplyTemplateLoading] = useState(false)

  const handleDeleteReplyTemplate = (tpl: ReplyTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingReplyTemplate({ id: tpl.id, title: tpl.nev })
  }

  const handleConfirmDeleteReplyTemplate = async () => {
    if (!deletingReplyTemplate) return
    setDeleteReplyTemplateLoading(true)
    try {
      const res = await deleteCustomReplyTemplate(deletingReplyTemplate.id)
      if (res.success) {
        toast.success("Válaszlevél sablon sikeresen törölve.")
        setAllTemplates((prev) => prev.filter((t) => t.id !== deletingReplyTemplate.id))
        setDeletingReplyTemplate(null)
      } else {
        toast.error(res.error || "Nem sikerült törölni a sablont.")
      }
    } catch (err: any) {
      toast.error(err.message || "Hiba történt a sablon törlésekor.")
    } finally {
      setDeleteReplyTemplateLoading(false)
    }
  }

  const handleStartSaveCurrentAsTemplate = () => {
    if (!tartalom.trim()) {
      toast.error("Előbb írj be vagy generálj le egy érdemi levélszöveget!")
      return
    }
    setTplFormNev(targy.trim() || "Új válaszlevél sablon")
    setTplFormTargy(targy.trim() || "Válaszlevél")
    setTplFormTartalom(tartalom.trim())
    setTplFormLeiras("")
    setTplFormKategoria("hivatalos")
    setSaveCurrentAsTplOpen(true)
  }

  // Partner adatok inicializálása a dialógus nyitásakor
  const handleOpenWizard = () => {
    setCurrentStep(1)
    setEditorSubTab("custom")
    setRecipientEmail(partnerInfo?.email || "")
    setSaveEmailToPartner(false)
    setDeliveryChannel("email")
    setPostalAddress(partnerInfo?.cim || "")
    setPostalTracking("")
    setTargy(
      incomingIrat?.targy
        ? `Válasz: ${incomingIrat.targy} — Hiv: ${iktatoszam || ""}`
        : `Válaszlevél — ${partnerInfo?.nev || "Partner"}`
    )
    setTartalom(DEFAULT_REPLY_TEMPLATES[0]?.tartalom || "")
    setAttachedFile(null)
    setAiInstructions("")
    setWizardOpen(true)
  }

  // AI Szöveg Generálása
  const handleGenerateAi = async () => {
    if (!aiInstructions.trim()) {
      toast.error("Kérjük, fogalmazza meg, miről szóljon a válasz!")
      return
    }

    setAiLoading(true)
    try {
      const res = await generateAiReplyAction({
        ugyiratId,
        style: aiStyle,
        userInstructions: aiInstructions,
        partnerName: partnerInfo?.nev || undefined,
        incomingTargy: incomingIrat?.targy || undefined,
        incomingLeiras: incomingIrat?.leiras || undefined,
        iktatoszam,
      })

      if (res.success && res.tartalom) {
        if (res.targy) setTargy(res.targy)
        setTartalom(res.tartalom)
        toast.success(
          res.isAiGenerated
            ? "AI válaszlevél sikeresen legenerálva!"
            : "Válaszlevél vázlat sikeresen előállítva!"
        )
        // Átváltunk a Saját szöveg szerkesztőre, hogy a felhasználó azonnal lássa és finomíthassa
        setEditorSubTab("custom")
      } else {
        toast.error(res.error || "Nem sikerült a szöveg generálása.")
      }
    } catch (err: any) {
      toast.error(err.message || "Hiba történt a generálás során.")
    } finally {
      setAiLoading(false)
    }
  }

  // Sablon alkalmazása
  const handleApplyTemplate = (tpl: ReplyTemplate) => {
    if (tpl.targy) {
      setTargy(`${tpl.targy} — ${partnerInfo?.nev || iktatoszam || ""}`)
    }
    setTartalom(tpl.tartalom)
    toast.success(`„${tpl.nev}” sablon adatai sikeresen betöltve!`)
    setEditorSubTab("custom")
  }

  // Végleges küldés és iktatás
  const handleSubmit = async () => {
    if (!targy.trim()) {
      toast.error("A levél tárgya kötelező!")
      return
    }
    if (!tartalom.trim() && !attachedFile) {
      toast.error("Kérjük, adjon meg levélszöveget vagy csatoljon egy PDF dokumentumot!")
      return
    }
    if (deliveryChannel === "email" && !recipientEmail.trim()) {
      toast.error("E-mailes kézbesítéshez meg kell adni a címzett e-mail címét!")
      return
    }

    setSubmitLoading(true)
    try {
      const fd = new FormData()
      fd.append("targy", targy.trim())
      fd.append("tartalom", tartalom.trim())
      fd.append("cimzett", partnerInfo?.nev || recipientEmail || "Partner")
      fd.append("sablon_tipus", editorSubTab)
      fd.append("hivatkozas", iktatoszam || "")
      fd.append("expediteMode", deliveryChannel)

      if (deliveryChannel === "email") {
        fd.append("recipientEmail", recipientEmail.trim())
        fd.append("emailSubject", targy.trim())
        fd.append("emailMessage", tartalom.trim())
        if (saveEmailToPartner && partnerInfo?.id) {
          fd.append("saveToPartnerId", partnerInfo.id)
        }
      } else if (deliveryChannel === "posta") {
        fd.append("postalAddress", postalAddress.trim())
        fd.append("postalTracking", postalTracking.trim())
        fd.append("postalRecipient", partnerInfo?.nev || "")
      }

      if (partnerInfo?.id) {
        fd.append("partnerId", partnerInfo.id)
      }

      if (attachedFile) {
        fd.append("attachment", attachedFile)
      }

      const res = await generateAndExpediteReply(ugyiratId, fd)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Válaszlevél sikeresen előállítva, beiktatva és kiküldve!")
        setWizardOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt a válaszlevél küldése során.")
    } finally {
      setSubmitLoading(false)
    }
  }

  // Törlés megerősítése (kizárólag be nem iktatott, nem expediált piszkozatok esetén)
  const handleConfirmDelete = async () => {
    if (!deletingDoc) return
    setDeleteLoading(true)
    try {
      const res = await deleteOutgoingDocument(ugyiratId, deletingDoc.id)
      if (res.success) {
        toast.success("Kimenő válaszlevél piszkozat sikeresen törölve!")
        setDeletingDoc(null)
        router.refresh()
      } else {
        toast.error(res.error || "Hiba a kimenő irat törlésekor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba.")
    } finally {
      setDeleteLoading(false)
    }
  }

  // Szűrt sablonok a választóhoz
  const filteredTemplates = allTemplates.filter((t) => {
    const matchesSearch =
      t.nev.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.targy.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.tartalom.toLowerCase().includes(templateSearch.toLowerCase())
    const matchesCat = selectedCategory === "all" || t.kategoria === selectedCategory
    return matchesSearch && matchesCat
  })

  return (
    <div className="space-y-6">
      {/* Fejléc kártya Linear Flat stílusban */}
      <Card className="border border-border/60">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Válaszlevelek és Expediálás</CardTitle>
              {outgoingDocs.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  {outgoingDocs.length} kimenő irat
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Kimenő hivatalos válaszlevelek szerkesztése, AI támogatás, sablonok és partner kézbesítés.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {partnerInfo?.nev && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/40 px-2.5 py-1 rounded-md">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{partnerInfo.nev}</span>
                {partnerInfo.email && <span className="text-muted-foreground">({partnerInfo.email})</span>}
              </div>
            )}

            {canEdit && (
              <Button
                onClick={handleOpenWizard}
                className="h-8 gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Új válaszlevél készítése</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {outgoingDocs.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-lg bg-muted/20">
              <Mail className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Még nincs rögzített kimenő válaszlevél</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Kattintson az „Új válaszlevél készítése” gombra sablonos, egyedi vagy mesterséges intelligenciával
                generált hivatalos levél összeállításához.
              </p>
              {canEdit && (
                <Button
                  onClick={handleOpenWizard}
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5 cursor-pointer text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Válaszlevél indítása most</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {outgoingDocs.map((doc) => {
                const subNumberStr = doc.alszam !== undefined ? `/${doc.alszam}` : ""
                const fullDocNumber = `${iktatoszam || "IKT"}${subNumberStr}`
                const primaryFile = doc.irat_fajl?.[0]
                const isSent = doc.kezbesites_statusz === "elkuldve"
                const isFailed = doc.kezbesites_statusz === "sikertelen"

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-border/70 hover:border-primary/40 bg-card transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{doc.targy}</span>
                          <Badge variant="outline" className="text-[11px] font-mono font-medium">
                            {fullDocNumber}
                          </Badge>

                          {doc.kezbesites_modja === "email" && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/30 text-blue-600 bg-blue-500/10">
                              <Mail className="h-3 w-3" />
                              E-mail
                            </Badge>
                          )}
                          {doc.kezbesites_modja === "posta" && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30 text-amber-600 bg-amber-500/10">
                              <Package className="h-3 w-3" />
                              Posta
                            </Badge>
                          )}
                          {(!doc.kezbesites_modja || doc.kezbesites_modja === "none") && (
                            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Csak iktatva
                            </Badge>
                          )}

                          {isSent && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-success/30 text-success bg-success/10 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              Kiküldve
                            </Badge>
                          )}
                          {isFailed && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive bg-destructive/10 font-medium">
                              <AlertCircle className="h-3 w-3" />
                              Sikertelen
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          {doc.kezbesites_cimzett && (
                            <span>
                              Címzett: <strong className="text-foreground">{doc.kezbesites_cimzett}</strong>
                            </span>
                          )}
                          {doc.kezbesites_datuma && (
                            <span>
                              Dátum:{" "}
                              {new Date(doc.kezbesites_datuma).toLocaleString("hu-HU", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          {primaryFile && (
                            <span className="font-mono text-[11px] text-muted-foreground/80">
                              Fájl: {primaryFile.eredeti_fajlnev}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      {primaryFile && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFajl(primaryFile)
                            setSelectedIratId(doc.id)
                            setViewerOpen(true)
                          }}
                          className="h-8 text-xs gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Megtekintés</span>
                        </Button>
                      )}

                      {/* Kizárólag hivatalosan be nem iktatott és még el nem küldött piszkozat törölhető */}
                      {canEdit && !isSent && doc.kezbesites_statusz !== "expedialva" && !doc.alszam && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingDoc({ id: doc.id, targy: doc.targy })}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Kimenő irat piszkozat törlése"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── TÖBBLÉPÉSES VÁLASZLEVÉL VARÁZSLÓ DIALÓGUS (WIZARD) ── */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col p-0 gap-0 border border-border/70 overflow-hidden">
          {/* Varázsló Fejléc és Lépésindikátor */}
          <div className="p-6 border-b border-border/50 bg-muted/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                ÚJ KIMENŐ VÁLASZLEVÉL
              </span>
              <span className="text-xs text-muted-foreground">
                Ügyirat: <strong className="font-mono text-foreground">{iktatoszam || "—"}</strong>
              </span>
            </div>

            {/* Lépés Címsor a felhasználó mintájára */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center text-sm shrink-0">
                {currentStep}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {currentStep === 1 && "Címzett és Kézbesítési Mód"}
                  {currentStep === 2 && "Válaszlevél Összeállítása"}
                  {currentStep === 3 && "Melléklet és Expediálás"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {currentStep === 1 && "Válassza ki a kézbesítés csatornáját és adja meg a partner adatait."}
                  {currentStep === 2 && "Fogalmazza meg a választ: használjon sablont, AI varázslót vagy írjon egyedi szöveget."}
                  {currentStep === 3 && "Ellenőrizze az adatokat, csatoljon opcionális PDF-et és indítsa el a kézbesítést."}
                </p>
              </div>
            </div>

            {/* Lépés navigációs sáv */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  currentStep >= 1 ? "bg-primary" : "bg-muted"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  currentStep >= 2 ? "bg-primary" : "bg-muted"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  currentStep >= 3 ? "bg-primary" : "bg-muted"
                }`}
              />
            </div>
          </div>

          {/* Varázsló Törzs (Lépések szerint) */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* ── 1. LÉPÉS: CÍMZETT ÉS CSATORNA ── */}
            {currentStep === 1 && (
              <div className="space-y-5">
                {/* Partner előnézet kártya */}
                {partnerInfo?.nev && (
                  <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-foreground block">
                        Címzett Partner: {partnerInfo.nev}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {partnerInfo.source ? `${partnerInfo.source} • ` : ""}
                        {partnerInfo.email || "Nincs tárolt központi e-mail"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Csatorna kiválasztása 3 nagy gombbal */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Csatorna kiválasztása
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryChannel("email")}
                      className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        deliveryChannel === "email"
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                          : "border-border/70 hover:border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Mail className="h-6 w-6" />
                      <span className="text-xs uppercase tracking-wider">E-MAIL</span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        Azonnali levélküldés PDF csatolmánnyal
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryChannel("posta")}
                      className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        deliveryChannel === "posta"
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                          : "border-border/70 hover:border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Package className="h-6 w-6" />
                      <span className="text-xs uppercase tracking-wider">POSTA</span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        Nyomtatás és postai ragszám rögzítés
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryChannel("none")}
                      className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        deliveryChannel === "none"
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                          : "border-border/70 hover:border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Clock className="h-6 w-6" />
                      <span className="text-xs uppercase tracking-wider">CSAK IKTATÁS</span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        Csak a belső irattárban való rögzítés
                      </span>
                    </button>
                  </div>
                </div>

                {/* E-mail cím bevitele ha E-mail csatorna van */}
                {deliveryChannel === "email" && (
                  <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                    <div className="space-y-1.5">
                      <Label htmlFor="recipientEmail" className="text-xs font-medium">
                        Címzett e-mail címe <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="pl. ugyvezeto@partnerceg.hu"
                        className="text-xs h-9"
                      />
                    </div>

                    {partnerInfo?.id && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="saveEmail"
                          checked={saveEmailToPartner}
                          onChange={(e) => setSaveEmailToPartner(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                        />
                        <Label htmlFor="saveEmail" className="text-xs font-normal text-muted-foreground cursor-pointer">
                          E-mail cím mentése a partner adatlapjára ({partnerInfo.nev})
                        </Label>
                      </div>
                    )}
                  </div>
                )}

                {/* Postai cím ha Posta csatorna van */}
                {deliveryChannel === "posta" && (
                  <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                    <div className="space-y-1.5">
                      <Label htmlFor="postalAddress" className="text-xs font-medium">
                        Postai küldési cím
                      </Label>
                      <Input
                        id="postalAddress"
                        value={postalAddress}
                        onChange={(e) => setPostalAddress(e.target.value)}
                        placeholder="pl. 1052 Budapest, Váci u. 1."
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="postalTracking" className="text-xs font-medium">
                        Ajánlott / Tértivevény ragisztrációs szám (opcionális)
                      </Label>
                      <Input
                        id="postalTracking"
                        value={postalTracking}
                        onChange={(e) => setPostalTracking(e.target.value)}
                        placeholder="pl. RL123456789HU"
                        className="text-xs h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 2. LÉPÉS: LEVÉL ÖSSZEÁLLÍTÁSA (BELSŐ FÜLEKKEL, POPUP NÉLKÜL!) ── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* 3-állású navigációs gombok a te mintád alapján */}
                <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={editorSubTab === "custom" ? "default" : "outline"}
                    onClick={() => setEditorSubTab("custom")}
                    className="h-8 gap-1.5 text-xs cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Saját szöveg</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={editorSubTab === "ai" ? "default" : "outline"}
                    onClick={() => setEditorSubTab("ai")}
                    className="h-8 gap-1.5 text-xs cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>AI varázsló</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={editorSubTab === "templates" ? "default" : "outline"}
                    onClick={() => setEditorSubTab("templates")}
                    className="h-8 gap-1.5 text-xs cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    <span>Sablonok ({allTemplates.length})</span>
                  </Button>
                </div>

                {/* AL-FÜL A: SAJÁT SZÖVEG SZERKESZTÉSE */}
                {editorSubTab === "custom" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="letterSubject" className="text-xs font-semibold">
                        Levél tárgya <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="letterSubject"
                        value={targy}
                        onChange={(e) => setTargy(e.target.value)}
                        placeholder="Levél hivatalos tárgya..."
                        className="text-xs h-9 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="letterContent" className="text-xs font-semibold">
                          Levél szövege (szerkeszthető) <span className="text-destructive">*</span>
                        </Label>
                        <span className="text-[11px] text-muted-foreground">
                          {tartalom.length} karakter
                        </span>
                      </div>
                      <Textarea
                        id="letterContent"
                        value={tartalom}
                        onChange={(e) => setTartalom(e.target.value)}
                        rows={11}
                        placeholder="Tisztelt Partnerünk!..."
                        className="text-xs font-mono leading-relaxed"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[11px] text-muted-foreground">
                          A megadott szövegből a rendszer automatikusan hivatalos A4-es fejlécelt PDF iratot készít.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleStartSaveCurrentAsTemplate}
                          className="h-7 text-xs gap-1 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/40 shrink-0"
                        >
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          <span>Mentés új sablonként</span>
                        </Button>
                      </div>

                      {/* Mentés sablonként In-Place Box (0 Popup!) */}
                      {saveCurrentAsTplOpen && (
                        <form onSubmit={handleSaveReplyTemplate} className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-3 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-primary">Megírt levél mentése vállalati sablonként</span>
                            <span className="text-[10px] text-muted-foreground">A jövőben a sablonok közül azonnal betölthető lesz</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-medium">Sablon megnevezése <span className="text-destructive">*</span></Label>
                              <Input
                                value={tplFormNev}
                                onChange={(e) => setTplFormNev(e.target.value)}
                                placeholder="Pl. Számlareklamáció elutasítása"
                                className="h-8 text-xs bg-background"
                                autoFocus
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-medium">Kategória</Label>
                              <select
                                value={tplFormKategoria}
                                onChange={(e) => setTplFormKategoria(e.target.value as ReplyTemplateCategory)}
                                className="h-8 text-xs px-2.5 rounded-md border border-border bg-background w-full"
                              >
                                {REPLY_CATEGORIES.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nev}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium">Rövid leírás / megjegyzés (opcionális)</Label>
                            <Input
                              value={tplFormLeiras}
                              onChange={(e) => setTplFormLeiras(e.target.value)}
                              placeholder="Mikor érdemes használni ezt a sablont..."
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSaveCurrentAsTplOpen(false)}
                              className="h-7 text-xs cursor-pointer"
                            >
                              Mégse
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={tplFormSaving || !tplFormNev.trim()}
                              className="h-7 text-xs bg-primary text-primary-foreground gap-1 cursor-pointer"
                            >
                              {tplFormSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              <span>Sablon véglegesítése & Mentése</span>
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* AL-FÜL B: AI VARÁZSLÓ (A FELHASZNÁLÓ KÉPE SZERINT) */}
                {editorSubTab === "ai" && (
                  <div className="space-y-5 p-4 rounded-xl border border-primary/20 bg-muted/20">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Kommunikációs stílus
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setAiStyle("hivatalos")}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                            aiStyle === "hivatalos"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 hover:border-primary/50 text-foreground bg-card"
                          }`}
                        >
                          Hivatalos / Jogi
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiStyle("baratsagos")}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                            aiStyle === "baratsagos"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 hover:border-primary/50 text-foreground bg-card"
                          }`}
                        >
                          Partneri / Közvetlen
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiStyle("tajekoztato")}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                            aiStyle === "tajekoztato"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 hover:border-primary/50 text-foreground bg-card"
                          }`}
                        >
                          Tájékoztató / Tömör
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiStyle("felszolito")}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                            aiStyle === "felszolito"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 hover:border-primary/50 text-foreground bg-card"
                          }`}
                        >
                          Felszólító / Határidős
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="aiInstructions" className="text-xs font-semibold">
                        Miről szóljon a válaszlevél? (Instrukció az AI-nak)
                      </Label>
                      <Textarea
                        id="aiInstructions"
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value)}
                        rows={4}
                        placeholder="Pl. Értesítsd a partnert, hogy a szerződéstervezetet elfogadtuk. A módosított változatot csatoljuk, a fizetési határidőt 30 napra kérjük rögzíteni..."
                        className="text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        A Gemini AI ismeri az előzmény irat tárgyát ({incomingIrat?.targy || "megkeresés"}) és a partner nevét.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleGenerateAi}
                        disabled={aiLoading || !aiInstructions.trim()}
                        className="flex-1 gap-2 cursor-pointer bg-primary text-primary-foreground"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Szöveg generálása folyamatban (Gemini 2.5 Flash)...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-amber-300" />
                            <span>Szöveg generálása & Áttekintés</span>
                          </>
                        )}
                      </Button>

                      {tartalom && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            handleStartSaveCurrentAsTemplate()
                            setEditorSubTab("custom")
                          }}
                          className="h-10 text-xs gap-1 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/40 shrink-0"
                          title="A generált válaszlevél elmentése sablonként"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span className="hidden sm:inline">Mentés sablonként</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* AL-FÜL C: BEÉPÍTETT SABLONOK KATALÓGUSA (NINCS ÚJ POPUP!) */}
                {editorSubTab === "templates" && (
                  <div className="space-y-3">
                    {/* Fejléc: Cím és Új sablon gomb */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Elérhető Válaszlevél Sablonok</span>
                        <span className="text-[10px] text-muted-foreground">({allTemplates.length} db)</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={newReplyTplOpen ? "secondary" : "outline"}
                        onClick={() => {
                          if (!newReplyTplOpen) {
                            setTplFormNev("")
                            setTplFormTargy("")
                            setTplFormLeiras("")
                            setTplFormTartalom("")
                            setTplFormKategoria("hivatalos")
                          }
                          setNewReplyTplOpen(!newReplyTplOpen)
                        }}
                        className="h-7 text-xs gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>{newReplyTplOpen ? "Űrlap bezárása" : "Új sablon rögzítése"}</span>
                      </Button>
                    </div>

                    {/* Új Válaszlevél Sablon In-Place Űrlap */}
                    {newReplyTplOpen && (
                      <form onSubmit={handleSaveReplyTemplate} className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary">Új válaszlevél sablon létrehozása</span>
                          <span className="text-[10px] text-muted-foreground">Mentés után azonnal beilleszthető a levelekbe</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium">Sablon megnevezése <span className="text-destructive">*</span></Label>
                            <Input
                              value={tplFormNev}
                              onChange={(e) => setTplFormNev(e.target.value)}
                              placeholder="Pl. Hivatalos fizetési felszólítás"
                              className="h-8 text-xs bg-background"
                              autoFocus
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium">Kategória</Label>
                            <select
                              value={tplFormKategoria}
                              onChange={(e) => setTplFormKategoria(e.target.value as ReplyTemplateCategory)}
                              className="h-8 text-xs px-2.5 rounded-md border border-border bg-background w-full"
                            >
                              {REPLY_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nev}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium">Levél alapértelmezett tárgya</Label>
                            <Input
                              value={tplFormTargy}
                              onChange={(e) => setTplFormTargy(e.target.value)}
                              placeholder="Pl. Fizetési felszólítás számlatartozás miatt"
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium">Rövid leírás / mikor használd (opcionális)</Label>
                            <Input
                              value={tplFormLeiras}
                              onChange={(e) => setTplFormLeiras(e.target.value)}
                              placeholder="Pl. Késedelmes fizetés esetén kiküldendő felszólítás"
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium">Sablon levéltörzse (mintaszöveg) <span className="text-destructive">*</span></Label>
                          <Textarea
                            value={tplFormTartalom}
                            onChange={(e) => setTplFormTartalom(e.target.value)}
                            placeholder="Tisztelt Partnerünk!..."
                            rows={5}
                            className="text-xs bg-background font-mono leading-relaxed"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewReplyTplOpen(false)}
                            className="h-7 text-xs cursor-pointer"
                          >
                            Mégse
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={tplFormSaving || !tplFormNev.trim() || !tplFormTartalom.trim()}
                            className="h-7 text-xs bg-primary text-primary-foreground gap-1 cursor-pointer"
                          >
                            {tplFormSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            <span>Sablon mentése</span>
                          </Button>
                        </div>
                      </form>
                    )}

                    <div className="flex items-center gap-2">
                      <Input
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="Keresés sablonok között..."
                        className="text-xs h-8"
                      />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="text-xs h-8 px-2.5 rounded-md border border-border bg-background"
                      >
                        <option value="all">Minden kategória</option>
                        {REPLY_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nev}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {filteredTemplates.map((t) => (
                        <div
                          key={t.id}
                          className="group p-3 rounded-lg border border-border/70 hover:border-primary/40 bg-card hover:bg-muted/10 transition-colors flex flex-col justify-between gap-2 relative"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-semibold text-xs text-foreground line-clamp-1">
                                {t.nev}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {t.kategoria && (
                                  <Badge variant="outline" className="text-[10px] font-normal">
                                    {t.kategoria}
                                  </Badge>
                                )}
                                {t.isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteReplyTemplate(t, e)}
                                    title="Egyedi sablon törlése"
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {t.description || t.tartalom}
                            </p>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyTemplate(t)}
                            className="h-7 text-xs w-full gap-1 cursor-pointer hover:bg-primary/10 hover:text-primary"
                          >
                            <Check className="h-3 w-3" />
                            <span>Alkalmazás a levélbe</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 3. LÉPÉS: MELLÉKLET ÉS EXPEDIÁLÁS ── */}
            {currentStep === 3 && (
              <div className="space-y-5">
                {/* Összefoglaló doboz */}
                <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Kézbesítés csatornája:</span>
                    <Badge variant="outline" className="font-semibold uppercase text-xs">
                      {deliveryChannel === "email" ? "E-mailben most" : deliveryChannel === "posta" ? "Postai feladás" : "Csak iktatás"}
                    </Badge>
                  </div>
                  {deliveryChannel === "email" && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Címzett e-mail:</span>
                      <strong className="text-foreground font-mono">{recipientEmail}</strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Levél tárgya:</span>
                    <strong className="text-foreground line-clamp-1">{targy}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hivatkozási iktatószám:</span>
                    <span className="font-mono text-muted-foreground">{iktatoszam || "—"}</span>
                  </div>
                </div>

                {/* PDF Melléklet csatolása */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    Csatolt külső PDF melléklet (opcionális)
                  </Label>
                  <div className="border border-dashed border-border/80 rounded-xl p-6 text-center hover:bg-muted/10 transition-colors">
                    {attachedFile ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">{attachedFile.name}</span>
                          <span className="text-muted-foreground">
                            ({Math.round(attachedFile.size / 1024)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAttachedFile(null)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block space-y-1">
                        <FileDown className="h-8 w-8 mx-auto text-muted-foreground/60" />
                        <span className="text-xs font-medium text-foreground block">
                          Kattintson ide PDF fájl csatolásához
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          (Pl. árajánlat, szerződés melléklet, igazolás)
                        </span>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) setAttachedFile(f)
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-info/30 bg-info/5 text-info text-xs flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    A véglegesítéskor a rendszer automatikusan megállapítja a következő kimenő alszámot, legenerálja az A4-es hivatalos iratot, rögzíti az audit naplóban, és továbbítja a megadott csatornán.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Varázsló Lábléc navigációs gombokkal */}
          <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => (prev - 1) as WizardStep)}
                className="gap-1.5 cursor-pointer text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Előző lépés</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setWizardOpen(false)}
                className="text-xs text-muted-foreground"
              >
                Mégse
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (currentStep === 1 && deliveryChannel === "email" && !recipientEmail.trim()) {
                    toast.error("Kérjük, adja meg a címzett e-mail címét!")
                    return
                  }
                  if (currentStep === 2 && !targy.trim()) {
                    toast.error("A levél tárgya kötelező!")
                    return
                  }
                  setCurrentStep((prev) => (prev + 1) as WizardStep)
                }}
                className="gap-1.5 cursor-pointer text-xs bg-primary text-primary-foreground"
              >
                <span>Következő lépés</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={submitLoading}
                className="gap-1.5 cursor-pointer text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Küldés és iktatás folyamatban...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Válaszlevél elküldése és iktatása</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Törlés megerősítő párbeszédablak */}
      <Dialog open={!!deletingDoc} onOpenChange={(open) => !open && setDeletingDoc(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Kimenő irat piszkozat törlése
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Biztosan törölni szeretné a következő be nem iktatott kimenő válaszlevél piszkozatot?
              {deletingDoc && (
                <span className="block font-medium text-foreground mt-1.5 p-2 rounded bg-muted text-xs">
                  „{deletingDoc.targy}”
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingDoc(null)}
              disabled={deleteLoading}
            >
              Mégse
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Törlés...
                </>
              ) : (
                "Törlés megerősítése"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Válaszlevél sablon törlése megerősítő modál (0 window.confirm!) */}
      <Dialog open={!!deletingReplyTemplate} onOpenChange={(open) => !open && setDeletingReplyTemplate(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Válaszlevél sablon törlése
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Biztosan törölni szeretné a következő egyedi válaszlevél sablont a vállalati sablontárból?
              {deletingReplyTemplate && (
                <span className="block font-medium text-foreground mt-1.5 p-2 rounded bg-muted text-xs">
                  „{deletingReplyTemplate.title}”
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingReplyTemplate(null)}
              disabled={deleteReplyTemplateLoading}
            >
              Mégse
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteReplyTemplate}
              disabled={deleteReplyTemplateLoading}
            >
              {deleteReplyTemplateLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Törlés...
                </>
              ) : (
                "Törlés megerősítése"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Dokumentum Megtekintő */}
      {selectedFajl && (
        <DocumentViewer
          open={viewerOpen}
          setOpen={setViewerOpen}
          fajl={selectedFajl}
          iratId={selectedIratId}
        />
      )}
    </div>
  )
}
