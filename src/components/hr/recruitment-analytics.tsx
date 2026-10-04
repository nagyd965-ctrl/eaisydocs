import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/kpi-card"

export interface CandidateAnalyticsItem {
  id: string
  statusz: string
  allashirdetes_id?: string | null
  [key: string]: unknown
}

export interface JobAnalyticsItem {
  id: string
  [key: string]: unknown
}

export function RecruitmentAnalytics({ 
  candidates, 
  jobs 
}: { 
  candidates: CandidateAnalyticsItem[]
  jobs: JobAnalyticsItem[] 
}) {
  // Metrikák kiszámítása
  const totalCandidates = candidates.length
  
  // Tölcsér állapotok száma
  const uj = candidates.filter(c => c.statusz === "uj").length
  const eloszurt = candidates.filter(c => c.statusz === "eloszurt").length
  const interju = candidates.filter(c => c.statusz === "interju").length
  const ajanlat = candidates.filter(c => c.statusz === "ajanlat").length
  const elfogadva = candidates.filter(c => c.statusz === "elfogadva").length
  const elutasitva = candidates.filter(c => c.statusz === "elutasitva").length
  
  // Általános jelentkezők (nincs hirdetés) vs Pozícióra jelentkezők
  const generalApplicants = candidates.filter(c => !c.allashirdetes_id).length
  const positionApplicants = totalCandidates - generalApplicants

  // Konverziós ráták
  const interviewRate = totalCandidates > 0 ? Math.round((interju + ajanlat + elfogadva) / totalCandidates * 100) : 0
  const offerAcceptanceRate = (ajanlat + elfogadva) > 0 ? Math.round(elfogadva / (ajanlat + elfogadva) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Fő metrikák – Kanonikus KpiCard Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Összes Jelentkező"
          value={`${totalCandidates} fő`}
          sub={`${generalApplicants} általános, ${positionApplicants} hirdetésre`}
        />
        <KpiCard
          label="Interjúra Jutott"
          value={`${interviewRate}%`}
          sub="A jelentkezők aránya"
        />
        <KpiCard
          label="Felvéve (Elfogadta)"
          value={`${elfogadva} fő`}
          sub={`${offerAcceptanceRate}%-os ajánlat elfogadási arány`}
        />
        <KpiCard
          label="Elutasítva"
          value={`${elutasitva} fő`}
          sub={totalCandidates > 0 ? `${Math.round(elutasitva / totalCandidates * 100)}%-os elutasítási arány` : "0%"}
        />
      </div>

      {/* Tölcsér (Funnel) Vizuális megjelenítése */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Toborzási Tölcsér (Funnel)</CardTitle>
          <CardDescription>Jelentkezők eloszlása a kiválasztási folyamatban</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FunnelBar label="1. Új Jelentkezők" value={uj} total={totalCandidates} color="bg-muted-foreground/30" />
          <FunnelBar label="2. Előszűrtek" value={eloszurt} total={totalCandidates} color="bg-info/70" />
          <FunnelBar label="3. Interjún" value={interju} total={totalCandidates} color="bg-primary/80" />
          <FunnelBar label="4. Ajánlatot kapott" value={ajanlat} total={totalCandidates} color="bg-warning" />
          <FunnelBar label="5. Felvéve" value={elfogadva} total={totalCandidates} color="bg-success" />
        </CardContent>
      </Card>
    </div>
  )
}

function FunnelBar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{value} fő ({Math.round(percentage)}%)</span>
      </div>
      <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500 ease-in-out`} 
          style={{ width: `${Math.max(percentage, 1)}%` }}
        />
      </div>
    </div>
  )
}
