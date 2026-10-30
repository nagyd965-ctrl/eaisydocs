import { getUserProfile, getTeamMembers, getDepartments } from "./settings-actions"
import { getIrattariTervek, getFourEyesSetting } from "./admin-actions"
import { getCredentialStatus } from "./credential-actions"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Info } from "lucide-react"
import { SettingsClient } from "./settings-client"
import { createClient } from "@/utils/supabase/server"

export default async function SettingsPage() {
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()

  const { profile, email } = await getUserProfile()
  const { profiles: teamMembers } = await getTeamMembers(activeCompanyId)
  const departments = await getDepartments()

  const supabase = await createClient()

  const { data: szabalyok } = await supabase
    .from("ertesitesi_szabaly")
    .select("*")
    .order("created_at", { ascending: false })

  const isAdmin = profile.szerepkor === 'admin' || profile.docs_szerepkor === 'admin' || profile.szerepkor === 'rendszergazda' || profile.docs_szerepkor === 'rendszergazda'
  const naplo: any[] = []

  const { data: userData } = await supabase.auth.getUser()

  // MFA faktorok lekérése
  const { data: mfaData } = await supabase.auth.mfa.listFactors()
  const totpFactor = mfaData?.totp?.find((f: any) => f.status === "verified") ?? null

  // Admin adatok (csak adminoknak)
  const irattariTervek = isAdmin ? await getIrattariTervek() : []
  const initialFourEyesRequired = isAdmin ? await getFourEyesSetting() : true
  const credentialStatus = isAdmin ? await getCredentialStatus() : null

  let myHelyettesitesQuery = supabase
    .from("helyettesites")
    .select(`
      id, mettol, meddig, aktiv, kilepo_user_id, helyettesito_user_id,
      helyettesito:felhasznalo_profil!helyettesito_user_id(id, nev, avatar_url, docs_szerepkor)
    `)
    .eq("kilepo_user_id", userData.user?.id || "")
    .order("mettol", { ascending: false })

  let incomingHelyettesitesQuery = supabase
    .from("helyettesites")
    .select(`
      id, mettol, meddig, aktiv, kilepo_user_id, helyettesito_user_id,
      kilepo:felhasznalo_profil!kilepo_user_id(id, nev, avatar_url, docs_szerepkor)
    `)
    .eq("helyettesito_user_id", userData.user?.id || "")
    .order("mettol", { ascending: false })

  if (activeCompanyId) {
    myHelyettesitesQuery = myHelyettesitesQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
    incomingHelyettesitesQuery = incomingHelyettesitesQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
  }

  const { data: helyettesitesek } = await myHelyettesitesQuery
  const { data: incomingHelyettesitesek } = await incomingHelyettesitesQuery

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
            Profil
          </TabsTrigger>
          <TabsTrigger 
            value="ceg" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            Cég
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger 
              value="osztalyok" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
            >
              Szervezeti Egységek
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="ertesitesek" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            Értesítések
          </TabsTrigger>


          {isAdmin && (
            <TabsTrigger 
              value="rendszergazda" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 ml-auto text-primary"
            >
              Rendszergazda
            </TabsTrigger>
          )}
        </TabsList>

        <SettingsClient 
          initialProfile={profile} 
          email={email} 
          teamMembers={teamMembers || []} 
          departments={departments || []}
          szabalyok={(szabalyok || []).filter(s => ['hatarido_kozeledik', 'hatarido_lejart', 'uj_szignalas', 'allapotvaltozas', 'megorzesi_ido_lejart'].includes(s.esemeny_tipus))}
          naplo={naplo || []}
          helyettesitesek={helyettesitesek || []}
          incomingHelyettesitesek={incomingHelyettesitesek || []}
          isAdmin={isAdmin}
          totpFactor={totpFactor}
          irattariTervek={irattariTervek}
          initialFourEyesRequired={initialFourEyesRequired}
          credentialStatus={credentialStatus && !credentialStatus.error ? credentialStatus : null}
        />
      </Tabs>
    </div>
  )
}
