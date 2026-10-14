"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { syncIncomingEmailsAction } from "@/app/inbox/actions"

export function InboxSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)

  async function handleSync() {
    setIsSyncing(true)
    try {
      const res = await syncIncomingEmailsAction()
      if (res.success && "processedCount" in res) {
        if ((res.processedCount ?? 0) > 0) {
          toast.success(`E-mail szinkronizáció kész: ${res.processedCount} új irat érkeztetve!`)
        } else {
          toast.info("A postafiók naprakész, nem található új feldolgozandó e-mail.")
        }
      } else {
        const reason = "reason" in res ? res.reason : undefined
        const error = "error" in res ? (res as any).error : undefined
        if (reason === "Missing config") {
          toast.warning("Az IMAP e-mail beállítások (EMAIL_HOST, EMAIL_USER) hiányoznak a szerverről.")
        } else if (reason === "Already running") {
          toast.info("A szinkronizáció már folyamatban van a háttérben.")
        } else {
          toast.error(`Szinkronizálási hiba: ${error || reason || "Ismeretlen hiba"}`)
        }
      }
    } catch (err: any) {
      toast.error(`Hiba a szinkronizálás során: ${err?.message || String(err)}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 gap-1.5 font-medium border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-colors"
      onClick={handleSync}
      disabled={isSyncing}
      title="Bejövő e-mailek azonnali letöltése és érkeztetése IMAP-on keresztül"
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      )}
      <span>{isSyncing ? "Szinkronizálás..." : "E-mail szinkron"}</span>
    </Button>
  )
}
