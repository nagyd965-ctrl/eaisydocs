import { Skeleton } from "@/components/ui/skeleton"

/**
 * Részletező oldalak (ügyirat, bejövő irat, partner) betöltési váza:
 * fejléc visszagombbal és műveletekkel, fülsor, metaadat-rács és tartalomkártya.
 */
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-[220px]" />
            <Skeleton className="h-4 w-[320px] max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      {/* Fülsor */}
      <div className="flex items-center gap-2">
        {[88, 80, 104, 64, 120].map((w, i) => (
          <Skeleton key={i} className="h-8" style={{ width: w }} />
        ))}
      </div>

      {/* Metaadat-rács */}
      <div className="grid grid-cols-2 divide-x divide-y divide-border/50 rounded-lg border border-border/50 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>

      {/* Tartalomkártya */}
      <div className="space-y-4 rounded-lg border border-border/50 p-4">
        <Skeleton className="h-5 w-40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
