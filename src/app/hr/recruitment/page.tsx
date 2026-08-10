import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Shield } from "lucide-react"
import { RecruitmentTabs } from "./recruitment-tabs"

export default async function RecruitmentPage() {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin", "toborzo", "auditor"].includes(profile.hr_szerepkor)) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Nincs jogosultságod a toborzási rendszer megtekintéséhez.</p>
        </div>
      </div>
    )
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: candidates }, { data: postings }, { data: jobs }] = await Promise.all([
    supabaseAdmin
      .from("hr_toborzas")
      .select("*, hr_munkakor (megnevezes)")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("hr_allashirdetes")
      .select("*, hr_munkakor (megnevezes)")
      .order("created_at", { ascending: false }),
    supabase
      .from("hr_munkakor")
      .select("id, megnevezes")
      .order("megnevezes"),
  ])

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-semibold tracking-tight">Toborzás (ATS)</h1>
        <p className="text-muted-foreground mt-1">
          Jelentkezők nyomon követése és publikus álláshirdetések kezelése.
        </p>
      </div>

      <RecruitmentTabs
        candidates={candidates || []}
        postings={postings || []}
        jobs={jobs || []}
        isReadOnly={profile.hr_szerepkor === "auditor"}
      />
    </div>
  )
}
