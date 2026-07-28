"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Mail, Monitor } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

interface Rule {
  id: string
  esemeny_tipus: string
  kinek: string
  aktiv: boolean
  csatorna?: string[]
}

// Ideiglenes HR mock szabályok a frontend demóhoz
const mockHrRules: Rule[] = [
  { id: "hr-1", esemeny_tipus: "Orvosi vizsgálat lejárata (30 nap)", kinek: "HR, Érintett", aktiv: true, csatorna: ["in_app", "email"] },
  { id: "hr-2", esemeny_tipus: "T1041 Bejelentési figyelmeztetés", kinek: "HR, Bérszámfejtés", aktiv: true, csatorna: ["in_app"] },
  { id: "hr-3", esemeny_tipus: "Határozott idejű szerződés lejárata", kinek: "Vezető, HR", aktiv: false, csatorna: ["email"] },
  { id: "hr-4", esemeny_tipus: "Távollét / Szabadság jóváhagyása", kinek: "Közvetlen Vezető", aktiv: true, csatorna: ["in_app", "email"] },
  { id: "hr-5", esemeny_tipus: "Jelenléti Eltérés (Késés / Hiányzás)", kinek: "Vezető", aktiv: false, csatorna: ["in_app"] },
]

export function HrNotificationSettings() {
  const [hrRules, setHrRules] = useState<Rule[]>(mockHrRules)

  const handleHrToggle = (id: string, currentStatus: boolean) => {
    setHrRules(prev => prev.map(r => r.id === id ? { ...r, aktiv: !currentStatus } : r))
    toast.success("Frontend Demó: Állapot mentve (csak UI)")
  }

  const handleHrChannelToggle = (id: string, channel: string, isChecked: boolean) => {
    setHrRules(prev => prev.map(r => {
      if (r.id === id) {
        const csatorna = r.csatorna || []
        return { ...r, csatorna: isChecked ? [...csatorna, channel] : csatorna.filter(c => c !== channel) }
      }
      return r
    }))
    toast.success("Frontend Demó: Csatorna mentve (csak UI)")
  }

  return (
    <div className="space-y-8">
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
            {hrRules.map((rule) => (
              <div key={rule.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-base font-medium">
                    {rule.esemeny_tipus}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Címzett: {rule.kinek}
                  </p>
                </div>
                
                {/* Csatorna választó */}
                <div className="flex items-center gap-6 bg-muted/50 p-2 rounded-md border">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`inapp-${rule.id}`} 
                      checked={(rule.csatorna || []).includes("in_app")}
                      onCheckedChange={(checked) => handleHrChannelToggle(rule.id, "in_app", checked as boolean)}
                    />
                    <Label htmlFor={`inapp-${rule.id}`} className="flex items-center gap-1 cursor-pointer font-normal text-sm">
                      <Monitor className="w-3.5 h-3.5" /> Rendszeren belül
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`email-${rule.id}`} 
                      checked={(rule.csatorna || []).includes("email")}
                      onCheckedChange={(checked) => handleHrChannelToggle(rule.id, "email", checked as boolean)}
                    />
                    <Label htmlFor={`email-${rule.id}`} className="flex items-center gap-1 cursor-pointer font-normal text-sm">
                      <Mail className="w-3.5 h-3.5" /> E-mail
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2 min-w-[100px] justify-end">
                  <span className="text-sm text-muted-foreground">{rule.aktiv ? 'Aktív' : 'Kikapcsolva'}</span>
                  <Switch
                    checked={rule.aktiv}
                    onCheckedChange={() => handleHrToggle(rule.id, rule.aktiv)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
