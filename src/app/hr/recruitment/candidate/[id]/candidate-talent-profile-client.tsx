"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { differenceInDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { KpiCard } from "@/components/kpi-card"
import {
  ArrowLeft,
  Mail,
  Phone,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  generateCvSignedUrl,
  updateCandidateNote,
  deleteCandidate,
  assignCandidateToPostingAction,
} from "@/app/hr/recruitment/actions"
import {
  AVAILABILITY_LABELS,
  SOURCE_LABELS,
} from "@/utils/hr/career-constants"

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  uj: { label: "Új jelentkező", className: "bg-info/10 text-info border-info/30" },
  eloszurt: { label: "Előszűrt", className: "bg-warning/10 text-warning border-warning/30" },
  szures: { label: "Előszűrt", className: "bg-warning/10 text-warning border-warning/30" },
  interju: { label: "Interjú", className: "bg-primary/10 text-primary border-primary/30" },
  ajanlat: { label: "Ajánlat", className: "bg-success/10 text-success border-success/30" },
  elfogadva: { label: "Elfogadva", className: "bg-success/15 text-success border-success/30" },
  elutasitva: { label: "Elutasítva", className: "bg-destructive/10 text-destructive border-destructive/30" },
  talent_pool: { label: "Tehetségbázis", className: "bg-muted text-muted-foreground border-border" },
}

export interface CandidateHistoryItem {
  id: string
  nev: string
  email?: string | null
  telefon?: string | null
  linkedin_url?: string | null
  berigeny?: number | null
  kezdesi_ido?: string | null
  forras?: string | null
  palyazati_kod?: string | null
  uzenet?: string | null
  statusz: string
  cv_storage_path?: string | null
  ai_status?: string | null
  ai_summary?: string | null
  ai_skills?: string[] | null
  ai_relevance_score?: number | null
  naptar_jegyzet?: string | null
  megpalyazott_terulet?: string | null
  allashirdetes_id?: string | null
  megpalyazott_munkakor_id?: string | null
  created_at?: string
  hr_allashirdetes?: { cim?: string } | null
  hr_munkakor?: { megnevezes?: string } | null
}

export interface OpenPostingOption {
  id: string
  cim: string
  is_internal?: boolean | null
  publikus?: boolean | null
  hr_munkakor?: { megnevezes?: string } | null
}

