import { createClient as createAdminClient } from "@supabase/supabase-js"
import { OffboardingList } from "@/components/hr/offboarding-list"
import { AddOffboardingDialog } from "@/components/hr/add-offboarding-dialog"
import { Shield } from "lucide-react"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export const dynamic = "force-dynamic"

export default async function OffboardingPage() {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Nincs jogosultságod a Kiléptetés (Offboarding) modul megtekintéséhez a kiválasztott cégnél.</p>
        </div>
      </div>
    )
  }

  const { activeCompanyId } = auth

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Offboarding folyamatok az aktív céghez (feladatokkal és profilokkal)
  const { data: rawOffboardings, error: offError } = await supabaseAdmin
    .from("hr_offboarding")
    .select(`
      *,
      hr_offboarding_feladat (*),
      felhasznalo_profil (
        id,
        nev,
        hr_szervezeti_egyseg:hr_szervezeti_egyseg_id (nev)
      ),
      hr_kilepes_interju (*)
    `)
    .eq("company_id", activeCompanyId)
    .order("created_at", { ascending: false })

  if (offError) {
    console.error("Hiba offboarding adatok lekérésekor:", offError)
  }

  // Fallback feloldás hiányzó munkakör és részleg esetén
  const offboardings = await Promise.all(
    (rawOffboardings || []).map(async (item: any) => {
      let munkakor = item.munkakor
      let reszleg = item.reszleg || item.felhasznalo_profil?.hr_szervezeti_egyseg?.nev || null

      if ((!munkakor || !reszleg) && item.dolgozo_id) {
        // 1. Megpróbáljuk hr_jogviszony -> hr_beosztas -> hr_munkakor-ból
        const { data: jogviszony } = await supabaseAdmin
          .from("hr_jogviszony")
          .select("hr_beosztas(hr_munkakor(megnevezes, szervezeti_egyseg:szervezeti_egyseg_id(nev)))")
          .eq("dolgozo_id", item.dolgozo_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        const beosztas: any = Array.isArray(jogviszony?.hr_beosztas) ? jogviszony?.hr_beosztas[0] : jogviszony?.hr_beosztas
        const munkakorData: any = Array.isArray(beosztas?.hr_munkakor) ? beosztas?.hr_munkakor[0] : beosztas?.hr_munkakor
        if (munkakorData?.megnevezes && !munkakor) {
          munkakor = munkakorData.megnevezes
        }
        const szEgyseg: any = Array.isArray(munkakorData?.szervezeti_egyseg) ? munkakorData?.szervezeti_egyseg[0] : munkakorData?.szervezeti_egyseg
        if (szEgyseg?.nev && !reszleg) {
          reszleg = szEgyseg.nev
        }

        // 2. Ha még mindig hiányzik, felhasznalo_profil.pozicio
        if (!munkakor) {
          const { data: prof } = await supabaseAdmin
            .from("felhasznalo_profil")
            .select("pozicio")
            .eq("id", item.dolgozo_id)
            .maybeSingle()
          if (prof?.pozicio) munkakor = prof.pozicio
        }

        // Ha találtunk adatot és a DB-ben hiányzott, perzisztáljuk csendben
        if ((munkakor && !item.munkakor) || (reszleg && !item.reszleg)) {
          await supabaseAdmin
            .from("hr_offboarding")
            .update({
              munkakor: munkakor || item.munkakor,
              reszleg: reszleg || item.reszleg,
            })
            .eq("id", item.id)
        }
      }

      return {
        ...item,
        munkakor: munkakor || item.munkakor,
        reszleg: reszleg || item.reszleg,
      }
    })
  )

  // Dolgozók a legördülő listához (valós eaisyHR munkatársak a hr_dolgozo_adatlap alapján)
  const { data: adatlapEmployees, error: empError } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .select(`
      id,
      felhasznalo_profil (
        id,
        nev
      )
    `)
    .eq("company_id", activeCompanyId)

  if (empError) {
    console.error("Hiba dolgozók lekérésekor:", empError)
  }

  // Folyamatban lévő és lezárt offboardinggal rendelkező dolgozók azonosítói
  const activeOffboardingDolgozoIds = new Set(
    (rawOffboardings || [])
      .filter((o: any) => o.statusz === "folyamatban")
      .map((o: any) => o.dolgozo_id)
  )

  const closedOffboardingDolgozoIds = new Set(
    (rawOffboardings || [])
      .filter((o: any) => o.statusz === "lezart")
      .map((o: any) => o.dolgozo_id)
  )

  const employees = (adatlapEmployees || [])
    .map((item: any) => {
      const prof = Array.isArray(item.felhasznalo_profil) ? item.felhasznalo_profil[0] : item.felhasznalo_profil
      return {
        id: item.id,
        nev: prof?.nev || "Névtelen munkatárs",
        hasActiveOffboarding: activeOffboardingDolgozoIds.has(item.id),
        isClosedOffboarding: closedOffboardingDolgozoIds.has(item.id),
      }
    })
    .filter((emp: any) => emp.nev && !emp.isClosedOffboarding)
    .sort((a: any, b: any) => a.nev.localeCompare(b.nev, "hu"))

  // Kilépési interjúk az összesítő tabhoz (csak a cég offboardingjaihoz)
  const offboardingIds = (rawOffboardings || []).map((o: any) => o.id)
  const { data: exitInterviews, error: interviewError } = offboardingIds.length > 0
    ? await supabaseAdmin
        .from("hr_kilepes_interju")
        .select(`
          *,
          hr_offboarding (
            kilepes_datuma,
            felhasznalo_profil (nev)
          )
        `)
        .in("offboarding_id", offboardingIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null }

  if (interviewError) {
    console.error("Hiba exit interjúk lekérésekor:", interviewError)
  }

  // Flatten: az employee nevet és kilépési dátumot emeljük fel a főszintre
  const flatInterviews = (exitInterviews || []).map((i: any) => ({
    ...i,
    felhasznalo_profil: i.hr_offboarding?.felhasznalo_profil,
    kilepes_datuma:     i.hr_offboarding?.kilepes_datuma,
  }))

  return (
    <div key={activeCompanyId} className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Kiléptetés (Offboarding)</h1>
          <p className="text-muted-foreground mt-1">
            Eszközvisszavételek, jogosultságmegvonások, kilépési feladatok és interjúk nyomon követése.
          </p>
        </div>
        <AddOffboardingDialog employees={employees || []} />
      </div>

      <OffboardingList
        offboardings={offboardings || []}
        employees={employees || []}
        exitInterviews={flatInterviews}
      />
    </div>
  )
}
