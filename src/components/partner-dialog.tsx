"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { savePartner } from "@/app/partners/actions"
import { Pencil, Plus } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function PartnerDialog({ partner }: { partner?: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!partner

  async function onSubmit(formData: FormData) {
    setLoading(true)
    const result = await savePartner(formData)
    setLoading(false)
    if (result?.error) {
      toast.error("Hiba", { description: result.error })
    } else {
      toast.success("Sikeres", { description: "Partner elmentve." })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEditing ? (
        <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <Pencil className="h-4 w-4 mr-2" /> Szerkesztés
        </DialogTrigger>
      ) : (
        <DialogTrigger className={cn(buttonVariants({ variant: "default" }), "bg-[#02b8cc] hover:bg-[#029db0] text-white")}>
          <Plus className="h-4 w-4 mr-2" /> Új Partner
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Partner Szerkesztése" : "Új Partner Rögzítése"}</DialogTitle>
          <DialogDescription>
            Add meg a partner legfontosabb cégadatait.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 pt-4">
          {isEditing && <input type="hidden" name="id" value={partner.id} />}
          
          <div className="space-y-2">
            <Label htmlFor="nev">Partner neve (kötelező)</Label>
            <Input id="nev" name="nev" defaultValue={partner?.nev} required placeholder="pl. Kovács Autó Kft." />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="adoszam">Adószám</Label>
            <Input id="adoszam" name="adoszam" defaultValue={partner?.adoszam || ""} placeholder="pl. 12345678-2-42" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cegjegyzekszam">Cégjegyzékszám</Label>
            <Input id="cegjegyzekszam" name="cegjegyzekszam" defaultValue={partner?.cegjegyzekszam || ""} placeholder="pl. 01-09-123456" />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="mr-2">
              Mégse
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#02b8cc] hover:bg-[#029db0] text-white">
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
