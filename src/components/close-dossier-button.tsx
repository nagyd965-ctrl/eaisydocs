"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArchiveX, Loader2 } from "lucide-react"
import { closeDossier } from "@/app/dossiers/[id]/actions"

export function CloseDossierButton({ ugyiratId }: { ugyiratId: string }) {
  const [loading, setLoading] = useState(false)

  const handleClose = async () => {
    if (!confirm("Biztosan lezárod és irattárba helyezed ezt az ügyiratot? A megőrzési idő automatikusan kiszámításra kerül az irattári terv alapján.")) {
      return
    }

    setLoading(true)
    const result = await closeDossier(ugyiratId)
    if (result.error) {
      alert(result.error)
    }
    setLoading(false)
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleClose} 
      disabled={loading}
      className="text-muted-foreground hover:text-foreground"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ArchiveX className="mr-2 h-4 w-4" />
      )}
      Lezárás és Irattározás
    </Button>
  )
}
