"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type EmployeeNode = {
  id: string
  nev: string
  pozicio: string | null
  kozvetlen_vezeto: string | null
  children?: EmployeeNode[]
}

function OrgNode({ node }: { node: EmployeeNode }) {
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="flex flex-col items-center">
      {/* A dolgozó kártyája */}
      <div className="p-4 border-2 border-primary/20 rounded-lg bg-card text-center w-64 shadow-sm z-10 relative">
        <div className="font-semibold">{node.nev}</div>
        <div className="text-sm text-muted-foreground">{node.pozicio || "Nincs pozíció"}</div>
        {hasChildren && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {node.children!.length} Beosztott
            </Badge>
          </div>
        )}
      </div>

      {/* Ha vannak beosztottjai, rajzoljuk ki őket */}
      {hasChildren && (
        <>
          {/* Függőleges vonal lefelé a kártyából */}
          <div className="h-8 w-px bg-border"></div>

          {/* Gyerekek konténere */}
          <div className="flex gap-12 relative">
            {/* Vízszintes összekötő vonal, ha több gyerek van (a doboz szélessége w-64 azaz 16rem/256px, a közepe 128px azaz left-32/right-32) */}
            {node.children!.length > 1 && (
              <div className="absolute top-0 left-32 right-32 h-px bg-border"></div>
            )}
            
            {/* Egyetlen gyerek esetén nincs szükség vízszintes vonalra */}
            {node.children!.map((child) => (
              <div key={child.id} className="flex flex-col items-center relative pt-4">
                {/* Függőleges vonal a vízszintes vonaltól a gyerekkártyáig */}
                <div className="absolute top-0 w-px h-4 bg-border"></div>
                <OrgNode node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function OrgChartTree({ employees }: { employees: EmployeeNode[] }) {
  // 1. Felépítjük a fát
  // Akihez nincs vezető írva, vagy a vezetője nincs a listában, az gyökér elem lesz.
  
  const employeeMap = new Map<string, EmployeeNode>()
  const rootNodes: EmployeeNode[] = []

  // Inicializáljuk a map-et
  employees.forEach(emp => {
    employeeMap.set(emp.nev, { ...emp, children: [] })
  })

  // Bejárjuk az embereket és hozzácsatoljuk a vezetőjükhöz
  employees.forEach(emp => {
    const node = employeeMap.get(emp.nev)!
    
    if (emp.kozvetlen_vezeto) {
      const manager = employeeMap.get(emp.kozvetlen_vezeto)
      if (manager) {
        manager.children!.push(node)
      } else {
        // Ha nem találjuk a vezetőt (mert pl. el van gépelve a neve), rootként kezeljük
        rootNodes.push(node)
      }
    } else {
      // Nincs megadva vezető -> Root
      rootNodes.push(node)
    }
  })

  if (rootNodes.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
        Nincsenek dolgozók a szervezetben.
      </div>
    )
  }

  return (
    <div className="flex justify-center py-12">
      {/* Ha több gyökér van (több főnök), egymás mellé tesszük őket, ha nem férnek ki, akkor új sorba tördeljük */}
      <div className="flex flex-wrap justify-center gap-12 max-w-full">
        {rootNodes.map(root => (
          <div key={root.id} className="min-w-fit">
            <OrgNode node={root} />
          </div>
        ))}
      </div>
    </div>
  )
}
