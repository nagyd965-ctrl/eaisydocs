"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { savePartnerContact } from "@/app/partners/actions"
import { Plus, Pencil, User, Mail, Phone, Briefcase } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export interface PartnerContactData {
  id?: string
  partner_id: string
  nev?: string
  beosztas?: string | null
  email?: string | null
  telefonszam?: string | null
  elsodleges?: boolean
  megjegyzes?: string | null
}

export function PartnerContactDialog({
  contact,
  partnerId,
  iconOnly = false,
}: {
  contact?: PartnerContactData
  partnerId: string
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!contact?.id

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("partner_id", partnerId)
    if (contact?.id) {
      formData.set("id", contact.id)
    }

    setLoading(true)
    const result = await savePartnerContact(formData)
    setLoading(false)

    if (result?.error) {
      toast.error("Hiba", { description: result.error })
    } else {
      toast.success("Sikeres mentés", {
        description: isEditing ? "Kapcsolattartó frissítve." : "Új kapcsolattartó hozzáadva.",
      })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEditing ? (
        iconOnly ? (
          <DialogTrigger
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Kapcsolattartó szerkesztése"
          >
            <Pencil className="h-3.5 w-3.5" />
          </DialogTrigger>
        ) : (
          <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
            <Pencil className="h-3.5 w-3.5" />
            Szerkesztés
          </DialogTrigger>
        )
      ) : (
        <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus className="h-3.5 w-3.5" />
          Új Kapcsolattartó
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Kapcsolattartó Szerkesztése" : "Új Kapcsolattartó Hozzáadása"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Add meg a partnerhez tartozó munkatárs vagy képviselő elérhetőségeit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="nev" className="text-xs font-medium">Kapcsolattartó teljes neve *</Label>
            <Input
              id="nev"
              name="nev"
              defaultValue={contact?.nev || ""}
              required
              className="h-9 text-xs"
              placeholder="pl. Horváth Péter"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="beosztas" className="text-xs font-medium">Beosztás / Munkakör</Label>
            <Input
              id="beosztas"
              name="beosztas"
              defaultValue={contact?.beosztas || ""}
              className="h-9 text-xs"
              placeholder="pl. Pénzügyi igazgató, Kereskedelmi vezető"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Közvetlen e-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={contact?.email || ""}
                className="h-9 text-xs"
                placeholder="peter.horvath@ceg.hu"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefonszam" className="text-xs font-medium">Közvetlen telefon</Label>
              <Input
                id="telefonszam"
                name="telefonszam"
                defaultValue={contact?.telefonszam || ""}
                className="h-9 text-xs"
                placeholder="+36 30 123 4567"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="elsodleges"
              name="elsodleges"
              value="true"
              defaultChecked={contact?.elsodleges || false}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="elsodleges" className="text-xs font-normal cursor-pointer select-none">
              Elsődleges kapcsolattartó a partnernél
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="megjegyzes" className="text-xs font-medium">Megjegyzés (opcionális)</Label>
            <Input
              id="megjegyzes"
              name="megjegyzes"
              defaultValue={contact?.megjegyzes || ""}
              className="h-9 text-xs"
              placeholder="Elérhetőségi idősáv, szakterület..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
