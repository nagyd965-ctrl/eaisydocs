import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, Users, ArrowLeft, FolderPlus, Eye } from "lucide-react"
import Link from "next/link"
import { Timeline, TimelineEvent } from "@/components/timeline"
import { IratokLista } from "@/components/iratok-lista"
import { createClient } from "@/utils/supabase/server"
import { CloseDossierButton } from "@/components/close-dossier-button"
import { PolymorphicLinksTab } from "@/components/polymorphic-links-tab"

function StatusBadge({ status }: { status: string }) {
  if (status === "lezart" || status === "elintezett") return <Badge variant="outline" className="bg-success-subtle text-success border-success-subtle capitalize">{status}</Badge>
  if (status === "ugyintezes_alatt" || status === "iktatva") return <Badge variant="outline" className="bg-info-subtle text-info border-info-subtle capitalize">{status.replace('_', ' ')}</Badge>
  if (status === "szignalt") return <Badge variant="outline" className="bg-warning-subtle text-warning border-warning-subtle capitalize">{status}</Badge>
  return <Badge variant="outline" className="capitalize">{status.replace('_', ' ')}</Badge>
}

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dossier } = await supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      ugy ( targy, hatarido, statusz ),
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
        )
      )
    `)
    .eq("id", id)
    .single();

  if (!dossier) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ügyirat nem található</h2>
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
    .order("tortent", { ascending: false });

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
    }

    return {
      id: log.id,
      title,
      description,
      time: new Date(log.tortent).toLocaleString("hu-HU"),
      user: log.uj_ertek?.user_email || "Ismeretlen",
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

      {dossier.statusz !== "lezart" && dossier.statusz !== "irattarban" && dossier.statusz !== "selejtezheto" && (
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
                <div className="text-2xl font-bold">Kiosztatlan</div>
                <p className="text-xs text-muted-foreground">-</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Határidő</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{ugy?.hatarido || "-"}</div>
                <p className="text-xs text-muted-foreground">-</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Minősítés</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Nyílt</div>
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
              <IratokLista iratok={dossier.irat} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Feladatok</CardTitle>
              <CardDescription>Kiosztott munkafolyamatok és jóváhagyások.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Hamarosan implementálva...</p>
            </CardContent>
          </Card>
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
