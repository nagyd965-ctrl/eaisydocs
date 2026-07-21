import { Skeleton } from "@/components/ui/skeleton"

export function ContentSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <Skeleton className="h-8 w-[250px] mb-2" />
          <Skeleton className="h-4 w-[400px]" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Search bar and filters row skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[300px]" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="rounded-md border">
          <div className="border-b px-4 py-3 flex space-x-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="px-4 py-4 flex space-x-4 border-b last:border-0">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/4" />
              <div className="w-1/4 flex justify-end">
                 <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
