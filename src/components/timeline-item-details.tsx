"use client"

import { Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button"

export function TimelineItemDetails({ title, details }: { title: string, details: string }) {
  return (
    <Dialog>
      <DialogTrigger className={`${buttonVariants({ variant: "link", size: "sm" })} h-auto p-0 text-xs text-primary`}>
        <Info className="mr-1 h-3 w-3" />
        Részletek
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title} - Részletek</DialogTitle>
        </DialogHeader>
        <div className="mt-4 bg-muted/30 p-4 rounded-md overflow-x-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
            {details}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
