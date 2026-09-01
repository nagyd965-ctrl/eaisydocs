"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { savePartner } from "@/app/partners/actions"
import { Building2, Pencil, Plus, User, Briefcase, Landmark } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export interface PartnerData {
  id?: string
  nev?: string
  tipus?: string
  adoszam?: string | null
  cegjegyzekszam?: string | null
  email?: string | null
  telefonszam?: string | null
  cim?: string | null
  bankszamlaszam?: string | null
  kapcsolattarto_nev?: string | null
  kapcsolattarto_email?: string | null
  kapcsolattarto_telefon?: string | null
}

export function PartnerDialog({ 
  partner, 
  iconOnly = false 
}: { 
  partner?: PartnerData
  iconOnly?: boolean 
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!partner
  const [tipus, setTipus] = useState<string>(partner?.tipus || "ceg")

  const partnerTypes = [
    { value: "ceg", label: "Cég / Gazdasági társaság", icon: Building2 },
    { value: "maganszemely", label: "Magánszemély", icon: User },
    { value: "egyeni_vallalkozo", label: "Egyéni vállalkozó (EV)", icon: Briefcase },
    { value: "intezmeny", label: "Hivatal / Intézmény / Hatóság", icon: Landmark },
  ]

  const selectedTypeLabel = partnerTypes.find(t => t.value === tipus)?.label || "Cég"

  async function onSubmit(formData: FormData) {
    formData.set("tipus", tipus)
    setLoading(true)
    const result = await savePartner(formData)
    setLoading(false)
    if (result?.error) {
      toast.error("Hiba", { description: result.error })
    } else {
      toast.success("Sikeres", { description: isEditing ? "Partner módosítva." : "Partner rögzítve." })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) {
        setTipus(partner?.tipus || "ceg")
      }
    }}>
      {isEditing ? (
        iconOnly ? (
          <DialogTrigger 
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Partner szerkesztése"
          >
            <Pencil className="h-4 w-4" />
          </DialogTrigger>
        ) : (
          <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Pencil className="h-4 w-4 mr-2" /> Szerkesztés
          </DialogTrigger>
        )
      ) : (
        <DialogTrigger className={cn(buttonVariants({ variant: "default" }))}>
          <Plus className="h-4 w-4 mr-2" /> Új Partner
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Partner Szerkesztése" : "Új Partner Rögzítése"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Módosítsd a partner adatait és típusát." : "Add meg a partner adatait (alapértelmezetten Cég)."}
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 pt-2">
          {isEditing && <input type="hidden" name="id" value={partner.id} />}
          
          <div className="space-y-2">
            <Label htmlFor="tipus">Partner típusa</Label>
            <Select value={tipus} onValueChange={(val) => val && setTipus(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz típust...">
                  {selectedTypeLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {partnerTypes.map((t) => {
                  const Icon = t.icon
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nev">
              {tipus === "maganszemely" ? "Teljes név (kötelező)" : "Cégnév / Partner neve (kötelező)"}
            </Label>
            <Input 
              id="nev" 
              name="nev" 
              defaultValue={partner?.nev} 
              required 
              placeholder={tipus === "maganszemely" ? "pl. Kovács János" : "pl. Kovács Autó Kft."} 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail cím</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                defaultValue={partner?.email || ""} 
                placeholder="info@ceg.hu" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefonszam">Telefonszám</Label>
              <Input 
                id="telefonszam" 
                name="telefonszam" 
                defaultValue={partner?.telefonszam || ""} 
                placeholder="+36 30 123 4567" 
              />
            </div>
          </div>

          {tipus !== "maganszemely" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="adoszam">Adószám</Label>
                <Input 
                  id="adoszam" 
                  name="adoszam" 
                  defaultValue={partner?.adoszam || ""} 
                  placeholder="12345678-2-42" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cegjegyzekszam">
                  {tipus === "intezmeny" ? "Nyilvántartási szám" : "Cégjegyzékszám"}
                </Label>
                <Input 
                  id="cegjegyzekszam" 
                  name="cegjegyzekszam" 
                  defaultValue={partner?.cegjegyzekszam || ""} 
                  placeholder={tipus === "intezmeny" ? "PIR / Törzsszám" : "01-09-123456"} 
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cim">
              {tipus === "maganszemely" ? "Lakcím / Levelezési cím" : "Székhely / Cím"}
            </Label>
            <Input 
              id="cim" 
              name="cim" 
              defaultValue={partner?.cim || ""} 
              placeholder="1052 Budapest, Fő utca 1." 
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

