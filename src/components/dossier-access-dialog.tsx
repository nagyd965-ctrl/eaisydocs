"use client"

import { useState, useEffect } from "react"
import { 
  Users, 
  ShieldPlus, 
  Trash2, 
  UserCheck, 
  Loader2, 
  Building2, 
  ShieldAlert,
  Share2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { 
  getDossierExplicitAccess, 
  grantDossierExplicitAccess, 
  revokeDossierExplicitAccess 
} from "@/app/dossiers/[id]/access-actions"

interface DossierAccessDialogProps {
  ugyiratId: string
  iktatoszam: string
  canManage: boolean
  allUsers: any[]
}

export function DossierAccessDialog({
  ugyiratId,
  iktatoszam,
  canManage,
  allUsers = [],
}: DossierAccessDialogProps) {
  const [open, setOpen] = useState(false)
  const [accessList, setAccessList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadAccessList = async () => {
    setLoading(true)
    const res = await getDossierExplicitAccess(ugyiratId)
    if (res.success) {
      setAccessList(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      loadAccessList()
    }
  }, [open, ugyiratId])

  const handleGrant = async () => {
    if (!selectedUserId) {
      toast.error("Válassz ki egy munkatársat a listából!")
      return
    }

    setSubmitting(true)
    const res = await grantDossierExplicitAccess(ugyiratId, selectedUserId, reason.trim())
    setSubmitting(false)

    if (res.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Hozzáférést engedélyezve", {
        description: "A munkatárs mostantól hozzáfér ehhez az ügyirathoz az osztályhatároktól függetlenül."
      })
      setSelectedUserId("")
      setReason("")
      loadAccessList()
    }
  }

  const handleRevoke = async (userId: string, userName: string) => {
    if (!confirm(`Biztosan visszavonod ${userName} hozzáférését ehhez az ügyirathoz?`)) {
      return
    }

    const res = await revokeDossierExplicitAccess(ugyiratId, userId)
    if (res.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Hozzáférést visszavonva", {
        description: `${userName} hozzáférése sikeresen törölve.`
      })
      loadAccessList()
    }
  }

  // Filter out already granted users from dropdown
  const grantedUserIds = new Set(accessList.map((a) => a.user_id))
  const availableUsers = allUsers.filter((u) => !grantedUserIds.has(u.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md border border-border/80 bg-background hover:bg-muted hover:text-accent-foreground font-medium h-8 px-3 text-xs gap-1.5 cursor-pointer transition-colors">
        <Share2 className="w-3.5 h-3.5 text-primary" />
        <span>Explicit Megosztás</span>
        {accessList.length > 0 && (
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] font-mono">
            {accessList.length}
          </Badge>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldPlus className="w-5 h-5 text-primary" />
            <DialogTitle>Explicit Hozzáférések Kezelése</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Engedélyezd másik osztályhoz vagy szervezeti egységhez tartozó kollégák számára a(z) <span className="font-mono font-semibold text-foreground">{iktatoszam}</span> ügyirat megtekintését és kezelését.
          </DialogDescription>
        </DialogHeader>

        {/* Új hozzáférés adása panel */}
        {canManage ? (
          <div className="bg-muted/40 p-3.5 rounded-lg border border-border/60 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-500" />
              Új Munkatárs Hozzáadása az Ügyirathoz
            </p>

            <div className="space-y-2">
              <Label htmlFor="user-select" className="text-xs">Válassz Munkatársat</Label>
              <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val || "")}>
                <SelectTrigger id="user-select" className="h-9 text-xs">
                  <SelectValue placeholder="Válassz kollégát..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableUsers.map((u) => {
                    const deptName = u.szervezeti_egyseg?.nev || "Nincs beosztva"
                    return (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.nev} ({deptName} • {u.docs_szerepkor || u.szerepkor})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="grant-reason" className="text-xs">Indoklás / Megjegyzés (opcionális)</Label>
              <Input
                id="grant-reason"
                placeholder="pl. Pénzügyi áttekintés, közös projekt..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button 
                size="sm" 
                className="h-7 text-xs gap-1.5"
                disabled={submitting || !selectedUserId}
                onClick={handleGrant}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Hozzáférést Megad
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted/20 border rounded text-xs text-muted-foreground">
            Csak Vezető vagy Rendszergazda jogosult explicit hozzáférések kezelésére.
          </div>
        )}

        {/* Jelenlegi hozzáférések listája */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Engedélyezett Munkatársak ({accessList.length} fő)
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Betöltés...
            </div>
          ) : accessList.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-xs">
              Még senkinek sincs explicit hozzárendelése ehhez az ügyirathoz. Csak az osztály tagjai érik el.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {accessList.map((item) => {
                const u = item.user
                return (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-card border rounded-md text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{u?.nev || "Ismeretlen"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {u?.szervezeti_egyseg?.nev || "Nincs osztály"} • {u?.docs_szerepkor || u?.szerepkor || "Munkatárs"}
                      </p>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Hozzáférést visszavon"
                        onClick={() => handleRevoke(item.user_id, u?.nev || "Munkatárs")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Bezárás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
