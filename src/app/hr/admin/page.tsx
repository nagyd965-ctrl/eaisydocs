import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { AddEmployeeDialog } from "@/components/hr/add-employee-dialog"
import { EaisyBooksEmployeeImportDialog } from "@/components/hr/eaisybooks-employee-import-dialog"
import { EmployeeTable } from "@/components/hr/employee-table"
import { HrTasksAndAlertsTable, type HrTaskItem } from "@/components/hr/hr-tasks-and-alerts-table"
import { KpiCard } from "@/components/kpi-card"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.ceil(
    (new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  )
}

export default async function HrAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  const { data: currentCompany } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyScope)
    .maybeSingle()

  const currentCompanyName = currentCompany?.name || "Aktív Vállalat"

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)
  const hrRole = scopedRoles.hrRole || profile?.hr_szerepkor || "munkavallalo"

  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin", "rendszergazda", "auditor", "berugyi", "munkavedelmi"].includes(hrRole)
  if (!isHrOrAdmin) {
    redirect("/hr/self-service/profile")
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)
  const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0]

  // Aktív cég tagjainak azonosítói
  const { data: companyMembers } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyScope)
  const memberUserIds = (companyMembers || []).map(m => m.user_id)
  const safeMemberIds = memberUserIds.length > 0 ? memberUserIds : ["00000000-0000-0000-0000-000000000000"]

  // Párhuzamos adatlekérések az állományhoz és a teendőkhöz
  const [
    employeesRes,
    jobsRes,
    orgUnitsRes,
    toborzasRes,
    allashirdetesekRes,
    onboardingsRes,
    pendingLeavesRes,
    pendingCorrectionsRes
  ] = await Promise.all([
    // 1. Dolgozók lekérése az aktív céghez részletes adatlappal
    supabase.from("felhasznalo_profil").select(`
      id,
      nev,
      hr_szerepkor,
      avatar_url,
      kozvetlen_vezeto_id,
      hr_szervezeti_egyseg_id,
      hr_szervezeti_egyseg ( id, nev ),
      hr_dolgozo_adatlap (
        id,
        company_id,
        munkaviszony_vege,
        orvosi_alkalmassag_ervenyesseg,
        szerzodes_tipusa,
        hr_jogviszony (
          id,
          belepes_datuma,
          probaido_vege,
          hr_beosztas (
            id,
            hr_munkakor ( id, megnevezes )
          )
        )
      )
    `).in("id", safeMemberIds).order("created_at", { ascending: true }),

    // 2. Munkakörök
    supabase.from("hr_munkakor").select("id, megnevezes").eq("company_id", companyScope).order("megnevezes"),

    // 3. Szervezeti egységek
    supabase.from("hr_szervezeti_egyseg").select("id, nev").eq("company_id", companyScope).order("nev"),

    // 4. Toborzási statisztikák
    supabaseAdmin.from("hr_toborzas").select("*").eq("company_id", companyScope),

    // 5. Álláshirdetések
    supabase.from("hr_allashirdetes")
      .select("*")
      .eq("company_id", companyScope)
      .eq("aktiv", true)
      .eq("publikus", true),

    // 6. Onboarding folyamatok
    supabase.from("hr_onboarding")
      .select("*, hr_onboarding_feladat(*)")
      .eq("company_id", companyScope),

    // 7. Függőben lévő szabadságkérelmek
    supabase.from("hr_tavollet")
      .select(`
        id, dolgozo_id, kezdet_datuma, veg_datuma, tipus, statusz,
        hr_dolgozo_adatlap ( id, felhasznalo_profil ( id, nev ) )
      `)
      .eq("company_id", companyScope)
      .eq("statusz", "jovahagyasra_var")
      .order("created_at", { ascending: false }),

    // 8. Függőben lévő jelenlét korrekciók
    supabase.from("hr_jelenlet_korrekcio")
      .select(`
        id, dolgozo_id, datum, uj_becsekkolas, uj_kicsekkolas, indoklas, statusz,
        dolgozo:felhasznalo_profil!dolgozo_id ( id, nev )
      `)
      .in("dolgozo_id", safeMemberIds)
      .eq("statusz", "jovahagyasra_var")
      .order("created_at", { ascending: false })
  ])

  if (employeesRes.error) {
    console.error("HrAdminPage employees query error:", employeesRes.error)
  }
  if (pendingLeavesRes.error) {
    console.error("HrAdminPage pendingLeaves query error:", pendingLeavesRes.error)
  }

  const employees = employeesRes.data || []
  const jobs = jobsRes.data || []
  const orgUnits = orgUnitsRes.data || []
  const toborzas = toborzasRes.data || []
  const allashirdetesek = allashirdetesekRes.data || []
  const onboardings = onboardingsRes.data || []
  const pendingLeaves = pendingLeavesRes.data || []
  const pendingCorrections = pendingCorrectionsRes.data || []

  // Jogosultság ellenőrzése admin műveletekhez (szerkesztés, törlés a törzsadatbázisban)
  const canEdit = ["admin", "rendszergazda", "hr_vezeto", "hr_munkatars"].includes(hrRole)

  // Felvételi adatokhoz meglévő fiókok - csak az aktuális céghez tartozó Docs profilok
  const assignedIds = employees.filter(e => {
    if (!e.hr_dolgozo_adatlap) return false
    const adatlap = Array.isArray(e.hr_dolgozo_adatlap) ? e.hr_dolgozo_adatlap[0] : e.hr_dolgozo_adatlap
    return adatlap && (!adatlap.company_id || adatlap.company_id === companyScope)
  }).map(e => e.id)

  const { data: docsProfiles } = await supabaseAdmin
    .from("felhasznalo_profil")
    .select("id, nev, docs_szerepkor, szerepkor, elerheto_modulok")
    .in("id", safeMemberIds)
    .contains("elerheto_modulok", ["docs"])
    .order("nev", { ascending: true })

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const emailMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) || [])

  const availableDocsUsers = (docsProfiles || []).map(u => ({
    id: u.id,
    nev: u.nev,
    email: emailMap.get(u.id) || "",
    docs_szerepkor: u.docs_szerepkor || u.szerepkor || "ugyintezo",
    isAlreadyAssigned: assignedIds.includes(u.id)
  }))

  const { data: elfogadottJelentkezok } = await supabaseAdmin
    .from("hr_toborzas")
    .select("id, nev, email, megpalyazott_munkakor_id")
    .eq("company_id", companyScope)
    .eq("statusz", "elfogadva")

  const userEmails = authUsers?.users?.map(u => u.email) || []
  const availableCandidates = elfogadottJelentkezok?.filter(j => !userEmails.includes(j.email)) || []

  const activeAdsCount = allashirdetesek.length
  const activeCandidatesCount = toborzas.filter(
    t => t.statusz !== "elutasitva" && t.statusz !== "elfogadva"
  ).length

  // Aktív HR munkatársak szűrése (csak a céghez tartozó, érvényes HR adatlappal rendelkezők)
  const activeEmployees = employees.filter((emp: any) => {
    if (!emp.hr_dolgozo_adatlap) return false
    const adatlap = Array.isArray(emp.hr_dolgozo_adatlap) ? emp.hr_dolgozo_adatlap[0] : emp.hr_dolgozo_adatlap
    if (!adatlap) return false
    if (adatlap.company_id && adatlap.company_id !== companyScope) return false
    const isExited = emp.hr_szerepkor === "inaktiv" || (adatlap?.munkaviszony_vege && new Date(adatlap.munkaviszony_vege) <= new Date())
    return !isExited
  })

  // ─── Összesített HR Teendők & Figyelmeztetések generálása ───
  const allHrTasks: HrTaskItem[] = []

  // 1. Orvosi vizsgálatok, próbaidők, szerződések ellenőrzése
  activeEmployees.forEach((emp: any) => {
    const adatlap = Array.isArray(emp.hr_dolgozo_adatlap) ? emp.hr_dolgozo_adatlap[0] : emp.hr_dolgozo_adatlap
    const orvosi = adatlap?.orvosi_alkalmassag_ervenyesseg
    const jogviszony = Array.isArray(adatlap?.hr_jogviszony) ? adatlap.hr_jogviszony[0] : adatlap?.hr_jogviszony
    const beosztas = Array.isArray(jogviszony?.hr_beosztas) ? jogviszony.hr_beosztas[0] : jogviszony?.hr_beosztas
    const munkakor = Array.isArray(beosztas?.hr_munkakor) ? beosztas.hr_munkakor[0]?.megnevezes : beosztas?.hr_munkakor?.megnevezes

    // Orvosi vizsgálat
    if (orvosi) {
      if (orvosi < todayStr) {
        allHrTasks.push({
          id: `med-exp-${emp.id}`,
          category: "medical",
          severity: "critical",
          title: "Lejárt orvosi alkalmasság (Tiltás aktív!)",
          description: "Mvt. 49. § szerinti beosztási és csekkolási tiltás van érvényben.",
          employeeName: emp.nev,
          employeeId: emp.id,
          position: munkakor || null,
          dateInfo: `Lejárt: ${orvosi}`,
          daysRemaining: daysUntil(orvosi),
          href: `/hr/employee/${emp.id}`,
          actionLabel: "Adatlap",
        })
      } else if (orvosi <= thirtyDaysStr) {
        const days = daysUntil(orvosi)
        allHrTasks.push({
          id: `med-warn-${emp.id}`,
          category: "medical",
          severity: "warning",
          title: "Orvosi vizsgálat 30 napon belül lejár",
          description: "Időszakos foglalkozás-egészségügyi vizsgálat beütemezése javasolt.",
          employeeName: emp.nev,
          employeeId: emp.id,
          position: munkakor || null,
          dateInfo: `${days} nap van hátra (${orvosi})`,
          daysRemaining: days,
          href: `/hr/employee/${emp.id}`,
          actionLabel: "Megtekintés",
        })
      }
    }

    // Próbaidő lejárata
    const probaido = jogviszony?.probaido_vege
    if (probaido && probaido >= todayStr && probaido <= thirtyDaysStr) {
      const days = daysUntil(probaido)
      allHrTasks.push({
        id: `prob-${emp.id}`,
        category: "probation",
        severity: "warning",
        title: "Próbaidő hamarosan lejár (Értékelés szükséges)",
        description: "Munkavállaló véglegesítésének vagy próbaidős értékelésének elbírálása.",
        employeeName: emp.nev,
        employeeId: emp.id,
        position: munkakor || null,
        dateInfo: `${days} nap van hátra (${probaido})`,
        daysRemaining: days,
        href: `/hr/employee/${emp.id}`,
        actionLabel: "Értékelés",
      })
    }

    // Határozott idejű munkaszerződés lejárata
    const szerzodesVeg = adatlap?.munkaviszony_vege
    if (adatlap?.szerzodes_tipusa === "határozott" && szerzodesVeg && szerzodesVeg >= todayStr && szerzodesVeg <= thirtyDaysStr) {
      const days = daysUntil(szerzodesVeg)
      allHrTasks.push({
        id: `contract-${emp.id}`,
        category: "contract",
        severity: "info",
        title: "Határozott idejű munkaszerződés lejár",
        description: "Szerződéshosszabbítás vagy jogviszony rendezése esedékes.",
        employeeName: emp.nev,
        employeeId: emp.id,
        position: munkakor || null,
        dateInfo: `${days} nap van hátra (${szerzodesVeg})`,
        daysRemaining: days,
        href: `/hr/employee/${emp.id}`,
        actionLabel: "Hosszabbítás",
      })
    }
  })

  // 2. Függőben lévő szabadságkérelmek
  pendingLeaves.forEach((leave: any) => {
    const adatlap = Array.isArray(leave.hr_dolgozo_adatlap) ? leave.hr_dolgozo_adatlap[0] : leave.hr_dolgozo_adatlap
    const profil = Array.isArray(adatlap?.felhasznalo_profil) ? adatlap.felhasznalo_profil[0] : adatlap?.felhasznalo_profil

    allHrTasks.push({
      id: `leave-${leave.id}`,
      category: "leave",
      severity: "warning",
      title: "Jóváhagyásra váró szabadságkérelem",
      description: `${leave.kezdet_datuma} – ${leave.veg_datuma}`,
      employeeName: profil?.nev || "Munkatárs",
      employeeId: profil?.id,
      dateInfo: `${leave.kezdet_datuma} – ${leave.veg_datuma}`,
      href: "/hr/manager",
      actionLabel: "Jóváhagyás",
    })
  })

  // 3. Függőben lévő munkaidő korrekciók
  pendingCorrections.forEach((corr: any) => {
    const dolgozo = Array.isArray(corr.dolgozo) ? corr.dolgozo[0] : corr.dolgozo

    allHrTasks.push({
      id: `corr-${corr.id}`,
      category: "correction",
      severity: "info",
      title: "Munkaidő korrekciós kérelem",
      description: corr.indoklas ? `${corr.datum}: ${corr.indoklas.slice(0, 50)}...` : corr.datum,
      employeeName: dolgozo?.nev || "Munkatárs",
      employeeId: corr.dolgozo_id,
      dateInfo: "Döntésre vár",
      href: "/hr/manager",
      actionLabel: "Bírálat",
    })
  })

  // 4. Onboarding folyamatok
  onboardings.forEach((o: any) => {
    const hasPending = o.hr_onboarding_feladat?.some((f: any) => f.statusz === "pending")
    if (hasPending || ["elokeszites", "folyamatban"].includes(o.statusz)) {
      allHrTasks.push({
        id: `onb-${o.id}`,
        category: "onboarding",
        severity: "info",
        title: "Új belépő beillesztési feladatai folyamatban vannak",
        description: `${o.aktualis_lepes || 1}. lépésnél tart`,
        employeeName: o.nev || "Új belépő",
        dateInfo: "Folyamatban",
        href: "/hr/onboarding",
        actionLabel: "Onboarding",
      })
    }
  })

  return (
    <div className="space-y-6 pb-12">

      {/* Fejléc */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">HR Munkaasztal</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Teljes állomány áttekintése és HR adminisztráció.
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2.5">
            <EaisyBooksEmployeeImportDialog
              companyId={companyScope}
              companyName={currentCompanyName}
            />
            <AddEmployeeDialog
              availableUsers={availableDocsUsers}
              jobs={jobs || []}
              candidates={availableCandidates}
            />
          </div>
        )}
      </div>

      {/* Stat kártyák */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Teljes Állomány"
          value={`${activeEmployees.length} fő`}
        />
        <KpiCard
          label="Nyitott Pozíciók"
          value={`${activeAdsCount} db`}
          sub={activeCandidatesCount > 0 ? `${activeCandidatesCount} aktív jelentkező` : undefined}
        />
        <KpiCard
          label="Figyelmeztetés"
          value={`${allHrTasks.length} db`}
          sub={allHrTasks.length > 0 ? "Azonnali teendő" : "Minden rendben"}
          highlight={allHrTasks.length > 0}
        />
      </div>

      {/* Dolgozói Törzsadatbázis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">
            Dolgozói Törzsadatbázis
          </CardTitle>
          <Link href="/hr/recruitment">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Toborzás kezelése
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <EmployeeTable 
            employees={activeEmployees} 
            jobs={jobs} 
            orgUnits={orgUnits} 
            canEdit={canEdit} 
          />
        </CardContent>
      </Card>

      {/* HR Teendők & Figyelmeztetések (Kereshető, szűrhető táblázat TableToolbarral) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              HR Teendők & Figyelmeztetések
              {allHrTasks.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs ml-1 py-0 px-2 bg-primary/10 text-primary border-primary/20 font-semibold tabular-nums"
                >
                  {allHrTasks.length} db
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aktuális feladatok, határidők és jóváhagyásra váró kérelmek.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <HrTasksAndAlertsTable tasks={allHrTasks} />
        </CardContent>
      </Card>

    </div>
  )
}
