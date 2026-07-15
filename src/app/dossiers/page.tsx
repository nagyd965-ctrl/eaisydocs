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
      ugy ( targy, hatarido, statusz, felelos_user:felelos_user_id ( id, full_name ) )
    `)
    .order("iktatas_datuma", { ascending: false })

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
            {dossiers && dossiers.length > 0 ? (
              dossiers.map((dossier) => (
                <TableRow key={dossier.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium text-primary hover:underline">
                    <Link href={`/dossiers/${dossier.id}`}>{dossier.iktatoszam}</Link>
                  </TableCell>
                  <TableCell>{(dossier.ugy as any)?.targy}</TableCell>
                  <TableCell><StatusBadge status={dossier.statusz} /></TableCell>
                  <TableCell className="text-muted-foreground">{((dossier.ugy as any)?.felelos_user as any)?.full_name || <span className="italic">Kiosztatlan</span>}</TableCell>
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
