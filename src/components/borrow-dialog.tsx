"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { borrowDocument, returnDocument } from "@/app/dossiers/borrow-actions"
import { toast } from "sonner"
import { MapPin, ArchiveRestore } from "lucide-react"

interface BorrowDialogProps {
  iratId: string
  activeBorrowLog?: { id: string, kinek_user_id: string, varhato_visszahozatal: string, statusz: string }
  users: { id: string, nev: string, docs_szerepkor?: string }[]
}

export function BorrowDialog({ iratId, activeBorrowLog, users }: BorrowDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")
  const [returnDate, setReturnDate] = useState("")

  const handleBorrow = async () => {
    if (!selectedUser || !returnDate) {
      toast.error("Válassz munkatársat és határidőt!")
      return
    }

    setIsLoading(true)
    const res = await borrowDocument(iratId, selectedUser, returnDate)
    setIsLoading(false)

    if (res.success) {
      toast.success("Kölcsönzés rögzítve!")
      setOpen(false)
    } else {
      toast.error(res.error || "Hiba történt")
    }
  }

  const handleReturn = async () => {
    if (!activeBorrowLog) return
    setIsLoading(true)
    const res = await returnDocument(activeBorrowLog.id)
    setIsLoading(false)

    if (res.success) {
      toast.success("Irat visszavéve!")
    } else {
      toast.error(res.error || "Hiba történt")
    }
  }

  if (activeBorrowLog && activeBorrowLog.statusz === "kikolcsonozve") {
    const kinek = users.find(u => u.id === activeBorrowLog.kinek_user_id)?.nev || "Ismeretlen"
    const isLate = new Date(activeBorrowLog.varhato_visszahozatal) < new Date()

    return (
      <div className="flex flex-col items-start gap-1">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm w-fit ${isLate ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
          Kikölcsönözve: {kinek} (Várható: {new Date(activeBorrowLog.varhato_visszahozatal).toLocaleDateString("hu-HU")})
        </span>
        <Button size="sm" variant="ghost" className="h-auto p-0 text-muted-foreground hover:text-primary text-xs" onClick={handleReturn} disabled={isLoading}>
          <ArchiveRestore className="h-3 w-3 mr-1" /> Visszavétel rögzítése
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" className="h-auto p-0 text-muted-foreground hover:text-primary text-xs" onClick={() => setOpen(true)}>
        <MapPin className="h-3 w-3 mr-1" /> Kölcsönzés rögzítése
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Irat Kölcsönzése</DialogTitle>
          <DialogDescription>
            Rögzítsd, hogy ki vitte el a papíralapú iratot az irattárból/irodából.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Munkatárs (Kinek)</Label>
            <Select onValueChange={(val) => val && setSelectedUser(val)} value={selectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz munkatársat...">
                  {selectedUser ? users.find(u => u.id === selectedUser)?.nev : "Válassz munkatársat..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(u => ['iktato', 'admin', 'rendszergazda'].includes(u.docs_szerepkor || ''))
                  .map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nev}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Várható visszahozatal</Label>
            <Input 
              type="date" 
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Mégse</Button>
          <Button onClick={handleBorrow} disabled={isLoading}>Mentés</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
