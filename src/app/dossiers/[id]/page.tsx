import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, Users, ArrowLeft, FolderPlus, Eye, Lock, Edit, Trash2 } from "lucide-react"
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

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dossier } = await supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      szervezeti_egyseg_id,
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
          sha256
        ),
        irat_fizikai_hely ( doboz, polc ),
        irat_kolcsonzes_naplo ( id, kinek_user_id, varhato_visszahozatal, statusz )
      )
    `)
    .eq("id", id)
    .single();

  const { data: users } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev, szerepkor, szervezeti_egyseg_id")

  // Current user role check
  const { data: authUser } = await supabase.auth.getUser()
  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select("szerepkor")
    .eq("id", authUser?.user?.id || "")
    .single()
  
  const permissions = getPermissions(currentUserProfile?.szerepkor)
  const canAssign = permissions.canAssign
  const canEdit = permissions.canEdit

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
    user_email: c.user_id, // temporarily using id if no email is found, but we can query profile
    user_name: userMap[c.user_id] || "Ismeretlen"
  }))

  const timelineEvents: TimelineEvent[] = (logs || []).map((log: any) => {
    let title = log.esemeny_tipus;
    let description = "";
    let icon = Eye;
    let color = "text-muted-foreground";

    if (log.esemeny_tipus === "iktatva") {
      title = "Ügyirat iktatva";
      description = `Iktatószám kiosztva: ${log.uj_ertek?.iktatoszam || "-"}`;
      icon = FolderPlus;
      color = "text-primary";
    } else if (log.esemeny_tipus === "szignalva" || log.esemeny_tipus === "hozzaferes_modositas" || log.esemeny_tipus === "modositva") {
      title = "Ügyirat módosítva";
      description = log.reszletek || log.uj_ertek?.megjegyzes || "";
      icon = Users;
      color = "text-warning";
    } else if (log.esemeny_tipus === "lezarva") {
      title = "Ügyirat lezárva";
      description = log.reszletek || "Az ügyirat véglegesen lezárásra került.";
      icon = Lock;
      color = "text-success";
    } else if (log.esemeny_tipus === "modositva") {
      title = "Módosítás történt";
      description = log.indoklas || log.reszletek || "A rendszer rögzítette a változtatást.";
      icon = Edit;
      color = "text-info";
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
    }
  });

  const ugy = dossier.ugy as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" render={<Link href="/dossiers" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-semibold tracking-tight">{dossier.iktatoszam}</h1>
            <StatusBadge status={dossier.statusz} />
          </div>
          <p className="text-muted-foreground">{ugy?.targy}</p>
        </div>
      </div>

      {permissions.canEdit && dossier.statusz !== "lezart" && dossier.statusz !== "irattarban" && dossier.statusz !== "selejtezheto" && (
        <div className="flex justify-end">
          <CloseDossierButton ugyiratId={dossier.id} />
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Áttekintés</TabsTrigger>
          <TabsTrigger value="documents">Iratok</TabsTrigger>
          <TabsTrigger value="tasks">Feladatok</TabsTrigger>
          <TabsTrigger value="history">Napló</TabsTrigger>
          <TabsTrigger value="links">Külső Kapcsolatok</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Felelős</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  <AssignDossierDialog 
                    ugyirat_id={dossier.id} 
                    ugy_id={(dossier.ugy as any)?.id} 
                    szervezeti_egyseg_id={dossier.szervezeti_egyseg_id || null}
                    users={users || []}
                    currentFelelosId={(dossier.ugy as any)?.felelos_user_id}
                    currentHatarido={(dossier.ugy as any)?.hatarido}
                    canAssign={canAssign}
                  >
                    <span className={canAssign ? "cursor-pointer hover:underline" : ""}>
                      {((dossier.ugy as any)?.felelos_user as any)?.full_name || "Kiosztatlan"}
                    </span>
                  </AssignDossierDialog>
                </div>
                <p className="text-xs text-muted-foreground">-</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Határidő</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-warning">{ugy?.hatarido || "-"}</div>
                <p className="text-xs text-muted-foreground">-</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Minősítés</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">Nyílt</div>
                <p className="text-xs text-muted-foreground">Mindenki láthatja</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Iratok és Fájlok</CardTitle>
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
            ugyId={(dossier.ugy as any)?.id}
            status={dossier.statusz}
            comments={mappedComments}
            tasks={tasks || []}
            users={users || []}
            canEdit={canEdit}
            currentUserEmail={authUser?.user?.email || ""}
          />
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Eseménynapló</CardTitle>
              <CardDescription>Minden módosítás és megtekintés auditált naplója.</CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline events={timelineEvents} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle>Kapcsolódó Rendszerek</CardTitle>
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
