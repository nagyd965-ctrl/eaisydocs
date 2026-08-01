"use client"

import { useState, useEffect } from "react"

export function LiveClock() {
  const [time, setTime] = useState<string>("")

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }))
    }
    update()
    const interval = setInterval(update, 10000) // 10 másodpercenként frissül
    return () => clearInterval(interval)
  }, [])

  return <span>{time || "–:––"}</span>
}
