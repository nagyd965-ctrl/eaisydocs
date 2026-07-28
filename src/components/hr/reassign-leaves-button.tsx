"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { reassignPendingLeaves } from "@/app/hr/dashboard-actions"

export function ReassignLeavesButton() {
  const [loading, setLoading] = useState(false)

  const handleReassign = async () => {
    setLoading(true)
    const result = await reassignPendingLeaves()
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleReassign} disabled={loading}>
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Átszignálás..." : "Függő Kérelmek Átszignálása"}
    </Button>
  )
}
