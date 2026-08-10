import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { FilingPanelClient } from "@/components/filing-panel-client"

export default async function InboxItemPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let docs_szerepkor = 'ugyintezo'
  if (user) {
    const { data: profile } = await supabase.from('felhasznalo_profil').select('docs_szerepkor').eq('id', user.id).single()
    docs_szerepkor = profile?.docs_szerepkor || 'ugyintezo'
  }

  if (docs_szerepkor === 'betekinto' || docs_szerepkor === 'ugyintezo') {
    redirect("/dossiers")
  }

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

  // 2. Fetch the associated files (irat_fajl)
  const { data: fajlok } = await supabase
    .from("irat_fajl")
    .select("id, storage_path, mime_type, eredeti_fajlnev")
    .eq("irat_id", resolvedParams.id)

  let pdfUrl = null
  
  if (fajlok && fajlok.length > 0) {
    // 1. Megpróbálunk találni egy olyan PDF-et, ami NEM az e-mail törzse (nem 'email_torzs'-el kezdődik)
    let fajl = fajlok.find(f => 
      (f.mime_type === 'application/pdf' || (f.eredeti_fajlnev && f.eredeti_fajlnev.toLowerCase().endsWith('.pdf'))) &&
      !(f.eredeti_fajlnev && f.eredeti_fajlnev.toLowerCase().startsWith('email_torzs'))
    );
    
    // 2. Ha nincs ilyen, akkor jöhet bármilyen PDF (pl. ha csak az e-mail törzse van)
    if (!fajl) {
      fajl = fajlok.find(f => f.mime_type === 'application/pdf' || (f.eredeti_fajlnev && f.eredeti_fajlnev.toLowerCase().endsWith('.pdf')));
    }
    
    // 3. Ha az sincs, akkor az első fájl
    if (!fajl) {
      fajl = fajlok[0];
    }
    
    if (fajl && fajl.storage_path) {
      // Pass the specific file ID to the API to ensure we preview the correct attachment
      pdfUrl = `/api/pdf/${resolvedParams.id}?fileId=${fajl.id}`
    }
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

  const { data: departments } = await supabase
    .from("szervezeti_egyseg")
    .select("id, nev, iktato_prefix")
    .order("nev")

  return (
    <div className="h-[calc(100vh-6rem)] overflow-hidden rounded-md border bg-background">
      <FilingPanelClient 
        irat={irat} 
        pdfUrl={pdfUrl} 
        tervek={tervek || []} 
        ugyiratok={aktivUgyiratok || []} 
        departments={departments || []}
      />
    </div>
  )
}
