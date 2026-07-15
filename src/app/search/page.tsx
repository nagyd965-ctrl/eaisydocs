import { SearchClientPage } from "./search-client"

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Kereső</h1>
        <p className="text-muted-foreground">Globális metaadat és szabadszavas szöveges kereső.</p>
      </div>
      <SearchClientPage />
    </div>
  )
}
