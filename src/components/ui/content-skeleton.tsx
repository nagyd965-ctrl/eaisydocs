import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Táblázatos oldalak betöltési váza.
 *
 * Alapértelmezetten nincs saját margó, mert a layout adja (p-4 md:p-8), és a legtöbb oldal
 * (iktatókönyv, bejövő sor, partnerek, irattár, feladatok) erre épül. Ha a valódi oldal
 * saját `p-8 pt-6` margót használ (pl. beállítások, szabályok), `padded` legyen igaz,
 * különben a tartalom megérkezésekor az oldal megugrana.
 */
export function ContentSkeleton({ padded = false }: { padded?: boolean }) {
  return (
    <div className={cn("space-y-6", padded && "flex-1 p-8 pt-6")}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[400px] max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="space-y-3">
        {/* Eszköztár váz: kereső + oszlopválasztó + szűrés */}
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-full max-w-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* Táblázat váz */}
        <div className="rounded-md border border-border/50">
          <div className="flex space-x-4 border-b px-4 py-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex space-x-4 border-b px-4 py-4 last:border-0">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/4" />
              <div className="flex w-1/4 justify-end">
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
