import { createClient } from "@/utils/supabase/server"
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

  // Lekérdezzük a helyettesítéseket, hogy lássuk, kiket helyettesít a jelenlegi felhasználó
  const { data: helyettesitettList } = await supabase
    .from("helyettesites")
    .select("kilepo_user_id")
    .eq("helyettesito_user_id", user.id)
    .eq("aktiv", true)
    .lte("mettol", new Date().toISOString())
    .gte("meddig", new Date().toISOString())

  const helyettesitettIds = helyettesitettList?.map(h => h.kilepo_user_id) || []
  const felelosIds = [user.id, ...helyettesitettIds]

  // Lekérdezzük a feladatokat, szűrve a saját és a helyettesített felhasználók azonosítóira
  const { data: tasks } = await supabase
    .from("feladat")
    .select(`
      id, 
      leiras, 
      hatarido, 
      allapot, 
      felelos_user_id,
      ugyirat:ugyirat_id (
        id, 
        iktatoszam
      )
    `)
    .in("felelos_user_id", felelosIds)
    .order("hatarido", { ascending: true })

  return (
    <div className="page-animate space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Saját Feladataim</h1>
        <p className="text-muted-foreground">
          Itt találod a rád szignált, valamint a helyettesített kollégák feladatait.
        </p>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
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
