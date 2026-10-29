import React from "react"
import { marked } from "marked"
import { sanitizeHtml } from "@/lib/sanitize-html"
import { cn } from "@/lib/utils"

interface RichTextContentProps {
  content?: string | null
  className?: string
  fallback?: React.ReactNode
}

/**
 * Univerzális RichText komponens:
 * Támogatja mind a tiszta HTML-t (pl. <h3>, <p>, <ul>, <blockquote>),
 * mind a Markdown formátumot (pl. ### Cím, **félkövér**, - lista).
 * XSS-védett és reszponzív tipográfiával formázott.
 */
export function RichTextContent({
  content,
  className,
  fallback = null,
}: RichTextContentProps) {
  if (!content || !content.trim()) {
    return fallback ? <>{fallback}</> : null
  }

  // 1. Markdown és HTML egységes feldolgozása marked-dal
  let rawHtml = ""
  try {
    const parsed = marked.parse(content, {
      breaks: true,
      gfm: true,
    })
    rawHtml = typeof parsed === "string" ? parsed : ""
  } catch (err) {
    console.error("Hiba a rich text formázásakor:", err)
    rawHtml = content
  }

  // 2. Biztonsági szűrés (XSS védelem + beégetett inline style attribútumok tisztítása)
  const sanitizedHtml = sanitizeHtml(rawHtml)

  return (
    <div
      className={cn(
        "prose max-w-none prose-slate dark:prose-invert text-foreground/90",
        "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground [&_h1]:mt-6 first:[&_h1]:mt-0 [&_h1]:mb-3",
        "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:mt-5 first:[&_h2]:mt-0 [&_h2]:mb-2.5",
        "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-5 first:[&_h3]:mt-0 [&_h3]:mb-2",
        "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-4 first:[&_h4]:mt-0 [&_h4]:mb-1.5",
        "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/90 [&_p]:mb-3 last:[&_p]:mb-0",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:my-3 [&_ul]:text-sm [&_ul]:text-foreground/90",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:my-3 [&_ol]:text-sm [&_ol]:text-foreground/90",
        "[&_li]:leading-relaxed",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_b]:font-semibold [&_b]:text-foreground",
        "[&_em]:italic",
        "[&_i]:italic",
        "[&_blockquote]:border [&_blockquote]:border-primary/25 [&_blockquote]:bg-primary/5 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:my-4 [&_blockquote]:rounded-lg [&_blockquote]:text-sm [&_blockquote]:text-foreground/90",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary/80",
        "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono",
        "[&_pre]:bg-muted/80 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm",
        "[&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted/50 [&_th]:font-semibold [&_th]:text-left",
        "[&_td]:border [&_td]:border-border [&_td]:p-2",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
