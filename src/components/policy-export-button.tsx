"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { exportSecurityPolicyPdf } from "@/app/security-policy/export-action"
import { toast } from "sonner"

export function PolicyExportButton() {
  const [isPending, startTransition] = useTransition()

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportSecurityPolicyPdf()
      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.success && result.base64) {
        const byteCharacters = atob(result.base64)
        const byteArray = new Uint8Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i)
        }
        const blob = new Blob([byteArray], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.filename || "eaisyDocs_IT_Biztonsagi_Szabalyzat.pdf"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("IT Biztonsági Szabályzat letöltve.")
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Letöltés PDF-ként
    </Button>
  )
}
