"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { PieChart as PieChartIcon, TrendingUp } from "lucide-react"

export function DashboardCharts({ kpis, cycles }: { kpis: any[], cycles: any[] }) {
  const calculatePercent = (k: any) => {
    if (k.meroszam_tipusa === "szazalek") return k.aktualis_ertek || 0
    if (k.meroszam_tipusa === "igen_nem") return k.aktualis_ertek === 1 ? 100 : 0
    if (!k.cel_ertek || k.cel_ertek === 0) return 0
    const pct = ((k.aktualis_ertek || 0) / k.cel_ertek) * 100
    return Math.min(Math.round(pct), 100)
  }

  // Megoszlás kiszámolása (Alul-, Közepesen, Jól teljesítő)
  const distribution = {
    "Alulteljesít (0-30%)": 0,
    "Közepes (31-70%)": 0,
    "Kiváló (71-100%)": 0
  }

  kpis.forEach(k => {
    const pct = calculatePercent(k)
    if (pct <= 30) distribution["Alulteljesít (0-30%)"]++
    else if (pct <= 70) distribution["Közepes (31-70%)"]++
    else distribution["Kiváló (71-100%)"]++
  })

  const pieData = [
    { name: "Alulteljesít (0-30%)", value: distribution["Alulteljesít (0-30%)"], color: "hsl(var(--destructive))" },
    { name: "Közepes (31-70%)", value: distribution["Közepes (31-70%)"], color: "hsl(var(--warning))" },
    { name: "Kiváló (71-100%)", value: distribution["Kiváló (71-100%)"], color: "hsl(var(--success))" }
  ].filter(d => d.value > 0)

  // Ciklusonkénti teljesítmény trend
  const cycleData = cycles.map(c => {
    const cycleKpis = kpis.filter(k => k.ciklus_id === c.id)
    if (cycleKpis.length === 0) return { name: c.megnevezes, average: 0, hasData: false }
    
    let total = 0
    cycleKpis.forEach(k => total += calculatePercent(k))
    return { 
      name: c.megnevezes.length > 20 ? c.megnevezes.substring(0, 18) + "..." : c.megnevezes, 
      average: Math.round(total / cycleKpis.length),
      hasData: true
    }
  }).reverse() // Régebbitől az újabb felé

  const hasAnyCycleData = cycleData.some(c => c.hasData)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Teljesítmény Megoszlás</CardTitle>
          <CardDescription>A rögzített célkitűzések teljesülési aránya (Összes ciklus)</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  isAnimationActive={false}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <PieChartIcon className="w-10 h-10 mb-2 opacity-25" />
              <p className="text-sm font-medium text-foreground">Nincs még megjeleníthető adat</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                A megoszlás a célok rögzítése és a teljesülési értékek frissítése után jelenik meg.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ciklusonkénti Átlagos Teljesítmény</CardTitle>
          <CardDescription>Trend az elmúlt értékelési időszakok során</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {hasAnyCycleData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip 
                  formatter={(value: any) => [`${value}%`, 'Átlagos teljesítmény']} 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                />
                <Bar dataKey="average" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {cycleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <TrendingUp className="w-10 h-10 mb-2 opacity-25" />
              <p className="text-sm font-medium text-foreground">Nincs még ciklusonkénti trend</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                A periódusok közötti összehasonlító trend a célok kiértékelésével és lezárásával épül fel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
