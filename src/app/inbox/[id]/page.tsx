import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { FilingPanelClient } from "@/components/filing-panel-client"

export default async function InboxItemPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  const initialMode = resolvedSearch.mode === "new" ? "new" : undefined
  const supabase = await createClient()

  const { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || null
  const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const { data: { user } } = await supabase.auth.getUser()
  let docs_szerepkor = scopedRoles.docsRole !== "none" ? scopedRoles.docsRole : 'munkavallalo'
  if (user && (!scopedRoles.docsRole || scopedRoles.docsRole === "none")) {
    const { data: profile } = await supabase.from('felhasznalo_profil').select('docs_szerepkor').eq('id', user.id).single()
    docs_szerepkor = profile?.docs_szerepkor || 'munkavallalo'
  }

  const { getPermissions } = await import("@/utils/permissions")
  const inboxPerms = getPermissions(
    docs_szerepkor,
    scopedRoles.docsModules,
    scopedRoles.docsWriteModules,
    "inbox"
  )

  if (
    docs_szerepkor === 'betekinto' ||
    !inboxPerms.canEdit ||
    (scopedRoles.docsModules.length > 0 && !scopedRoles.docsModules.includes('inbox') && docs_szerepkor !== 'admin' && docs_szerepkor !== 'rendszergazda')
  ) {
    redirect("/inbox")
  }

  // 1. Fetch the irat details
  const { data: irat } = await supabase
    .from("irat")
    .select(`
      id,
      company_id,
      erkeztetoszam,
      erkezes_datuma,
      targy,
      erkezes_modja,
      ugyirat_id,
      kuldo_partner_id,
      partner ( id, nev, email, adoszam, kulfoldi_adoszam )
    `)
    .eq("id", resolvedParams.id)
    .single()

  if (!irat) {
    notFound()
  }

  if (companyScope && (irat as any).company_id && (irat as any).company_id !== companyScope) {
    redirect("/inbox")
  }

  // 2. Fetch the associated files (irat_fajl)
  const { data: fajlok } = await supabase
    .from("irat_fajl")
    .select("id, storage_path, mime_type, eredeti_fajlnev, kulso_fajl_url, meret_byte")
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
    
    if (fajl) {
      // Mindig az API route-ot használjuk, ami támogatja mind a helyi, mind a külső fájlokat
      pdfUrl = `/api/pdf/${resolvedParams.id}?fileId=${fajl.id}`
    }
  }

  // 3. Fetch data needed for the filing form
  // Irattari tetel lista — CEG-SZURVE (csak az aktiv ceg tetelei)
  let tervQuery = supabase
    .from("irattari_terv")
    .select("id, tetelszam, megnevezes")
    .order("tetelszam")
  if (activeCompanyId) {
    tervQuery = tervQuery.eq("company_id", activeCompanyId)
  }
  const { data: tervek } = await tervQuery

  let ugyiratQuery = supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      iktatas_datuma,
      ugy ( targy ),
      irat (
        id,
        targy,
        leiras,
        erkeztetoszam,
        partner:kuldo_partner_id ( id, nev, adoszam )
      )
    `)
    .order("iktatas_datuma", { ascending: false })

  if (companyScope) {
    ugyiratQuery = ugyiratQuery.eq("company_id", companyScope)
  }

  const { data: allUgyiratok } = await ugyiratQuery

  let deptQuery = supabase
    .from("szervezeti_egyseg")
    .select("id, nev, iktato_prefix")
    .order("nev")
  if (companyScope) {
    deptQuery = deptQuery.eq("company_id", companyScope)
  }
  const { data: departments } = await deptQuery

  let partnerQuery = supabase
    .from("partner")
    .select("id, nev, adoszam, kulfoldi_adoszam")
    .order("nev")
  if (companyScope) {
    partnerQuery = partnerQuery.eq("company_id", companyScope)
  }
  const { data: partners } = await partnerQuery

  // Előzmény-ügyirat javaslat lekérése
  const { findAntecedentSuggestion } = await import("@/utils/antecedent-matcher")
  const antecedentSuggestion = await findAntecedentSuggestion(resolvedParams.id, supabase)

  return (
    <div className="h-[calc(100vh-6rem)] overflow-hidden rounded-md border bg-background">
      <FilingPanelClient 
        irat={irat} 
        pdfUrl={pdfUrl} 
        fajlok={fajlok || []}
        tervek={tervek || []} 
        ugyiratok={allUgyiratok || []}
        departments={departments || []}
        partners={partners || []}
        antecedentSuggestion={antecedentSuggestion}
        initialMode={initialMode}
      />
    </div>
  )
}
