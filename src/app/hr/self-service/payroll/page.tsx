import { getMyPayslipsAction } from "@/app/hr/self-service/payroll/actions"
import { MyPayslipsView } from "@/components/hr/my-payslips-view"
import { Receipt, ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MyPayrollSelfServicePage() {
  const res = await getMyPayslipsAction()

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bérpapírjaim & Havi Elszámolások
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Hivatalos havi munkabér elszámolások (Mt. 155. §), nettó kifizetés részletezése és digitális átvételi nyugtázás.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0">
          <ShieldCheck className="w-4 h-4" />
          Hiteles Elektronikus Átvétel
        </div>
      </div>

      <MyPayslipsView initialItems={res.data || []} />
    </div>
  )
}
