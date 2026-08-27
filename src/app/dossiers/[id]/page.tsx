import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, Users, ArrowLeft, FolderPlus, Eye, Lock, Edit, Trash2, Mail, Building2, Shield, CalendarDays, Files } from "lucide-react"
import Link from "next/link"
import { Timeline, TimelineEvent } from "@/components/timeline"
import { IratokLista } from "@/components/iratok-lista"
import { createClient } from "@/utils/supabase/server"
import { CloseDossierButton } from "@/components/close-dossier-button"
import { PolymorphicLinksTab } from "@/components/polymorphic-links-tab"
import { AssignDossierDialog } from "@/components/assign-dossier-dialog"
import { StatusBadge } from "@/components/status-badge"
import { getPermissions } from "@/utils/permissions"
import { TasksTab } from "@/components/tasks-tab"
import { LifecycleExportButton } from "@/components/lifecycle-export-button"

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
    .select('id, nev, docs_szerepkor, szervezeti_egyseg_id')
    .contains('elerheto_modulok', ['docs'])

  // Current user role check
  const { data: authUser } = await supabase.auth.getUser()
  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select('docs_szerepkor, szervezeti_egyseg_id')
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
  
  const isUgyintezo = currentUserProfile?.docs_szerepkor === 'ugyintezo'
  const isVezeto = currentUserProfile?.docs_szerepkor === 'vezeto'

  let canEdit = permissions.canEdit
  if (isUgyintezo) {
    const isAssigned = (dossier?.ugy as any)?.felelos_user_id === authUser?.user?.id
    canEdit = isAssigned || hasExplicitAccess
  } else if (isVezeto) {
    const inDepartment = dossier?.szervezeti_egyseg_id === currentUserProfile?.szervezeti_egyseg_id
    canEdit = inDepartment || hasExplicitAccess
  }

  let canAssign = permissions.canAssign
  if (isVezeto) {
    const inDepartment = dossier?.szervezeti_egyseg_id === currentUserProfile?.szervezeti_egyseg_id
    canAssign = inDepartment || hasExplicitAccess
  }

  // Map user names
  const userMap = (users || []).reduce((acc: any, user: any) => {
    acc[user.id] = user.nev
    return acc
  }, {})

  if (dossier && (dossier.ugy as any)?.felelos_user_id) {
    (dossier.ugy as any).felelos_user = {
      full_name: userMap[(dossier.ugy as any).felelos_user_id]
    }
  }

  if (!dossier) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Ügyirat nem található</h2>
        <Button render={<Link href="/dossiers" />} nativeButton={false}>Vissza az iktatókönyvhöz</Button>
      </div>
    );
  }

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
    let icon = Eye;
    let color = "text-muted-foreground";
    let details = undefined;

    if (log.esemeny_tipus === "iktatva") {
      title = "Ügyirat iktatva";
      description = `Iktatószám kiosztva: ${log.uj_ertek?.iktatoszam || "-"}`;
      icon = FolderPlus;
      color = "text-primary";
    } else if (log.esemeny_tipus === "szignalva" || log.esemeny_tipus === "hozzaferes_modositas") {
      title = "Hozzáférés módosítva";
      description = log.indoklas || log.reszletek || log.uj_ertek?.megjegyzes || "";
      icon = Users;
      color = "text-warning";
    } else if (log.esemeny_tipus === "lezarva") {
      title = "Ügyirat lezárva";
      description = log.reszletek || "Az ügyirat véglegesen lezárásra került.";
      icon = Lock;
      color = "text-success";
    } else if (log.esemeny_tipus === "modositva") {
      if (log.indoklas && log.indoklas.includes("Válasz e-mail elküldve")) {
        title = "Levélküldés";
        icon = Mail;
        color = "text-primary";
        const lines = log.indoklas.split('\n');
        description = lines[0];
        if (lines.length > 1) {
          details = lines.slice(1).join('\n').trim();
        }
      } else if (log.indoklas && log.indoklas.includes("Válaszlevél feltöltve")) {
        title = "Válaszlevél feltöltve";
        description = log.indoklas;
        icon = FileText;
        color = "text-primary";
      } else if (log.indoklas && log.indoklas.includes("Állapot módosítva")) {
        title = "Állapot változás";
        description = log.indoklas;
        icon = Edit;
        color = "text-warning";
      } else if (log.indoklas && log.indoklas.includes("Megjegyzés")) {
        title = "Megjegyzés hozzáadva";
        description = log.indoklas;
        icon = Edit;
        color = "text-info";
      } else {
        title = "Ügyirat módosítva";
        description = log.indoklas || log.reszletek || log.uj_ertek?.megjegyzes || "";
        icon = Edit;
        color = "text-info";
      }
    } else if (log.esemeny_tipus === "selejtezve") {
      title = "Irat selejtezve";
      description = log.reszletek || "Az irat megsemmisítésre került.";
      icon = Trash2;
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
        {permissions.canEdit && dossier.statusz !== "lezart" && dossier.statusz !== "irattarban" && dossier.statusz !== "selejtezheto" && (
          <CloseDossierButton ugyiratId={dossier.id} />
        )}
      </div>

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
                  <dd className="text-sm font-semibold">Nyílt</dd>
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
              <IratokLista iratok={dossier.irat} canEdit={canEdit} users={users || []} />
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
