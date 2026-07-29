import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { ExportCsvButton } from "@/components/export-csv-button"
import { AssignDossierDialog } from "@/components/assign-dossier-dialog"
import { StatusBadge } from "@/components/status-badge"
import { getPermissions } from "@/utils/permissions"
import { FilterBar } from "@/components/filter-bar"

export default async function DossiersPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.toLowerCase() : ""

  const supabase = await createClient()

  const query = supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      iktatas_datuma,
      szervezeti_egyseg_id,
      ugy!inner ( id, targy, hatarido, statusz, felelos_user_id )
    `)
    .order("iktatas_datuma", { ascending: false })

  const { data: rawDossiers } = await query

  let dossiers = rawDossiers || []
  if (q) {
    dossiers = dossiers.filter((d: any) => 
      d.iktatoszam?.toLowerCase().includes(q) || 
      (d.ugy?.targy && d.ugy.targy.toLowerCase().includes(q))
    )
  }

  // Current user role check
  const { data: authUser } = await supabase.auth.getUser()
  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select('docs_szerepkor')
    .eq("id", authUser?.user?.id || "")
    .single()
  
  const permissions = getPermissions(currentUserProfile?.docs_szerepkor)
  const canAssign = permissions.canAssign

  // Második lépés: Felhasználók lekérése memóriába, mivel hiányzik a foreign key
  const userIds = Array.from(new Set(
    (dossiers || [])
      .map(d => (d.ugy as any)?.felelos_user_id)
      .filter(Boolean)
  ))

  const { data: users } = await supabase
    .from("felhasznalo_profil")
    .select('id, nev, docs_docs_szerepkor, szervezeti_egyseg_id')

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
        <div className="flex items-center gap-4">
          <FilterBar placeholder="Keresés iktatószám vagy tárgy alapján..." />
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
