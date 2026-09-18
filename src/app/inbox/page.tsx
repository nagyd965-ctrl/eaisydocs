import { NewIncomingDialog } from "@/components/new-incoming-dialog"
import { BatchScannerDialog } from "@/components/batch-scanner-dialog"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getPermissions } from "@/utils/permissions"
import { FilterBar } from "@/components/filter-bar"
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

  let query = supabase
    .from("irat")
    .select(`
      id,
      erkeztetoszam,
      erkezes_datuma,
      targy,
      erkezes_modja,
      kulso_forras,
      partner ( nev )
    `)
    .is("ugyirat_id", null)
    .order("erkezes_datuma", { ascending: false })

  if (q) {
    query = query.or(`targy.ilike.%${q}%,erkeztetoszam.ilike.%${q}%`)
  }

  const { data: inboxItems } = await query.limit(100)

  return (
    <div className="page-animate space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Bejövő sor</h1>
          <p className="text-muted-foreground">Érkeztetett, de még nem iktatott iratok.</p>
        </div>
        <div className="flex items-center gap-4">
          <FilterBar placeholder="Keresés érkeztetőszám vagy tárgy alapján..." />
          {permissions.canAddIncoming && (
            <div className="flex items-center gap-2">
              <BatchScannerDialog />
              <NewIncomingDialog />
            </div>
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

      <InboxTableClient initialItems={(inboxItems as any) || []} canEdit={permissions.canEdit} />
    </div>
  )
}
