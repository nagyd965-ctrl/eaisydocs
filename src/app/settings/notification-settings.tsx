"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bell, List, AlertCircle, CheckCircle2, Clock, Info, Monitor, Mail, MessageSquare } from "lucide-react"
import { toggleNotificationRule, updateRuleChannels } from "./settings-actions"
import { toast } from "sonner"

interface Rule {
  id: string
  esemeny_tipus: string
  kinek: string
  aktiv: boolean
  csatorna?: string[]
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

const triggerDescriptions: Record<string, string> = {
  hatarido_kozeledik: "Értesítést küld a felelősnek a határidő lejárta előtt (pl. 3 nappal), hogy figyelmeztesse a feladatra.",
  hatarido_lejart: "Lejárt határidő esetén naponta értesíti a felelőst, valamint eszkalációs értesítést küldhet a vezetőknek.",
  uj_szignalas: "Azonnali értesítést küld az ügyintézőnek, amint egy új ügyiratot, feladatot szignálnak ki a nevére.",
  allapotvaltozas: "Értesítést küld a felelősnek vagy az iratkezelőnek, ha egy dokumentum állapota jelentősen módosul (pl. lezárva, selejtezésre jelölve).",
  megorzesi_ido_lejart: "Értesíti az iratkezelőket és adminisztrátorokat, ha egy ügyirat vagy dokumentum elérte a kötelező megőrzési idejének végét és selejtezhetővé vált."
}

const targetNames: Record<string, string> = {
  felelos: "Felelős ügyintéző",
  vezeto: "Vezető (Admin)",
  iratkezelo: "Iratkezelő"
}

export function NotificationSettings({ rules, logs, isAdmin }: { rules: Rule[], logs: Log[], isAdmin?: boolean }) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules)
  const [isPending, setIsPending] = useState(false)

  const handleToggle = async (id: string, currentStatus: boolean, channels: string[]) => {
    if (!isAdmin) {
      toast.error("Nincs jogosultságod", { description: "Csak adminisztrátorok módosíthatják a globális értesítési szabályokat!" })
      return
    }
    setIsPending(true)
    // Optimistic UI update
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, aktiv: !currentStatus } : r))
    const res = await toggleNotificationRule(id, !currentStatus)
    if (res.error) {
      toast.error("Hiba", { description: "Hiba a módosítás során: " + res.error })
      // Revert on error
      setLocalRules(prev => prev.map(r => r.id === id ? { ...r, aktiv: currentStatus } : r))
    } else {
      toast.success("Sikeres", { description: "Értesítési szabály módosítva." })
    }
    setIsPending(false)
  }

  const handleChannelToggle = async (id: string, channel: string, add: boolean, ruleIsActive: boolean, currentChannels: string[]) => {
    if (!isAdmin) {
      toast.error("Nincs jogosultságod", { description: "Csak adminisztrátorok módosíthatják a globális értesítési szabályokat!" })
      return
    }
    setIsPending(true)
    const newChannels = add ? [...currentChannels, channel] : currentChannels.filter(c => c !== channel)
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, csatorna: newChannels } : r))

    const res = await updateRuleChannels(id, newChannels)
    
    if (res.error) {
      toast.error("Hiba", { description: "Csatorna módosítása sikertelen: " + res.error })
      setLocalRules(prev => prev.map(r => r.id === id ? { ...r, csatorna: currentChannels } : r))
    } else {
      // Ha eddig inaktív volt, de most bekapcsolt egy csatornát, akkor aktiváljuk magát a szabályt is
      if (!ruleIsActive && add) {
        await handleToggle(id, false, newChannels)
      }
    }
    setIsPending(false)
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-xl">Értesítési Szabályok</CardTitle>
          </div>
          <CardDescription>Automatikus rendszerértesítések be- és kikapcsolása</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {localRules.map((rule) => {
              const ruleChannels = rule.csatorna || []
              return (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg bg-card flex-col md:flex-row gap-4 md:gap-0">
                <div className="space-y-0.5 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-medium">
                      {triggerNames[rule.esemeny_tipus] || rule.esemeny_tipus}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center">
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{triggerDescriptions[rule.esemeny_tipus] || "Nincs elérhető leírás ehhez a szabályhoz."}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Címzett: {targetNames[rule.kinek] || rule.kinek}
                  </p>
                </div>
                
                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleChannelToggle(rule.id, "email", !ruleChannels.includes("email"), rule.aktiv, ruleChannels)}
                      disabled={isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        ruleChannels.includes("email")
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                          : "bg-transparent text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      E-mail
                    </button>
                    <button
                      onClick={() => handleChannelToggle(rule.id, "sms", !ruleChannels.includes("sms"), rule.aktiv, ruleChannels)}
                      disabled={isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        ruleChannels.includes("sms")
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                          : "bg-transparent text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      SMS
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 min-w-[100px] justify-end">
                    <span className="text-sm text-muted-foreground">{rule.aktiv ? 'Aktív' : 'Kikapcsolva'}</span>
                    <Switch
                      checked={rule.aktiv}
                      onCheckedChange={() => handleToggle(rule.id, rule.aktiv, ruleChannels)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>
            )})}
            {localRules.length === 0 && (
              <p className="text-muted-foreground">Nincsenek beállított szabályok.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <List className="h-5 w-5" />
            <CardTitle className="text-xl">Kiküldési Napló (Audit)</CardTitle>
          </div>
          <CardDescription>A rendszer által kiküldött legutóbbi 50 értesítés állapota</CardDescription>
        </CardHeader>
        <CardContent>
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
