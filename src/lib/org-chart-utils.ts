// org-chart-utils.ts
// Megosztott típusok és segédfüggvények a szervezeti ábrához.
// NINCS "use client" – meghívható szerver komponensből is.

export interface OrgDolgozo {
  id: string
  nev: string
  pozicio: string
}

export interface OrgUnitNode {
  id: string
  nev: string
  szulo_id: string | null
  dolgozok: OrgDolgozo[]
  gyerekek: OrgUnitNode[]
}

/**
 * Lapos szervezeti egység listából rekurzív fát épít.
 * A szulo_id NULL értékű elemek lesznek a gyökerek.
 */
export function buildOrgTree(
  units: { id: string; nev: string; szulo_id: string | null }[],
  dolgozokByUnit: Record<string, OrgDolgozo[]>
): OrgUnitNode[] {
  const nodeMap = new Map<string, OrgUnitNode>()

  units.forEach(u => {
    nodeMap.set(u.id, {
      id: u.id,
      nev: u.nev,
      szulo_id: u.szulo_id,
      dolgozok: dolgozokByUnit[u.id] || [],
      gyerekek: [],
    })
  })

  const roots: OrgUnitNode[] = []

  nodeMap.forEach(node => {
    if (node.szulo_id && nodeMap.has(node.szulo_id)) {
      nodeMap.get(node.szulo_id)!.gyerekek.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}
