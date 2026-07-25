"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"

export function DashboardCharts({ kpis, cycles }: { kpis: any[], cycles: any[] }) {
  const calculatePercent = (k: any) => {
    if (k.meroszam_tipusa === "szazalek") return k.aktualis_ertek
    if (k.meroszam_tipusa === "igen_nem") return k.aktualis_ertek === 1 ? 100 : 0
    if (k.cel_ertek === 0) return 0
    const pct = (k.aktualis_ertek / k.cel_ertek) * 100
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
    if (cycleKpis.length === 0) return { name: c.megnevezes, average: 0 }
    
    let total = 0
    cycleKpis.forEach(k => total += calculatePercent(k))
    return { name: c.megnevezes.substring(0, 15) + "...", average: Math.round(total / cycleKpis.length) }
  }).reverse() // Régebbitől az újabb felé

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <Card>
        <CardHeader>
          <CardTitle>Teljesítmény Megoszlás</CardTitle>
          <CardDescription>A rögzített célkitűzések teljesülési aránya (Összes ciklus)</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Nincs elegendő adat.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ciklusonkénti Átlagos Teljesítmény</CardTitle>
          <CardDescription>Trend az elmúlt értékelési időszakok során</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {cycleData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={12} />
                <RechartsTooltip formatter={(value: number) => [`${value}%`, 'Átlagos teljesítmény']} />
                <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                  {cycleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Nincs elegendő adat.</div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
