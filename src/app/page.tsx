import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, FileText, Inbox, CheckCircle2, ArrowRight, FolderOpen, AlertTriangle, CalendarDays } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { getPermissions } from "@/utils/permissions"

function getDeadlineText(dateString: string | null) {
  if (!dateString) return { text: "Nincs határidő", color: "text-muted-foreground" }
  
  const deadline = new Date(dateString)
  deadline.setHours(0, 0, 0, 0)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diffTime = deadline.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return { text: "Lejárt!", color: "text-destructive font-semibold" }
  if (diffDays === 0) return { text: "Ma lejár", color: "text-warning font-semibold" }
  if (diffDays === 1) return { text: "Holnap", color: "text-warning" }
  return { text: `${diffDays} nap múlva`, color: "text-muted-foreground" }
}

function timeAgo(dateString: string | null) {
  if (!dateString) return ""
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) return `${diffMins} perce`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} órája`
  return `${Math.floor(diffHours / 24)} napja`
}

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: authUser } = await supabase.auth.getUser()

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select('nev, docs_szerepkor')
    .eq("id", authUser?.user?.id || "")
    .single()

  const permissions = getPermissions(userProfile?.docs_szerepkor)
  const userId = authUser?.user?.id
  const userName = userProfile?.nev || "Felhasználó"

  // --- KPI Számok ---
  // Bejövő iratok (nem iktatottak)
  const { count: inboxCount } = await supabase
    .from("irat")
    .select("id", { count: "exact", head: true })
    .eq("irany", "bejovo")
    .is("ugyirat_id", null)

  // Lejáró határidők (3 napon belül)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(today.getDate() + 3)

  let expiringCountQuery = supabase
    .from("ugyirat")
    .select(`id, ugy!inner(hatarido, felelos_user_id)`, { count: "exact" })
    .not("statusz", "in", '("lezart","irattarban","selejtezheto")')
    .lte("ugy.hatarido", threeDaysFromNow.toISOString().split('T')[0])

  if (!permissions.canAssign) {
    expiringCountQuery = expiringCountQuery.eq("ugy.felelos_user_id", userId || "")
  }
  const { data: expiringData } = await expiringCountQuery
  const expiringCount = expiringData?.length || 0

  // Iktatásra váró (érkeztetett de nem iktatott)
  const { count: pendingFilingCount } = await supabase
    .from("irat")
    .select("id", { count: "exact", head: true })
    .eq("irany", "bejovo")
    .is("ugyirat_id", null)
    .not("erkeztetoszam", "is", null)

  // Aktív ügyiratok
  const { count: activeDossierCount } = await supabase
    .from("ugyirat")
    .select("id", { count: "exact", head: true })
    .not("statusz", "in", '("lezart","irattarban","selejtezheto")')

  // --- Lista adatok ---
  // 1. Saját feladataim
  const { data: rawTasks } = await supabase
    .from("ugyirat")
    .select(`
      id, 
      iktatoszam, 
      ugy!inner(id, targy, hatarido, felelos_user_id)
    `)
    .not("statusz", "in", '("lezart","irattarban","selejtezheto")')
    .eq("ugy.felelos_user_id", userId || "")

  const myTasks = (rawTasks || [])
    .sort((a, b) => {
      const aDate = (a.ugy as any)?.hatarido ? new Date((a.ugy as any).hatarido).getTime() : Infinity
      const bDate = (b.ugy as any)?.hatarido ? new Date((b.ugy as any).hatarido).getTime() : Infinity
      return aDate - bDate
    })
    .slice(0, 5)

  // 2. Lejáró határidők
  let expiringQuery = supabase
    .from("ugyirat")
    .select(`
      id, 
      iktatoszam, 
      ugy!inner(id, targy, hatarido, felelos_user_id)
    `)
    .not("statusz", "in", '("lezart","irattarban","selejtezheto")')

  if (!permissions.canAssign) {
    expiringQuery = expiringQuery.eq("ugy.felelos_user_id", userId || "")
  }

  const { data: rawExpiring } = await expiringQuery

  const expiringDossiers = (rawExpiring || [])
    .filter(d => {
      if (!(d.ugy as any)?.hatarido) return false
      const deadline = new Date((d.ugy as any).hatarido)
      deadline.setHours(0, 0, 0, 0)
      return deadline <= threeDaysFromNow
    })
    .sort((a, b) => new Date((a.ugy as any).hatarido).getTime() - new Date((b.ugy as any).hatarido).getTime())
    .slice(0, 5)

  // 3. Új bejövő küldemények
  const { data: inboxItems } = await supabase
    .from("irat")
    .select("id, erkezes_datuma, erkeztetoszam, targy, partner(nev)")
    .eq("irany", "bejovo")
    .is("ugyirat_id", null)
    .order("erkezes_datuma", { ascending: false })
    .limit(5)

  // 4. Iktatási elmaradások
  const { data: filingItems } = await supabase
    .from("irat")
    .select("id, erkezes_datuma, erkeztetoszam, targy, partner(nev)")
    .eq("irany", "bejovo")
    .is("ugyirat_id", null)
    .not("erkeztetoszam", "is", null)
    .order("erkezes_datuma", { ascending: true })
    .limit(5)

  // Dátum formázás
  const todayFormatted = new Date().toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  })

  const kpiCards = [
    { label: "Bejövő irat", value: inboxCount || 0, color: "text-primary", borderColor: "border-l-primary", icon: Inbox },
    { label: "Lejáró határidő", value: expiringCount, color: "text-warning", borderColor: "border-l-warning", icon: AlertTriangle },
    { label: "Iktatásra váró", value: pendingFilingCount || 0, color: "text-info", borderColor: "border-l-info", icon: Clock },
    { label: "Iktatott ügyirat", value: activeDossierCount || 0, color: "text-success", borderColor: "border-l-success", icon: FolderOpen },
  ]

  return (
    <div className="page-animate space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Áttekintés</h1>
        <p className="text-muted-foreground">Üdvözlünk az eaisyDocs iratkezelő rendszerben. Íme a legfrissebb teendőid.</p>
      </div>

      {/* Üdvözlő Banner — eaisyHR stílusú, kitöltött teal háttér */}
      <div className="relative overflow-hidden rounded-lg bg-primary p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-primary-foreground">
              Üdvözlünk, {userName}!
            </h2>
            <p className="text-sm text-primary-foreground/70">Jó munkát kívánunk a mai napra!</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <CalendarDays className="h-4 w-4" />
            <span className="capitalize">{todayFormatted}</span>
          </div>
        </div>
      </div>

      {/* KPI Statisztika Sáv — eaisyHR stílusú, bal oldali színes border */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className={`border border-border/50 border-l-[3px] ${kpi.borderColor}`}>
            <CardContent className="p-5">
              <p className={`text-3xl font-semibold tabular-nums ${kpi.color}`}>{kpi.value}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tartalmi Kártyák — 2x2 Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* Saját feladataim */}
        <Card className="flex flex-col border border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Saját feladataim</CardTitle>
              <CardDescription className="text-xs">Rád szignált, nyitott feladatok</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-0">
            {(!myTasks || myTasks.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-xl bg-muted/50 p-3 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Jelenleg nincs rád szignált nyitott feladat.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {myTasks.map(task => {
                  const deadlineInfo = getDeadlineText((task.ugy as any)?.hatarido)
                  return (
                    <Link key={task.id} href={`/dossiers/${task.id}`}
                      className="group flex items-center justify-between py-3 px-2 -mx-2 rounded-md transition-colors hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {(task.ugy as any)?.targy || "Nincs tárgy"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.iktatoszam}</p>
                      </div>
                      <span className={`ml-4 shrink-0 text-xs ${deadlineInfo.color}`}>{deadlineInfo.text}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
          {myTasks && myTasks.length > 0 && (
            <div className="border-t px-6 py-3">
              <Link href="/tasks" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Összes megtekintése <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </Card>

        {/* Lejáró határidők */}
        <Card className="flex flex-col border border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
            <div className="rounded-lg bg-warning/10 p-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Lejáró határidők</CardTitle>
              <CardDescription className="text-xs">Sürgős figyelmet igénylő ügyek</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-0">
            {(!expiringDossiers || expiringDossiers.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-xl bg-muted/50 p-3 mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Nincsenek lejáró ügyek a látókörödben.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {expiringDossiers.map(d => (
                  <Link key={d.id} href={`/dossiers/${d.id}`}
                    className="group flex items-center justify-between py-3 px-2 -mx-2 rounded-md transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {(d.ugy as any)?.targy || "Névtelen ügyirat"}
                      </p>
                      <p className="text-xs text-destructive font-medium mt-0.5">
                        Határidő: {new Date((d.ugy as any).hatarido).toLocaleDateString("hu-HU")}
                      </p>
                    </div>
                    <ArrowRight className="ml-4 h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          {expiringDossiers && expiringDossiers.length > 0 && (
            <div className="border-t px-6 py-3">
              <Link href="/dossiers" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Összes megtekintése <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </Card>

        {/* Új bejövő küldemények */}
        <Card className="flex flex-col border border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Inbox className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Új bejövő küldemények</CardTitle>
              <CardDescription className="text-xs">A legfrissebb beérkezett e-mailek és postai iratok</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-0">
            {(!inboxItems || inboxItems.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-xl bg-muted/50 p-3 mb-3">
                  <Inbox className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Nincs új bejövő küldemény.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {inboxItems.map(item => (
                  <Link key={item.id} href="/inbox"
                    className="group flex items-center justify-between py-3 px-2 -mx-2 rounded-md transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {item.erkeztetoszam ? `${item.erkeztetoszam}` : ""} {item.targy || "Névtelen levél"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(item.partner as any)?.nev || "Ismeretlen feladó"} · {timeAgo(item.erkezes_datuma)}
                      </p>
                    </div>
                    <span className="ml-4 shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {item.erkeztetoszam ? "Iktatás" : "Érkeztetés"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          {inboxItems && inboxItems.length > 0 && (
            <div className="border-t px-6 py-3">
              <Link href="/inbox" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Összes megtekintése <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </Card>

        {/* Iktatási elmaradások */}
        <Card className="flex flex-col border border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
            <div className="rounded-lg bg-info/10 p-2">
              <FileText className="h-4 w-4 text-info" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Iktatási elmaradások</CardTitle>
              <CardDescription className="text-xs">A legrégebbi, ügyhöz még nem rendelt iratok</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-0">
            {(!filingItems || filingItems.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-xl bg-muted/50 p-3 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-success/50" />
                </div>
                <p className="text-sm text-muted-foreground">Minden irat sikeresen le lett iktatva.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filingItems.map(item => (
                  <Link key={item.id} href="/inbox"
                    className="group flex items-center justify-between py-3 px-2 -mx-2 rounded-md transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {item.erkeztetoszam} — {item.targy || "Nincs tárgy"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(item.partner as any)?.nev || "Ismeretlen feladó"}
                      </p>
                    </div>
                    <span className="ml-4 shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      Iktatás
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          {filingItems && filingItems.length > 0 && (
            <div className="border-t px-6 py-3">
              <Link href="/inbox" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Összes megtekintése <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
