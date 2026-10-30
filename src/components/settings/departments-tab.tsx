"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Network, 
  Building2, 
  Search, 
  Plus, 
  Users, 
  Crown, 
  Edit, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  ChevronDown, 
  ChevronRight, 
  UserCircle2, 
  ShieldCheck, 
  Lock 
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { TeamTab } from "./team-tab"
import { 
  createDepartment, 
  updateDepartment, 
  deleteDepartment, 
  addUsersToDepartment, 
  removeUserFromDepartment 
} from "@/app/settings/settings-actions"

export const DOCS_ROLE_LABELS: Record<string, string> = {
  admin: "Szuper Admin",
  rendszergazda: "Rendszergazda",
  iktato: "Iratkezelő / iktató",
  vezeto: "Vezető / szignáló",
  ugyintezo: "Ügyintéző",
  betekinto: "Betekintő",
  auditor: "Auditor"
}

export const CLEARANCE_LABELS: Record<string, string> = {
  nyilt: "Nyílt",
  belso: "Belső",
  bizalmas: "Bizalmas",
  szigoruan_bizalmas: "Szigorúan bizalmas"
}

export interface DepartmentItem {
  id: string
  nev: string
  szulo_id?: string | null
  iktato_prefix?: string | null
  vezeto_id?: string | null
  company_id?: string | null
  vezeto?: {
    id: string
    nev: string
    avatar_url?: string | null
    docs_szerepkor?: string | null
    max_minosites?: string | null
  } | null
}

export interface TeamMemberItem {
  id: string
  nev: string
  email?: string | null
  avatar_url?: string | null
  docs_szerepkor?: string | null
  szerepkor?: string | null
  max_minosites?: string | null
  szervezeti_egyseg_id?: string | null
  pozicio?: string | null
}

interface DepartmentsTabProps {
  departments: DepartmentItem[]
  teamMembers: TeamMemberItem[]
  currentUserId?: string
}

// ─── Rekurzív Fa Típusok & Építés ──────────────────────────────────────────

interface DocsOrgNode {
  id: string
  nev: string
  szulo_id: string | null
  iktato_prefix: string | null
  vezeto: DepartmentItem["vezeto"]
  members: TeamMemberItem[]
  children: DocsOrgNode[]
}

