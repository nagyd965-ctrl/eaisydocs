import { IdpListCard } from "@/components/hr/idp/idp-list-card"
import { getDevelopmentPlansByEmployee } from "@/app/hr/actions/idp-actions"
import { IdpPlanDialog } from "@/components/hr/idp/idp-plan-dialog"
import { KpiCard } from "@/components/kpi-card"

export async function IDPTab({ dolgozoId, isManagerView = true }: { dolgozoId: string, isManagerView?: boolean }) {
  const tervek = await getDevelopmentPlansByEmployee(dolgozoId)

  const allGoals = tervek.flatMap((t: any) => t.celok || t.hr_fejlesztesi_cel || [])
  const totalGoals = allGoals.length
  const inProgressGoals = allGoals.filter((c: any) => c.statusz === "folyamatban" || c.statusz === "nyitott").length
  const pendingApprovalGoals = allGoals.filter((c: any) => c.statusz === "jovahagyasra_var").length
  const completedGoals = allGoals.filter((c: any) => c.statusz === "teljesitve").length

  const activePlansCount = tervek.filter((t: any) => t.statusz !== "lezart").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Egyéni fejlesztési tervek</h2>
          <p className="text-sm text-muted-foreground">
            A munkavállaló karrierfejlesztési céljai, képzései, kompetenciafejlesztése és igazolt képesítései.
          </p>
        </div>
        {isManagerView && tervek.length > 0 && (
          <IdpPlanDialog dolgozoId={dolgozoId} buttonVariant="default" buttonText="Új Terv" />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Összes fejlesztési cél"
          value={`${totalGoals} db`}
          sub={`${activePlansCount} aktív tervben`}
        />
        <KpiCard
          label="Folyamatban"
          value={`${inProgressGoals} db`}
          sub="Aktív felkészülés / képzés"
        />
        <KpiCard
          label="Jóváhagyásra vár"
          value={`${pendingApprovalGoals} db`}
          sub={pendingApprovalGoals > 0 ? "Vezetői igazolásra vár" : "Nincs függő tanúsítvány"}
          highlight={pendingApprovalGoals > 0}
        />
        <KpiCard
          label="Sikeresen teljesítve"
          value={`${completedGoals} db`}
          sub={totalGoals > 0 ? `${Math.round((completedGoals / totalGoals) * 100)}% teljesülési arány` : "0% teljesülési arány"}
        />
      </div>

      {tervek.length === 0 ? (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <h3 className="text-base font-semibold mb-1">Nincs rögzített fejlesztési terv</h3>
          <p className="text-sm text-muted-foreground mb-4">
            A dolgozónak még nincsenek rögzített fejlesztési tervei és képzési célkitűzései.
          </p>
          {isManagerView && (
            <IdpPlanDialog dolgozoId={dolgozoId} buttonVariant="default" buttonText="Első Terv Létrehozása" />
          )}
        </div>
      ) : (
        <IdpListCard tervek={tervek as any} dolgozoId={dolgozoId} isManagerView={isManagerView} />
      )}
    </div>
  )
}

