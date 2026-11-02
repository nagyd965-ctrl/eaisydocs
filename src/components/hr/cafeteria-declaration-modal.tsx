"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  CafeteriaDeclaration,
  ExistingCafeteriaChoice,
} from "@/components/hr/cafeteria-declaration"

type CatalogItem = {
  id: string
  nev: string
  leiras: string
  szorzo: number
  kategoria: string
}

interface CafeteriaDeclarationModalProps {
  employeeId: string
  year: number
  budget: number
  isClosed: boolean
  catalog: CatalogItem[]
  existingChoices: ExistingCafeteriaChoice[]
  iktatoszam?: string | null
  autoOpen?: boolean
  showTrigger?: boolean
  triggerLabel?: string
}

export function CafeteriaDeclarationModal({
  employeeId,
  year,
  budget,
  isClosed,
  catalog,
  existingChoices,
  iktatoszam,
  autoOpen = true,
  showTrigger = false,
  triggerLabel = "Nyilatkozat kitöltése",
}: CafeteriaDeclarationModalProps) {
  const [open, setOpen] = useState(Boolean(autoOpen && !isClosed))

  if (isClosed) {
    return null
  }

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-8 px-3 text-xs font-medium shrink-0"
          onClick={() => setOpen(true)}
        >
          {triggerLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Cafeteria Nyilatkozat ({year})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Állítsd össze az idei béren kívüli juttatási csomagodat az éves keretösszeged terhére. A véglegesített nyilatkozatot a Dokumentumaim menüpontban bármikor megtekintheted és letöltheted.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            <CafeteriaDeclaration
              employeeId={employeeId}
              year={year}
              budget={budget}
              isClosed={isClosed}
              catalog={catalog}
              existingChoices={existingChoices}
              iktatoszam={iktatoszam}
              inDialog={true}
              onSuccess={() => setOpen(false)}
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Később töltöm ki
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