function buildDocsOrgTree(
  units: DepartmentItem[],
  membersByDept: Record<string, TeamMemberItem[]>
): DocsOrgNode[] {
  const nodeMap = new Map<string, DocsOrgNode>()

  units.forEach(u => {
    nodeMap.set(u.id, {
      id: u.id,
      nev: u.nev,
      szulo_id: u.szulo_id || null,
      iktato_prefix: u.iktato_prefix || null,
      vezeto: u.vezeto || null,
      members: membersByDept[u.id] || [],
      children: [],
    })
  })

  const roots: DocsOrgNode[] = []

  nodeMap.forEach(node => {
    if (node.szulo_id && nodeMap.has(node.szulo_id) && node.szulo_id !== node.id) {
      nodeMap.get(node.szulo_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function countTotalMembers(node: DocsOrgNode): number {
  return node.members.length + node.children.reduce((sum, c) => sum + countTotalMembers(c), 0)
}

// ─── Fa Komponens (DocsOrgChartTree) ──────────────────────────────────────────

function DocsOrgUnitCard({ node, depth }: { node: DocsOrgNode; depth: number }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = node.children.length > 0
  const totalCount = countTotalMembers(node)

  const depthColors: Record<number, string> = {
    0: "border-primary/50 bg-primary/5",
    1: "border-info/50 bg-info/5",
    2: "border-success/50 bg-success/5",
    3: "border-warning/50 bg-warning/5",
  }
  const cardColor = depthColors[Math.min(depth, 3)]

  return (
    <div className="flex flex-col items-center">
      {/* Egység doboz */}
      <div className={`border-2 rounded-xl w-72 z-10 relative overflow-hidden transition-all shadow-none ${cardColor}`}>
        {/* Fejléc */}
        <button
          type="button"
          onClick={() => hasChildren && setCollapsed(c => !c)}
          className={`w-full flex items-center justify-between px-3.5 py-3 ${hasChildren ? "cursor-pointer hover:bg-muted/40" : "cursor-default"} transition-colors`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-background/80 border flex items-center justify-center shrink-0 text-primary">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-foreground truncate">{node.nev}</span>
                {node.iktato_prefix && (
                  <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 h-4 bg-background border-primary/30 text-primary">
                    {node.iktato_prefix}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono tabular-nums">
              {totalCount} fő
            </Badge>
            {hasChildren && (
              collapsed
                ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Vezető kiemelés */}
        {node.vezeto?.nev && (
          <div className="px-3 py-1.5 bg-background/60 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-500" />
              Vezető:
            </span>
            <span className="font-medium text-foreground truncate max-w-[150px]">{node.vezeto.nev}</span>
          </div>
        )}

        {/* Munkatársak lista */}
        {node.members.length > 0 && (
          <div className="px-2.5 pb-2.5 pt-1.5 flex flex-col gap-1 border-t border-border/40 bg-background/40">
            {node.members.slice(0, 5).map(m => {
              const initials = m.nev.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
              const isLeader = m.id === node.vezeto?.id
              return (
                <div key={m.id} className="flex items-center justify-between px-2 py-1 rounded-md bg-card border border-border/40 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Avatar className="w-5 h-5 shrink-0">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-foreground font-medium text-[11px]">{m.nev}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isLeader && (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] px-1 py-0 h-3.5 border-amber-500/30">
                        Vezető
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-muted/50 border text-muted-foreground">
                      {DOCS_ROLE_LABELS[m.docs_szerepkor || "ugyintezo"] || m.docs_szerepkor}
                    </Badge>
                  </div>
                </div>
              )
            })}
            {node.members.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center pt-0.5 font-medium">
                + még {node.members.length - 5} munkatárs...
              </p>
            )}
          </div>
        )}

        {node.members.length === 0 && (
          <div className="px-3 py-2 flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/40 bg-background/40">
            <UserCircle2 className="w-3.5 h-3.5" />
            Nincs hozzárendelt munkatárs
          </div>
        )}
      </div>

      {/* Gyermek egységek */}
      {hasChildren && !collapsed && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="relative flex gap-6">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: "50%",
                  right: "50%",
                  width: `${(node.children.length - 1) * 312}px`,
                  transform: `translateX(-50%)`,
                }}
              />
            )}
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center relative">
                <div className="h-6 w-px bg-border" />
                <DocsOrgUnitCard node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DocsOrgChartTree({ rootNodes }: { rootNodes: DocsOrgNode[] }) {
  if (!rootNodes || rootNodes.length === 0) {
    return (
      <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground flex flex-col items-center gap-3">
        <Building2 className="w-10 h-10 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-foreground">Nincsenek szervezeti egységek</p>
          <p className="text-xs text-muted-foreground mt-1">Hozz létre szervezeti egységeket a fenti fülön vagy a táblázatban.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto py-6 min-h-[380px]">
      <div className="flex flex-nowrap justify-center gap-8 px-4 pb-6 items-start min-w-max mx-auto">
        {rootNodes.map(root => (
          <DocsOrgUnitCard key={root.id} node={root} depth={0} />
        ))}
      </div>
      <div className="mt-4 px-4 flex items-center gap-4 flex-wrap border-t pt-4">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
          <span className="inline-block w-3 h-3 rounded border-2 border-primary/50 bg-primary/10" /> Főszint
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
          <span className="inline-block w-3 h-3 rounded border-2 border-info/50 bg-info/10" /> 2. szint
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
          <span className="inline-block w-3 h-3 rounded border-2 border-success/50 bg-success/10" /> 3. szint
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
          <span className="inline-block w-3 h-3 rounded border-2 border-warning/50 bg-warning/10" /> 4.+ szint
        </span>
      </div>
    </div>
  )
}

// ─── Fő Komponens: DepartmentsTab ──────────────────────────────────────────

export function DepartmentsTab({ departments, teamMembers, currentUserId }: DepartmentsTabProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("orgunits")
  const [searchTerm, setSearchTerm] = useState("")

  // Modál állapotok
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [membersOpen, setMembersOpen] = useState(false)
  const [selectedDeptForMembers, setSelectedDeptForMembers] = useState<DepartmentItem | null>(null)

  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [selectedDeptForAdd, setSelectedDeptForAdd] = useState<string | null>(null)
  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState<string[]>([])
  const [addMembersLoading, setAddMembersLoading] = useState(false)

  // Munkatársak szervezeti egységenként csoportosítva
  const membersByDept = useMemo(() => {
    const map: Record<string, TeamMemberItem[]> = {}
    teamMembers.forEach(m => {
      if (m.szervezeti_egyseg_id) {
        if (!map[m.szervezeti_egyseg_id]) map[m.szervezeti_egyseg_id] = []
        map[m.szervezeti_egyseg_id].push(m)
      }
    })
    return map
  }, [teamMembers])

  // Szűrt szervezeti egységek táblázathoz
  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) return departments
    const q = searchTerm.toLowerCase().trim()
    return departments.filter(d => 
      d.nev.toLowerCase().includes(q) || 
      (d.iktato_prefix && d.iktato_prefix.toLowerCase().includes(q))
    )
  }, [departments, searchTerm])

  // Fa felépítése
  const rootNodes = useMemo(() => {
    return buildDocsOrgTree(departments, membersByDept)
  }, [departments, membersByDept])

  // Létrehozás mentése
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await createDepartment(formData)
    setCreateLoading(false)

    if (res?.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Szervezeti egység sikeresen létrehozva!" })
      setCreateOpen(false)
      router.refresh()
    }
  }

  // Módosítás mentése
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingDept) return
    setEditLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await updateDepartment(editingDept.id, formData)
    setEditLoading(false)

    if (res?.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Szervezeti egység sikeresen módosítva!" })
      setEditOpen(false)
      setEditingDept(null)
      router.refresh()
    }
  }

  // Törlés végrehajtása
  const handleDeleteConfirm = async () => {
    if (!deletingDept) return
    setDeleteLoading(true)
    const res = await deleteDepartment(deletingDept.id)
    setDeleteLoading(false)

    if (res?.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Szervezeti egység sikeresen törölve!" })
      setDeleteOpen(false)
      setDeletingDept(null)
      router.refresh()
    }
  }

  // Munkatársak hozzáadása szervezeti egységhez
  const handleAddMembersSubmit = async () => {
    if (!selectedDeptForAdd || selectedUserIdsToAdd.length === 0) return
    setAddMembersLoading(true)
    const res = await addUsersToDepartment(selectedDeptForAdd, selectedUserIdsToAdd)
    setAddMembersLoading(false)

    if (res?.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Munkatársak sikeresen hozzárendelve az osztályhoz!" })
      setAddMembersOpen(false)
      setSelectedUserIdsToAdd([])
      setSelectedDeptForAdd(null)
      router.refresh()
    }
  }

  // Munkatárs eltávolítása szervezeti egységből
  const handleRemoveMember = async (userId: string, deptId: string) => {
    const res = await removeUserFromDepartment(userId, deptId)
    if (res?.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Munkatárs eltávolítva a szervezeti egységből." })
      router.refresh()
    }
  }

  // Aktuális osztály tagjai a megtekintő dialógushoz
  const currentDeptMembers = selectedDeptForMembers ? (membersByDept[selectedDeptForMembers.id] || []) : []

  return (
    <div className="space-y-6">
      {/* Al-fülek: Szervezeti Ábra vs Szervezeti Egységek */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 mb-4">
          <TabsTrigger
            value="orgunits"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
          >
            <Building2 className="w-4 h-4" />
            Szervezeti Egységek
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground tabular-nums">
              {departments.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="orgchart"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
          >
            <Network className="w-4 h-4" />
            Szervezeti Ábra
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
          >
            <Users className="w-4 h-4" />
            Csapat
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground tabular-nums">
              {teamMembers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* 1. AL-FÜL: SZERVEZETI EGYSÉGEK TÁBLÁZAT */}
        <TabsContent value="orgunits" className="space-y-4 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Szervezeti Egységek</CardTitle>
                <CardDescription>
                  A cég felépítését alkotó osztályok, részlegek, iktató prefixek és felelős vezetők kezelése.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Keresés névre vagy prefixre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background h-9 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Megnevezés</TableHead>
                      <TableHead>Iktató prefix</TableHead>
                      <TableHead>Szülő egység</TableHead>
                      <TableHead>Osztályvezető</TableHead>
                      <TableHead className="text-center">Hozzárendelt munkatársak</TableHead>
                      <TableHead className="text-right pr-6">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartments.length > 0 ? (
                      filteredDepartments.map((dept) => {
                        const parentDept = departments.find(d => d.id === dept.szulo_id)
                        const deptUsers = membersByDept[dept.id] || []

                        return (
                          <TableRow key={dept.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="pl-6 font-medium">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <span className="font-semibold text-foreground text-sm">{dept.nev}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {dept.iktato_prefix ? (
                                <Badge variant="outline" className="font-mono text-xs border-primary/30 bg-primary/5 text-primary">
                                  {dept.iktato_prefix}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {parentDept ? (
                                <span className="font-medium text-foreground">{parentDept.nev}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">— Főszint —</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {dept.vezeto?.nev ? (
                                <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/5 gap-1.5 py-0.5">
                                  <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span>{dept.vezeto.nev}</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground border-dashed py-0.5">
                                  Nincs kijelölt vezető
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDeptForMembers(dept)
                                  setMembersOpen(true)
                                }}
                                className="h-7 text-xs gap-1.5 px-2.5 hover:border-primary/50"
                              >
                                <Users className="w-3.5 h-3.5 text-primary" />
                                <span className="tabular-nums font-semibold">{deptUsers.length} fő</span>
                              </Button>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                  title="Tagok hozzáadása"
                                  onClick={() => {
                                    setSelectedDeptForAdd(dept.id)
                                    setSelectedUserIdsToAdd([])
                                    setAddMembersOpen(true)
                                  }}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                  title="Szerkesztés"
                                  onClick={() => {
                                    setEditingDept(dept)
                                    setEditOpen(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  title="Törlés"
                                  onClick={() => {
                                    setDeletingDept(dept)
                                    setDeleteOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                          {searchTerm ? "Nem található a keresésnek megfelelő szervezeti egység." : "Még nincsenek szervezeti egységek létrehozva."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/5">
              <Button 
                variant="outline" 
                onClick={() => setCreateOpen(true)}
                className="w-full border-dashed border-2 py-5 text-muted-foreground hover:text-foreground hover:border-primary/50 gap-2"
              >
                <Plus className="h-4 w-4" />
                Új szervezeti egység létrehozása
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* 2. AL-FÜL: SZERVEZETI ÁBRA */}
        <TabsContent value="orgchart" className="space-y-4 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg font-semibold">
                Vállalati Hierarchia
              </CardTitle>
              <CardDescription>
                Interaktív vizuális fanézet az osztályok, vezetők és iratkezelési beosztások kapcsolatáról.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 overflow-x-auto min-h-[420px]">
              <DocsOrgChartTree rootNodes={rootNodes} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. AL-FÜL: CSAPAT (felhasználók és hozzáférések) */}
        <TabsContent value="team" className="space-y-4 outline-none">
          <TeamTab
            teamMembers={teamMembers}
            departments={departments}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>

      {/* ─── DIALÓGUSOK ──────────────────────────────────────────────────────── */}

      {/* 1. Létrehozás dialógus */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Új szervezeti egység létrehozása</DialogTitle>
              <DialogDescription>
                Add meg az osztály nevét, szülő egységét, iktató prefixét és felelős vezetőjét.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-nev">Megnevezés *</Label>
                <Input id="create-nev" name="nev" placeholder="pl. Pénzügyi Osztály" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-prefix">Iktató prefix (opcionális)</Label>
                <Input 
                  id="create-prefix" 
                  name="iktato_prefix" 
                  placeholder="pl. PENZ vagy HR" 
                  maxLength={10}
                  className="font-mono uppercase"
                  onChange={(e) => { e.target.value = e.target.value.toUpperCase() }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Az ide beosztott iratok iktatószámának egyedi előtagja (pl. PENZ/2026/00001).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-szulo">Szülő szervezeti egység</Label>
                <Select name="szulo_id" defaultValue="__none__">
                  <SelectTrigger id="create-szulo" className="bg-background">
                    <SelectValue placeholder="Válassz szülő egységet..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nincs (Főszint) —</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.nev} {d.iktato_prefix ? `[${d.iktato_prefix}]` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-vezeto">Osztályvezető</Label>
                <Select name="vezeto_id" defaultValue="__none__">
                  <SelectTrigger id="create-vezeto" className="bg-background">
                    <SelectValue placeholder="Válassz vezetőt..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nincs kijelölt vezető</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nev} ({DOCS_ROLE_LABELS[m.docs_szerepkor || "ugyintezo"] || m.docs_szerepkor})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  A szignálások és a 3 napon túli határidő-túllépések automatikusan hozzá futnak be.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Mégse
              </Button>
              <Button type="submit" disabled={createLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {createLoading ? "Létrehozás..." : "Egység létrehozása"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Szerkesztés dialógus */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          {editingDept && (
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Szervezeti egység módosítása</DialogTitle>
                <DialogDescription>
                  {editingDept.nev} adatainak és beállításainak szerkesztése.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nev">Megnevezés *</Label>
                  <Input id="edit-nev" name="nev" defaultValue={editingDept.nev} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-prefix">Iktató prefix</Label>
                  <Input 
                    id="edit-prefix" 
                    name="iktato_prefix" 
                    defaultValue={editingDept.iktato_prefix || ""} 
                    placeholder="pl. PENZ" 
                    maxLength={10}
                    className="font-mono uppercase"
                    onChange={(e) => { e.target.value = e.target.value.toUpperCase() }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Iktatószám előtagja (pl. {editingDept.iktato_prefix || "PENZ"}/2026/00001).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-szulo">Szülő szervezeti egység</Label>
                  <Select name="szulo_id" defaultValue={editingDept.szulo_id || "__none__"}>
                    <SelectTrigger id="edit-szulo" className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nincs (Főszint) —</SelectItem>
                      {departments.filter(d => d.id !== editingDept.id).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nev} {d.iktato_prefix ? `[${d.iktato_prefix}]` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-vezeto">Osztályvezető</Label>
                  <Select name="vezeto_id" defaultValue={editingDept.vezeto_id || "__none__"}>
                    <SelectTrigger id="edit-vezeto" className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nincs kijelölt vezető</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nev} ({DOCS_ROLE_LABELS[m.docs_szerepkor || "ugyintezo"] || m.docs_szerepkor})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Mégse
                </Button>
                <Button type="submit" disabled={editLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {editLoading ? "Mentés..." : "Módosítás mentése"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Törlés dialógus */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Szervezeti egység törlése
            </DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd a(z) <strong>{deletingDept?.nev}</strong> szervezeti egységet?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-1">
            <p>• Az ide beosztott munkatársak nem törlődnek, de az osztály-hozzárendelésük törlésre kerül.</p>
            <p>• Ha léteztek alárendelt egységek, azok automatikusan főszintre kerülnek.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Mégse
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              disabled={deleteLoading} 
              onClick={handleDeleteConfirm}
            >
              {deleteLoading ? "Törlés..." : "Igen, végleges törlés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Tagok megtekintése & kezelése modál */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {selectedDeptForMembers?.nev} munkatársai
              </DialogTitle>
            </div>
            <DialogDescription>
              A szervezeti egységhez beosztott dolgozók, iratkezelési szerepkörük és minősítési szintjük.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 max-h-[380px] overflow-y-auto">
            {currentDeptMembers.length > 0 ? (
              currentDeptMembers.map((m) => {
                const isLeader = m.id === selectedDeptForMembers?.vezeto_id
                const initials = m.nev.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()

                return (
                  <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-8 h-8 shrink-0">
                        {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{m.nev}</p>
                          {isLeader && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0 h-4 border-amber-500/30 gap-1">
                              <Crown className="w-2.5 h-2.5" /> Vezető
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{m.email || ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-background">
                          {DOCS_ROLE_LABELS[m.docs_szerepkor || "ugyintezo"] || m.docs_szerepkor}
                        </Badge>
                        {m.max_minosites && (
                          <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            {CLEARANCE_LABELS[m.max_minosites] || m.max_minosites}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Eltávolítás az egységből"
                        onClick={() => {
                          if (selectedDeptForMembers) {
                            handleRemoveMember(m.id, selectedDeptForMembers.id)
                          }
                        }}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Ebben a szervezeti egységben jelenleg nincsenek munkatársak.
              </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between items-center w-full pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                if (selectedDeptForMembers) {
                  setSelectedDeptForAdd(selectedDeptForMembers.id)
                  setSelectedUserIdsToAdd([])
                  setAddMembersOpen(true)
                }
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Tag hozzáadása
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMembersOpen(false)}>
              Bezárás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Tagok hozzáadása dialógus */}
      <Dialog open={addMembersOpen} onOpenChange={setAddMembersOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Munkatársak hozzárendelése</DialogTitle>
            <DialogDescription>
              Válaszd ki azokat a kollégákat, akiket be szeretnél osztani ebbe a szervezeti egységbe.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 max-h-[300px] overflow-y-auto">
            {teamMembers.filter(m => m.szervezeti_egyseg_id !== selectedDeptForAdd).length > 0 ? (
              teamMembers.filter(m => m.szervezeti_egyseg_id !== selectedDeptForAdd).map((m) => {
                const isSelected = selectedUserIdsToAdd.includes(m.id)
                const currentDept = departments.find(d => d.id === m.szervezeti_egyseg_id)

                return (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUserIdsToAdd(prev => [...prev, m.id])
                          } else {
                            setSelectedUserIdsToAdd(prev => prev.filter(id => id !== m.id))
                          }
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.nev}</p>
                        <p className="text-xs text-muted-foreground">{m.email || ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">
                        {DOCS_ROLE_LABELS[m.docs_szerepkor || "ugyintezo"] || m.docs_szerepkor}
                      </Badge>
                      {currentDept && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Jelenleg: {currentDept.nev}
                        </p>
                      )}
                    </div>
                  </label>
                )
              })
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Minden munkatárs már be van osztva ebbe a szervezeti egységbe.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMembersOpen(false)}>
              Mégse
            </Button>
            <Button
              disabled={selectedUserIdsToAdd.length === 0 || addMembersLoading}
              onClick={handleAddMembersSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {addMembersLoading ? "Mentés..." : `Hozzáadás (${selectedUserIdsToAdd.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
