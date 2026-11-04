import { NewIncomingDialog } from "@/components/new-incoming-dialog"
import { BatchScannerDialog } from "@/components/batch-scanner-dialog"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { redirect } from "next/navigation"
import { getPermissions } from "@/utils/permissions"
import { getImportableEaisyBillInvoices } from "@/app/inbox/eaisybill-actions"
import { EaisyBillImportPanel } from "@/components/eaisybill-import-panel"
import { InboxTableClient } from "@/components/inbox-table-client"

import { InboxSyncButton } from "@/components/inbox-sync-button"

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.toLowerCase() : ""
  
  const supabase = await createClient()

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"
  const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const { data: { user } } = await supabase.auth.getUser()
  let docs_szerepkor = scopedRoles.docsRole !== "none" ? scopedRoles.docsRole : ""
  if (user && !docs_szerepkor) {
    const { data: profile } = await supabase.from('felhasznalo_profil').select('docs_szerepkor').eq('id', user.id).single()
    docs_szerepkor = profile?.docs_szerepkor || 'munkavallalo'
  }

  if (docs_szerepkor === 'betekinto' || (scopedRoles.docsModules.length > 0 && !scopedRoles.docsModules.includes('inbox') && docs_szerepkor !== 'admin' && docs_szerepkor !== 'rendszergazda')) {
    redirect("/dossiers")
  }

  const permissions = getPermissions(
    docs_szerepkor,
    scopedRoles.docsModules,
    scopedRoles.docsWriteModules,
    "inbox"
  )

  // eaisyBill importálható számlák lekérése (csak iktató/admin látja)
  let billInvoices: Awaited<ReturnType<typeof getImportableEaisyBillInvoices>> = { invoices: [] }
  if (permissions.canAddIncoming) {
    billInvoices = await getImportableEaisyBillInvoices()
  }

  // 1. Aktív tételek (feldolgozásra váró, iktatandó iratok)
  let activeQuery = supabase
    .from("irat")
    .select(`
      id,
      erkeztetoszam,
      erkezes_datuma,
      targy,
      erkezes_modja,
      statusz,
      kulso_forras,
      leiras,
      partner ( nev ),
      irat_fajl ( id, storage_path, eredeti_fajlnev, mime_type, pdfa_path, meret_byte, sha256 )
    `)
    .eq("company_id", companyScope)
    .is("ugyirat_id", null)
    .or("statusz.is.null,statusz.eq.erkeztetve,statusz.eq.erkeztetett")
    .order("erkezes_datuma", { ascending: false })

  // 2. Nem iktatandó küldemények (félretett reklámok / tájékoztatók)
  let dismissedQuery = supabase
    .from("irat")
    .select(`
      id,
      erkeztetoszam,
      erkezes_datuma,
      targy,
      erkezes_modja,
      statusz,
      kulso_forras,
      leiras,
      partner ( nev ),
      irat_fajl ( id, storage_path, eredeti_fajlnev, mime_type, pdfa_path, meret_byte, sha256 )
    `)
    .eq("company_id", companyScope)
    .is("ugyirat_id", null)
    .eq("statusz", "nem_iktatando")
    .order("erkezes_datuma", { ascending: false })

  if (q) {
    const safeQ = q.replace(/[,().%\\]/g, " ").replace(/\s+/g, " ").trim()
    if (safeQ) {
      activeQuery = activeQuery.or(`targy.ilike.%${safeQ}%,erkeztetoszam.ilike.%${safeQ}%`)
      dismissedQuery = dismissedQuery.or(`targy.ilike.%${safeQ}%,erkeztetoszam.ilike.%${safeQ}%`)
    }
  }

  const [{ data: activeItems }, { data: dismissedItems }] = await Promise.all([
    activeQuery.limit(150),
    dismissedQuery.limit(100),
  ])

  return (
    <div className="page-animate space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Bejövő sor</h1>
          <p className="text-muted-foreground">Érkeztetett, de még nem iktatott iratok.</p>
        </div>
        <div className="flex items-center gap-2">
          {permissions.canAddIncoming && (
            <>
              <InboxSyncButton />
              <BatchScannerDialog />
              <NewIncomingDialog />
            </>
          )}
        </div>
      </div>

      {/* eaisyBill számla import panel */}
      {permissions.canAddIncoming && (
        <EaisyBillImportPanel
          invoices={billInvoices.invoices}
          fetchError={billInvoices.error}
        />
      )}

      <InboxTableClient 
        key={companyScope}
        initialItems={(activeItems as any) || []} 
        initialDismissedItems={(dismissedItems as any) || []} 
        canEdit={permissions.canEdit} 
      />
    </div>
  )
}
