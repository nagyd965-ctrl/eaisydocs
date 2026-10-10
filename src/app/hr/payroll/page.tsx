import { getPayrollDashboardData } from "@/app/hr/payroll/actions"
import { PayrollTable } from "@/components/hr/payroll-table"
import { ShieldCheck, Receipt } from "lucide-react"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export const dynamic = "force-dynamic"

export default async function HrPayrollPage() {
  const { companyScope } = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "berugyi", "auditor"])

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed

  const res = await getPayrollDashboardData(year, month, companyScope)

  if (!res.data) {
    return (
      <div key={companyScope} className="p-8 text-center text-muted-foreground">
        Hiba a bérszámfejtési adatok betöltésekor: {res.error}
      </div>
    )
  }

  return (
    <div key={companyScope} className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bérszámfejtés & Bérpapírok (Mt. 155. §)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Havi kötelező törvényes munkabér elszámolások kötegelt előállítása, adókedvezmények kezelése és dolgozói digitális átvételi nyugtázás.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0">
          <ShieldCheck className="w-4 h-4" />
          Mt. 155. § Törvényes Bérjegyzék
        </div>
      </div>

      <PayrollTable initialData={res.data} />
    </div>
  )
}
