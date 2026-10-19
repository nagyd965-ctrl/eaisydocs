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
  // A marked alapértelmezetten megtartja az érvényes HTML tageket és lefordítja a Markdown jelöléseket
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

  // 2. Biztonsági szűrés (XSS védelem)
  const sanitizedHtml = sanitizeHtml(rawHtml)

  return (
    <div
      className={cn(
        "prose max-w-none prose-slate dark:prose-invert text-foreground/90",
        // Biztosított méretezések és térközök HTML és Markdown tagekre
        "[&>h1]:text-2xl [&>h1]:font-semibold [&>h1]:tracking-tight [&>h1]:text-foreground [&>h1]:mt-6 [&>h1]:mb-3",
        "[&>h2]:text-xl [&>h2]:font-semibold [&>h2]:tracking-tight [&>h2]:text-foreground [&>h2]:mt-5 [&>h2]:mb-2.5",
        "[&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:mt-4 [&>h3]:mb-2",
        "[&>h4]:text-base [&>h4]:font-semibold [&>h4]:text-foreground [&>h4]:mt-3 [&>h4]:mb-1.5",
        "[&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-foreground/90 [&>p]:mb-3 last:[&>p]:mb-0",
        "[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5 [&>ul]:my-3 [&>ul]:text-sm [&>ul]:text-foreground/90",
        "[&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1.5 [&>ol]:my-3 [&>ol]:text-sm [&>ol]:text-foreground/90",
        "[&_li]:leading-relaxed",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_b]:font-semibold [&_b]:text-foreground",
        "[&_em]:italic",
        "[&_i]:italic",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:py-2.5 [&_blockquote]:my-4 [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-md [&_blockquote]:text-sm [&_blockquote]:text-muted-foreground",
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
