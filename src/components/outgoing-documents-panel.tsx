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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  FileText,
  Mail,
  Send,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  FileUp,
  Sparkles,
  Paperclip,
  Check,
  Plus,
  ArrowRight,
  ExternalLink,
  Eye,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { uploadReply, generateAndExpediteReply, deleteOutgoingDocument } from "@/app/dossiers/[id]/actions"
import { ExpediteDialog } from "./expedite-dialog"
import { DocumentViewer } from "./document-viewer"
import { ReplyTemplatePicker } from "./reply-template-picker"
import { ReplyTemplate } from "@/types/reply-templates"
import { DEFAULT_REPLY_TEMPLATES } from "@/utils/reply-templates"
import { getReplyTemplates } from "@/app/dossiers/[id]/template-actions"

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

interface OutgoingDocumentsPanelProps {
  ugyiratId: string
  iktatoszam?: string
  canEdit: boolean
  partnerInfo?: PartnerDetectionInfo | null
  incomingIrat?: IncomingIratInfo | null
  outgoingDocs?: OutgoingDocItem[]
}


export function OutgoingDocumentsPanel({
  ugyiratId,
  iktatoszam,
  canEdit,
  partnerInfo,
  incomingIrat,
  outgoingDocs = [],
}: OutgoingDocumentsPanelProps) {
  const router = useRouter()

  // Modálok állapota
  const [directModalOpen, setDirectModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [templatePickerTarget, setTemplatePickerTarget] = useState<"direct" | "template">("template")
  const [allTemplates, setAllTemplates] = useState<ReplyTemplate[]>(DEFAULT_REPLY_TEMPLATES)

  // Dokumentum előnézet (DocumentViewer)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedFajl, setSelectedFajl] = useState<any>(null)
  const [selectedIratId, setSelectedIratId] = useState<string>("")

  // Dokumentum törlése modál
  const [deletingDoc, setDeletingDoc] = useState<{ id: string; targy: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [loading, setLoading] = useState(false)

  // Sablonok szinkronizálása a háttérből
  useEffect(() => {
    getReplyTemplates().then((res) => {
      if (res.success && res.templates) {
        setAllTemplates(res.templates)
      }
    })
  }, [templatePickerOpen])

  // Alapértelmezett tárgy bejövő irat alapján
  const defaultSubject = incomingIrat?.targy
    ? `Válasz: ${incomingIrat.targy.replace(/^Számla - /i, "")}`
    : "Hivatalos válaszlevél"

  // 1. KÖZVETLEN VÁLASZLEVÉL FORM ÁLLAPOT (ZERO DUPLICATION)
  const [directTo, setDirectTo] = useState(partnerInfo?.email || "")
  const [directSubject, setDirectSubject] = useState(defaultSubject)
  const [directBody, setDirectBody] = useState("")
  const [directSaveToPartner, setDirectSaveToPartner] = useState(!partnerInfo?.email && !!partnerInfo?.id)

  // 2. KÉSZ PDF FELTÖLTÉS FORM ÁLLAPOT
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadSubject, setUploadSubject] = useState(defaultSubject)
  const [uploadMode, setUploadMode] = useState<"email" | "posta" | "none">("email")
  const [uploadEmailTo, setUploadEmailTo] = useState(partnerInfo?.email || "")
  const [uploadSaveToPartner, setUploadSaveToPartner] = useState(!partnerInfo?.email && !!partnerInfo?.id)
  const [uploadPostalTracking, setUploadPostalTracking] = useState("")

  // 3. SABLON FORM ÁLLAPOT
  const [templateSablonId, setTemplateSablonId] = useState(DEFAULT_REPLY_TEMPLATES[0].id)
  const [templateSubject, setTemplateSubject] = useState(`Hivatalos válaszlevél - ${partnerInfo?.nev || ""}`.trim())
  const [templateBody, setTemplateBody] = useState(DEFAULT_REPLY_TEMPLATES[0].tartalom)
  const [templateMode, setTemplateMode] = useState<"email" | "posta" | "none">("email")
  const [templateEmailTo, setTemplateEmailTo] = useState(partnerInfo?.email || "")
  const [templateSaveToPartner, setTemplateSaveToPartner] = useState(!partnerInfo?.email && !!partnerInfo?.id)
  const [templatePostalTracking, setTemplatePostalTracking] = useState("")

  // Sablon választás a Pickerből
  const handleSelectTemplateFromPicker = (tpl: ReplyTemplate) => {
    const partnerName = partnerInfo?.nev || ""
    const subject = tpl.targy
      ? (partnerName ? `${tpl.targy} - ${partnerName}` : tpl.targy)
      : (partnerName ? `${tpl.nev} - ${partnerName}` : tpl.nev)

    if (templatePickerTarget === "direct") {
      setDirectSubject(subject)
      setDirectBody(tpl.tartalom)
      setDirectModalOpen(true)
    } else {
      setTemplateSablonId(tpl.id)
      setTemplateSubject(subject)
      setTemplateBody(tpl.tartalom)
      setTemplateModalOpen(true)
    }
  }

  // Sablon választás a legördülőből
  const handleSelectTemplate = (sablonId: string | null) => {
    if (!sablonId) return
    setTemplateSablonId(sablonId)
    const sab = allTemplates.find((s) => s.id === sablonId)
    if (sab) {
      setTemplateBody(sab.tartalom)
      if (sab.id !== "egyedi") {
        const partnerName = partnerInfo?.nev || ""
        const subj = sab.targy
          ? (partnerName ? `${sab.targy} - ${partnerName}` : sab.targy)
          : (partnerName ? `${sab.nev} - ${partnerName}` : sab.nev)
        setTemplateSubject(subj)
      }
    }
  }

  // Nem kiküldött kimenő irat törlése
  const handleDeleteDoc = async () => {
    if (!deletingDoc) return
    setDeleteLoading(true)
    try {
      const res = await deleteOutgoingDocument(ugyiratId, deletingDoc.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Kimenő irat sikeresen törölve!")
        setDeletingDoc(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt a törlés során.")
    } finally {
      setDeleteLoading(false)
    }
  }

  // 1. KÖZVETLEN VÁLASZLEVÉL KÜLDÉSE (A beírt szövegből készül az email + PDF)
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directTo.trim()) {
      toast.error("Kérjük, adja meg a címzett e-mail címét!")
      return
    }
    if (!directSubject.trim()) {
      toast.error("A levél tárgyának megadása kötelező!")
      return
    }
    if (!directBody.trim()) {
      toast.error("Kérjük, írja be a válaszlevél szövegét!")
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.set("targy", directSubject.trim())
      formData.set("tartalom", directBody.trim())
      formData.set("cimzett", partnerInfo?.nev || "Partnerünk")
      formData.set("sablon_tipus", "kozvetlen_valasz")
      formData.set("hivatkozas", iktatoszam || "")
      formData.set("expediteMode", "email")
      formData.set("recipientEmail", directTo.trim())
      formData.set("emailSubject", directSubject.trim())
      formData.set("emailMessage", directBody.trim())

      if (partnerInfo?.id) {
        formData.set("partnerId", partnerInfo.id)
      }
      if (directSaveToPartner && partnerInfo?.id) {
        formData.set("saveToPartnerId", partnerInfo.id)
      }

      const res = await generateAndExpediteReply(ugyiratId, formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        if (res.dispatched) {
          toast.success(`Válaszlevél sikeresen kiküldve e-mailben a partnernek (${directTo.trim()})!`)
        } else if (res.expediteError) {
          toast.warning(`Válaszlevél iktatva, de a kiküldés hibát jelzett: ${res.expediteError}`)
        } else {
          toast.success("Válaszlevél sikeresen iktatva az ügyiratba!")
        }
        setDirectModalOpen(false)
        setDirectBody("")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  // 2. KÉSZ PDF FELTÖLTÉSE
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      toast.error("Kérjük, válasszon ki egy PDF fájlt!")
      return
    }
    if (!uploadSubject.trim()) {
      toast.error("Kérjük, adja meg a dokumentum tárgyát!")
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.set("targy", uploadSubject.trim())
      formData.set("file", uploadFile)
      formData.set("expediteMode", uploadMode)

      if (partnerInfo?.id) {
        formData.set("partnerId", partnerInfo.id)
      }

      if (uploadMode === "email") {
        if (!uploadEmailTo.trim()) {
          toast.error("Kérjük, adja meg a címzett e-mail címét!")
          setLoading(false)
          return
        }
        formData.set("recipientEmail", uploadEmailTo.trim())
        formData.set("emailSubject", uploadSubject.trim())
        formData.set(
          "emailMessage",
          `Tisztelt ${partnerInfo?.nev || "Partnerünk"}!\n\nMellékelten továbbítjuk a(z) ${iktatoszam || ""} ügyirathoz tartozó "${uploadSubject.trim()}" kimenő iratunkat.\n\nÜdvözlettel,\neaisyDocs`
        )
        if (uploadSaveToPartner && partnerInfo?.id) {
          formData.set("saveToPartnerId", partnerInfo.id)
        }
      } else if (uploadMode === "posta") {
        formData.set("postalTracking", uploadPostalTracking.trim())
        formData.set("postalRecipient", partnerInfo?.nev || "Partner")
        formData.set("postalAddress", partnerInfo?.cim || "")
      }

      const res = await uploadReply(ugyiratId, formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        if (res.dispatched) {
          toast.success(
            uploadMode === "email"
              ? `PDF irat iktatva és sikeresen elküldve a partnernek (${uploadEmailTo.trim()})!`
              : "PDF irat iktatva és postai feladás rögzítve!"
          )
        } else if (res.expediteError) {
          toast.warning(`PDF feltöltve, de a kiküldés figyelmeztetést adott: ${res.expediteError}`)
        } else {
          toast.success("Válaszlevél iktatva (expediálásra vár)!")
        }
        setUploadModalOpen(false)
        setUploadFile(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  // 3. SABLON ALAPÚ GENERÁLÁS
  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateSubject.trim() || !templateBody.trim()) {
      toast.error("A tárgy és a tartalom megadása kötelező!")
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.set("targy", templateSubject.trim())
      formData.set("tartalom", templateBody.trim())
      formData.set("cimzett", partnerInfo?.nev || "Partnerünk")
      formData.set("sablon_tipus", templateSablonId)
      formData.set("hivatkozas", iktatoszam || "")
      formData.set("expediteMode", templateMode)

      if (partnerInfo?.id) {
        formData.set("partnerId", partnerInfo.id)
      }

      if (templateMode === "email") {
        if (!templateEmailTo.trim()) {
          toast.error("Kérjük, adja meg a címzett e-mail címét!")
          setLoading(false)
          return
        }
        formData.set("recipientEmail", templateEmailTo.trim())
        formData.set("emailSubject", templateSubject.trim())
        formData.set(
          "emailMessage",
          `Tisztelt ${partnerInfo?.nev || "Partnerünk"}!\n\nMellékelten továbbítjuk a(z) ${iktatoszam || ""} ügyirathoz tartozó hivatalos iratunkat.\n\nÜdvözlettel,\neaisyDocs`
        )
        if (templateSaveToPartner && partnerInfo?.id) {
          formData.set("saveToPartnerId", partnerInfo.id)
        }
      } else if (templateMode === "posta") {
        formData.set("postalTracking", templatePostalTracking.trim())
        formData.set("postalRecipient", partnerInfo?.nev || "Partner")
        formData.set("postalAddress", partnerInfo?.cim || "")
      }

      const res = await generateAndExpediteReply(ugyiratId, formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        if (res.dispatched) {
          toast.success(
            templateMode === "email"
              ? `Hivatalos levél PDF generálva és elküldve e-mailben (${templateEmailTo.trim()})!`
              : "Hivatalos levél PDF generálva és postai feladás rögzítve!"
          )
        } else if (res.expediteError) {
          toast.warning(`Levél generálva, de a kiküldés hibát adott: ${res.expediteError}`)
        } else {
          toast.success("Hivatalos levél PDF sikeresen legenerálva és iktatva!")
        }
        setTemplateModalOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="flex flex-col h-[500px] border border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileUp className="h-4 w-4 text-primary" />
              Válaszlevelek és Expediálás
            </CardTitle>
            {outgoingDocs.length > 0 && (
              <Badge variant="outline" className="text-xs font-normal">
                {outgoingDocs.length} kimenő irat
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Kimenő válaszlevelek írása, PDF feltöltése és partner kézbesítése.
          </CardDescription>

          {/* Intelligens Partner Status Bar */}
          {partnerInfo?.nev && (
            <div className="mt-2.5 p-2 bg-muted/60 border border-border/60 rounded-md text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground truncate">{partnerInfo.nev}</span>
              </div>
              {partnerInfo.email ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {partnerInfo.email}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 shrink-0">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Nincs e-mail
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        {/* Akciógombok — Tiszta, 3 egyértelmű művelet */}
        <div className="px-6 py-2 border-y border-border/40 bg-muted/20">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (partnerInfo?.email) setDirectTo(partnerInfo.email)
                setDirectModalOpen(true)
              }}
              disabled={!canEdit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium h-9 flex items-center justify-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Válaszlevél írása</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (partnerInfo?.email) setUploadEmailTo(partnerInfo.email)
                setUploadModalOpen(true)
              }}
              disabled={!canEdit}
              className="text-xs font-medium h-9 flex items-center justify-center gap-1.5 border-border/80 hover:bg-muted"
            >
              <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">PDF feltöltése</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (partnerInfo?.email) setTemplateEmailTo(partnerInfo.email)
                setTemplatePickerTarget("template")
                setTemplatePickerOpen(true)
              }}
              disabled={!canEdit}
              className="text-xs font-medium h-9 flex items-center justify-center gap-1.5 border-border/80 hover:bg-muted"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">Sablon használata</span>
            </Button>
          </div>
        </div>

        {/* Kimenő iratok listája ebben az ügyiratban */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {outgoingDocs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <FileUp className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium text-foreground">Még nincs válaszlevél</div>
              <p className="text-[11px] text-muted-foreground max-w-[260px]">
                Kattintson a fenti gombok egyikére közvetlen válasz küldéséhez vagy PDF irat csatolásához.
              </p>
            </div>
          ) : (
            outgoingDocs.map((doc) => {
              const isDispatched = doc.kezbesites_statusz === "expedialva"
              return (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg border border-border/60 bg-card hover:border-border transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{doc.targy}</span>
                      {doc.alszam && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          /{doc.alszam}. alszám
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isDispatched ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {doc.kezbesites_modja === "email" ? "Kiküldve e-mailben" : "Postázva"}
                          {doc.kezbesites_datuma && (
                            <span className="text-[9px] text-muted-foreground ml-1">
                              ({new Date(doc.kezbesites_datuma).toLocaleDateString("hu-HU")})
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1"
                        >
                          <Clock className="h-2.5 w-2.5" />
                          Expediálásra vár
                        </Badge>
                      )}

                      {doc.kezbesites_cimzett && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                          {doc.kezbesites_cimzett}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Műveletek: Megtekintés, Expediálás & Törlés */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {doc.irat_fajl && doc.irat_fajl.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Dokumentum megtekintése"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => {
                          setSelectedFajl(doc.irat_fajl![0])
                          setSelectedIratId(doc.id)
                          setViewerOpen(true)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canEdit && !isDispatched && (
                      <ExpediteDialog
                        ugyiratId={ugyiratId}
                        iratId={doc.id}
                        iratTargy={doc.targy}
                        dossierIktatoszam={iktatoszam}
                        partnerInfo={partnerInfo}
                      />
                    )}
                    {canEdit && !isDispatched && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Nem kiküldött kimenő irat törlése"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => setDeletingDoc({ id: doc.id, targy: doc.targy })}
                        disabled={deleteLoading}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* 1. KÖZVETLEN VÁLASZLEVÉL MODÁL (LETISZTULT, NULLA DUPLIKÁCIÓ) */}
      {/* ============================================================ */}
      <Dialog open={directModalOpen} onOpenChange={setDirectModalOpen}>
        <DialogContent className="sm:max-w-[620px] w-full p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Send className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold truncate">Válaszlevél küldése a partnernek</DialogTitle>
                  <DialogDescription className="text-xs truncate">
                    Írja be az érdemi választ, vagy válasszon sablont a gyors kitöltéshez.
                  </DialogDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTemplatePickerTarget("direct")
                  setTemplatePickerOpen(true)
                }}
                className="text-xs h-7 gap-1 text-primary border-primary/30 hover:bg-primary/10 shrink-0 mr-8"
              >
                <Sparkles className="h-3 w-3" />
                <span>Sablonok</span>
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleDirectSubmit} className="space-y-4 pt-1 text-xs w-full min-w-0">
            {/* Címzett e-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="dir-to" className="text-xs font-medium">
                Címzett e-mail címe <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dir-to"
                type="email"
                value={directTo}
                onChange={(e) => setDirectTo(e.target.value)}
                placeholder="pl. ugyvezeto@partner.hu"
                required
                disabled={loading}
              />
              {partnerInfo?.id && !partnerInfo.email && (
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="save-direct-email"
                    checked={directSaveToPartner}
                    onChange={(e) => setDirectSaveToPartner(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <label htmlFor="save-direct-email" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                    E-mail cím mentése a partner adatlapjára ({partnerInfo.nev})
                  </label>
                </div>
              )}
            </div>

            {/* Egyetlen, egyértelmű Tárgy mező */}
            <div className="space-y-1.5">
              <Label htmlFor="dir-subject" className="text-xs font-medium">
                Tárgy <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dir-subject"
                value={directSubject}
                onChange={(e) => setDirectSubject(e.target.value)}
                placeholder="Pl. Válasz a beérkezett számlára"
                required
                disabled={loading}
              />
            </div>

            {/* Egyetlen, egyértelmű Üzenet szövege */}
            <div className="space-y-1.5">
              <Label htmlFor="dir-body" className="text-xs font-medium">
                Válaszlevél üzenete <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="dir-body"
                rows={7}
                value={directBody}
                onChange={(e) => setDirectBody(e.target.value)}
                placeholder="Tisztelt Partnerünk!&#10;&#10;Hivatkozással megkeresésükre..."
                className="font-sans text-xs resize-y"
                required
                disabled={loading}
              />
              <p className="text-[11px] text-muted-foreground">
                Az üzenet elküldésre kerül e-mailben, és automatikusan készült belőle egy iktatott A4-es PDF irat is az ügyiratba.
              </p>
            </div>

            <DialogFooter className="pt-2 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => setDirectModalOpen(false)} disabled={loading}>
                Mégse
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground flex items-center gap-1.5" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Válaszlevél elküldése és iktatása
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 2. KÉSZ PDF FELTÖLTÉSE MODÁL */}
      {/* ============================================================ */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[620px] w-full p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-info/10 text-info border border-info/20 shrink-0">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Kész válaszlevél (PDF) feltöltése</DialogTitle>
                <DialogDescription className="text-xs">
                  Csatoljon meglévő PDF dokumentumot, és válassza ki a kiküldés módját.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-1 text-xs w-full min-w-0">
            {/* Tárgy */}
            <div className="space-y-1.5">
              <Label htmlFor="upl-subj" className="text-xs font-medium">
                Irat tárgya <span className="text-destructive">*</span>
              </Label>
              <Input
                id="upl-subj"
                value={uploadSubject}
                onChange={(e) => setUploadSubject(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Fájl választó */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                PDF fájl <span className="text-destructive">*</span>
              </Label>
              <div className="border border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-lg p-3 text-center bg-card">
                <input
                  id="upl-file"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                  disabled={loading}
                />
                <label htmlFor="upl-file" className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                  {uploadFile ? (
                    <span className="text-foreground font-semibold">
                      {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Kattintson ide a PDF fájl kiválasztásához</span>
                  )}
                </label>
              </div>
            </div>

            {/* Kézbesítés módja */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium">Kézbesítés módja</Label>
              <div className="grid grid-cols-3 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => setUploadMode("email")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    uploadMode === "email"
                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate w-full text-center">E-mailben most</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("posta")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    uploadMode === "posta"
                      ? "border-warning bg-warning/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Package className="h-4 w-4 text-warning shrink-0" />
                  <span className="truncate w-full text-center">Postai feladás</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("none")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    uploadMode === "none"
                      ? "border-info bg-info/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Clock className="h-4 w-4 text-info shrink-0" />
                  <span className="truncate w-full text-center">Csak mentés</span>
                </button>
              </div>

              {uploadMode === "email" && (
                <div className="space-y-1.5 pt-1.5">
                  <Label htmlFor="upl-email-to" className="text-xs font-medium">
                    Címzett e-mail címe
                  </Label>
                  <Input
                    id="upl-email-to"
                    type="email"
                    value={uploadEmailTo}
                    onChange={(e) => setUploadEmailTo(e.target.value)}
                    required
                    disabled={loading}
                  />
                  {partnerInfo?.id && !partnerInfo.email && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="save-upl-email"
                        checked={uploadSaveToPartner}
                        onChange={(e) => setUploadSaveToPartner(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <label htmlFor="save-upl-email" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                        E-mail cím mentése a partner adatlapjára ({partnerInfo.nev})
                      </label>
                    </div>
                  )}
                </div>
              )}

              {uploadMode === "posta" && (
                <div className="space-y-1.5 pt-1.5">
                  <Label htmlFor="upl-track" className="text-xs font-medium">
                    Postai ragszám / azonosító (opcionális)
                  </Label>
                  <Input
                    id="upl-track"
                    value={uploadPostalTracking}
                    onChange={(e) => setUploadPostalTracking(e.target.value)}
                    placeholder="Pl. RL123456789HU"
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => setUploadModalOpen(false)} disabled={loading}>
                Mégse
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground flex items-center gap-1.5" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Feltöltés és iktatás
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 3. SABLON ALAPÚ GENERÁLÁS MODÁL */}
      {/* ============================================================ */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="sm:max-w-[640px] w-full p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-md bg-warning/10 text-warning border border-warning/20 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold truncate">Kimenő irat generálása sablonból</DialogTitle>
                  <DialogDescription className="text-xs truncate">
                    Válasszon hivatalos iratsablont, szerkessze a szöveget, és a rendszer PDF iratot készít belőle.
                  </DialogDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTemplatePickerTarget("template")
                  setTemplatePickerOpen(true)
                }}
                className="text-xs h-7 gap-1 text-primary border-primary/30 hover:bg-primary/10 shrink-0 mr-8"
              >
                <Sparkles className="h-3 w-3" />
                <span>Katalógus</span>
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleTemplateSubmit} className="space-y-4 pt-1 text-xs w-full min-w-0">
            {/* Sablon kiválasztás */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Sablon típusa</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTemplatePickerTarget("template")
                    setTemplatePickerOpen(true)
                  }}
                  className="h-6 px-1.5 text-[11px] text-primary hover:text-primary hover:bg-primary/10 gap-1 font-normal"
                >
                  <Plus className="h-3 w-3" />
                  <span>Új sablon / Katalógus</span>
                </Button>
              </div>
              <Select value={templateSablonId} onValueChange={handleSelectTemplate}>
                <SelectTrigger className="w-full text-xs h-9 min-w-0 overflow-hidden">
                  <SelectValue placeholder="Válasszon sablont..." className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-w-[600px] max-h-[300px]">
                  {allTemplates.map((s) => (
                    <SelectItem key={s.id} value={s.id} label={s.nev} className="text-xs py-2">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground flex items-center gap-1.5">
                            <span className="truncate">{s.nev}</span>
                            {s.isCustom && (
                              <span className="text-[9px] px-1 py-0.2 border border-primary/40 rounded text-primary font-normal">
                                Egyéni
                              </span>
                            )}
                          </div>
                          {s.description && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.description}</div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tárgy */}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-subj" className="text-xs font-medium">
                Irat tárgya <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tpl-subj"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Tartalom */}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-body" className="text-xs font-medium">
                Levél tartalma (szerkeszthető) <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="tpl-body"
                rows={7}
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                className="font-mono text-xs resize-y w-full leading-relaxed p-3"
                required
                disabled={loading}
              />
            </div>

            {/* Kézbesítési mód */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium">Kézbesítés módja</Label>
              <div className="grid grid-cols-3 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => setTemplateMode("email")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    templateMode === "email"
                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate w-full text-center">E-mailben most</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode("posta")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    templateMode === "posta"
                      ? "border-warning bg-warning/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Package className="h-4 w-4 text-warning shrink-0" />
                  <span className="truncate w-full text-center">Postai feladás</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode("none")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    templateMode === "none"
                      ? "border-info bg-info/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Clock className="h-4 w-4 text-info shrink-0" />
                  <span className="truncate w-full text-center">Csak mentés</span>
                </button>
              </div>

              {templateMode === "email" && (
                <div className="space-y-1.5 pt-1.5">
                  <Label htmlFor="tpl-email-to" className="text-xs font-medium">
                    Címzett e-mail címe
                  </Label>
                  <Input
                    id="tpl-email-to"
                    type="email"
                    value={templateEmailTo}
                    onChange={(e) => setTemplateEmailTo(e.target.value)}
                    required
                    disabled={loading}
                  />
                  {partnerInfo?.id && !partnerInfo.email && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="save-tpl-email"
                        checked={templateSaveToPartner}
                        onChange={(e) => setTemplateSaveToPartner(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <label htmlFor="save-tpl-email" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                        E-mail cím mentése a partner adatlapjára ({partnerInfo.nev})
                      </label>
                    </div>
                  )}
                </div>
              )}

              {templateMode === "posta" && (
                <div className="space-y-1.5 pt-1.5">
                  <Label htmlFor="tpl-track" className="text-xs font-medium">
                    Postai ragszám / azonosító (opcionális)
                  </Label>
                  <Input
                    id="tpl-track"
                    value={templatePostalTracking}
                    onChange={(e) => setTemplatePostalTracking(e.target.value)}
                    placeholder="Pl. RL123456789HU"
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => setTemplateModalOpen(false)} disabled={loading}>
                Mégse
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground flex items-center gap-1.5" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Generálás és iktatás
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Gyors Megtekintő (Kanonikus DocumentViewer) */}
      <DocumentViewer
        open={viewerOpen}
        setOpen={setViewerOpen}
        fajl={selectedFajl}
        iratId={selectedIratId}
      />

      {/* 4. KIMENŐ IRAT TÖRLÉSE MEGERŐSÍTŐ MODÁL */}
      <Dialog open={!!deletingDoc} onOpenChange={(open) => !open && setDeletingDoc(null)}>
        <DialogContent className="sm:max-w-[440px] w-full p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-destructive">
              <div className="p-2 rounded-md bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-destructive">
                  Kimenő irat törlése
                </DialogTitle>
                <DialogDescription className="text-xs">
                  A még kiküldetlen kimenő irat vázlat véglegesen törlődik.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>
              Biztosan törölni szeretné az alábbi kimenő iratot?
            </p>
            <div className="p-3 bg-muted/60 border border-border/60 rounded-md font-medium text-foreground break-words">
              {deletingDoc?.targy}
            </div>
            <p className="text-[11px] text-destructive/80">
              Figyelem: A dokumentum és a csatolt fájl véglegesen törlődik az ügyiratból.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t border-border/50">
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
              onClick={handleDeleteDoc}
              disabled={deleteLoading}
              className="flex items-center gap-1.5"
            >
              {deleteLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Irat végleges törlése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Válaszlevél sablonok katalógusa picker */}
      <ReplyTemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelectTemplate={handleSelectTemplateFromPicker}
      />
    </>
  )
}
