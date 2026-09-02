"use client"

import { Badge } from "@/components/ui/badge"
import { Users, Building2, UserCircle2, ChevronDown, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"

import { type OrgDolgozo, type OrgUnitNode } from "@/lib/org-chart-utils"

// OrgDolgozo és OrgUnitNode típusok újraexportálása visszafelé kompatibilitáshoz
export type { OrgDolgozo, OrgUnitNode }

// ─── Dolgozó mini-kártya ─────────────────────────────────────────────────────

function DolgozoCard({ dolgozo }: { dolgozo: OrgDolgozo }) {
  const initials = dolgozo.nev
    ? dolgozo.nev.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?"
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
      <Avatar className="w-6 h-6 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{dolgozo.nev}</div>
        <div className="text-[10px] text-muted-foreground truncate">{dolgozo.pozicio}</div>
      </div>
    </div>
  )
}

// ─── Szervezeti egység doboz ─────────────────────────────────────────────────

function OrgUnitCard({ unit, depth }: { unit: OrgUnitNode; depth: number }) {
  const [collapsed, setCollapsed] = useState(false)

  const hasChildren = unit.gyerekek.length > 0
  const totalHeadcount = countHeadcount(unit)

  // Mélység szerinti szín árnyalás
  const depthColors: Record<number, string> = {
    0: "border-primary/40 bg-primary/5",
    1: "border-blue-400/40 bg-blue-400/5",
    2: "border-emerald-400/40 bg-emerald-400/5",
    3: "border-amber-400/40 bg-amber-400/5",
  }
  const cardColor = depthColors[Math.min(depth, 3)]

  return (
    <div className="flex flex-col items-center">
      {/* Egység doboz */}
      <div className={`border-2 rounded-xl w-64 shadow-sm z-10 relative overflow-hidden ${cardColor}`}>
        {/* Fejléc */}
        <button
          onClick={() => hasChildren && setCollapsed(c => !c)}
          className={`w-full flex items-center justify-between px-3 py-2.5 ${hasChildren ? "cursor-pointer" : "cursor-default"}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm text-foreground truncate">{unit.nev}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {totalHeadcount} fő
            </Badge>
            {hasChildren && (
              collapsed
                ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Dolgozók listája */}
        {unit.dolgozok.length > 0 && (
          <div className="px-2 pb-2 flex flex-col gap-1 border-t border-border/50">
            {unit.dolgozok.map(d => (
              <DolgozoCard key={d.id} dolgozo={d} />
            ))}
          </div>
        )}

        {/* Üres állapot */}
        {unit.dolgozok.length === 0 && (
          <div className="px-3 pb-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/50 pt-1.5">
            <UserCircle2 className="w-3 h-3" />
            Nincs hozzárendelt dolgozó
          </div>
        )}
      </div>

      {/* Gyerek egységek */}
      {hasChildren && !collapsed && (
        <>
          {/* Függőleges vonal lefelé */}
          <div className="h-6 w-px bg-border" />

          <div className="relative flex gap-6">
            {/* Vízszintes összekötő ha több gyerek van */}
            {unit.gyerekek.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: "50%",
                  right: "50%",
                  // A tényleges szélességet a gyerekek számából számítjuk: (n-1) * (256+24) / 2
                  width: `${(unit.gyerekek.length - 1) * 280}px`,
                  transform: `translateX(-50%)`,
                }}
              />
            )}

            {unit.gyerekek.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center relative">
                {/* Függőleges vonal a vízszintes vonaltól a kártyáig */}
                <div className="h-6 w-px bg-border" />
                <OrgUnitCard unit={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function countHeadcount(unit: OrgUnitNode): number {
  return unit.dolgozok.length + unit.gyerekek.reduce((sum, c) => sum + countHeadcount(c), 0)
}

// ─── Fő export komponens ─────────────────────────────────────────────────────

export function OrgChartTree({ rootUnits }: { rootUnits: OrgUnitNode[] }) {
  if (!rootUnits || rootUnits.length === 0) {
    return (
      <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground flex flex-col items-center gap-3">
        <Building2 className="w-10 h-10 text-muted-foreground/40" />
        <div>
          <p className="font-medium">Nincs szervezeti egység</p>
          <p className="text-sm mt-1">Hozzon létre szervezeti egységeket a &quot;Szervezeti egységek&quot; fülön.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto py-8 min-h-[40vh]">
      <div className="flex flex-nowrap justify-center gap-8 px-4 pb-8 items-start min-w-max mx-auto">
        {rootUnits.map(root => (
          <OrgUnitCard key={root.id} unit={root} depth={0} />
        ))}
      </div>
      <div className="mt-4 px-4 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border-2 border-primary/40 bg-primary/10" /> Főszint
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border-2 border-blue-400/40 bg-blue-400/10" /> 2. szint
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border-2 border-emerald-400/40 bg-emerald-400/10" /> 3. szint
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-auto">
          <Users className="w-3 h-3" /> Kattintson egy egységre a összecsukáshoz
        </span>
      </div>
    </div>
  )
}
