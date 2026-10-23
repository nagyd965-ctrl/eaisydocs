"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { saveSubstitute, deleteSubstitute } from "@/app/hr/self-service/actions"

export interface SubstituteUserOption {
  id: string
  nev?: string
  email?: string
}

export interface CurrentSubstituteRecord {
  id: string
  helyettes_id?: string
  felhasznalo_id?: string
  kezdete?: string
  vege?: string
  kezdet_datuma?: string
  veg_datuma?: string
  indoklas?: string | null
  helyettes?: { nev?: string } | null
  helyettes_profil?: { nev?: string } | null
  [key: string]: unknown
}

interface SubstituteDialogProps {
  availableUsers: SubstituteUserOption[]
  currentSubstitute: CurrentSubstituteRecord | null
}

export function SubstituteDialog({
  availableUsers,
  currentSubstitute,
}: SubstituteDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [helyettesId, setHelyettesId] = useState(currentSubstitute?.helyettes_id || "")

  const handleSubmit = async (formData: FormData) => {
    if (!helyettesId) {
      toast.error("Válassz egy helyettest!")
      return
    }
    setLoading(true)
    formData.set("helyettes_id", helyettesId)

    const result = await saveSubstitute(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Helyettesítés sikeresen mentve!")
      setOpen(false)
    }
  }

  const handleDelete = async () => {
    if (!currentSubstitute) return
    setLoading(true)
    const result = await deleteSubstitute(currentSubstitute.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Helyettesítés megszüntetve!")
      setHelyettesId("")
      setOpen(false)
    }
  }

  const isSubActive = Boolean(currentSubstitute)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        id="helyettesites"
        className={buttonVariants({
          variant: isSubActive ? "secondary" : "outline",
          className: "gap-2 text-xs h-9 cursor-pointer",
        })}
      >
        <span>Helyettesítés</span>
        {isSubActive && (
          <Badge
            variant="outline"
            className="text-[11px] font-normal px-1.5 py-0 border-primary/30 text-primary bg-primary/5"
          >
            {currentSubstitute?.helyettes_profil?.nev || "Aktív"}
          </Badge>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isSubActive ? "Aktív helyettesítés" : "Helyettesítés beállítása"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isSubActive
              ? "A megadott időszak alatt a beérkező és függő kérelmeket a helyettesed bírálja el."
              : "Állítsd be, ki hagyja jóvá a beosztottaid kérelmeit helyetted a távolléted alatt."}
          </DialogDescription>
        </DialogHeader>

        {isSubActive && currentSubstitute ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kijelölt helyettes:</span>
                <span className="font-semibold text-foreground">
                  {currentSubstitute.helyettes_profil?.nev || "Nincs név"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Időszak:</span>
                <Badge variant="secondary" className="font-normal text-xs tabular-nums">
                  {currentSubstitute.kezdet_datuma
                    ? new Date(currentSubstitute.kezdet_datuma).toLocaleDateString("hu-HU")
                    : "-"}{" "}
                  –{" "}
                  {currentSubstitute.veg_datuma
                    ? new Date(currentSubstitute.veg_datuma).toLocaleDateString("hu-HU")
                    : "-"}
                </Badge>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A végdátum lejárta után a helyettesítés automatikusan megszűnik, és az el nem bírált függő kérelmek visszaszállnak hozzád.
            </p>

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="text-xs"
              >
                {loading ? "Törlés..." : "Helyettesítés megszüntetése"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs"
              >
                Bezárás
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="helyettes-select" className="text-xs">
                Helyettes személye
              </Label>
              <Select value={helyettesId} onValueChange={(val) => val && setHelyettesId(val)}>
                <SelectTrigger id="helyettes-select" className="text-xs h-9">
                  <SelectValue placeholder="Válassz egy kollégát...">
                    {helyettesId
                      ? availableUsers.find((u) => u.id === helyettesId)?.nev ?? "Válassz egy kollégát..."
                      : "Válassz egy kollégát..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.nev}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="kezdet-datum" className="text-xs">
                  Kezdete
                </Label>
                <Input
                  type="date"
                  id="kezdet-datum"
                  name="kezdet_datuma"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="veg-datum" className="text-xs">
                  Vége
                </Label>
                <Input
                  type="date"
                  id="veg-datum"
                  name="veg_datuma"
                  required
                  className="text-xs h-9"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A megadott időszakban a beosztottaid által beküldött kérelmek közvetlenül a helyettesedhez kerülnek jóváhagyásra.
            </p>

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs"
              >
                Mégse
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !helyettesId}
                className="text-xs"
              >
                {loading ? "Mentés..." : "Helyettesítés mentése"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
