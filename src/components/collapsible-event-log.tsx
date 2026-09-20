"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Timeline } from "@/components/timeline"
import { ChevronDown, ChevronUp, Clock } from "lucide-react"
import type { TimelineEvent } from "@/components/timeline"

interface CollapsibleEventLogProps {
  events: TimelineEvent[]
}

export function CollapsibleEventLog({ events }: CollapsibleEventLogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Eseménynapló</CardTitle>
            {events.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {events.length} esemény
              </span>
            )}
          </div>
          {events.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen((prev) => !prev)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              {isOpen ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Elrejt
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Megjelenít
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 pb-4 px-5">
          {events.length > 0 ? (
            <Timeline events={events} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Még nem történt naplózott esemény ezzel az irattal.
            </p>
          )}
        </CardContent>
      )}

      {!isOpen && events.length === 0 && (
        <CardContent className="pt-0 pb-4 px-5">
          <p className="text-sm text-muted-foreground italic">
            Még nem történt naplózott esemény ezzel az irattal.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
