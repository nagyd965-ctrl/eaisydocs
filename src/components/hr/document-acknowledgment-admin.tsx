"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, XCircle, Bell, FileText, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { sendAcknowledgmentReminder, deleteCegesDokumentum } from "@/app/hr/settings/actions"

interface Nyugtazas {
  id: string
  dolgozo_id: string
  nyugtazva_mikor: string
  ip_cim: string | null
  hr_dolgozo_adatlap: {
    id: string
    felhasznalo_profil: { id: string; nev: string; email: string } | null
  } | null
}

interface Dokumentum {
  id: string
  cim: string
  leiras: string | null
  fajl_path: string | null
  kotelezo_mindenkinek: boolean
  created_at: string
  hr_ceges_dokumentum_nyugtazas: Nyugtazas[]
}

interface Dolgozo {
  id: string
  felhasznalo_profil: { id: string; nev: string; email: string } | null
}

interface Props {
  dokumentumok: Dokumentum[]
  osszesDolgozo: Dolgozo[]
}

export function DocumentAcknowledgmentAdmin({ dokumentumok, osszesDolgozo }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleReminder = (dok: Dokumentum, nemNyugtazottak: { nev: string; email: string }[]) => {
    if (nemNyugtazottak.length === 0) {
      toast.info("Mindenki nyugtázta ezt a dokumentumot!")
      return
    }
    startTransition(async () => {
      const result = await sendAcknowledgmentReminder(dok.id, dok.cim, nemNyugtazottak)
      if (result.success) {
        toast.success(`Emlékeztető elküldve ${result.sikerCount} főnek`, {
          description: result.hibaCount ? `${result.hibaCount} sikertelen küldés` : undefined
        })
      } else {
        toast.error("Hiba az emlékeztető küldésekor", { description: result.error })
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCegesDokumentum(id)
      if (result.success) {
        toast.success("Dokumentum eltávolítva")
      } else {
        toast.error("Hiba a törléskor", { description: result.error })
      }
    })
  }

  if (!dokumentumok || dokumentumok.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nincs aktív céges dokumentum</p>
        <p className="text-sm mt-1">Hozz létre egy dokumentumot az "Új dokumentum" gombbal</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dokumentumok.map((dok) => {
        // Nyugtázott dolgozók set-je (dolgozo_id alapján)
        const nyugtazottIds = new Set(
          dok.hr_ceges_dokumentum_nyugtazas.map((n) => n.dolgozo_id)
        )
        const osszesDolgozoSzam = osszesDolgozo.length
        const nyugtazottSzam = Math.min(nyugtazottIds.size, osszesDolgozoSzam)
        const arany = osszesDolgozoSzam > 0 ? (nyugtazottSzam / osszesDolgozoSzam) * 100 : 0

        const nemNyugtazottak = osszesDolgozo
          .filter((d) => !nyugtazottIds.has(d.id))
          .map((d) => ({
            nev: d.felhasznalo_profil?.nev ?? "Ismeretlen",
            email: d.felhasznalo_profil?.email ?? "",
          }))

        const isExpanded = expandedId === dok.id

        return (
          <Card key={dok.id} className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-semibold">{dok.cim}</CardTitle>
                    {dok.kotelezo_mindenkinek && (
                      <Badge variant="secondary" className="text-xs">Kötelező</Badge>
                    )}
                  </div>
                  {dok.leiras && (
                    <CardDescription className="mt-1 text-xs">{dok.leiras}</CardDescription>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Feltöltve: {new Date(dok.created_at).toLocaleDateString("hu-HU")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReminder(dok, nemNyugtazottak)}
                    disabled={isPending || nemNyugtazottak.length === 0}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Bell className="w-3 h-3" />
                    Emlékeztető ({nemNyugtazottak.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(dok.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {/* Összesítő progress bar */}
              <div className="flex items-center gap-3">
                <Progress value={arany} className="h-2 flex-1" />
                <span className="text-sm font-medium tabular-nums shrink-0">
                  {nyugtazottSzam} / {osszesDolgozoSzam} fő
                  <span className="text-muted-foreground ml-1">({Math.round(arany)}%)</span>
                </span>
              </div>

              {/* Részletes lista toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground gap-1 -ml-2"
                onClick={() => setExpandedId(isExpanded ? null : dok.id)}
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {isExpanded ? "Részletek elrejtése" : "Részletek megjelenítése"}
              </Button>

              {isExpanded && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Dolgozó neve</TableHead>
                        <TableHead className="text-xs">Státusz</TableHead>
                        <TableHead className="text-xs">Időpont</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">IP cím</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Nyugtázottak */}
                      {dok.hr_ceges_dokumentum_nyugtazas.map((n) => (
                        <TableRow key={n.id}>
                          <TableCell className="text-sm">
                            {n.hr_dolgozo_adatlap?.felhasznalo_profil?.nev ?? "Ismeretlen"}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Nyugtázva
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(n.nyugtazva_mikor).toLocaleString("hu-HU")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                            {n.ip_cim ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Nem nyugtázottak */}
                      {nemNyugtazottak.map((d) => (
                        <TableRow key={d.email} className="bg-destructive/3 hover:bg-destructive/5">
                          <TableCell className="text-sm">{d.nev}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Nem nyugtázta
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">—</TableCell>
                          <TableCell className="hidden md:table-cell">—</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
