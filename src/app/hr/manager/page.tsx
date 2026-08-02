import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, CheckCircle2, CalendarX, CalendarDays } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { LeaveActionButtons } from "@/components/hr/leave-action-buttons"
import { TeamCalendar } from "@/components/hr/team-calendar"
import { redirect } from "next/navigation"
import Link from "next/link"

const TIPUS_LABEL: Record<string, string> = {
  szabadsag: "Szabadság",
  betegseg: "Betegség",
  fizetett_szabadsag: "Fizetett szabadság",
  fizetetlen_szabadsag: "Fizetetlen szabadság",
  egyeb: "Egyéb",
}

export default async function ManagerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const todayStr = new Date().toISOString().split("T")[0]

  // 1. Közvetlen beosztottak ID-jainak lekérése
  const { data: teamProfiles } = await supabase
    .from("felhasznalo_profil")
    .select("id")
    .eq("kozvetlen_vezeto_id", user.id)

  const teamMemberIds = (teamProfiles || []).map((p: any) => p.id)

  // 2. Jóváhagyásra váró kérelmek (direkt szignált VAGY beosztott kérelme)
  const pendingLeavesQuery = supabase
    .from("hr_tavollet")
    .select("*, hr_dolgozo_adatlap(felhasznalo_profil(nev))")
    .eq("statusz", "jovahagyasra_var")
    .order("created_at", { ascending: false })

  const { data: pendingLeaves } = teamMemberIds.length > 0
    ? await pendingLeavesQuery.or(
        `aktualis_jovahagyo_id.eq.${user.id},dolgozo_id.in.(${teamMemberIds.join(",")})`
      )
    : await pendingLeavesQuery.eq("aktualis_jovahagyo_id", user.id)

  // 3. Mai távollétek a valós státuszhoz
  const { data: todayLeaves } = await supabase
    .from("hr_tavollet")
    .select("dolgozo_id, statusz")
    .lte("kezdet_datuma", todayStr)
    .gte("veg_datuma", todayStr)
    .in("statusz", ["jovahagyva", "jovahagyasra_var"])

  // Beosztottanként: van-e ma jóváhagyott/függő távolléte
  const todayAbsentIds = new Set(
    (todayLeaves || []).filter(l => l.statusz === "jovahagyva").map(l => l.dolgozo_id)
  )
  const todayPendingIds = new Set(
    (todayLeaves || []).filter(l => l.statusz === "jovahagyasra_var").map(l => l.dolgozo_id)
  )

  // 4. Összes kérelem a naptárhoz
  const { data: allLeaves } = await supabase
    .from("hr_tavollet")
    .select("*")
    .neq("statusz", "elutasitva")
    .order("kezdet_datuma", { ascending: true })

  // 5. Csapat (Közvetlen beosztottak) lekérése
  const { data: rawTeamMembers } = await supabase
    .from("hr_jogviszony")
    .select(`
      dolgozo_id,
      hr_dolgozo_adatlap!inner(id, felhasznalo_profil!inner(nev, kozvetlen_vezeto_id)),
      hr_beosztas(hr_munkakor(megnevezes))
    `)
    .eq("hr_dolgozo_adatlap.felhasznalo_profil.kozvetlen_vezeto_id", user.id)

  const teamMembers = (rawTeamMembers || []).map((j: any) => ({
    id: j.dolgozo_id,
    felhasznalo_profil: j.hr_dolgozo_adatlap?.felhasznalo_profil,
    munkakor: j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs beosztás"
  }))

  const todayAbsentCount = teamMembers.filter(m => todayAbsentIds.has(m.id)).length
  const pendingCount = pendingLeaves?.length ?? 0

  return (
    <div className="space-y-6 pb-10">

      {/* Fejléc */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vezetői Nézet</h1>
          <p className="text-muted-foreground mt-1">Csapat áttekintés és jóváhagyások.</p>
        </div>

        {/* Kompakt stat-chipek */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-sm">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium tabular-nums">{teamMembers.length}</span>
            <span className="text-muted-foreground">beosztott</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm ${
            pendingCount > 0
              ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700"
              : "bg-card"
          }`}>
            <Clock className={`w-3.5 h-3.5 ${pendingCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            <span className={`font-medium tabular-nums ${pendingCount > 0 ? "text-amber-700 dark:text-amber-400" : ""}`}>
              {pendingCount}
            </span>
            <span className="text-muted-foreground">függő kérelem</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-sm">
            <CalendarX className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium tabular-nums">{todayAbsentCount}</span>
            <span className="text-muted-foreground">ma távol</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">

        {/* Bal oszlop: Jóváhagyások + Naptár */}
        <div className="md:col-span-2 space-y-6">

          {/* Jóváhagyásra váró kérelmek */}
          <Card className={`border-l-4 ${pendingCount > 0 ? "border-l-amber-500" : "border-l-emerald-500"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {pendingCount > 0
                    ? <Clock className="w-4 h-4 text-amber-500" />
                    : <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  }
                  <CardTitle className="text-base font-semibold">
                    Jóváhagyásra váró kérelmek
                  </CardTitle>
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </div>
              </div>
              {pendingCount === 0 && (
                <CardDescription className="mt-0.5">A csapatod összes kérelmét elintézted.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {pendingCount > 0 ? (
                <div className="space-y-2">
                  {pendingLeaves!.map(approval => {
                    const nev = (approval as any).hr_dolgozo_adatlap?.felhasznalo_profil?.nev || "Ismeretlen"
                    const initials = nev.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()
                    const startDate = new Date(approval.kezdet_datuma).toLocaleDateString("hu-HU")
                    const endDate = new Date(approval.veg_datuma).toLocaleDateString("hu-HU")
                    const tipusLabel = TIPUS_LABEL[approval.tipus] ?? approval.tipus

                    return (
                      <div
                        key={approval.id}
                        className="flex items-center gap-4 p-3 rounded-lg border border-l-2 border-l-amber-400 hover:bg-muted/30 transition-colors"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-none">{nev}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[11px] font-semibold uppercase tracking-wide">
                              {tipusLabel}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {startDate} – {endDate}
                            </span>
                          </div>
                        </div>
                        <LeaveActionButtons leaveId={approval.id} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg bg-muted/10">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Nincs függő kérelem</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Csapatnaptár */}
          <TeamCalendar teamMembers={teamMembers || []} leaves={allLeaves || []} />
        </div>

        {/* Jobb oszlop: Csapatlista */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Közvetlen Beosztottak
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {teamMembers.length} fő
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamMembers.length > 0 ? (
                <div className="divide-y divide-border">
                  {teamMembers.map(member => {
                    const nev = (member.felhasznalo_profil as any)?.nev || "Ismeretlen"
                    const initials = nev.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()
                    const isAbsent = todayAbsentIds.has(member.id)
                    const hasPending = todayPendingIds.has(member.id)

                    return (
                      <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={`text-xs font-semibold ${
                            isAbsent
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none truncate">{nev}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.munkakor}</p>
                        </div>
                        {isAbsent ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-semibold shrink-0">
                            Távol
                          </span>
                        ) : hasPending ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-semibold shrink-0">
                            Függőben
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold shrink-0">
                            Irodában
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nincs megjeleníthető beosztott.
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-border">
                <Link href="/hr/admin">
                  <Button variant="outline" className="w-full text-xs h-8">
                    Minden beosztott megtekintése
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
