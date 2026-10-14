"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { syncEaisyBillPartnerInvoicesAction } from "@/app/partners/eaisybill-partner-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface PartnerInvoiceSyncButtonProps {
  partnerId: string
  companyId?: string
  className?: string
  variant?: "outline" | "ghost" | "default"
  size?: "default" | "sm" | "icon"
  iconOnly?: boolean
}

export function PartnerInvoiceSyncButton({
  partnerId,
  companyId,
  className,
  variant = "outline",
  size = "sm",
  iconOnly = false
}: PartnerInvoiceSyncButtonProps) {
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  const handleSync = async () => {
    setLoading(true)
    try {
      const res = await syncEaisyBillPartnerInvoicesAction({
        partnerId,
        targetCompanyId: companyId
      })

      if (res.success) {
        if (res.syncedCount > 0) {
          toast.success(`${res.syncedCount} db eaisyBill számla sikeresen szinkronizálva az iratforgalomba!`)
        } else {
          toast.info("A partner minden eaisyBill számlája naprakész.")
        }
        router.refresh()
      } else {
        toast.error(res.error || "Hiba történt a számlák szinkronizálásakor.")
      }
    } catch (err: unknown) {
      console.error("Számlaszinkron hiba:", err)
      toast.error("Váratlan hiba történt a szinkronizálás során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleSync}
      disabled={loading}
      className={cn("gap-1.5 transition-colors", className)}
      title="eaisyBill számlák frissítése és szinkronizálása"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-primary")} />
      {!iconOnly && <span>{loading ? "Szinkronizálás..." : "Számlák szinkronizálása"}</span>}
    </Button>
  )
}
