import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, Users, ArrowLeft, FolderPlus, Eye, Lock, Edit, Trash2, Mail, Building2, Shield, CalendarDays, Files } from "lucide-react"
import Link from "next/link"
import { Timeline, TimelineEvent, TimelineIconName } from "@/components/timeline"
import { formatAuditLogEvent } from "@/utils/audit-log-formatter"
import { IratokLista } from "@/components/iratok-lista"
import { createClient } from "@/utils/supabase/server"
import { DossierLifecycleActions } from "@/components/dossier-lifecycle-actions"
import { PolymorphicLinksTab } from "@/components/polymorphic-links-tab"
import { AssignDossierDialog } from "@/components/assign-dossier-dialog"
import { StatusBadge } from "@/components/status-badge"
import { getPermissions } from "@/utils/permissions"
import { TasksTab } from "@/components/tasks-tab"
import { OutgoingDocumentsTab } from "@/components/outgoing-documents-tab"
import { LifecycleExportButton } from "@/components/lifecycle-export-button"
import { DossierAccessDialog } from "@/components/dossier-access-dialog"
import { Badge } from "@/components/ui/badge"

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dossier } = await supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      iktatas_datuma,
      szervezeti_egyseg_id,
      szervezeti_egyseg ( id, nev ),
      ugy ( id, targy, hatarido, statusz, felelos_user_id ),
      irat (
        id,
        alszam,
        erkeztetoszam,
        targy,
        irany,
        minosites,
        erkezes_modja,
        erkezes_datuma,
        leiras,
        kuldo_partner_id,
        partner:kuldo_partner_id ( id, nev, email, telefonszam, cim ),
        kezbesites_statusz,
        kezbesites_modja,
        kezbesites_datuma,
        kezbesites_cimzett,
        kezbesites_azonosito,
        kezbesites_megjegyzes,
        irat_fajl (
          id,
          eredeti_fajlnev,
          storage_path,
          meret_byte,
          sha256,
          verzio,
          pdfa_path
        ),
        irat_fizikai_hely ( doboz, polc ),
        irat_kolcsonzes_naplo ( id, kinek_user_id, varhato_visszahozatal, statusz )
      )
    `)
    .eq("id", id)
    .single();

  const { data: users } = await supabase
    .from("felhasznalo_profil")
    .select('id, nev, docs_szerepkor, szervezeti_egyseg_id, szervezeti_egyseg:szervezeti_egyseg_id(nev)')
    .contains('elerheto_modulok', ['docs'])

  // Current user role check
  const { data: authUser } = await supabase.auth.getUser()
  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select('docs_szerepkor, szervezeti_egyseg_id, max_minosites')
    .eq("id", authUser?.user?.id || "")
    .single()
  
  // Check for explicit access
  const { data: explicitAccess } = await supabase
    .from("ugyirat_hozzaferes")
    .select("id")
    .eq("ugyirat_id", id)
    .eq("user_id", authUser?.user?.id || "")
    .maybeSingle()
  
  const hasExplicitAccess = !!explicitAccess
  const permissions = getPermissions(currentUserProfile?.docs_szerepkor)
  const canAssign = permissions.canAssign
  const canEdit = permissions.canEdit
  
  const isUgyintezo = currentUserProfile?.docs_szerepkor === 'ugyintezo'
  const isVezeto = currentUserProfile?.docs_szerepkor === 'vezeto'
  const isAdmin = currentUserProfile?.docs_szerepkor === 'admin'
  const isIktato = currentUserProfile?.docs_szerepkor === 'iktato'

  const userMap = (users || []).reduce((acc: any, user: any) => {
    acc[user.id] = user.nev
    return acc
  }, {})

  // Ha az ügyirat nem található vagy az RLS letiltotta a bizalmas minősítés miatt
  if (!dossier) {
    // Ellenőrizzük admin klienssel, hogy létezik-e az ügyirat, csak a minősítés miatt tiltott
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: existingDossier } = await admin.from("ugyirat").select("id, iktatoszam").eq("id", id).maybeSingle()

    if (existingDossier) {
      return (
        <div className="p-12 max-w-xl mx-auto text-center space-y-5">
          <div className="w-16 h-16 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center justify-center mx-auto text-destructive">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">Hozzáférés Megtagadva: Bizalmas Ügyirat</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              A jelen ügyirat (<strong>{existingDossier.iktatoszam}</strong>) megtekintéséhez magasabb biztonsági minősítés (Bizalmas / Szigorúan bizalmas) szükséges.
            </p>
          </div>
          <div className="p-3.5 bg-muted border border-border rounded text-xs text-muted-foreground flex items-center justify-center gap-2">
            <span>Az Ön jelenlegi jogosultsági szintje:</span>
            <span className="font-semibold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              {currentUserProfile?.max_minosites || 'nyilt'}
            </span>
          </div>
          <div className="pt-2">
            <Button render={<Link href="/dossiers" />} nativeButton={false}>
              Vissza az iktatókönyvhöz
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Ügyirat nem található</h2>
        <Button render={<Link href="/dossiers" />} nativeButton={false}>Vissza az iktatókönyvhöz</Button>
      </div>
    );
  }

  // Minősítés hierarchia ellenőrzés
  const minositesHierarchy: Record<string, number> = {
    nyilt: 1,
    belso: 2,
    bizalmas: 3,
    szigoruan_bizalmas: 4
  }
  const userClearanceLevel = minositesHierarchy[currentUserProfile?.max_minosites || 'nyilt'] || 1
  const iratList = Array.isArray(dossier.irat) ? dossier.irat : []
  const highestDocLevel = iratList.reduce((max: number, i: any) => {
    const lvl = minositesHierarchy[i.minosites || 'nyilt'] || 1
    return Math.max(max, lvl)
  }, 1)

  const highestMinosites = iratList.reduce((max: string, i: any) => {
    const currentLevel = minositesHierarchy[i.minosites || 'nyilt'] || 1
    const maxLevel = minositesHierarchy[max] || 1
    return currentLevel > maxLevel ? (i.minosites || 'nyilt') : max
  }, 'nyilt')

  const isClearanceRestricted = !hasExplicitAccess && !isAdmin && !isIktato && userClearanceLevel < highestDocLevel

  // Fetch polymorphic links
  const { data: polymorphicLinks } = await supabase
    .from("irat_kapcsolat")
    .select(`
      id,
      entitas_tipus,
      entitas_id,
      entitas_forras,
      kapcsolat_tipusa,
      irat ( id, erkeztetoszam, targy )
    `)
    .eq("ugyirat_id", id)
    .order("created_at", { ascending: false });

  // Partner felderítése az intelligens válaszlevél címzéshez
  const incomingDocs = (dossier.irat || []).filter((i: any) => i.irany === "bejovo");
  const primaryIncoming = incomingDocs[0] || null;

  const partnerIds = Array.from(new Set([
    ...((dossier.irat || []).map((i: any) => i.kuldo_partner_id).filter(Boolean)),
    ...((polymorphicLinks || []).filter((l: any) => l.entitas_tipus === "partner").map((l: any) => l.entitas_id).filter(Boolean))
  ])) as string[];

  let partnerContacts: any[] = [];
  let linkedPartners: any[] = [];
  if (partnerIds.length > 0) {
    const { data: contacts } = await supabase
      .from("partner_kapcsolattarto")
      .select("id, partner_id, nev, email, telefonszam, elsodleges")
      .in("partner_id", partnerIds);
    partnerContacts = contacts || [];

    const { data: pList } = await supabase
      .from("partner")
      .select("id, nev, email, telefonszam, cim")
      .in("id", partnerIds);
    linkedPartners = pList || [];
  }

  // Intelligens partner feloldási hierarchia
  let detectedPartner: {
    id?: string | null
    nev?: string | null
    email?: string | null
    telefonszam?: string | null
    cim?: string | null
    source?: string | null
    contacts?: Array<{ id: string; nev: string; email?: string | null; elsodleges?: boolean }>
  } | null = null;

  const partnerRaw: any = (primaryIncoming as any)?.partner;
  const pFromIncoming: any = Array.isArray(partnerRaw)
    ? partnerRaw[0]
    : (partnerRaw || linkedPartners.find((p: any) => p.id === (primaryIncoming as any)?.kuldo_partner_id));
  if (pFromIncoming) {
    const pContacts = partnerContacts.filter((c: any) => c.partner_id === pFromIncoming.id);
    const primaryContact = pContacts.find((c: any) => c.elsodleges && c.email) || pContacts.find((c: any) => c.email);

    let resolvedEmail = pFromIncoming.email || primaryContact?.email || "";
    let emailSource = pFromIncoming.email 
      ? "Központi partner e-mail" 
      : (primaryContact?.email ? `Elsődleges kapcsolattartó (${primaryContact.nev})` : "");

    // Ha az e-mail üres, de az irat e-mailben érkezett, keressük a leírásban
    if (!resolvedEmail && primaryIncoming?.erkezes_modja === "email" && primaryIncoming?.leiras) {
      const match = primaryIncoming.leiras.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) {
        resolvedEmail = match[0];
        emailSource = "Eredeti beérkező levél feladója";
      }
    }

    detectedPartner = {
      id: pFromIncoming.id,
      nev: pFromIncoming.nev,
      email: resolvedEmail,
      telefonszam: pFromIncoming.telefonszam,
      cim: pFromIncoming.cim,
      source: emailSource,
      contacts: pContacts.map((c: any) => ({
        id: c.id,
        nev: c.nev,
        email: c.email,
        elsodleges: c.elsodleges
      }))
    };
  } else if (linkedPartners.length > 0) {
    const p = linkedPartners[0];
    const pContacts = partnerContacts.filter((c: any) => c.partner_id === p.id);
    detectedPartner = {
      id: p.id,
      nev: p.nev,
      email: p.email || "",
      telefonszam: p.telefonszam,
      cim: p.cim,
      source: p.email ? "Kapcsolt partner e-mail" : "",
      contacts: pContacts.map((c: any) => ({
        id: c.id,
        nev: c.nev,
        email: c.email,
        elsodleges: c.elsodleges
      }))
    };
  }

  // Fetch audit logs for this dossier and its associated documents
  const iratIds = Array.isArray(dossier.irat) ? dossier.irat.map((i: any) => i.id) : []
  let logsQuery = supabase.from("esemeny_naplo").select("*")
  if (iratIds.length > 0) {
    logsQuery = logsQuery.or(`entitas_id.eq.${id},entitas_id.in.(${iratIds.join(",")})`)
  } else {
    logsQuery = logsQuery.eq("entitas_id", id)
  }
  const { data: logs } = await logsQuery.order("tortent", { ascending: true })

  // Fetch comments
  const { data: comments } = await supabase
    .from("ugyirat_megjegyzes")
    .select(`
      id,
      szoveg,
      created_at,
      user_id
    `)
    .eq("ugyirat_id", id)
    .order("created_at", { ascending: true });

  // Fetch tasks
  const { data: tasks } = await supabase
    .from("feladat")
    .select("*")
    .eq("ugyirat_id", id)
    .order("created_at", { ascending: true });

  // Map users to comments
  const mappedComments = (comments || []).map((c: any) => ({
    ...c,
    user_email: c.user_id,
    user_name: userMap[c.user_id] || "Ismeretlen"
  }))

  // Deduplicate consecutive/simultaneous logs where a DB trigger inserted an empty log alongside a rich application log
  const dedupedLogs = (logs || []).filter((log: any, idx: number, arr: any[]) => {
    if (!log.indoklas) {
      const hasRichDuplicate = arr.some((other: any) => 
        other.id !== log.id &&
        other.esemeny_tipus === log.esemeny_tipus &&
        other.indoklas &&
        Math.abs(new Date(other.tortent).getTime() - new Date(log.tortent).getTime()) < 5000
      );
      if (hasRichDuplicate) return false;
    }
    return true;
  });

  const timelineEvents: TimelineEvent[] = dedupedLogs.map((log: any) => {
    return formatAuditLogEvent(log, {
      userMap,
      comments: comments || [],
    })
  });

  const ugy = dossier.ugy as any;
  const szervEgyseg = dossier.szervezeti_egyseg as any;
  const iratokSzama = Array.isArray(dossier.irat) ? dossier.irat.length : 0;
  const felelosNev = (ugy?.felelos_user as any)?.full_name || null;

  // Feladat statisztikák az életciklus vezérlőhöz
  const taskList = tasks || [];
  const totalTasks = taskList.length;
  const completedTasks = taskList.filter((t: any) => t.allapot === "kesz").length;
  const rejectedTasks = taskList.filter((t: any) => t.allapot === "elutasitott").length;
  const openTasks = taskList.filter((t: any) => t.allapot === "nyitott" || t.allapot === "folyamatban").length;

  return (
    <div className="page-animate space-y-6">
      {/* Fejléc — iktatószám + státusz + életciklus kezelő */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/dossiers" />} nativeButton={false} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{dossier.iktatoszam}</h1>
              <StatusBadge status={dossier.statusz} />
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{ugy?.targy}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DossierAccessDialog 
            ugyiratId={dossier.id}
            iktatoszam={dossier.iktatoszam}
            canManage={canAssign || isVezeto || currentUserProfile?.docs_szerepkor === 'admin'}
            allUsers={users || []}
          />
          <DossierLifecycleActions
            ugyiratId={dossier.id}
            ugyId={ugy?.id}
            status={dossier.statusz}
            canEdit={permissions.canEdit}
            isUgyintezo={isUgyintezo}
            isVezeto={isVezeto}
            isAdmin={isAdmin}
            taskStats={{
              total: totalTasks,
              completed: completedTasks,
              rejected: rejectedTasks,
              open: openTasks,
            }}
          />
        </div>
      </div>

      {isClearanceRestricted && (
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3">
          <Lock className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
              Bizalmas ügyirat — Korlátozott hozzáférés
            </h4>
            <p className="text-xs text-destructive/80 mt-1 leading-relaxed">
              Ez az ügyirat olyan dokumentumokat tartalmaz, amelyek megtekintéséhez magasabb biztonsági minősítés szükséges (az Ön szintje: <strong className="uppercase">{currentUserProfile?.max_minosites || 'nyílt'}</strong>). Az iratok nyilvántartási adatai megtekinthetők, de a csatolt bizalmas fájlok megnyitása és letöltése szigorúan zárolva van.
            </p>
          </div>
        </div>
      )}


      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Áttekintés</TabsTrigger>
          <TabsTrigger value="tasks">Feladatok & Megjegyzések</TabsTrigger>
          <TabsTrigger value="outgoing">Válaszlevelek & Expediálás</TabsTrigger>
          <TabsTrigger value="history">Napló</TabsTrigger>
          <TabsTrigger value="links">Külső Kapcsolatok</TabsTrigger>
        </TabsList>
        
        {/* Összevont Áttekintés + Iratok tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metaadat grid — kompakt definition list */}
          <Card className="border border-border/50">
            <CardContent className="p-0">
              <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border/50">
                {/* Felelős */}
                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                    <Users className="h-3.5 w-3.5" />
                    Felelős
                  </dt>
                  <dd className="text-sm font-semibold">
                    <AssignDossierDialog 
                      ugyirat_id={dossier.id} 
                      ugy_id={ugy?.id} 
                      szervezeti_egyseg_id={dossier.szervezeti_egyseg_id || null}
                      users={users || []}
                      currentFelelosId={ugy?.felelos_user_id}
                      currentHatarido={ugy?.hatarido}
                      canAssign={canAssign}
                    >
                      <span className={canAssign ? "cursor-pointer hover:text-primary transition-colors" : ""}>
                        {felelosNev || <span className="italic text-muted-foreground font-normal">Kiosztatlan</span>}
                      </span>
                    </AssignDossierDialog>
                  </dd>
                </div>

                {/* Határidő */}
                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    Határidő
                  </dt>
                  <dd className={`text-sm font-semibold tabular-nums ${ugy?.hatarido && new Date(ugy.hatarido) < new Date() ? "text-destructive" : "text-foreground"}`}>
                    {ugy?.hatarido 
                      ? new Date(ugy.hatarido).toLocaleDateString("hu-HU") 
                      : <span className="text-muted-foreground font-normal">—</span>}
                  </dd>
                </div>

                {/* Szervezeti egység */}
                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Szervezeti egység
                  </dt>
                  <dd className="text-sm font-semibold">
                    {szervEgyseg?.nev || <span className="text-muted-foreground font-normal">—</span>}
                  </dd>
                </div>

                {/* Minősítés */}
                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                    <Shield className="h-3.5 w-3.5" />
                    Minősítés
                  </dt>
                  <dd className="text-sm font-semibold">
                    {highestMinosites === "szigoruan_bizalmas" ? (
                      <Badge variant="outline" className="text-xs border-destructive/40 text-destructive bg-destructive/15 flex items-center gap-1 font-semibold uppercase w-fit">
                        <Lock className="w-3 h-3" /> Szigorúan bizalmas
                      </Badge>
                    ) : highestMinosites === "bizalmas" ? (
                      <Badge variant="outline" className="text-xs border-destructive/30 text-destructive bg-destructive/10 flex items-center gap-1 font-semibold uppercase w-fit">
                        <Lock className="w-3 h-3" /> Bizalmas
                      </Badge>
                    ) : highestMinosites === "belso" ? (
                      <Badge variant="outline" className="text-xs border-info/30 text-info bg-info/10 w-fit font-semibold">
                        Belső
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground w-fit">
                        Nyílt
                      </Badge>
                    )}
                  </dd>
                </div>

                {/* Iktatás dátuma */}
                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Iktatás dátuma
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums">
                    {(dossier as any).iktatas_datuma 
                      ? new Date((dossier as any).iktatas_datuma).toLocaleDateString("hu-HU") 
                      : <span className="text-muted-foreground font-normal">—</span>}
                  </dd>
                </div>

                {/* Iratok száma */}
                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                    <Files className="h-3.5 w-3.5" />
                    Iratok száma
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums">{iratokSzama} db</dd>
                </div>

                {/* Állapot */}
                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    Állapot
                  </dt>
                  <dd className="text-sm">
                    <StatusBadge status={dossier.statusz} />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Iratok tábla — közvetlenül alatta */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Iratok és fájlok</CardTitle>
              <CardDescription>Az ügyirathoz tartozó dokumentumok.</CardDescription>
            </CardHeader>
            <CardContent>
              <IratokLista 
                iratok={dossier.irat} 
                canEdit={canEdit} 
                users={users || []} 
                dossierIktatoszam={dossier.iktatoszam}
                ugyiratId={dossier.id}
                currentUserClearance={currentUserProfile?.max_minosites || 'nyilt'}
                isAdmin={isAdmin}
                partnerInfo={detectedPartner}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab 
            ugyiratId={dossier.id} 
            ugyId={ugy?.id}
            status={dossier.statusz}
            comments={mappedComments}
            tasks={tasks || []}
            users={users || []}
            canEdit={canEdit}
            currentUserEmail={authUser?.user?.email || ""}
            iktatoszam={dossier.iktatoszam}
          />
        </TabsContent>

        <TabsContent value="outgoing">
          <OutgoingDocumentsTab
            ugyiratId={dossier.id}
            iktatoszam={dossier.iktatoszam}
            canEdit={canEdit}
            partnerInfo={detectedPartner}
            incomingIrat={primaryIncoming}
            outgoingDocs={(dossier.irat || []).filter((i: any) => i.irany === "kimeno")}
          />
        </TabsContent>
        
        <TabsContent value="history">
          <Card className="border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Eseménynapló</CardTitle>
                <CardDescription>Minden módosítás és megtekintés auditált naplója.</CardDescription>
              </div>
              <LifecycleExportButton ugyiratId={dossier.id} />
            </CardHeader>
            <CardContent>
              <Timeline events={timelineEvents} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Kapcsolódó Rendszerek</CardTitle>
              <CardDescription>Külső hivatkozások kezelése ehhez az ügyirathoz és irataihoz.</CardDescription>
            </CardHeader>
            <CardContent>
              <PolymorphicLinksTab links={polymorphicLinks || []} ugyiratId={dossier.id} iratok={dossier.irat || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
