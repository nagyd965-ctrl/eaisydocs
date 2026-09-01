"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Table as TableIcon } from "lucide-react"

export interface KshEmployeeItem {
  id: string
  munkaido_fte?: number | null
  [key: string]: unknown
}

export function KshReportGenerator({ employees }: { employees: KshEmployeeItem[] }) {
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-05")

  // Mock statisztika a kiválasztott hónapra (Valós rendszerben backend aggregáció lenne)
  const stats = {
    zaroLetszam: employees.length,
    atlagosStatLetszam: (employees.reduce((acc, curr) => acc + (curr.munkaido_fte || 1), 0)).toFixed(1),
    belepett: selectedMonth === "2026-05" ? 2 : 0,
    kilepett: selectedMonth === "2026-05" ? 0 : 1,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TableIcon className="w-5 h-5 text-emerald-500" />
          KSH Munkaügyi Jelentés Aggregátor
        </CardTitle>
        <CardDescription>
          Havi statisztikai állományi létszám és fluktuáció adatok a KSH adatszolgáltatáshoz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-end mb-6">
          <div className="space-y-2 w-full sm:w-64">
            <label className="text-sm font-medium">Jelentési Időszak</label>
            <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz hónapot..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-06">2026. Június</SelectItem>
                <SelectItem value="2026-05">2026. Május</SelectItem>
                <SelectItem value="2026-04">2026. Április</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <Download className="w-4 h-4" /> Export (CSV)
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">KSH Mutató</th>
                <th className="px-4 py-3 font-medium text-right">Érték</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="bg-card hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">Havi Záró Létszám (fő)</td>
                <td className="px-4 py-3 text-right font-bold">{stats.zaroLetszam}</td>
              </tr>
              <tr className="bg-card hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">Átlagos statisztikai állományi létszám (FTE)</td>
                <td className="px-4 py-3 text-right font-bold text-primary">{stats.atlagosStatLetszam}</td>
              </tr>
              <tr className="bg-card hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-emerald-600">Tárgyhónapban belépők száma (fő)</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{stats.belepett}</td>
              </tr>
              <tr className="bg-card hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-destructive">Tárgyhónapban kilépők száma (fő)</td>
                <td className="px-4 py-3 text-right font-bold text-destructive">{stats.kilepett}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
