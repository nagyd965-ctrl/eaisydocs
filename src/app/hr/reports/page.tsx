import { ReportsTabs } from "@/components/hr/reports-tabs"
import { ShieldAlert, Shield } from "lucide-react"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export default async function HrReportsPage() {
  const auth = await requireHrAuthServer(["hr_vezeto", "admin", "konyvelo", "auditor"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Nincs jogosultságod a riportok és adatszolgáltatások megtekintéséhez a kiválasztott cégnél.</p>
        </div>
      </div>
    )
  }

  const { activeCompanyId } = auth

  return (
    <div key={activeCompanyId} className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Riportok</h1>
          <p className="text-muted-foreground mt-1">
            Törvényi kötelezettségek, adatszolgáltatási exportok és beküldött bevallások archívuma.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-warning/10 text-warning px-3 py-1.5 rounded-full text-sm font-medium">
          <ShieldAlert className="w-4 h-4" />
          Szigorú Adatvédelmi Zóna
        </div>
      </div>

      <ReportsTabs />
    </div>
  )
}
