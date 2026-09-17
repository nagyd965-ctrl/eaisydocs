"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { quickAttachToDossier } from "@/app/inbox/filing-actions"
import { type AntecedentMatchResult } from "@/utils/antecedent-matcher"
import {
  Sparkles,
  GitMerge,
  FolderPlus,
  ExternalLink,
  CheckCircle2,
  Loader2,
  FolderSymlink,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { toast } from "sonner"

interface AntecedentSuggestionCardProps {
  iratId: string
  suggestion: AntecedentMatchResult
  currentUgyiratId?: string | null
  currentIktatoszam?: string | null
  currentAlszam?: number | null
}

export function AntecedentSuggestionCard({
  iratId,
  suggestion,
  currentUgyiratId,
  currentIktatoszam,
  currentAlszam
}: AntecedentSuggestionCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [attachedInfo, setAttachedInfo] = useState<{
    iktatoszam: string
    alszam: number
    ugyiratId: string
  } | null>(
    currentUgyiratId && currentIktatoszam
      ? {
          iktatoszam: currentIktatoszam,
          alszam: currentAlszam || 1,
          ugyiratId: currentUgyiratId
        }
      : null
  )

  const handleQuickAttach = async () => {
    if (!suggestion.ugyirat_id) return
    setLoading(true)

    try {
      const res = await quickAttachToDossier(
        iratId,
        suggestion.ugyirat_id,
        suggestion.indoklas
      )

      if (res.error) {
        toast.error("Hiba az összerendeléskor", { description: res.error })
      } else if (res.success && res.iktatoszam && res.alszam) {
        setAttachedInfo({
          iktatoszam: res.iktatoszam,
          alszam: res.alszam,
          ugyiratId: res.ugyiratId!
        })
        toast.success("Sikeres összerendelés!", {
          description: `Az irat alszámként (${res.alszam}.) hozzárendelve a(z) ${res.iktatoszam} ügyirathoz.`
        })
        router.refresh()
      }
    } catch (_err) {
      toast.error("Váratlan hiba történt a csatolás során.")
    } finally {
      setLoading(false)
    }
  }

  // 1. Állapot: Az irat már csatolva van egy ügyirathoz
  if (attachedInfo) {
    return (
      <Card className="border border-primary/30 bg-primary/5 dark:bg-primary/10 transition-all">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Ügyirathoz kapcsolva</span>
                <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
                  {attachedInfo.alszam}. alszám
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Iktatószám:{" "}
                <Link
                  href={`/dossiers/${attachedInfo.ugyiratId}`}
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
                >
                  {attachedInfo.iktatoszam}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </p>
            </div>
          </div>
          <Link
            href={`/dossiers/${attachedInfo.ugyiratId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ügyirat megnyitása
          </Link>
        </CardContent>
      </Card>
    )
  }

  // 2. Állapot: Új téma javaslat (alacsony vagy nulla egyezés)
  if (suggestion.recommendation_type === "uj_ugy_nyitasa") {
    return (
      <Card className="border border-border/70 bg-card/50 transition-all">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <FolderPlus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Előzmény-vizsgálat: Új téma</span>
                <Badge variant="secondary" className="font-normal text-xs">
                  Új ügy javasolt
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {suggestion.indoklas}
              </p>
            </div>
          </div>
          <Link
            href={`/inbox/${iratId}?mode=new`}
            className={`${buttonVariants({ variant: "default", size: "sm" })} shrink-0`}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Új ügyirat nyitása
          </Link>
        </CardContent>
      </Card>
    )
  }

  // 3. Állapot: Magas vagy közepes előzmény-ügyirat egyezés
  const isHighMatch = suggestion.confidence_score >= 60
  const isOpen = ["iktatva", "szignalt", "ugyintezes_alatt", "folyamatban"].includes(
    suggestion.statusz || ""
  )

  return (
    <Card className="border border-primary/35 bg-primary/[0.03] dark:bg-primary/[0.08] transition-all">
      <CardContent className="p-5 space-y-4">
        {/* Fejléc és egyezési fok */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-primary/15 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">Javasolt előzmény-ügyirat</h3>
                <Badge
                  variant="outline"
                  className={`text-xs font-mono font-medium ${
                    isHighMatch
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {suggestion.confidence_score}% valószínűség
                </Badge>
                <Badge
                  variant="secondary"
                  className={`text-xs font-normal ${
                    isOpen
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isOpen ? "Nyitott ügyirat" : "Lezárt ügyirat"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {suggestion.szervezeti_egyseg_nev && (
              <span>Osztály: <strong>{suggestion.szervezeti_egyseg_nev}</strong></span>
            )}
            {suggestion.irat_count > 0 && (
              <>
                <span>•</span>
                <span>{suggestion.irat_count} db meglévő irat</span>
              </>
            )}
          </div>
        </div>

        {/* Ügyirat link és tárgy */}
        <div className="bg-background/80 dark:bg-background/40 border border-border/60 rounded-md p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/dossiers/${suggestion.ugyirat_id}`}
                target="_blank"
                className="font-medium text-sm text-primary hover:underline inline-flex items-center gap-1.5"
              >
                <span className="font-mono">{suggestion.iktatoszam}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </Link>
              <p className="text-xs text-foreground/90 mt-0.5 truncate">
                {suggestion.targy || "Nincs megadva tárgy"}
              </p>
            </div>
          </div>

          {/* Indoklás szöveg */}
          <div className="mt-2.5 pt-2.5 border-t border-border/40 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="flex-1">{suggestion.indoklas}</p>
          </div>

          {/* Részletek lenyitása */}
          {suggestion.reszletek && suggestion.reszletek.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Kevesebb részlet
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Egyezési tényezők részletei ({suggestion.reszletek.length})
                  </>
                )}
              </button>

              {showDetails && (
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground/90 pl-4 border-l-2 border-primary/20">
                  {suggestion.reszletek.map((det, idx) => (
                    <li key={idx} className="list-disc">
                      {det}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Akció gombok: Egykattintásos összerendelés + alternatívák */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              onClick={handleQuickAttach}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 px-3"
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitMerge className="mr-1.5 h-3.5 w-3.5" />
              )}
              {loading ? "Összerendelés folyamatban..." : "Csatolás ehhez az ügyirathoz (alszámként)"}
            </Button>

            <Link
              href={`/dossiers/${suggestion.ugyirat_id}`}
              target="_blank"
              className={`${buttonVariants({ variant: "outline", size: "sm" })} text-xs h-8 px-3`}
            >
              Ügyirat megtekintése
            </Link>
          </div>

          <Link
            href={`/inbox/${iratId}?mode=new`}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors ml-auto"
          >
            Inkább új ügyirat nyitása →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
