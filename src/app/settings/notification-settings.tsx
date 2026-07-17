"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Bell, List, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { toggleNotificationRule } from "./settings-actions"

interface Rule {
  id: string
  esemeny_tipus: string
  kinek: string
  aktiv: boolean
}

interface Log {
  id: string
  mikor: string
  csatorna: string
  cimzett_email: string
  targy: string
  statusz: string
  hiba_oka: string | null
}

const triggerNames: Record<string, string> = {
  hatarido_kozeledik: "Határidő közeledik",
  hatarido_lejart: "Határidő lejárt",
  uj_szignalas: "Új ügyirat szignálva",
  allapotvaltozas: "Állapotváltozás (pl. Selejtezés)",
  megorzesi_ido_lejart: "Megőrzési idő lejárt"
}

const targetNames: Record<string, string> = {
  felelos: "Felelős ügyintéző",
  vezeto: "Vezető (Admin)",
  iratkezelo: "Iratkezelő"
}

export function NotificationSettings({ rules, logs }: { rules: Rule[], logs: Log[] }) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules)

  const handleToggle = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, aktiv: !currentStatus } : r))
    const res = await toggleNotificationRule(id, !currentStatus)
    if (res.error) {
      alert("Hiba a módosítás során: " + res.error)
      // Revert on error
      setLocalRules(prev => prev.map(r => r.id === id ? { ...r, aktiv: currentStatus } : r))
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm border-none bg-transparent shadow-none">
        <CardHeader className="px-6 pb-6 pt-0 border-b">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Értesítési Szabályok</CardTitle>
          </div>
          <CardDescription>Automatikus rendszerértesítések be- és kikapcsolása</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pt-6">
          <div className="space-y-4">
            {localRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    {triggerNames[rule.esemeny_tipus] || rule.esemeny_tipus}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Címzett: {targetNames[rule.kinek] || rule.kinek}
                  </p>
                </div>
                <Switch
                  checked={rule.aktiv}
                  onCheckedChange={() => handleToggle(rule.id, rule.aktiv)}
                />
              </div>
            ))}
            {localRules.length === 0 && (
              <p className="text-muted-foreground">Nincsenek beállított szabályok.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm border-none bg-transparent shadow-none mt-6">
        <CardHeader className="px-6 pb-6 pt-0 border-b">
          <div className="flex items-center space-x-2">
            <List className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Kiküldési Napló (Audit)</CardTitle>
          </div>
          <CardDescription>A rendszer által kiküldött legutóbbi 50 értesítés állapota</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Időpont</TableHead>
                  <TableHead>Címzett</TableHead>
                  <TableHead>Tárgy</TableHead>
                  <TableHead>Státusz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {new Date(log.mikor).toLocaleString("hu-HU")}
                    </TableCell>
                    <TableCell>{log.cimzett_email}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={log.targy}>
                      {log.targy}
                    </TableCell>
                    <TableCell>
                      {log.statusz === "sikeres" && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Sikeres
                        </Badge>
                      )}
                      {log.statusz === "hibas" && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20" title={log.hiba_oka || "Ismeretlen hiba"}>
                          <AlertCircle className="h-3 w-3 mr-1" /> Hibás
                        </Badge>
                      )}
                      {log.statusz === "folyamatban" && (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          <Clock className="h-3 w-3 mr-1" /> Folyamatban
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Még nem küldött ki a rendszer egyetlen értesítést sem.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
