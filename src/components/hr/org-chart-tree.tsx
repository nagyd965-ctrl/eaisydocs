"use client"

import { Badge } from "@/components/ui/badge"
import { Users, User, Crown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export type EmployeeNode = {
  id: string
  nev: string
  pozicio: string | null
}

export type OrgUnitNode = {
  id: string
  nev: string
  szulo_id: string | null
  vezeto?: EmployeeNode
  beosztottak: EmployeeNode[]
  children: OrgUnitNode[]
}

function OrgUnitCard({ unit }: { unit: OrgUnitNode }) {
  const hasChildren = unit.children && unit.children.length > 0
  const vezetoNev = unit.vezeto?.nev || "Nincs kijelölt vezető"
  const initials = unit.vezeto?.nev ? unit.vezeto.nev.substring(0, 2).toUpperCase() : "?"

  return (
    <div className="flex flex-col items-center">
      {/* Szervezeti Egység Kártya */}
      <div className="p-0 border-2 border-primary/20 rounded-lg bg-card w-72 shadow-sm z-10 relative overflow-hidden">
        
        {/* Fejléc: Egység neve */}
        <div className="bg-primary/5 border-b p-3 text-center">
          <div className="font-semibold text-primary">{unit.nev}</div>
        </div>

        {/* Test: Vezető és beosztottak */}
        <div className="p-4 flex flex-col gap-3">
          
          {/* Vezető szekció */}
          <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-md border border-border/50">
            <Avatar className="w-8 h-8">
              <AvatarFallback className={unit.vezeto ? "bg-primary text-primary-foreground text-xs font-semibold" : "bg-muted text-muted-foreground text-xs"}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{vezetoNev}</div>
              <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-500" />
                Egységvezető
              </div>
            </div>
          </div>

          {/* Beosztottak statisztika / lista */}
          <div className="pt-2 border-t flex flex-col gap-2">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Munkatársak</span>
              <Badge variant="secondary" className="font-mono text-[10px] px-1">{unit.beosztottak.length}</Badge>
            </div>
            
            {unit.beosztottak.length > 0 && (
              <div className="text-xs text-left text-muted-foreground max-h-32 overflow-y-auto space-y-1.5 mt-1 pr-1">
                {unit.beosztottak.map(emp => (
                  <div key={emp.id} className="truncate flex items-center gap-1.5">
                    <User className="w-3 h-3 opacity-50 flex-shrink-0" />
                    <span className="truncate">{emp.nev} <span className="opacity-70">({emp.pozicio})</span></span>
                  </div>
                ))}
              </div>
            )}
            
            {unit.beosztottak.length === 0 && (
              <div className="text-xs text-muted-foreground/50 text-center italic py-2">
                Nincsenek további dolgozók.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Ha vannak alegységek, rajzoljuk ki őket */}
      {hasChildren && (
        <>
          {/* Függőleges vonal lefelé a kártyából */}
          <div className="h-8 w-px bg-border"></div>

          {/* Gyerekek konténere */}
          <div className="flex gap-8 relative">
            {/* Vízszintes összekötő vonal, ha több alegység van */}
            {unit.children.length > 1 && (
              <div className="absolute top-0 left-36 right-36 h-px bg-border"></div>
            )}
            
            {/* Alegységek renderelése */}
            {unit.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center relative pt-4">
                {/* Függőleges vonal a vízszintes vonaltól a kártyáig */}
                <div className="absolute top-0 w-px h-4 bg-border"></div>
                <OrgUnitCard unit={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function OrgChartTree({ rootUnits }: { rootUnits: OrgUnitNode[] }) {
  if (!rootUnits || rootUnits.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
        Nincsenek szervezeti egységek. Kérjük, először hozza létre a vállalati struktúrát.
      </div>
    )
  }

  return (
    <div className="flex justify-center py-8 overflow-x-auto min-h-[50vh]">
      {/* Ha több gyökéregység van, egymás mellé tesszük őket */}
      <div className="flex flex-nowrap justify-center gap-16 min-w-max px-8 pb-8">
        {rootUnits.map(root => (
          <OrgUnitCard key={root.id} unit={root} />
        ))}
      </div>
    </div>
  )
}
