import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanBoard } from "./kanban-board"
import { TaskList } from "./task-list"
import { TaskCalendar } from "./task-calendar"
import { TaskDelegationDialog, ActiveDelegationBanner } from "@/components/delegation-manager"
import { Task, TaskStatus } from "@/types/tasks"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const revalidate = 0

function mapDossierStatusToTaskStatus(statusz: string): TaskStatus {
  switch (statusz) {
    case "iktatva":
    case "szignalt":
      return "nyitott"
    case "ugyintezes_alatt":
    case "folyamatban":
      return "folyamatban"
    case "elintezett":
    case "lezart":
    case "irattarban":
    case "selejtezheto":
    case "selejtezett":
      return "kesz"
    case "elutasitott":
      return "elutasitott"
    default:
      return "nyitott"
  }
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ scope?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  // Lekérdezzük a helyettesítéseket, hogy lássuk, kiket helyettesít a jelenlegi felhasználó az adott cégnél
  let helyettesitettQuery = supabase
    .from("helyettesites")
    .select("kilepo_user_id")
    .eq("helyettesito_user_id", user.id)
    .eq("aktiv", true)
    .lte("mettol", new Date().toISOString())
    .gte("meddig", new Date().toISOString())

  if (activeCompanyId) {
    helyettesitettQuery = helyettesitettQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
  }

  const { data: helyettesitettList } = await helyettesitettQuery
  const helyettesitettIds = helyettesitettList?.map(h => h.kilepo_user_id) || []
  const felelosIds = [user.id, ...helyettesitettIds]

  // Lekérdezzük a teljes delegálási előzményeket és csapattagokat a dialógushoz
  let myDelegationsQuery = supabase
    .from("helyettesites")
    .select(`
      id, mettol, meddig, aktiv, kilepo_user_id, helyettesito_user_id,
      helyettesito:felhasznalo_profil!helyettesito_user_id(id, nev, avatar_url, docs_szerepkor)
    `)
    .eq("kilepo_user_id", user.id)
    .order("mettol", { ascending: false })

  let incomingDelegationsQuery = supabase
    .from("helyettesites")
    .select(`
      id, mettol, meddig, aktiv, kilepo_user_id, helyettesito_user_id,
      kilepo:felhasznalo_profil!kilepo_user_id(id, nev, avatar_url, docs_szerepkor)
    `)
    .eq("helyettesito_user_id", user.id)
    .order("mettol", { ascending: false })

  if (activeCompanyId) {
    myDelegationsQuery = myDelegationsQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
    incomingDelegationsQuery = incomingDelegationsQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
  }

  const { data: myDelegations } = await myDelegationsQuery
  const { data: incomingDelegations } = await incomingDelegationsQuery

  // Aktív céghez tartozó, eaisyDocs modullal rendelkező kollégák lekérése a helyettesítéshez
  let memberUserIds: string[] = []
  const memberDocsRolesMap = new Map<string, string>()

  if (activeCompanyId) {
    const { data: cm } = await supabase
      .from("company_members")
      .select("user_id, docs_szerepkor")
      .eq("company_id", activeCompanyId)

    if (cm) {
      memberUserIds = cm.map(m => m.user_id)
      cm.forEach(m => {
        if (m.docs_szerepkor) memberDocsRolesMap.set(m.user_id, m.docs_szerepkor)
      })
    }
  }

  let teamMembersQuery = supabase
    .from("felhasznalo_profil")
    .select("id, nev, email, avatar_url, docs_szerepkor")
    .contains("elerheto_modulok", ["docs"])
    .order("nev")

  if (activeCompanyId) {
    teamMembersQuery = teamMembersQuery.in(
      "id",
      memberUserIds.length > 0 ? memberUserIds : ["00000000-0000-0000-0000-000000000000"]
    )
  }

  const { data: rawTeamMembers } = await teamMembersQuery
  const teamMembers = (rawTeamMembers || []).map(m => ({
    ...m,
    docs_szerepkor: memberDocsRolesMap.get(m.id) || m.docs_szerepkor || "ugyintezo"
  }))

  // 1. Lekérdezzük a rám szignált iktatott ügyiratokat
  const { data: rawUgyiratok } = await supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      iktatas_datuma,
      megorzesi_ido_vege,
      szervezeti_egyseg_id,
      ugy!inner (
        id,
        targy,
        hatarido,
        statusz,
        felelos_user_id,
        lezarva,
        letrehozva
      )
    `)
    .eq("company_id", companyScope)
    .in("ugy.felelos_user_id", felelosIds)
    .order("iktatas_datuma", { ascending: false })

  // 2. Lekérdezzük a rám bízott közvetlen al-feladatokat a feladat táblából
  const { data: rawFeladatok } = await supabase
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
      created_at,
      updated_at,
      ugyirat:ugyirat_id (
        id, 
        iktatoszam
      )
    `)
    .eq("company_id", companyScope)
    .in("felelos_user_id", felelosIds)
    .order("hatarido", { ascending: true })

  // 3. Ügyiratok leképezése Task objektummá
  const dossierTasks: Task[] = (rawUgyiratok || []).map((u: any) => {
    const ugy = u.ugy || {}
    const mappedStatus = mapDossierStatusToTaskStatus(u.statusz)
    const completedAt = mappedStatus === "kesz" ? (ugy.lezarva || u.iktatas_datuma || u.created_at) : null

    return {
      id: `ugyirat_${u.id}`,
      ugyirat_id: u.id,
      felelos_user_id: ugy.felelos_user_id || "",
      leiras: ugy.targy || "Iktatott ügyirat elintézése",
      reszletek: `Iktatva: ${u.iktatas_datuma ? new Date(u.iktatas_datuma).toLocaleDateString("hu-HU") : "-"} | Státusz: ${u.statusz}`,
      hatarido: ugy.hatarido || "",
      allapot: mappedStatus,
      kategoria: "ugyirat",
      prioritas: "normal",
      indoklas: null,
      created_at: u.iktatas_datuma || u.created_at,
      updated_at: ugy.lezarva || u.iktatas_datuma || u.created_at,
      completed_at: completedAt,
      ugyirat: {
        id: u.id,
        iktatoszam: u.iktatoszam,
      },
      tipus: "ugyirat" as const,
    }
  })

  // 4. Al-feladatok leképezése Task objektummá
  const subTasks: Task[] = (rawFeladatok || []).map((f: any) => {
    const completedAt = f.allapot === "kesz" ? (f.updated_at || f.created_at) : null

    return {
      id: f.id,
      ugyirat_id: f.ugyirat?.id || null,
      felelos_user_id: f.felelos_user_id || "",
      leiras: f.leiras,
      reszletek: f.reszletek || null,
      hatarido: f.hatarido || "",
      allapot: f.allapot,
      kategoria: f.kategoria || "egyeb",
      prioritas: f.prioritas || "normal",
      indoklas: f.indoklas || null,
      created_at: f.created_at,
      updated_at: f.updated_at || f.created_at,
      completed_at: completedAt,
      ugyirat: f.ugyirat
        ? {
            id: f.ugyirat.id,
            iktatoszam: f.ugyirat.iktatoszam,
          }
        : null,
      tipus: "al_feladat" as const,
    }
  })

  // 5. Egyesített és rendezett feladatlista
  const allTasks: Task[] = [...dossierTasks, ...subTasks].sort((a, b) => {
    if (a.hatarido && b.hatarido) {
      return new Date(a.hatarido).getTime() - new Date(b.hatarido).getTime()
    }
    if (a.hatarido && !b.hatarido) return -1
    if (!a.hatarido && b.hatarido) return 1
    return 0
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Saját Feladataim</h1>
          <p className="text-muted-foreground text-sm">
            A rád szignált ügyiratok és a hozzád rendelt al-feladatok nyilvántartása.
          </p>
        </div>

        <TaskDelegationDialog
          currentUserId={user.id}
          myDelegations={(myDelegations as any) || []}
          incomingDelegations={(incomingDelegations as any) || []}
          teamMembers={teamMembers || []}
        />
      </div>

      <ActiveDelegationBanner
        myDelegations={(myDelegations as any) || []}
        incomingDelegations={(incomingDelegations as any) || []}
        teamMembers={teamMembers || []}
      />

      <Tabs key={companyScope} defaultValue="kanban" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="kanban">Kanban Tábla</TabsTrigger>
          <TabsTrigger value="lista">Lista Nézet</TabsTrigger>
          <TabsTrigger value="naptar">Naptár Nézet</TabsTrigger>
        </TabsList>
        
        <TabsContent value="kanban" className="mt-0 outline-none">
          <KanbanBoard initialTasks={allTasks} />
        </TabsContent>
        
        <TabsContent value="lista" className="mt-0 outline-none">
          <TaskList initialTasks={allTasks} />
        </TabsContent>

        <TabsContent value="naptar" className="mt-0 outline-none">
          <TaskCalendar tasks={allTasks} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
