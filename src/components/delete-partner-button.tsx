"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export function DeletePartnerButton({ partnerId, partnerNev }: { partnerId: string, partnerNev: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm(`Biztosan törölni szeretnéd a(z) "${partnerNev}" nevű partnert? Ez a művelet nem vonható vissza.`)) {
      return
    }

    setIsDeleting(true)
    
    // Először megpróbáljuk törölni a partnert
    const { error } = await supabase
      .from("partner")
      .delete()
      .eq("id", partnerId)

    if (error) {
      if (error.code === '23503') { // Fk constraint violation
        alert("Ezt a partnert nem lehet törölni, mert már hozzá van rendelve egy vagy több irathoz!")
      } else {
        alert("Hiba történt a partner törlése során.")
        console.error(error)
      }
      setIsDeleting(false)
      return
    }

    router.refresh()
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      title="Partner törlése"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
