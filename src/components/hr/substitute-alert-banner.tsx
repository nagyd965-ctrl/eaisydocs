"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CalendarCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

interface Props {
  managerId: string
  /** A vezető jövőbeli (tervezett) szabadságainak listája */
  pendingApprovalsCount: number
}

export function SubstituteAlertBanner({ managerId, pendingApprovalsCount }: Props) {
  const [hasUpcomingLeave, setHasUpcomingLeave] = useState(false)
  const [hasActiveSubstitute, setHasActiveSubstitute] = useState(true) // default: feltételezzük hogy van
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkStatus = async () => {
      const today = new Date().toISOString().split("T")[0]
      const in14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      // 1. Van-e közelgő (14 napon belüli) jóváhagyott szabadsága?
      const { data: leave } = await supabase
        .from("hr_tavollet")
        .select("id, kezdet_datuma, veg_datuma")
        .eq("dolgozo_id", managerId)
        .eq("statusz", "jovahagyva")
        .gte("kezdet_datuma", today)
        .lte("kezdet_datuma", in14days)
        .limit(1)
        .maybeSingle()

      if (!leave) {
        setLoading(false)
        return
      }

      setHasUpcomingLeave(true)

      // 2. Van-e aktív helyettesítés a szabadság időszakára?
      const { data: sub } = await supabase
        .from("hr_helyettesites")
        .select("id")
        .eq("vezeto_id", managerId)
        .eq("aktiv", true)
        .lte("kezdet_datuma", leave.veg_datuma)
        .gte("veg_datuma", leave.kezdet_datuma)
        .limit(1)
        .maybeSingle()

      setHasActiveSubstitute(!!sub)
      setLoading(false)
    }

    checkStatus()
  }, [managerId])

  if (loading || !hasUpcomingLeave || hasActiveSubstitute) return null

  return (
    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Közelgő szabadság – nincs helyettes beállítva!
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          {pendingApprovalsCount > 0
            ? `${pendingApprovalsCount} jóváhagyásra váró kérelem áll fenn. `
            : ""}
          A szabadságod alatt a beosztottjaid kérelmeinek jóváhagyása akadályba ütközhet.
        </p>
      </div>
      <a
        href="/hr/settings#helyettesites"
        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-700 bg-background hover:bg-muted transition-colors shrink-0"
      >
        <CalendarCheck className="w-3.5 h-3.5" />
        Helyettes beállítása
        <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  )
}
