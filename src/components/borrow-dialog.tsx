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
      <div className="inline-flex items-center gap-1.5 shrink-0 flex-wrap">
        <span className={`text-[10px] font-medium h-7 px-2.5 rounded-md flex items-center gap-1.5 border ${isLate ? "bg-destructive/10 text-destructive border-destructive/25" : "bg-warning/10 text-warning border-warning/25"}`}>
          <MapPin className="h-3 w-3 shrink-0" />
          <span>Kikölcsönözve: <strong className="font-semibold">{kinek}</strong> ({new Date(activeBorrowLog.varhato_visszahozatal).toLocaleDateString("hu-HU")})</span>
        </span>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-primary text-[11px] cursor-pointer" onClick={handleReturn} disabled={isLoading}>
          <ArchiveRestore className="h-3.5 w-3.5 mr-1 text-primary" /> Visszavétel
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button 
        type="button"
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer shrink-0" 
        onClick={() => setOpen(true)}
        title="Kölcsönzés rögzítése"
      >
        <MapPin className="h-3 w-3 text-muted-foreground/80 shrink-0" />
        <span>Kölcsönzés rögzítése</span>
      </button>
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
                {users.map(u => (
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
