import { IdpListCard } from "@/components/hr/idp/idp-list-card"
import { getDevelopmentPlansByEmployee } from "@/app/hr/actions/idp-actions"
import { IdpPlanDialog } from "@/components/hr/idp/idp-plan-dialog"

export async function IDPTab({ dolgozoId, isManagerView = true }: { dolgozoId: string, isManagerView?: boolean }) {
  const tervek = await getDevelopmentPlansByEmployee(dolgozoId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Egyéni Fejlesztési Tervek (IDP)</h2>
          <p className="text-sm text-muted-foreground">
            A munkavállaló karrierfejlesztési céljai, képzései és kompetenciafejlesztési tervei.
          </p>
        </div>
        {isManagerView && tervek.length > 0 && (
          <IdpPlanDialog dolgozoId={dolgozoId} buttonVariant="default" buttonText="Új Terv" />
        )}
      </div>

      {tervek.length === 0 ? (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <h3 className="text-lg font-semibold mb-2">Nincs rögzített IDP</h3>
          <p className="text-muted-foreground mb-4">A dolgozónak még nincsenek egyéni fejlesztési tervei.</p>
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
