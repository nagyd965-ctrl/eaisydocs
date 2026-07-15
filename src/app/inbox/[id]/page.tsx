import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { FilingPanelClient } from "@/components/filing-panel-client"

export default async function InboxItemPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Fetch the irat details
  const { data: irat } = await supabase
    .from("irat")
    .select(`
      id,
      erkeztetoszam,
      erkezes_datuma,
      targy,
      erkezes_modja,
      ugyirat_id,
      partner ( nev )
    `)
    .eq("id", resolvedParams.id)
    .single()

  if (!irat) {
    notFound()
  }

  // 2. Fetch the associated file (irat_fajl)
  const { data: fajl } = await supabase
    .from("irat_fajl")
    .select("storage_path, mime_type, eredeti_fajlnev")
    .eq("irat_id", resolvedParams.id)
    .single()

  let pdfUrl = null
  
  if (fajl && fajl.storage_path) {
    // Instead of a signed URL, we use our secure API route which handles watermarking
    pdfUrl = `/api/pdf/${resolvedParams.id}`
  }

  // 3. Fetch data needed for the filing form
  const { data: tervek } = await supabase
    .from("irattari_terv")
    .select("id, tetelszam, megnevezes")
    .order("tetelszam")

  const { data: aktivUgyiratok } = await supabase
    .from("ugyirat")
    .select("id, iktatoszam, ugy ( targy )")
    .in("statusz", ["iktatva", "szignalt", "ugyintezes_alatt"])
    .order("iktatas_datuma", { ascending: false })

  return (
    <div className="h-[calc(100vh-6rem)] overflow-hidden rounded-md border bg-background shadow-sm">
      <FilingPanelClient 
        irat={irat} 
        pdfUrl={pdfUrl} 
        tervek={tervek || []} 
        ugyiratok={aktivUgyiratok || []} 
      />
    </div>
  )
}
