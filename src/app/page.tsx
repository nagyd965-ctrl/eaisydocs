import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, FileText, Inbox, CheckCircle2 } from "lucide-react"
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
  if (diffDays === 1) return { text: "Holnap", color: "text-muted-foreground" }
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
    .select('docs_szerepkor')
    .eq("id", authUser?.user?.id || "")
    .single()

  const permissions = getPermissions(userProfile?.docs_szerepkor)
  const userId = authUser?.user?.id

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
    // If not a manager, only see own expiring tasks
    expiringQuery = expiringQuery.eq("ugy.felelos_user_id", userId || "")
  }

  const { data: rawExpiring } = await expiringQuery

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(today.getDate() + 3)

  const expiringDossiers = (rawExpiring || [])
    .filter(d => {
      if (!(d.ugy as any)?.hatarido) return false
      const deadline = new Date((d.ugy as any).hatarido)
      deadline.setHours(0, 0, 0, 0)
      return deadline <= threeDaysFromNow
    })
    .sort((a, b) => new Date((a.ugy as any).hatarido).getTime() - new Date((b.ugy as any).hatarido).getTime())
    .slice(0, 5)

  // 3. Új bejövő küldemények (Nincs érkeztetve)
  const { data: inboxItems } = await supabase
    .from("irat")
    .select("id, erkezes_datuma, targy, partner(nev)")
    .eq("irany", "bejovo")
    .is("ugyirat_id", null)
    .is("erkeztetoszam", null)
    .order("erkezes_datuma", { ascending: false })
    .limit(5)

  // 4. Iktatásra váró iratok (Érkeztetve, de nincs iktatva)
  const { data: filingItems } = await supabase
    .from("irat")
    .select("id, erkezes_datuma, erkeztetoszam, targy, partner(nev)")
    .eq("irany", "bejovo")
    .is("ugyirat_id", null)
    .not("erkeztetoszam", "is", null)
    .order("erkezes_datuma", { ascending: true }) // Oldest first for filing
    .limit(5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Áttekintés</h1>
        <p className="text-muted-foreground">Üdvözlünk az eaisyDocs iratkezelő rendszerben. Íme a legfrissebb teendőid.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Saját feladataim */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Saját feladataim</CardTitle>
              <CardDescription>Rád szignált, nyitott feladatok</CardDescription>
            </div>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {myTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Jelenleg nincs rád szignált nyitott feladat.</p>
              ) : (
                myTasks.map(task => {
                  const deadlineInfo = getDeadlineText((task.ugy as any)?.hatarido)
                  return (
                    <div key={task.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <Link href={`/dossiers/${task.id}`} className="text-sm font-medium hover:underline">
                          {(task.ugy as any)?.targy || "Nincs tárgy"}
                        </Link>
                        <p className="text-xs text-muted-foreground">{task.iktatoszam}</p>
                      </div>
                      <div className={`text-xs ${deadlineInfo.color}`}>{deadlineInfo.text}</div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lejáró határidők */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Lejáró határidők</CardTitle>
              <CardDescription>Sürgős figyelmet igénylő ügyek</CardDescription>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {expiringDossiers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nincsenek lejáró ügyek a látókörödben.</p>
              ) : (
                expiringDossiers.map(dossier => {
                  const deadlineInfo = getDeadlineText((dossier.ugy as any)?.hatarido)
                  return (
                    <div key={dossier.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <Link href={`/dossiers/${dossier.id}`} className="text-sm font-medium hover:underline">
                          {(dossier.ugy as any)?.targy || "Nincs tárgy"}
                        </Link>
                        <p className="text-xs text-muted-foreground">{dossier.iktatoszam}</p>
                      </div>
                      <div className={`text-xs ${deadlineInfo.color}`}>{deadlineInfo.text}</div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Érkeztetésre váró */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Új bejövő küldemények</CardTitle>
              <CardDescription>Feldolgozásra váró e-mailek és postai iratok</CardDescription>
            </div>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {(!inboxItems || inboxItems.length === 0) ? (
                <p className="text-sm text-muted-foreground">Nincs új bejövő küldemény.</p>
              ) : (
                inboxItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{item.targy || "Névtelen levél"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.partner as any)?.nev || "Ismeretlen feladó"} • Utolsó: {timeAgo(item.erkezes_datuma)}
                      </p>
                    </div>
                    <Link href="/inbox" className="text-xs font-medium text-primary hover:underline">Érkeztetés</Link>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Iktatásra váró */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Iktatásra váró iratok</CardTitle>
              <CardDescription>Már érkeztetett, de ügyhöz még nem rendelt iratok</CardDescription>
            </div>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {(!filingItems || filingItems.length === 0) ? (
                <p className="text-sm text-muted-foreground">Minden irat sikeresen le lett iktatva.</p>
              ) : (
                filingItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{item.erkeztetoszam} ({item.targy || "Nincs tárgy"})</p>
                      <p className="text-xs text-muted-foreground">{(item.partner as any)?.nev || "Ismeretlen feladó"}</p>
                    </div>
                    <Link href="/inbox" className="text-xs font-medium text-primary hover:underline">Iktatás</Link>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
