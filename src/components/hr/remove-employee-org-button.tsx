"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import { removeEmployeeFromOrgUnit } from "@/app/hr/orgunit/[id]/actions"
import { toast } from "sonner"

export function RemoveEmployeeOrgButton({ orgUnitId, employeeId, employeeName }: { orgUnitId: string, employeeId: string, employeeName: string }) {
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    if (!confirm(`Biztosan el akarod távolítani a(z) ${employeeName} nevű dolgozót ebből a szervezeti egységből?`)) return

    setLoading(true)
    const result = await removeEmployeeFromOrgUnit(orgUnitId, employeeId)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Dolgozó sikeresen eltávolítva a szervezeti egységből!")
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="text-destructive hover:bg-destructive/10 h-8 w-8"
      onClick={handleRemove}
      disabled={loading}
      title="Eltávolítás a szervezeti egységből"
    >
      <XIcon className="h-4 w-4" />
    </Button>
  )
}
