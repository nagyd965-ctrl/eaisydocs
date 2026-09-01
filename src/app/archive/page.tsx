


import { createClient } from "@/utils/supabase/server"
import { ArchiveClient } from "@/components/archive-client"

export default async function ArchivePage() {
  const supabase = await createClient()
  const todayStr = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

  // Keresünk ügyiratokat a megfelelő státuszokkal, és összesítjük hozzájuk az iratokat.
  // A count() query trükk Supabase JS-ben:
  const { data: dossiers } = await supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      megorzesi_ido_vege,
      ugy ( targy, statusz ),
      irat ( count )
    `)
    .in("statusz", ["lezart", "irattarban", "selejtezheto"])
    .order("megorzesi_ido_vege", { ascending: true })

  // Categorize
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
        if (d.megorzesi_ido_vege && d.megorzesi_ido_vege <= todayStr) {
          scrappingSuggestions.push(d)
        }
      }
    }
  }

  return (
    <div className="page-animate space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Irattár és Selejtezés</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Lezárt ügyiratok, selejtezési javaslatok és jóváhagyandó selejtezések.</p>
      </div>

      <ArchiveClient 
        archivedDossiers={archivedDossiers} 
        scrappingSuggestions={scrappingSuggestions} 
        pendingApprovals={pendingApprovals}
        scrappedDossiers={scrappedDossiers} 
      />
    </div>
  )
}
