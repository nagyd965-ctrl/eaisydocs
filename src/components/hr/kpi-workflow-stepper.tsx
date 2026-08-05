"use client"

import { CheckCircle2, Circle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const WORKFLOW_STEPS = [
  { key: "celkituzes", label: "Célkitűzés", shortLabel: "Cél" },
  { key: "onertekeles", label: "Önértékelés", shortLabel: "Önért." },
  { key: "vezetoi_ertekeles", label: "Vezetői értékelés", shortLabel: "Vez. ért." },
  { key: "megbeszeles", label: "Megbeszélés", shortLabel: "Megbesz." },
  { key: "lezart", label: "Lezárva", shortLabel: "Lezárt" },
] as const

export type WorkflowPhase = typeof WORKFLOW_STEPS[number]["key"]

function getStepIndex(phase: string): number {
  const idx = WORKFLOW_STEPS.findIndex(s => s.key === phase)
  return idx >= 0 ? idx : 0
}

export function KpiWorkflowStepper({ 
  currentPhase, 
  compact = false
}: { 
  currentPhase: string
  compact?: boolean 
}) {
  const currentIdx = getStepIndex(currentPhase)

  return (
    <div className={cn(
      "flex items-center gap-0",
      compact ? "gap-0" : "gap-0"
    )}>
      {WORKFLOW_STEPS.map((step, idx) => {
        const isComplete = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isFuture = idx > currentIdx

        return (
          <div key={step.key} className="flex items-center">
            {/* Step */}
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
              isComplete && "bg-success/10 text-success",
              isCurrent && "bg-primary/10 text-primary ring-1 ring-primary/30",
              isFuture && "bg-muted text-muted-foreground"
            )}>
              {isComplete ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : isCurrent ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span className={compact ? "hidden sm:inline" : ""}>
                {compact ? step.shortLabel : step.label}
              </span>
            </div>

            {/* Arrow between steps */}
            {idx < WORKFLOW_STEPS.length - 1 && (
              <ArrowRight className={cn(
                "w-3 h-3 mx-0.5 shrink-0",
                idx < currentIdx ? "text-success/50" : "text-muted-foreground/30"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Utility: derive the workflow phase from existing data if the DB field is missing */
export function deriveWorkflowPhase(kpi: {
  workflow_fazis?: string | null
  onertekeles_szovege?: string | null
  ertekeles_szovege?: string | null
  ertekeles_lezarva_datum?: string | null
  megbeszeles_datum?: string | null
}): WorkflowPhase {
  if (kpi.workflow_fazis) return kpi.workflow_fazis as WorkflowPhase
  
  if (kpi.ertekeles_lezarva_datum) return "lezart"
  if (kpi.megbeszeles_datum) return "megbeszeles"
  if (kpi.ertekeles_szovege) return "vezetoi_ertekeles"
  if (kpi.onertekeles_szovege) return "onertekeles"
  return "celkituzes"
}
