import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/server"
import { SubstituteAlertBanner } from "@/components/hr/substitute-alert-banner"
import { ManagerTeamTabs, type ManagerTeamMember, type DailyAttendanceStatus } from "@/components/hr/manager-team-tabs"
import { type UnifiedApprovalItem } from "@/components/hr/unified-approvals-panel"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import { syncExpiredSubstitutions } from "@/utils/hr/substitute-sync"
import { Shield } from "lucide-react"

export default async function ManagerPage() {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "vezeto"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Csak vezetők és HR munkatársak férhetnek hozzá a vezetői felülethez.</p>
        </div>
      </div>
    )
  }

  // Automatikus szinkronizáció: Lejárt helyettesítések függő kérelmeinek visszaszállítása a vezetőre
  await syncExpiredSubstitutions()

  const supabase = await createClient()
  const user = auth.user
  const activeCompanyId = auth.activeCompanyId
  let companyUserIds: string[] = []
  if (activeCompanyId) {
    const { data: members } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", activeCompanyId)
    companyUserIds = (members || []).map((m: any) => m.user_id)
  }
  const companyUserSet = new Set(companyUserIds)

  const todayStr = new Date().toISOString().split("T")[0]

  // 1. Közvetlen beosztottak ID-jainak lekérése (csak az aktív cég tagjai)
  const { data: teamProfiles } = await supabase
    .from("felhasznalo_profil")
    .select("id")
    .eq("kozvetlen_vezeto_id", user.id)

  const teamMemberIds = (teamProfiles || [])
    .map((p: any) => p.id)
    .filter((id: string) => !activeCompanyId || companyUserSet.has(id))

  // 2. Távolléti kérelmek (elbírálásra váró, jóváhagyott, elutasított - direkt szignált VAGY beosztott kérelme, az aktív cégnél)
  let leavesQuery = supabase
    .from("hr_tavollet")
    .select("*, hr_dolgozo_adatlap(felhasznalo_profil(nev))")
    .in("statusz", ["jovahagyasra_var", "jovahagyva", "elutasitva"])
    .order("created_at", { ascending: false })
    .limit(150)

  if (activeCompanyId) {
    leavesQuery = leavesQuery.eq("company_id", activeCompanyId)
  }

  const { data: leaves } = teamMemberIds.length > 0
    ? await leavesQuery.or(
        `aktualis_jovahagyo_id.eq.${user.id},dolgozo_id.in.(${teamMemberIds.join(",")})`
      )
    : await leavesQuery.eq("aktualis_jovahagyo_id", user.id)

  // 3. Munkaidő korrekciók (vezető jóváhagyása vagy beosztott kérelme, az aktív cégnél)
  let correctionsQuery = supabase
    .from("hr_jelenlet_korrekcio")
    .select("*, felhasznalo_profil:dolgozo_id(nev)")
    .in("statusz", ["jovahagyasra_var", "jovahagyva", "elutasitva"])
    .order("created_at", { ascending: false })
    .limit(150)

  if (activeCompanyId) {
    correctionsQuery = correctionsQuery.eq("company_id", activeCompanyId)
  }

  const { data: corrections } = teamMemberIds.length > 0
    ? await correctionsQuery.or(
        `jovahagyo_id.eq.${user.id},dolgozo_id.in.(${teamMemberIds.join(",")})`
      )
    : await correctionsQuery.eq("jovahagyo_id", user.id)

  // 4. Túlóra kérelmek
  let overtimesQuery = supabase
    .from("hr_tulora_felhasznalás")
    .select("*, felhasznalo_profil:dolgozo_id(nev)")
    .in("statusz", ["jovahagyasra_var", "jovahagyva", "elutasitva"])
    .order("created_at", { ascending: false })
    .limit(150)

  if (activeCompanyId) {
    overtimesQuery = overtimesQuery.eq("company_id", activeCompanyId)
  }

  const { data: overtimes } = teamMemberIds.length > 0
    ? await overtimesQuery.in("dolgozo_id", teamMemberIds)
    : { data: [] }

  // 5. Egységes kérelmi lista összeállítása (státuszokkal)
  const unifiedItems: UnifiedApprovalItem[] = [
    ...(leaves || []).map((l: any) => ({
      id: l.id,
      category: "tavollet" as const,
      statusz: l.statusz || "jovahagyasra_var",
      dolgozoId: l.dolgozo_id,
      dolgozoNev: l.hr_dolgozo_adatlap?.felhasznalo_profil?.nev || "Ismeretlen",
      createdAt: l.created_at,
      tavolletTipus: l.tipus,
      kezdetDatuma: l.kezdet_datuma,
      vegDatuma: l.veg_datuma,
      munkanapokSzama: l.munkanapok_szama,
      indoklas: l.indoklas,
      elutasitasOka: l.elutasitas_oka || l.elutasitas_indoklas || null,
    })),
    ...(corrections || []).map((c: any) => ({
      id: c.id,
      category: "korrekcio" as const,
      statusz: c.statusz || "jovahagyasra_var",
      dolgozoId: c.dolgozo_id,
      dolgozoNev: c.felhasznalo_profil?.nev || "Ismeretlen",
      createdAt: c.created_at,
      korrekcioDatum: c.datum,
      eredetiBecsekkolas: c.eredeti_becsekkolas,
      eredetiKicsekkolas: c.eredeti_kicsekkolas,
      ujBecsekkolas: c.uj_becsekkolas,
      ujKicsekkolas: c.uj_kicsekkolas,
      indoklas: c.indoklas,
      elutasitasOka: c.elutasitas_oka || null,
    })),
    ...(overtimes || []).map((o: any) => ({
      id: o.id,
      category: "tulora" as const,
      statusz: o.statusz || "jovahagyasra_var",
      dolgozoId: o.dolgozo_id,
      dolgozoNev: o.felhasznalo_profil?.nev || "Ismeretlen",
      createdAt: o.created_at,
      tuloraTipus: o.tipus,
      tuloraPerc: o.perc,
      indoklas: o.megjegyzes,
      elutasitasOka: o.elutasitas_oka || null,
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalPendingCount = unifiedItems.filter(i => (i.statusz || "jovahagyasra_var") === "jovahagyasra_var").length

  // 6. Mai távollétek a valós státuszhoz (aktív cégre szűrve)
  let todayLeavesQuery = supabase
    .from("hr_tavollet")
    .select("dolgozo_id, statusz")
    .lte("kezdet_datuma", todayStr)
    .gte("veg_datuma", todayStr)
    .in("statusz", ["jovahagyva", "jovahagyasra_var"])

  if (activeCompanyId) {
    todayLeavesQuery = todayLeavesQuery.eq("company_id", activeCompanyId)
  }

  const { data: todayLeaves } = await todayLeavesQuery

  const todayAbsentIds = new Set(
    (todayLeaves || []).filter(l => l.statusz === "jovahagyva").map(l => l.dolgozo_id)
  )
  const todayPendingIds = new Set(
    (todayLeaves || []).filter(l => l.statusz === "jovahagyasra_var").map(l => l.dolgozo_id)
  )

  // 7. Összes kérelem a naptárhoz (aktív cégre szűrve)
  let allLeavesQuery = supabase
    .from("hr_tavollet")
    .select("*")
    .neq("statusz", "elutasitva")
    .order("kezdet_datuma", { ascending: true })

  if (activeCompanyId) {
    allLeavesQuery = allLeavesQuery.eq("company_id", activeCompanyId)
  }

  const { data: allLeaves } = await allLeavesQuery

  // 8. Csapat (Közvetlen beosztottak) lekérése (aktív cégre szűrve)
  let rawTeamQuery = supabase
    .from("hr_jogviszony")
    .select(`
      dolgozo_id,
      hr_dolgozo_adatlap!inner(id, felhasznalo_profil!inner(nev, email, avatar_url, kozvetlen_vezeto_id)),
      hr_beosztas(hr_munkakor(megnevezes))
    `)
    .eq("hr_dolgozo_adatlap.felhasznalo_profil.kozvetlen_vezeto_id", user.id)

  if (activeCompanyId) {
    rawTeamQuery = rawTeamQuery.eq("company_id", activeCompanyId)
  }

  const { data: rawTeamMembers } = await rawTeamQuery

  const allTeamIds = Array.from(
    new Set([
      ...teamMemberIds,
      ...((rawTeamMembers as any[]) || []).map((j: any) => j.dolgozo_id).filter(Boolean),
    ])
  )

  // 8b. Mai jelenlét (becsekkolás / kicsekkolás) adatok lekérése a csapattagokhoz
  let todayAttendances: any[] = []
  if (allTeamIds.length > 0) {
    const { data: attData } = await supabase
      .from("hr_jelenlet")
      .select("dolgozo_id, datum, becsekkolas_ideje, kicsekkolas_ideje")
      .eq("datum", todayStr)
      .in("dolgozo_id", allTeamIds)

    todayAttendances = attData || []
  }

  const attendanceMap = new Map<string, { becsekkolas_ideje?: string | null; kicsekkolas_ideje?: string | null }>()
  for (const att of todayAttendances) {
    attendanceMap.set(att.dolgozo_id, {
      becsekkolas_ideje: att.becsekkolas_ideje,
      kicsekkolas_ideje: att.kicsekkolas_ideje,
    })
  }

  const teamMemberMap = new Map<string, ManagerTeamMember & { felhasznalo_profil: any }>()
  for (const j of (rawTeamMembers as any[]) || []) {
    if (!j.dolgozo_id || teamMemberMap.has(j.dolgozo_id)) continue
    const profil = j.hr_dolgozo_adatlap?.felhasznalo_profil
    const nev = profil?.nev || "Ismeretlen"
    const avatar_url = profil?.avatar_url || null
    const email = profil?.email || undefined
    const munkakor = j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs beosztás"
    const isAbsent = todayAbsentIds.has(j.dolgozo_id)
    const hasPending = todayPendingIds.has(j.dolgozo_id)

    const att = attendanceMap.get(j.dolgozo_id)
    const isCheckedIn = !!(att?.becsekkolas_ideje && !att?.kicsekkolas_ideje)
    const isCheckedOut = !!(att?.becsekkolas_ideje && att?.kicsekkolas_ideje)

    let attendanceStatus: DailyAttendanceStatus = "nincs_becsekkolva"
    if (isCheckedIn) {
      attendanceStatus = "becsekkolva"
    } else if (isCheckedOut) {
      attendanceStatus = "kicsekkolt"
    } else if (isAbsent) {
      attendanceStatus = "tavol"
    } else if (hasPending) {
      attendanceStatus = "fuggoben"
    } else {
      attendanceStatus = "nincs_becsekkolva"
    }

    let checkInTime: string | null = null
    if (att?.becsekkolas_ideje) {
      try {
        const d = new Date(att.becsekkolas_ideje)
        checkInTime = d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
      } catch {
        // ignore
      }
    }

    let checkOutTime: string | null = null
    if (att?.kicsekkolas_ideje) {
      try {
        const d = new Date(att.kicsekkolas_ideje)
        checkOutTime = d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
      } catch {
        // ignore
      }
    }

    teamMemberMap.set(j.dolgozo_id, {
      id: j.dolgozo_id,
      nev,
      avatar_url,
      email,
      munkakor,
      isAbsent,
      hasPending,
      attendanceStatus,
      checkInTime,
      checkOutTime,
      felhasznalo_profil: profil,
    })
  }
  const teamMembers = Array.from(teamMemberMap.values())
  const todayAbsentCount = teamMembers.filter((m) => m.isAbsent).length

  return (
    <div key={activeCompanyId || "default"} className="space-y-6 pb-10">

      {/* Tiszta, lényegretörő fejléc (felesleges KPI dobozok nélkül) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vezetői Nézet</h1>
          <p className="text-muted-foreground mt-1">
            Csapat áttekintés, kérelmek elbírálása és jelenlét.
          </p>
        </div>

        {totalPendingCount > 0 && (
          <Badge variant="outline" className="text-xs px-3 py-1.5 bg-warning/10 text-warning border-warning/30 font-medium self-start sm:self-auto">
            {totalPendingCount} elbírálásra váró kérelem
          </Badge>
        )}
      </div>

      {/* Helyettesítési figyelmeztető banner */}
      <SubstituteAlertBanner managerId={user.id} pendingApprovalsCount={totalPendingCount} />

      {/* Fókuszált, teljes szélességű fül-rendszer (KPI kártyák és nyomorgás nélkül) */}
      <ManagerTeamTabs
        unifiedItems={unifiedItems}
        teamMembers={teamMembers}
        allLeaves={allLeaves || []}
        todayAbsentCount={todayAbsentCount}
      />

    </div>
  )
}
