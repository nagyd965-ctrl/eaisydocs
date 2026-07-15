"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"

interface SessionTimeoutProps {
  timeoutMinutes: number
}

export function SessionTimeout({ timeoutMinutes }: SessionTimeoutProps) {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  
  // Ref for the timeout so we can clear it
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }, [router])

  const startWarning = useCallback(() => {
    setShowWarning(true)
    setCountdown(60)
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!)
          logout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [logout])

  const showWarningRef = useRef(showWarning)
  useEffect(() => { showWarningRef.current = showWarning }, [showWarning])

  const resetInactivityTimeout = useCallback(() => {
    if (showWarningRef.current) return

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current)
    }

    const ms = timeoutMinutes * 60 * 1000
    inactivityTimeoutRef.current = setTimeout(startWarning, ms)
  }, [timeoutMinutes, startWarning])

  const handleStayLoggedIn = () => {
    setShowWarning(false)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    // Need a slight delay to let showWarningRef update, or just force it:
    showWarningRef.current = false
    resetInactivityTimeout()
  }

  useEffect(() => {
    resetInactivityTimeout()

    const events = ["mousemove", "keydown", "click", "scroll"]
    const activityHandler = () => resetInactivityTimeout()

    events.forEach(event => {
      window.addEventListener(event, activityHandler)
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, activityHandler)
      })
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current)
      // Only clear interval on unmount
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [resetInactivityTimeout])

  return (
    <Dialog open={showWarning} onOpenChange={(open) => {
      // Don't allow closing by clicking outside or pressing escape
      if (!open && showWarning) return 
      setShowWarning(open)
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <DialogTitle>Munkamenet időtúllépés</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            Inaktivitás miatt a rendszered hamarosan kijelentkeztet.
            Szeretnél bejelentkezve maradni?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-6">
          <div className="text-4xl font-bold text-orange-500">
            00:{countdown.toString().padStart(2, '0')}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={logout}>
            Kijelentkezés
          </Button>
          <Button onClick={handleStayLoggedIn} className="bg-[#02b8cc] hover:bg-[#029db0] text-white">
            Itt vagyok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
