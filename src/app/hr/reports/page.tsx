import { ReportsTabs } from "@/components/hr/reports-tabs"
import { ShieldAlert } from "lucide-react"

export default function HrReportsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Riportok (KSH / NAV)</h1>
          <p className="text-muted-foreground mt-1">
            Törvényi kötelezettségek, adatszolgáltatási exportok és beküldött bevallások archívuma.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-3 py-1.5 rounded-full text-sm font-medium">
          <ShieldAlert className="w-4 h-4" />
          Szigorú Adatvédelmi Zóna
        </div>
      </div>

      <ReportsTabs />
    </div>
  )
}
