import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ArrowLeft, User, FileText, Calendar } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AttachmentViewerClient } from "@/components/attachment-viewer-client"
import { ReplyDialogClient } from "@/components/reply-dialog-client"
import { TimelineEvent, TimelineIconName } from "@/components/timeline"
import { AntecedentSuggestionCard } from "@/components/antecedent-suggestion-card"
import { CollapsibleEventLog } from "@/components/collapsible-event-log"
import { findAntecedentSuggestion } from "@/utils/antecedent-matcher"

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
      kulso_forras,
      leiras,
      ugyirat_id,
      alszam,
      ugyirat ( iktatoszam ),
      partner ( nev, email )
    `)
    .eq("id", resolvedParams.id)
    .single()

  if (!irat) {
    notFound()
  }

  // 1b. Előzmény-ügyirat javaslat kiszámítása
  const antecedentSuggestion = await findAntecedentSuggestion(resolvedParams.id, supabase)

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
  // Kiszűrjük a tisztán technikai (rendszer által végzett, megjegyzés nélküli) frissítéseket
  const filteredLogs = (logs || []).filter((log: any) => {
    if (log.esemeny_tipus === "modositva" && !log.indoklas && (!log.uj_ertek || !log.uj_ertek.megjegyzes)) {
      return false; // Ne jelenjen meg a felületen a technikai zaj
    }
    return true;
  });

  const timelineEvents: TimelineEvent[] = filteredLogs.map((log: any) => {
    let title = "Tevékenység";
    let description = log.indoklas || log.uj_ertek?.megjegyzes || "";
    let icon: TimelineIconName = "eye";
    let color = "text-muted-foreground";
    let details: string | undefined = undefined;

    if (log.esemeny_tipus === "modositva") {
      if (log.indoklas && log.indoklas.includes("Válasz e-mail elküldve")) {
        title = "Levélküldés";
        icon = "mail";
        color = "text-primary";
        
        const lines = log.indoklas.split('\n');
        description = lines[0];
        if (lines.length > 1) {
          details = lines.slice(1).join('\n').trim();
        }
      } else {
        title = "Módosítás történt";
        if (!description) {
           if (log.uj_ertek && log.uj_ertek.megjegyzes) {
             description = log.uj_ertek.megjegyzes;
           } else {
             description = "Automatikus háttéradat-frissítés (pl. OCR vagy keresőmotor indexelés).";
           }
        }
        icon = "file-text";
        color = "text-info";
      }
    } else if (log.esemeny_tipus === "erkeztetve") {
      title = "Irat érkeztetve";
      description = description || "Új bejövő irat regisztrálva a rendszerben.";
      icon = "check-circle";
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
    <div className="page-animate space-y-6 pb-12">
      {/* Fejléc — bal oldalra igazított, teljes szélességű */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link href="/inbox" className={`${buttonVariants({ variant: "ghost", size: "icon" })} mt-0.5 shrink-0`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 flex-wrap break-words">
              <span className="break-words">{irat.targy}</span>
              <Badge variant="outline" className="font-mono text-xs shrink-0">{irat.erkeztetoszam}</Badge>
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>
                {new Date(irat.erkezes_datuma).toLocaleString("hu-HU")}
              </span>
              <span>•</span>
              <Badge variant="secondary" className="font-normal text-xs">
                {(irat as any).kulso_forras === "eaisybill"
                  ? "eaisyBill"
                  : (irat.erkezes_modja ? irat.erkezes_modja.charAt(0).toUpperCase() + irat.erkezes_modja.slice(1) : "-")}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {(irat as any).erkezes_modja === "email" && (
            <ReplyDialogClient toEmail={senderEmail} originalSubject={irat.targy} iratId={irat.id} partnerNev={senderName} />
          )}
          <Link href={`/inbox/${irat.id}`} className={buttonVariants({ variant: "outline" })}>
            Tovább az Iktatáshoz
          </Link>
        </div>
      </div>

      {/* Automatikus előzmény-ügyirat javaslat kártya */}
      <AntecedentSuggestionCard
        iratId={resolvedParams.id}
        suggestion={antecedentSuggestion}
        currentUgyiratId={irat.ugyirat_id}
        currentIktatoszam={(irat.ugyirat as any)?.iktatoszam}
        currentAlszam={irat.alszam}
      />

      {/* Tartalom grid — csak emailnél és ha van szöveg */}
      {(irat as any).erkezes_modja === "email" && irat.leiras ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bal oldal - Email tartalom kártya */}
          <div className="lg:col-span-2">
            <Card className="border border-border/50">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b py-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{senderName}</p>
                  {senderEmail && (
                    <p className="text-xs text-muted-foreground truncate">{senderEmail}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {irat.leiras}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Jobb oldal - Csatolmányok */}
          <div>
            <AttachmentViewerClient iratId={resolvedParams.id} fajlok={fajlok || []} />
          </div>
        </div>
      ) : (
        // Nem email, vagy nincs szöveg: csatolmányok teljes szélességben
        <AttachmentViewerClient iratId={resolvedParams.id} fajlok={fajlok || []} />
      )}
      
      {/* Eseménynapló – összecsukható */}
      <CollapsibleEventLog events={timelineEvents} />
    </div>
  )
}
