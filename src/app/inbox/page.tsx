import { NewIncomingDialog } from "@/components/new-incoming-dialog"
import { BatchScannerDialog } from "@/components/batch-scanner-dialog"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getPermissions } from "@/utils/permissions"
import { getImportableEaisyBillInvoices } from "@/app/inbox/eaisybill-actions"
import { EaisyBillImportPanel } from "@/components/eaisybill-import-panel"
import { InboxTableClient } from "@/components/inbox-table-client"

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.toLowerCase() : ""
  
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let docs_szerepkor = ''
  if (user) {
    const { data: profile } = await supabase.from('felhasznalo_profil').select('docs_szerepkor').eq('id', user.id).single()
    docs_szerepkor = profile?.docs_szerepkor || ''
  }

  if (docs_szerepkor === 'betekinto') {
    redirect("/dossiers")
  }

  const permissions = getPermissions(docs_szerepkor)

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
      partner ( nev )
    `)
    .is("ugyirat_id", null)
    .or("statusz.is.null,statusz.eq.erkeztetve")
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
      partner ( nev )
    `)
    .is("ugyirat_id", null)
    .eq("statusz", "nem_iktatando")
    .order("erkezes_datuma", { ascending: false })

  if (q) {
    activeQuery = activeQuery.or(`targy.ilike.%${q}%,erkeztetoszam.ilike.%${q}%`)
    dismissedQuery = dismissedQuery.or(`targy.ilike.%${q}%,erkeztetoszam.ilike.%${q}%`)
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
        initialItems={(activeItems as any) || []} 
        initialDismissedItems={(dismissedItems as any) || []} 
        canEdit={permissions.canEdit} 
      />
    </div>
  )
}
