import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { redirect } from "next/navigation"
import { TimeTabsView } from "@/components/hr/time-tabs-view"
import { getWeeklyShiftRoster, getCompanyShiftTemplates } from "@/app/hr/time/shift-actions"

export default async function TimeAndAttendancePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  // Biztonsági ellenőrzés
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, szerepkor")
    .eq("id", user.id)
    .single()

  const isHrAuthorized =
    profile &&
    (["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor) ||
      profile.szerepkor === "admin")

  if (!isHrAuthorized) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">
            Csak HR munkatársak férhetnek hozzá a globális naptárhoz és műszaktervezőhöz.
          </p>
        </div>
      </div>
    )
  }

  // 1. Összes (Folyamatban/Jóváhagyott/stb) kérelem, teljes cég dolgozói és szervezeti egységek lekérése a TeamCalendarhoz
  const [{ data: allLeaves }, { data: rawEmployees }, { data: orgUnits }, initialRosterData, initialTemplates] =
    await Promise.all([
      supabase
        .from("hr_tavollet")
        .select("*")
        .eq("company_id", companyScope)
        .neq("statusz", "elutasitva")
        .order("kezdet_datuma", { ascending: true }),
      supabase
        .from("hr_jogviszony")
        .select(`
          id,
          dolgozo_id,
          kilepes_datuma,
          created_at,
          hr_dolgozo_adatlap (
            id,
            felhasznalo_profil (
              id,
              nev,
              avatar_url,
              hr_szervezeti_egyseg_id,
              hr_szervezeti_egyseg:hr_szervezeti_egyseg_id ( id, nev )
            )
          ),
          hr_beosztas (
            hr_munkakor ( megnevezes )
          )
        `)
        .eq("company_id", companyScope)
        .order("created_at", { ascending: false }),
      supabase
        .from("hr_szervezeti_egyseg")
        .select("id, nev")
        .eq("company_id", companyScope)
        .order("nev", { ascending: true }),
      getWeeklyShiftRoster(),
      getCompanyShiftTemplates(),
    ])

  // Format to match what TeamCalendar expects, deduplicating by dolgozo_id
  const employeeMap = new Map<string, any>()
  for (const j of (rawEmployees as any[]) || []) {
    if (!j.dolgozo_id) continue
    const existing = employeeMap.get(j.dolgozo_id)
    if (!existing || (!j.kilepes_datuma && existing.kilepes_datuma)) {
      const prof = j.hr_dolgozo_adatlap?.felhasznalo_profil
      const orgUnitObj = Array.isArray(prof?.hr_szervezeti_egyseg)
        ? prof?.hr_szervezeti_egyseg[0]
        : prof?.hr_szervezeti_egyseg

      employeeMap.set(j.dolgozo_id, {
        id: j.dolgozo_id,
        felhasznalo_profil: prof,
        hr_munkakor: {
          megnevezes: j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs beosztás",
        },
        szervezeti_egyseg_id: prof?.hr_szervezeti_egyseg_id || orgUnitObj?.id || null,
        szervezeti_egyseg_nev: orgUnitObj?.nev || null,
        kilepes_datuma: j.kilepes_datuma,
      })
    }
  }
  const allEmployees = Array.from(employeeMap.values())

  return (
    <TimeTabsView
      initialRosterData={initialRosterData}
      initialTemplates={initialTemplates}
      teamMembers={allEmployees || []}
      leaves={allLeaves || []}
      orgUnits={orgUnits || []}
    />
  )
}
