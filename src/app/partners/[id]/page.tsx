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
import { 
  ArrowLeft, Building2, FolderOpen, Link as LinkIcon, Calendar, 
  FileText, User, Mail, MapPin, Briefcase, Landmark, Phone, 
  Globe, CreditCard, Clock, PlusCircle, ArrowDownLeft, ArrowUpRight,
  ExternalLink, Users, AlertCircle, FilePlus2
} from "lucide-react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { PartnerDialog } from "@/components/partner-dialog"
import { PartnerContactDialog } from "@/components/partner-contact-dialog"
import { DeletePartnerContactButton } from "@/components/delete-partner-contact-button"
import { PartnerStatusToggle } from "@/components/partner-status-toggle"
import { getPermissions } from "@/utils/permissions"
import { cn } from "@/lib/utils"

export default async function PartnerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let docs_szerepkor = ""
  if (user) {
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("docs_szerepkor")
      .eq("id", user.id)
      .single()
    docs_szerepkor = profile?.docs_szerepkor || ""
  }
  const permissions = getPermissions(docs_szerepkor)

  // 1. Partner törzsadat
  const { data: partner } = await supabase
    .from("partner")
    .select("*")
    .eq("id", params.id)
    .single()

  if (!partner) {
    notFound()
  }

  // 2. Partnerhez kapcsolódó iratok (bejövő és kimenő)
  const { data: iratokMintPartner } = await supabase
    .from("irat")
    .select("id, targy, erkeztetoszam, iktatoszam, erkezes_datuma, ugyirat_id, irany")
    .eq("kuldo_partner_id", partner.id)
    .order("erkezes_datuma", { ascending: false })

  const incomingDocs = (iratokMintPartner || []).filter(i => i.irany === "bejovo" || !i.irany)
  const outgoingDocs = (iratokMintPartner || []).filter(i => i.irany === "kimeno")
  const allDocs = iratokMintPartner || []

  // 4. Polimorf kapcsolatok
  const { data: kapcsoltIratok } = await supabase
    .from("irat_kapcsolat")
    .select(`
      kapcsolat_tipusa,
      irat:irat_id ( id, targy, erkeztetoszam, iktatoszam, erkezes_datuma, ugyirat_id ),
      ugyirat:ugyirat_id ( id, iktatoszam, ugy:ugy_id (targy) )
    `)
    .eq("entitas_tipus", "partner")
    .eq("entitas_id", partner.id)

  // 5. Partnerhez tartozó kapcsolattartók
  const { data: kapcsolattartok } = await supabase
    .from("partner_kapcsolattarto")
    .select("*")
    .eq("partner_id", partner.id)
    .order("elsodleges", { ascending: false })
    .order("nev", { ascending: true })

  // Típus és Szerepkör segédfüggvények
  function getPartnerTypeInfo(tipus?: string | null) {
    switch (tipus) {
      case "maganszemely":
        return { label: "Magánszemély", icon: User }
      case "egyeni_vallalkozo":
        return { label: "Egyéni vállalkozó (EV)", icon: Briefcase }
      case "intezmeny":
        return { label: "Hivatal / Intézmény", icon: Landmark }
      case "ceg":
      default:
        return { label: "Cég / Gazdasági társaság", icon: Building2 }
    }
  }

  function getBusinessRoleInfo(szerepkor?: string | null) {
    switch (szerepkor) {
      case "szallito":
        return { label: "Szállító", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" }
      case "mindketto":
        return { label: "Vevő & Szállító", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
      case "hatosag":
        return { label: "Hatóság / Hivatalos szerv", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" }
      case "bank":
        return { label: "Pénzintézet", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
      case "egyeb":
        return { label: "Egyéb partner", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" }
      case "vevo":
      default:
        return { label: "Vevő", color: "bg-teal-500/10 text-teal-600 border-teal-500/20" }
    }
  }

  const typeInfo = getPartnerTypeInfo(partner.tipus)
  const TypeIcon = typeInfo.icon
  const roleInfo = getBusinessRoleInfo(partner.szerepkor)

  const contacts = kapcsolattartok || []
  const primaryContact = contacts.find(c => c.elsodleges) || contacts[0]

  return (
    <div className="page-animate space-y-6">
      
      {/* ── Fejléc & Akciógombok */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border/50 pb-5">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/partners" />} nativeButton={false} className="shrink-0 mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{partner.nev}</h1>
              
              <Badge variant="outline" className="text-xs gap-1 py-0.5">
                <TypeIcon className="h-3 w-3" />
                {typeInfo.label}
              </Badge>

              <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full border", roleInfo.color)}>
                {roleInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <PartnerStatusToggle 
                partnerId={partner.id} 
                currentStatus={partner.statusz || "aktiv"} 
                canEdit={permissions.canEdit} 
              />
              <span>•</span>
              <span className="tabular-nums">Létrehozva: {new Date(partner.created_at).toLocaleDateString("hu-HU")}</span>
              {partner.eaisybill_partner_id && (
                <>
                  <span>•</span>
                  <span className="text-primary font-mono">eaisyBill ID: {partner.eaisybill_partner_id}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Akciók */}
        <div className="flex items-center gap-2 flex-wrap">
          {permissions.canEdit && (
            <>
              <PartnerContactDialog partnerId={partner.id} />
              <PartnerDialog partner={partner} />
            </>
          )}
          <Link
            href={`/inbox?partner_id=${partner.id}&partner_nev=${encodeURIComponent(partner.nev)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            title="Új bejövő irat rögzítése ezzel a partnerrel"
          >
            <FilePlus2 className="h-3.5 w-3.5 text-primary" />
            Új Irat érkeztetése
          </Link>
        </div>
      </div>

      {/* ── Belső megjegyzés értesítő kártya (ha van megadva) */}
      {partner.megjegyzes && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground">Belső ügyintézői megjegyzés:</span>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{partner.megjegyzes}</p>
          </div>
        </div>
      )}

      {/* ── Felső KPI & Metaadat Kártyák (4 oszlopos grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Kártya: Azonosítók */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Azonosítók
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Belföldi adószám:</span>
              <p className="font-semibold font-mono text-foreground mt-0.5">
                {partner.adoszam || <span className="text-muted-foreground/60 font-normal">—</span>}
              </p>
            </div>
            {partner.kulfoldi_adoszam && (
              <div>
                <span className="text-muted-foreground">Külföldi / EU adószám:</span>
                <p className="font-semibold font-mono text-primary mt-0.5">
                  {partner.kulfoldi_adoszam}
                </p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Cégjegyzékszám / Nyilv.:</span>
              <p className="font-semibold font-mono text-foreground mt-0.5">
                {partner.cegjegyzekszam || <span className="text-muted-foreground/60 font-normal">—</span>}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Kártya: Elérhetőség & Székhely */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" />
              Elérhetőségek
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Központi e-mail:</span>
              <p className="font-semibold text-foreground mt-0.5 truncate">
                {partner.email ? (
                  <a href={`mailto:${partner.email}`} className="text-primary hover:underline">
                    {partner.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground/60 font-normal">—</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Központi telefon:</span>
              <p className="font-semibold text-foreground mt-0.5 tabular-nums">
                {partner.telefonszam ? (
                  <a href={`tel:${partner.telefonszam}`} className="hover:underline">
                    {partner.telefonszam}
                  </a>
                ) : (
                  <span className="text-muted-foreground/60 font-normal">—</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Székhely / Cím:</span>
              <p className="font-semibold text-foreground mt-0.5 truncate" title={partner.cim || ""}>
                {partner.cim || <span className="text-muted-foreground/60 font-normal">—</span>}
              </p>
            </div>
            {partner.weboldal && (
              <div>
                <a 
                  href={partner.weboldal.startsWith("http") ? partner.weboldal : `https://${partner.weboldal}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[11px]"
                >
                  <Globe className="h-3 w-3" />
                  Weboldal megnyitása <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Kártya: Pénzügy & Feltételek */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Pénzügy & Fizetés
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Bankszámlaszám:</span>
              <p className="font-semibold font-mono text-foreground mt-0.5 text-[11px] truncate" title={partner.bankszamlaszam || ""}>
                {partner.bankszamlaszam || <span className="text-muted-foreground/60 font-normal font-sans">—</span>}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Fizetési határidő:</span>
              <p className="font-semibold text-foreground mt-0.5 tabular-nums">
                {partner.fizetesi_hatarido_nap ? `${partner.fizetesi_hatarido_nap} nap` : "8 nap"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Fizetési mód:</span>
              <p className="font-semibold text-foreground mt-0.5 capitalize">
                {partner.fizetesi_mod === "atutalas" ? "Banki átutalás"
                  : partner.fizetesi_mod === "keszpenz" ? "Készpénz"
                  : partner.fizetesi_mod === "bankkartya" ? "Bankkártya"
                  : partner.fizetesi_mod || "Banki átutalás"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Kártya: Iratforgalmi Statisztika */}
        <Card className="border border-border/60 bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Iratforgalmi Összegző
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Összes irat:</span>
              <span className="font-semibold tabular-nums text-foreground">{allDocs.length} db</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3 text-emerald-500" /> Bejövő iratok:
              </span>
              <span className="font-semibold tabular-nums text-foreground">{incomingDocs.length} db</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-blue-500" /> Kimenő iratok:
              </span>
              <span className="font-semibold tabular-nums text-foreground">{outgoingDocs.length} db</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Csatolt ügyiratok:</span>
              <span className="font-semibold tabular-nums text-foreground">{kapcsoltIratok?.length || 0} db</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Részletes Fülek (Iratforgalom, Kapcsolattartók, Csatolt Ügyek) */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-3.5 w-3.5" />
            Iratforgalom ({allDocs.length})
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            Kapcsolattartók ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <LinkIcon className="h-3.5 w-3.5" />
            Csatolt Ügyek ({kapcsoltIratok?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* ── 1. FÜL: IRATFORGALOM (Bejövő & Kimenő) */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="border border-border/60 bg-card">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Partnerrel kapcsolatos iratforgalom</CardTitle>
                <CardDescription className="text-xs">
                  A partner által beküldött (bejövő) és a partner részére postázott/küldött (kimenő) hivatalos iratok.
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground font-mono tabular-nums">
                {incomingDocs.length} bejövő • {outgoingDocs.length} kimenő
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Irány</TableHead>
                    <TableHead>Azonosító</TableHead>
                    <TableHead>Tárgy</TableHead>
                    <TableHead>Ügyirat</TableHead>
                    <TableHead className="text-right">Dátum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDocs.length > 0 ? (
                    allDocs.map((irat) => {
                      const isIncoming = irat.irany === "bejovo" || !irat.irany
                      return (
                        <TableRow key={`irat-${irat.id}`} className="hover:bg-muted/40 transition-colors">
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium",
                              isIncoming ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            )}>
                              {isIncoming ? (
                                <><ArrowDownLeft className="h-3 w-3" /> Bejövő</>
                              ) : (
                                <><ArrowUpRight className="h-3 w-3" /> Kimenő</>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">
                            {irat.iktatoszam ? (
                              <Link href={`/inbox/${irat.id}`} className="hover:underline text-foreground">
                                {irat.iktatoszam}
                              </Link>
                            ) : irat.erkeztetoszam ? (
                              <Link href={`/inbox/${irat.id}`} className="hover:underline text-primary">
                                {irat.erkeztetoszam}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-foreground">
                            {irat.targy}
                          </TableCell>
                          <TableCell className="text-xs">
                            {irat.ugyirat_id ? (
                              <Link href={`/dossiers/${irat.ugyirat_id}`} className="text-primary hover:underline font-mono">
                                Ügyirat megtekintése →
                              </Link>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                Iktatlan
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground font-mono tabular-nums">
                            {irat.erkezes_datuma ? new Date(irat.erkezes_datuma).toLocaleDateString("hu-HU") : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-xs">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Nem található a partnerhez rendelt irat.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 2. FÜL: KAPCSOLATTARTÓK (ÚJ!) */}
        <TabsContent value="contacts" className="space-y-4">
          <Card className="border border-border/60 bg-card">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Kapcsolattartó személyek</CardTitle>
                <CardDescription className="text-xs">
                  A partnernél nyilvántartott munkatársak, képviselők és közvetlen elérhetőségeik.
                </CardDescription>
              </div>
              {permissions.canEdit && (
                <PartnerContactDialog partnerId={partner.id} />
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Név & Beosztás</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefonszám</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead>Megjegyzés</TableHead>
                    {permissions.canEdit && <TableHead className="w-[80px] text-right">Művelet</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length > 0 ? (
                    contacts.map((contact) => (
                      <TableRow key={`contact-${contact.id}`} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            {contact.nev}
                            {contact.elsodleges && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-normal py-0">
                                Elsődleges
                              </Badge>
                            )}
                          </div>
                          {contact.beosztas && (
                            <p className="text-xs text-muted-foreground mt-0.5">{contact.beosztas}</p>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs tabular-nums">
                          {contact.telefonszam ? (
                            <a href={`tel:${contact.telefonszam}`} className="hover:underline flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {contact.telefonszam}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          {contact.elsodleges ? (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              Fő kapcsolattartó
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Munkatárs</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={contact.megjegyzes || ""}>
                          {contact.megjegyzes || "—"}
                        </TableCell>

                        {permissions.canEdit && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <PartnerContactDialog 
                                contact={contact} 
                                partnerId={partner.id} 
                                iconOnly={true} 
                              />
                              <DeletePartnerContactButton 
                                contactId={contact.id} 
                                partnerId={partner.id} 
                                contactName={contact.nev} 
                              />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={permissions.canEdit ? 6 : 5} className="h-28 text-center text-muted-foreground text-xs">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Még nincsenek kapcsolattartók rögzítve ehhez a partnerhez.
                        {permissions.canEdit && (
                          <div className="mt-2">
                            <PartnerContactDialog partnerId={partner.id} />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 3. FÜL: CSATOLT ÜGYEK */}
        <TabsContent value="links" className="space-y-4">
          <Card className="border border-border/60 bg-card">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-semibold">Csatolt ügyek és polimorf kapcsolatok</CardTitle>
              <CardDescription className="text-xs">
                Olyan ügyiratok és szerződések, ahol ez a partner hivatkozásként vagy érintettként szerepel.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                      const isUgyirat = !!kapcs.ugyirat
                      const u = kapcs.ugyirat as any
                      const ir = kapcs.irat as any

                      return (
                        <TableRow key={`kapcs-${i}`} className="hover:bg-muted/40 transition-colors">
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {kapcs.kapcsolat_tipusa}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">
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
                                ir?.erkeztetoszam || "—"
                              )
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {isUgyirat ? u.ugy?.targy : ir?.targy}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-28 text-center text-muted-foreground text-xs">
                        <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
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
