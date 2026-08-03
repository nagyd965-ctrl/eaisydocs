"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createDevelopmentPlan } from "@/app/hr/actions/idp-actions"

export function IdpPlanDialog({ dolgozoId, buttonVariant = "default", buttonText = "Új Terv" }: { dolgozoId: string, buttonVariant?: "default" | "outline" | "ghost", buttonText?: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const currentYear = new Date().getFullYear()
  const [megnevezes, setMegnevezes] = useState(`Egyéni Fejlesztési Terv - ${currentYear}`)
  
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!megnevezes) return

    setIsSubmitting(true)
    
    const result = await createDevelopmentPlan({
      dolgozo_id: dolgozoId,
      megnevezes: megnevezes,
    })

    setIsSubmitting(false)

    if (result.success) {
      setOpen(false)
      setMegnevezes(`Egyéni Fejlesztési Terv - ${currentYear}`)
      router.refresh()
    } else {
      console.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={buttonVariant as any} size="sm" />}>
        <Plus className="w-4 h-4 mr-2" />
        {buttonText}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Új Fejlesztési Terv</DialogTitle>
          <DialogDescription>
            Adja meg a fejlesztési terv (ciklus) nevét.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="megnevezes">Megnevezés</Label>
            <Input 
              id="megnevezes" 
              placeholder="pl. Éves fejlesztési terv 2026" 
              value={megnevezes}
              onChange={(e) => setMegnevezes(e.target.value)}
              required
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Létrehozás
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
