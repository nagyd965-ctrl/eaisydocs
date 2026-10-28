import { createClient as createAdminClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { Shield } from "lucide-react"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import {
  CandidateTalentProfileClient,
  type CandidateHistoryItem,
  type OpenPostingOption,
} from "./candidate-talent-profile-client"

export const dynamic = "force-dynamic"

export default async function CandidateTalentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const auth = await requireHrAuthServer(["recruitment"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-destructive mb-2">
            Hozzáférés Megtagadva
          </h2>
          <p className="text-muted-foreground">
            Nincs jogosultságod a tehetségbázis profil megtekintéséhez.
          </p>
        </div>
      </div>
    )
  }

  const { activeCompanyId, hrRole, isCompanyAdmin } = auth
  const { id } = await params

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: candidate } = await supabaseAdmin
    .from("hr_toborzas")
    .select("*, hr_munkakor (megnevezes), hr_allashirdetes (cim)")
    .eq("id", id)
    .eq("company_id", activeCompanyId)
    .maybeSingle()

  if (!candidate) {
    notFound()
  }

  // Lekérjük a jelölt összes eddigi pályázatát ugyanennél a vállalatnál (e-mail vagy név alapján)
  let historyQuery = supabaseAdmin
    .from("hr_toborzas")
    .select("*, hr_munkakor (megnevezes), hr_allashirdetes (cim)")
    .eq("company_id", activeCompanyId)
    .order("created_at", { ascending: false })

  if (candidate.email?.trim()) {
    historyQuery = historyQuery.ilike("email", candidate.email.trim())
  } else {
    historyQuery = historyQuery.eq("nev", candidate.nev)
  }

  const [{ data: historyRows }, { data: openPostings }] = await Promise.all([
    historyQuery,
    supabaseAdmin
      .from("hr_allashirdetes")
      .select("id, cim, is_internal, publikus, hr_munkakor (megnevezes)")
      .eq("company_id", activeCompanyId)
      .eq("aktiv", true)
      .order("created_at", { ascending: false }),
  ])

  return (
    <CandidateTalentProfileClient
      candidate={candidate as CandidateHistoryItem}
      applicationHistory={
        (historyRows as CandidateHistoryItem[]) || [candidate as CandidateHistoryItem]
      }
      openPostings={(openPostings as OpenPostingOption[]) || []}
      isReadOnly={hrRole === "auditor" && !isCompanyAdmin}
    />
  )
}
