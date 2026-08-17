"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Star, ThumbsUp, ThumbsDown, Users, TrendingUp, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExitInterviewSummaryProps {
  interviews: any[]
}

const KATEGORIA_LABELS: Record<string, string> = {
  jobb_ajanlat:    "Jobb ajánlat / magasabb bér",
  magnaleti:       "Magánéleti okok",
  elorelep:        "Előrelépési lehetőség",
  vezeto:          "Vezető / management",
  munkakornyezet:  "Munkahelyi légkör",
  munkakor:        "Munkakör / feladatok",
  tavolsag:        "Távolság / home office",
  nyugdij:         "Nyugdíjba vonulás",
  egyeb:           "Egyéb",
}

const ALLOMASHELY_LABELS: Record<string, string> = {
  versenyzo_ceg:   "Versenytárs",
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
          className={cn("w-3.5 h-3.5", s <= value ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/20")}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1 tabular-nums">{value.toFixed(1)}</span>
    </div>
  )
}

function avg(arr: (number | null)[]): number | null {
  const vals = arr.filter((v): v is number => v !== null && v > 0)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function ExitInterviewSummary({ interviews }: ExitInterviewSummaryProps) {
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
    const ajanlanaPercent = total > 0 ? Math.round((ajanlanaCount / total) * 100) : 0

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

    return {
      total, avgAltalanos, avgVezeto, avgKornyezet, avgCsapat, avgOsszes,
      ajanlanaCount, nemAjanljaCount, ajanlanaPercent,
      kategoriak, allomashely,
    }
  }, [interviews])

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
        <MessageSquare className="w-10 h-10 mb-4 opacity-30" />
        <p className="font-medium">Még nincs kitöltött kilépési interjú</p>
        <p className="text-sm mt-1">Az interjúk a kiléptetési folyamat Kilépési Interjú fülén rögzíthetők.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Összesítő kártyák */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Interjúk</p>
            </div>
            <p className="text-3xl font-semibold tabular-nums">{stats!.total}</p>
            <p className="text-xs text-muted-foreground mt-1">kitöltve</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Átlag elégedettség</p>
            </div>
            <p className="text-3xl font-semibold tabular-nums">
              {stats!.avgOsszes ? stats!.avgOsszes.toFixed(1) : "–"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">/ 5.0 összesített</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ThumbsUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ajánlaná</p>
            </div>
            <p className="text-3xl font-semibold tabular-nums">{stats!.ajanlanaPercent}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats!.ajanlanaCount} igen / {stats!.nemAjanljaCount} nem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Leggyakoribb ok</p>
            </div>
            {Object.keys(stats!.kategoriak).length > 0 ? (
              <>
                <p className="text-sm font-semibold leading-tight">
                  {KATEGORIA_LABELS[Object.entries(stats!.kategoriak).sort((a, b) => b[1] - a[1])[0][0]] || "–"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.entries(stats!.kategoriak).sort((a, b) => b[1] - a[1])[0][1]} eset
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nincs adat</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Értékelések és megoszlások */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Elégedettségi dimenziók */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Átlagos Értékelések</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Általános elégedettség", val: stats!.avgAltalanos },
              { label: "Vezető kapcsolata",       val: stats!.avgVezeto },
              { label: "Munkahelyi környezet",    val: stats!.avgKornyezet },
              { label: "Csapat / Kollégák",       val: stats!.avgCsapat },
            ].map(({ label, val }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <StarDisplay value={val ? Math.round(val * 10) / 10 : null} />
                {val && (
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div
                      className="bg-amber-400 h-1 rounded-full transition-all"
                      style={{ width: `${(val / 5) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Kilépési ok megoszlás */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Kilépési Okok</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats!.kategoriak).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nincs adat</p>
            ) : (
              Object.entries(stats!.kategoriak)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-foreground">{KATEGORIA_LABELS[key] || key}</span>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${(count / stats!.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Következő állomáshely */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Hova Mentek?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats!.allomashely).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nincs adat</p>
            ) : (
              Object.entries(stats!.allomashely)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-foreground">{ALLOMASHELY_LABELS[key] || key}</span>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${(count / stats!.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Részletes lista */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Részletes Interjúk</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {interviews.map((interview) => (
              <InterviewDetailRow key={interview.id} interview={interview} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Részletes interjú sor + popup
// ---------------------------------------------------------------------------
function InterviewDetailRow({ interview }: { interview: any }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left p-4 hover:bg-muted/40 transition-colors group"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <p className="font-medium text-sm group-hover:text-primary transition-colors">
                {interview.felhasznalo_profil?.nev || "Ismeretlen"}
              </p>
              {interview.kilepes_kategoria && (
                <Badge variant="outline" className="text-[10px]">
                  {KATEGORIA_LABELS[interview.kilepes_kategoria] || interview.kilepes_kategoria}
                </Badge>
              )}
              {interview.kovetkezo_allomashely && (
                <Badge variant="secondary" className="text-[10px]">
                  {ALLOMASHELY_LABELS[interview.kovetkezo_allomashely] || interview.kovetkezo_allomashely}
                </Badge>
              )}
              {interview.ajanlana === true && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <ThumbsUp className="w-2.5 h-2.5" /> Ajánlaná
                </span>
              )}
              {interview.ajanlana === false && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                  <ThumbsDown className="w-2.5 h-2.5" /> Nem ajánlaná
                </span>
              )}
            </div>
            {interview.kilepes_oka && (
              <p className="text-xs text-muted-foreground line-clamp-1 italic">
                „{interview.kilepes_oka}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-xs text-muted-foreground">{interview.kilepes_datuma || "–"}</p>
            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">Megnyitás →</span>
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase shrink-0">
                {interview.felhasznalo_profil?.nev?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || "?"}
              </div>
              <div>
                <p>{interview.felhasznalo_profil?.nev || "Ismeretlen"}</p>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Kilépési interjú · {interview.kilepes_datuma || "–"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Kategória + Állomáshely */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Kilépés Oka</p>
                <p className="text-sm font-medium">
                  {KATEGORIA_LABELS[interview.kilepes_kategoria] || <span className="italic text-muted-foreground">Nem megadva</span>}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Következő állomás</p>
                <p className="text-sm font-medium">
                  {ALLOMASHELY_LABELS[interview.kovetkezo_allomashely] || <span className="italic text-muted-foreground">Nem megadva</span>}
                </p>
              </div>
            </div>

            {/* Részletes leírás */}
            {interview.kilepes_oka && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Részletes Leírás</p>
                <p className="text-sm bg-muted/40 rounded-lg p-3 italic leading-relaxed">
                  „{interview.kilepes_oka}"
                </p>
              </div>
            )}

            {/* Értékelések */}
            <div className="border rounded-lg p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Elégedettségi Értékelések</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Általános Elégedettség", val: interview.altalanos_elegedettseg },
                  { label: "Vezető Kapcsolata",      val: interview.vezeto_kapcsolat },
                  { label: "Munkahelyi Környezet",   val: interview.munkakornyezet_ertekeles },
                  { label: "Csapat / Kollégák",      val: interview.csapat_ertekeles },
                ].map(({ label, val }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={cn("w-4 h-4", val && s <= val ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/20")} />
                        ))}
                      </div>
                      {val ? (
                        <span className="text-xs font-semibold tabular-nums">{val}/5</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">–</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Szabad szöveges válaszok */}
            {(interview.mi_tetszett || interview.mit_valtoztatna) && (
              <div className="grid grid-cols-2 gap-4">
                {interview.mi_tetszett && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mi tetszett legjobban?</p>
                    <p className="text-sm bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 leading-relaxed">
                      {interview.mi_tetszett}
                    </p>
                  </div>
                )}
                {interview.mit_valtoztatna && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Min változtatna?</p>
                    <p className="text-sm bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 leading-relaxed">
                      {interview.mit_valtoztatna}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Ajánlaná */}
            <div className="flex items-center gap-3 pt-1 border-t">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ajánlaná a céget?</p>
              {interview.ajanlana === true && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <ThumbsUp className="w-4 h-4" /> Igen, ajánlaná
                </span>
              )}
              {interview.ajanlana === false && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-destructive bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
                  <ThumbsDown className="w-4 h-4" /> Nem ajánlaná
                </span>
              )}
              {interview.ajanlana === null && (
                <span className="text-sm text-muted-foreground italic">Nem válaszolt</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
