import { ReportsTabs } from "@/components/hr/reports-tabs"
import { ShieldAlert } from "lucide-react"

export default function HrReportsPage() {
  return (
    <div className="space-y-6 pb-10">
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
