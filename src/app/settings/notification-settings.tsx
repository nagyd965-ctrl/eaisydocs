"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bell, Info, Mail, MessageSquare, ArrowRight, Send } from "lucide-react"
import { toggleNotificationRule, updateRuleChannels } from "./settings-actions"
import { toast } from "sonner"

interface Rule {
  id: string
  esemeny_tipus: string
  kinek: string
  aktiv: boolean
  csatorna?: string[]
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

export function NotificationSettings({ rules, isAdmin }: { rules: Rule[]; logs?: unknown[]; isAdmin?: boolean }) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules)
  const [isPending, setIsPending] = useState(false)

  const handleToggle = async (id: string, currentStatus: boolean, _channels?: string[]) => {
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
      <Card className="border-border/60">
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

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Értesítések Kiküldési Naplója (Audit)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                A rendszer által kiküldött összes e-mail és SMS kézbesítési állapota, szűrése és exportja a Központi Eseménynaplóban érhető el.
              </p>
            </div>
          </div>
          <Link
            href="/audit?tab=kikuldesi_naplo"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 shrink-0 border-primary/30 hover:bg-primary/10 hover:text-primary")}
          >
            Kiküldési Napló Megnyitása
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

