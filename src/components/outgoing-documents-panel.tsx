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
  X,
} from "lucide-react"
import { toast } from "sonner"
import { generateAndExpediteReply, deleteOutgoingDocument } from "@/app/dossiers/[id]/actions"
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
  const [unifiedModalOpen, setUnifiedModalOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
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
    : `Hivatalos válaszlevél${partnerInfo?.nev ? ` - ${partnerInfo.nev}` : ""}`

  // EGYSÉGES VÁLASZLEVÉL ÉS CSATOLMÁNY FORM ÁLLAPOT
  const [templateSablonId, setTemplateSablonId] = useState(DEFAULT_REPLY_TEMPLATES[0].id)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(DEFAULT_REPLY_TEMPLATES[0].tartalom)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [deliveryMode, setDeliveryMode] = useState<"email" | "posta" | "none">("email")
  const [recipientEmail, setRecipientEmail] = useState(partnerInfo?.email || "")
  const [saveToPartner, setSaveToPartner] = useState(!partnerInfo?.email && !!partnerInfo?.id)
  const [postalTracking, setPostalTracking] = useState("")

  // Partner e-mail frissítése ha megérkezik a partnerInfo
  useEffect(() => {
    if (partnerInfo?.email && !recipientEmail) {
      setRecipientEmail(partnerInfo.email)
    }
  }, [partnerInfo?.email])

  // Sablon választás a Pickerből
  const handleSelectTemplateFromPicker = (tpl: ReplyTemplate) => {
    const partnerName = partnerInfo?.nev || ""
    const formattedSubj = tpl.targy
      ? (partnerName ? `${tpl.targy} - ${partnerName}` : tpl.targy)
      : (partnerName ? `${tpl.nev} - ${partnerName}` : tpl.nev)

    setTemplateSablonId(tpl.id)
    setSubject(formattedSubj)
    setBody(tpl.tartalom)
    setTemplatePickerOpen(false)
    setUnifiedModalOpen(true)
  }

  // Sablon választás a legördülőből
  const handleSelectTemplate = (sablonId: string | null) => {
    if (!sablonId) return
    setTemplateSablonId(sablonId)
    if (sablonId === "egyedi") {
      return
    }
    const sab = allTemplates.find((s) => s.id === sablonId)
    if (sab) {
      setBody(sab.tartalom)
      const partnerName = partnerInfo?.nev || ""
      const subj = sab.targy
        ? (partnerName ? `${sab.targy} - ${partnerName}` : sab.targy)
        : (partnerName ? `${sab.nev} - ${partnerName}` : sab.nev)
      setSubject(subj)
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

  // EGYSÉGES VÁLASZLEVÉL KÜLDÉSE (Szöveg + Sablon + Csatolt PDF)
  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) {
      toast.error("A levél tárgyának megadása kötelező!")
      return
    }
    if (!body.trim() && !attachedFile) {
      toast.error("Kérjük, írjon levélszöveget vagy csatoljon egy PDF fájlt!")
      return
    }

    if (deliveryMode === "email") {
      if (!recipientEmail.trim()) {
        toast.error("Kérjük, adja meg a címzett e-mail címét!")
        return
      }
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.set("targy", subject.trim())
      formData.set("tartalom", body.trim())
      formData.set("cimzett", partnerInfo?.nev || "Partnerünk")
      formData.set("sablon_tipus", templateSablonId)
      formData.set("hivatkozas", iktatoszam || "")
      formData.set("expediteMode", deliveryMode)

      if (partnerInfo?.id) {
        formData.set("partnerId", partnerInfo.id)
      }

      if (deliveryMode === "email") {
        formData.set("recipientEmail", recipientEmail.trim())
        formData.set("emailSubject", subject.trim())
        formData.set(
          "emailMessage",
          body.trim() || `Tisztelt ${partnerInfo?.nev || "Partnerünk"}!\n\nMellékelten továbbítjuk a(z) ${iktatoszam || ""} ügyirathoz tartozó "${subject.trim()}" kimenő iratunkat.\n\nÜdvözlettel,\neaisyDocs`
        )
        if (saveToPartner && partnerInfo?.id) {
          formData.set("saveToPartnerId", partnerInfo.id)
        }
      } else if (deliveryMode === "posta") {
        formData.set("postalTracking", postalTracking.trim())
        formData.set("postalRecipient", partnerInfo?.nev || "Partner")
        formData.set("postalAddress", partnerInfo?.cim || "")
      }

      if (attachedFile) {
        formData.set("attachment", attachedFile)
      }

      const res = await generateAndExpediteReply(ugyiratId, formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        if (res.dispatched) {
          toast.success(
            deliveryMode === "email"
              ? (attachedFile
                  ? `Válaszlevél és csatolt PDF (${attachedFile.name}) sikeresen elküldve (${recipientEmail.trim()})!`
                  : `Válaszlevél sikeresen elküldve e-mailben (${recipientEmail.trim()})!`)
              : (attachedFile
                  ? "Kimenő levél és csatolt PDF iktatva, postai feladás rögzítve!"
                  : "Kimenő levél iktatva, postai feladás rögzítve!")
          )
        } else if (res.expediteError) {
          toast.warning(`Irat iktatva, de a kiküldés hibát adott: ${res.expediteError}`)
        } else {
          toast.success(
            attachedFile
              ? "Kimenő válaszlevél és csatolt PDF sikeresen iktatva az ügyiratba!"
              : "Kimenő válaszlevél sikeresen iktatva az ügyiratba!"
          )
        }
        setUnifiedModalOpen(false)
        setAttachedFile(null)
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (partnerInfo?.email && !recipientEmail) setRecipientEmail(partnerInfo.email)
                setUnifiedModalOpen(true)
              }}
              disabled={!canEdit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium h-9 flex items-center justify-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Válaszlevél készítése és küldése</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (partnerInfo?.email && !recipientEmail) setRecipientEmail(partnerInfo.email)
                setTemplatePickerOpen(true)
              }}
              disabled={!canEdit}
              className="text-xs font-medium h-9 flex items-center justify-center gap-1.5 border-border/80 hover:bg-muted"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">Sablonok katalógusa</span>
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
                Kattintson a fenti gombok egyikére válaszlevél szerkesztéséhez, sablon kiválasztásához vagy PDF melléklet csatolásához.
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
                    {doc.irat_fajl && doc.irat_fajl.length === 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={`${doc.irat_fajl[0].eredeti_fajlnev} megtekintése`}
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
                    {doc.irat_fajl && doc.irat_fajl.length > 1 && (
                      <div className="flex items-center gap-1">
                        {doc.irat_fajl.map((f, fIdx) => (
                          <Button
                            key={f.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            title={`${f.eredeti_fajlnev} megtekintése`}
                            className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted border-border/60 max-w-[100px]"
                            onClick={() => {
                              setSelectedFajl(f)
                              setSelectedIratId(doc.id)
                              setViewerOpen(true)
                            }}
                          >
                            {fIdx === 0 ? <Eye className="h-3 w-3 shrink-0" /> : <Paperclip className="h-3 w-3 text-primary shrink-0" />}
                            <span className="truncate">{f.eredeti_fajlnev}</span>
                          </Button>
                        ))}
                      </div>
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
      {/* EGYSÉGES VÁLASZLEVÉL ÉS KIMENŐ IRAT MODÁL (SZÖVEG + SABLON + PDF CSATOLMÁNY) */}
      {/* ============================================================ */}
      <Dialog open={unifiedModalOpen} onOpenChange={setUnifiedModalOpen}>
        <DialogContent className="sm:max-w-[640px] w-full p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Send className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold truncate">
                    Válaszlevél küldése és iktatása
                  </DialogTitle>
                  <DialogDescription className="text-xs truncate">
                    Szerkessze a levelet, válasszon sablont vagy csatoljon PDF-et, és küldje ki egyben.
                  </DialogDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTemplatePickerOpen(true)}
                className="text-xs h-7 gap-1 text-primary border-primary/30 hover:bg-primary/10 shrink-0 mr-8"
              >
                <Sparkles className="h-3 w-3" />
                <span>Katalógus</span>
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleUnifiedSubmit} className="space-y-4 pt-1 text-xs w-full min-w-0">
            {/* Sablon kiválasztás */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Sablon típusa</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTemplatePickerOpen(true)}
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
                  <SelectItem value="egyedi" className="text-xs py-2">
                    <span className="font-medium text-foreground">Egyedi / Saját szöveg írása (üres sablon)</span>
                  </SelectItem>
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

            {/* Irat tárgya */}
            <div className="space-y-1.5">
              <Label htmlFor="unified-subj" className="text-xs font-medium">
                Irat tárgya <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unified-subj"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Pl. Válasz a beérkezett számlára"
                required
                disabled={loading}
              />
            </div>

            {/* Levél tartalma */}
            <div className="space-y-1.5">
              <Label htmlFor="unified-body" className="text-xs font-medium">
                Levél tartalma (szerkeszthető)
              </Label>
              <Textarea
                id="unified-body"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tisztelt Partnerünk!&#10;&#10;Hivatkozással fenti megkeresésükre..."
                className="font-sans text-xs resize-y w-full leading-relaxed p-3 max-w-full min-w-0"
                disabled={loading}
              />
              <p className="text-[11px] text-muted-foreground">
                A megadott szövegből a rendszer automatikusan hivatalos A4-es PDF iratot generál a fejlécadatokkal.
              </p>
            </div>

            {/* Csatolt PDF dokumentum / melléklet (opcionális feltöltés) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-primary" />
                  <span>Csatolt PDF melléklet (opcionális)</span>
                </Label>
                {attachedFile && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    1 fájl csatolva
                  </Badge>
                )}
              </div>

              {!attachedFile ? (
                <div className="border border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-lg p-3 text-center bg-card">
                  <input
                    id="unified-file"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={loading}
                  />
                  <label htmlFor="unified-file" className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs select-none">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Kattintson ide PDF fájl csatolásához</span>
                    <span className="text-[11px] text-muted-foreground">
                      (Pl. számla, szerződés, kiegészítő igazolás, nyilatkozat)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-xs text-foreground truncate">{attachedFile.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {(attachedFile.size / 1024).toFixed(1)} KB • Csatolva az e-mailhez és az irathoz
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setAttachedFile(null)}
                    disabled={loading}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    title="Csatolt fájl eltávolítása"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                A csatolt PDF a generált válaszlevél mellett csatolmányként kerül kiküldésre és archiválásra.
              </p>
            </div>

            {/* Kézbesítés módja */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs font-medium">Kézbesítés módja</Label>
              <div className="grid grid-cols-3 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("email")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    deliveryMode === "email"
                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate w-full text-center">E-mailben most</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode("posta")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    deliveryMode === "posta"
                      ? "border-warning bg-warning/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Package className="h-4 w-4 text-warning shrink-0" />
                  <span className="truncate w-full text-center">Postai feladás</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode("none")}
                  className={`h-16 rounded-lg border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 min-w-0 p-2 ${
                    deliveryMode === "none"
                      ? "border-info bg-info/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Clock className="h-4 w-4 text-info shrink-0" />
                  <span className="truncate w-full text-center">Csak mentés</span>
                </button>
              </div>

              {deliveryMode === "email" && (
                <div className="space-y-1.5 pt-1.5">
                  <Label htmlFor="unified-email-to" className="text-xs font-medium">
                    Címzett e-mail címe <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="unified-email-to"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="pl. ugyvezeto@partner.hu"
                    required
                    disabled={loading}
                  />
                  {partnerInfo?.id && !partnerInfo.email && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="save-unified-email"
                        checked={saveToPartner}
                        onChange={(e) => setSaveToPartner(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <label htmlFor="save-unified-email" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                        E-mail cím mentése a partner adatlapjára ({partnerInfo.nev})
                      </label>
                    </div>
                  )}
                </div>
              )}

              {deliveryMode === "posta" && (
                <div className="space-y-1.5 pt-1.5">
                  <Label htmlFor="unified-track" className="text-xs font-medium">
                    Postai ragszám / azonosító (opcionális)
                  </Label>
                  <Input
                    id="unified-track"
                    value={postalTracking}
                    onChange={(e) => setPostalTracking(e.target.value)}
                    placeholder="Pl. RL123456789HU"
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => setUnifiedModalOpen(false)} disabled={loading}>
                Mégse
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground flex items-center gap-1.5" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : deliveryMode === "email" ? (
                  <Send className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {deliveryMode === "email"
                  ? "Válaszlevél elküldése és iktatása"
                  : "Kimenő irat iktatása"}
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
