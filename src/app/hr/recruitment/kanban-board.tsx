"use client"

import { useState, useEffect } from "react"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { updateCandidateStatus, deleteCandidate } from "./actions"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CandidateProfileSheet } from "@/components/hr/candidate-profile-sheet"

const KANBAN_COLUMNS = [
  { id: "uj", title: "Új Jelentkező" },
  { id: "eloszurt", title: "Előszűrt" },
  { id: "interju", title: "Interjú" },
  { id: "ajanlat", title: "Ajánlat Adva" },
  { id: "elfogadva", title: "Elfogadva" },
  { id: "elutasitva", title: "Elutasítva" },
]

function SortableItem({ id, candidate, onClick }: { id: string, candidate: any, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      onClick={onClick}
      className={`cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${isDragging ? 'z-50 shadow-lg border-primary' : ''}`}
    >
      <CardContent className="p-4 space-y-2">
        <div className="font-medium text-sm">{candidate.nev}</div>
        <div className="text-xs text-muted-foreground">{candidate.hr_munkakor?.megnevezes || candidate.pozicio || "Nincs megadva"}</div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] text-muted-foreground">{new Date(candidate.created_at).toLocaleDateString("hu-HU")}</span>
          <div className="h-6 w-6 bg-primary/10 text-primary rounded flex items-center justify-center text-[10px] font-bold">
            CV
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DroppableColumn({ id, title, candidates, onCandidateClick }: { id: string, title: string, candidates: any[], onCandidateClick: (c: any) => void }) {
  const { setNodeRef } = useSortable({ 
    id,
    data: { type: "Column", columnId: id }
  })
  
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{candidates.length}</Badge>
      </div>
      
      <div 
        ref={setNodeRef} 
        className="flex-1 bg-muted/30 rounded-lg p-2 flex flex-col gap-3 min-h-[500px] border border-transparent transition-colors"
      >
        <SortableContext items={candidates.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {candidates.map(candidate => (
            <SortableItem key={candidate.id} id={candidate.id} candidate={candidate} onClick={() => onCandidateClick(candidate)} />
          ))}
        </SortableContext>
        
        {candidates.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg pointer-events-none">
            <span className="text-sm text-muted-foreground">Üres</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ initialCandidates }: { initialCandidates: any[] }) {
  const [candidates, setCandidates] = useState(initialCandidates)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const handleCandidateClick = (candidate: any) => {
    setSelectedCandidate(candidate)
    setIsSheetOpen(true)
  }

  const handleUpdateCandidate = (updatedCandidate: any) => {
    setCandidates(prev => prev.map(c => c.id === updatedCandidate.id ? { ...c, ...updatedCandidate } : c))
    setSelectedCandidate((prev: any) => prev?.id === updatedCandidate.id ? { ...prev, ...updatedCandidate } : prev)
  }

  const handleDeleteCandidateFromSheet = (id: string) => {
    handleDelete(id)
    setIsSheetOpen(false)
  }

  useEffect(() => {
    setCandidates(initialCandidates)
  }, [initialCandidates])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Megkeressük a mozgató jelöltet
    const activeCandidate = candidates.find(c => c.id === activeId)
    if (!activeCandidate) return

    // Kiderítjük, hogy mi az új státusz (oszlopba vagy másik kártyára húztuk)
    const overCandidate = candidates.find(c => c.id === overId)
    const newStatus = overCandidate ? overCandidate.statusz : overId

    // Ha ugyanabban az oszlopban mozgattuk, akkor csak sorrend csere (itt most a sorrendet nem mentjük DB-be)
    if (activeCandidate.statusz === newStatus) {
      const activeIndex = candidates.findIndex(c => c.id === activeId)
      const overIndex = candidates.findIndex(c => c.id === overId)
      if (activeIndex !== overIndex) {
        setCandidates(arrayMove(candidates, activeIndex, overIndex))
      }
      return
    }

    // Ha átment másik oszlopba
    const originalStatus = activeCandidate.statusz
    
    // Optimista frissítés a UI-on
    setCandidates(prev => 
      prev.map(c => c.id === activeId ? { ...c, statusz: newStatus } : c)
    )

    // DB mentés
    const res = await updateCandidateStatus(activeId, newStatus)
    if (res.error) {
      toast.error("Hiba történt a mozgatás során: " + res.error)
      // Visszaállítjuk
      setCandidates(prev => 
        prev.map(c => c.id === activeId ? { ...c, statusz: originalStatus } : c)
      )
    } else {
      toast.success("Jelölt státusza frissítve!")
    }
  }

  const activeCandidate = activeId ? candidates.find(c => c.id === activeId) : null
  
  const [view, setView] = useState<"kanban" | "list">("kanban")

  const handleDelete = async (id: string) => {
    // Optimistic UI update
    const previousCandidates = [...candidates]
    setCandidates(prev => prev.filter(c => c.id !== id))
    
    const res = await deleteCandidate(id)
    if (res.error) {
      toast.error("Hiba a törlés során: " + res.error)
      setCandidates(previousCandidates)
    } else {
      toast.success("Jelölt sikeresen törölve!")
    }
  }

  if (!isMounted) {
    return <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">Tábla betöltése...</div>
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-end">
        <div className="bg-muted p-1 rounded-md inline-flex">
          <button 
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Kanban Nézet
          </button>
          <button 
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Lista Nézet
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 grid grid-cols-6 gap-4 pb-4 overflow-hidden">
            {KANBAN_COLUMNS.map(col => (
              <DroppableColumn 
                key={col.id} 
                id={col.id} 
                title={col.title} 
                candidates={candidates.filter(c => c.statusz === col.id)}
                onCandidateClick={handleCandidateClick} 
              />
            ))}
          </div>

          <DragOverlay>
            {activeCandidate ? (
              <Card className="cursor-grabbing shadow-2xl scale-105 border-primary opacity-80">
                <CardContent className="p-4 space-y-2">
                  <div className="font-medium text-sm">{activeCandidate.nev}</div>
                  <div className="text-xs text-muted-foreground">{activeCandidate.hr_munkakor?.megnevezes || "Nincs megadva"}</div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Név</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Pozíció</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Jelentkezés Dátuma</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Státusz</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => {
                const statusName = KANBAN_COLUMNS.find(c => c.id === candidate.statusz)?.title || candidate.statusz
                return (
                  <tr 
                    key={candidate.id} 
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleCandidateClick(candidate)}
                  >
                    <td className="px-4 py-3 font-medium">{candidate.nev}</td>
                    <td className="px-4 py-3 text-muted-foreground">{candidate.hr_munkakor?.megnevezes || candidate.pozicio || "Nincs megadva"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(candidate.created_at).toLocaleDateString("hu-HU")}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{statusName}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger 
                          className={`${buttonVariants({ variant: "ghost", size: "icon" })} text-muted-foreground hover:text-destructive transition-colors`}
                          title="Törlés"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törölni szeretnéd?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ezzel véglegesen törlöd <strong>{candidate.nev}</strong> jelentkezését a rendszerből. Ez a művelet nem vonható vissza.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(candidate.id)}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              Törlés
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                )
              })}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nincs megjeleníthető jelölt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CandidateProfileSheet 
        candidate={selectedCandidate} 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
        onUpdate={handleUpdateCandidate}
        onDelete={handleDeleteCandidateFromSheet}
      />
    </div>
  )
}
