import { Skeleton } from "@/components/ui/skeleton"

/**
 * A bejövő irat iktatási nézetének váza: teljes magasságú, kétpaneles elrendezés
 * (bal oldalt dokumentum-előnézet, jobb oldalt az iktatási űrlap).
 * A külső méretek megegyeznek a valódi oldaléval (h-[calc(100vh-6rem)]).
 */
export function SplitViewSkeleton() {
  return (
    <div className="h-[calc(100vh-6rem)] overflow-hidden rounded-md border bg-background">
      <div className="flex h-full">
        {/* Dokumentum-előnézet */}
        <div className="flex-1 space-y-3 border-r p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-[calc(100%-3rem)] w-full" />
        </div>

        {/* Iktatási űrlap */}
        <div className="hidden w-[440px] shrink-0 space-y-5 p-4 lg:block">
          <Skeleton className="h-6 w-40" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  )
}
