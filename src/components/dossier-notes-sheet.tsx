"use client"

import { useEffect, useRef, useState } from "react"
import { MessageSquare, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { addComment } from "@/app/dossiers/[id]/actions"
import { MentionInput, renderMentionText } from "@/components/mention-input"
import { UserAvatar } from "@/components/user-avatar"

export interface DossierNote {
  id: string
  szoveg: string
  created_at: string
  user_id?: string | null
  user_name?: string | null
  user_email?: string | null
  user_avatar_url?: string | null
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
}

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
}: DossierNotesSheetProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Megnyitáskor és új megjegyzésnél a lista aljára görgetünk
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 60)
    return () => clearTimeout(timer)
  }, [open, comments.length])

  const handleSubmit = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    const { error } = await addComment(ugyiratId, text)
    setLoading(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success("Megjegyzés hozzáadva!")
      setText("")
    }
  }

  const mentionUsers = users.map((u) => ({ id: u.id, nev: u.nev }))

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
        {comments.length > 0 && (
          <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums flex items-center justify-center">
            {comments.length}
          </span>
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
                const isMine =
                  (!!currentUserId && comment.user_id === currentUserId) ||
                  (!!currentUserEmail && comment.user_email === currentUserEmail)
                const prev = comments[index - 1]
                const showDay =
                  !prev || new Date(prev.created_at).toDateString() !== new Date(comment.created_at).toDateString()
                const parts = renderMentionText(comment.szoveg, mentionUsers)

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

                    <div
                      className={`rounded-lg border p-3 ${
                        isMine ? "border-primary/25 bg-primary/5" : "border-border/60 bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar
                            name={comment.user_name}
                            src={comment.user_avatar_url}
                            highlight={isMine}
                            className="size-7"
                          />
                          <span className="text-xs font-semibold text-foreground truncate">
                            {comment.user_name || comment.user_email || "Ismeretlen"}
                          </span>
                          {isMine && (
                            <span className="text-[10px] font-medium text-primary shrink-0">Te</span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {formatNoteTime(comment.created_at)}
                        </span>
                      </div>

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
                    </div>
                  </div>
                )
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Új megjegyzés */}
          <div className="p-4 border-t border-border/50 bg-muted/20 space-y-2">
            <div className="flex gap-2">
              <MentionInput
                users={mentionUsers}
                value={text}
                onChange={setText}
                onSubmit={handleSubmit}
                placeholder={canEdit ? "Írj egy megjegyzést... (@-tal említhetsz)" : "Nincs jogosultsága megjegyzést írni"}
                disabled={!canEdit || loading}
              />
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() || !canEdit || loading}
                className="gap-1.5 cursor-pointer shrink-0 h-9 px-3"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Küldés</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Enter: küldés · A @ jellel kollégát említhet meg, aki értesítést kap.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
