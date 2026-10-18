"use client"

import { useEffect, useRef, useState } from "react"
import {
  Download,
  FileText,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  addComment,
  deleteComment,
  getNoteAttachmentUrl,
  getNoteImageUrls,
  markNotesRead,
  updateComment,
} from "@/app/dossiers/[id]/actions"
import { MentionInput, renderMentionText } from "@/components/mention-input"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"

export interface DossierNoteAttachment {
  id: string
  fajlnev: string
  mime_type?: string | null
  meret_byte?: number | null
}

export interface DossierNote {
  id: string
  szoveg: string
  created_at: string
  szerkesztve_at?: string | null
  user_id?: string | null
  user_name?: string | null
  user_email?: string | null
  user_avatar_url?: string | null
  attachments?: DossierNoteAttachment[]
}

export interface DossierNoteUser {
  id: string
  nev: string
  email?: string
}

interface DossierNotesSheetProps {
  ugyiratId: string
  iktatoszam?: string
  comments: DossierNote[]
  users: DossierNoteUser[]
  canEdit: boolean
  currentUserEmail: string
  currentUserId?: string
  defaultOpen?: boolean
  /** A mások által írt, még nem olvasott megjegyzések száma */
  unreadCount?: number
  /** A felhasználó utolsó olvasási időpontja ehhez az ügyirathoz (null: még sosem nyitotta meg) */
  lastReadAt?: string | null
}

// A szerver oldali korlátokkal egyezően (actions.ts)
const MAX_FILES = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt"]
const ACCEPT_ATTR = ALLOWED_EXT.map((e) => `.${e}`).join(",")

function formatNoteTime(iso: string) {
  return new Date(iso).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
}

function formatDayLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  if (d.toDateString() === now.toDateString()) return "Ma"
  if (d.toDateString() === yesterday.toDateString()) return "Tegnap"
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileExt(name: string) {
  const idx = name.lastIndexOf(".")
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ""
}

function isImage(att: DossierNoteAttachment) {
  return (att.mime_type || "").startsWith("image/")
}

/**
 * Belső megjegyzések – az ügyirat fejlécéből nyitható jobb oldali panel.
 * A megjegyzések az egész ügyirathoz tartoznak, ezért minden fülről elérhetők.
 */
