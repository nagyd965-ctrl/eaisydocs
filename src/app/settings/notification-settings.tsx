"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bell, Info, Mail, MessageSquare, Monitor } from "lucide-react"
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
  megorzesi_ido_lejart: "Megőrzési idő lejárt",
  uj_irat_erkezett: "Új bejövő irat érkezett (E-mail / IMAP)",
  uj_feladat_szignalva: "Új részfeladat szignálva",
  megjegyzes_emlitve: "Megemlítés (@név) megjegyzésben",
  explicit_hozzaferes: "Explicit ügyirat-hozzáférés megadása",
  mentett_kereses_talalat: "Mentett keresés találat-riasztás",
}

const triggerDescriptions: Record<string, string> = {
  hatarido_kozeledik:
    "Értesítést küld a felelősnek a határidő lejárta előtt (2 nappal), hogy figyelmeztesse a feladatra.",
  hatarido_lejart:
    "Lejárt határidő esetén naponta értesíti a felelőst, valamint 3 nap késés után eszkalációs értesítést küld a vezetőknek.",
  uj_szignalas:
    "Azonnali értesítést küld az ügyintézőnek, amint egy új ügyiratot szignálnak ki a nevére.",
  allapotvaltozas:
    "Értesítést küld a vezetőknek vagy adminisztrátoroknak, ha ügyiratokat selejtezésre terjesztenek fel jóváhagyásra.",
  megorzesi_ido_lejart:
    "Értesíti az iratkezelőket és adminisztrátorokat, ha egy ügyirat elérte a kötelező megőrzési idejének végét és selejtezhetővé vált.",
  uj_irat_erkezett:
    "Azonnali értesítést küld az iratkezelőknek, amikor az IMAP postafiókból új bejövő e-mail / irat érkezik az érkeztetőbe.",
  uj_feladat_szignalva:
    "Azonnali értesítést küld a kijelölt felelősnek, amikor egy ügyiraton belül új részfeladatot írnak ki a számára.",
  megjegyzes_emlitve:
    "Értesítést küld a munkatársnak, amikor egy ügyirat belső megjegyzésében @névvel megemlítik.",
  explicit_hozzaferes:
    "Értesítést küld a munkatársnak, amikor egy vezető egyedi (explicit) hozzáférést biztosít számára egy ügyirathoz.",
  mentett_kereses_talalat:
    "Értesítést küld a felhasználónak, amikor egy újonnan érkeztetett vagy iktatott irat illeszkedik a mentett keresési feltételeire.",
}

const targetNames: Record<string, string> = {
  felelos: "Felelős ügyintéző",
  vezeto: "Vezető (Admin)",
  iratkezelo: "Iratkezelő",
  erintett: "Érintett munkatárs",
}

export function NotificationSettings({ rules, isAdmin }: { rules: Rule[]; logs?: unknown[]; isAdmin?: boolean }) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    setLocalRules(rules)
  }, [rules])

  const handleToggle = async (id: string, currentStatus: boolean, _channels?: string[]) => {
    if (!isAdmin) {
      toast.error("Nincs jogosultságod", {
        description: "Csak adminisztrátorok módosíthatják a vállalati értesítési szabályokat!",
      })
      return
    }
    setIsPending(true)
    // Optimistic UI update
    setLocalRules((prev) => prev.map((r) => (r.id === id ? { ...r, aktiv: !currentStatus } : r)))
    const res = await toggleNotificationRule(id, !currentStatus)
    if (res.error) {
      toast.error("Hiba", { description: "Hiba a módosítás során: " + res.error })
      // Revert on error
      setLocalRules((prev) => prev.map((r) => (r.id === id ? { ...r, aktiv: currentStatus } : r)))
    } else {
      toast.success("Sikeres", { description: "Értesítési szabály módosítva." })
    }
    setIsPending(false)
  }

  const handleChannelToggle = async (
    id: string,
    channel: string,
    add: boolean,
    ruleIsActive: boolean,
    currentChannels: string[]
  ) => {
    if (!isAdmin) {
      toast.error("Nincs jogosultságod", {
        description: "Csak adminisztrátorok módosíthatják a vállalati értesítési szabályokat!",
      })
      return
    }
    setIsPending(true)
    const newChannels = add ? [...currentChannels, channel] : currentChannels.filter((c) => c !== channel)
    setLocalRules((prev) => prev.map((r) => (r.id === id ? { ...r, csatorna: newChannels } : r)))

    const res = await updateRuleChannels(id, newChannels)

    if (res.error) {
      toast.error("Hiba", { description: "Csatorna módosítása sikertelen: " + res.error })
      setLocalRules((prev) => prev.map((r) => (r.id === id ? { ...r, csatorna: currentChannels } : r)))
    } else {
      // Ha eddig inaktív volt, de most bekapcsolt egy csatornát, akkor aktiváljuk magát a szabályt is
      if (!ruleIsActive && add) {
        await handleToggle(id, false, newChannels)
      } else {
        toast.success("Csatorna elmentve")
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
          <CardDescription>Automatikus rendszerértesítések és csatornáik (Rendszeren belül, E-mail, SMS) be- és kikapcsolása</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {localRules.map((rule) => {
              const ruleChannels = rule.csatorna || []
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card flex-col md:flex-row gap-4 md:gap-0"
                >
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
                            <p className="text-sm">
                              {triggerDescriptions[rule.esemeny_tipus] || "Nincs elérhető leírás ehhez a szabályhoz."}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Címzett: {targetNames[rule.kinek] || rule.kinek}
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          handleChannelToggle(rule.id, "in_app", !ruleChannels.includes("in_app"), rule.aktiv, ruleChannels)
                        }
                        disabled={isPending || !isAdmin}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          ruleChannels.includes("in_app")
                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                            : "bg-transparent text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                        } ${isPending || !isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        Rendszeren belül
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleChannelToggle(rule.id, "email", !ruleChannels.includes("email"), rule.aktiv, ruleChannels)
                        }
                        disabled={isPending || !isAdmin}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          ruleChannels.includes("email")
                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                            : "bg-transparent text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                        } ${isPending || !isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        E-mail
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleChannelToggle(rule.id, "sms", !ruleChannels.includes("sms"), rule.aktiv, ruleChannels)
                        }
                        disabled={isPending || !isAdmin}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          ruleChannels.includes("sms")
                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                            : "bg-transparent text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                        } ${isPending || !isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        SMS
                      </button>
                    </div>

                    <div className="flex items-center gap-2 w-[96px] shrink-0 justify-end">
                      <span className="text-sm text-muted-foreground w-12 text-right">{rule.aktiv ? "Aktív" : "Inaktív"}</span>
                      <Switch
                        checked={rule.aktiv}
                        onCheckedChange={() => handleToggle(rule.id, rule.aktiv, ruleChannels)}
                        disabled={isPending || !isAdmin}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {localRules.length === 0 && (
              <p className="text-muted-foreground">Nincsenek beállított szabályok.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
