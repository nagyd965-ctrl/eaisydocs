import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2, FolderOpen, Link as LinkIcon, Calendar } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function PartnerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient()

  const { data: partner } = await supabase
    .from("partner")
    .select("*")
    .eq("id", params.id)
    .single()

  if (!partner) {
    notFound()
  }

  // 1. Kapcsolódó iratok (ahol ez a partner volt a feladó)
  const { data: iratokMintKuldo } = await supabase
    .from("irat")
    .select(`
      id,
      targy,
      erkeztetoszam,
      erkezes_datuma,
      ugyirat_id
    `)
    .eq("kuldo_partner_id", partner.id)
    .order("erkezes_datuma", { ascending: false })

  // 2. Polimorf kapcsolatok (ahol a partner mint "entitas_tipus='partner'" szerepel)
  const { data: kapcsoltIratok } = await supabase
    .from("irat_kapcsolat")
    .select(`
      kapcsolat_tipusa,
      irat:irat_id ( id, targy, erkeztetoszam, erkezes_datuma, ugyirat_id ),
      ugyirat:ugyirat_id ( id, iktatoszam, ugy:ugy_id (targy) )
    `)
    .eq("entitas_tipus", "partner")
    .eq("entitas_id", partner.id)

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/partners" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza
        </Link>
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">{partner.nev}</h2>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Elsődleges ügyiratok/iratok ahol ő a feladó */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Küldött Iratok</h3>
          </div>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Érkeztetőszám</TableHead>
                  <TableHead>Tárgy</TableHead>
                  <TableHead>Dátum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iratokMintKuldo && iratokMintKuldo.length > 0 ? (
                  iratokMintKuldo.map((irat) => (
                    <TableRow key={`kuldo-${irat.id}`}>
                      <TableCell className="font-medium">
                        {irat.ugyirat_id ? (
                          <Link href={`/dossiers/${irat.ugyirat_id}`} className="hover:underline text-primary">
                            {irat.erkeztetoszam}
                          </Link>
                        ) : (
                          <span>{irat.erkeztetoszam} <Badge variant="outline" className="ml-2">Iktatatlan</Badge></span>
                        )}
                      </TableCell>
                      <TableCell>{irat.targy}</TableCell>
                      <TableCell>{new Date(irat.erkezes_datuma).toLocaleDateString("hu-HU")}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Nem található hozzárendelt küldemény.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Polimorf kapcsolatok */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Csatolt Ügyek (Polimorf)</h3>
          </div>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Típus</TableHead>
                  <TableHead>Azonosító</TableHead>
                  <TableHead>Tárgy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kapcsoltIratok && kapcsoltIratok.length > 0 ? (
                  kapcsoltIratok.map((kapcs, i) => {
                    const isUgyirat = !!kapcs.ugyirat;
                    const u = kapcs.ugyirat as any;
                    const ir = kapcs.irat as any;

                    return (
                      <TableRow key={`kapcs-${i}`}>
                        <TableCell>
                          <Badge variant="secondary">
                            {kapcs.kapcsolat_tipusa}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {isUgyirat ? (
                            <Link href={`/dossiers/${u.id}`} className="hover:underline text-primary">
                              {u.iktatoszam}
                            </Link>
                          ) : (
                            ir?.ugyirat_id ? (
                              <Link href={`/dossiers/${ir.ugyirat_id}`} className="hover:underline text-primary">
                                {ir.erkeztetoszam}
                              </Link>
                            ) : (
                              ir?.erkeztetoszam || "-"
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          {isUgyirat ? u.ugy?.targy : ir?.targy}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Nincs manuálisan csatolt polimorf kapcsolat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
