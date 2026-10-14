import { Skeleton } from "@/components/ui/skeleton"

/**
 * Az áttekintő (dashboard) betöltési váza: cím, üdvözlő sáv, KPI-rács és két tartalomblokk.
 * A rács- és térközosztályok megegyeznek a DashboardOverview-éval, hogy ne legyen elmozdulás.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
      </div>

      {/* Üdvözlő sáv */}
      <Skeleton className="h-[88px] w-full rounded-lg" />

      {/* KPI-rács */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border/70 bg-card p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Tartalomblokkok */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg border border-border/70 bg-card p-4 lg:col-span-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-[240px] w-full" />
        </div>
        <div className="space-y-4 rounded-lg border border-border/70 bg-card p-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
