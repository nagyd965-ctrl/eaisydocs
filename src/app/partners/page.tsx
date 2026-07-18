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
import { getPermissions } from "@/utils/permissions"

export default async function PartnersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let szerepkor = ''
  if (user) {
    const { data: profile } = await supabase.from('felhasznalo_profil').select('szerepkor').eq('id', user.id).single()
    szerepkor = profile?.szerepkor || ''
  }
  const permissions = getPermissions(szerepkor)

  // Fetch partners
  const { data: realPartners } = await supabase.from("partner").select("*").order("nev")

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Partnerek</h1>
          <p className="text-muted-foreground">
            A rendszerben rögzített partnerek és ügyfelek listája.
          </p>
        </div>
        <div>
          {permissions.canEdit && <PartnerDialog />}
        </div>
      </div>

      <div className="border rounded-md">
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
