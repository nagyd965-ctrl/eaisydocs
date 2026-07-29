import { getUserProfile, getTeamMembers, getDepartments } from "./settings-actions"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Info, User, Building, Bell, Monitor, Shield, Users, Plane } from "lucide-react"
import { SettingsClient } from "./settings-client"
import { createClient } from "@/utils/supabase/server"

export default async function SettingsPage() {
  const { profile, email } = await getUserProfile()
  const { profiles: teamMembers } = await getTeamMembers()
  const departments = await getDepartments()

  const supabase = await createClient()

  const { data: szabalyok } = await supabase
    .from("ertesitesi_szabaly")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: naplo } = await supabase
    .from("ertesites_naplo")
    .select("*")
    .order("mikor", { ascending: false })
    .limit(50)

  const { data: userData } = await supabase.auth.getUser()
  const { data: helyettesitesek } = await supabase
    .from("helyettesites")
    .select(`
      id, mettol, meddig, aktiv,
      helyettesito:helyettesito_user_id(id, nev)
    `)
    .eq("kilepo_user_id", userData.user?.id || "")
    .order("mettol", { ascending: false })

  if (!profile) {
    return (
      <div className="flex-1 p-8 pt-6">
        <h2 className="text-3xl font-semibold tracking-tight">Beállítások</h2>
        <p className="text-muted-foreground">Kérjük, jelentkezz be a beállítások megtekintéséhez.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center space-x-2 mb-2">
        <h2 className="text-3xl font-semibold tracking-tight">Beállítások</h2>
        <Info className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground mt-0 mb-6">Rendszer és üzleti beállítások kezelése</p>

      <Tabs defaultValue="profil" className="space-y-4">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
          <TabsTrigger 
            value="profil" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <User className="h-4 w-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger 
            value="csapat" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Users className="h-4 w-4 mr-2" />
            Csapat
          </TabsTrigger>
          <TabsTrigger 
            value="helyettesites" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Plane className="h-4 w-4 mr-2" />
            Helyettesítés
          </TabsTrigger>
          <TabsTrigger 
            value="osztalyok" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Building className="h-4 w-4 mr-2" />
            Szervezeti Egységek
          </TabsTrigger>
          <TabsTrigger 
            value="ertesitesek" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Bell className="h-4 w-4 mr-2" />
            Értesítések
          </TabsTrigger>
          <TabsTrigger 
            value="rendszer" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Rendszer
          </TabsTrigger>
          <TabsTrigger 
            value="biztonsag" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            <Shield className="h-4 w-4 mr-2" />
            Biztonság
          </TabsTrigger>
        </TabsList>

        <SettingsClient 
          initialProfile={profile} 
          email={email} 
          teamMembers={teamMembers || []} 
          departments={departments || []}
          szabalyok={szabalyok || []}
          naplo={naplo || []}
          helyettesitesek={helyettesitesek || []}
        />
      </Tabs>
    </div>
  )
}
