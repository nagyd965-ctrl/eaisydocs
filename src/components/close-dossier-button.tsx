"use client"

import { useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArchiveX, Loader2 } from "lucide-react"
import { closeDossier } from "@/app/dossiers/[id]/actions"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function CloseDossierButton({ ugyiratId }: { ugyiratId: string }) {
  const [loading, setLoading] = useState(false)

  const handleClose = async () => {
    setLoading(true)
    const result = await closeDossier(ugyiratId)
    if (result.error) {
      toast.error("Hiba", { description: result.error })
    } else {
      toast.success("Sikeres", { description: "Ügyirat lezárva és irattárba helyezve." })
    }
    setLoading(false)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger 
        className={cn(
          buttonVariants({ variant: "outline" }),
          "text-muted-foreground hover:text-foreground"
        )}
        disabled={loading}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Lezárás és Irattározás
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Biztosan lezárod?</AlertDialogTitle>
          <AlertDialogDescription>
            Biztosan lezárod és irattárba helyezed ezt az ügyiratot? A megőrzési idő automatikusan kiszámításra kerül az irattári terv alapján. Ezt a műveletet nem lehet visszavonni.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégsem</AlertDialogCancel>
          <AlertDialogAction onClick={handleClose} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Folytatás</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
