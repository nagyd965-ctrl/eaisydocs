"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye, Loader2 } from "lucide-react"
import { getSignedFileUrl } from "@/app/hr/offboarding/actions"

export interface PdfViewerDialogProps {
  url?: string
  pdfUrl?: string
  title: string
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PdfViewerDialog({ 
  url,
  pdfUrl, 
  title,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: PdfViewerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen
  const rawUrl = url || pdfUrl || ""

  const [resolvedUrl, setResolvedUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!rawUrl) {
      setResolvedUrl("")
      return
    }

    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("blob:") || rawUrl.startsWith("data:") || rawUrl.startsWith("/api/")) {
      setResolvedUrl(rawUrl)
      return
    }

    // Ha Supabase Storage relatív elérési út, lekérünk egy friss aláírt URL-t
    let isCancelled = false
    setIsLoading(true)
    getSignedFileUrl(rawUrl).then(res => {
      if (!isCancelled) {
        if (res.signedUrl) {
          setResolvedUrl(res.signedUrl)
        } else {
          setResolvedUrl(rawUrl)
        }
        setIsLoading(false)
      }
    }).catch(() => {
      if (!isCancelled) {
        setResolvedUrl(rawUrl)
        setIsLoading(false)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [rawUrl, open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger render={trigger} />
      )}
      {!trigger && !isControlled && (
        <DialogTrigger render={
          <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 px-2 gap-1">
            <Eye className="w-4 h-4" />
            Megtekintés
          </Button>
        } />
      )}
      
      <DialogContent className="sm:max-w-[1000px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full bg-muted/30 relative flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">Dokumentum előkészítése...</p>
            </div>
          ) : resolvedUrl ? (
            <iframe 
              src={`${resolvedUrl}#toolbar=0&navpanes=0`} 
              className="w-full h-full border-none"
              title={title}
            />
          ) : (
            <div className="text-sm text-muted-foreground">Nincs megjeleníthető dokumentum.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

