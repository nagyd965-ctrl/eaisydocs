"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { assignDossier } from "@/app/dossiers/dossier-actions"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

export function AssignDossierDialog({
  ugyirat_id,
  ugy_id,
  szervezeti_egyseg_id,
  users,
  currentFelelosId,
  currentHatarido,
  canAssign,
  children
}: {
  ugyirat_id: string
  ugy_id: string
  szervezeti_egyseg_id: string | null
  users: any[]
  currentFelelosId?: string | null
  currentHatarido?: string | null
  canAssign: boolean
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [felelosId, setFelelosId] = useState(currentFelelosId || "none")

  // Filter users based on szervezeti_egyseg_id and role
  const eligibleUsers = users.filter(u => {
    // Csak ugyintezo es vezeto lehet felelos
    if (u.szerepkor !== 'ugyintezo' && u.szerepkor !== 'vezeto') return false
    // Ha van szervezeti egysege az ugyiratnak, csak a hozza tartozo embereket listazzuk
    if (szervezeti_egyseg_id) {
      return u.szervezeti_egyseg_id === szervezeti_egyseg_id
    }
    return true
  })

  if (!canAssign) {
    return <>{children}</>
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? (
        <span className="cursor-pointer inline-block" onClick={(e) => { e.preventDefault(); setOpen(true); }}>
          {children}
        </span>
      ) : (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-primary" onClick={(e) => { e.preventDefault(); setOpen(true); }}>
          <Pencil className="h-3 w-3 mr-1" /> Kiosztás
        </Button>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <form action={async (formData) => {
          setLoading(true)
          const res = await assignDossier(formData)
          setLoading(false)
          if (res.error) {
            toast.error("Hiba", { description: res.error })
          } else {
            toast.success("Sikeres", { description: "Ügyirat kiosztva." })
            setOpen(false)
          }
        }}>
          <input type="hidden" name="ugyirat_id" value={ugyirat_id} />
          <input type="hidden" name="ugy_id" value={ugy_id} />
          
          <DialogHeader>
            <DialogTitle>Ügyirat Szignálása (Kiosztása)</DialogTitle>
            <DialogDescription>
              Válaszd ki az ügy felelősét és adj meg egy határidőt. Csak a releváns osztályhoz tartozó ügyintézők választhatók.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="felelos_user_id">Felelős</Label>
              <Select name="felelos_user_id" value={felelosId} onValueChange={(val) => setFelelosId(val || "none")}>
                <SelectTrigger id="felelos_user_id">
                  <SelectValue placeholder="Nincs kiosztva">
                    {felelosId === "none" ? "Nincs kiosztva (Üres)" : eligibleUsers.find(u => u.id === felelosId)?.nev}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nincs kiosztva (Üres)</SelectItem>
                  {eligibleUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hatarido">Határidő</Label>
              <Input 
                id="hatarido" 
                name="hatarido" 
                type="date" 
                defaultValue={currentHatarido || ""} 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Mégsem</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mentés..." : "Szignálás mentése"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
