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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, FolderOpen, Link as LinkIcon, Calendar, FileText } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PartnerDialog } from "@/components/partner-dialog"
import { getPermissions } from "@/utils/permissions"

export default async function PartnerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let docs_szerepkor = ''
  if (user) {
    const { data: profile } = await supabase.from('felhasznalo_profil').select('docs_szerepkor').eq('id', user.id).single()
    docs_szerepkor = profile?.docs_szerepkor || ''
  }
  const permissions = getPermissions(docs_szerepkor)

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
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto">
      {/* Fejléc */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/partners" className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-10 w-10 shrink-0 rounded-full")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">{partner.nev}</h2>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4" /> Adatlap és partneri előzmények
            </p>
          </div>
        </div>
        
        {/* Szerkesztés gomb */}
        <div>
          {permissions.canEdit && <PartnerDialog partner={partner} />}
        </div>
      </div>

      {/* Áttekintés kártyák */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="shadow-none border-border bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Adószám
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{partner.adoszam || <span className="text-muted-foreground font-normal text-lg">Nincs megadva</span>}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border-border bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Cégjegyzékszám
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{partner.cegjegyzekszam || <span className="text-muted-foreground font-normal text-lg">Nincs megadva</span>}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border-border bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Rendszerbe rögzítve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{new Date(partner.created_at).toLocaleDateString("hu-HU")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Részletek fülek */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="documents">
            <FolderOpen className="h-4 w-4 mr-2" />
            Küldött Iratok
          </TabsTrigger>
          <TabsTrigger value="links">
            <LinkIcon className="h-4 w-4 mr-2" />
            Csatolt Ügyek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card className="shadow-none border-border">
            <CardHeader>
              <CardTitle>Partner által küldött iratok</CardTitle>
              <CardDescription>A partnerhez rendelt összes bejövő érkeztetés listája.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
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
                        <TableCell className="text-muted-foreground">{new Date(irat.erkezes_datuma).toLocaleDateString("hu-HU")}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                        <FolderOpen className="h-8 w-8 mx-auto mb-3 opacity-20" />
                        Nem található a partnerhez rendelt irat.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <Card className="shadow-none border-border">
            <CardHeader>
              <CardTitle>Manuális Kapcsolatok (Polimorf)</CardTitle>
              <CardDescription>Olyan ügyiratok és iratok, ahol ez a partner hivatkozásként lett megjelölve.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
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
                            <Badge variant="secondary" className="capitalize">
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
                          <TableCell className="text-muted-foreground">
                            {isUgyirat ? u.ugy?.targy : ir?.targy}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                        <LinkIcon className="h-8 w-8 mx-auto mb-3 opacity-20" />
                        Nincsenek csatolt ügyiratok.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
