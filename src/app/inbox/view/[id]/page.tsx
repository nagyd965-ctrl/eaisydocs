import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ArrowLeft, User, Eye, Mail, FileText, CheckCircle } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AttachmentViewerClient } from "@/components/attachment-viewer-client"
import { ReplyDialogClient } from "@/components/reply-dialog-client"
import { Timeline, TimelineEvent } from "@/components/timeline"

export default async function DocumentDetailedView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Irat lekérdezése
  const { data: irat } = await supabase
    .from("irat")
    .select(`
      id,
      erkeztetoszam,
      erkezes_datuma,
      targy,
      erkezes_modja,
      leiras,
      partner ( nev, email )
    `)
    .eq("id", resolvedParams.id)
    .single()

  if (!irat) {
    notFound()
  }

  // 2. Fájlok lekérdezése
  const { data: fajlok } = await supabase
    .from("irat_fajl")
    .select("id, eredeti_fajlnev, meret_byte")
    .eq("irat_id", resolvedParams.id)

  // 3. Felhasználók lekérése a nevekhez
  const { data: users } = await supabase.from("felhasznalo_profil").select("id, nev");
  const userMap: Record<string, string> = {};
  if (users) {
    users.forEach(u => {
      userMap[u.id] = u.nev || "Ismeretlen név";
    });
  }

  // 4. Eseménynapló lekérése
  const { data: logs } = await supabase
    .from("esemeny_naplo")
    .select("*")
    .eq("entitas_id", resolvedParams.id)
    .order("tortent", { ascending: true })

  // Eseménynapló formázása az Idővonalhoz
  const timelineEvents: TimelineEvent[] = (logs || []).map((log: any) => {
    let title = "Tevékenység";
    let description = log.indoklas || log.uj_ertek?.megjegyzes || "";
    let icon = Eye;
    let color = "text-muted-foreground";
    let details = undefined;

    if (log.esemeny_tipus === "modositva") {
      if (log.indoklas && log.indoklas.includes("Válasz e-mail elküldve")) {
        title = "Levélküldés";
        icon = Mail;
        color = "text-primary";
        
        const lines = log.indoklas.split('\n');
        description = lines[0];
        if (lines.length > 1) {
          details = lines.slice(1).join('\n').trim();
        }
      } else {
        title = "Módosítás történt";
        description = log.indoklas || log.reszletek || "A rendszer rögzítette a változtatást.";
        icon = FileText;
        color = "text-info";
      }
    } else if (log.esemeny_tipus === "erkeztetve") {
      title = "Irat érkeztetve";
      icon = CheckCircle;
      color = "text-success";
    }

    return {
      id: log.id,
      title,
      description,
      time: new Date(log.tortent).toLocaleString("hu-HU"),
      user: log.user_id ? (userMap[log.user_id] || "Ismeretlen") : "Rendszer",
      icon,
      color,
      details,
    }
  });

  const partner = irat.partner as any
  const senderName = partner?.nev || "Ismeretlen feladó"
  const senderEmail = partner?.email || ""

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Fejléc */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inbox" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              {irat.targy}
              <Badge variant="outline">{irat.erkeztetoszam}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Érkezett: {new Date(irat.erkezes_datuma).toLocaleString("hu-HU")} 
              {' • '}<span className="capitalize">{irat.erkezes_modja}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Válasz gomb mindig látszik, legfeljebb üres az email */}
          <ReplyDialogClient toEmail={senderEmail} originalSubject={irat.targy} iratId={irat.id} />
          
          <Link href={`/inbox/${irat.id}`} className={buttonVariants({ variant: "outline" })}>
            Tovább az Iktatáshoz
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bal oldal - Tartalom */}
        <div className="md:col-span-2 space-y-6">
          <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{senderName}</p>
                  {senderEmail && <p className="text-xs text-muted-foreground">{senderEmail}</p>}
                </div>
              </div>
            </div>
            <div className="p-6 whitespace-pre-wrap text-sm leading-relaxed min-h-[300px]">
              {irat.leiras || <span className="text-muted-foreground italic">Nincs szöveges tartalom...</span>}
            </div>
          </div>
        </div>

        {/* Jobb oldal - Csatolmányok */}
        <div className="space-y-6">
          <AttachmentViewerClient iratId={resolvedParams.id} fajlok={fajlok || []} />
        </div>
      </div>
      
      {/* Alsó sáv - Idővonal / Napló */}
      <div className="mt-8 border rounded-lg bg-card text-card-foreground shadow-sm p-6">
        <h3 className="text-lg font-medium mb-6">Eseménynapló</h3>
        {timelineEvents.length > 0 ? (
          <Timeline events={timelineEvents} />
        ) : (
          <p className="text-sm text-muted-foreground italic">Még nem történt naplózott esemény ezzel az irattal.</p>
        )}
      </div>
    </div>
  )
}
