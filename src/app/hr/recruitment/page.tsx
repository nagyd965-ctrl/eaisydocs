import { createClient as createAdminClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Shield, ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

  const [{ data: candidates }, { data: postings }, { data: jobs }, { data: activeCompany }] =
    await Promise.all([
      supabaseAdmin
        .from("hr_toborzas")
        .select("*, hr_munkakor (megnevezes), hr_allashirdetes (cim)")
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
      supabaseAdmin
        .from("companies")
        .select("id, name, address, career_presentation")
        .eq("id", activeCompanyId)
        .maybeSingle(),
    ])

  return (
    <div key={activeCompanyId} className="space-y-6 w-full">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Toborzás</h1>
          <p className="text-muted-foreground mt-1">
            Jelentkezők nyomon követése, publikus álláshirdetések és vállalati AI karrier-prezentáció kezelése.
          </p>
        </div>
        <Link
          href={`/karrier?company=${activeCompanyId}`}
          target="_blank"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-2 border-primary/30 text-primary hover:bg-primary/5"
          )}
        >
          <span>Publikus Karrieroldal megnyitása</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <RecruitmentTabs
        candidates={candidates || []}
        postings={postings || []}
        jobs={jobs || []}
        activeCompany={{
          id: activeCompanyId,
          name: activeCompany?.name || "Vállalat",
          address: activeCompany?.address || null,
          careerPresentation: activeCompany?.career_presentation || null,
        }}
        isReadOnly={hrRole === "auditor" && !isCompanyAdmin}
      />
    </div>
  )
}
