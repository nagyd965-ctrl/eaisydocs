"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button"
import { HardHat } from "lucide-react"
import { SafetyTrainingPanel, type SafetyTrainingPanelProps } from "@/components/hr/safety-training-panel"

export interface SafetyTrainingDialogProps extends SafetyTrainingPanelProps {
  triggerButton?: React.ReactNode
}

export function SafetyTrainingDialog({
  triggerButton,
  ...panelProps
}: SafetyTrainingDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton ? (
        <DialogTrigger render={triggerButton as any} />
      ) : (
        <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10`}>
          <HardHat className="w-3.5 h-3.5 text-primary" />
          Munkavédelmi Oktatás
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto p-6">
        <SafetyTrainingPanel 
          {...panelProps} 
          onSuccess={() => {
            if (panelProps.onSuccess) panelProps.onSuccess()
          }} 
        />
      </DialogContent>
    </Dialog>
  )
}
