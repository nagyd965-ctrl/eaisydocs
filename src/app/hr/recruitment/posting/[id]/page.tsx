import { createClient as createAdminClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { Shield } from "lucide-react"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import { PostingDetailClient } from "./posting-detail-client"

export default async function JobPostingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
            Nincs jogosultságod az álláshirdetés adatlapjának megtekintéséhez.
          </p>
        </div>
      </div>
    )
  }

  const { activeCompanyId, hrRole, isCompanyAdmin } = auth
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: posting, error: postingErr }, { data: jobs }, { data: allCandidates }] =
    await Promise.all([
      supabaseAdmin
        .from("hr_allashirdetes")
        .select("*, hr_munkakor (id, megnevezes)")
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .maybeSingle(),
      supabaseAdmin
        .from("hr_munkakor")
        .select("id, megnevezes")
        .eq("company_id", activeCompanyId)
        .order("megnevezes"),
      supabaseAdmin
        .from("hr_toborzas")
        .select("*, hr_munkakor (megnevezes), hr_allashirdetes (cim)")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false }),
    ])

  if (postingErr || !posting) {
    notFound()
  }

  // Az adott hirdetéshez tartozó jelentkezők szűrése
  const matchingCandidates = (allCandidates || []).filter(
    (c) =>
      c.allashirdetes_id === posting.id ||
      (!c.allashirdetes_id &&
        posting.munkakor_id &&
        c.megpalyazott_munkakor_id === posting.munkakor_id)
  )

  // Signed URL-ek előállítása a CV-khez
  const candidatesWithSignedCv = await Promise.all(
    matchingCandidates.map(async (c) => {
      let signedCvUrl: string | null = c.cv_url || null
      if (!signedCvUrl && c.cv_storage_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("hr_dokumentumok")
          .createSignedUrl(c.cv_storage_path, 3600)
        if (signed?.signedUrl) {
          signedCvUrl = signed.signedUrl
        }
      }
      return {
        ...c,
        signedCvUrl,
      }
    })
  )

  return (
    <PostingDetailClient
      initialPosting={posting}
      jobs={jobs || []}
      candidates={candidatesWithSignedCv}
      isReadOnly={hrRole === "auditor" && !isCompanyAdmin}
    />
  )
}
