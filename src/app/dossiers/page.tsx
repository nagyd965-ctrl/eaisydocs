import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { ExportCsvButton } from "@/components/export-csv-button"
import { AssignDossierDialog } from "@/components/assign-dossier-dialog"

function StatusBadge({ status }: { status: string }) {
  if (status === "lezart" || status === "elintezett") return <Badge variant="outline" className="bg-success-subtle text-success border-success-subtle capitalize">{status}</Badge>
  if (status === "ugyintezes_alatt" || status === "iktatva") return <Badge variant="outline" className="bg-info-subtle text-info border-info-subtle capitalize">{status.replace('_', ' ')}</Badge>
  if (status === "szignalt") return <Badge variant="outline" className="bg-warning-subtle text-warning border-warning-subtle capitalize">{status}</Badge>
  return <Badge variant="outline" className="capitalize">{status.replace('_', ' ')}</Badge>
}

export default async function DossiersPage() {
  const supabase = await createClient()

  // Fetch ugyirat and joined ugy
  const { data: dossiers } = await supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      iktatas_datuma,
      szervezeti_egyseg_id,
      ugy ( id, targy, hatarido, statusz, felelos_user_id )
    `)
    .order("iktatas_datuma", { ascending: false })

  // Current user role check
  const { data: authUser } = await supabase.auth.getUser()
  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select("szerepkor")
    .eq("id", authUser?.user?.id || "")
    .single()
  
  const canAssign = !!(currentUserProfile && ['admin', 'rendszergazda', 'vezeto', 'iktato'].includes(currentUserProfile.szerepkor))

  // Második lépés: Felhasználók lekérése memóriába, mivel hiányzik a foreign key
  const userIds = Array.from(new Set(
    (dossiers || [])
      .map(d => (d.ugy as any)?.felelos_user_id)
      .filter(Boolean)
  ))

  const { data: users } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev, szerepkor, szervezeti_egyseg_id")

  const userMap = (users || []).reduce((acc: any, user: any) => {
    acc[user.id] = user.nev
    return acc
  }, {})

  // Map dossiers to include user name
  const mappedDossiers = (dossiers || []).map(d => {
    const ugy = d.ugy as any
    if (ugy && ugy.felelos_user_id) {
      ugy.felelos_user = {
        id: ugy.felelos_user_id,
        full_name: userMap[ugy.felelos_user_id]
      }
    }
    return d
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Iktatókönyv</h1>
          <p className="text-muted-foreground">Az összes iktatott ügyirat nyilvántartása.</p>
        </div>
        <div>
          <ExportCsvButton data={dossiers || []} />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Iktatószám</TableHead>
              <TableHead>Tárgy</TableHead>
              <TableHead>Állapot</TableHead>
              <TableHead>Felelős</TableHead>
              <TableHead>Határidő</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappedDossiers && mappedDossiers.length > 0 ? (
              mappedDossiers.map((dossier) => (
                <TableRow key={dossier.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium text-primary hover:underline">
                    <Link href={`/dossiers/${dossier.id}`}>{dossier.iktatoszam}</Link>
                  </TableCell>
                  <TableCell>{(dossier.ugy as any)?.targy}</TableCell>
                  <TableCell><StatusBadge status={dossier.statusz} /></TableCell>
                  <TableCell>
                    <AssignDossierDialog 
                      ugyirat_id={dossier.id} 
                      ugy_id={(dossier.ugy as any)?.id} 
                      szervezeti_egyseg_id={dossier.szervezeti_egyseg_id}
                      users={users || []}
                      currentFelelosId={(dossier.ugy as any)?.felelos_user_id}
                      currentHatarido={(dossier.ugy as any)?.hatarido}
                      canAssign={canAssign}
                    >
                      <span className={canAssign ? "cursor-pointer hover:underline" : ""}>
                        {((dossier.ugy as any)?.felelos_user as any)?.full_name || <span className="italic text-muted-foreground">Kiosztatlan</span>}
                      </span>
                    </AssignDossierDialog>
                  </TableCell>
                  <TableCell className="tabular-nums">{(dossier.ugy as any)?.hatarido || "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  Nincs még iktatott ügyirat az adatbázisban.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
