import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanBoard } from "./kanban-board"
import { AddCandidateDialog } from "@/components/hr/add-candidate-dialog"
import { JobPostingsList } from "@/components/hr/job-postings-list"

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

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Csak HR munkatársak férhetnek hozzá a toborzási rendszerhez.</p>
        </div>
      </div>
    )
  }

  // Mivel még nincsenek RLS policy-k a hr_toborzas táblán, de a fenti kód már leellenőrizte
  // a jogosultságot, használhatjuk az admin klienst az adatok lekéréséhez.
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Összes jelölt lekérése
  const { data: candidates } = await supabaseAdmin
    .from("hr_toborzas")
    .select(`
      *,
      hr_munkakor (megnevezes)
    `)
    .order("created_at", { ascending: false })

  // Álláshirdetések lekérése
  const { data: postings } = await supabaseAdmin
    .from("hr_allashirdetes")
    .select(`
      *,
      hr_munkakor (megnevezes)
    `)
    .order("created_at", { ascending: false })

  // Munkakörök lekérése a legördülőhöz
  const { data: jobs } = await supabase.from("hr_munkakor").select("id, megnevezes").order("megnevezes")

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Toborzás (ATS)</h1>
          <p className="text-muted-foreground mt-1">
            Jelentkezők nyomon követése és publikus álláshirdetések kezelése.
          </p>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center shrink-0 mb-4">
          <TabsList>
            <TabsTrigger value="kanban">Kanban Tábla (Jelentkezők)</TabsTrigger>
            <TabsTrigger value="postings">Álláshirdetések (Karrieroldal)</TabsTrigger>
          </TabsList>
          
          {/* Csak a kanban tabon mutatjuk ezt a gombot, amúgy a komponens beépítve */}
          <div className="flex gap-4">
            <AddCandidateDialog jobs={jobs || []} />
          </div>
        </div>

        <TabsContent value="kanban" className="flex-1 overflow-hidden m-0 p-0">
          <KanbanBoard initialCandidates={candidates || []} />
        </TabsContent>

        <TabsContent value="postings" className="flex-1 overflow-auto m-0 p-0">
          <JobPostingsList initialPostings={postings || []} jobs={jobs || []} />
        </TabsContent>
      </Tabs>

    </div>
  )
}
