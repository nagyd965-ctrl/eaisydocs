"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, TrendingUp, Target, CalendarOff, Briefcase, FileText } from "lucide-react"

export default function HrReportsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    
    // 1. Dolgozók száma
    const { count: totalEmployees } = await supabase
      .from("felhasznalo_profil")
      .select("*", { count: "exact", head: true })

    // 2. Toborzási adatok
    const { data: candidates } = await supabase
      .from("hr_toborzas")
      .select("statusz")
    
    const recruitmentStats = {
      uj: candidates?.filter(c => c.statusz === 'uj').length || 0,
      interju: candidates?.filter(c => c.statusz === 'interju').length || 0,
      ajanlat: candidates?.filter(c => c.statusz === 'ajanlat').length || 0,
      elutasitva: candidates?.filter(c => c.statusz === 'elutasitva').length || 0,
      total: candidates?.length || 0
    }

    // 3. Szabadságok (Távollétek)
    const { data: leaves } = await supabase
      .from("hr_tavollet")
      .select("statusz")
    
    const leaveStats = {
      jovahagyott: leaves?.filter(l => l.statusz === 'jovahagyott').length || 0,
      folyamatban: leaves?.filter(l => l.statusz === 'jovahagyasra_var').length || 0,
    }

    // 4. KPI Átlagok
    const { data: kpis } = await supabase
      .from("hr_teljesitmeny")
      .select("pontszam")
    
    let kpiAverage = 0
    if (kpis && kpis.length > 0) {
      const sum = kpis.reduce((acc, curr) => acc + (curr.pontszam || 0), 0)
      kpiAverage = Math.round(sum / kpis.length)
    }

    setStats({
      totalEmployees: totalEmployees || 0,
      recruitmentStats,
      leaveStats,
      kpiAverage
    })
    
    setLoading(false)
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Statisztikák betöltése...</div>
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vezetői Riportok (HR Dashboard)</h1>
          <p className="text-muted-foreground mt-1">
            Aggregált, valós idejű statisztikák a szervezet állapotáról.
          </p>
        </div>
      </div>

      {/* Fő metrika kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Aktív Dolgozók</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{stats?.totalEmployees} <span className="text-lg font-normal text-muted-foreground">fő</span></div>
            <p className="text-xs text-muted-foreground mt-1">Jelenleg a rendszerben rögzítve</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Aktív Toborzások</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{stats?.recruitmentStats.total} <span className="text-lg font-normal text-muted-foreground">jelölt</span></div>
            <p className="text-xs text-muted-foreground mt-1">A teljes felvételi tölcsérben</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Szervezeti Teljesítmény</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{stats?.kpiAverage}%</div>
            <p className="text-xs text-muted-foreground mt-1">Átlagos KPI teljesülés</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Szabadságolások</CardTitle>
            <CalendarOff className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{stats?.leaveStats.jovahagyott} <span className="text-lg font-normal text-muted-foreground">aktív</span></div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.leaveStats.folyamatban} db kérelem vár jóváhagyásra</p>
          </CardContent>
        </Card>
      </div>

      {/* Részletes vizualizációk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Toborzási Tölcsér */}
        <Card>
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Toborzási Tölcsér (Funnel)
            </CardTitle>
            <CardDescription>A jelöltek megoszlása a felvételi folyamat szakaszai szerint</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">1. Új Jelentkezők</span>
                <span className="tabular-nums font-semibold">{stats?.recruitmentStats.uj} fő</span>
              </div>
              <Progress value={stats?.recruitmentStats.total > 0 ? (stats?.recruitmentStats.uj / stats?.recruitmentStats.total) * 100 : 0} className="h-2 bg-slate-100 dark:bg-slate-800 [&_[data-slot=progress-indicator]]:bg-slate-400" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-blue-700 dark:text-blue-300">2. Interjú fázis</span>
                <span className="tabular-nums font-semibold">{stats?.recruitmentStats.interju} fő</span>
              </div>
              <Progress value={stats?.recruitmentStats.total > 0 ? (stats?.recruitmentStats.interju / stats?.recruitmentStats.total) * 100 : 0} className="h-2 bg-blue-100 dark:bg-blue-950 [&_[data-slot=progress-indicator]]:bg-blue-500" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-green-700 dark:text-green-300">3. Ajánlat kiadva</span>
                <span className="tabular-nums font-semibold">{stats?.recruitmentStats.ajanlat} fő</span>
              </div>
              <Progress value={stats?.recruitmentStats.total > 0 ? (stats?.recruitmentStats.ajanlat / stats?.recruitmentStats.total) * 100 : 0} className="h-2 bg-green-100 dark:bg-green-950 [&_[data-slot=progress-indicator]]:bg-green-500" />
            </div>

            <div className="space-y-2 pt-4 border-t border-dashed">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-red-700 dark:text-red-300">Elutasítva / Visszalépett</span>
                <span className="tabular-nums font-semibold text-muted-foreground">{stats?.recruitmentStats.elutasitva} fő</span>
              </div>
              <Progress value={stats?.recruitmentStats.total > 0 ? (stats?.recruitmentStats.elutasitva / stats?.recruitmentStats.total) * 100 : 0} className="h-2 bg-red-100 dark:bg-red-950 [&_[data-slot=progress-indicator]]:bg-red-400" />
            </div>
          </CardContent>
        </Card>

        {/* Teljesítmény Mutatók */}
        <Card>
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-4 w-4 text-muted-foreground" />
              Szervezeti Teljesítmény Értékelés
            </CardTitle>
            <CardDescription>A kiírt célkitűzések globális megoszlása</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-[200px] space-y-4">
              <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-8 border-muted">
                {/* Egyszerű vizuális trükk chart helyett */}
                <div 
                  className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-primary border-t-transparent border-r-transparent transform -rotate-45"
                  style={{ opacity: stats?.kpiAverage > 0 ? 1 : 0.2 }}
                ></div>
                <div className="text-center">
                  <div className="text-4xl font-bold tabular-nums text-primary">{stats?.kpiAverage}%</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Célok Átlaga</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-dashed">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-2xl font-semibold tabular-nums text-green-700 dark:text-green-400">
                  {stats?.kpiAverage >= 80 ? "Kiváló" : stats?.kpiAverage >= 50 ? "Jó" : "Fejlesztendő"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Általános megítélés</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-2xl font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                  Éves
                </div>
                <div className="text-xs text-muted-foreground mt-1">Aktuális Értékelési Ciklus</div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
