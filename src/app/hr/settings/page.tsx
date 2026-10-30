import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

import { Info } from "lucide-react"
import { SecuritySettingsTab } from "./security-tab"
import { HrNotificationSettings } from "./notification-settings"
import { updateProfile } from "@/app/settings/settings-actions"
import { AvatarUploadSection } from "./avatar-upload"
import { CompanySettingsTab } from "@/components/settings/company-settings-tab"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"

export default async function HrSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('*')
    .eq("id", user.id)
    .single()

  const activeCompanyId = await getActiveCompanyIdServer()
  const { hrRole, isCompanyAdmin } = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const { data: mfaData } = await supabase.auth.mfa.listFactors()
  const totpFactor = mfaData?.totp?.find((f: any) => f.status === "verified") ?? null

  const isHrOrAdmin = isCompanyAdmin || ["hr_munkatars", "hr_vezeto", "admin"].includes(hrRole)

  let szabalyok: any[] = []
  if (isHrOrAdmin) {
    const { data: fetchedSzabalyok } = await supabase
      .from("ertesitesi_szabaly")
      .select("*")
      .order("esemeny_tipus")
    if (fetchedSzabalyok) szabalyok = fetchedSzabalyok
  }

  return (
    <div key={activeCompanyId || "default"} className="space-y-6">
      <div className="flex items-center space-x-2 mb-2">
        <h2 className="text-3xl font-semibold tracking-tight">Beállítások</h2>
        <Info className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground mt-0 mb-6">Rendszer és üzleti beállítások kezelése</p>

      <Tabs defaultValue="profil" className="space-y-4">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6 flex-wrap">
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

          {isHrOrAdmin && (
            <TabsTrigger 
              value="ertesitesek" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
            >
              Értesítések
            </TabsTrigger>
          )}
        </TabsList>

        {/* 1. TAB: PROFIL */}
        <TabsContent value="profil" className="space-y-6 outline-none">
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Felhasználói profil</CardTitle>
              <CardDescription>Személyes információk és avatar kezelése</CardDescription>
            </CardHeader>
            <form action={async (formData) => { "use server"; await updateProfile(formData); }} key={profile?.telefon || 'profile-form'}>
              <CardContent className="space-y-6">
                <AvatarUploadSection
                  name={profile?.nev || ""}
                  avatarUrl={profile?.avatar_url}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nev">Teljes név</Label>
                    <Input id="nev" name="nev" defaultValue={profile?.nev || ""} key={profile?.nev || 'nev'} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email cím</Label>
                    <Input id="email" defaultValue={user.email} readOnly className="bg-muted/50 cursor-not-allowed opacity-70" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="pozicio">Pozíció</Label>
                    <Input id="pozicio" name="pozicio" defaultValue={profile?.pozicio || ""} key={profile?.pozicio || 'poz'} placeholder="pl. Rendszergazda-iratkezelő" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ceg_neve">Cég neve</Label>
                    <Input id="ceg_neve" name="ceg_neve" defaultValue={profile?.ceg_neve || ""} key={profile?.ceg_neve || 'ceg'} className="bg-background" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="telefon">Telefonszám</Label>
                    <Input id="telefon" name="telefon" defaultValue={profile?.telefon || ""} key={profile?.telefon || 'tel'} placeholder="+36301234567" className="bg-background" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Profil mentése
                </Button>
              </CardFooter>
            </form>
          </Card>

          <SecuritySettingsTab initialTimeout={profile?.munkamenet_idotullepes || 15} totpFactor={totpFactor} />
        </TabsContent>

        {/* CÉG BEÁLLÍTÁSOK TAB */}
        <TabsContent value="ceg" className="space-y-4 outline-none">
          <CompanySettingsTab module="hr" />
        </TabsContent>


        {isHrOrAdmin && (
          <TabsContent value="ertesitesek" className="space-y-4 outline-none">
            <HrNotificationSettings rules={(szabalyok || []).filter(s => !['hatarido_kozeledik', 'hatarido_lejart', 'uj_szignalas', 'allapotvaltozas', 'megorzesi_ido_lejart'].includes(s.esemeny_tipus))} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
