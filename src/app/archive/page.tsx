import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
      ugy ( targy ),
      irat ( count )
    `)
    .in("statusz", ["lezart", "irattarban", "selejtezheto"])
    .order("megorzesi_ido_vege", { ascending: true })

  // Categorize
  const archivedDossiers = []
  const scrappingSuggestions = []
  const scrappedDossiers = []

  if (dossiers) {
    for (const d of dossiers) {
      if (d.statusz === "selejtezheto") {
        scrappedDossiers.push(d)
      } else {
        archivedDossiers.push(d)
        // If it's archived/lezart and the retention date has passed, it's a suggestion
        if (d.megorzesi_ido_vege && d.megorzesi_ido_vege <= todayStr) {
          scrappingSuggestions.push(d)
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Irattár és Selejtezés</h1>
        <p className="text-muted-foreground">Lezárt és archivált ügyiratok, valamint a selejtezésre váró dokumentumok.</p>
      </div>

      <ArchiveClient 
        archivedDossiers={archivedDossiers} 
        scrappingSuggestions={scrappingSuggestions} 
        scrappedDossiers={scrappedDossiers} 
      />
    </div>
  )
}
