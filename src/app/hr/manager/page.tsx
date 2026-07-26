import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Check, Calendar as CalendarIcon, Users, CheckCircle2 } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { LeaveActionButtons } from "@/components/hr/leave-action-buttons"
import { TeamCalendar } from "@/components/hr/team-calendar"
import { redirect } from "next/navigation"

export default async function ManagerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // 1. Jóváhagyásra váró kérelmek lekérése
  // A varázslat itt történik: A Postgres RLS automatikusan CSAK a beosztottak kérelmeit adja vissza!
  const { data: pendingLeaves } = await supabase
    .from("hr_tavollet")
    .select("*, hr_dolgozo_adatlap(felhasznalo_profil(nev))")
    .eq("statusz", "jovahagyasra_var")
    .order("created_at", { ascending: false })

  // 2. Összes (Folyamatban/Jóváhagyott/stb) kérelem lekérése a naptárhoz
  const { data: allLeaves } = await supabase
    .from("hr_tavollet")
    .select("*")
    .neq("statusz", "elutasitva") // Az elutasítottakat nem mutatjuk a naptárban
    .order("kezdet_datuma", { ascending: true })

  // 3. Csapat (Közvetlen beosztottak) lekérése
  // Itt is az RLS dolgozik helyettünk a hr_jogviszony táblán!
  const { data: rawTeamMembers } = await supabase
    .from("hr_jogviszony")
    .select(`
      dolgozo_id,
      hr_dolgozo_adatlap!inner(id, felhasznalo_profil!inner(nev)),
      hr_beosztas(hr_munkakor(megnevezes))
    `)
    .neq("dolgozo_id", user.id) // Magát a vezetőt kivesszük a listából

  const teamMembers = (rawTeamMembers || []).map((j: any) => ({
    id: j.dolgozo_id,
    felhasznalo_profil: j.hr_dolgozo_adatlap?.felhasznalo_profil,
    hr_munkakor: {
      megnevezes: j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs beosztás"
    }
  }))

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vezetői Nézet</h1>
          <p className="text-muted-foreground mt-1">
            Csapat áttekintés és jóváhagyások.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Jóváhagyások (Kiemelt) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" /> Jóváhagyásra váró kérelmek ({pendingLeaves?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLeaves && pendingLeaves.length > 0 ? (
                <div className="space-y-4">
                  {pendingLeaves.map(approval => {
                    // A kapcsolat hr_tavollet -> hr_dolgozo_adatlap -> felhasznalo_profil
                    const nev = (approval as any).hr_dolgozo_adatlap?.felhasznalo_profil?.nev || "Ismeretlen"
                    const initials = nev.substring(0, 2).toUpperCase()
                    const startDate = new Date(approval.kezdet_datuma).toLocaleDateString("hu-HU")
                    const endDate = new Date(approval.veg_datuma).toLocaleDateString("hu-HU")

                    return (
                      <div key={approval.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-background gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{nev}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs uppercase tracking-wider">{approval.tipus}</Badge>
                              <span className="text-xs text-muted-foreground">{startDate} - {endDate}</span>
                            </div>
                          </div>
                        </div>
                        <LeaveActionButtons leaveId={approval.id} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed bg-muted/20">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-medium">Nincs jóváhagyásra váró kérelem</p>
                  <p className="text-sm text-muted-foreground/70">A csapatod összes kérelmét elintézted.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Csapatnaptár */}
          <TeamCalendar teamMembers={teamMembers || []} leaves={allLeaves || []} />
        </div>

        {/* Csapatlista */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" /> Közvetlen Beosztottak ({teamMembers?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamMembers && teamMembers.length > 0 ? (
                <div className="space-y-6">
                  {teamMembers.map(member => {
                    const nev = (member.felhasznalo_profil as any)?.nev || "Ismeretlen"
                    const initials = nev.substring(0, 2).toUpperCase()
                    const munkakor = (member.hr_munkakor as any)?.megnevezes || "Nincs munkakör beállítva"

                    return (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">{nev}</p>
                            <p className="text-xs text-muted-foreground mt-1">{munkakor}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-normal border-green-200 text-green-700 bg-green-50">Irodában</Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nincs megjeleníthető beosztott a szervezeti fában.
                </div>
              )}
              <div className="mt-6">
                <Button variant="outline" className="w-full text-xs">Minden beosztott megtekintése</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
    </div>
  )
}
