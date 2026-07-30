"use client"

import { useTransition, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Mail, Monitor, Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { updateNotificationRule } from "./notification-actions"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
interface Rule {
  id: string
  esemeny_tipus: string
  kinek: string
  aktiv: boolean
  csatorna?: string[]
}

const eventTypeTranslations: Record<string, string> = {
  'orvosi_vizsgalat_lejarat': 'Orvosi vizsgálat lejárata',
  'tanulmanyi_szerzodes_lejarat': 'Tanulmányi szerződés lejárata',
  'hatarozott_szerzodes_lejarat': 'Határozott idejű szerződés lejárata',
  'probaido_lejarat': 'Próbaidő lejárata',
  't1041_bejelentes': 'T1041 Bejelentési figyelmeztetés',
  'szabadsag_jovahagyas': 'Távollét / Szabadság jóváhagyása',
  'teljesitmeny_ertekeles': 'Teljesítményértékelés határidők',
  'hatarido_kozeledik': 'Iktatott ügyirat - Határidő közeledik',
  'hatarido_lejart': 'Iktatott ügyirat - Határidő lejárt',
  'uj_szignalas': 'Új szignálás érkezett',
  'allapotvaltozas': 'Ügyirat állapotváltozás',
  'megorzesi_ido_lejart': 'Megőrzési idő lejárt'
}

const eventTypeDescriptions: Record<string, string> = {
  'orvosi_vizsgalat_lejarat': '30 és 7 nappal a lejárati dátum előtt küld figyelmeztetést a háttérfolyamat, a lejárat napjától pedig minden nap.',
  'tanulmanyi_szerzodes_lejarat': '7 nappal a tanulmányi szerződés lejárata előtt küld értesítést.',
  'hatarozott_szerzodes_lejarat': '15 nappal a határozott idejű munkaszerződés vége előtt küld figyelmeztetést.',
  'probaido_lejarat': '7 nappal a rögzített próbaidő lejárta előtt küld figyelmeztetést a háttérfolyamat.',
  't1041_bejelentes': '2 nappal a dolgozó belépési dátuma előtt küld figyelmeztetést, amennyiben nem rögzítetted még a T1041-et.',
  'szabadsag_jovahagyas': 'Azonnal értesítést küld a vezetőnek, amint a dolgozó beküld egy új kérelmet a felületen.',
  'teljesitmeny_ertekeles': 'A beállított teljesítményértékelési időszak lejárta előtt 7 nappal küld értesítést.',
  'hatarido_kozeledik': 'Iktatott ügyiratok esetén a határidő lejárta előtt küld emlékeztetőt.',
  'hatarido_lejart': 'Iktatott ügyiratok esetén a határidő napján vagy utána küld figyelmeztetést.',
  'uj_szignalas': 'Azonnal értesítést küld, ha egy új iratot vagy feladatot szignálnak rád.',
  'allapotvaltozas': 'Azonnal értesítést küld, ha egy általad követett ügyirat állapota megváltozik.',
  'megorzesi_ido_lejart': 'Az irattári megőrzési idő lejárata napján küld figyelmeztetést selejtezésre.'
}

export function HrNotificationSettings({ rules = [] }: { rules: Rule[] }) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules)
  const [isPending, startTransition] = useTransition()

  // Sync prop changes (e.g. from server actions revalidating path)
  useEffect(() => {
    setLocalRules(rules)
  }, [rules])

  const handleToggle = (id: string, currentStatus: boolean, currentChannels: string[]) => {
    const newStatus = !currentStatus
    // Optimistic update
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, aktiv: newStatus } : r))
    
    startTransition(async () => {
      const result = await updateNotificationRule(id, newStatus, currentChannels)
      if (result.error) {
        toast.error("Hiba a mentés során", { description: result.error })
        // Revert on error
        setLocalRules(rules)
      } else {
        toast.success("Beállítás elmentve")
      }
    })
  }

  const handleChannelToggle = (id: string, channel: string, isChecked: boolean, currentStatus: boolean, currentChannels: string[]) => {
    const newChannels = isChecked 
      ? [...currentChannels, channel] 
      : currentChannels.filter(c => c !== channel)
      
    // Optimistic update
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, csatorna: newChannels } : r))
    
    startTransition(async () => {
      const result = await updateNotificationRule(id, currentStatus, newChannels)
      if (result.error) {
        toast.error("Hiba a mentés során", { description: result.error })
        // Revert on error
        setLocalRules(rules)
      } else {
        toast.success("Csatorna elmentve")
      }
    })
  }

  return (
    <div className="space-y-8 relative">
      {isPending && (
        <div className="absolute top-4 right-4 text-muted-foreground flex items-center text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mentés folyamatban...
        </div>
      )}
      {/* HR Riasztások */}
      <Card className="border-border shadow-sm border-none bg-transparent shadow-none">
        <CardHeader className="px-6 pb-6 pt-0 border-b">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">eaisyHR - Riasztások és Értesítések</CardTitle>
          </div>
          <CardDescription>Állítsd be, hogy a HR és munkaügyi riasztások hol jelenjenek meg.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pt-6">
          <div className="space-y-4">
            {localRules.map((rule) => {
              const ruleChannels = rule.csatorna || []
              return (
                <div key={rule.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                  <div className="space-y-0.5 flex-1">
                    <div className="text-base font-medium flex items-center gap-2">
                      {eventTypeTranslations[rule.esemeny_tipus] || rule.esemeny_tipus}
                      {eventTypeDescriptions[rule.esemeny_tipus] && (
                        <Popover>
                          <PopoverTrigger className="text-muted-foreground hover:text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring rounded-full p-0.5">
                            <Info className="h-4 w-4" />
                          </PopoverTrigger>
                          <PopoverContent className="w-80 text-sm" side="top">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">{eventTypeTranslations[rule.esemeny_tipus]}</h4>
                              <p className="text-muted-foreground">
                                {eventTypeDescriptions[rule.esemeny_tipus]}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      Címzett: {rule.kinek}
                    </p>
                  </div>
                  
                  {/* Csatorna választó */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleChannelToggle(rule.id, "in_app", !ruleChannels.includes("in_app"), rule.aktiv, ruleChannels)}
                      disabled={isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        ruleChannels.includes("in_app")
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                          : "bg-transparent text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Rendszeren belül
                    </button>
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-text"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>
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
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
