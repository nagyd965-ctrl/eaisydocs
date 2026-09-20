import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, Users, ArrowLeft, FolderPlus, Eye, Lock, Edit, Trash2, Mail, Building2, Shield, CalendarDays, Files } from "lucide-react"
import Link from "next/link"
import { Timeline, TimelineEvent, TimelineIconName } from "@/components/timeline"
import { IratokLista } from "@/components/iratok-lista"
import { createClient } from "@/utils/supabase/server"
import { CloseDossierButton } from "@/components/close-dossier-button"
import { PolymorphicLinksTab } from "@/components/polymorphic-links-tab"
import { AssignDossierDialog } from "@/components/assign-dossier-dialog"
import { StatusBadge } from "@/components/status-badge"
import { getPermissions } from "@/utils/permissions"
import { TasksTab } from "@/components/tasks-tab"
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
        erkeztetoszam,
        targy,
        irany,
        minosites,
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
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">🔒 Hozzáférés Megtagadva: Bizalmas Ügyirat</h2>
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
            <Button render={<Link href="/dossiers" />} nativeButton={false} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Vissza az iktatókönyvhöz
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

  // Fetch audit logs for this dossier
  const { data: logs } = await supabase
    .from("esemeny_naplo")
    .select("*")
    .eq("entitas_id", id)
    .order("tortent", { ascending: true });

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

  const timelineEvents: TimelineEvent[] = (logs || []).map((log: any) => {
    let title = log.esemeny_tipus;
    let description = "";
    let icon: TimelineIconName = "eye";
    let color = "text-muted-foreground";
    let details: string | undefined = undefined;

    if (log.esemeny_tipus === "iktatva") {
      title = "Ügyirat iktatva";
      description = `Iktatószám kiosztva: ${log.uj_ertek?.iktatoszam || "-"}`;
      icon = "folder-plus";
      color = "text-primary";
    } else if (log.esemeny_tipus === "szignalva" || log.esemeny_tipus === "hozzaferes_modositas") {
      title = log.esemeny_tipus === "szignalva" ? "Ügyirat szignálva / Felelős kijelölve" : "Hozzáférés módosítva";
      description = log.indoklas || log.reszletek || log.uj_ertek?.megjegyzes || "";
      icon = "users";
      color = "text-warning";
    } else if (log.esemeny_tipus === "lezarva") {
      title = "Ügyirat lezárva";
      description = log.reszletek || "Az ügyirat véglegesen lezárásra került.";
      icon = "lock";
      color = "text-success";
    } else if (log.esemeny_tipus === "modositva") {
      if (log.indoklas && log.indoklas.includes("Válasz e-mail elküldve")) {
        title = "Levélküldés";
        icon = "mail";
        color = "text-primary";
        const lines = log.indoklas.split('\n');
        description = lines[0];
        if (lines.length > 1) {
          details = lines.slice(1).join('\n').trim();
        }
      } else if (log.indoklas && log.indoklas.includes("Válaszlevél feltöltve")) {
        title = "Válaszlevél feltöltve";
        description = log.indoklas;
        icon = "file-text";
        color = "text-primary";
      } else if (log.indoklas && log.indoklas.includes("Állapot módosítva")) {
        title = "Állapot változás";
        description = log.indoklas;
        icon = "edit";
        color = "text-warning";
      } else if (log.indoklas && log.indoklas.includes("Megjegyzés")) {
        title = "Megjegyzés hozzáadva";
        description = log.indoklas;
        icon = "edit";
        color = "text-info";
      } else {
        title = "Ügyirat módosítva";
        description = log.indoklas || log.reszletek || log.uj_ertek?.megjegyzes || "";
        icon = "edit";
        color = "text-info";
      }
    } else if (log.esemeny_tipus === "selejtezve") {
      title = "Irat selejtezve";
      description = log.reszletek || "Az irat megsemmisítésre került.";
      icon = "trash-2";
      color = "text-destructive";
    }

    return {
      id: log.id,
      title,
      description,
      time: new Date(log.tortent).toLocaleString("hu-HU"),
      user: userMap[log.user_id] || log.uj_ertek?.user_email || "Ismeretlen",
      icon,
      color,
      details,
    }
  });

  const ugy = dossier.ugy as any;
  const szervEgyseg = dossier.szervezeti_egyseg as any;
  const iratokSzama = Array.isArray(dossier.irat) ? dossier.irat.length : 0;
  const felelosNev = (ugy?.felelos_user as any)?.full_name || null;

  return (
    <div className="page-animate space-y-6">
      {/* Fejléc — iktatószám + státusz + lezárás gomb */}
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
          {permissions.canEdit && dossier.statusz !== "lezart" && dossier.statusz !== "irattarban" && dossier.statusz !== "selejtezheto" && (
            <CloseDossierButton ugyiratId={dossier.id} />
          )}
        </div>
      </div>

      {isClearanceRestricted && (
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 shadow-sm">
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
          <TabsTrigger value="tasks">Feladatok</TabsTrigger>
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
                      <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-400 bg-purple-500/10 flex items-center gap-1 font-semibold uppercase w-fit">
                        <Lock className="w-3 h-3" /> Szigorúan bizalmas
                      </Badge>
                    ) : highestMinosites === "bizalmas" ? (
                      <Badge variant="outline" className="text-xs border-rose-500/40 text-rose-400 bg-rose-500/10 flex items-center gap-1 font-semibold uppercase w-fit">
                        <Lock className="w-3 h-3" /> Bizalmas
                      </Badge>
                    ) : highestMinosites === "belso" ? (
                      <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-400 bg-blue-500/10 w-fit">
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
                currentUserClearance={currentUserProfile?.max_minosites || 'nyilt'}
                isAdmin={isAdmin}
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
