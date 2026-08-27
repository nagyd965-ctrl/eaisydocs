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
import { ArrowLeft, Building2, FolderOpen, Link as LinkIcon, Calendar, FileText, User, Mail, MapPin, Briefcase, Landmark } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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

  function getPartnerTypeInfo(tipus?: string | null) {
    switch (tipus) {
      case "maganszemely":
        return { label: "Magánszemély", icon: User }
      case "egyeni_vallalkozo":
        return { label: "Egyéni vállalkozó", icon: Briefcase }
      case "intezmeny":
        return { label: "Intézmény / Hivatal", icon: Landmark }
      case "ceg":
      default:
        return { label: "Cég", icon: Building2 }
    }
  }

  const typeInfo = getPartnerTypeInfo(partner.tipus)
  const TypeIcon = typeInfo.icon

  return (
    <div className="page-animate space-y-6">
      {/* Fejléc */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/partners" />} nativeButton={false} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{partner.nev}</h1>
              <Badge variant="outline" className="text-xs">
                {typeInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <TypeIcon className="h-3.5 w-3.5" />
              Adatlap és partneri előzmények
            </p>
          </div>
        </div>
        
        {permissions.canEdit && <PartnerDialog partner={partner} />}
      </div>

      {/* Metaadat grid — kompakt definition list */}
      <Card className="border border-border/50">
        <CardContent className="p-0">
          <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border/50">
            <div className="p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <FileText className="h-3.5 w-3.5" />
                Adószám
              </dt>
              <dd className="text-sm font-semibold tabular-nums">
                {partner.adoszam || <span className="text-muted-foreground font-normal">—</span>}
              </dd>
            </div>
            <div className="p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5" />
                Cégjegyzékszám / Nyilv. szám
              </dt>
              <dd className="text-sm font-semibold tabular-nums">
                {partner.cegjegyzekszam || <span className="text-muted-foreground font-normal">—</span>}
              </dd>
            </div>
            <div className="p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <Mail className="h-3.5 w-3.5" />
                E-mail
              </dt>
              <dd className="text-sm font-semibold">
                {partner.email || <span className="text-muted-foreground font-normal">—</span>}
              </dd>
            </div>
            <div className="p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Telefonszám
              </dt>
              <dd className="text-sm font-semibold tabular-nums">
                {partner.telefonszam || <span className="text-muted-foreground font-normal">—</span>}
              </dd>
            </div>
            {partner.cim && (
              <div className="p-4 col-span-2 lg:col-span-4">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Cím / Székhely
                </dt>
                <dd className="text-sm font-semibold">
                  {partner.cim}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Részletek fülek */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="documents">Küldött Iratok</TabsTrigger>
          <TabsTrigger value="links">Csatolt Ügyek</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Partner által küldött iratok</CardTitle>
              <CardDescription>A partnerhez rendelt összes bejövő érkeztetés listája.</CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableRow key={`kuldo-${irat.id}`} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          {irat.ugyirat_id ? (
                            <Link href={`/dossiers/${irat.ugyirat_id}`} className="hover:underline text-primary">
                              {irat.erkeztetoszam}
                            </Link>
                          ) : (
                            <span>{irat.erkeztetoszam} <Badge variant="outline" className="ml-2">Iktatlan</Badge></span>
                          )}
                        </TableCell>
                        <TableCell>{irat.targy}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{new Date(irat.erkezes_datuma).toLocaleDateString("hu-HU")}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
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
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Csatolt ügyek</CardTitle>
              <CardDescription>Olyan ügyiratok és iratok, ahol ez a partner hivatkozásként lett megjelölve.</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <TableRow key={`kapcs-${i}`} className="hover:bg-muted/50 transition-colors">
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
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
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
