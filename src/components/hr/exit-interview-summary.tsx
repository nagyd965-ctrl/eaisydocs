import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/kpi-card"
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Sparkles, 
  Briefcase, 
  Building2, 
  Calendar, 
  Compass, 
  HeartHandshake, 
  Search, 
  Filter, 
  Quote, 
  UserCheck, 
  ShieldAlert,
  HelpCircle,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ExitInterviewItem {
  id: string
  felhasznalo_profil?: { nev?: string | null; munkakor?: string | null; reszleg?: string | null } | null
  kilepes_datuma?: string | null
  kilepes_kategoria?: string | null
  kilepes_oka?: string | null
  altalanos_elegedettseg?: number | null
  vezeto_kapcsolat?: number | null
  munkakornyezet_ertekeles?: number | null
  csapat_ertekeles?: number | null
  mi_tetszett?: string | null
  mit_valtoztatna?: string | null
  ajanlana?: boolean | null
  kovetkezo_allomashely?: string | null
  created_at?: string | null
  [key: string]: any
}

interface ExitInterviewSummaryProps {
  interviews: ExitInterviewItem[]
}

const KATEGORIA_LABELS: Record<string, string> = {
  jobb_ajanlat:    "Jobb ajánlat / magasabb bér",
  magnaleti:       "Magánéleti okok",
  elorelep:        "Előrelépési lehetőség máshol",
  vezeto:          "Vezető / management",
  munkakornyezet:  "Munkahelyi légkör / csapat",
  munkakor:        "Munkakör / feladatok",
  tavolsag:        "Távolság / home office hiánya",
  nyugdij:         "Nyugdíjba vonulás",
  egyeb:           "Egyéb ok",
}

const ALLOMASHELY_LABELS: Record<string, string> = {
  versenyzo_ceg:   "Versenytárs / hasonló iparág",
  mas_ipar:        "Más iparág",
  tanulas:         "Továbbtanulás",
  nyugdij:         "Nyugdíj",
  vallalkozas:     "Saját vállalkozás",
  nem_mondja_meg:  "Nem mondja meg",
}

function StarDisplay({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-muted-foreground italic">–</span>
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={cn(
            "w-3.5 h-3.5",
            s <= Math.round(value) ? "fill-warning text-warning" : "fill-transparent text-muted-foreground/25"
          )}
        />
      ))}
      <span className="text-xs font-semibold text-foreground ml-1.5 tabular-nums">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

