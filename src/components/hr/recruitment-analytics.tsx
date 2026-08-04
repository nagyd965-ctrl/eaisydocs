"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Target, CheckCircle2, XCircle } from "lucide-react"

export function RecruitmentAnalytics({ candidates, jobs }: { candidates: any[], jobs: any[] }) {
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
      {/* Fő metrikák */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Összes Jelentkező</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCandidates}</div>
            <p className="text-xs text-muted-foreground">
              {generalApplicants} általános, {positionApplicants} hirdetésre
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interjúra jutott</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewRate}%</div>
            <p className="text-xs text-muted-foreground">
              A jelentkezők aránya
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Felvéve (Elfogadta)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{elfogadva}</div>
            <p className="text-xs text-muted-foreground">
              {offerAcceptanceRate}%-os ajánlat elfogadási arány
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Elutasítva</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{elutasitva}</div>
            <p className="text-xs text-muted-foreground">
              {totalCandidates > 0 ? Math.round(elutasitva / totalCandidates * 100) : 0}%-os elutasítási arány
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tölcsér (Funnel) Vizuális megjelenítése egyszerű sávokkal */}
      <Card>
        <CardHeader>
          <CardTitle>Toborzási Tölcsér (Funnel)</CardTitle>
          <CardDescription>Jelentkezők eloszlása a kiválasztási folyamatban</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FunnelBar label="1. Új Jelentkezők" value={uj} total={totalCandidates} color="bg-slate-300" />
          <FunnelBar label="2. Előszűrtek" value={eloszurt} total={totalCandidates} color="bg-blue-300" />
          <FunnelBar label="3. Interjún" value={interju} total={totalCandidates} color="bg-indigo-400" />
          <FunnelBar label="4. Ajánlatot kapott" value={ajanlat} total={totalCandidates} color="bg-purple-400" />
          <FunnelBar label="5. Felvéve" value={elfogadva} total={totalCandidates} color="bg-emerald-500" />
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
        <span className="text-muted-foreground">{value} fő ({Math.round(percentage)}%)</span>
      </div>
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500 ease-in-out`} 
          style={{ width: `${Math.max(percentage, 1)}%` }} // Minimum 1% a láthatóságért
        />
      </div>
    </div>
  )
}
