import { createClient } from "@/utils/supabase/server"
import { ArchiveClient } from "@/components/archive-client"
import { isFourEyesDisposalRequired } from "@/utils/system-settings"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export default async function ArchivePage(props: {
  searchParams?: Promise<{ cutoffDate?: string }>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const todayStr = new Date().toISOString().split("T")[0] // 'YYYY-MM-DD'
  const cutoffDate = searchParams?.cutoffDate || todayStr

  // Lekérjük az aktív cég azonosítóját
  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  // Lekérjük a négyszem-elv beállítást
  const fourEyesRequired = await isFourEyesDisposalRequired()

  // Lekérjük az ügyiratokat az irattári tervvel és iratok számával együtt az aktív céghez
  const { data: dossiers } = await supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      megorzesi_ido_vege,
      ugy:ugy_id ( id, targy, statusz ),
      irattari_terv:irattari_tetel_id ( id, tetelszam, megnevezes, megorzesi_ido_ev, selejtezheto ),
      irat ( count )
    `)
    .eq("company_id", companyScope)
    .in("statusz", ["lezart", "irattarban", "selejtezheto", "selejtezett"])
    .order("megorzesi_ido_vege", { ascending: true })

  // Lekérjük a korábbi és folyamatban lévő selejtezési csomagokat az aktív céghez
  let batchQuery = supabase
    .from("selejtezes_csomag")
    .select(`
      id,
      statusz,
      javaslattevo_user_id,
      jovahagyo_user_id,
      jegyzokonyv_path,
      created_at,
      jovahagyva_at,
      selejtezes_tetel (
        ugyirat_id,
        ugyirat:ugyirat_id (
          id,
          iktatoszam,
          ugy:ugy_id ( targy ),
          irattari_terv:irattari_tetel_id ( id, tetelszam, megnevezes ),
          irat ( count )
        )
      )
    `)
    .order("created_at", { ascending: false })

  if (activeCompanyId) {
    batchQuery = batchQuery.eq("company_id", activeCompanyId)
  }

  const { data: batches } = await batchQuery

  // Felhasználónevek a csomagokhoz
  const { data: profiles } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")

  const userMap: Record<string, string> = {}
  profiles?.forEach((p) => {
    userMap[p.id] = p.nev
  })

  // Csomagok feldúsítása nevekkel
  const enrichedBatches = (batches || []).map((b) => ({
    ...b,
    javaslattevo_nev: userMap[b.javaslattevo_user_id] || "Iratkezelő",
    jovahagyo_nev: b.jovahagyo_user_id ? userMap[b.jovahagyo_user_id] || "Vezető" : null,
  }))

  // Kategorizálás
  const archivedDossiers = []
  const scrappingSuggestions = []
  const pendingApprovals = []
  const scrappedDossiers = []

  if (dossiers) {
    for (const d of dossiers) {
      const ugy = Array.isArray(d.ugy) ? (d.ugy as any)[0] : d.ugy
      const ugyStatusz = (ugy as any)?.statusz

      if (d.statusz === "selejtezett" || ugyStatusz === "selejtezett") {
        scrappedDossiers.push(d)
      } else if (d.statusz === "selejtezheto") {
        pendingApprovals.push(d)
      } else {
        archivedDossiers.push(d)
        // Megadott fordulónapig lejárt megőrzési idejű ügyiratok
        if (d.megorzesi_ido_vege && d.megorzesi_ido_vege <= cutoffDate) {
          scrappingSuggestions.push(d)
        }
      }
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, szerepkor")
    .eq("id", user?.id || "")
    .maybeSingle()
  const currentUserRole = currentProfile?.docs_szerepkor || currentProfile?.szerepkor || "ugyintezo"
  const currentUserId = user?.id || ""

  // Felterjesztők kigyűjtése a jóváhagyandó ügyiratokhoz a négy szem elve támogatására
  const proposerMap: Record<string, { userId: string; nev: string }> = {}

  // 1. Selejtezési csomagokból
  batches?.forEach((b) => {
    const pName = userMap[b.javaslattevo_user_id] || "Iratkezelő"
    b.selejtezes_tetel?.forEach((t: any) => {
      if (t.ugyirat_id) {
        proposerMap[t.ugyirat_id] = { userId: b.javaslattevo_user_id, nev: pName }
      }
    })
  })

  // 2. Eseménynaplóból a hiányzó tételekhez
  const pendingIds = pendingApprovals.map((d) => d.id)
  const missingPendingIds = pendingIds.filter((id) => !proposerMap[id])

  if (missingPendingIds.length > 0) {
    const { data: events } = await supabase
      .from("esemeny_naplo")
      .select("entitas_id, user_id")
      .in("entitas_id", missingPendingIds)
      .eq("esemeny_tipus", "modositva")
      .ilike("indoklas", "%Selejtezésre felterjesztve%")
      .order("tortent", { ascending: false })

    events?.forEach((e) => {
      if (!proposerMap[e.entitas_id]) {
        proposerMap[e.entitas_id] = {
          userId: e.user_id,
          nev: userMap[e.user_id] || "Iratkezelő",
        }
      }
    })
  }

  const enrichedPendingApprovals = pendingApprovals.map((d) => ({
    ...d,
    javaslattevo_user_id: proposerMap[d.id]?.userId,
    javaslattevo_nev: proposerMap[d.id]?.nev || "Iratkezelő",
  }))

  return (
    <div className="page-animate space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Irattár és Selejtezés</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lezárt ügyiratok megőrzési idejének követése, selejtezési és levéltári átadási folyamatok, hivatalos jegyzőkönyvek.
        </p>
      </div>

      <ArchiveClient
        key={companyScope}
        archivedDossiers={archivedDossiers}
        scrappingSuggestions={scrappingSuggestions}
        pendingApprovals={enrichedPendingApprovals}
        scrappedDossiers={scrappedDossiers}
        disposalBatches={enrichedBatches}
        cutoffDate={cutoffDate}
        todayStr={todayStr}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
        fourEyesRequired={fourEyesRequired}
      />
    </div>
  )
}