function avg(arr: (number | null | undefined)[]): number | null {
  const vals = arr.filter((v): v is number => v !== null && v !== undefined && v > 0)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function ExitInterviewSummary({ interviews }: ExitInterviewSummaryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all")
  const [selectedInterview, setSelectedInterview] = useState<ExitInterviewItem | null>(null)

  // Statisztikai összesítés
  const stats = useMemo(() => {
    const total = interviews.length
    if (total === 0) return null

    const avgAltalanos  = avg(interviews.map(i => i.altalanos_elegedettseg))
    const avgVezeto     = avg(interviews.map(i => i.vezeto_kapcsolat))
    const avgKornyezet  = avg(interviews.map(i => i.munkakornyezet_ertekeles))
    const avgCsapat     = avg(interviews.map(i => i.csapat_ertekeles))

    const allRatings = interviews.flatMap(i => [
      i.altalanos_elegedettseg,
      i.vezeto_kapcsolat,
      i.munkakornyezet_ertekeles,
      i.csapat_ertekeles,
    ])
    const avgOsszes = avg(allRatings)

    const ajanlanaCount   = interviews.filter(i => i.ajanlana === true).length
    const nemAjanljaCount = interviews.filter(i => i.ajanlana === false).length
    const answeredAjanlas = ajanlanaCount + nemAjanljaCount
    const ajanlanaPercent = answeredAjanlas > 0 ? Math.round((ajanlanaCount / answeredAjanlas) * 100) : 0

    // Kategória megoszlás
    const kategoriak: Record<string, number> = {}
    interviews.forEach(i => {
      if (i.kilepes_kategoria) {
        kategoriak[i.kilepes_kategoria] = (kategoriak[i.kilepes_kategoria] || 0) + 1
      }
    })

    const allomashely: Record<string, number> = {}
    interviews.forEach(i => {
      if (i.kovetkezo_allomashely) {
        allomashely[i.kovetkezo_allomashely] = (allomashely[i.kovetkezo_allomashely] || 0) + 1
      }
    })

    const topCategoryEntry = Object.entries(kategoriak).sort((a, b) => b[1] - a[1])[0]
    const topCategoryLabel = topCategoryEntry ? (KATEGORIA_LABELS[topCategoryEntry[0]] || topCategoryEntry[0]) : "Nincs adat"
    const topCategoryCount = topCategoryEntry ? topCategoryEntry[1] : 0

    return {
      total,
      avgAltalanos,
      avgVezeto,
      avgKornyezet,
      avgCsapat,
      avgOsszes,
      ajanlanaCount,
      nemAjanljaCount,
      ajanlanaPercent,
      kategoriak,
      allomashely,
      topCategoryLabel,
      topCategoryCount
    }
  }, [interviews])

  // Szűrt interjúk
  const filteredInterviews = useMemo(() => {
    return interviews.filter(i => {
      const name = (i.felhasznalo_profil?.nev || "").toLowerCase()
      const reason = (i.kilepes_oka || "").toLowerCase()
      const liked = (i.mi_tetszett || "").toLowerCase()
      const changes = (i.mit_valtoztatna || "").toLowerCase()
      const q = searchQuery.toLowerCase().trim()

      const matchesSearch = !q || name.includes(q) || reason.includes(q) || liked.includes(q) || changes.includes(q)
      const matchesCategory = selectedCategoryFilter === "all" || i.kilepes_kategoria === selectedCategoryFilter

      return matchesSearch && matchesCategory
    })
  }, [interviews, searchQuery, selectedCategoryFilter])

  // Pozitívumok és változtatási javaslatok listája
  const positiveFeedbacks = useMemo(() => {
    return interviews
      .filter(i => (i.mi_tetszett || "").trim().length > 0)
      .map(i => ({
        id: i.id,
        text: i.mi_tetszett!,
        name: i.felhasznalo_profil?.nev || "Munkatárs",
        role: i.felhasznalo_profil?.munkakor
      }))
  }, [interviews])

  const constructiveFeedbacks = useMemo(() => {
    return interviews
      .filter(i => (i.mit_valtoztatna || "").trim().length > 0)
      .map(i => ({
        id: i.id,
        text: i.mit_valtoztatna!,
        name: i.felhasznalo_profil?.nev || "Munkatárs",
        role: i.felhasznalo_profil?.munkakor
      }))
  }, [interviews])

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6" />
        </div>
        <p className="font-semibold text-base text-foreground">Még nincs kitöltött kilépési interjú</p>
        <p className="text-sm mt-1 max-w-md text-muted-foreground">
          Amikor a távozó munkatársak lefolytatják a kilépési interjút az Offboarding profil modálban, itt jelennek meg a mélyreható fluktuációs statisztikák és a távozási motivációk.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Fő KPI Kártyák */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Rögzített Interjúk"
          value={`${stats!.total} db`}
          sub="100%-ban archiválva az eaisyDocs-ban"
        />
        <KpiCard
          label="Vállalati Hangulatindex"
          value={stats!.avgOsszes ? `${stats!.avgOsszes.toFixed(1)} / 5.0` : "–"}
          sub="Átlagos összesített pontszám"
        />
        <KpiCard
          label="Vállalati Ajánlás (eNPS)"
          value={`${stats!.ajanlanaPercent}%`}
          sub={`${stats!.ajanlanaCount} pozitív / ${stats!.nemAjanljaCount} negatív válasz`}
        />
        <KpiCard
          label="Fő Távozási Húzóerő"
          value={stats!.topCategoryLabel}
          sub={`${stats!.topCategoryCount} eset (${stats!.total > 0 ? Math.round((stats!.topCategoryCount / stats!.total) * 100) : 0}%)`}
        />
      </div>

      {/* 2. Dimenziós Értékelések & Távozási Okok Bontása */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bal oldal: 4 Értékelési Dimenzió (5 cols) */}
        <Card className="lg:col-span-5 border border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-warning fill-warning" />
              Szervezeti Értékelési Dimenziók (1–5 skála)
            </CardTitle>
            <CardDescription className="text-xs">
              A kilépő munkatársak visszajelzéseinek súlyozott átlaga
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {[
              { label: "Általános elégedettség a vállalattal", val: stats!.avgAltalanos, icon: Compass },
              { label: "Közvetlen vezetői támogatás & kapcsolat", val: stats!.avgVezeto, icon: UserCheck },
              { label: "Munkahelyi környezet & infrastruktúra", val: stats!.avgKornyezet, icon: Building2 },
              { label: "Csapat légkör & kollégákkal való viszony", val: stats!.avgCsapat, icon: HeartHandshake },
            ].map(({ label, val, icon: Icon }) => {
              const score = val ? Math.round(val * 10) / 10 : 0
              const percentage = (score / 5) * 100
              const isHigh = score >= 4.0
              const isMedium = score >= 3.0 && score < 4.0

              return (
                <div key={label} className="p-3 rounded-lg border bg-muted/15 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      {label}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-foreground">
                      {val ? val.toFixed(1) : "–"} / 5.0
                    </span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isHigh ? "bg-success" : isMedium ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>{isHigh ? "Kiváló / Megtartó" : isMedium ? "Megfelelő" : "Fejlesztendő terület"}</span>
                    <StarDisplay value={val ? Math.round(val * 10) / 10 : null} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Jobb oldal: Távozási Okok & Destináció (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Távozási Okok */}
          <Card className="border border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Fluktuációs Tényezők (Miért távoznak?)
              </CardTitle>
              <CardDescription className="text-xs">
                A munkaviszony megszüntetéséhez vezető döntő indokok megoszlása
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              {Object.entries(stats!.kategoriak).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">Nincs rögzített adat</p>
              ) : (
                Object.entries(stats!.kategoriak)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, count]) => {
                    const percent = Math.round((count / stats!.total) * 100)
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-foreground">{KATEGORIA_LABELS[key] || key}</span>
                          <span className="font-semibold tabular-nums text-muted-foreground">
                            {count} fő ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
              )}
            </CardContent>
          </Card>

          {/* Következő Állomáshelyek */}
          <Card className="border border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Compass className="w-4 h-4 text-info" />
                Következő Karrier Állomás (Hova mentek?)
              </CardTitle>
              <CardDescription className="text-xs">
                A kilépő munkatársak jövőbeli szakmai és életpálya iránya
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              {Object.entries(stats!.allomashely).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">Nincs rögzített adat</p>
              ) : (
                Object.entries(stats!.allomashely)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, count]) => {
                    const percent = Math.round((count / stats!.total) * 100)
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-foreground">{ALLOMASHELY_LABELS[key] || key}</span>
                          <span className="font-semibold tabular-nums text-muted-foreground">
                            {count} fő ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-info h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Minőségi Visszajelzések & Idézetek Gyűjteménye */}
      {(positiveFeedbacks.length > 0 || constructiveFeedbacks.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pozitívumok */}
          <Card className="border border-success/20 bg-success/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-success" />
                Mi tetszett legjobban? (Megtartó Erősségek)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {positiveFeedbacks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nincs rögzített szöveges dicséret</p>
              ) : (
                positiveFeedbacks.slice(0, 3).map((fb, idx) => (
                  <div key={idx} className="p-3 bg-background/80 rounded-lg border border-success/20 space-y-1.5">
                    <p className="text-xs text-foreground italic leading-relaxed">
                      „{fb.text}"
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                      <span>{fb.name}</span>
                      {fb.role && <span>• {fb.role}</span>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Konstruktív Javaslatok */}
          <Card className="border border-warning/20 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-warning" />
                Min változtatna? (Szervezeti Fejlesztési Pontok)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {constructiveFeedbacks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nincs rögzített kritika</p>
              ) : (
                constructiveFeedbacks.slice(0, 3).map((fb, idx) => (
                  <div key={idx} className="p-3 bg-background/80 rounded-lg border border-warning/20 space-y-1.5">
                    <p className="text-xs text-foreground italic leading-relaxed">
                      „{fb.text}"
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                      <span>{fb.name}</span>
                      {fb.role && <span>• {fb.role}</span>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Részletes Kilépési Interjúk Kártyás Grid Nézete */}
      <Card className="border border-border/70">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Részletes Kilépési Interjúk ({filteredInterviews.length})</CardTitle>
              <CardDescription className="text-xs">
                Kattints bármelyik munkatárs kártyájára a teljes jegyzőkönyv és értékelések megtekintéséhez
              </CardDescription>
            </div>

            {/* Kereső és szűrő */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Keresés név vagy szöveg..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
              >
                <option value="all">Minden ok</option>
                {Object.entries(KATEGORIA_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInterviews.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground text-xs">
                Nem található interjú a megadott szűrési feltételekkel.
              </div>
            ) : (
              filteredInterviews.map((interview) => {
                const ratings = [
                  interview.altalanos_elegedettseg,
                  interview.vezeto_kapcsolat,
                  interview.munkakornyezet_ertekeles,
                  interview.csapat_ertekeles
                ].filter((v): v is number => v !== null && v !== undefined && v > 0)
                const interviewAvg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

                return (
                  <div
                    key={interview.id}
                    onClick={() => setSelectedInterview(interview)}
                    className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-colors cursor-pointer group space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {interview.felhasznalo_profil?.nev || "Ismeretlen munkatárs"}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {interview.kilepes_datuma || "Ismeretlen"}
                          </span>
                        </div>
                      </div>

                      {interview.ajanlana === true ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20 shrink-0">
                          <ThumbsUp className="w-3 h-3" /> Ajánlaná
                        </span>
                      ) : interview.ajanlana === false ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20 shrink-0">
                          <ThumbsDown className="w-3 h-3" /> Nem ajánlaná
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {interview.kilepes_kategoria && (
                        <Badge variant="outline" className="text-[10px] font-medium py-0 h-5 bg-muted/40">
                          {KATEGORIA_LABELS[interview.kilepes_kategoria] || interview.kilepes_kategoria}
                        </Badge>
                      )}
                      {interview.kovetkezo_allomashely && (
                        <Badge variant="secondary" className="text-[10px] font-medium py-0 h-5">
                          → {ALLOMASHELY_LABELS[interview.kovetkezo_allomashely] || interview.kovetkezo_allomashely}
                        </Badge>
                      )}
                    </div>

                    {interview.kilepes_oka && (
                      <p className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/20 p-2 rounded">
                        „{interview.kilepes_oka}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t text-xs">
                      <StarDisplay value={interviewAvg} />
                      <span className="text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Részletek <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Részletes Interjú Modál */}
      {selectedInterview && (
        <Dialog open={Boolean(selectedInterview)} onOpenChange={(open) => !open && setSelectedInterview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-lg font-semibold">
                  {selectedInterview.felhasznalo_profil?.nev || "Munkatárs"} – Kilépési Interjú Jegyzőkönyv
                </DialogTitle>
                {selectedInterview.ajanlana === true ? (
                  <Badge className="bg-success text-success-foreground border-transparent">Ajánlaná a céget</Badge>
                ) : selectedInterview.ajanlana === false ? (
                  <Badge variant="destructive">Nem ajánlaná</Badge>
                ) : null}
              </div>
              <DialogDescription className="text-xs">
                Utolsó munkanap: {selectedInterview.kilepes_datuma || "Nincs adat"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Ok és cél */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Távozás oka:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {KATEGORIA_LABELS[selectedInterview.kilepes_kategoria || ""] || selectedInterview.kilepes_kategoria || "–"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Következő cél:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {ALLOMASHELY_LABELS[selectedInterview.kovetkezo_allomashely || ""] || selectedInterview.kovetkezo_allomashely || "–"}
                  </p>
                </div>
              </div>

              {selectedInterview.kilepes_oka && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Részletes indoklás:</span>
                  <p className="p-3 bg-muted/10 rounded-lg border text-foreground italic">
                    „{selectedInterview.kilepes_oka}"
                  </p>
                </div>
              )}

              {/* Értékelési dimenziók */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Értékelési dimenziók:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg border bg-card flex justify-between items-center">
                    <span>Általános elégedettség:</span>
                    <StarDisplay value={selectedInterview.altalanos_elegedettseg ?? null} />
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card flex justify-between items-center">
                    <span>Vezetői kapcsolat:</span>
                    <StarDisplay value={selectedInterview.vezeto_kapcsolat ?? null} />
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card flex justify-between items-center">
                    <span>Munkahelyi környezet:</span>
                    <StarDisplay value={selectedInterview.munkakornyezet_ertekeles ?? null} />
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card flex justify-between items-center">
                    <span>Csapat & Kollégák:</span>
                    <StarDisplay value={selectedInterview.csapat_ertekeles ?? null} />
                  </div>
                </div>
              </div>

              {/* Szöveges visszajelzések */}
              {selectedInterview.mi_tetszett && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-success uppercase">Mi tetszett legjobban:</span>
                  <p className="p-3 bg-success/5 rounded-lg border border-success/20 text-foreground">
                    {selectedInterview.mi_tetszett}
                  </p>
                </div>
              )}

              {selectedInterview.mit_valtoztatna && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-warning uppercase">Min változtatna:</span>
                  <p className="p-3 bg-warning/5 rounded-lg border border-warning/20 text-foreground">
                    {selectedInterview.mit_valtoztatna}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
