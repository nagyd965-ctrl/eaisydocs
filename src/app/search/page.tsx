import { Suspense } from "react"
import { SearchClientPage } from "./search-client"

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground text-sm">Kereső betöltése...</div>}>
      <SearchClientPage />
    </Suspense>
  )
}
