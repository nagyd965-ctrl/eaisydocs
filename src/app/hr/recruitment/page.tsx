import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Shield } from "lucide-react"
import { RecruitmentTabs } from "./recruitment-tabs"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export default async function RecruitmentPage() {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "toborzo", "auditor"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Nincs jogosultságod a toborzási rendszer megtekintéséhez a kiválasztott cégnél.</p>
        </div>
      </div>
    )
  }

  const { activeCompanyId, hrRole, isCompanyAdmin } = auth

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: candidates }, { data: postings }, { data: jobs }] = await Promise.all([
    supabaseAdmin
      .from("hr_toborzas")
      .select("*, hr_munkakor (megnevezes)")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("hr_allashirdetes")
      .select("*, hr_munkakor (megnevezes)")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("hr_munkakor")
      .select("id, megnevezes")
      .eq("company_id", activeCompanyId)
      .order("megnevezes"),
  ])

  return (
    <div key={activeCompanyId} className="space-y-6 h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-semibold tracking-tight">Toborzás</h1>
        <p className="text-muted-foreground mt-1">
          Jelentkezők nyomon követése és publikus álláshirdetések kezelése.
        </p>
      </div>

      <RecruitmentTabs
        candidates={candidates || []}
        postings={postings || []}
        jobs={jobs || []}
        isReadOnly={hrRole === "auditor" && !isCompanyAdmin}
      />
    </div>
  )
}
