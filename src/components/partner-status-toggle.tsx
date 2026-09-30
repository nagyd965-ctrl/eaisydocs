"use client"

import { useState } from "react"
import { togglePartnerStatus } from "@/app/partners/actions"
import { toast } from "sonner"
import { CheckCircle2, Power } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PartnerStatusToggle({
  partnerId,
  currentStatus = "aktiv",
  canEdit = false,
}: {
  partnerId: string
  currentStatus?: string
  canEdit?: boolean
}) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)

  const isAktiv = status === "aktiv"

  async function handleToggle() {
    if (!canEdit) return
    setLoading(true)
    const res = await togglePartnerStatus(partnerId, status)
    setLoading(false)

    if (res?.error) {
      toast.error("Hiba", { description: res.error })
    } else if (res?.nextStatus) {
      setStatus(res.nextStatus)
      toast.success(res.nextStatus === "aktiv" ? "Partner aktiválva." : "Partner inaktiválva.")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        isAktiv 
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" 
          : "bg-muted text-muted-foreground border-border/60"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${isAktiv ? "bg-emerald-500" : "bg-muted-foreground"}`} />
        {isAktiv ? "Aktív Partner" : "Inaktív Partner"}
      </span>

      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          disabled={loading}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          title={isAktiv ? "Inaktiválás" : "Aktiválás"}
        >
          <Power className="h-3 w-3 mr-1" />
          {isAktiv ? "Inaktiválás" : "Aktiválás"}
        </Button>
      )}
    </div>
  )
}
