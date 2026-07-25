"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { deleteContract } from "@/app/hr/actions/contract-actions"

export function DeleteContractButton({ documentId, fileUrl, dolgozoId }: { documentId: string, fileUrl: string | null, dolgozoId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Biztosan törölni szeretnéd ezt a dokumentumot?")) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteContract(documentId, fileUrl, dolgozoId)
      if (result.success) {
        toast.success("Dokumentum sikeresen törölve.")
      } else {
        toast.error(result.error || "Hiba történt a törlés során.")
      }
    } catch (error) {
      console.error(error)
      toast.error("Váratlan hiba történt a törlés során.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
      onClick={handleDelete}
      disabled={isDeleting}
      title="Törlés"
    >
      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </Button>
  )
}
