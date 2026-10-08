import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanBoard } from "./kanban-board"
import { TaskList } from "./task-list"
import { TaskCalendar } from "./task-calendar"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  // Felhasználói profil és szerepkör lekérése (vezetői jogok ellenőrzése)
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const role = profile?.docs_szerepkor || "ugyintezo"
  const isLeaderOrAdmin = ["admin", "vezeto", "iktato", "rendszergazda"].includes(role)

  // Lekérdezzük a helyettesítéseket, hogy lássuk, kiket helyettesít a jelenlegi felhasználó az adott cégnél
  const { data: helyettesitettList } = await supabase
    .from("helyettesites")
    .select("kilepo_user_id")
    .eq("company_id", companyScope)
    .eq("helyettesito_user_id", user.id)
    .eq("aktiv", true)
    .lte("mettol", new Date().toISOString())
    .gte("meddig", new Date().toISOString())

  const helyettesitettIds = helyettesitettList?.map(h => h.kilepo_user_id) || []
  const felelosIds = [user.id, ...helyettesitettIds]

  // Lekérdezzük a feladatokat az aktív cégnél
  let query = supabase
    .from("feladat")
    .select(`
      id, 
      leiras, 
      hatarido, 
      allapot, 
      felelos_user_id,
      kategoria,
      prioritas,
      indoklas,
      reszletek,
      ugyirat:ugyirat_id (
        id, 
        iktatoszam
      )
    `)
    .eq("company_id", companyScope)
    .order("hatarido", { ascending: true })

  if (!isLeaderOrAdmin) {
    query = query.in("felelos_user_id", felelosIds)
  }

  const { data: tasks } = await query

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isLeaderOrAdmin ? "Feladatok és Munkafolyamatok" : "Saját Feladataim"}
        </h1>
        <p className="text-muted-foreground">
          {isLeaderOrAdmin
            ? "Vezetői áttekintés: A szervezet feladatai, folyamatban lévő és elutasított ügyintézések indoklásai."
            : "Itt találod a rád szignált, valamint a helyettesített kollégák feladatait."}
        </p>
      </div>

      <Tabs key={companyScope} defaultValue="kanban" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="kanban">Kanban Tábla</TabsTrigger>
          <TabsTrigger value="lista">Lista Nézet</TabsTrigger>
          <TabsTrigger value="naptar">Naptár Nézet</TabsTrigger>
        </TabsList>
        
        <TabsContent value="kanban" className="mt-0 outline-none">
          <KanbanBoard initialTasks={(tasks as any) || []} />
        </TabsContent>
        
        <TabsContent value="lista" className="mt-0 outline-none">
          <TaskList initialTasks={(tasks as any) || []} />
        </TabsContent>

        <TabsContent value="naptar" className="mt-0 outline-none">
          <TaskCalendar tasks={(tasks as any) || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
