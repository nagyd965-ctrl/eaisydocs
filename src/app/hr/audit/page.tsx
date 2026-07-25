"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, ShieldAlert, FileText, UserPlus, FileEdit } from "lucide-react"

export default function HrAuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("hr_esemeny_naplo")
      .select(`
        *,
        felhasznalo_profil:felhasznalo_id ( nev, szerepkor )
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Hiba a napló lekérésekor:", error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'rendszer_inditas': return <ShieldAlert className="w-4 h-4 text-blue-500" />
      case 'adat_megtekintes': return <FileText className="w-4 h-4 text-slate-500" />
      case 'munkatars_felvetel': return <UserPlus className="w-4 h-4 text-green-500" />
      case 'kpi_hozzaadas': return <FileEdit className="w-4 h-4 text-orange-500" />
      default: return <ShieldAlert className="w-4 h-4 text-slate-400" />
    }
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'rendszer_inditas': return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Rendszer</Badge>
      case 'adat_megtekintes': return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Olvasás</Badge>
      case 'munkatars_felvetel': return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Létrehozás</Badge>
      case 'kpi_hozzaadas': return <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Módosítás</Badge>
      default: return <Badge variant="outline">Ismeretlen</Badge>
    }
  }

  const filteredLogs = logs.filter(log => 
    log.megjegyzes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.esemeny_tipus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.felhasznalo_profil?.nev?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Audit Napló (Eseménynapló)</h1>
          <p className="text-muted-foreground mt-1">
            Minden kritikus rendszeresemény, adatmódosítás és megtekintés visszakövethető listája (Append-only).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Legutóbbi Események</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Keresés a naplóban..." 
                  className="pl-8 w-[250px] bg-background" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[180px]">Dátum</TableHead>
                <TableHead className="w-[200px]">Felhasználó</TableHead>
                <TableHead className="w-[120px]">Típus</TableHead>
                <TableHead className="w-[150px]">Entitás</TableHead>
                <TableHead>Esemény részletei</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Betöltés...</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nincs a keresésnek megfelelő esemény.</TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="text-sm font-medium">
                      {new Date(log.created_at).toLocaleString("hu-HU")}
                    </TableCell>
                    <TableCell>
                      {log.felhasznalo_profil ? (
                        <div>
                          <p className="font-medium">{log.felhasznalo_profil.nev}</p>
                          <p className="text-xs text-muted-foreground">{log.felhasznalo_profil.hr_szerepkor}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Rendszer</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getEventBadge(log.esemeny_tipus)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm border px-2 py-1 rounded-md bg-muted/20">
                        {log.entitas_tipus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEventIcon(log.esemeny_tipus)}
                        <span className="text-sm">{log.megjegyzes || "-"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}
