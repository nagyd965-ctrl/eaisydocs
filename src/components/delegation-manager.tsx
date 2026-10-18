"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CalendarClock, ArrowRightLeft, UserCheck, Trash2, Calendar, Users, AlertCircle, Info, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createSubstitution, deleteSubstitution } from "@/app/settings/substitution-actions"

export interface DelegationItem {
  id: string
  kilepo_user_id: string
  helyettesito_user_id: string
  mettol: string
  meddig: string
  aktiv: boolean
  helyettesito?: {
    id: string
    nev: string
    avatar_url?: string | null
    docs_szerepkor?: string | null
  } | null
  kilepo?: {
    id: string
    nev: string
    avatar_url?: string | null
    docs_szerepkor?: string | null
  } | null
}

export interface TeamMemberOption {
  id: string
  nev: string
  email?: string | null
  avatar_url?: string | null
  docs_szerepkor?: string | null
}

interface DelegationContentProps {
  currentUserId: string
  myDelegations: DelegationItem[]
  incomingDelegations?: DelegationItem[]
  teamMembers: TeamMemberOption[]
  onSuccess?: () => void
}

export function DelegationFormAndList({
  currentUserId,
  myDelegations,
  incomingDelegations = [],
  teamMembers,
  onSuccess,
}: DelegationContentProps) {
  const router = useRouter()
  const [substituteUser, setSubstituteUser] = useState("")
  const [substituteFrom, setSubstituteFrom] = useState("")
  const [substituteTo, setSubstituteTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split("T")[0]
  const eligibleMembers = (teamMembers || []).filter((m) => m.id !== currentUserId)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!substituteUser || !substituteFrom || !substituteTo) {
      toast.error("Kérjük tölts ki minden mezőt!")
      return
    }

    if (new Date(substituteTo) <= new Date(substituteFrom)) {
      toast.error("A befejező dátumnak a kezdő dátum utáninak kell lennie!")
      return
    }

    setLoading(true)
    const res = await createSubstitution(substituteUser, substituteFrom, substituteTo)
    setLoading(false)

    if (res?.success) {
      toast.success("Távolléti delegálás sikeresen rögzítve!", {
        description: "A megadott időszakban a kijelölt kolléga hozzáfér a feladataidhoz.",
      })
      setSubstituteUser("")
      setSubstituteFrom("")
      setSubstituteTo("")
      router.refresh()
      onSuccess?.()
    } else {
      toast.error("Hiba történt", { description: res?.error || "Nem sikerült menteni." })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan visszavonod ezt a feladat-delegálást?")) return
    setDeletingId(id)
    const res = await deleteSubstitution(id)
    setDeletingId(null)

    if (res?.success) {
      toast.success("Delegálás visszavonva.")
      router.refresh()
    } else {
      toast.error("Hiba történt", { description: res?.error || "Nem sikerült törölni." })
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Új delegálás űrlap */}
      <form onSubmit={handleSave} className="bg-muted/20 border border-border rounded-xl p-4 sm:p-5 space-y-4">
        <div className="text-sm font-semibold text-foreground">
          Új távolléti megbízás rögzítése
        </div>
        <p className="text-xs text-muted-foreground">
          Állítsd be, hogy távolléted idején melyik munkatársad láthassa el a rád szignált ügyiratok és feladatok kezelését.
        </p>

        {eligibleMembers.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              A jelenleg kiválasztott cégnél nem található más munkatárs eaisyDocs jogosultsággal. Új kollégát a <strong>Beállítások → Csapat</strong> menüpontban rendelhetsz a céghez.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="delegated-user" className="text-xs font-medium">Helyettesítő munkatárs</Label>
            <Select 
              value={substituteUser} 
              onValueChange={(val) => setSubstituteUser(val || "")}
              disabled={eligibleMembers.length === 0}
            >
              <SelectTrigger id="delegated-user" className="h-9 text-xs bg-background">
                <SelectValue placeholder={eligibleMembers.length === 0 ? "Nincs elérhető kolléga" : "Válassz kollégát..."} />
              </SelectTrigger>
              <SelectContent>
                {eligibleMembers.length === 0 ? (
                  <SelectItem value="_empty" disabled className="text-xs text-muted-foreground">
                    Nincs más eaisyDocs munkatárs a cégnél
                  </SelectItem>
                ) : (
                  eligibleMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.nev} {m.docs_szerepkor ? `(${m.docs_szerepkor})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delegated-from" className="text-xs font-medium">Időszak kezdete</Label>
            <Input
              id="delegated-from"
              type="date"
              className="h-9 text-xs bg-background"
              value={substituteFrom}
              min={todayStr}
              onChange={(e) => setSubstituteFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delegated-to" className="text-xs font-medium">Időszak vége</Label>
            <Input
              id="delegated-to"
              type="date"
              className="h-9 text-xs bg-background"
              value={substituteTo}
              min={substituteFrom || todayStr}
              onChange={(e) => setSubstituteTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="sm"
            disabled={loading || !substituteUser || !substituteFrom || !substituteTo || eligibleMembers.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5"
          >
            {loading ? "Rögzítés..." : "Megbízás rögzítése"}
          </Button>
        </div>
      </form>

      {/* 2. Saját megbízások listája */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Kijelölt helyettesítőid ({myDelegations.length})
        </h4>

        {myDelegations.length === 0 ? (
          <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
            Jelenleg nincs aktív vagy tervezett távolléti megbízásod.
          </div>
        ) : (
          <div className="space-y-2">
            {myDelegations.map((d) => {
              const now = new Date()
              const from = new Date(d.mettol)
              const to = new Date(d.meddig)
              const isPast = to < now
              const isActive = !isPast && from <= now

              const partnerName =
                d.helyettesito?.nev ||
                teamMembers.find((m) => m.id === d.helyettesito_user_id)?.nev ||
                "Ismeretlen munkatárs"

              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                      {partnerName.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{partnerName}</span>
                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "text-primary border-primary/40 bg-primary/10 text-[10px]"
                              : isPast
                              ? "text-muted-foreground border-border text-[10px]"
                              : "text-blue-600 dark:text-blue-400 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 text-[10px]"
                          }
                        >
                          {isActive ? "Aktív" : isPast ? "Lejárt" : "Tervezett"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {from.toLocaleDateString("hu-HU")} – {to.toLocaleDateString("hu-HU")}
                      </p>
                    </div>
                  </div>

                  {!isPast && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === d.id}
                      onClick={() => handleDelete(d.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Megbízás visszavonása"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Bejövő megbízások (amikor engem jelöltek ki) */}
      {incomingDelegations && incomingDelegations.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Kollégák, akik téged bíztak meg ({incomingDelegations.length})
          </h4>
          <div className="space-y-2">
            {incomingDelegations.map((d) => {
              const now = new Date()
              const from = new Date(d.mettol)
              const to = new Date(d.meddig)
              const isPast = to < now
              const isActive = !isPast && from <= now

              const assignerName =
                d.kilepo?.nev ||
                teamMembers.find((m) => m.id === d.kilepo_user_id)?.nev ||
                "Ismeretlen munkatárs"

              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-info/10 text-info flex items-center justify-center font-semibold text-xs shrink-0">
                      {assignerName.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{assignerName}</span>
                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "text-success border-success/40 bg-success/10 text-[10px]"
                              : isPast
                              ? "text-muted-foreground text-[10px]"
                              : "text-info border-info/40 bg-info/10 text-[10px]"
                          }
                        >
                          {isActive ? "Aktív helyettesítés" : isPast ? "Lejárt" : "Várható"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {from.toLocaleDateString("hu-HU")} – {to.toLocaleDateString("hu-HU")}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-[11px] text-muted-foreground">
                      Feladatai a „Saját feladataim” fülön kezelhetők
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 1. Beállítások / Profil & Biztonság kártya
 */
export function DelegationSettingsCard({
  currentUserId,
  myDelegations,
  incomingDelegations,
  teamMembers,
}: DelegationContentProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              Távolléti feladat-delegálás
            </CardTitle>
            <CardDescription className="mt-1">
              Iratkezelési jogosultságok és feladatok ideiglenes átadása távollét esetén. A kijelölt helyettesítő látja és elintézheti a feladataidat.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <DelegationFormAndList
          currentUserId={currentUserId}
          myDelegations={myDelegations}
          incomingDelegations={incomingDelegations}
          teamMembers={teamMembers}
        />
      </CardContent>
    </Card>
  )
}

/**
 * 2. Saját Feladataim (/tasks) tetején lévő Dialog gomb
 */
export function TaskDelegationDialog({
  currentUserId,
  myDelegations,
  incomingDelegations,
  teamMembers,
}: DelegationContentProps) {
  const [open, setOpen] = useState(false)

  // Aktív delegálások számolása
  const now = new Date()
  const activeMy = myDelegations.filter((d) => !new Date(d.meddig).toISOString().startsWith("9999") && new Date(d.meddig) >= now && new Date(d.mettol) <= now)
  const activeIncoming = (incomingDelegations || []).filter(
    (d) => new Date(d.meddig) >= now && new Date(d.mettol) <= now
  )

  const hasActive = activeMy.length > 0 || activeIncoming.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-xs font-medium border-border hover:border-primary/40 relative"
          />
        }
      >
        <span>Távolléti delegálás</span>
        {hasActive && (
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Távolléti feladat-delegálás (Helyettesítés)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Iratkezelési jogosultságok és szignált feladatok átadása távolléted idejére.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <DelegationFormAndList
            currentUserId={currentUserId}
            myDelegations={myDelegations}
            incomingDelegations={incomingDelegations}
            teamMembers={teamMembers}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 3. Saját Feladataim (/tasks) Aktív Helyettesítési Banner
 */
export function ActiveDelegationBanner({
  myDelegations,
  incomingDelegations = [],
  teamMembers,
}: {
  myDelegations: DelegationItem[]
  incomingDelegations?: DelegationItem[]
  teamMembers: TeamMemberOption[]
}) {
  const now = new Date()

  // Ellenőrizzük, van-e bejövő aktív helyettesítés (más feladatait csinálom)
  const activeIncoming = incomingDelegations.filter((d) => {
    const f = new Date(d.mettol)
    const t = new Date(d.meddig)
    return d.aktiv && f <= now && t >= now
  })

  // Ellenőrizzük, van-e kimenő aktív helyettesítés (más csinálja az én feladataimat)
  const activeMy = myDelegations.filter((d) => {
    const f = new Date(d.mettol)
    const t = new Date(d.meddig)
    return d.aktiv && f <= now && t >= now
  })

  if (activeIncoming.length === 0 && activeMy.length === 0) return null

  return (
    <div className="space-y-2">
      {activeIncoming.map((d) => {
        const assignerName =
          d.kilepo?.nev ||
          teamMembers.find((m) => m.id === d.kilepo_user_id)?.nev ||
          "Kolléga"
        const toDateStr = new Date(d.meddig).toLocaleDateString("hu-HU")

        return (
          <div
            key={d.id}
            className="flex items-center justify-between p-3 px-4 rounded-lg bg-info/10 border border-info/30 text-xs text-foreground"
          >
            <div className="flex items-center gap-2.5">
              <ArrowRightLeft className="h-4 w-4 text-info shrink-0" />
              <span>
                <strong>Helyettesítési megbízás:</strong> Jelenleg <strong>{assignerName}</strong> feladatait is kezeled ({toDateStr}-ig). Az elvégzett műveletek az eseménynaplóban rögzítésre kerülnek.
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-background border-info/40 text-info">
              Helyettesítő nézet
            </Badge>
          </div>
        )
      })}

      {activeMy.map((d) => {
        const subName =
          d.helyettesito?.nev ||
          teamMembers.find((m) => m.id === d.helyettesito_user_id)?.nev ||
          "Kolléga"
        const toDateStr = new Date(d.meddig).toLocaleDateString("hu-HU")

        return (
          <div
            key={d.id}
            className="flex items-center justify-between p-3 px-4 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground"
          >
            <div className="flex items-center gap-2.5">
              <CalendarClock className="h-4 w-4 text-primary shrink-0" />
              <span>
                <strong>Távolléti delegálás aktív:</strong> Feladataidat {toDateStr}-ig <strong>{subName}</strong> látja el helyetted.
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-background border-primary/40 text-primary">
              Delegálva
            </Badge>
          </div>
        )
      })}
    </div>
  )
}
