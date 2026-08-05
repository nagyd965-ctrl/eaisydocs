"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { generateLifecycleReport } from "@/app/dossiers/[id]/lifecycle-export"
import { toast } from "sonner"

interface LifecycleExportButtonProps {
  ugyiratId: string
}

export function LifecycleExportButton({ ugyiratId }: LifecycleExportButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleExport = () => {
    startTransition(async () => {
      const result = await generateLifecycleReport(ugyiratId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.success && result.base64) {
        // Base64 → Blob → letöltés
        const byteCharacters = atob(result.base64)
        const byteArray = new Uint8Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i)
        }
        const blob = new Blob([byteArray], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.filename || "eletciklus_riport.pdf"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Életciklus riport letöltve.")
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="mr-2 h-3.5 w-3.5" />
      )}
      Riport letöltése (PDF)
    </Button>
  )
}
