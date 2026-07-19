import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanBoard } from "./kanban-board"
import { TaskList } from "./task-list"
// import { TaskCalendar } from "./task-calendar"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Lekérdezzük a feladatokat. (A DB RLS és a mi RPC/join logikánk biztosítja a helyettesítést)
  // De mivel a feladat RLS "USING (true)", mi magunk szűrjük a frontend számára.
  const { data: feladatok, error } = await supabase
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
    // VAGY felelős én vagyok, VAGY olyan valaki, akit én helyettesítek éppen!
    // Mivel a Supabase JS API-ban OR feltételt bonyolult Subqueryvel írni, a legegyszerűbb, 
    // ha először lekérjük, kiket helyettesítek:
    
  const { data: helyettesitettList } = await supabase
    .from("helyettesites")
    .select("kilepo_user_id")
    .eq("helyettesito_user_id", user.id)
    .eq("aktiv", true)
    .lte("mettol", new Date().toISOString())
    .gte("meddig", new Date().toISOString())

  const helyettesitettIds = helyettesitettList?.map(h => h.kilepo_user_id) || []
  const felelosIds = [user.id, ...helyettesitettIds]

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
    <div className="flex flex-col gap-6 p-8 w-full max-w-7xl mx-auto">
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
          {/* <TabsTrigger value="naptar">Naptár</TabsTrigger> */}
        </TabsList>
        
        <TabsContent value="kanban" className="mt-0 outline-none">
          <KanbanBoard initialTasks={(feladatok as any) || []} />
        </TabsContent>
        
        <TabsContent value="lista" className="mt-0 outline-none">
          <TaskList initialTasks={(feladatok as any) || []} />
        </TabsContent>

        {/* <TabsContent value="naptar" className="mt-0 outline-none">
          <TaskCalendar initialTasks={tasks || []} />
        </TabsContent> */}
      </Tabs>
    </div>
  )
}
