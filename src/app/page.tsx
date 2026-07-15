import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, FileText, Inbox, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
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
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="text-sm font-medium">Bérleti szerződés ellenőrzése</p>
                  <p className="text-xs text-muted-foreground">PENZUGY/2026/00042-1</p>
                </div>
                <div className="text-xs font-semibold text-warning-foreground">Ma lejár</div>
              </div>
              <div className="flex items-center justify-between border-b pb-2 border-transparent">
                <div>
                  <p className="text-sm font-medium">Számla jóváhagyás</p>
                  <p className="text-xs text-muted-foreground">PENZUGY/2026/00089-2</p>
                </div>
                <div className="text-xs text-muted-foreground">Holnap</div>
              </div>
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
              <div className="flex items-center justify-between border-b pb-2 border-transparent">
                <div>
                  <p className="text-sm font-medium text-destructive">Hatósági megkeresés (NAV)</p>
                  <p className="text-xs text-muted-foreground">JOG/2026/00012-1</p>
                </div>
                <div className="text-xs font-semibold text-destructive">Lejárt!</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Érkeztetésre váró */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Új bejövő küldemények</CardTitle>
              <CardDescription>Feldolgozásra váró e-mailek és szkennelt iratok</CardDescription>
            </div>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between border-b pb-2 border-transparent">
                <div>
                  <p className="text-sm font-medium">iktatas@ceged.hu (3 új levél)</p>
                  <p className="text-xs text-muted-foreground">Utolsó: 10 perce</p>
                </div>
                <Link href="/inbox" className="text-xs font-medium text-primary hover:underline">Megnyitás</Link>
              </div>
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
              <div className="flex items-center justify-between border-b pb-2 border-transparent">
                <div>
                  <p className="text-sm font-medium">E/2026/000124 (Szerződés tervezet)</p>
                  <p className="text-xs text-muted-foreground">Kovács Kft.</p>
                </div>
                <Link href="/inbox" className="text-xs font-medium text-primary hover:underline">Iktatás</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
