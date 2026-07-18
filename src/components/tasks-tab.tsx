"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Upload, Play, CheckCircle2, Loader2, FileUp } from "lucide-react"
import { toast } from "sonner"
import { addComment, updateDossierStatus, uploadReply } from "@/app/dossiers/[id]/actions"

interface TasksTabProps {
  ugyiratId: string;
  ugyId: string;
  status: string;
  comments: any[];
  canEdit: boolean;
  currentUserEmail: string;
}

export function TasksTab({ ugyiratId, ugyId, status, comments, canEdit, currentUserEmail }: TasksTabProps) {
  const [commentText, setCommentText] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)

  const [statusLoading, setStatusLoading] = useState<string | null>(null)

  const [uploadLoading, setUploadLoading] = useState(false)

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setCommentLoading(true)
    const { error } = await addComment(ugyiratId, commentText)
    setCommentLoading(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success("Megjegyzés hozzáadva!")
      setCommentText("")
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(newStatus)
    const { error } = await updateDossierStatus(ugyiratId, ugyId, newStatus)
    setStatusLoading(null)

    if (error) {
      toast.error(error)
    } else {
      toast.success("Állapot sikeresen módosítva!")
    }
  }

  const handleUploadReply = async (formData: FormData) => {
    setUploadLoading(true)
    const { error } = await uploadReply(ugyiratId, formData)
    setUploadLoading(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success("Válaszlevél sikeresen feltöltve!")
      const form = document.getElementById("reply-form") as HTMLFormElement
      if (form) form.reset()
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Státusz és Munkafolyamat Kezelés */}
      <Card>
        <CardHeader>
          <CardTitle>Munkafolyamat</CardTitle>
          <CardDescription>Az ügyirat állapotának kezelése</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button 
            onClick={() => handleStatusChange("ugyintezes_alatt")}
            disabled={!canEdit || status === "ugyintezes_alatt" || status === "elintezett" || status === "lezart" || statusLoading !== null}
            className="flex-1 min-w-[200px]"
            variant={status === "ugyintezes_alatt" ? "outline" : "default"}
          >
            {statusLoading === "ugyintezes_alatt" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Ügyintézés megkezdése
          </Button>

          <Button 
            onClick={() => handleStatusChange("elintezett")}
            disabled={!canEdit || status === "elintezett" || status === "lezart" || statusLoading !== null}
            className="flex-1 min-w-[200px]"
            variant={status === "elintezett" ? "outline" : "default"}
          >
            {statusLoading === "elintezett" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Elintézettnek jelölés
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Válaszlevél feltöltése */}
        <Card>
          <CardHeader>
            <CardTitle>Válaszlevél feltöltése</CardTitle>
            <CardDescription>Kimenő irat csatolása az ügyirathoz</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="reply-form" action={handleUploadReply} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targy">Levél tárgya</Label>
                <Input id="targy" name="targy" required placeholder="Pl. Válasz a bérleti szerződésre" disabled={!canEdit || uploadLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">PDF Fájl</Label>
                <Input id="file" name="file" type="file" accept="application/pdf" required disabled={!canEdit || uploadLoading} />
              </div>
              <Button type="submit" disabled={!canEdit || uploadLoading} className="w-full">
                {uploadLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Feltöltés és csatolás
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 3. Belső Megjegyzések (Chat) */}
        <Card className="flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle>Belső Megjegyzések</CardTitle>
            <CardDescription>Kommunikáció a kollégákkal</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
            {comments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground mt-4">Nincsenek megjegyzések.</p>
            ) : (
              comments.map((comment) => {
                const isMine = comment.user_email === currentUserEmail;
                return (
                  <div key={comment.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1`}>
                    <span className="text-xs text-muted-foreground px-1">{comment.user_name || comment.user_email} • {new Date(comment.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${isMine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                      {comment.szoveg}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
          <div className="p-4 border-t">
            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input 
                value={commentText} 
                onChange={(e) => setCommentText(e.target.value)} 
                placeholder="Írj egy megjegyzést..." 
                disabled={!canEdit || commentLoading}
              />
              <Button type="submit" disabled={!commentText.trim() || !canEdit || commentLoading} size="icon" variant="secondary">
                {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
