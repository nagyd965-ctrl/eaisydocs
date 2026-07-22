import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileWarning, UserPlus, AlertCircle, Users, Activity, CheckCircle2 } from "lucide-react"
import { AddEmployeeDialog } from "@/components/hr/add-employee-dialog"
import Link from "next/link"

import { createClient } from "@/utils/supabase/server"

export default async function HrAdminPage() {
  const supabase = await createClient()

  // 1. Dolgozók lekérése (felhasznalo_profil és hr_dolgozo_adatlap összekötve)
  const { data: employees } = await supabase
    .from("felhasznalo_profil")
    .select(`
      id,
      nev,
      szerepkor,
      hr_dolgozo_adatlap ( munkakor_id, lakcim, belepes_datuma )
    `)
    .order("created_at", { ascending: true })

  // 2. Toborzási adatok lekérése (nyitott pozik, új jelentkezők)
  const { data: toborzas } = await supabase.from("hr_toborzas").select("*")
  
  // Egyedi pozíciók száma, amik nincsenek lezárva
  const openPositions = new Set(
    toborzas?.filter(t => t.statusz !== 'elutasitva' && t.statusz !== 'elfogadva').map(t => t.megpalyazott_munkakor_id)
  ).size || 0
  
  // Új jelentkezők (uj státusz)
  const newCandidates = toborzas?.filter(t => t.statusz === 'uj').length || 0

  // 3. Figyelmeztetések generálása (Alerts)
  const alerts = []
  
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
        <AddEmployeeDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Statisztika Kártyák */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Teljes Állomány</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length || 0} fő</div>
            <p className="text-xs text-muted-foreground mt-1">Összes rögzített munkatárs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nyitott Keresések</CardTitle>
            <UserPlus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPositions} pozíció</div>
            <p className="text-xs text-muted-foreground mt-1">{newCandidates} új jelentkező</p>
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
          <CardDescription>Kattints egy dolgozóra a 7-füles részletes adatlap megnyitásához.</CardDescription>
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
              {employees && employees.map((emp, index) => (
                <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-muted-foreground">EMP-{String(index + 1).padStart(3, '0')}</TableCell>
                  <TableCell className="font-semibold">{emp.nev}</TableCell>
                  <TableCell>{emp.szerepkor === 'admin' ? 'Rendszergazda' : emp.szerepkor === 'ugyintezo' ? 'Fejlesztő / Ügyintéző' : emp.szerepkor}</TableCell>
                  <TableCell>IT / Általános</TableCell>
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
              ))}
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
