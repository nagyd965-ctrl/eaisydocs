"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { WORKFLOW_STEPS, getStepIndex } from "@/lib/kpi-helpers"

export * from "@/lib/kpi-helpers"

export function KpiWorkflowStepper({ 
  currentPhase, 
  compact = false 
}: { 
  currentPhase: string
  compact?: boolean 
}) {
  const currentIdx = getStepIndex(currentPhase)

  return (
    <div className="w-full py-1">
      <div className="grid grid-cols-5 gap-1 sm:gap-2 relative">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isComplete = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isFuture = idx > currentIdx

          return (
            <div key={step.key} className="flex flex-col items-center relative text-center">
              {/* Connecting line between steps */}
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute top-3.5 left-1/2 w-full h-0.5 z-0 transition-colors",
                    idx < currentIdx ? "bg-primary" : "bg-muted"
                  )}
                />
              )}

              {/* Node indicator */}
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold relative z-10 transition-all",
                  isComplete && "bg-primary text-primary-foreground shadow-2xs",
                  isCurrent && "bg-background text-primary border-2 border-primary ring-4 ring-primary/10 shadow-xs",
                  isFuture && "bg-muted/60 text-muted-foreground border border-border"
                )}
              >
                {isComplete ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <span className="tabular-nums text-[11px]">{idx + 1}</span>
                )}
              </div>

              {/* Labels */}
              <div className="mt-2 space-y-0.5 max-w-[100px]">
                <p
                  className={cn(
                    "text-xs transition-colors leading-tight",
                    isCurrent ? "font-semibold text-primary" : isComplete ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className={compact ? "hidden sm:inline" : ""}>
                    {compact ? step.shortLabel : step.label}
                  </span>
                  <span className={compact ? "inline sm:hidden" : "hidden"}>
                    {step.shortLabel}
                  </span>
                </p>
                {!compact && (
                  <p className="text-[10px] text-muted-foreground hidden md:block truncate">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
