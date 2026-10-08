import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { DashboardOverview } from "@/components/dashboard-overview"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: authUser } = await supabase.auth.getUser()

  if (!authUser?.user) {
    redirect("/login")
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev, docs_szerepkor, hr_szerepkor, elerheto_modulok, szervezeti_egyseg_id")
    .eq("id", authUser.user.id)
    .maybeSingle()

  // Ha a felhasználónak NINCS eaisyDocs hozzáférése, de van eaisyHR, azonnal átirányítjuk a HR-re
  if (userProfile?.elerheto_modulok && !userProfile.elerheto_modulok.includes("docs") && userProfile.elerheto_modulok.includes("hr")) {
    const isHrStaff = ["hr_munkatars", "hr_vezeto", "admin", "rendszergazda", "auditor"].includes(userProfile.hr_szerepkor || "")
    redirect(isHrStaff ? "/hr/admin" : "/hr")
  }

  const userId = authUser.user.id
  const userName = userProfile?.nev || "Felhasználó"
  const userRole = userProfile?.docs_szerepkor || "ugyintezo"

  const todayStr = new Date().toISOString().split("T")[0]

  // Párhuzamos adatlekérések a teljes körű dashboardhoz a kiválasztott cégre szűrve
  const [
    { data: rawIratok },
    { data: rawUgyiratok },
    { data: rawDepts },
    { data: rawTasks },
    { count: batchesCount },
    { data: rawIrattariTervek },
    { count: pendingDisposalCount },
    { count: expiredCount },
  ] = await Promise.all([
    supabase
      .from("irat")
      .select(`
        id, erkezes_datuma, erkeztetoszam, targy, irany, erkezes_modja, minosites, ugyirat_id, created_at,
        kuldo_partner:kuldo_partner_id(id, nev),
        ugyirat:ugyirat_id(id, iktatoszam, irattari_terv:irattari_tetel_id(megnevezes))
      `)
      .eq("company_id", companyScope)
      .order("created_at", { ascending: false }),
    supabase
      .from("ugyirat")
      .select(`
        id,
        iktatoszam,
        statusz,
        iktatas_datuma,
        megorzesi_ido_vege,
        szervezeti_egyseg_id,
        szervezeti_egyseg(id, nev),
        ugy:ugy_id(id, targy, hatarido, felelos_user_id, statusz),
        irattari_terv:irattari_tetel_id(megnevezes)
      `)
      .eq("company_id", companyScope)
      .order("iktatas_datuma", { ascending: false }),
    supabase
      .from("szervezeti_egyseg")
      .select("id, nev")
      .eq("company_id", companyScope),
    supabase
      .from("feladat")
      .select("id, leiras, hatarido, allapot, felelos_user_id, ugyirat_id, ugyirat:ugyirat_id(iktatoszam)")
      .eq("company_id", companyScope)
      .order("hatarido", { ascending: true }),
    supabase
      .from("selejtezes_csomag")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyScope),
    // Irattári tételek a bizonylattípus statisztikához
    supabase
      .from("irattari_terv")
      .select("id, megnevezes")
      .eq("company_id", companyScope),
    // Selejtezésre váró (jóváhagyásra vár) csomagok száma
    supabase
      .from("ugyirat")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyScope)
      .eq("statusz", "selejtezheto"),
    // Lejárt megőrzési idejű, még nem selejtezett iratok
    supabase
      .from("ugyirat")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyScope)
      .in("statusz", ["irattarban", "lezart"])
      .lte("megorzesi_ido_vege", todayStr)
      .not("megorzesi_ido_vege", "is", null),
  ])

  // Dátum formázás a bannerhez
  const todayFormatted = new Date().toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  })

  // Adatok előkészítése a DashboardOverview komponens számára
  const allIratok = (rawIratok || []).map((i: any) => {
    const ui = Array.isArray(i.ugyirat) ? i.ugyirat[0] : i.ugyirat
    const terv = Array.isArray(ui?.irattari_terv) ? ui?.irattari_terv[0] : ui?.irattari_terv
    return {
      id: i.id,
      erkezes_datuma: i.erkezes_datuma,
      erkeztetoszam: i.erkeztetoszam,
      targy: i.targy,
      irany: i.irany,
      erkezes_modja: i.erkezes_modja,
      minosites: i.minosites,
      ugyirat_id: i.ugyirat_id,
      created_at: i.created_at,
      partner_nev: (Array.isArray(i.kuldo_partner) ? i.kuldo_partner[0]?.nev : i.kuldo_partner?.nev) || "Ismeretlen küldő",
      bizonylat_tipus: terv?.megnevezes || null,
    }
  })

  const allUgyiratok = (rawUgyiratok || []).map((u: any) => {
    const ugy = Array.isArray(u.ugy) ? u.ugy[0] : u.ugy
    const dept = Array.isArray(u.szervezeti_egyseg) ? u.szervezeti_egyseg[0] : u.szervezeti_egyseg
    const terv = Array.isArray(u.irattari_terv) ? u.irattari_terv[0] : u.irattari_terv
    return {
      id: u.id,
      iktatoszam: u.iktatoszam,
      statusz: u.statusz,
      iktatas_datuma: u.iktatas_datuma,
      megorzesi_ido_vege: u.megorzesi_ido_vege,
      dept_id: u.szervezeti_egyseg_id,
      dept_name: dept?.nev || "Nincs besorolva",
      ugy_targy: ugy?.targy || "",
      hatarido: ugy?.hatarido || null,
      felelos_user_id: ugy?.felelos_user_id || null,
      bizonylat_tipus_nev: terv?.megnevezes || null,
    }
  })

  const allTasks = (rawTasks || []).map((t: any) => {
    const ui = Array.isArray(t.ugyirat) ? t.ugyirat[0] : t.ugyirat
    return {
      id: t.id,
      leiras: t.leiras,
      hatarido: t.hatarido,
      allapot: t.allapot,
      felelos_user_id: t.felelos_user_id,
      ugyirat_id: t.ugyirat_id,
      iktatoszam: ui?.iktatoszam || null,
    }
  })

  const allDepts = (rawDepts || []).map((d: any) => ({
    id: d.id,
    nev: d.nev,
  }))

  return (
    <div className="page-animate space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Áttekintés</h1>
        <p className="text-muted-foreground text-sm">
          Üdvözlünk az eaisyDocs iratkezelő rendszerben. Íme a legfrissebb teendőid és statisztikáid.
        </p>
      </div>

      {/* Üdvözlő Banner — eaisyHR stílusú, kitöltött teal háttér */}
      <div className="relative overflow-hidden rounded-lg bg-primary p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-primary-foreground">
              Üdvözlünk, {userName}!
            </h2>
            <p className="text-sm text-primary-foreground/70">Jó munkát kívánunk a mai napra!</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <span className="capitalize">{todayFormatted}</span>
          </div>
        </div>
      </div>

      {/* Részletes Dashboard Kimutatások és Operatív Műszerfal */}
      <DashboardOverview
        key={companyScope}
        currentUserId={userId}
        currentUserRole={userRole}
        allIratok={allIratok}
        allUgyiratok={allUgyiratok}
        allTasks={allTasks}
        allDepts={allDepts}
        batchesCount={batchesCount || 0}
        disposalStats={{
          pending: pendingDisposalCount || 0,
          expired: expiredCount || 0,
          scrapped: allUgyiratok.filter(u => u.statusz === "selejtezett").length,
        }}
      />
    </div>
  )
}
