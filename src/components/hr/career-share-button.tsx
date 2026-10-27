"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check } from "lucide-react"
import { toast } from "sonner"

export function CareerShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  function handleShare() {
    if (typeof window === "undefined") return
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success(`A(z) „${title}” pozíció linkje a vágólapra másolva!`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="h-8 gap-1.5 text-xs"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-success" />
          <span>Link másolva</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5" />
          <span>Pozíció megosztása</span>
        </>
      )}
    </Button>
  )
}
