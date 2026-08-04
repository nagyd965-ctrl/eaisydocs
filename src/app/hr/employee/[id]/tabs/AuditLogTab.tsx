"use client"

import { useState, useEffect } from "react"
import { getEmployeeAuditLogs } from "@/app/hr/employee/[id]/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History, ArrowRight, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { hu } from "date-fns/locale"

export function AuditLogTab({ employeeId }: { employeeId: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLogs() {
      const { data, error } = await getEmployeeAuditLogs(employeeId)
      if (!error && data) {
        setLogs(data)
      }
      setLoading(false)
    }
    loadLogs()
  }, [employeeId])

  const translateEntity = (type: string) => {
    const dict: Record<string, string> = {
      "hr_dolgozo_adatlap": "Személyes Adatok",
      "hr_dolgozo_titkos_adat": "Érzékeny Adatok (TAJ, Adó)",
      "hr_munkaszerzodes": "Munkaszerződés",
      "hr_jelenlet": "Jelenléti ív",
      "hr_tavollet": "Távollét / Szabadság",
      "hr_cafeteria_valasztas": "Cafeteria Nyilatkozat",
      "hr_cafeteria_keret": "Cafeteria Keret"
    }
    return dict[type] || type
  }

  const translateEvent = (event: string) => {
    switch (event) {
      case "letrehozas": return "Létrehozás"
      case "modositas": return "Módosítás"
      case "torles": return "Törlés"
      case "megtekintes": return "Megtekintés (Felfedés)"
      case "lekerdezes": return "Adatlekérés"
      default: return event
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Változáskövetés (Audit Napló)
        </CardTitle>
        <CardDescription>
          A dolgozóhoz köthető minden adatkezelési és módosítási esemény (GDPR megfelelőség).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
            Nincs rögzített esemény a naplóban.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {translateEntity(log.entitas_tipus)} - {translateEvent(log.esemeny_tipus)}
                      </span>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "yyyy. MMMM d., HH:mm", { locale: hu })}
                    </time>
                  </div>
                  
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                    <User className="w-3.5 h-3.5" />
                    Végrehajtotta: <span className="font-medium text-foreground">{log.user_nev}</span>
                  </div>

                  {/* Changes diff view if modification */}
                  {log.esemeny_tipus === "modositas" && log.regi_adat && log.uj_adat && (
                    <div className="mt-2 bg-muted/50 rounded-md p-3 text-xs overflow-x-auto border">
                      <div className="font-medium mb-1.5 text-muted-foreground">Módosult mezők:</div>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.keys(log.uj_adat).map(key => {
                          const oldVal = log.regi_adat[key]
                          const newVal = log.uj_adat[key]
                          // Csak akkor mutatjuk, ha tényleg változott
                          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                            return (
                              <div key={key} className="flex items-start gap-2">
                                <span className="font-medium text-foreground min-w-[120px]">{key}:</span>
                                <span className="text-rose-600 line-through decoration-rose-600/50 break-all">{typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || '-')}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                <span className="text-emerald-600 font-medium break-all">{typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal || '-')}</span>
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>
                  )}

                  {/* If just viewed */}
                  {log.megjegyzes && (
                    <div className="mt-2 text-xs text-muted-foreground italic border-l-2 pl-2">
                      Indoklás: {log.megjegyzes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
