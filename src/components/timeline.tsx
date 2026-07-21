import { Clock, LucideIcon } from "lucide-react"
import { TimelineItemDetails } from "./timeline-item-details"
export type TimelineEvent = {
  id: string
  title: string
  description: string
  time: string
  user: string
  icon: LucideIcon
  color: string
  details?: string
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nincs rögzített esemény.</p>
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="relative pl-6 pb-6 last:pb-0">
          {index !== events.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
          )}
          <div className="absolute left-0 top-1 rounded-full bg-background border p-0.5">
            <event.icon className={`h-4 w-4 ${event.color}`} />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
            <h4 className="text-sm font-semibold">{event.title}</h4>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {event.time}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{event.description}</p>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-xs font-medium text-foreground">Felhasználó: {event.user}</p>
            {event.details && (
              <TimelineItemDetails title={event.title} details={event.details} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
