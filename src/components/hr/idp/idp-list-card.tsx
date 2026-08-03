"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CheckCircle2, Circle, Clock, MoreHorizontal, FileText, Trash2, Calendar } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { updateDevelopmentGoalStatus, deleteDevelopmentPlan, FejlesztesiTerv, FejlesztesiCel, IDPStatus } from "@/app/hr/actions/idp-actions"
import { IdpDialog } from "./idp-dialog"
import { useRouter } from "next/navigation"

interface IdpListCardProps {
  tervek: (FejlesztesiTerv & { celok: FejlesztesiCel[] })[]
  dolgozoId: string
  isManagerView?: boolean
}

export function IdpListCard({ tervek, dolgozoId, isManagerView = false }: IdpListCardProps) {
  const router = useRouter()

  if (!tervek || tervek.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Egyéni Fejlesztési Terv (IDP)</CardTitle>
          <CardDescription>Jelenleg nincsenek rögzített fejlesztési célok.</CardDescription>
        </CardHeader>
        <CardContent>
          {isManagerView && (
            <Button variant="outline" className="w-full">Új Terv Létrehozása</Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const handleStatusChange = async (celId: string, statusz: IDPStatus) => {
    const result = await updateDevelopmentGoalStatus(celId, statusz)
    if (result.success) {
      router.refresh()
    } else {
      console.error(result.error)
    }
  }

  const handleDeletePlan = async (tervId: string) => {
    if (confirm("Biztosan törölni szeretné ezt a fejlesztési tervet? Minden hozzá tartozó célkitűzés is törlődik!")) {
      const result = await deleteDevelopmentPlan(tervId)
      if (result.success) {
        router.refresh()
      } else {
        console.error(result.error)
      }
    }
  }

  const getStatusIcon = (statusz: IDPStatus) => {
    switch (statusz) {
      case "teljesitve": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "jovahagyasra_var": return <Clock className="w-4 h-4 text-amber-500" />
      case "folyamatban": return <Circle className="w-4 h-4 text-blue-500 fill-blue-500/20" />
      default: return <Circle className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (statusz: IDPStatus) => {
    switch (statusz) {
      case "teljesitve": return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0">Teljesítve</Badge>
      case "jovahagyasra_var": return <Badge variant="default" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0">Jóváhagyásra vár</Badge>
      case "folyamatban": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-0">Folyamatban</Badge>
      case "elmaradt": return <Badge variant="destructive">Elmaradt</Badge>
      default: return <Badge variant="outline">Nyitott</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {tervek.map(terv => {
        const totalGoals = terv.celok.length
        const completedGoals = terv.celok.filter(c => c.statusz === "teljesitve").length
        const progress = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100)

        return (
          <Card key={terv.id}>
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg">{terv.megnevezes}</CardTitle>
                <CardDescription>
                  {format(new Date(terv.created_at), "yyyy. MM. dd.")} - {terv.statusz}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">{progress}% Teljesítve</div>
                  {isManagerView && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeletePlan(terv.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Progress value={progress} className="w-[100px] h-2" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {terv.celok.map(cel => (
                  <div key={cel.id} className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getStatusIcon(cel.statusz)}</div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {cel.megnevezes}
                          {getStatusBadge(cel.statusz)}
                          {cel.tipus === 'kepzes' && <Badge variant="outline" className="text-xs">Képzés</Badge>}
                          {cel.tipus === 'nyelv' && <Badge variant="outline" className="text-xs">Nyelv</Badge>}
                        </div>
                        {cel.leiras && <p className="text-sm text-muted-foreground mt-1">{cel.leiras}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {cel.hatarido && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Határidő: {format(new Date(cel.hatarido), "yyyy. MM. dd.")}
                            </span>
                          )}
                          {cel.tanulmanyi_szerzodes_id && (
                            <span className="flex items-center gap-1 text-primary">
                              <FileText className="w-3 h-3" />
                              Szerződés csatolva
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Státusz módosítása</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {!isManagerView && cel.statusz !== 'teljesitve' && (
                             <>
                              <DropdownMenuItem onClick={() => handleStatusChange(cel.id, 'folyamatban')}>
                                Folyamatban
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(cel.id, 'jovahagyasra_var')}>
                                Kész (Jóváhagyásra vár)
                              </DropdownMenuItem>
                             </>
                          )}
                          {isManagerView && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(cel.id, 'teljesitve')} className="text-emerald-600">
                                Jóváhagyás (Teljesítve)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(cel.id, 'elmaradt')} className="text-destructive">
                                Elmaradt
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {isManagerView && (
                  <div className="pt-2">
                    <IdpDialog tervId={terv.id} dolgozoId={dolgozoId} buttonVariant="outline" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
