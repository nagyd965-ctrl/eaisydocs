"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Laptop } from "lucide-react"
import { AssetHandoverPanel } from "@/components/hr/asset-handover-panel"

export interface AssetHandoverDialogProps {
  employeeName: string
  dolgozoId?: string | null
  onboardingId?: string | null
  munkakor?: string | null
  triggerButton?: React.ReactNode
  onSuccess?: () => void
}

export function AssetHandoverDialog({
  employeeName,
  dolgozoId,
  onboardingId,
  munkakor,
  triggerButton,
  onSuccess
}: AssetHandoverDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {triggerButton ? (
        <span 
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }} 
          className="inline-flex cursor-pointer"
        >
          {triggerButton}
        </span>
      ) : (
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <Laptop className="w-3.5 h-3.5" /> Eszközök átadása & Jkv
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <AssetHandoverPanel
            employeeName={employeeName}
            dolgozoId={dolgozoId}
            onboardingId={onboardingId}
            munkakor={munkakor}
            onSuccess={() => {
              if (onSuccess) onSuccess()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
