"use client"

import { Badge } from "@/components/ui/badge"
import { Users, Crown, Building2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export type EmployeeNode = {
  id: string
  nev: string
  pozicio: string
  egyseg: string
  managerId?: string
  beosztottak: EmployeeNode[]
}

function EmployeeCard({ emp }: { emp: EmployeeNode }) {
  const hasChildren = emp.beosztottak && emp.beosztottak.length > 0
  const initials = emp.nev ? emp.nev.substring(0, 2).toUpperCase() : "?"

  return (
    <div className="flex flex-col items-center">
      {/* Kártya */}
      <div className="p-0 border-2 border-primary/20 rounded-lg bg-card w-72 shadow-sm z-10 relative overflow-hidden">
        
        {/* Test */}
        <div className="p-4 flex flex-col gap-3">
          
          {/* Fő szekció */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left flex-1 min-w-0">
              <div className="font-semibold text-foreground truncate">{emp.nev}</div>
              <div className="text-sm text-primary font-medium truncate flex items-center gap-1">
                {hasChildren && <Crown className="w-3 h-3" />}
                {emp.pozicio}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 p-1.5 rounded border">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{emp.egyseg}</span>
          </div>

          {/* Beosztottak statisztika (opcionális, de jó látni) */}
          {hasChildren && (
            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Beosztottak száma</span>
              <Badge variant="secondary" className="font-mono text-[10px] px-1">{emp.beosztottak.length}</Badge>
            </div>
          )}

        </div>
      </div>

      {/* Ha vannak beosztottak, rajzoljuk ki a fát */}
      {hasChildren && (
        <>
          {/* Függőleges vonal lefelé a kártyából */}
          <div className="h-8 w-px bg-border"></div>

          {/* Gyerekek konténere */}
          <div className="flex gap-8 relative">
            {/* Vízszintes összekötő vonal, ha több beosztott van */}
            {emp.beosztottak.length > 1 && (
              <div className="absolute top-0 left-36 right-36 h-px bg-border"></div>
            )}
            
            {/* Beosztottak renderelése */}
            {emp.beosztottak.map((child) => (
              <div key={child.id} className="flex flex-col items-center relative pt-4">
                {/* Függőleges vonal a vízszintes vonaltól a kártyáig */}
                <div className="absolute top-0 w-px h-4 bg-border"></div>
                <EmployeeCard emp={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function OrgChartTree({ rootUnits }: { rootUnits: EmployeeNode[] }) {
  if (!rootUnits || rootUnits.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
        Nincsenek dolgozók, vagy nincsenek beállítva a közvetlen vezetők.
      </div>
    )
  }

  return (
    <div className="flex justify-center py-8 overflow-x-auto min-h-[50vh]">
      {/* Ha több gyökér van (pl. 2 egyenrangú igazgató), egymás mellé tesszük őket */}
      <div className="flex flex-nowrap justify-center gap-16 min-w-max px-8 pb-8">
        {rootUnits.map(root => (
          <EmployeeCard key={root.id} emp={root} />
        ))}
      </div>
    </div>
  )
}
