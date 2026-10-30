"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { createNewUser, updateUserRole, deleteUser } from "@/app/settings/settings-actions"
import type { DepartmentItem, TeamMemberItem } from "./departments-tab"

interface TeamTabProps {
  teamMembers: TeamMemberItem[]
  departments?: DepartmentItem[]
  currentUserId?: string
}

const roleMap: Record<string, string> = {
  admin: "Szuper Admin (Teszt)",
  rendszergazda: "Rendszergazda",
  vezeto: "Vezető",
  iktato: "Iktató",
  ugyintezo: "Ügyintéző"
}

const clearanceMap: Record<string, string> = {
  nyilt: "Nyílt",
  belso: "Belső",
  bizalmas: "Bizalmas",
  szigoruan_bizalmas: "Szigorúan Bizalmas"
}

export function TeamTab({ teamMembers, departments, currentUserId }: TeamTabProps) {
  const [createLoading, setCreateLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false)
  const [editRoleLoading, setEditRoleLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedMemberRole, setSelectedMemberRole] = useState<string>("")
  const [selectedMemberDepartment, setSelectedMemberDepartment] = useState<string>("")
  const [selectedMemberClearance, setSelectedMemberClearance] = useState<string>("nyilt")

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Csapat</CardTitle>
        <CardDescription>Felhasználók és hozzáférések kezelése</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {teamMembers?.map((member) => {
          const isSelf = member.id === currentUserId
          return (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 bg-card border rounded-xl hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all group"
            onClick={() => {
              setSelectedMember(member)
              setSelectedMemberRole(member.docs_szerepkor || "")
              setSelectedMemberDepartment(member.szervezeti_egyseg_id || "none")
              setSelectedMemberClearance(member.max_minosites || "nyilt")
              setEditRoleDialogOpen(true)
            }}
          >
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 shrink-0 bg-primary rounded-full flex items-center justify-center font-semibold text-sm text-primary-foreground">
                {member.nev?.substring(0, 1).toUpperCase() || "?"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{member.nev}</p>
                  {isSelf && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium py-0 h-4">
                      Te
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {member.pozicio || member.docs_szerepkor || "Nincs megadva"}
                  {departments?.find(d => d.id === member.szervezeti_egyseg_id) &&
                    ` • ${departments.find(d => d.id === member.szervezeti_egyseg_id)?.nev}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-border/80">
                {member.max_minosites ? (clearanceMap[member.max_minosites] || member.max_minosites) : "Nyílt"}
              </Badge>
              <Badge variant="secondary" className="uppercase font-semibold text-[10px] tracking-wider">
                {member.docs_szerepkor}
              </Badge>
              {!isSelf && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (confirm(`Biztosan törlöd a következő felhasználót: ${member.nev}?`)) {
                      const res = await deleteUser(member.id)
                      if (res.error) toast.error("Hiba", { description: res.error })
                    }
                  }}
                >
                  Törlés
                </Button>
              )}
            </div>
          </div>
        )})}
      </CardContent>
      <div className="px-0 py-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-foreground" />
            }
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Új felhasználó létrehozása
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form action={async (formData) => {
              setCreateLoading(true)
              const res = await createNewUser(formData)
              setCreateLoading(false)
              if (res.error) {
                toast.error("Hiba", { description: res.error })
              } else {
                toast.success("Sikeres", { description: "Sikeresen létrehozva!" })
                setOpen(false)
              }
            }}>
              <DialogHeader>
                <DialogTitle>Felhasználó létrehozása</DialogTitle>
                <DialogDescription>
                  Hozz létre egy új munkatársat a rendszerben.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nev">Teljes név</Label>
                  <Input id="nev" name="nev" placeholder="Kovács János" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email cím</Label>
                  <Input id="email" name="email" type="email" placeholder="munkatars@ceg.hu" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Jelszó</Label>
                  <Input id="password" name="password" type="password" placeholder="Min. 6 karakter" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Szerepkör</Label>
                  <select id="role" name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="admin">Szuper Admin (Teszt)</option>
                    <option value="rendszergazda">Rendszergazda</option>
                    <option value="iktato">Iratkezelő / iktató</option>
                    <option value="vezeto">Vezető / szignáló</option>
                    <option value="ugyintezo">Ügyintéző</option>
                    <option value="betekinto">Betekintő</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clearance">Biztonsági minősítés</Label>
                  <select id="clearance" name="clearance" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="nyilt">Nyílt</option>
                    <option value="belso">Belső</option>
                    <option value="bizalmas">Bizalmas</option>
                    <option value="szigoruan_bizalmas">Szigorúan Bizalmas</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? "Létrehozás..." : "Felhasználó létrehozása"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form action={async (formData) => {
              if (!selectedMember) return
              const isSelf = selectedMember.id === currentUserId
              const isSelfAdmin = isSelf && ['admin', 'rendszergazda'].includes(selectedMember.docs_szerepkor || selectedMember.szerepkor)
              const newRole = (formData.get("role") as string) || selectedMemberRole
              if (isSelfAdmin && !['admin', 'rendszergazda'].includes(newRole)) {
                toast.error("Hiba", { description: "Saját adminisztrátori szerepkörödet nem vonhatod vissza!" })
                return
              }
              setEditRoleLoading(true)
              const newDept = formData.get("departmentId") as string
              const newClearance = (formData.get("clearance") as string) || selectedMemberClearance || "nyilt"
              const deptId = newDept === "none" ? null : newDept
              const res = await updateUserRole(selectedMember.id, newRole, newClearance, deptId)
              setEditRoleLoading(false)
              if (res.error) {
                toast.error("Hiba", { description: res.error })
              } else {
                toast.success("Sikeres", { description: "Jogosultságok és biztonsági minősítés módosítva." })
                setEditRoleDialogOpen(false)
              }
            }}>
              <DialogHeader>
                <DialogTitle>Szerepkör és Jogosultság Módosítása</DialogTitle>
                <DialogDescription>
                  Módosíthatod a(z) <span className="font-semibold text-foreground">{selectedMember?.nev}</span> fiók szerepkörét és biztonsági szintjét.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {(() => {
                  const isSelf = selectedMember?.id === currentUserId
                  const isSelfAdmin = isSelf && ['admin', 'rendszergazda'].includes(selectedMember?.docs_szerepkor || selectedMember?.szerepkor)
                  return (
                    <div className="space-y-2">
                      <Label htmlFor="edit-role">Új Szerepkör</Label>
                      <Select
                        name="role"
                        value={selectedMemberRole}
                        onValueChange={(val) => setSelectedMemberRole(val || "")}
                        disabled={isSelfAdmin}
                        required
                      >
                        <SelectTrigger id="edit-role" className={isSelfAdmin ? "opacity-80 cursor-not-allowed bg-muted/40" : ""}>
                          <SelectValue placeholder="Válassz...">{roleMap[selectedMemberRole]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="rendszergazda">Rendszergazda</SelectItem>
                          <SelectItem value="vezeto">Vezető</SelectItem>
                          <SelectItem value="iktato">Iktató</SelectItem>
                          <SelectItem value="ugyintezo">Ügyintéző</SelectItem>
                        </SelectContent>
                      </Select>
                      {isSelfAdmin && (
                        <p className="text-[11px] text-amber-500 font-medium">
                          Saját adminisztrátori szerepköröd nem csökkenthető a rendszerből való kizáródás megelőzése érdekében.
                        </p>
                      )}
                    </div>
                  )
                })()}
                <div className="space-y-2">
                  <Label htmlFor="edit-dept">Szervezeti Egység</Label>
                  <Select name="departmentId" value={selectedMemberDepartment} onValueChange={(val) => setSelectedMemberDepartment(val || "none")}>
                    <SelectTrigger id="edit-dept">
                      <SelectValue placeholder="Nincs beosztva">
                        {selectedMemberDepartment === "none" ? "Nincs beosztva" : departments?.find((d: any) => d.id === selectedMemberDepartment)?.nev}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nincs beosztva</SelectItem>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.nev}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-clearance">Biztonsági Minősítés (Max. Hozzáférési Szint)</Label>
                  <Select name="clearance" value={selectedMemberClearance} onValueChange={(val) => setSelectedMemberClearance(val || "nyilt")}>
                    <SelectTrigger id="edit-clearance">
                      <SelectValue placeholder="Válassz minősítést...">
                        {clearanceMap[selectedMemberClearance] || selectedMemberClearance}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nyilt">Nyílt (Alapszint)</SelectItem>
                      <SelectItem value="belso">Belső</SelectItem>
                      <SelectItem value="bizalmas">Bizalmas</SelectItem>
                      <SelectItem value="szigoruan_bizalmas">Szigorúan Bizalmas</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Meghatározza, hogy a felhasználó milyen minősítésű iratokat és fájlokat tekinthet meg.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditRoleDialogOpen(false)}>Mégsem</Button>
                <Button type="submit" disabled={editRoleLoading}>
                  {editRoleLoading ? "Mentés..." : "Mentés"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  )
}
