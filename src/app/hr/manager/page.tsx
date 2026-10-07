import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Users, CalendarX } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { TeamCalendar } from "@/components/hr/team-calendar"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SubstituteAlertBanner } from "@/components/hr/substitute-alert-banner"
import { UnifiedApprovalsPanel, type UnifiedApprovalItem } from "@/components/hr/unified-approvals-panel"

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

  // 2. Jóváhagyásra váró távolléti kérelmek (direkt szignált VAGY beosztott kérelme)
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

  // 3. Jóváhagyásra váró munkaidő korrekciók (vezető jóváhagyása vagy beosztott kérelme)
  const pendingCorrectionsQuery = supabase
    .from("hr_jelenlet_korrekcio")
    .select("*, felhasznalo_profil:dolgozo_id(nev)")
    .eq("statusz", "jovahagyasra_var")
    .order("created_at", { ascending: false })

  const { data: pendingCorrections } = teamMemberIds.length > 0
    ? await pendingCorrectionsQuery.or(
        `jovahagyo_id.eq.${user.id},dolgozo_id.in.(${teamMemberIds.join(",")})`
      )
    : await pendingCorrectionsQuery.eq("jovahagyo_id", user.id)

  // 4. Jóváhagyásra váró túlóra kérelmek
  const { data: pendingOvertimes } = teamMemberIds.length > 0
    ? await supabase
        .from("hr_tulora_felhasznalás")
        .select("*, felhasznalo_profil:dolgozo_id(nev)")
        .in("dolgozo_id", teamMemberIds)
        .eq("statusz", "jovahagyasra_var")
        .order("created_at", { ascending: false })
    : { data: [] }

  // 5. Egységes kérelmi lista összeállítása
  const unifiedItems: UnifiedApprovalItem[] = [
    ...(pendingLeaves || []).map((l: any) => ({
      id: l.id,
      category: "tavollet" as const,
      dolgozoId: l.dolgozo_id,
      dolgozoNev: l.hr_dolgozo_adatlap?.felhasznalo_profil?.nev || "Ismeretlen",
      createdAt: l.created_at,
      tavolletTipus: l.tipus,
      kezdetDatuma: l.kezdet_datuma,
      vegDatuma: l.veg_datuma,
      munkanapokSzama: l.munkanapok_szama,
      indoklas: l.indoklas,
    })),
    ...(pendingCorrections || []).map((c: any) => ({
      id: c.id,
      category: "korrekcio" as const,
      dolgozoId: c.dolgozo_id,
      dolgozoNev: c.felhasznalo_profil?.nev || "Ismeretlen",
      createdAt: c.created_at,
      korrekcioDatum: c.datum,
      eredetiBecsekkolas: c.eredeti_becsekkolas,
      eredetiKicsekkolas: c.eredeti_kicsekkolas,
      ujBecsekkolas: c.uj_becsekkolas,
      ujKicsekkolas: c.uj_kicsekkolas,
      indoklas: c.indoklas,
    })),
    ...(pendingOvertimes || []).map((o: any) => ({
      id: o.id,
      category: "tulora" as const,
      dolgozoId: o.dolgozo_id,
      dolgozoNev: o.felhasznalo_profil?.nev || "Ismeretlen",
      createdAt: o.created_at,
      tuloraTipus: o.tipus,
      tuloraPerc: o.perc,
      indoklas: o.megjegyzes,
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalPendingCount = unifiedItems.length

  // 6. Mai távollétek a valós státuszhoz
  const { data: todayLeaves } = await supabase
    .from("hr_tavollet")
    .select("dolgozo_id, statusz")
    .lte("kezdet_datuma", todayStr)
    .gte("veg_datuma", todayStr)
    .in("statusz", ["jovahagyva", "jovahagyasra_var"])

  const todayAbsentIds = new Set(
    (todayLeaves || []).filter(l => l.statusz === "jovahagyva").map(l => l.dolgozo_id)
  )
  const todayPendingIds = new Set(
    (todayLeaves || []).filter(l => l.statusz === "jovahagyasra_var").map(l => l.dolgozo_id)
  )

  // 7. Összes kérelem a naptárhoz
  const { data: allLeaves } = await supabase
    .from("hr_tavollet")
    .select("*")
    .neq("statusz", "elutasitva")
    .order("kezdet_datuma", { ascending: true })

  // 8. Csapat (Közvetlen beosztottak) lekérése
  const { data: rawTeamMembers } = await supabase
    .from("hr_jogviszony")
    .select(`
      dolgozo_id,
      hr_dolgozo_adatlap!inner(id, felhasznalo_profil!inner(nev, kozvetlen_vezeto_id)),
      hr_beosztas(hr_munkakor(megnevezes))
    `)
    .eq("hr_dolgozo_adatlap.felhasznalo_profil.kozvetlen_vezeto_id", user.id)

  const teamMemberMap = new Map<string, any>()
  for (const j of (rawTeamMembers as any[]) || []) {
    if (!j.dolgozo_id || teamMemberMap.has(j.dolgozo_id)) continue
    teamMemberMap.set(j.dolgozo_id, {
      id: j.dolgozo_id,
      felhasznalo_profil: j.hr_dolgozo_adatlap?.felhasznalo_profil,
      munkakor: j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs beosztás",
    })
  }
  const teamMembers = Array.from(teamMemberMap.values())

  const todayAbsentCount = teamMembers.filter(m => todayAbsentIds.has(m.id)).length

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
            totalPendingCount > 0
              ? "border-warning/40 bg-warning-subtle"
              : "bg-card"
          }`}>
            <Clock className={`w-3.5 h-3.5 ${totalPendingCount > 0 ? "text-warning" : "text-muted-foreground"}`} />
            <span className={`font-medium tabular-nums ${totalPendingCount > 0 ? "text-warning" : ""}`}>
              {totalPendingCount}
            </span>
            <span className="text-muted-foreground">függő kérelem</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-sm">
            <CalendarX className="w-3.5 h-3.5 text-info" />
            <span className="font-medium tabular-nums">{todayAbsentCount}</span>
            <span className="text-muted-foreground">ma távol</span>
          </div>
        </div>
      </div>

      {/* Helyettesítési figyelmeztető banner */}
      <SubstituteAlertBanner managerId={user.id} pendingApprovalsCount={totalPendingCount} />

      <div className="grid gap-6 md:grid-cols-3">

        {/* Bal oszlop: Egységes Jóváhagyási Hub + Csapatnaptár */}
        <div className="md:col-span-2 space-y-6">

          {/* Egységes Kérelmi Panel (Szabadság + Munkaidő Korrekció + Túlóra) */}
          <UnifiedApprovalsPanel initialItems={unifiedItems} />

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
                              ? "bg-destructive/10 text-destructive"
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
                          <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold shrink-0">
                            Távol
                          </span>
                        ) : hasPending ? (
                          <span className="px-2 py-0.5 rounded-full bg-warning-subtle text-warning text-[10px] font-semibold shrink-0">
                            Függőben
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-success-subtle text-success text-[10px] font-semibold shrink-0">
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
