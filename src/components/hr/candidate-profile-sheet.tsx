"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Mail, Phone, Calendar, Briefcase, FileText, Loader2, ExternalLink, Save, Trash2, XCircle, CheckCircle } from "lucide-react"
import { generateCvSignedUrl, updateCandidateNote, updateCandidateStatus } from "@/app/hr/recruitment/actions"
import { toast } from "sonner"

interface Candidate {
  id: string
  nev: string
  email: string
  telefon?: string
  uzenet?: string
  statusz: string
  naptar_jegyzet?: string
  cv_storage_path?: string
  created_at: string
  hr_munkakor?: {
    megnevezes: string
  }
  pozicio?: string // Fallback
}

export function CandidateProfileSheet({ 
  candidate, 
  isOpen, 
  onClose,
  onUpdate,
  onDelete
}: { 
  candidate: Candidate | null,
  isOpen: boolean,
  onClose: () => void,
  onUpdate?: (candidate: any) => void,
  onDelete?: (id: string) => void
}) {
  const [isLoadingCv, setIsLoadingCv] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  useEffect(() => {
    if (candidate) {
      setNoteText("")
    }
  }, [candidate])

  const handleSaveNote = async () => {
    if (!candidate || !noteText.trim()) return
    setIsSavingNote(true)
    try {
      const res = await updateCandidateNote(candidate.id, noteText)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Jegyzet elmentve!")
        setNoteText("") // clear input after success
        if (onUpdate && res.newNotesString) {
          onUpdate({ id: candidate.id, naptar_jegyzet: res.newNotesString })
        }
      }
    } catch (e) {
      toast.error("Váratlan hiba történt a jegyzet mentésekor.")
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!candidate || candidate.statusz === newStatus) return
    setIsChangingStatus(true)
    try {
      const res = await updateCandidateStatus(candidate.id, newStatus)
      if (res.error) {
        toast.error("Hiba státuszváltáskor: " + res.error)
      } else {
        toast.success("Státusz frissítve!")
        if (onUpdate) onUpdate({ id: candidate.id, statusz: newStatus })
      }
    } catch (e) {
      toast.error("Váratlan hiba történt.")
    } finally {
      setIsChangingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "uj": return <Badge variant="default" className="bg-blue-500 shadow-sm">Új jelentkező</Badge>
      case "eloszurt": return <Badge variant="secondary" className="shadow-sm">Előszűrt</Badge>
      case "interju": return <Badge variant="default" className="bg-purple-500 shadow-sm">Interjú</Badge>
      case "ajanlat": return <Badge variant="default" className="bg-amber-500 shadow-sm">Ajánlat</Badge>
      case "elfogadva": return <Badge variant="default" className="bg-green-500 shadow-sm">Elfogadva</Badge>
      case "elutasitva": return <Badge variant="destructive" className="shadow-sm">Elutasítva</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleOpenCv = async () => {
    if (!candidate?.cv_storage_path) {
      toast.error("Nincs feltöltött önéletrajz.")
      return
    }

    setIsLoadingCv(true)
    try {
      const result = await generateCvSignedUrl(candidate.id, candidate.cv_storage_path)
      
      if (result.error) {
        toast.error(result.error)
      } else if (result.signedUrl) {
        toast.success("Ideiglenes link legenerálva. Megnyitás...")
        window.open(result.signedUrl, "_blank")
      }
    } catch (error) {
      console.error("Hiba CV megnyitásakor:", error)
      toast.error("Váratlan hiba történt az önéletrajz lekérésekor.")
    } finally {
      setIsLoadingCv(false)
    }
  }

  if (!candidate) return null

  const munkakorNev = candidate.hr_munkakor?.megnevezes || candidate.pozicio || "Nincs megadva"
  
  let parsedNotes: any[] = []
  if (candidate.naptar_jegyzet) {
    try {
      parsedNotes = JSON.parse(candidate.naptar_jegyzet)
      if (!Array.isArray(parsedNotes)) parsedNotes = []
    } catch (e) {
      parsedNotes = [{ date: candidate.created_at, author: "Korábbi jegyzet", text: candidate.naptar_jegyzet }]
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md w-full p-0 flex flex-col overflow-hidden border-l-0 shadow-2xl">
        
        {/* Premium Header with subtle gradient */}
        <div className="bg-gradient-to-b from-primary/10 to-background border-b relative">
          <SheetHeader className="p-8 pb-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 shadow-sm relative">
                <span className="text-2xl font-bold text-primary tracking-tight">
                  {candidate.nev.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
                <div className="absolute -bottom-2">
                  {getStatusBadge(candidate.statusz)}
                </div>
              </div>
              
              <div className="space-y-3 w-full max-w-xs mx-auto pt-2">
                <div>
                  <SheetTitle className="text-2xl font-bold tracking-tight text-foreground">{candidate.nev}</SheetTitle>
                  <SheetDescription className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full inline-flex w-fit mx-auto mt-1">
                    <Briefcase className="w-4 h-4 text-primary" /> {munkakorNev}
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="h-px bg-border flex-1"></span>
              Elérhetőségek
              <span className="h-px bg-border flex-1"></span>
            </h4>
            
            <div className="grid gap-3 mt-4">
              <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">E-mail cím</p>
                  <a href={`mailto:${candidate.email}`} className="text-sm font-medium hover:text-primary transition-colors truncate block">{candidate.email}</a>
                </div>
              </div>
              
              {candidate.telefon && (
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform text-primary">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Telefonszám</p>
                    <a href={`tel:${candidate.telefon}`} className="text-sm font-medium hover:text-primary transition-colors block tabular-nums">{candidate.telefon}</a>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform text-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Jelentkezés ideje</p>
                  <span className="text-sm font-medium tabular-nums">{new Date(candidate.created_at).toLocaleDateString("hu-HU")}</span>
                </div>
              </div>
            </div>
          </div>

          {candidate.uzenet && (
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="h-px bg-border flex-1"></span>
                Bemutatkozás / Motiváció
                <span className="h-px bg-border flex-1"></span>
              </h4>
              <Accordion className="w-full">
                <AccordionItem value="motivation" className="border rounded-xl px-4 bg-muted/20 shadow-sm overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                    Üzenet megtekintése
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pb-4 pt-1">
                    {candidate.uzenet}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="h-px bg-border flex-1"></span>
              Csatolt dokumentumok
              <span className="h-px bg-border flex-1"></span>
            </h4>
            
            <div className="group relative bg-card border shadow-sm rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all overflow-hidden mt-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="bg-red-500/10 text-red-600 rounded-lg p-3 group-hover:scale-110 transition-transform shadow-sm">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h5 className="font-semibold text-base truncate">Önéletrajz (CV)</h5>
                    <p className="text-sm text-muted-foreground truncate">
                      {candidate.cv_storage_path ? "Sikeresen feltöltve" : "Nincs feltöltött fájl"}
                    </p>
                  </div>
                </div>
                
                <Button 
                  className="w-full shadow-sm group-hover:shadow transition-all font-semibold rounded-lg"
                  variant="default"
                  disabled={!candidate.cv_storage_path || isLoadingCv}
                  onClick={handleOpenCv}
                >
                  {isLoadingCv ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                  {isLoadingCv ? "Letöltés és hitelesítés..." : "Biztonságos megtekintés"}
                </Button>
              </div>
            </div>
            
            <p className="text-[11px] text-muted-foreground text-center mt-3 max-w-[280px] mx-auto leading-relaxed">
              A GDPR előírásoknak megfelelően a fájlok megtekintése egyszer használatos, 60 másodpercig érvényes linken történik. Minden megnyitás rögzítésre kerül az Audit Naplóban.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="h-px bg-border flex-1"></span>
              HR Jegyzetek & Értékelés
              <span className="h-px bg-border flex-1"></span>
            </h4>
            
            {parsedNotes.length > 0 && (
              <div className="space-y-3 mt-4 max-h-48 overflow-y-auto pr-2">
                {parsedNotes.map((note, idx) => (
                  <div key={idx} className="bg-muted/50 p-3 rounded-xl border border-muted-foreground/10 text-sm space-y-2">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{note.author}</span>
                      <span>{new Date(note.date).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{note.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 mt-4">
              <Textarea 
                placeholder="Írd ide az új interjú tapasztalatokat, bérigényt..." 
                className="min-h-[80px] resize-none focus-visible:ring-primary/20 bg-muted/30"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteText.trim()}
              >
                {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {isSavingNote ? "Mentés..." : "Új jegyzet hozzáadása"}
              </Button>
            </div>
          </div>
          
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 border-t bg-muted/20 flex gap-2">
          <Button 
            variant="default" 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleStatusChange("elfogadva")}
            disabled={candidate.statusz === "elfogadva" || isChangingStatus}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Elfogad
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={() => handleStatusChange("elutasitva")}
            disabled={candidate.statusz === "elutasitva" || isChangingStatus}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Elutasít
          </Button>
          <AlertDialog>
            <AlertDialogTrigger 
              className={`${buttonVariants({ variant: "outline" })} flex-none text-destructive hover:text-destructive hover:bg-destructive/10 px-3`}
            >
              <Trash2 className="w-4 h-4" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Biztosan törölni szeretnéd a jelöltet?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ez a művelet nem vonható vissza. A jelölt összes adata, önéletrajza és a hozzá tartozó jegyzetek véglegesen törlésre kerülnek.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Mégse</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    if (onDelete) onDelete(candidate.id)
                  }}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Törlés
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  )
}
