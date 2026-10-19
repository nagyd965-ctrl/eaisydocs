"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/kpi-card"
import { TableToolbar, FilterGroup } from "@/components/table-toolbar/table-toolbar"
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
  Gift,
  FileText,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase,
  Calendar,
  Sparkles,
  UserPlus,
  Trash2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getReferralCvSignedUrlAction, deleteReferralAction } from "@/app/hr/self-service/career/referral-actions"
import type { EmployeeReferral } from "@/types/hr"
import { cn } from "@/lib/utils"

interface MyReferralsViewProps {
  referrals: EmployeeReferral[]
  bonusAmount: number
  onOpenReferralModal?: () => void
  onDeleteReferral?: (id: string) => void
}

export function MyReferralsView({
  referrals,
  bonusAmount,
  onOpenReferralModal,
  onDeleteReferral,
}: MyReferralsViewProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([])
  const [downloadingCvId, setDownloadingCvId] = React.useState<string | null>(null)
  const [referralToDelete, setReferralToDelete] = React.useState<EmployeeReferral | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Bónusz formázó
  const formatHuf = (val: number) =>
    new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(val)

  // Státusz címkék és színek
  const getBonusStatusBadge = (status: string) => {
    switch (status) {
      case "kifizetve":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Kifizetve
          </span>
        )
      case "kifizetheto":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <CheckCircle2 className="w-3 h-3" />
            Jóváhagyva (Kifizethető)
          </span>
        )
      case "feltetelhez_kotve":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Próbaidő alatt
          </span>
        )
      case "elutasitva":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="w-3 h-3" />
            Elutasítva
          </span>
        )
      case "fuggoben":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
            <Clock className="w-3 h-3" />
            Kiválasztás zajlik
          </span>
        )
    }
  }

  const getToborzasStatusBadge = (status?: string | null) => {
    switch (status) {
      case "elfogadva":
        return <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">Felvéve</Badge>
      case "ajanlat":
        return <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px]">Ajánlatadás</Badge>
      case "interju":
        return <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">Interjú fázis</Badge>
      case "eloszurt":
        return <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">Előszűrve</Badge>
      case "elutasitva":
        return <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">Nem felelt meg</Badge>
      case "uj":
      default:
        return <Badge variant="outline" className="text-foreground border-border text-[10px]">Regisztrálva</Badge>
    }
  }

  // Szűrés
  const filteredReferrals = React.useMemo(() => {
    return referrals.filter((ref) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchesName = ref.jelolt_nev.toLowerCase().includes(term)
        const matchesEmail = ref.jelolt_email.toLowerCase().includes(term)
        const matchesJob = ref.hr_allashirdetes?.cim.toLowerCase().includes(term)
        if (!matchesName && !matchesEmail && !matchesJob) return false
      }

      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(ref.bonusz_statusz)) return false
      }

      return true
    })
  }, [referrals, searchTerm, selectedStatuses])

  // KPI statisztikák (Linear Flat Grid – ADR A-029)
  const totalReferrals = referrals.length
  const pendingReferrals = referrals.filter(
    (r) => r.bonusz_statusz === "fuggoben" || r.bonusz_statusz === "feltetelhez_kotve"
  ).length
  const hiredReferrals = referrals.filter(
    (r) => r.bonusz_statusz === "kifizetheto" || r.bonusz_statusz === "kifizetve" || r.hr_toborzas?.statusz === "elfogadva"
  ).length
  const approvedBonusTotal = referrals
    .filter((r) => r.bonusz_statusz === "kifizetheto" || r.bonusz_statusz === "kifizetve")
    .reduce((sum, r) => sum + (r.bonusz_osszeg || bonusAmount), 0)

  // CV Letöltés kezelő
  const handleDownloadCv = async (referral: EmployeeReferral) => {
    if (!referral.cv_storage_path) {
      toast.info("Ehhez az ajánláshoz nem lett feltöltve önéletrajz.")
      return
    }

    setDownloadingCvId(referral.id)
    try {
      const res = await getReferralCvSignedUrlAction(referral.cv_storage_path)
      if (res.url) {
        window.open(res.url, "_blank")
      } else {
        toast.error(res.error || "Nem sikerült letölteni a fájlt.")
      }
    } catch {
      toast.error("Hiba történt a letöltés során.")
    } finally {
      setDownloadingCvId(null)
    }
  }

  // Ajánlás megerősített visszavonása
  const confirmDeleteReferral = async (referral: EmployeeReferral) => {
    setIsDeleting(true)
    try {
      const res = await deleteReferralAction(referral.id)
      if (res.success) {
        toast.success("Az ajánlás sikeresen visszavonva.")
        if (onDeleteReferral) {
          onDeleteReferral(referral.id)
        } else {
          router.refresh()
        }
        setReferralToDelete(null)
      } else {
        toast.error(res.error || "Nem sikerült visszavonni az ajánlást.")
      }
    } catch {
      toast.error("Váratlan hiba történt a törlés során.")
    } finally {
      setIsDeleting(false)
    }
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      title: "Bónusz Státusz",
      options: [
        { id: "fuggoben", label: "Kiválasztás zajlik", checked: selectedStatuses.includes("fuggoben") },
        { id: "feltetelhez_kotve", label: "Próbaidő alatt", checked: selectedStatuses.includes("feltetelhez_kotve") },
        { id: "kifizetheto", label: "Jóváhagyva (Kifizethető)", checked: selectedStatuses.includes("kifizetheto") },
        { id: "kifizetve", label: "Kifizetve", checked: selectedStatuses.includes("kifizetve") },
        { id: "elutasitva", label: "Elutasítva", checked: selectedStatuses.includes("elutasitva") },
      ],
      onToggle: (id) => {
        setSelectedStatuses((prev) =>
          prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        )
      },
    },
  ]

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedStatuses([])
  }

  return (
    <div className="space-y-6">
      {/* KPI Kártyák (Linear Flat Grid – ADR A-029) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Összes Ajánlásom"
          value={`${totalReferrals} jelölt`}
          sub="Eddig benyújtott ismerősök"
        />
        <KpiCard
          label="Folyamatban"
          value={`${pendingReferrals} jelölt`}
          sub="Kiválasztás vagy próbaidő"
          highlight={pendingReferrals > 0}
        />
        <KpiCard
          label="Sikeres Felvétel"
          value={`${hiredReferrals} fő`}
          sub="Munkatársunkká vált jelöltek"
          highlight={hiredReferrals > 0}
        />
        <KpiCard
          label="Jóváhagyott Bónusz"
          value={formatHuf(approvedBonusTotal)}
          sub={`Fix ${formatHuf(bonusAmount)} / sikeres felvétel`}
          highlight={approvedBonusTotal > 0}
        />
      </div>

      {/* Program Leírás */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          Dolgozói Ajánlási Program
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ajánlj szakembert nyitott pozícióinkra vagy cégünk tehetségbázisába. Sikeres felvétel és a próbaidő lejárta után fix <strong>{formatHuf(bonusAmount)}</strong> bónuszban részesülsz a bérszámfejtésedben!
        </p>
      </div>

      {/* TableToolbar kereső és szűrő */}
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Keresés jelölt neve, emailje vagy pozíció alapján..."
        filterGroups={filterGroups}
        activeFiltersCount={selectedStatuses.length}
        onClearFilters={handleClearFilters}
      />

      {/* Ajánlások listája */}
      {filteredReferrals.length > 0 ? (
        <div className="space-y-3">
          {filteredReferrals.map((referral) => {
            const dateStr = new Date(referral.created_at).toLocaleDateString("hu-HU", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            const jobTitle = referral.hr_allashirdetes?.cim || "Általános ajánlás (Talent pool)"

            return (
              <Card
                key={referral.id}
                className="border border-border hover:border-primary/40 transition-colors shadow-none bg-card"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Bal oldal: Jelölt és pozíció adatok */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base text-foreground">
                          {referral.jelolt_nev}
                        </span>
                        {getBonusStatusBadge(referral.bonusz_statusz)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          Folyamat: {getToborzasStatusBadge(referral.hr_toborzas?.statusz)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium text-foreground">{jobTitle}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{referral.jelolt_email}</span>
                        </div>
                        {referral.jelolt_telefon && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{referral.jelolt_telefon}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Ajánlva: {dateStr}</span>
                        </div>
                      </div>

                      {referral.ajanlas_indoklas && (
                        <div className="text-xs bg-muted/30 border border-border/50 rounded-md p-2.5 text-muted-foreground italic leading-relaxed">
                          „{referral.ajanlas_indoklas}”
                        </div>
                      )}
                    </div>

                    {/* Jobb oldal: Bónusz összeg és műveletek */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                      <div className="text-left lg:text-right">
                        <div className="text-xs text-muted-foreground">Sikerdíj összege</div>
                        <div className="text-base font-semibold tabular-nums text-foreground">
                          {formatHuf(referral.bonusz_osszeg || bonusAmount)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {referral.linkedin_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => window.open(referral.linkedin_url!, "_blank")}
                            title="LinkedIn profil megtekintése"
                          >
                            <Globe className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">LinkedIn</span>
                          </Button>
                        )}

                        {referral.cv_storage_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => handleDownloadCv(referral)}
                            disabled={downloadingCvId === referral.id}
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span>{downloadingCvId === referral.id ? "Megnyitás..." : "Önéletrajz"}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}

                        {referral.bonusz_statusz === "fuggoben" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setReferralToDelete(referral)}
                            disabled={isDeleting && referralToDelete?.id === referral.id}
                            title="Ajánlás visszavonása / törlése"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Üres Állapot (Empty State) */
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed rounded-lg bg-muted/10 space-y-4">
          <div className="space-y-1 max-w-md">
            <p className="text-base font-semibold text-foreground">
              {referrals.length === 0
                ? "Még nem rögzítettél dolgozói ajánlást."
                : "Nincs a szűrésnek megfelelő ajánlásod."}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {referrals.length === 0
                ? "Ismersz olyan tehetséges szakembert, aki remekül illene csapatunkba? Használd a jobb felső „Ismerős ajánlása” gombot az ajánlás rögzítéséhez."
                : "Próbáld meg törölni a beállított keresési vagy státusz szűrőket."}
            </p>
          </div>

          {referrals.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs mt-2"
            >
              Szűrők visszaállítása
            </Button>
          )}
        </div>
      )}

      {/* Visszavonási Megerősítő Modál (Kanonikus AlertDialog – ADR A-029) */}
      <AlertDialog
        open={Boolean(referralToDelete)}
        onOpenChange={(open) => !open && !isDeleting && setReferralToDelete(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold tracking-tight">
              Ajánlás visszavonása
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Biztosan vissza szeretnéd vonni <strong>{referralToDelete?.jelolt_nev}</strong> ajánlását?
              <br />
              <span className="block mt-2 text-muted-foreground/80">
                A visszavonással a jelölt ajánlása és a kapcsolódó önéletrajz törlésre kerül a toborzási rendszerből. Ez a művelet nem vonható vissza.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isDeleting}
              className="h-9 text-xs"
            >
              Mégse
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (referralToDelete) {
                  confirmDeleteReferral(referralToDelete)
                }
              }}
              disabled={isDeleting}
              className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Visszavonás...
                </>
              ) : (
                "Ajánlás visszavonása"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
