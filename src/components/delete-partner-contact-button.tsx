"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deletePartnerContact } from "@/app/partners/actions"
import { toast } from "sonner"

export function DeletePartnerContactButton({
  contactId,
  partnerId,
  contactName,
}: {
  contactId: string
  partnerId: string
  contactName: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Biztosan törölni szeretnéd a(z) "${contactName}" kapcsolattartót?`)) {
      return
    }

    setLoading(true)
    const res = await deletePartnerContact(contactId, partnerId)
    setLoading(false)

    if (res?.error) {
      toast.error("Hiba a törléskor", { description: res.error })
    } else {
      toast.success("Kapcsolattartó törölve.")
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
      title="Kapcsolattartó törlése"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
