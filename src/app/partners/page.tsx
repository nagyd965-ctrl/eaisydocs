import { createClient } from "@/utils/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2 } from "lucide-react"
import Link from "next/link"
import { PartnerDialog } from "@/components/partner-dialog"

export default async function PartnersPage() {
  const supabase = await createClient()

  // Fetch partners
  const { data: realPartners } = await supabase.from("partner").select("*").order("nev")

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Partnerek</h2>
        <PartnerDialog />
      </div>
      <p className="text-muted-foreground">
        A rendszerben rögzített partnerek és ügyfelek listája.
      </p>

      <div className="rounded-md border mt-6 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Név</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {realPartners && realPartners.length > 0 ? (
              realPartners.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/partners/${p.id}`} className="hover:underline text-primary">
                      {p.nev}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/partners/${p.id}`} className="text-sm text-muted-foreground hover:text-primary">
                      Adatlap megtekintése &rarr;
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nincs rögzített partner.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
