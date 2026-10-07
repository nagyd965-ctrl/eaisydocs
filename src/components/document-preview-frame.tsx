"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, AlertCircle, RotateCw, ExternalLink, FileText } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DocumentPreviewFrameProps {
  src: string | null | undefined
  title?: string
  className?: string
  emptyMessage?: string
}

export function DocumentPreviewFrame({
  src,
  title = "Dokumentum előnézet",
  className = "w-full h-full",
  emptyMessage = "A dokumentum nem tölthető be, vagy nincs csatolt fájl."
}: DocumentPreviewFrameProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [contentType, setContentType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState<number>(0)
  const activeBlobRef = useRef<string | null>(null)

  // Előző blob URL felszabadítása
  const cleanupBlob = useCallback(() => {
    if (activeBlobRef.current) {
      URL.revokeObjectURL(activeBlobRef.current)
      activeBlobRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      cleanupBlob()
    }
  }, [cleanupBlob])

  const loadDocumentRef = useRef<((isRetry?: boolean) => Promise<void>) | null>(null)

  const loadDocument = useCallback(async (isRetry = false) => {
    if (!src) {
      cleanupBlob()
      setBlobUrl(null)
      setContentType(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let isCrossOrigin = false
      if (typeof window !== "undefined") {
        try {
          const parsed = new URL(src, window.location.origin)
          isCrossOrigin = parsed.origin !== window.location.origin
        } catch {
          isCrossOrigin = src.startsWith("http://") || src.startsWith("https://")
        }
      }

      const response = await fetch(src, {
        credentials: isCrossOrigin ? "omit" : "same-origin",
      })

      if (!response.ok) {
        // Ha első futás és 404 (pl. fejlesztői szerver JIT fordítás), próbáljuk újra egyszer automatikusan
        if (!isRetry && retryCount === 0 && (response.status === 404 || response.status === 502)) {
          setRetryCount(prev => prev + 1)
          setTimeout(() => {
            loadDocumentRef.current?.(true)
          }, 1200)
          return
        }

        let errMsg = `A szerver ${response.status} (${response.statusText || "Hiba"}) kóddal válaszolt.`
        try {
          const text = await response.text()
          // Csak akkor használjuk a választ, ha nem HTML (pl. hibaüzenet szöveg)
          if (text && !text.trim().startsWith("<!DOCTYPE") && !text.trim().startsWith("<html") && text.length < 300) {
            errMsg = text.trim()
          }
        } catch {
          // Ha nem olvasható a szöveg, marad a státuszkód
        }
        throw new Error(errMsg)
      }

      const mime = response.headers.get("content-type") || "application/pdf"
      const blob = await response.blob()

      // Blob URL generálása a memóriában (garantáltan nem Next.js HTML layout)
      cleanupBlob()
      const newBlobUrl = URL.createObjectURL(blob)
      activeBlobRef.current = newBlobUrl

      setBlobUrl(newBlobUrl)
      setContentType(mime)
      setError(null)
      setIsLoading(false)
    } catch (err: unknown) {
      cleanupBlob()
      setBlobUrl(null)
      setContentType(null)
      setIsLoading(false)
      setError(err instanceof Error ? err.message : "Váratlan hiba történt a dokumentum betöltésekor.")
    }
  }, [src, retryCount, cleanupBlob])

  useEffect(() => {
    loadDocumentRef.current = loadDocument
  }, [loadDocument])

  useEffect(() => {
    setRetryCount(0)
    loadDocument(false)
  }, [src, loadDocument])

  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center text-muted-foreground p-8 text-center ${className}`}>
        <FileText className="h-14 w-14 mb-3 opacity-20" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-muted/20 text-muted-foreground ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-foreground">Dokumentum előkészítése...</p>
        <p className="text-xs text-muted-foreground mt-1">Biztonságos kapcsolat és jogosultság ellenőrzése</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-muted/10 text-center ${className}`}>
        <div className="rounded-full bg-destructive/10 p-3 mb-3 border border-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          A dokumentum előnézete nem érhető el
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-5 break-words">
          {error}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDocument(true)}
            className="h-8 text-xs gap-1.5"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Újrapróbálkozás</span>
          </Button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-xs gap-1.5")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Megnyitás új lapon</span>
          </a>
        </div>
      </div>
    )
  }

  if (blobUrl) {
    if (contentType?.startsWith("image/")) {
      return (
        <div className={`w-full h-full flex items-center justify-center p-4 overflow-auto bg-muted/30 ${className}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobUrl}
            alt={title}
            className="max-w-full max-h-full object-contain rounded border border-border"
          />
        </div>
      )
    }

    return (
      <iframe
        src={blobUrl}
        className={`w-full h-full border-0 block ${className}`}
        title={title}
      />
    )
  }

  return null
}