export function CandidateTalentProfileClient({
  candidate: initialCandidate,
  applicationHistory: initialHistory,
  openPostings,
  isReadOnly = false,
}: {
  candidate: CandidateHistoryItem
  applicationHistory: CandidateHistoryItem[]
  openPostings: OpenPostingOption[]
  isReadOnly?: boolean
}) {
  const router = useRouter()
  const [candidate, setCandidate] = useState<CandidateHistoryItem>(initialCandidate)
  const [history, setHistory] = useState<CandidateHistoryItem[]>(initialHistory)
  const [selectedPostingId, setSelectedPostingId] = useState<string>(
    openPostings[0]?.id || ""
  )
  const [isAssigning, setIsAssigning] = useState(false)
  const [isLoadingCv, setIsLoadingCv] = useState(false)
  const [isParsingAI, setIsParsingAI] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Összesített készségek a jelölt összes jelentkezéséből
  const aggregatedSkills = useMemo(() => {
    const skillSet = new Set<string>()
    if (candidate.ai_skills) {
      candidate.ai_skills.forEach((s) => skillSet.add(s))
    }
    history.forEach((item) => {
      item.ai_skills?.forEach((s) => skillSet.add(s))
    })
    return Array.from(skillSet)
  }, [candidate.ai_skills, history])

  // Legfrissebb AI összefoglaló
  const bestSummary = useMemo(() => {
    if (candidate.ai_summary) return candidate.ai_summary
    const withSummary = history.find((h) => h.ai_summary)
    return withSummary?.ai_summary || null
  }, [candidate.ai_summary, history])

  // Legfrissebb CV útvonal
  const activeCvPath = useMemo(() => {
    if (candidate.cv_storage_path) return candidate.cv_storage_path
    const withCv = history.find((h) => h.cv_storage_path)
    return withCv?.cv_storage_path || null
  }, [candidate.cv_storage_path, history])

  // GDPR 180 napos megőrzési számítás a legutóbbi jelentkezéstől
  const latestDateStr = history[0]?.created_at || candidate.created_at
  const daysElapsed = latestDateStr
    ? differenceInDays(new Date(), new Date(latestDateStr))
    : 0
  const remainingGdprDays = Math.max(0, 180 - daysElapsed)

  // Formázott bérigény és felmondási idő
  const salaryValue =
    candidate.berigeny || history.find((h) => h.berigeny)?.berigeny || null
  const formattedSalary = salaryValue
    ? `${new Intl.NumberFormat("hu-HU").format(salaryValue)} Ft / hó`
    : "Nincs megadva"

  const rawAvailability =
    candidate.kezdesi_ido || history.find((h) => h.kezdesi_ido)?.kezdesi_ido || null
  const availabilityLabel = rawAvailability
    ? AVAILABILITY_LABELS[rawAvailability] || rawAvailability
    : "Nincs megadva"

  const phoneValue =
    candidate.telefon || history.find((h) => h.telefon)?.telefon || null
  const linkedinValue =
    candidate.linkedin_url ||
    history.find((h) => h.linkedin_url)?.linkedin_url ||
    null

  // HR jegyzetek kinyerése
  const parsedNotes = useMemo(() => {
    if (!candidate.naptar_jegyzet) return []
    try {
      const parsed = JSON.parse(candidate.naptar_jegyzet)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return [
        {
          date: candidate.created_at,
          author: "Korábbi jegyzet",
          text: candidate.naptar_jegyzet,
        },
      ]
    }
  }, [candidate.naptar_jegyzet, candidate.created_at])

  async function handleAssignToPosting() {
    if (!selectedPostingId) {
      toast.error("Kérlek, válassz ki egy nyitott álláshirdetést!")
      return
    }
    setIsAssigning(true)
    try {
      const res = await assignCandidateToPostingAction(
        candidate.id,
        selectedPostingId
      )
      if (res.error) {
        toast.error(res.error)
      } else if (res.record) {
        toast.success(
          "A jelölt sikeresen behívva a kiválasztott pozíció előszűrési folyamatába!"
        )
        const updatedRecord = res.record as CandidateHistoryItem
        setHistory((prev) => {
          const exists = prev.some((h) => h.id === updatedRecord.id)
          return exists
            ? prev.map((h) => (h.id === updatedRecord.id ? updatedRecord : h))
            : [updatedRecord, ...prev]
        })
      }
    } catch {
      toast.error("Hiba történt a jelölt behívása során.")
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleOpenCv() {
    if (!activeCvPath) {
      toast.error("Nincs feltöltött önéletrajz.")
      return
    }
    setIsLoadingCv(true)
    try {
      const result = await generateCvSignedUrl(candidate.id, activeCvPath)
      if (result.error) {
        toast.error(result.error)
      } else if (result.signedUrl) {
        window.open(result.signedUrl, "_blank")
      }
    } catch {
      toast.error("Váratlan hiba történt az önéletrajz megnyitásakor.")
    } finally {
      setIsLoadingCv(false)
    }
  }

  async function handleRunAI() {
    if (!activeCvPath) return
    setIsParsingAI(true)
    try {
      const res = await fetch("/api/hr/parse-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toborzas_id: candidate.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Hiba az AI elemzés során")
      toast.success("AI Kompetencia-elemzés frissítve!")
      setCandidate((prev) => ({
        ...prev,
        ai_status: "completed",
        ai_summary: data.result.summary,
        ai_relevance_score: data.result.relevance_score,
        ai_skills: data.result.skills,
      }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ismeretlen hiba"
      toast.error(msg)
    } finally {
      setIsParsingAI(false)
    }
  }

  async function handleSaveNote() {
    if (!noteText.trim()) return
    setIsSavingNote(true)
    try {
      const res = await updateCandidateNote(candidate.id, noteText.trim())
      if (res.error) {
        toast.error(res.error)
      } else if (res.newNotesString) {
        toast.success("Tehetségbázis jegyzet elmentve!")
        setNoteText("")
        setCandidate((prev) => ({
          ...prev,
          naptar_jegyzet: res.newNotesString,
        }))
      }
    } catch {
      toast.error("Hiba történt a jegyzet mentésekor.")
    } finally {
      setIsSavingNote(false)
    }
  }

  async function handleDeleteCandidate() {
    setIsDeleting(true)
    try {
      const res = await deleteCandidate(candidate.id)
      if (res?.error) {
        toast.error(res.error)
        setIsDeleting(false)
        return
      }
      toast.success("Jelölt törölve a tehetségbázisból.")
      router.push("/hr/recruitment?tab=talent-pool")
    } catch {
      toast.error("Hiba történt a törlés során.")
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Vissza navigáció és Fejléc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1.5">
          <Link
            href="/hr/recruitment?tab=talent-pool"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Vissza a Talent Pool listához</span>
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {candidate.nev}
            </h1>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary text-xs font-medium"
            >
              Tehetségbázis Profil
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Összesített szakmai kompetenciaprofil, pályázati előzmények és közvetlen pozícióhoz rendelés.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!activeCvPath || isLoadingCv}
            onClick={handleOpenCv}
            className="text-xs gap-1.5"
          >
            {isLoadingCv ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-primary" />
            )}
            <span>Önéletrajz (CV) megnyitása</span>
          </Button>
        </div>
      </div>

      {/* 4 KPI Kártya (Linear Flat Grid) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pályázatok Száma"
          value={`${history.length} jelentkezés`}
          sub="Eddigi pályázatok a vállalatnál"
        />
        <KpiCard
          label="Bruttó Bérigény"
          value={formattedSalary}
          sub="Jelölt által megadott sáv"
          highlight={Boolean(salaryValue)}
        />
        <KpiCard
          label="Munkába Állás"
          value={availabilityLabel}
          sub="Kezdés / felmondási idő"
        />
        <KpiCard
          label="GDPR Megőrzési Idő"
          value={`${remainingGdprDays} nap`}
          sub="Hátralévő adatkezelési engedély (180 napból)"
          highlight={remainingGdprDays <= 30}
        />
      </div>

      {/* Kétoszlopos elrendezés: Bal (Kompetenciák, Előzmények, Jegyzetek) + Jobb (Behívás pozícióra, Elérhetőségek, GDPR) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* BAL OSZLOP */}
        <div className="space-y-6">
          {/* 1. Összesített AI Szakmai és Kompetencia Profil */}
          <Card className="shadow-none">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Szakmai Összefoglaló és Kulcskompetenciák (AI)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  A jelölt önéletrajza és összes eddigi jelentkezése alapján összevont szakmai profil
                </CardDescription>
              </div>
              {activeCvPath && !isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isParsingAI}
                  onClick={handleRunAI}
                  className="h-8 text-xs shrink-0"
                >
                  {isParsingAI && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  )}
                  <span>
                    {bestSummary ? "AI elemzés frissítése" : "AI elemzés futtatása"}
                  </span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {bestSummary ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/90 leading-relaxed">
                  {bestSummary}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {activeCvPath
                    ? "Még nem készült AI szakmai összefoglaló ehhez a jelölthöz. Kattints az „AI elemzés futtatása” gombra."
                    : "A jelölt nem csatolt önéletrajzot, így automatikus AI összefoglaló nem áll rendelkezésre."}
                </p>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kinyert készségek és kompetenciák ({aggregatedSkills.length} db)
                </p>
                {aggregatedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {aggregatedSkills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs font-normal px-2.5 py-0.5"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nincsenek rögzített kulcskompetenciák.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Pályázati Előzmények a Vállalatnál */}
          <Card className="shadow-none">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold">
                Pályázati előzmények a vállalatnál ({history.length})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                A jelölt által eddig megpályázott pozíciók, jelentkezési források és kiválasztási státuszok
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold">
                      Megpályázott pozíció
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Azonosító / Forrás
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Dátum
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Pozíció Relevancia
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Státusz
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const posTitle =
                      item.hr_allashirdetes?.cim ||
                      item.hr_munkakor?.megnevezes ||
                      (item.megpalyazott_terulet
                        ? `Nyitott jelentkezés (${item.megpalyazott_terulet})`
                        : "Általános jelentkezés")
                    const statusBadge = STATUS_BADGE_MAP[item.statusz] || {
                      label: item.statusz,
                      className: "bg-muted text-muted-foreground border-border",
                    }
                    const sourceLabel = item.forras
                      ? SOURCE_LABELS[item.forras] || item.forras
                      : "Karrieroldal"

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="py-3 font-medium text-xs text-foreground">
                          {item.allashirdetes_id ? (
                            <Link
                              href={`/hr/recruitment/posting/${item.allashirdetes_id}`}
                              className="hover:text-primary transition-colors"
                            >
                              {posTitle}
                            </Link>
                          ) : (
                            posTitle
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.palyazati_kod && (
                              <span className="font-mono text-[11px] text-primary">
                                {item.palyazati_kod}
                              </span>
                            )}
                            <span>• {sourceLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground tabular-nums">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString("hu-HU")
                            : "–"}
                        </TableCell>
                        <TableCell className="py-3 text-xs tabular-nums">
                          {typeof item.ai_relevance_score === "number" ? (
                            <span className="font-semibold text-foreground">
                              {item.ai_relevance_score}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Badge
                            variant="outline"
                            className={cn("text-[11px] font-medium", statusBadge.className)}
                          >
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 3. Bemutatkozás és HR Jegyzetek */}
          <Card className="shadow-none">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold">
                Bemutatkozás és HR Tehetségbázis Jegyzetek
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                A jelölt motivációs üzenete és a toborzási csapat belső megjegyzései
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {candidate.uzenet && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Jelölt bemutatkozása / üzenete
                  </p>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {candidate.uzenet}
                  </p>
                </div>
              )}

              {parsedNotes.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rögzített HR jegyzetek
                  </p>
                  {parsedNotes.map((note: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/60 bg-card p-3 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {note.author || "HR"}
                        </span>
                        <span className="tabular-nums">
                          {note.date
                            ? new Date(note.date).toLocaleString("hu-HU", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "–"}
                        </span>
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!isReadOnly && (
                <div className="space-y-2 pt-1">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Írj belső megjegyzést a jelölthöz (pl. milyen jövőbeli pozícióra lehet alkalmas, interjú benyomások)..."
                    className="min-h-[80px] text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSavingNote || !noteText.trim()}
                      onClick={handleSaveNote}
                      className="text-xs gap-1.5"
                    >
                      {isSavingNote ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Jegyzet mentése</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* JOBB OSZLOP */}
        <div className="space-y-6">
          {/* 1. Behívás / Hozzárendelés nyitott álláshirdetéshez */}
          {!isReadOnly && (
            <Card className="border-primary/30 bg-primary/[0.02] shadow-none">
              <CardHeader className="pb-3 border-b border-primary/20">
                <CardTitle className="text-sm font-semibold text-primary">
                  Behívás nyitott álláshirdetésre
                </CardTitle>
                <CardDescription className="text-xs">
                  Válaszd ki, melyik jelenleg aktív pozíció kiválasztási folyamatába (Kanban táblájára) szeretnéd beemelni a jelöltet.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {openPostings.length > 0 ? (
                  <>
                    <Select
                      value={selectedPostingId}
                      onValueChange={(val) => val && setSelectedPostingId(val)}
                    >
                      <SelectTrigger className="w-full bg-background text-xs">
                        <SelectValue placeholder="Válassz nyitott pozíciót...">
                          {
                            openPostings.find((p) => p.id === selectedPostingId)
                              ?.cim
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {openPostings.map((p) => (
                          <SelectItem key={p.id} value={p.id} label={p.cim}>
                            <div className="flex items-center justify-between gap-2">
                              <span>{p.cim}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {p.is_internal ? "(Belső)" : "(Publikus)"}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isAssigning || !selectedPostingId}
                      onClick={handleAssignToPosting}
                      className="w-full text-xs gap-1.5"
                    >
                      {isAssigning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Behívás a pozíció kiválasztási folyamatába</span>
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Jelenleg nincs aktív álláshirdetés a vállalatnál.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 2. Elérhetőségek */}
          <Card className="shadow-none">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold">
                Személyes elérhetőségek
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  E-mail cím:
                </span>
                {candidate.email ? (
                  <a
                    href={`mailto:${candidate.email}`}
                    className="font-medium text-foreground hover:text-primary underline truncate max-w-[200px]"
                  >
                    {candidate.email}
                  </a>
                ) : (
                  <span>–</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  Telefonszám:
                </span>
                {phoneValue ? (
                  <a
                    href={`tel:${phoneValue}`}
                    className="font-medium text-foreground hover:text-primary tabular-nums"
                  >
                    {phoneValue}
                  </a>
                ) : (
                  <span>–</span>
                )}
              </div>

              {linkedinValue && (
                <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
                  <span className="text-muted-foreground">Portfólió / LinkedIn:</span>
                  <a
                    href={linkedinValue}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>Megnyitás</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. GDPR és Törlés a Tehetségbázisból */}
          {!isReadOnly && (
            <Card className="shadow-none">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold">
                  Adatvédelem és GDPR kezelés
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  A jelölt adatai és önéletrajza a hozzájárulástól számított 180 napig tárolhatók a tehetségbázisban.
                </p>

                <AlertDialog>
                  <AlertDialogTrigger
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Jelölt törlése a tehetségbázisból</span>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Biztosan törölni szeretnéd a jelöltet a tehetségbázisból?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Ez a művelet véglegesen eltávolítja a jelölt rekordját és önéletrajzát a rendszerből.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Mégsem</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={isDeleting}
                        onClick={handleDeleteCandidate}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Törlés..." : "Végleges törlés"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
