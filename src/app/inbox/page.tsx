import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { NewIncomingDialog } from "@/components/new-incoming-dialog"
import { createClient } from "@/utils/supabase/server"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { FolderSymlink } from "lucide-react"

export default async function InboxPage() {
  const supabase = await createClient()

  // Lekérdezzük azokat az iratokat, amikhez még nincs ügyirat rendelve (ugyirat_id is null)
  const { data: inboxItems } = await supabase
    .from("irat")
    .select(`
      id,
      erkeztetoszam,
      erkezes_datuma,
      targy,
      erkezes_modja,
      partner ( nev )
    `)
    .is("ugyirat_id", null)
    .order("erkezes_datuma", { ascending: false })

  // Lekérdezzük az irattári tervet, hogy átadhassuk a felugró ablaknak
  const { data: tervek } = await supabase
    .from("irattari_terv")
    .select("id, tetelszam, megnevezes")
    .order("tetelszam")

  const { data: aktivUgyiratok } = await supabase
    .from("ugyirat")
    .select("id, iktatoszam, ugy ( targy )")
    .in("statusz", ["iktatva", "szignalt", "ugyintezes_alatt"])
    .order("iktatas_datuma", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Bejövő sor</h1>
          <p className="text-muted-foreground">Érkeztetett, but not yet filed.</p>
        </div>
        <NewIncomingDialog />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Érkeztetőszám</TableHead>
              <TableHead>Érkezés ideje</TableHead>
              <TableHead>Küldő</TableHead>
              <TableHead>Tárgy</TableHead>
              <TableHead>Csatorna</TableHead>
              <TableHead className="text-right">Művelet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inboxItems && inboxItems.length > 0 ? (
              inboxItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-primary">{item.erkeztetoszam}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {new Date(item.erkezes_datuma).toLocaleString("hu-HU", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </TableCell>
                  <TableCell>{(item.partner as any)?.nev || "-"}</TableCell>
                  <TableCell>{item.targy}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal capitalize">
                      {item.erkezes_modja}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/inbox/${item.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <FolderSymlink className="mr-2 h-4 w-4 text-[#02b8cc]" />
                      Iktatás
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Nincs új érkeztetett küldemény.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
