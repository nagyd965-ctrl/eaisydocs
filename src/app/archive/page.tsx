import { createClient } from "@/utils/supabase/server"
import { ArchiveClient } from "@/components/archive-client"

export default async function ArchivePage(props: {
  searchParams?: Promise<{ cutoffDate?: string }>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const todayStr = new Date().toISOString().split("T")[0] // 'YYYY-MM-DD'
  const cutoffDate = searchParams?.cutoffDate || todayStr

  // Lekérjük az ügyiratokat az irattári tervvel és iratok számával együtt
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
    .in("statusz", ["lezart", "irattarban", "selejtezheto"])
    .order("megorzesi_ido_vege", { ascending: true })

  // Lekérjük a korábbi és folyamatban lévő selejtezési csomagokat
  const { data: batches } = await supabase
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
          ugy:ugy_id ( targy )
        )
      )
    `)
    .order("created_at", { ascending: false })

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

      if (ugyStatusz === "selejtezett") {
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

  return (
    <div className="page-animate space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Irattár és Selejtezés</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lezárt ügyiratok megőrzési idejének követése, selejtezési és levéltári átadási folyamatok, hivatalos jegyzőkönyvek.
        </p>
      </div>

      <ArchiveClient
        archivedDossiers={archivedDossiers}
        scrappingSuggestions={scrappingSuggestions}
        pendingApprovals={pendingApprovals}
        scrappedDossiers={scrappedDossiers}
        disposalBatches={enrichedBatches}
        cutoffDate={cutoffDate}
        todayStr={todayStr}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
      />
    </div>
  )
}
