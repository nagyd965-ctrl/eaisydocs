"use client"

import { useState, useEffect, useMemo } from "react"
import { getEmployeeAuditLogs } from "@/app/hr/employee/[id]/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  History, 
  ArrowRight, 
  User, 
  Search, 
  Eye, 
  FileEdit, 
  FileCheck, 
  FileText, 
  Trash2, 
  ShieldAlert, 
  Lock,
  Filter
} from "lucide-react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"

const ENTITY_LABELS: Record<string, string> = {
  "hr_dolgozo_adatlap": "Személyes Adatok",
  "hr_dolgozo_titkos_adat": "Érzékeny Adatok (TAJ, Adó, Bér)",
  "hr_munkaszerzodes": "Munkaszerződés",
  "hr_dokumentum": "Hivatalos HR Irat",
  "hr_jelenlet": "Jelenléti ív",
  "hr_tavollet": "Távollét / Szabadság",
  "hr_cafeteria_valasztas": "Cafeteria Nyilatkozat",
  "hr_cafeteria_keret": "Cafeteria Keret",
  "hr_berpapir": "Bérpapír",
  "hr_teljesitmeny": "Teljesítményértékelés",
  "hr_orvosi_vizsgalat": "Orvosi vizsgálat",
  "hr_fegyelmi": "Fegyelmi ügy",
  "hr_tanulmanyi_szerzodes": "Tanulmányi szerződés",
  "hr_jogviszony": "Munkaviszony",
  "hr_ceges_dokumentum": "Céges Szabályzat",
  "hr_jelenlet_korrekcio": "Jelenlét Korrekció"
}

const EVENT_LABELS: Record<string, string> = {
  "letrehozas": "Létrehozás",
  "adat_letrehozas": "Létrehozás",
  "irat_letrehozas": "Irat létrehozása",
  "modositas": "Módosítás",
  "adat_modositas": "Módosítás",
  "munkatars_modositas": "Módosítás",
  "munkatars_felvetel": "Rögzítés",
  "torles": "Törlés",
  "adat_torles": "Törlés",
  "irat_torles": "Irat törlése",
  "megtekintes": "Megtekintés (Felfedés)",
  "adat_megtekintes": "Megtekintés (Felfedés)",
  "irat_megtekintes": "Megtekintés",
  "lekerdezes": "Adatlekérés",
  "iktatva": "Iktatás",
  "irat_alairas": "Aláírás",
  "irat_letoltes": "Letöltés",
  "jovahagyas": "Jóváhagyás",
  "elutasitas": "Elutasítás",
  "dokumentum_nyugtazas": "Nyugtázás",
  "rendszer_inditas": "Rendszer indítás"
}

const FIELD_LABELS: Record<string, string> = {
  szuletesi_datum: "Születési dátum",
  anyja_neve: "Anyja neve",
  lakcim: "Lakcím",
  telefonszam: "Telefonszám",
  gyermekek_szama: "Gyermekek száma",
  megvaltozott_munkakepessegu: "Megváltozott munkaképességű",
  taj_szam: "TAJ szám",
  adoazonosito: "Adóazonosító jel",
  bankszamla: "Bankszámlaszám",
  brutto_ber: "Bruttó bér",
  netto_ber: "Nettó bér",
  munkakor_id: "Munkakör",
  munkarend: "Munkarend",
  munkaido_fte: "Munkaidő (FTE)",
  berkategoria: "Bérkategória",
  statusz: "Státusz",
  ervenyes_tol: "Érvényesség kezdete",
  ervenyes_ig: "Érvényesség vége",
  belepes_datuma: "Belépés dátuma",
  kilepes_datuma: "Kilépés dátuma"
}

