"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { acknowledgeJobDescription } from "@/app/hr/self-service/actions"

interface JobDescriptionAcknowledgmentProps {
  munkakor: any
}

export function JobDescriptionAcknowledgment({ munkakor }: JobDescriptionAcknowledgmentProps) {
  const [loading, setLoading] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const handleAcknowledge = async () => {
    setLoading(true)
    const result = await acknowledgeJobDescription(munkakor.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Munkaköri leírás sikeresen nyugtázva!")
      setAcknowledged(true)
    }
  }

  if (acknowledged) return null

  return (
    <Alert className="border-amber-500/50 bg-amber-500/10 mb-6">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-500">Új munkaköri leírás elfogadása szükséges</AlertTitle>
      <AlertDescription className="text-amber-700/80 dark:text-amber-500/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        <span>
          A jelenlegi pozíciódhoz ({munkakor.megnevezes}) tartozó munkaköri leírást még nem nyugtáztad. Kérjük, olvasd el a feladataidat és erősítsd meg, hogy megismerted őket.
        </span>
        <Button size="sm" onClick={handleAcknowledge} disabled={loading} className="whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {loading ? "Nyugtázás..." : "Megismertem és elfogadom"}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
