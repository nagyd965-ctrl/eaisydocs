import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { UserPlus, AlertCircle, Users } from "lucide-react"
import { AddEmployeeDialog } from "@/components/hr/add-employee-dialog"
import Link from "next/link"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export default async function HrAdminPage() {
  const supabase = await createClient()

  // Admin client for restricted tables and auth
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Dolgozók lekérése (felhasznalo_profil és hr_dolgozo_adatlap összekötve)
  const { data: employees } = await supabase
    .from("felhasznalo_profil")
    .select(`
      id,
      nev,
      hr_szerepkor,
      hr_dolgozo_adatlap (
        id,
        hr_jogviszony (
          id,
          belepes_datuma,
          hr_beosztas (
            id,
            hr_munkakor ( megnevezes )
          )
        )
      )
    `)
    .order("created_at", { ascending: true })

  // 1.5. Munkakörök és szabad felhasználók a Felvétel ablakhoz
  const { data: jobs } = await supabase.from("hr_munkakor").select("id, megnevezes")
  const { data: allUsers } = await supabase.from("felhasznalo_profil").select("id, nev")
  const assignedIds = employees?.filter(e => e.hr_dolgozo_adatlap !== null).map(e => e.id) || []
  const unassignedUsers = allUsers?.filter(u => !assignedIds.includes(u.id)) || []
  
  // 1.6. Toborzásból (ATS) elfogadott jelentkezők lekérése (Admin klienssel az RLS miatt)
  const { data: elfogadottJelentkezok } = await supabaseAdmin
    .from("hr_toborzas")
    .select("id, nev, email, megpalyazott_munkakor_id")
    .eq("statusz", "elfogadva")
    
  // Összes regisztrált e-mail lekérése az Auth-ból a szűréshez
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const userEmails = authUsers.users.map(u => u.email)
  const availableCandidates = elfogadottJelentkezok?.filter(j => !userEmails.includes(j.email)) || []

  // 2. Toborzási adatok lekérése (nyitott pozik, jelentkezők)
  const { data: toborzas } = await supabaseAdmin.from("hr_toborzas").select("*")
  
  // Aktív álláshirdetések száma
  const { data: allashirdetesek } = await supabase.from("hr_allashirdetes").select("*").eq("aktiv", true).eq("publikus", true)
  const activeAdsCount = allashirdetesek?.length || 0
  
  // Összes aktív jelentkező a Kanban táblán
  const activeCandidatesCount = toborzas?.filter(t => t.statusz !== 'elutasitva' && t.statusz !== 'elfogadva').length || 0

  // 3. Figyelmeztetések generálása (Alerts)
  const alerts: any[] = []
  
  // Onboarding ellenőrzés
  const { data: onboardings } = await supabase.from("hr_onboarding").select("*, hr_onboarding_feladat(*)")
  if (onboardings) {
    onboardings.forEach(o => {
      const hasPending = o.hr_onboarding_feladat?.some((f: any) => f.statusz === 'pending')
      if (hasPending) {
        alerts.push({
          id: o.id,
          type: "Onboarding",
          message: `Új belépő (${o.nev}) beléptetési feladatai folyamatban vannak.`,
          severity: "medium"
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">HR Munkaasztal</h1>
          <p className="text-muted-foreground mt-1">
            Teljes állomány áttekintése és HR adminisztráció.
          </p>
        </div>
        <AddEmployeeDialog availableUsers={unassignedUsers} jobs={jobs || []} candidates={availableCandidates} />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Statisztika Kártyák */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Teljes Állomány</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.filter((emp: any) => emp.hr_dolgozo_adatlap !== null).length || 0} fő</div>
            <p className="text-xs text-muted-foreground mt-1">Összes rögzített munkatárs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nyitott Keresések</CardTitle>
            <UserPlus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAdsCount} hirdetés</div>
            <p className="text-xs text-muted-foreground mt-1">{activeCandidatesCount} jelentkező</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Kritikus Figyelmeztetések</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
             <div className="space-y-2 mt-2">
                {alerts.length > 0 ? alerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-destructive">{alert.type}:</span>
                    <span>{alert.message}</span>
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground">Nincsenek aktív figyelmeztetések.</div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Dolgozói Törzsadatbázis (Táblázat) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" /> Dolgozói Törzsadatbázis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Azonosító</TableHead>
                <TableHead>Név</TableHead>
                <TableHead>Munkakör</TableHead>
                <TableHead>Szervezeti Egység</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead className="text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees && employees.filter((emp: any) => emp.hr_dolgozo_adatlap !== null).map((emp: any, index: number) => {
                const activeJogviszony = emp.hr_dolgozo_adatlap?.hr_jogviszony?.[0]
                const activeBeosztas = activeJogviszony?.hr_beosztas?.[0]
                const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs beállítva"

                return (
                  <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium text-muted-foreground">EMP-{String(index + 1).padStart(3, '0')}</TableCell>
                    <TableCell className="font-semibold">{emp.nev}</TableCell>
                    <TableCell>{munkakor}</TableCell>
                    <TableCell>Központ</TableCell>
                  <TableCell>
                    <Badge variant="default">
                      Aktív
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/hr/employee/${emp.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-primary">Adatlap megnyitása</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )})}
              {(!employees || employees.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nincsenek dolgozók az adatbázisban.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
    </div>
  )
}