export function AuditLogTab({ employeeId }: { employeeId: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<"all" | "secret" | "modification" | "document">("all")

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

  // Tisztítás: levesszük a belső technikai UUID-ket a zárójelekből (pl. "(033c707d-5430-44bb-a2b0-30a27b34db45)")
  const cleanNote = (note?: string) => {
    if (!note) return null
    return note
      .replace(/\([0-9a-fA-F-]{36}\)/g, "")
      .replace(/\s\s+/g, " ")
      .trim()
  }

  // Cím formázása: tiszta, emberi magyar megnevezések a technikai kulcsok helyett
  const getEventTitle = (log: any) => {
    // 1. Érzékeny személyes adatok (TAJ, adó, bér)
    if (log.entitas_tipus === "hr_dolgozo_titkos_adat") {
      if (["megtekintes", "adat_megtekintes", "irat_megtekintes"].includes(log.esemeny_tipus)) {
        return "Érzékeny adatok (TAJ, Adó, Bér) feloldása"
      }
      if (["modositas", "adat_modositas", "munkatars_modositas", "munkatars_felvetel"].includes(log.esemeny_tipus)) {
        return "Érzékeny adatok (TAJ, Adó, Bér) módosítása"
      }
    }

    // 2. Dokumentumok / Szerződések
    if (log.entitas_tipus === "hr_dokumentum" || log.entitas_tipus === "hr_munkaszerzodes") {
      if (log.esemeny_tipus === "iktatva" || log.esemeny_tipus === "adat_letrehozas") {
        return "Hivatalos dokumentum / Szerződés iktatása"
      }
      if (log.esemeny_tipus === "irat_torles" || log.esemeny_tipus === "torles") {
        return "Dokumentum tervezet törlése"
      }
    }

    const entity = ENTITY_LABELS[log.entitas_tipus] || log.entitas_tipus
    const event = EVENT_LABELS[log.esemeny_tipus] || log.esemeny_tipus?.replace(/_/g, " ")
    return `${entity} - ${event}`
  }

  const getEventBadge = (log: any) => {
    const type = log.esemeny_tipus
    if (["megtekintes", "adat_megtekintes", "irat_megtekintes"].includes(type)) {
      return (
        <Badge variant="outline" className="border-info/30 bg-info/10 text-info text-xs gap-1 font-medium">
          <Eye className="w-3 h-3" /> Megtekintés
        </Badge>
      )
    }
    if (["modositas", "adat_modositas", "munkatars_modositas", "munkatars_felvetel"].includes(type)) {
      return (
        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning text-xs gap-1 font-medium">
          <FileEdit className="w-3 h-3" /> Módosítás
        </Badge>
      )
    }
    if (["iktatva", "adat_letrehozas", "letrehozas", "irat_letrehozas"].includes(type)) {
      return (
        <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs gap-1 font-medium">
          <FileCheck className="w-3 h-3" /> Létrehozás
        </Badge>
      )
    }
    if (["torles", "adat_torles", "irat_torles"].includes(type)) {
      return (
        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-xs gap-1 font-medium">
          <Trash2 className="w-3 h-3" /> Törlés
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/40 font-normal">
        Esemény
      </Badge>
    )
  }

  // Tömörített lista: az egymást közvetlenül követő azonos feloldásokat (60s-on belül ugyanaz a személy)
  // egyetlen bejegyzéssé vonjuk össze, elkerülve a form mentésből vagy dupla kattintásból adódó szemetelést
  const consolidatedLogs = useMemo(() => {
    const result: any[] = []
    for (let i = 0; i < logs.length; i++) {
      const current = logs[i]
      const isViewEvent = ["megtekintes", "adat_megtekintes", "irat_megtekintes"].includes(current.esemeny_tipus)

      if (isViewEvent && result.length > 0) {
        const prev = result[result.length - 1]
        const prevIsView = ["megtekintes", "adat_megtekintes", "irat_megtekintes"].includes(prev.esemeny_tipus)

        if (
          prevIsView &&
          prev.entitas_tipus === current.entitas_tipus &&
          prev.felhasznalo_id === current.felhasznalo_id
        ) {
          const timeDiff = Math.abs(new Date(prev.created_at).getTime() - new Date(current.created_at).getTime())
          if (timeDiff <= 60000) {
            prev.repeatCount = (prev.repeatCount || 1) + 1
            continue
          }
        }
      }

      result.push({ ...current, repeatCount: 1 })
    }
    return result
  }, [logs])

  // Szűrés keresőkifejezés és kategória szerint
  const filteredLogs = useMemo(() => {
    return consolidatedLogs.filter(log => {
      // 1. Kategória szűrés
      if (filterCategory === "secret" && log.entitas_tipus !== "hr_dolgozo_titkos_adat") {
        return false
      }
      if (filterCategory === "modification" && !["modositas", "adat_modositas", "munkatars_modositas"].includes(log.esemeny_tipus)) {
        return false
      }
      if (filterCategory === "document" && !["hr_dokumentum", "hr_munkaszerzodes", "hr_tanulmanyi_szerzodes"].includes(log.entitas_tipus)) {
        return false
      }

      // 2. Keresőszó szűrés
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      const title = getEventTitle(log).toLowerCase()
      const note = (log.megjegyzes || "").toLowerCase()
      const user = (log.user_nev || "").toLowerCase()
      return title.includes(term) || note.includes(term) || user.includes(term)
    })
  }, [consolidatedLogs, filterCategory, searchTerm])

  return (
    <Card className="shadow-none border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5 text-primary" />
              Változáskövetés (Audit Napló)
            </CardTitle>
            <CardDescription className="mt-1">
              A dolgozóhoz köthető minden adatkezelési, módosítási és iratkezelési esemény (GDPR megfelelőség).
            </CardDescription>
          </div>

          {/* Keresőmező */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés a naplóban..."
              className="pl-8 h-9 text-xs bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Szűrő gombok */}
        <div className="flex items-center gap-2 pt-2 border-t mt-3 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mr-1">
            <Filter className="w-3 h-3" /> Szűrés:
          </span>
          <button
            onClick={() => setFilterCategory("all")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              filterCategory === "all"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Összes ({consolidatedLogs.length})
          </button>
          <button
            onClick={() => setFilterCategory("secret")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              filterCategory === "secret"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Lock className="w-3 h-3" /> Érzékeny adatok ({consolidatedLogs.filter(l => l.entitas_tipus === "hr_dolgozo_titkos_adat").length})
          </button>
          <button
            onClick={() => setFilterCategory("modification")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              filterCategory === "modification"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <FileEdit className="w-3 h-3" /> Módosítások ({consolidatedLogs.filter(l => ["modositas", "adat_modositas", "munkatars_modositas"].includes(l.esemeny_tipus)).length})
          </button>
          <button
            onClick={() => setFilterCategory("document")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              filterCategory === "document"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <FileText className="w-3 h-3" /> Iratok & Szerződések ({consolidatedLogs.filter(l => ["hr_dokumentum", "hr_munkaszerzodes", "hr_tanulmanyi_szerzodes"].includes(l.entitas_tipus)).length})
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
            {searchTerm || filterCategory !== "all" 
              ? "Nincs a szűrésnek megfelelő esemény a naplóban." 
              : "Nincs rögzített esemény a naplóban."}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
              {filteredLogs.map((log) => {
                const note = cleanNote(log.megjegyzes)
                const isSecret = log.entitas_tipus === "hr_dolgozo_titkos_adat"
                const isModification = log.esemeny_tipus === "modositas" && log.regi_adat && log.uj_adat

                return (
                  <div key={log.id} className="relative pl-6">
                    {/* Timeline dot */}
                    <span 
                      className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ring-4 ring-background ${
                        isSecret 
                          ? "bg-info" 
                          : log.esemeny_tipus.includes("torles") 
                            ? "bg-destructive" 
                            : isModification 
                              ? "bg-warning" 
                              : "bg-primary"
                      }`} 
                    />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">
                          {getEventTitle(log)}
                        </span>
                        {getEventBadge(log)}
                        {log.repeatCount > 1 && (
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {log.repeatCount}× feloldva 1 percen belül
                          </span>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground tabular-nums">
                        {format(new Date(log.created_at), "yyyy. MMMM d., HH:mm", { locale: hu })}
                      </time>
                    </div>
                    
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                      <User className="w-3.5 h-3.5" />
                      Végrehajtotta: <span className="font-medium text-foreground">{log.user_nev}</span>
                    </div>

                    {/* Módosult mezők összehasonlító nézete (diff) */}
                    {isModification && (
                      <div className="mt-2 bg-muted/40 rounded-md p-3 text-xs overflow-x-auto border border-border">
                        <div className="font-medium mb-1.5 text-muted-foreground">Módosult mezők:</div>
                        <div className="grid grid-cols-1 gap-2">
                          {Object.keys(log.uj_adat).map(key => {
                            const oldVal = log.regi_adat[key]
                            const newVal = log.uj_adat[key]
                            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                              const label = FIELD_LABELS[key] || key
                              return (
                                <div key={key} className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
                                  <span className="font-medium text-foreground min-w-[130px]">{label}:</span>
                                  <span className="text-destructive line-through decoration-destructive/50 break-all">
                                    {typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || '-')}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  <span className="text-success font-medium break-all">
                                    {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal || '-')}
                                  </span>
                                </div>
                              )
                            }
                            return null
                          })}
                        </div>
                      </div>
                    )}

                    {/* Részletek / Megjegyzés */}
                    {note && (
                      <div className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/30 pl-2.5 py-0.5 bg-muted/20 rounded-r">
                        <span className="font-medium text-foreground/80">Részletek: </span>
                        <span>{note}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
