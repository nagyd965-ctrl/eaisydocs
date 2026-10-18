"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function getUserInitials(name?: string | null) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

interface UserAvatarProps {
  name?: string | null
  src?: string | null
  /** Kiemelt (pl. saját) megjelenítés – primary színű monogram */
  highlight?: boolean
  className?: string
}

/**
 * Kanonikus felhasználói avatár: profilkép (ha van), egyébként monogram.
 * Alapméret: 24px (h-6 w-6).
 */
export function UserAvatar({ name, src, highlight = false, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-6", className)}>
      {src ? <AvatarImage src={src} alt={name || "Profilkép"} /> : null}
      <AvatarFallback
        className={cn(
          "text-[10px] font-semibold",
          highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {getUserInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
