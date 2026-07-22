"use client"

import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { approveLeaveRequest, rejectLeaveRequest } from "@/app/hr/manager/actions"
import { toast } from "sonner"
import { useState } from "react"

export function LeaveActionButtons({ leaveId }: { leaveId: string }) {
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    const result = await approveLeaveRequest(leaveId)
    setLoading(false)

    if (result.error) toast.error(result.error)
    else toast.success("Kérelem jóváhagyva!")
  }

  const handleReject = async () => {
    setLoading(true)
    const result = await rejectLeaveRequest(leaveId)
    setLoading(false)

    if (result.error) toast.error(result.error)
    else toast.success("Kérelem elutasítva!")
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={handleReject}
        disabled={loading}
      >
        <X className="w-4 h-4 mr-1" /> Elutasít
      </Button>
      <Button 
        size="sm" 
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={handleApprove}
        disabled={loading}
      >
        <Check className="w-4 h-4 mr-1" /> Jóváhagy
      </Button>
    </div>
  )
}