export function DossierNotesSheet({
  ugyiratId,
  iktatoszam,
  comments,
  users,
  canEdit,
  currentUserEmail,
  currentUserId,
  defaultOpen = false,
  unreadCount = 0,
  lastReadAt = null,
}: DossierNotesSheetProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [text, setText] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  // undefined: nincs olvasatlan elválasztó; null: minden más által írt megjegyzés olvasatlan
  const [unreadFrom, setUnreadFrom] = useState<string | null | undefined>(undefined)

  const endRef = useRef<HTMLDivElement>(null)
  const unreadRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestedImages = useRef<Set<string>>(new Set())
  const prevLength = useRef(comments.length)
  const propsRef = useRef({ unreadCount, lastReadAt })
  propsRef.current = { unreadCount, lastReadAt }

  const mentionUsers = users.map((u) => ({ id: u.id, nev: u.nev }))

  const isMine = (c: DossierNote) =>
    (!!currentUserId && c.user_id === currentUserId) ||
    (!!currentUserEmail && c.user_email === currentUserEmail)

  // Megnyitáskor: olvasatlan elválasztó rögzítése, olvasottnak jelölés, görgetés
  useEffect(() => {
    if (!open) {
      // Az aláírt URL-ek rövid életűek – zárásnál eldobjuk, újranyitáskor friss készül
      setImageUrls({})
      requestedImages.current = new Set()
      setUnreadFrom(undefined)
      return
    }

    const { unreadCount: unread, lastReadAt: lastRead } = propsRef.current
    if (unread > 0) {
      setUnreadFrom(lastRead ?? null)
      markNotesRead(ugyiratId)
    }

    const timer = setTimeout(() => {
      if (unreadRef.current) unreadRef.current.scrollIntoView({ block: "center" })
      else endRef.current?.scrollIntoView({ block: "end" })
    }, 80)
    return () => clearTimeout(timer)
  }, [open, ugyiratId])

  // Új megjegyzésnél a lista aljára görgetünk
  useEffect(() => {
    if (open && comments.length > prevLength.current) {
      const timer = setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 60)
      prevLength.current = comments.length
      return () => clearTimeout(timer)
    }
    prevLength.current = comments.length
  }, [open, comments.length])

  // Képcsatolmányok előnézeti URL-jei (egy naplózott kérés a hiányzókra)
  useEffect(() => {
    if (!open) return
    const missing = comments
      .flatMap((c) => c.attachments || [])
      .filter((a) => isImage(a) && !requestedImages.current.has(a.id))
      .map((a) => a.id)
    if (missing.length === 0) return

    missing.forEach((id) => requestedImages.current.add(id))
    getNoteImageUrls(ugyiratId, missing).then((res) => {
      if (res.urls && Object.keys(res.urls).length > 0) {
        setImageUrls((prev) => ({ ...prev, ...res.urls }))
      }
    })
  }, [open, comments, ugyiratId])

  const addFiles = (incoming: File[]) => {
    if (!canEdit || incoming.length === 0) return
    const next = [...files]
    for (const f of incoming) {
      if (!ALLOWED_EXT.includes(fileExt(f.name))) {
        toast.error(`Nem támogatott fájltípus: ${f.name}`)
        continue
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`A fájl túl nagy (max. 10 MB): ${f.name}`)
        continue
      }
      if (next.length >= MAX_FILES) {
        toast.error(`Legfeljebb ${MAX_FILES} fájl csatolható egy megjegyzéshez.`)
        break
      }
      next.push(f)
    }
    setFiles(next)
  }

  const handleSubmit = async () => {
    if ((!text.trim() && files.length === 0) || loading || !canEdit) return
    setLoading(true)

    const fd = new FormData()
    files.forEach((f) => fd.append("files", f))
    const { error } = await addComment(ugyiratId, text, fd)
    setLoading(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success("Megjegyzés hozzáadva!")
      setText("")
      setFiles([])
    }
  }

  const startEdit = (c: DossierNote) => {
    setEditingId(c.id)
    setEditText(c.szoveg)
  }

  const handleSaveEdit = async () => {
    if (!editingId || savingEdit) return
    if (!editText.trim()) {
      toast.error("A megjegyzés nem lehet üres.")
      return
    }
    setSavingEdit(true)
    const { error } = await updateComment(ugyiratId, editingId, editText)
    setSavingEdit(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success("Megjegyzés módosítva.")
      setEditingId(null)
      setEditText("")
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    const { error } = await deleteComment(ugyiratId, deleteTargetId)
    setDeleting(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success("Megjegyzés törölve.")
      if (editingId === deleteTargetId) setEditingId(null)
    }
    setDeleteTargetId(null)
  }

  const openAttachment = async (att: DossierNoteAttachment, mode: "view" | "download") => {
    // A böngésző popup-tiltása miatt az új lapot a kattintás pillanatában nyitjuk meg
    const win = mode === "view" ? window.open("about:blank", "_blank") : null
    const res = await getNoteAttachmentUrl(att.id, mode)
    if (res.error || !res.url) {
      win?.close()
      toast.error(res.error || "A fájl nem nyitható meg.")
      return
    }
    if (mode === "view" && win) {
      win.location.href = res.url
    } else {
      const a = document.createElement("a")
      a.href = res.url
      a.download = att.fajlnev
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  const firstUnreadId =
    unreadFrom === undefined
      ? null
      : comments.find((c) => !isMine(c) && (unreadFrom === null || c.created_at > unreadFrom))?.id ?? null

  const canSend = (text.trim().length > 0 || files.length > 0) && canEdit && !loading

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-1.5 text-xs cursor-pointer"
      >
        <span>Megjegyzések</span>
        {unreadCount > 0 ? (
          <span
            className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums flex items-center justify-center"
            title={`${unreadCount} olvasatlan megjegyzés`}
          >
            {unreadCount}
          </span>
        ) : (
          comments.length > 0 && (
            <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold tabular-nums flex items-center justify-center">
              {comments.length}
            </span>
          )
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-[460px] p-0 gap-0 shadow-none border-border/70"
        >
          {/* Fejléc */}
          <SheetHeader className="p-5 pr-14 border-b border-border/50 bg-muted/10">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-base font-semibold">Belső megjegyzések</SheetTitle>
              {iktatoszam && (
                <span className="text-xs text-muted-foreground font-mono shrink-0">{iktatoszam}</span>
              )}
            </div>
            <SheetDescription className="text-xs">
              Csapatmegjegyzések és @említések az ügyirathoz.
            </SheetDescription>
          </SheetHeader>

          {/* Megjegyzések idővonala */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {comments.length === 0 ? (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-muted-foreground px-6">
                <MessageSquare className="h-6 w-6 mb-2.5 opacity-50" />
                <p className="text-sm font-medium text-foreground">Még nincsenek belső megjegyzések.</p>
                <p className="text-xs mt-1 leading-relaxed">
                  Rögzítsen egy észrevételt, vagy említsen meg egy kollégát a @ jellel.
                </p>
              </div>
            ) : (
              comments.map((comment, index) => {
                const mine = isMine(comment)
                const prev = comments[index - 1]
                const showDay =
                  !prev || new Date(prev.created_at).toDateString() !== new Date(comment.created_at).toDateString()
                const parts = renderMentionText(comment.szoveg, mentionUsers)
                const isEditing = editingId === comment.id
                const attachments = comment.attachments || []
                const images = attachments.filter(isImage)
                const otherFiles = attachments.filter((a) => !isImage(a))

                return (
                  <div key={comment.id} className="space-y-3">
                    {showDay && (
                      <div className="flex items-center gap-3 pt-1">
                        <div className="h-px flex-1 bg-border/60" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {formatDayLabel(comment.created_at)}
                        </span>
                        <div className="h-px flex-1 bg-border/60" />
                      </div>
                    )}

                    {firstUnreadId === comment.id && (
                      <div ref={unreadRef} className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-primary/40" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Olvasatlan üzenetek
                        </span>
                        <div className="h-px flex-1 bg-primary/40" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        mine ? "border-primary/25 bg-primary/5" : "border-border/60 bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar
                            name={comment.user_name}
                            src={comment.user_avatar_url}
                            highlight={mine}
                            className="size-7"
                          />
                          <span className="text-xs font-semibold text-foreground truncate">
                            {comment.user_name || comment.user_email || "Ismeretlen"}
                          </span>
                          {mine && <span className="text-[10px] font-medium text-primary shrink-0">Te</span>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {formatNoteTime(comment.created_at)}
                            {comment.szerkesztve_at && (
                              <span
                                className="ml-1 text-[10px]"
                                title={`Szerkesztve: ${new Date(comment.szerkesztve_at).toLocaleString("hu-HU")}`}
                              >
                                · szerkesztve
                              </span>
                            )}
                          </span>
                          {mine && canEdit && !isEditing && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer outline-none"
                                title="Műveletek"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => startEdit(comment)} className="text-xs cursor-pointer">
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Szerkesztés
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteTargetId(comment.id)}
                                  className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                  Törlés
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <MentionInput
                            users={mentionUsers}
                            value={editText}
                            onChange={setEditText}
                            onSubmit={handleSaveEdit}
                            onEscape={() => setEditingId(null)}
                            disabled={savingEdit}
                            autoFocus
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              Enter: mentés · Esc: mégse
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs cursor-pointer"
                                onClick={() => setEditingId(null)}
                                disabled={savingEdit}
                              >
                                Mégse
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-xs gap-1.5 cursor-pointer"
                                onClick={handleSaveEdit}
                                disabled={savingEdit || !editText.trim()}
                              >
                                {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                                Mentés
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        comment.szoveg.trim() && (
                          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                            {Array.isArray(parts)
                              ? parts.map((part, i) =>
                                  typeof part === "string" ? (
                                    <span key={i}>{part}</span>
                                  ) : (
                                    <span key={i} className="font-semibold text-primary">
                                      @{part.name}
                                    </span>
                                  )
                                )
                              : parts}
                          </p>
                        )
                      )}

                      {/* Csatolmányok */}
                      {images.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {images.map((img) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => openAttachment(img, "view")}
                              className="group relative overflow-hidden rounded-md border border-border/60 bg-muted/30 h-28 cursor-pointer text-left"
                              title={img.fajlnev}
                            >
                              {imageUrls[img.id] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imageUrls[img.id]}
                                  alt={img.fajlnev}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {otherFiles.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {otherFiles.map((att) => {
                            const viewable = att.mime_type === "application/pdf"
                            return (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() => openAttachment(att, viewable ? "view" : "download")}
                                className="w-full flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-left hover:border-primary/40 transition-colors cursor-pointer"
                                title={viewable ? "Megnyitás" : "Letöltés"}
                              >
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-xs text-foreground truncate flex-1">{att.fajlnev}</span>
                                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                  {formatBytes(att.meret_byte)}
                                </span>
                                {!viewable && <Download className="h-4 w-4 text-muted-foreground shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Új megjegyzés */}
          <div
            className={cn(
              "p-4 border-t border-border/50 bg-muted/20 space-y-2 transition-colors",
              dragOver && "bg-primary/5 border-primary/40"
            )}
            onDragOver={(e) => {
              if (!canEdit) return
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              if (!canEdit) return
              e.preventDefault()
              setDragOver(false)
              addFiles(Array.from(e.dataTransfer.files || []))
            }}
          >
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 max-w-full rounded-md border border-border/60 bg-background pl-2 pr-1 py-1 text-xs"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[160px]">{f.name}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {formatBytes(f.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title="Eltávolítás"
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files || []))
                  e.target.value = ""
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canEdit || loading || files.length >= MAX_FILES}
                className="h-9 w-9 shrink-0 cursor-pointer"
                title="Fájl csatolása"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <MentionInput
                users={mentionUsers}
                value={text}
                onChange={setText}
                onSubmit={handleSubmit}
                onPasteFiles={addFiles}
                placeholder={canEdit ? "Írj egy megjegyzést... (@-tal említhetsz)" : "Nincs jogosultsága megjegyzést írni"}
                disabled={!canEdit || loading}
              />
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                className="gap-1.5 cursor-pointer shrink-0 h-9 px-3"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Küldés</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Enter: küldés · Shift+Enter: új sor · @ jellel kollégát említhet meg · fájl húzható vagy beilleszthető
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(o) => {
          if (!o && !deleting) setDeleteTargetId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Megjegyzés törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törli ezt a megjegyzést? A csatolt fájlok is törlődnek. A törlés az eseménynaplóban rögzítésre
              kerül.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Mégse</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="gap-1.5 cursor-pointer"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
