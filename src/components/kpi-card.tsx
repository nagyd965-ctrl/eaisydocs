import * as React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface KpiCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  iconBg?: string
  iconColor?: string
  href?: string
  highlight?: boolean
  className?: string
}

export function KpiCard({
  label,
  value,
  sub,
  href,
  highlight = false,
  className,
}: KpiCardProps) {
  const cardContent = (
    <Card
      className={cn(
        "h-full border border-border/70 shadow-xs bg-card transition-colors",
        href && "hover:border-primary/40 cursor-pointer",
        highlight ? "bg-warning/5 border-warning/30" : "",
        className
      )}
    >
      <CardContent className="p-4 flex flex-col justify-between gap-1.5 h-full">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </p>
          <h3
            className={cn(
              "text-2xl font-semibold tracking-tight mt-1 tabular-nums",
              highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            )}
          >
            {value}
          </h3>
        </div>
        {sub && (
          <p className="text-[11px] text-muted-foreground truncate">
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full group">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}
